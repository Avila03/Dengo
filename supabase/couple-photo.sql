-- Dengo 2.8.1 — foto do casal sob demanda.
-- Aplicar UMA vez, depois de leave-couple.sql.
--
-- A foto (até ~400 KB em base64) ficava em spaces.preferences e vinha junto em
-- todo couple_summary, chamado a cada atualização do app. Agora o resumo traz
-- só uma versão (md5) e o app busca a foto com couple_photo() quando ela muda.
--
-- Proteção: um app antigo ainda aberto envia a foto vazia ao salvar outras
-- preferências. O gatilho mantém a foto existente, a menos que a remoção seja
-- explícita (photo_removed=true, enviado pelo app novo no botão Remover foto).
begin;

create or replace function dengo_private.couple_summary() returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=dengo_private.require_actor(); result jsonb;
begin
 select jsonb_build_object('space_id',s.id,'slot',m.slot,'names',s.names,
   'preferences',s.preferences-'photo',
   'photo_version',case when coalesce(s.preferences->>'photo','')='' then '' else md5(s.preferences->>'photo') end,
   'members',(select count(*) from public.memberships all_members where all_members.space_id=s.id)) into result
 from public.memberships m join public.spaces s on s.id=m.space_id where m.user_id=actor;
 return result;
end $$;

create function dengo_private.couple_photo() returns text language plpgsql security definer set search_path='' as $$
declare actor uuid:=dengo_private.require_actor();
begin
 return (select coalesce(s.preferences->>'photo','') from public.memberships m join public.spaces s on s.id=m.space_id where m.user_id=actor);
end $$;
revoke all on function dengo_private.couple_photo() from public,anon,authenticated;
grant execute on function dengo_private.couple_photo() to authenticated;
create function public.couple_photo() returns text language sql security invoker set search_path='' as $$ select dengo_private.couple_photo() $$;
revoke all on function public.couple_photo() from public,anon;
grant execute on function public.couple_photo() to authenticated;

create function dengo_private.keep_couple_photo() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if coalesce(new.preferences->>'photo','')='' and coalesce(old.preferences->>'photo','')<>''
    and coalesce(new.preferences->>'photo_removed','')<>'true' then
  new.preferences:=pg_catalog.jsonb_set(new.preferences,'{photo}',old.preferences->'photo');
 end if;
 new.preferences:=new.preferences-'photo_removed';
 return new;
end $$;
revoke all on function dengo_private.keep_couple_photo() from public,anon,authenticated;
create trigger keep_couple_photo before update of preferences on public.spaces
 for each row execute function dengo_private.keep_couple_photo();

commit;
