-- Tide: scheduled reminders (daily log reminder and a heads-up before the predicted period).
-- The app computes the times on the device; the server only stores timestamps and a kind number
-- (1 = log reminder, 2 = heads-up). The notification text is generic.
-- Needs the pg_cron extension (Database → Extensions → pg_cron) and the same secret as 0004:
-- replace __TIDE_WEBHOOK_SECRET__ before running.

create extension if not exists pg_cron;
create extension if not exists pg_net;

create table if not exists public.reminders (
  id bigserial primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  send_at timestamptz not null,
  kind smallint not null check (kind in (1, 2)),
  sent boolean not null default false
);

create index if not exists reminders_due on public.reminders (send_at) where not sent;

alter table public.reminders enable row level security;

drop policy if exists "own reminders" on public.reminders;
create policy "own reminders" on public.reminders
  for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.reminders from anon, authenticated;
grant select on public.reminders to authenticated;

-- Replace the caller's upcoming reminders with a new plan: [{ "at": iso, "kind": 1|2 }, …].
create or replace function public.set_reminders(items jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  n integer;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) > 150 then
    raise exception 'invalid reminders';
  end if;
  delete from public.reminders where user_id = uid and not sent;
  insert into public.reminders (user_id, send_at, kind)
  select uid, (x ->> 'at')::timestamptz, (x ->> 'kind')::smallint
  from jsonb_array_elements(items) as x
  where (x ->> 'at')::timestamptz > now() and (x ->> 'at')::timestamptz < now() + interval '60 days';
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.set_reminders(jsonb) from public, anon;
grant execute on function public.set_reminders(jsonb) to authenticated;

-- Every 5 minutes: ask the notify Edge Function to send the reminders that are due.
create or replace function public.tide_send_reminders()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.reminders where not sent and send_at <= now()) then
    perform net.http_post(
      url := 'https://dlqqkiixculrqjfegjsq.supabase.co/functions/v1/notify',
      body := jsonb_build_object('kind', 'reminders'),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-tide-secret', '__TIDE_WEBHOOK_SECRET__')
    );
  end if;
  -- Housekeeping: sent or long-missed reminders are not needed.
  delete from public.reminders where send_at < now() - interval '2 days';
end;
$$;

revoke all on function public.tide_send_reminders() from public, anon, authenticated;

select cron.unschedule('tide-reminders') where exists (select 1 from cron.job where jobname = 'tide-reminders');
select cron.schedule('tide-reminders', '*/5 * * * *', $$ select public.tide_send_reminders(); $$);
