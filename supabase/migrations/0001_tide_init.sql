-- Tide: end-to-end encrypted storage.
-- The server only ever stores ciphertext. Encryption keys never leave the user's device.
-- Run once in Supabase: SQL Editor → New query → paste → Run.

-- 1) Key material: the user's master secret, wrapped (encrypted) on the device
--    with a key derived from the password, and separately with the recovery code.
create table if not exists public.vaults (
  user_id uuid primary key references auth.users (id) on delete cascade,
  key_version int not null default 1,
  wrapped_master jsonb not null,
  recovery jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) All of the user's data as one encrypted document, versioned for conflict detection.
create table if not exists public.snapshots (
  user_id uuid primary key references auth.users (id) on delete cascade,
  version bigint not null default 0,
  iv text not null,
  data text not null,
  updated_at timestamptz not null default now()
);

alter table public.vaults enable row level security;
alter table public.snapshots enable row level security;

-- Each user can only ever see and change their own rows.
drop policy if exists "own vault" on public.vaults;
create policy "own vault" on public.vaults
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own snapshot" on public.snapshots;
create policy "own snapshot" on public.snapshots
  for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.vaults, public.snapshots from anon, authenticated;
grant select, insert, update, delete on public.vaults to authenticated;
grant select on public.snapshots to authenticated;

-- 3) Writing a snapshot only through this function: it succeeds only if the caller
--    has seen the latest version (optimistic concurrency). Returns the new version,
--    or null on a conflict (the device then pulls, merges and tries again).
create or replace function public.push_snapshot(expected_version bigint, new_iv text, new_data text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  result bigint;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if length(new_data) > 10000000 then
    raise exception 'snapshot too large';
  end if;

  if expected_version = 0 then
    insert into public.snapshots (user_id, version, iv, data)
    values (uid, 1, new_iv, new_data)
    on conflict (user_id) do nothing
    returning version into result;
  else
    update public.snapshots
    set version = version + 1, iv = new_iv, data = new_data, updated_at = now()
    where user_id = uid and version = expected_version
    returning version into result;
  end if;

  return result;
end;
$$;

-- 4) Account deletion from the app (GDPR): removes the user and, via cascade, all their data.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.push_snapshot(bigint, text, text) from public, anon;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.push_snapshot(bigint, text, text) to authenticated;
grant execute on function public.delete_my_account() to authenticated;
