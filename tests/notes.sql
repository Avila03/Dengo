-- Testes de supabase/notes.sql. Transação revertida.
begin;
insert into auth.users(id,email) values
('00000000-0000-4000-a000-000000000401','bilhete-a@example.invalid'),
('00000000-0000-4000-a000-000000000402','bilhete-b@example.invalid'),
('00000000-0000-4000-a000-000000000403','bilhete-fora@example.invalid');
set local role anon;
do $$ begin
 begin perform 1 from public.notes;raise exception using errcode='P0002',message='Anon reads notes';exception when insufficient_privilege then null;end;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000401',true);
select set_config('t.space',public.create_couple('Bilhetes','Ana')::text,true);
select set_config('t.code',public.create_couple_invite()->>'code',true);
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000402',true);
select public.join_couple(current_setting('t.code'),'Bruno');
-- Bruno tenta se passar pela Ana: a autoria vem da sessão.
insert into public.notes(space_id,author_slot,created_by,body) values
 (current_setting('t.space')::uuid,0,'00000000-0000-4000-a000-000000000401','  Comprei o café!  ');
do $$ declare n public.notes; begin
 select * into n from public.notes;
 assert n.author_slot=1,'Author slot spoofed';
 assert n.created_by='00000000-0000-4000-a000-000000000402','Author spoofed';
 assert n.body='Comprei o café!','Body not trimmed';
 begin insert into public.notes(space_id,author_slot,body) values(current_setting('t.space')::uuid,1,'   ');raise exception using errcode='P0002',message='Empty note';exception when check_violation then null;end;
 begin insert into public.notes(space_id,author_slot,body) values(current_setting('t.space')::uuid,1,repeat('a',281));raise exception using errcode='P0002',message='Long note';exception when check_violation then null;end;
 begin update public.notes set body='editado';raise exception using errcode='P0002',message='Note edited';exception when insufficient_privilege then null;end;
 begin truncate public.notes;raise exception using errcode='P0002',message='Truncate allowed';exception when insufficient_privilege then null;end;
end $$;
-- Ana lê, mas não apaga o bilhete do Bruno.
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000401',true);
do $$ begin
 assert (select count(*) from public.notes)=1,'Partner cannot read';
 delete from public.notes;
 assert (select count(*) from public.notes)=1,'Partner deleted a note she did not write';
end $$;
insert into public.notes(space_id,author_slot,body) values(current_setting('t.space')::uuid,0,'Te amo, boa prova!');
-- Alguém de fora não lê nem escreve.
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000403',true);
do $$ begin
 assert (select count(*) from public.notes)=0,'Outsider reads notes';
 begin insert into public.notes(space_id,author_slot,body) values(current_setting('t.space')::uuid,0,'oi');raise exception using errcode='P0002',message='Outsider wrote';exception when sqlstate 'P0001' or insufficient_privilege then null;end;
end $$;
-- Bruno apaga o próprio bilhete.
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000402',true);
do $$ begin
 delete from public.notes where created_by=auth.uid();
 assert (select count(*) from public.notes)=1,'Own note not deleted';
 assert (select author_slot from public.notes)=0,'Wrong note left';
end $$;
reset role;
select 'PASS: bilhetes do casal, autoria da sessão, sem edição, só apaga o próprio e isolamento' as result;
rollback;
