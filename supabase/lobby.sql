-- Atualização sobre o schema de setup.sql. As contas mantêm logins independentes.
begin;
create schema if not exists dengo_private;
revoke all on schema dengo_private from public,anon;
grant usage on schema dengo_private to authenticated;
alter table public.memberships add column slot smallint;
do $$ begin
 if exists(select 1 from public.memberships group by space_id having count(*)>2) then raise exception 'Um espaço existente tem mais de dois membros. Revise antes de atualizar.'; end if;
end $$;
with numbered as(select user_id,(row_number() over(partition by space_id order by user_id)-1)::smallint as n from public.memberships)
update public.memberships m set slot=numbered.n from numbered where numbered.user_id=m.user_id;
alter table public.memberships alter column slot set not null;
alter table public.memberships add constraint membership_two_slots check(slot in(0,1));
alter table public.memberships add constraint membership_unique_slot unique(space_id,slot);
create table dengo_private.couple_invites (
 space_id uuid primary key references public.spaces(id) on delete cascade,
 token_hash text not null unique,
 expires_at timestamptz not null,
 used_at timestamptz,
 created_by uuid not null references auth.users(id) on delete cascade
);
create index couple_invite_creator_idx on dengo_private.couple_invites(created_by);
alter table dengo_private.couple_invites enable row level security;
create policy "deny direct invite access" on dengo_private.couple_invites as restrictive for all to authenticated using(false) with check(false);
revoke all on dengo_private.couple_invites from public,anon,authenticated;
-- Onboarding precisa inserir o vínculo, que não é gravável pelo cliente.
-- Somente estes métodos estreitos usam privilégios elevados; todos verificam auth.uid().
create function dengo_private.require_actor() returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
 if actor is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Entre em uma conta pessoal para continuar.'; end if;
 return actor;
end $$;
create function dengo_private.create_couple(p_space_name text,p_person_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=dengo_private.require_actor(); home uuid; person text:=trim(p_person_name); title text:=trim(p_space_name);
begin
 if char_length(person) not between 1 and 60 or char_length(title) not between 1 and 80 or person is null or title is null then raise exception 'Informe seu nome e um nome para o espaço.'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text,0));
 if exists(select 1 from public.memberships where user_id=actor) then raise exception 'Sua conta já pertence a um casal.'; end if;
 insert into public.spaces(names,preferences) values(array[person,case when person='Seu par' then 'Seu amor' else 'Seu par' end],jsonb_build_object('title',title)) returning id into home;
 insert into public.memberships(user_id,space_id,slot) values(actor,home,0);
 return home;
end $$;
create function dengo_private.couple_summary() returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=dengo_private.require_actor(); result jsonb;
begin
 select jsonb_build_object('space_id',s.id,'slot',m.slot,'names',s.names,'preferences',s.preferences,'members',(select count(*) from public.memberships all_members where all_members.space_id=s.id)) into result
 from public.memberships m join public.spaces s on s.id=m.space_id where m.user_id=actor;
 return result;
end $$;
create function dengo_private.create_couple_invite() returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=dengo_private.require_actor(); home uuid; member_slot smallint; token text; expiry timestamptz:=now()+interval '7 days';
begin
 select space_id,slot into home,member_slot from public.memberships where user_id=actor;
 if home is null or member_slot<>0 then raise exception 'Somente quem criou o espaço pode gerar o convite.'; end if;
 perform 1 from public.spaces where id=home for update;
 if (select count(*) from public.memberships where space_id=home)>=2 then raise exception 'O casal já está completo.'; end if;
 token:=encode(extensions.gen_random_bytes(16),'hex');
 insert into dengo_private.couple_invites(space_id,token_hash,expires_at,created_by) values(home,encode(sha256(convert_to(token,'UTF8')),'hex'),expiry,actor)
 on conflict(space_id) do update set token_hash=excluded.token_hash,expires_at=excluded.expires_at,used_at=null,created_by=actor;
 return jsonb_build_object('code',token,'expires_at',expiry);
