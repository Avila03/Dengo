-- Testes de integração no SQL Editor do Dengo. Todos os dados são revertidos.
begin;
insert into auth.users(id,email) values
('00000000-0000-4000-a000-000000000001','dengo-test-one@example.invalid'),
('00000000-0000-4000-a000-000000000002','dengo-test-two@example.invalid'),
('00000000-0000-4000-a000-000000000003','dengo-outsider@example.invalid');
insert into public.spaces(id,names) values
('10000000-0000-4000-a000-000000000001',array['Teste A','Teste B']),
('10000000-0000-4000-a000-000000000002',array['Outro A','Outro B']);
insert into public.memberships(user_id,space_id,slot) values
('00000000-0000-4000-a000-000000000001','10000000-0000-4000-a000-000000000001',0),
('00000000-0000-4000-a000-000000000002','10000000-0000-4000-a000-000000000001',1);
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000001',true);
insert into public.entries(id,space_id,kind,title,assignee,due,done,data) values
('20000000-0000-4000-a000-000000000001','10000000-0000-4000-a000-000000000001','task','Teste recorrente','Teste A','2026-01-31',false,'{"recurrence":"monthly","alternate":true}'),
('20000000-0000-4000-a000-000000000002','10000000-0000-4000-a000-000000000001','shopping','Compra teste','Teste A','',false,'{}');
select public.toggle_entry('20000000-0000-4000-a000-000000000001');
select public.toggle_entry('20000000-0000-4000-a000-000000000001');
select public.toggle_entry('20000000-0000-4000-a000-000000000001');
do $$ declare feb uuid; begin
 assert (select count(*) from public.entries where occurrence_from='20000000-0000-4000-a000-000000000001')=1, 'Recorrência duplicada';
 assert (select assignee from public.entries where occurrence_from='20000000-0000-4000-a000-000000000001')='Teste B','Alternância falhou';
 assert (select due from public.entries where occurrence_from='20000000-0000-4000-a000-000000000001')='2026-02-28','Data incorreta';
 select id into feb from public.entries where occurrence_from='20000000-0000-4000-a000-000000000001';
 perform public.toggle_entry(feb);
 assert (select due from public.entries where occurrence_from=feb)='2026-03-31','Dia original perdido após fevereiro';
 begin
 insert into public.entries(space_id,kind,title,assignee) values ('10000000-0000-4000-a000-000000000002','task','Forbidden','Teste');
 raise exception 'Escrita entre espaços permitida';
 exception when insufficient_privilege then null;
 end;
 begin
 update public.memberships set space_id='10000000-0000-4000-a000-000000000002';
 raise exception 'Alteração de vínculo permitida';
 exception when insufficient_privilege then null;
 end;
 begin
 insert into public.entries(space_id,kind,title,assignee,data) values ('10000000-0000-4000-a000-000000000001','expense','Valor inválido','Teste A','{"amount":null,"payer":0,"shareFirst":5000}');
 raise exception 'Despesa sem valor aceita';
 exception when check_violation then null;
 end;
end $$;
select public.convert_purchase('{"id":"20000000-0000-4000-a000-000000000003","title":"Despesa teste","detail":"","assignee":"Teste A","due":"2026-11-03","done":true,"data":{"amount":10001,"payer":0,"shareFirst":5000,"sourceId":"20000000-0000-4000-a000-000000000002"}}');
select public.convert_purchase('{"id":"20000000-0000-4000-a000-000000000004","title":"Despesa teste","detail":"","assignee":"Teste A","due":"2026-11-03","done":true,"data":{"amount":10001,"payer":0,"shareFirst":5000,"sourceId":"20000000-0000-4000-a000-000000000002"}}');
update public.spaces set names=array['Pessoa A','Pessoa B'] where id='10000000-0000-4000-a000-000000000001';
do $$ begin
 assert (select count(*) from public.entries where kind='expense')=1,'Despesa duplicada';
 assert (select done from public.entries where id='20000000-0000-4000-a000-000000000002')=true,'Compra não concluída';
 assert (select count(*) from public.entries where assignee in ('Teste A','Teste B'))=0,'Responsável não renomeado';
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000002',true);
do $$ begin assert (select count(*) from public.entries)=5,'Parceiro sem acesso aos registros'; end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000003',true);
do $$ begin
 assert (select count(*) from public.entries)=0,'Conta externa leu registros';
 assert (select count(*) from public.spaces)=0,'Conta externa leu espaço';
 begin
 perform public.toggle_entry('20000000-0000-4000-a000-000000000001');
 raise exception using errcode='P0002',message='Conta externa alterou registro';
 exception when sqlstate 'P0001' then null;
 end;
end $$;
reset role;
select 'PASS: privacidade, acesso compartilhado, divisão de permissões, recorrência mensal e compra atômica' as result;
rollback;
