-- Rodar em transação de teste. Nenhuma conta, convite ou casal fica persistido.
begin;
insert into auth.users(id,email) values
('00000000-0000-4000-a000-000000000101','lobby-a@example.invalid'),
('00000000-0000-4000-a000-000000000102','lobby-b@example.invalid'),
('00000000-0000-4000-a000-000000000103','lobby-c@example.invalid'),
('00000000-0000-4000-a000-000000000104','lobby-d@example.invalid');
set local role anon;
do $$ begin
 begin perform public.couple_summary();raise exception using errcode='P0002',message='Anon can call summary';exception when insufficient_privilege then null;end;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000101',true);
select set_config('dengo_test.space',public.create_couple('Cantinho teste','Pessoa A')::text,true);
select set_config('dengo_test.old_code',public.create_couple_invite()->>'code',true);
select set_config('dengo_test.code',public.create_couple_invite()->>'code',true);
do $$ begin
 assert (public.couple_summary()->>'members')::int=1;
 assert (public.couple_summary()->>'slot')::int=0;
 begin perform public.create_couple('Duplicado','Pessoa A');raise exception using errcode='P0002',message='Duplicate couple';exception when sqlstate 'P0001' then null;end;
 begin perform token_hash from dengo_private.couple_invites;raise exception using errcode='P0002',message='Invite hashes exposed';exception when insufficient_privilege then null;end;
end $$;
insert into public.entries(id,space_id,kind,title,assignee) values('20000000-0000-4000-a000-000000000101',current_setting('dengo_test.space')::uuid,'task','Tarefa do criador','Pessoa A');
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000102',true);
do $$ begin
 begin perform public.join_couple(current_setting('dengo_test.old_code'),'Pessoa B');raise exception using errcode='P0002',message='Rotated code accepted';exception when sqlstate 'P0001' then null;end;
end $$;
select public.join_couple(current_setting('dengo_test.code'),'Pessoa B');
insert into public.entries(id,space_id,kind,title,assignee,created_by,created_by_slot) values('20000000-0000-4000-a000-000000000102',current_setting('dengo_test.space')::uuid,'shopping','Compra de B','Pessoa A','00000000-0000-4000-a000-000000000101',0);
update public.entries set detail='Alterado por B',created_by='00000000-0000-4000-a000-000000000102',created_by_slot=1 where id='20000000-0000-4000-a000-000000000101';
do $$ begin
 assert (public.couple_summary()->>'members')::int=2;
 assert (public.couple_summary()->>'slot')::int=1;
 assert (select count(*) from public.entries)=2,'Shared data missing';
 assert (select created_by_slot from public.entries where id='20000000-0000-4000-a000-000000000102')=1,'Spoofed creator';
 assert (select created_by_slot from public.entries where id='20000000-0000-4000-a000-000000000101')=0,'Creator changed on update';
 assert (select updated_by_slot from public.entries where id='20000000-0000-4000-a000-000000000101')=1,'Updater not tracked';
 begin perform public.create_couple_invite();raise exception using errcode='P0002',message='Partner generated invite';exception when sqlstate 'P0001' then null;end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000103',true);
do $$ begin
 assert public.couple_summary() is null;
 assert (select count(*) from public.entries)=0,'Outsider sees entries';
 begin perform public.join_couple(current_setting('dengo_test.code'),'Pessoa C');raise exception using errcode='P0002',message='Third member admitted';exception when sqlstate 'P0001' then null;end;
 begin insert into public.memberships(user_id,space_id,slot) values(auth.uid(),current_setting('dengo_test.space')::uuid,1);raise exception using errcode='P0002',message='Direct membership granted';exception when insufficient_privilege then null;end;
end $$;
select public.create_couple('Outro casal','Pessoa C');
select set_config('dengo_test.expired_code',public.create_couple_invite()->>'code',true);
reset role;
update dengo_private.couple_invites set expires_at=now()-interval '1 minute' where created_by='00000000-0000-4000-a000-000000000103';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000104',true);
do $$ begin
 begin perform public.join_couple(current_setting('dengo_test.expired_code'),'Pessoa D');raise exception using errcode='P0002',message='Expired invite accepted';exception when sqlstate 'P0001' then null;end;
 assert public.couple_summary() is null;
end $$;
reset role;
select 'PASS: onboarding, convite único, rotação, expiração, limite de duas pessoas, isolamento e autoria protegida' as result;
rollback;
