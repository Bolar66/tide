-- Tide phase 5b: messages between partners (cheers, "I need" requests, promise coupons).
-- Every message is encrypted with the share key on the sender's device.

create table if not exists public.share_messages (
  id uuid primary key default gen_random_uuid(),
  share_id uuid not null references public.shares (id) on delete cascade,
  sender_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  iv text not null,
  data text not null,
  created_at timestamptz not null default now()
);

create index if not exists share_messages_share_created on public.share_messages (share_id, created_at);

alter table public.share_messages enable row level security;

drop policy if exists "members read messages" on public.share_messages;
create policy "members read messages" on public.share_messages
  for select to authenticated
  using (exists (
    select 1 from public.shares s
    where s.id = share_id and s.status = 'active'
      and (select auth.uid()) in (s.owner_id, s.partner_id)
  ));

drop policy if exists "members send messages" on public.share_messages;
create policy "members send messages" on public.share_messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and length(data) < 20000
    and exists (
      select 1 from public.shares s
      where s.id = share_id and s.status = 'active'
        and (select auth.uid()) in (s.owner_id, s.partner_id)
    )
  );

drop policy if exists "senders delete own messages" on public.share_messages;
create policy "senders delete own messages" on public.share_messages
  for delete to authenticated
  using (sender_id = (select auth.uid()));

revoke all on public.share_messages from anon, authenticated;
grant select, insert, delete on public.share_messages to authenticated;
