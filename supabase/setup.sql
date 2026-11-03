-- Executar somente em um projeto NOVO e exclusivo do Dengo.
-- As duas contas são criadas manualmente em Authentication > Users.
begin;
create table public.spaces (
 id uuid primary key default gen_random_uuid(),
 names text[] not null check (cardinality(names) = 2 and names[1] <> names[2]),
 preferences jsonb not null default '{}'::jsonb check (jsonb_typeof(preferences) = 'object' and octet_length(preferences::text) <= 450000),
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
 kind text not null check (kind in ('shopping','task','expense','transfer','event','movie','place')),
 title text not null check (char_length(trim(title)) between 1 and 120),
 detail text not null default '' check (char_length(detail) <= 240),
 assignee text not null check (char_length(assignee) between 1 and 120),
 due text not null default '' check (due = '' or (due ~ '^\d{4}-\d{2}-\d{2}$' and (due::date)::text=due)),
 done boolean not null default false,
 data jsonb not null default '{}'::jsonb check (jsonb_typeof(data)='object' and octet_length(data::text) <= 10000),
 occurrence_from uuid references public.entries(id) on delete set null,
 created_at timestamptz not null default now()
);
create index entries_space_created_idx on public.entries(space_id,created_at desc);
alter table public.spaces enable row level security;
alter table public.memberships enable row level security;
alter table public.entries enable row level security;
revoke all on public.spaces, public.memberships, public.entries from anon, authenticated;
grant select on public.spaces, public.memberships to authenticated;
grant update(names,preferences) on public.spaces to authenticated;
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


create unique index recurring_occurrence_unique on public.entries(space_id,occurrence_from) where occurrence_from is not null;
create unique index purchase_expense_unique on public.entries(space_id,(data->>'sourceId')) where kind='expense' and data->>'sourceId' is not null;
create unique index movie_catalog_unique on public.entries(space_id,(data->>'tmdbId'),(data->>'mediaType')) where kind='movie' and data->>'tmdbId' is not null;
alter table public.entries add constraint finance_valid check (
 kind not in ('expense','transfer') or (
 jsonb_typeof(data->'amount')='number' and (data->>'amount')::numeric between 1 and 100000000
 and (data->>'amount')::numeric=trunc((data->>'amount')::numeric)
 and data->>'payer' in ('0','1')
 and (kind='transfer' or ((data->>'shareFirst')::numeric between 0 and 10000 and (data->>'shareFirst')::numeric=trunc((data->>'shareFirst')::numeric)))
 ) is true
);
alter table public.entries add constraint recurrence_valid check (
 coalesce(data->>'recurrence','none') in ('none','daily','weekly','monthly')
 and (coalesce(data->>'recurrence','none')='none' or (kind in ('task','expense') and due<>''))
);
create policy "update couple preferences" on public.spaces for update to authenticated
 using (exists (select 1 from public.memberships m where m.space_id=spaces.id and m.user_id=(select auth.uid())))
 with check (exists (select 1 from public.memberships m where m.space_id=spaces.id and m.user_id=(select auth.uid())));
-- Funções executam com as permissões do chamador; RLS continua valendo.
create function public.generate_next_entry() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
declare repeat_kind text; next_due date; next_assignee text; couple_names text[]; anchor_day integer; next_data jsonb;
begin
 if not new.done or new.kind not in ('task','expense') then return new; end if;
 if tg_op='UPDATE' then if old.done then return new; end if; end if;
 repeat_kind:=coalesce(new.data->>'recurrence','none');
 if repeat_kind='none' or new.due='' then return new; end if;
 next_due:=case repeat_kind when 'daily' then new.due::date+1 when 'weekly' then new.due::date+7 when 'monthly' then (new.due::date+interval '1 month')::date end;
 anchor_day:=coalesce((new.data->>'repeatAnchor')::integer,extract(day from new.due::date)::integer);
 if repeat_kind='monthly' then
  next_due:=(date_trunc('month',new.due::date)+interval '1 month')::date + (least(anchor_day,extract(day from (date_trunc('month',new.due::date)+interval '2 months - 1 day'))::integer)-1);
 end if;
 next_data:=(new.data-'sourceId')||jsonb_build_object('repeatAnchor',anchor_day);
 next_assignee:=new.assignee;
 if coalesce((new.data->>'alternate')::boolean,false) then
  select names into couple_names from public.spaces where id=new.space_id;
  next_assignee:=case when new.assignee=couple_names[1] then couple_names[2] else couple_names[1] end;
 end if;
 insert into public.entries(space_id,kind,title,detail,assignee,due,done,data,occurrence_from)
 values(new.space_id,new.kind,new.title,new.detail,next_assignee,next_due::text,false,next_data,new.id)
 on conflict do nothing;
 return new;
end $$;
revoke all on function public.generate_next_entry() from public,anon,authenticated;
create trigger schedule_next after insert or update of done on public.entries for each row execute function public.generate_next_entry();
create function public.toggle_entry(entry_id uuid) returns void language plpgsql security invoker set search_path=public,pg_temp as $$
declare current_entry public.entries;
begin
 select * into current_entry from public.entries where id=entry_id for update;
 if not found then raise exception 'Registro indisponível'; end if;
 update public.entries set done=not current_entry.done where id=entry_id;
end $$;
revoke all on function public.toggle_entry(uuid) from public,anon;
grant execute on function public.toggle_entry(uuid) to authenticated;
create function public.convert_purchase(new_entry jsonb) returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare purchase public.entries; existing_id uuid; result_id uuid;
begin
 select * into purchase from public.entries where id=(new_entry->'data'->>'sourceId')::uuid and kind='shopping' for update;
 if not found then raise exception 'Compra indisponível'; end if;
 select id into existing_id from public.entries where kind='expense' and space_id=purchase.space_id and data->>'sourceId'=purchase.id::text;
 if existing_id is not null then return existing_id; end if;
 result_id:=(new_entry->>'id')::uuid;
 insert into public.entries(id,space_id,kind,title,detail,assignee,due,done,data)
 values(result_id,purchase.space_id,'expense',new_entry->>'title',coalesce(new_entry->>'detail',''),new_entry->>'assignee',new_entry->>'due',(new_entry->>'done')::boolean,new_entry->'data');
 update public.entries set done=true where id=purchase.id;
 return result_id;
end $$;
revoke all on function public.convert_purchase(jsonb) from public,anon;
grant execute on function public.convert_purchase(jsonb) to authenticated;
create function public.rename_assignees() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 update public.entries set assignee=case when assignee=old.names[1] then new.names[1] else new.names[2] end
 where space_id=new.id and assignee in (old.names[1],old.names[2]);
 return new;
end $$;
revoke all on function public.rename_assignees() from public,anon,authenticated;
create trigger sync_assignee_names after update of names on public.spaces for each row when(old.names is distinct from new.names) execute function public.rename_assignees();
alter publication supabase_realtime add table public.entries, public.spaces;
commit;
