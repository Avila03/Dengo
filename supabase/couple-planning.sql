-- Extend the existing couple-scoped records; all current author and RLS rules apply.
alter table public.entries drop constraint entries_kind_check;
alter table public.entries add constraint entries_kind_check check(kind in
 ('shopping','task','expense','transfer','event','movie','place','subtask','goal','saving'));
alter table public.entries add constraint goal_target_valid check ((kind<>'goal' or
 (jsonb_typeof(data->'goalTarget')='number' and (data->>'goalTarget')::numeric between 1 and 100000000
 and (data->>'goalTarget')::numeric=trunc((data->>'goalTarget')::numeric))) is true);
alter table public.entries add constraint saving_amount_valid check ((kind<>'saving' or
 (jsonb_typeof(data->'amount')='number' and (data->>'amount')::numeric between 1 and 100000000
 and (data->>'amount')::numeric=trunc((data->>'amount')::numeric) and data->>'payer' in('0','1'))) is true);
create index subtask_parent_lookup on public.entries(space_id,(data->>'parentId')) where kind='subtask';
create index saving_goal_lookup on public.entries(space_id,(data->>'goalId')) where kind='saving';

create function public.guard_planning_entry() returns trigger language plpgsql security invoker set search_path='' as $$
declare parent public.entries; q numeric; price numeric; expected numeric;
begin
 if tg_op='UPDATE' and new.kind<>old.kind and (new.kind in('subtask','goal','saving') or old.kind in('subtask','goal','saving')) then
   raise exception 'O tipo deste registro não pode ser alterado.';
 end if;
 if new.kind in('subtask','saving') then
   if tg_op='UPDATE' and ((new.data->>'parentId') is distinct from (old.data->>'parentId') or (new.data->>'goalId') is distinct from (old.data->>'goalId')) then
     raise exception 'O registro não pode ser movido para outro responsável ou meta.';
   end if;
   if new.kind='subtask' then
     select * into parent from public.entries where id::text=new.data->>'parentId' and space_id=new.space_id and kind='task' for update;
     if parent.id is null then raise exception 'Responsabilidade não encontrada neste casal.'; end if;
     if parent.done and not new.done then raise exception 'Reabra a responsabilidade antes de ajustar seus passos.'; end if;
     if tg_op='INSERT' and (select count(*) from public.entries where kind='subtask' and space_id=new.space_id and data->>'parentId'=parent.id::text)>=100 then
       raise exception 'Cada responsabilidade pode ter até cem subtarefas.';
     end if;
   else
     select * into parent from public.entries where id::text=new.data->>'goalId' and space_id=new.space_id and kind='goal' for key share;
     if parent.id is null then raise exception 'Meta não encontrada neste casal.'; end if;
   end if;
 end if;
 if new.kind='shopping' and new.data ? 'quantityMilli' then
   q:=(new.data->>'quantityMilli')::numeric;
   if q is null or q<>trunc(q) or q<1 or q>1000000000 or coalesce(new.data->>'unit','') not in('un','kg','g','l','ml','pacote','caixa','garrafa') then
     raise exception 'Quantidade ou unidade inválida.';
   end if;
   if new.data ? 'unitPrice' then
     price:=(new.data->>'unitPrice')::numeric;
     if price is null or price<>trunc(price) or price<0 or price>100000000 then raise exception 'Preço por unidade inválido.'; end if;
     expected:=round(q*price/1000);
     if expected>100000000 or (new.data->>'budget')::numeric is distinct from expected then raise exception 'O total do item não corresponde à quantidade e ao preço.'; end if;
   elsif coalesce((new.data->>'budget')::numeric,0)<>0 then raise exception 'Informe o preço por unidade para calcular o total.';
   end if;
 end if;
 return new;
end $$;
revoke all on function public.guard_planning_entry() from public,anon,authenticated;
create trigger planning_entry_guard before insert or update on public.entries for each row execute function public.guard_planning_entry();

create function public.sync_planning_children() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='DELETE' then
   if old.kind='task' then delete from public.entries where kind='subtask' and space_id=old.space_id and data->>'parentId'=old.id::text; end if;
   if old.kind='goal' then delete from public.entries where kind='saving' and space_id=old.space_id and data->>'goalId'=old.id::text; end if;
   return old;
 end if;
 if tg_op='UPDATE' and new.kind='task' and new.done and not old.done then
   update public.entries set done=true where kind='subtask' and space_id=new.space_id and data->>'parentId'=new.id::text and not done;
 end if;
 if tg_op='INSERT' and new.kind='task' and new.occurrence_from is not null then
   insert into public.entries(space_id,kind,title,detail,assignee,due,done,data)
     select new.space_id,'subtask',title,detail,new.assignee,'',false,jsonb_build_object('parentId',new.id::text)
       from public.entries where kind='subtask' and space_id=new.space_id and data->>'parentId'=new.occurrence_from::text;
 end if;
 return new;
end $$;
revoke all on function public.sync_planning_children() from public,anon,authenticated;
create trigger planning_children_sync after insert or update or delete on public.entries for each row execute function public.sync_planning_children();

create table public.notification_state (
 user_id uuid primary key references auth.users(id) on delete cascade, started_at timestamptz not null default now()
);
alter table public.notification_state enable row level security;
revoke all on public.notification_state from public,anon,authenticated;
grant all on public.notification_state to service_role;
insert into public.notification_state(user_id) select distinct user_id from public.memberships;
create function dengo_private.initialize_notification_state() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.notification_state(user_id) values(new.user_id) on conflict(user_id) do nothing;
 return new;
end $$;
revoke all on function dengo_private.initialize_notification_state() from public,anon,authenticated;
create trigger initialize_notification_state after insert on public.memberships for each row execute function dengo_private.initialize_notification_state();

create table public.notification_inbox (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 space_id uuid not null references public.spaces(id) on delete cascade, message_key text not null,
 type text not null check(type in('upcomingEvent','eventChanges','newResponsibility','paymentDue','overdue','partnerCompletion','newPlan','dailyDigest')),
 title text not null check(length(title)<=240), body text not null check(length(body)<=1000), url text not null check(url like '/%' and url not like '//%'),
 created_at timestamptz not null default now(), read_at timestamptz,
 unique(user_id,message_key)
);
alter table public.notification_inbox enable row level security;
revoke all on public.notification_inbox from public,anon,authenticated;
grant select on public.notification_inbox to authenticated;
grant update(read_at) on public.notification_inbox to authenticated;
grant all on public.notification_inbox to service_role;
create index notification_inbox_recent on public.notification_inbox(user_id,created_at desc,id desc);
create index notification_inbox_unread on public.notification_inbox(user_id) where read_at is null;
create policy read_own_notifications on public.notification_inbox for select to authenticated
 using(user_id=(select auth.uid()) and exists(select 1 from public.memberships m where m.user_id=(select auth.uid()) and m.space_id=notification_inbox.space_id));
create policy mark_own_notifications on public.notification_inbox for update to authenticated
 using(user_id=(select auth.uid()) and exists(select 1 from public.memberships m where m.user_id=(select auth.uid()) and m.space_id=notification_inbox.space_id))
 with check(user_id=(select auth.uid()) and exists(select 1 from public.memberships m where m.user_id=(select auth.uid()) and m.space_id=notification_inbox.space_id));
alter publication supabase_realtime add table public.notification_inbox;
