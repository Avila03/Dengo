-- Executar somente em um projeto NOVO e exclusivo do Dengo.
-- As duas contas são criadas manualmente em Authentication > Users.
begin;
create table public.spaces (
 id uuid primary key default gen_random_uuid(),
 names text[] not null check (cardinality(names) = 2),
 created_at timestamptz not null default now()
);
create table public.memberships (
 user_id uuid primary key references auth.users(id) on delete cascade,
 space_id uuid not null references public.spaces(id) on delete cascade
);
create index memberships_space_idx on public.memberships(space_id);
create table public.entries (
 id uuid primary key default gen_random_uuid(),
 space_id uuid not null references public.spaces(id) on delete cascade,
 kind text not null check (kind in ('shopping','task')),
 title text not null check (char_length(trim(title)) between 1 and 120),
 detail text not null default '' check (char_length(detail) <= 240),
 assignee text not null check (char_length(assignee) between 1 and 120),
 due text not null default '' check (due = '' or due ~ '^\d{4}-\d{2}-\d{2}$'),
 done boolean not null default false,
 created_at timestamptz not null default now()
);
create index entries_space_created_idx on public.entries(space_id,created_at desc);
alter table public.spaces enable row level security;
alter table public.memberships enable row level security;
alter table public.entries enable row level security;
revoke all on public.spaces, public.memberships, public.entries from anon, authenticated;
grant select on public.spaces, public.memberships to authenticated;
grant select, insert, update, delete on public.entries to authenticated;
-- Não há políticas de escrita de memberships: apenas o administrador pode vincular contas.
create policy "read own membership" on public.memberships for select to authenticated
 using (user_id = (select auth.uid()));
create policy "read couple space" on public.spaces for select to authenticated
 using (exists (select 1 from public.memberships m where m.space_id=spaces.id and m.user_id=(select auth.uid())));
create policy "read couple entries" on public.entries for select to authenticated
 using (exists (select 1 from public.memberships m where m.space_id=entries.space_id and m.user_id=(select auth.uid())));
create policy "create couple entries" on public.entries for insert to authenticated
 with check (exists (select 1 from public.memberships m where m.space_id=entries.space_id and m.user_id=(select auth.uid())));
create policy "update couple entries" on public.entries for update to authenticated
 using (exists (select 1 from public.memberships m where m.space_id=entries.space_id and m.user_id=(select auth.uid())))
 with check (exists (select 1 from public.memberships m where m.space_id=entries.space_id and m.user_id=(select auth.uid())));
create policy "delete couple entries" on public.entries for delete to authenticated
 using (exists (select 1 from public.memberships m where m.space_id=entries.space_id and m.user_id=(select auth.uid())));
commit;
-- Depois, executar separadamente com nomes e UUIDs reais:
-- with new_space as (
--   insert into public.spaces(names) values (array['Bruno', 'Nome da outra pessoa']) returning id
-- ) insert into public.memberships(user_id,space_id)
-- select u.id, s.id from new_space s cross join
-- (values ('UUID_DA_CONTA_1'::uuid),('UUID_DA_CONTA_2'::uuid)) as u(id);
