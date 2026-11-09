-- Testes de supabase/leave-couple.sql. Rodar em transação de teste: tudo é revertido.
begin;
insert into auth.users(id,email) values
('00000000-0000-4000-a000-000000000201','sair-a@example.invalid'),
('00000000-0000-4000-a000-000000000202','sair-b@example.invalid'),
('00000000-0000-4000-a000-000000000203','sair-c@example.invalid'),
('00000000-0000-4000-a000-000000000204','sair-d@example.invalid');

set local role anon;
do $$ begin
 begin perform public.leave_couple(false);raise exception using errcode='P0002',message='Anon can leave';exception when insufficient_privilege then null;end;
end $$;
reset role;

set local role authenticated;
-- A cria o casal; B entra pelo convite.
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000201',true);
do $$ begin
 begin perform public.create_couple('Casa','Nós Dois');raise exception using errcode='P0002',message='Reserved name accepted on create';exception when sqlstate 'P0001' then null;end;
 begin perform public.leave_couple(false);raise exception using errcode='P0002',message='Leave without couple';exception when sqlstate 'P0001' then null;end;
end $$;
select set_config('t.space',public.create_couple('Casa teste','Ana')::text,true);
select set_config('t.code',public.create_couple_invite()->>'code',true);
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000202',true);
do $$ begin
 begin perform public.join_couple(current_setting('t.code'),'nos dois');raise exception using errcode='P0002',message='Reserved name accepted on join';exception when sqlstate 'P0001' then null;end;
 begin perform public.join_couple(current_setting('t.code'),' ANA ');raise exception using errcode='P0002',message='Same name accepted';exception when sqlstate 'P0001' then null;end;
end $$;
select public.join_couple(current_setting('t.code'),'Bruno');
insert into public.entries(id,space_id,kind,title,assignee,data) values
('20000000-0000-4000-a000-000000000201',current_setting('t.space')::uuid,'task','Tarefa da Ana','Ana','{}'),
('20000000-0000-4000-a000-000000000202',current_setting('t.space')::uuid,'task','Tarefa do Bruno','Bruno','{}'),
('20000000-0000-4000-a000-000000000203',current_setting('t.space')::uuid,'expense','Mercado','Ana','{"amount":1000,"payer":0,"shareFirst":5000}');
reset role;
insert into public.notification_inbox(user_id,space_id,message_key,type,title,body,url) values
('00000000-0000-4000-a000-000000000201',current_setting('t.space')::uuid,'k-a','dailyDigest','Resumo','Corpo','/'),
('00000000-0000-4000-a000-000000000202',current_setting('t.space')::uuid,'k-b','dailyDigest','Resumo','Corpo','/');
set local role authenticated;

-- Ana (lugar 0) sai. Os registros ficam com Bruno.
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000201',true);
do $$ declare r jsonb; begin
 r:=public.leave_couple(false);
 assert (r->>'deleted')::boolean=false,'Space deleted while partner remains';
 assert public.couple_summary() is null,'Leaver still has a couple';
 assert (select count(*) from public.entries)=0,'Leaver still reads entries';
 assert (select count(*) from public.notification_inbox)=0,'Leaver still reads inbox';
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000202',true);
do $$ begin
 assert (public.couple_summary()->>'members')::int=1,'Partner not alone';
 assert (public.couple_summary()->>'slot')::int=1,'Partner slot changed';
 assert (select count(*) from public.entries)=3,'Records lost';
 assert (select count(*) from public.notification_inbox)=1,'Partner inbox lost';
end $$;
reset role;
do $$ begin
 assert (select count(*) from public.notification_inbox where user_id='00000000-0000-4000-a000-000000000201')=0,'Leaver inbox kept';
 assert (select count(*) from dengo_private.couple_invites where space_id=current_setting('t.space')::uuid)=0,'Old invite kept';
end $$;
set local role authenticated;

-- Bruno, no lugar 1, agora pode convidar; quem entra ocupa o lugar 0 de Ana.
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000202',true);
select set_config('t.code2',public.create_couple_invite()->>'code',true);
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000203',true);
select public.join_couple(current_setting('t.code2'),'Carla');
do $$ begin
 assert (public.couple_summary()->>'slot')::int=0,'Joiner did not take the free slot';
 assert (public.couple_summary()->'names')=jsonb_build_array('Carla','Bruno'),'Names not updated';
 assert (select assignee from public.entries where id='20000000-0000-4000-a000-000000000201')='Carla','Vacant slot records not transferred';
 assert (select assignee from public.entries where id='20000000-0000-4000-a000-000000000202')='Bruno','Partner records changed';
 assert (select (data->>'payer')::int from public.entries where id='20000000-0000-4000-a000-000000000203')=0,'Payer index changed';
 begin perform public.create_couple_invite();raise exception using errcode='P0002',message='Invite on full couple';exception when sqlstate 'P0001' then null;end;
end $$;

-- Ana pode começar outro casal depois de sair.
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000201',true);
select set_config('t.space2',public.create_couple('Novo começo','Ana')::text,true);
do $$ begin
 assert (public.couple_summary()->>'space_id')=current_setting('t.space2'),'Leaver cannot start again';
end $$;

-- A última pessoa só sai confirmando a exclusão; o espaço e os registros somem.
insert into public.entries(space_id,kind,title,assignee) values(current_setting('t.space2')::uuid,'task','Algo','Ana');
do $$ begin
 begin perform public.leave_couple(false);raise exception using errcode='P0002',message='Last member left without confirmation';exception when sqlstate 'DG001' then null;end;
 assert (public.couple_summary()->>'members')::int=1,'Unconfirmed leave changed membership';
 assert (public.leave_couple(true)->>'deleted')::boolean,'Space not deleted';
 assert public.couple_summary() is null;
end $$;
reset role;
do $$ begin
 assert not exists(select 1 from public.spaces where id=current_setting('t.space2')::uuid),'Space kept';
 assert not exists(select 1 from public.entries where space_id=current_setting('t.space2')::uuid),'Entries kept';
 assert not exists(select 1 from public.push_changes where space_id=current_setting('t.space2')::uuid),'Push changes kept';
 assert exists(select 1 from public.spaces where id=current_setting('t.space')::uuid),'Other couple affected';
end $$;

-- Ninguém de fora consegue sair por outra pessoa ou ver o espaço.
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000204',true);
do $$ begin
 begin perform public.leave_couple(true);raise exception using errcode='P0002',message='Outsider left';exception when sqlstate 'P0001' then null;end;
 assert (select count(*) from public.entries)=0,'Outsider sees entries';
end $$;
reset role;
select 'PASS: sair do casal, convite por quem ficou, lugar vago, nome reservado e exclusão confirmada' as result;
rollback;
