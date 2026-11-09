-- Dengo 2.8 — sair do casal e convidar alguém para o lugar vago.
-- Aplicar UMA vez no projeto do Dengo, depois de setup.sql, lobby.sql,
-- couple-planning.sql e dos scripts de push. As funções existentes são
-- substituídas com a mesma assinatura e mantêm suas permissões.
--
-- Regras:
-- * Quem sai perde o acesso imediatamente; os registros ficam com quem permanece.
-- * Quem permanece pode gerar um convite. Quem entrar ocupa o lugar vago: o que
--   estava em nome de quem saiu (responsável e pagador) passa a ser dessa pessoa.
-- * A última pessoa só sai confirmando a exclusão do espaço e de todos os registros.
-- * "Nós dois" é reservado para responsabilidades compartilhadas.
begin;

create function dengo_private.comparable_name(p_name text) returns text
language sql immutable set search_path='' as $$
 select pg_catalog.lower(pg_catalog.regexp_replace(pg_catalog.btrim(
   pg_catalog.translate(coalesce(p_name,''),'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇç','AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCc')),
   '\s+',' ','g'))
$$;
revoke all on function dengo_private.comparable_name(text) from public,anon,authenticated;

create or replace function dengo_private.create_couple(p_space_name text,p_person_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=dengo_private.require_actor(); home uuid; person text:=trim(p_person_name); title text:=trim(p_space_name);
begin
 if char_length(person) not between 1 and 60 or char_length(title) not between 1 and 80 or person is null or title is null then raise exception 'Informe seu nome e um nome para o espaço.'; end if;
 if dengo_private.comparable_name(person)='nos dois' then raise exception '“Nós dois” é usado para tarefas dos dois. Escolha outro nome ou apelido.'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text,0));
 if exists(select 1 from public.memberships where user_id=actor) then raise exception 'Sua conta já pertence a um casal.'; end if;
 insert into public.spaces(names,preferences) values(array[person,case when person='Seu par' then 'Seu amor' else 'Seu par' end],jsonb_build_object('title',title)) returning id into home;
 insert into public.memberships(user_id,space_id,slot) values(actor,home,0);
 return home;
end $$;

-- Antes só a pessoa do lugar 0 convidava. Agora quem estiver sozinho no espaço convida.
create or replace function dengo_private.create_couple_invite() returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=dengo_private.require_actor(); home uuid; token text; expiry timestamptz:=now()+interval '7 days';
begin
 select space_id into home from public.memberships where user_id=actor;
 if home is null then raise exception 'Entre em um casal antes de gerar o convite.'; end if;
 perform 1 from public.spaces where id=home for update;
 if (select count(*) from public.memberships where space_id=home)>=2 then raise exception 'O casal já está completo.'; end if;
 token:=encode(extensions.gen_random_bytes(16),'hex');
 insert into dengo_private.couple_invites(space_id,token_hash,expires_at,created_by) values(home,encode(sha256(convert_to(token,'UTF8')),'hex'),expiry,actor)
 on conflict(space_id) do update set token_hash=excluded.token_hash,expires_at=excluded.expires_at,used_at=null,created_by=actor;
 return jsonb_build_object('code',token,'expires_at',expiry);
end $$;

-- Quem entra ocupa o lugar livre (0 ou 1), não necessariamente o lugar 1.
create or replace function dengo_private.join_couple(p_code text,p_person_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=dengo_private.require_actor(); person text:=trim(p_person_name); hashed text; invitation dengo_private.couple_invites;
 couple_names text[]; members integer; taken smallint; free smallint;
begin
 if person is null or char_length(person) not between 1 and 60 then raise exception 'Informe seu nome, com até 60 caracteres.'; end if;
 if dengo_private.comparable_name(person)='nos dois' then raise exception '“Nós dois” é usado para tarefas dos dois. Escolha outro nome ou apelido.'; end if;
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
 select count(*),min(slot) into members,taken from public.memberships where space_id=invitation.space_id;
 if members>=2 then raise exception 'Esse espaço já tem duas pessoas.'; end if;
 if members=0 then raise exception 'Convite inválido ou expirado.'; end if;
 free:=1-taken;
 select names into couple_names from public.spaces where id=invitation.space_id;
 if dengo_private.comparable_name(person)=dengo_private.comparable_name(couple_names[taken+1]) then
  raise exception 'Escolha um nome ou apelido diferente para identificar seus registros.';
 end if;
 insert into public.memberships(user_id,space_id,slot) values(actor,invitation.space_id,free);
 couple_names[free+1]:=person;
 update public.spaces set names=couple_names where id=invitation.space_id;
 update dengo_private.couple_invites set used_at=now() where space_id=invitation.space_id;
 return invitation.space_id;
end $$;

create function dengo_private.leave_couple(p_delete_space boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=dengo_private.require_actor(); home uuid; members integer;
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text,0));
 select space_id into home from public.memberships where user_id=actor;
 if home is null then raise exception 'Sua conta não pertence a um casal.'; end if;
 perform 1 from public.spaces where id=home for update;
 select count(*) into members from public.memberships where space_id=home;
 if members<=1 then
  if not coalesce(p_delete_space,false) then
   raise exception 'Você é a última pessoa deste espaço. Confirme a exclusão do espaço e de todos os registros.' using errcode='DG001';
  end if;
  -- Primeiro os registros, com o espaço ainda existente, para que os gatilhos
  -- de notificação possam gravar; a exclusão do espaço remove o restante.
  delete from public.entries where space_id=home;
  delete from public.spaces where id=home;
  return jsonb_build_object('deleted',true);
 end if;
 -- Um convite pendente não deve continuar válido depois da mudança no casal.
 delete from dengo_private.couple_invites where space_id=home;
 delete from public.notification_inbox where user_id=actor and space_id=home;
 delete from public.memberships where user_id=actor;
 return jsonb_build_object('deleted',false);
end $$;
revoke all on function dengo_private.leave_couple(boolean) from public,anon,authenticated;
grant execute on function dengo_private.leave_couple(boolean) to authenticated;
create function public.leave_couple(p_delete_space boolean default false) returns jsonb language sql security invoker set search_path='' as $$
 select dengo_private.leave_couple(p_delete_space)
$$;
revoke all on function public.leave_couple(boolean) from public,anon;
grant execute on function public.leave_couple(boolean) to authenticated;

commit;
