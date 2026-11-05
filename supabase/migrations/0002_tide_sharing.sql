-- Tide phase 5: sharing with partners. Everything shared is encrypted on the owner's device
-- with a share key that only the owner and the partner have; the server sees ciphertext only.

create table if not exists public.shares (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  partner_id uuid references auth.users (id) on delete cascade,
  status text not null default 'invited' check (status in ('invited', 'pending', 'active')),
  -- share key, encrypted with the secret in the invite link (which never reaches the server)
  wrapped_key jsonb not null,
  -- partner's display name, encrypted with the share key (proves the partner had the link)
  partner_info jsonb,
  expires_at timestamptz not null default now() + interval '24 hours',
  created_at timestamptz not null default now()
);

create table if not exists public.shared_snapshots (
  share_id uuid primary key references public.shares (id) on delete cascade,
  iv text not null,
  data text not null,
  updated_at timestamptz not null default now()
);

alter table public.shares enable row level security;
alter table public.shared_snapshots enable row level security;

drop policy if exists "owner manages shares" on public.shares;
create policy "owner manages shares" on public.shares
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "partner reads share" on public.shares;
create policy "partner reads share" on public.shares
  for select to authenticated
  using ((select auth.uid()) = partner_id);

drop policy if exists "partner leaves share" on public.shares;
create policy "partner leaves share" on public.shares
  for delete to authenticated
  using ((select auth.uid()) = partner_id);

drop policy if exists "owner writes shared data" on public.shared_snapshots;
create policy "owner writes shared data" on public.shared_snapshots
  for all to authenticated
  using (exists (select 1 from public.shares s where s.id = share_id and s.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.shares s where s.id = share_id and s.owner_id = (select auth.uid()) and s.status = 'active'));

drop policy if exists "partner reads shared data" on public.shared_snapshots;
create policy "partner reads shared data" on public.shared_snapshots
  for select to authenticated
  using (exists (select 1 from public.shares s where s.id = share_id and s.partner_id = (select auth.uid()) and s.status = 'active'));

revoke all on public.shares, public.shared_snapshots from anon, authenticated;
grant select, insert, update, delete on public.shares to authenticated;
grant select, insert, update, delete on public.shared_snapshots to authenticated;

-- Partner side of an invite: read the wrapped key (useless without the link's secret)…
create or replace function public.get_invite(invite_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  select wrapped_key into result from public.shares
  where id = invite_id and status = 'invited' and partner_id is null and expires_at > now() and owner_id <> auth.uid();
  return result;
end;
$$;

-- …then claim it, attaching the encrypted display name. The owner still has to approve.
create or replace function public.accept_invite(invite_id uuid, info jsonb)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  update public.shares
  set partner_id = auth.uid(), status = 'pending', partner_info = info
  where id = invite_id and status = 'invited' and partner_id is null and expires_at > now() and owner_id <> auth.uid()
  returning id into claimed;
  return claimed is not null;
end;
$$;

revoke all on function public.get_invite(uuid) from public, anon;
revoke all on function public.accept_invite(uuid, jsonb) from public, anon;
grant execute on function public.get_invite(uuid) to authenticated;
grant execute on function public.accept_invite(uuid, jsonb) to authenticated;
