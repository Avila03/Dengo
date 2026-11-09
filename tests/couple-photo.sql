-- Testes de supabase/couple-photo.sql. Transação revertida.
begin;
insert into auth.users(id,email) values
('00000000-0000-4000-a000-000000000301','foto-a@example.invalid'),
('00000000-0000-4000-a000-000000000302','foto-fora@example.invalid');
set local role anon;
do $$ begin
 begin perform public.couple_photo();raise exception using errcode='P0002',message='Anon reads photo';exception when insufficient_privilege then null;end;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000301',true);
select set_config('t.space',public.create_couple('Foto teste','Ana')::text,true);
update public.spaces set preferences=jsonb_build_object('title','Foto teste','photo','data:image/jpeg;base64,AAAA')
 where id=current_setting('t.space')::uuid;
do $$ declare s jsonb:=public.couple_summary(); begin
 assert not (s->'preferences' ? 'photo'),'Photo still in summary';
 assert s->>'photo_version'=md5('data:image/jpeg;base64,AAAA'),'Wrong photo version';
 assert s->'preferences'->>'title'='Foto teste','Preferences lost';
 assert public.couple_photo()='data:image/jpeg;base64,AAAA','Photo not returned';
end $$;
-- App antigo: salva outras preferências com a foto vazia. A foto é mantida.
update public.spaces set preferences=jsonb_build_object('title','Novo título','photo','')
 where id=current_setting('t.space')::uuid;
-- App novo sem a chave da foto: também mantém.
update public.spaces set preferences=jsonb_build_object('title','Outro título')
 where id=current_setting('t.space')::uuid;
do $$ begin
 assert public.couple_photo()='data:image/jpeg;base64,AAAA','Photo wiped by a save without removal';
 assert public.couple_summary()->'preferences'->>'title'='Outro título','Other preferences not saved';
end $$;
-- Trocar a foto funciona e muda a versão.
update public.spaces set preferences=jsonb_build_object('title','Outro título','photo','data:image/jpeg;base64,BBBB')
 where id=current_setting('t.space')::uuid;
do $$ begin
 assert public.couple_summary()->>'photo_version'=md5('data:image/jpeg;base64,BBBB'),'Version not updated';
end $$;
-- Remoção explícita apaga a foto e não grava o marcador.
update public.spaces set preferences=jsonb_build_object('title','Outro título','photo','','photo_removed',true)
 where id=current_setting('t.space')::uuid;
do $$ begin
 assert public.couple_photo()='','Photo not removed';
 assert public.couple_summary()->>'photo_version'='','Version after removal';
end $$;
reset role;
do $$ begin
 assert not exists(select 1 from public.spaces where preferences ? 'photo_removed'),'Marker persisted';
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000302',true);
do $$ begin
 assert public.couple_photo() is null,'Outsider reads a photo';
end $$;
reset role;
select 'PASS: foto sob demanda, versão, proteção contra apagar sem querer e remoção explícita' as result;
rollback;
