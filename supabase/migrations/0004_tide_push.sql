-- Tide phase 5c: push notifications.
-- Replace __TIDE_WEBHOOK_SECRET__ with the secret set for the `notify` Edge Function before running.
-- The notification text is generic; no health data or message content leaves the database here.

create extension if not exists pg_net;

create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "own subscriptions" on public.push_subscriptions;
create policy "own subscriptions" on public.push_subscriptions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.push_subscriptions from anon, authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;

-- Display names for notifications ("Ville lähetti sinulle jotain"). This is the only plaintext
-- the user chooses to put on the server; health data and messages stay end-to-end encrypted.
create table if not exists public.profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.profiles from anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;

-- Ask the Edge Function to notify the other member of a share.
create or replace function public.tide_notify(kind text, share uuid, sender uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform net.http_post(
    url := 'https://dlqqkiixculrqjfegjsq.supabase.co/functions/v1/notify',
    body := jsonb_build_object('kind', kind, 'share_id', share, 'sender_id', sender),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-tide-secret', '__TIDE_WEBHOOK_SECRET__')
  );
end;
$$;

revoke all on function public.tide_notify(text, uuid, uuid) from public, anon, authenticated;

create or replace function public.tide_on_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.tide_notify('message', new.share_id, new.sender_id);
  return new;
end;
$$;

create or replace function public.tide_on_share_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'invited' and new.status = 'pending' then
    perform public.tide_notify('request', new.id, new.partner_id);
  elsif old.status = 'pending' and new.status = 'active' then
    perform public.tide_notify('approved', new.id, new.owner_id);
  end if;
  return new;
end;
$$;

drop trigger if exists tide_message_notify on public.share_messages;
create trigger tide_message_notify after insert on public.share_messages
  for each row execute function public.tide_on_message();

drop trigger if exists tide_share_notify on public.shares;
create trigger tide_share_notify after update on public.shares
  for each row execute function public.tide_on_share_request();