end $$;
create function dengo_private.join_couple(p_code text,p_person_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=dengo_private.require_actor(); person text:=trim(p_person_name); hashed text; invitation dengo_private.couple_invites; couple_names text[];
begin
 if person is null or char_length(person) not between 1 and 60 then raise exception 'Informe seu nome, com até 60 caracteres.'; end if;
 if p_code is null or p_code !~ '^[0-9a-fA-F]{32}$' then raise exception 'Convite inválido ou expirado.'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text,0));
 if exists(select 1 from public.memberships where user_id=actor) then raise exception 'Sua conta já pertence a um casal.'; end if;
 hashed:=encode(sha256(convert_to(lower(p_code),'UTF8')),'hex');
 select * into invitation from dengo_private.couple_invites where token_hash=hashed;
 if not found then raise exception 'Convite inválido ou expirado.'; end if;
 -- Ordem de lock consistente com a regeneração: primeiro espaço, depois convite.
 perform 1 from public.spaces where id=invitation.space_id for update;
 select * into invitation from dengo_private.couple_invites where token_hash=hashed for update;
 if not found or invitation.used_at is not null or invitation.expires_at<=now() then raise exception 'Convite inválido ou expirado.'; end if;
 if (select count(*) from public.memberships where space_id=invitation.space_id)>=2 then raise exception 'Esse espaço já tem duas pessoas.'; end if;
 select names into couple_names from public.spaces where id=invitation.space_id;
 if person=couple_names[1] then raise exception 'Escolha um nome ou apelido diferente para identificar seus registros.'; end if;
 insert into public.memberships(user_id,space_id,slot) values(actor,invitation.space_id,1);
 update public.spaces set names=array[couple_names[1],person] where id=invitation.space_id;
 update dengo_private.couple_invites set used_at=now() where space_id=invitation.space_id;
 return invitation.space_id;
end $$;
revoke all on all functions in schema dengo_private from public,anon,authenticated;
grant execute on function dengo_private.couple_summary(),dengo_private.create_couple(text,text),dengo_private.create_couple_invite(),dengo_private.join_couple(text,text) to authenticated;
-- Invoker wrappers são a única superfície da API. Os helpers não ficam em schema exposto.
create function public.couple_summary() returns jsonb language sql security invoker set search_path='' as $$select dengo_private.couple_summary()$$;
create function public.create_couple(p_space_name text,p_person_name text) returns uuid language sql security invoker set search_path='' as $$select dengo_private.create_couple(p_space_name,p_person_name)$$;
create function public.create_couple_invite() returns jsonb language sql security invoker set search_path='' as $$select dengo_private.create_couple_invite()$$;
create function public.join_couple(p_code text,p_person_name text) returns uuid language sql security invoker set search_path='' as $$select dengo_private.join_couple(p_code,p_person_name)$$;
revoke all on function public.couple_summary(),public.create_couple(text,text),public.create_couple_invite(),public.join_couple(text,text) from public,anon;
grant execute on function public.couple_summary(),public.create_couple(text,text),public.create_couple_invite(),public.join_couple(text,text) to authenticated;
alter table public.entries add column created_by uuid references auth.users(id) on delete set null;
alter table public.entries add column updated_by uuid references auth.users(id) on delete set null;
alter table public.entries add column created_by_slot smallint check(created_by_slot in(0,1));
alter table public.entries add column updated_by_slot smallint check(updated_by_slot in(0,1));
alter table public.entries add column updated_at timestamptz;
create index entries_creator_idx on public.entries(created_by);
create index entries_updater_idx on public.entries(updated_by);
create function public.stamp_entry_author() returns trigger language plpgsql security invoker set search_path='' as $$
declare actor uuid:=auth.uid(); member_slot smallint;
begin
 select slot into member_slot from public.memberships where user_id=actor and space_id=new.space_id;
 if tg_op='INSERT' then
  new.created_by:=actor; new.created_by_slot:=member_slot; new.created_at:=now();
 else
  new.created_by:=old.created_by; new.created_by_slot:=old.created_by_slot; new.created_at:=old.created_at;
  if new.space_id<>old.space_id or new.id<>old.id then raise exception 'A identidade do registro não pode ser alterada.'; end if;
 end if;
 new.updated_by:=actor; new.updated_by_slot:=member_slot; new.updated_at:=now();
 return new;
end $$;
revoke all on function public.stamp_entry_author() from public,anon,authenticated;
create trigger track_entry_author before insert or update on public.entries for each row execute function public.stamp_entry_author();
commit;
