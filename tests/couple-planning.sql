-- Rollback-only integration checks: no fixtures or notifications remain committed.
begin;
do $$ declare m record; begin
 select user_id,space_id into m from public.memberships limit 1;
 if m.user_id is null then raise exception 'A membership is required for these isolated checks'; end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',m.user_id,'role','authenticated')::text,true);
 perform set_config('dengo.test_user',m.user_id::text,true);
 perform set_config('dengo.test_space',m.space_id::text,true);
end $$;
set local role authenticated;
do $$
declare home uuid:=current_setting('dengo.test_space')::uuid; parent uuid:=gen_random_uuid(); goal uuid:=gen_random_uuid();
 following uuid; shopping uuid:=gen_random_uuid(); blocked boolean; n integer;
begin
 insert into public.entries(id,space_id,kind,title,detail,assignee,due,done,data)
 values(parent,home,'task','Fixture responsibility','','Nós dois','2026-11-04',false,'{"recurrence":"weekly"}');
 insert into public.entries(space_id,kind,title,detail,assignee,due,done,data)
 values(home,'subtask','First step','','Nós dois','',false,jsonb_build_object('parentId',parent)),
       (home,'subtask','Second step','','Nós dois','',false,jsonb_build_object('parentId',parent));
 update public.entries set done=true where id=parent;
 select count(*) into n from public.entries where kind='subtask' and data->>'parentId'=parent::text and done;
 if n<>2 then raise exception 'Completing the parent did not complete its steps'; end if;
 select id into following from public.entries where occurrence_from=parent;
 if following is null then raise exception 'Recurring successor missing'; end if;
 select count(*) into n from public.entries where kind='subtask' and data->>'parentId'=following::text and not done;
 if n<>2 then raise exception 'The successor did not receive its reset checklist'; end if;
 blocked:=false;
 begin
  insert into public.entries(space_id,kind,title,detail,assignee,due,done,data)
  values(home,'subtask','Orphan','','Nós dois','',false,jsonb_build_object('parentId',gen_random_uuid()));
 exception when raise_exception then blocked:=true; end;
 if not blocked then raise exception 'Orphan subtask accepted'; end if;
 insert into public.entries(id,space_id,kind,title,detail,assignee,due,done,data)
 values(goal,home,'goal','Fixture goal','','Nós dois','',false,'{"goalTarget":50000}');
 insert into public.entries(space_id,kind,title,detail,assignee,due,done,data)
 values(home,'saving','First contribution','','Nós dois','2026-11-04',true,jsonb_build_object('goalId',goal,'amount',10000,'payer',0)),
       (home,'saving','Second contribution','','Nós dois','2026-11-04',true,jsonb_build_object('goalId',goal,'amount',20000,'payer',1));
 if (select sum((data->>'amount')::numeric) from public.entries where kind='saving' and data->>'goalId'=goal::text)<>30000 then raise exception 'Contributions were not independent'; end if;
 blocked:=false;
 begin
  insert into public.entries(space_id,kind,title,detail,assignee,due,done,data)
  values(home,'saving','Orphan contribution','','Nós dois','2026-11-04',true,jsonb_build_object('goalId',parent,'amount',1000,'payer',0));
 exception when raise_exception then blocked:=true; end;
 if not blocked then raise exception 'A contribution accepted a non-goal parent'; end if;
 insert into public.entries(id,space_id,kind,title,detail,assignee,due,done,data)
 values(shopping,home,'shopping','Fixture shopping','','Nós dois','',false,'{"quantityMilli":2000,"unit":"l","unitPrice":499,"budget":998}');
 blocked:=false;
 begin update public.entries set data=data||'{"budget":499}'::jsonb where id=shopping;
 exception when raise_exception then blocked:=true; end;
 if not blocked then raise exception 'Incorrect extended shopping price accepted'; end if;
 delete from public.entries where id=goal;
 if exists(select 1 from public.entries where kind='saving' and data->>'goalId'=goal::text) then raise exception 'Goal deletion left orphan contributions'; end if;
 delete from public.entries where id=parent;
 if exists(select 1 from public.entries where kind='subtask' and data->>'parentId'=parent::text) then raise exception 'Responsibility deletion left orphan steps'; end if;
end $$;
reset role;
do $$ declare notice uuid; begin
 insert into public.notification_inbox(user_id,space_id,message_key,type,title,body,url)
 values(current_setting('dengo.test_user')::uuid,current_setting('dengo.test_space')::uuid,'fixture:'||gen_random_uuid()::text,'dailyDigest','Fixture notice','Fixture body','/') returning id into notice;
 perform set_config('dengo.test_notice',notice::text,true);
end $$;
set local role authenticated;
do $$ declare blocked boolean; n integer; begin
 update public.notification_inbox set read_at=now() where id=current_setting('dengo.test_notice')::uuid;
 get diagnostics n=row_count;
 if n<>1 then raise exception 'The owner could not mark their notice as read'; end if;
 blocked:=false;
 begin update public.notification_inbox set title='Forged title' where id=current_setting('dengo.test_notice')::uuid;
 exception when insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'The reader could edit notification contents'; end if;
 blocked:=false;
 begin insert into public.notification_inbox(user_id,space_id,message_key,type,title,body,url)
 values(current_setting('dengo.test_user')::uuid,current_setting('dengo.test_space')::uuid,'forged','dailyDigest','Forged','Forged','/');
 exception when insufficient_privilege then blocked:=true; end;
 if not blocked then raise exception 'The reader could forge a notice'; end if;
end $$;
reset role;
select true as subtasks_goals_prices_and_inbox_permissions_verified;
rollback;
