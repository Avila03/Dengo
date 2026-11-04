-- Dengo Web Push. Existing couple records and author policies remain intact.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create table public.push_devices (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 endpoint text not null unique check(length(endpoint)<4096), subscription jsonb not null,
 created_at timestamptz not null default now(), last_test_at timestamptz
);
create index push_devices_user on public.push_devices(user_id);
alter table public.push_devices enable row level security;
revoke all on public.push_devices from anon,authenticated;
grant select on public.push_devices to authenticated;
create policy own_push_devices on public.push_devices for select to authenticated using(user_id=(select auth.uid()));
grant all on public.push_devices to service_role;

create table public.push_changes (
 id bigint generated always as identity primary key, space_id uuid not null references public.spaces(id) on delete cascade,
 actor_id uuid, action text not null, entry jsonb not null, previous jsonb, created_at timestamptz not null default now()
);
create index push_changes_recent on public.push_changes(space_id,created_at);
alter table public.push_changes enable row level security;
revoke all on public.push_changes from anon,authenticated;
grant all on public.push_changes to service_role;
grant usage,select on sequence public.push_changes_id_seq to service_role;

create table public.push_deliveries (
 device_id uuid not null references public.push_devices(id) on delete cascade, message_key text not null,
 state text not null default 'processing' check(state in('processing','sent','failed')),
 lease uuid not null default gen_random_uuid(), attempts integer not null default 1,
 retry_at timestamptz not null default now()+interval '5 minutes', created_at timestamptz not null default now(),
 primary key(device_id,message_key)
);
alter table public.push_deliveries enable row level security;
revoke all on public.push_deliveries from anon,authenticated;
grant all on public.push_deliveries to service_role;
create index push_deliveries_cleanup on public.push_deliveries(created_at);

create function dengo_private.capture_push_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.push_changes(space_id,actor_id,action,entry,previous)
 values(coalesce(new.space_id,old.space_id),auth.uid(),tg_op,
 case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end,
 case when tg_op='INSERT' then null else to_jsonb(old) end);
 if tg_op='DELETE' then return old; else return new; end if;
end $$;
revoke all on function dengo_private.capture_push_change() from public,anon,authenticated;
create trigger capture_dengo_push after insert or update or delete on public.entries for each row execute function dengo_private.capture_push_change();

create function dengo_private.push_runtime_config() returns jsonb language sql security definer set search_path='' as $$
 select decrypted_secret::jsonb from vault.decrypted_secrets where name='dengo_push_runtime_v1' limit 1
$$;
revoke all on function dengo_private.push_runtime_config() from public,anon,authenticated;
grant execute on function dengo_private.push_runtime_config() to service_role;
create function public.dengo_push_runtime_config() returns jsonb language sql security invoker set search_path='' as $$ select dengo_private.push_runtime_config() $$;
revoke all on function public.dengo_push_runtime_config() from public,anon,authenticated;
grant execute on function public.dengo_push_runtime_config() to service_role;

create function public.claim_push_delivery(p_device uuid,p_key text) returns uuid language plpgsql security invoker set search_path='' as $$
declare token uuid;
begin
 insert into public.push_deliveries(device_id,message_key) values(p_device,p_key)
 on conflict(device_id,message_key) do update set state='processing',lease=gen_random_uuid(),
 attempts=public.push_deliveries.attempts+1,retry_at=now()+interval '5 minutes'
 where public.push_deliveries.state<>'sent' and public.push_deliveries.retry_at<now() and public.push_deliveries.attempts<5
 returning lease into token;
 return token;
end $$;
revoke all on function public.claim_push_delivery(uuid,text) from public,anon,authenticated;
grant execute on function public.claim_push_delivery(uuid,text) to service_role;

-- No dispatch until the signed-dispatch migration is installed.
create function dengo_private.kick_push_dispatch() returns void language plpgsql security invoker set search_path='' as $$
begin return; end $$;
revoke all on function dengo_private.kick_push_dispatch() from public,anon,authenticated;

grant usage on schema dengo_private to service_role;
