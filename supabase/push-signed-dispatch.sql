-- Never place a reusable scheduler secret in the pg_net request queue.
create table public.push_dispatch_nonces(id uuid primary key,created_at timestamptz not null default now());
alter table public.push_dispatch_nonces enable row level security;
revoke all on public.push_dispatch_nonces from public,anon,authenticated;
grant all on public.push_dispatch_nonces to service_role;
create function dengo_private.signed_push_dispatch() returns void language plpgsql security definer set search_path='' as $$
declare config jsonb; stamp text; nonce text; signature text;
begin
 config:=dengo_private.push_runtime_config();
 if config is null then return; end if;
 stamp:=extract(epoch from now())::bigint::text;
 nonce:=gen_random_uuid()::text;
 signature:=encode(extensions.hmac(stamp||':'||nonce||':dispatch',config->>'cronSecret','sha256'),'hex');
 perform net.http_post(url:=(config->>'url')||'/functions/v1/dengo-push',
 headers:=jsonb_build_object('Content-Type','application/json','x-dengo-timestamp',stamp,'x-dengo-nonce',nonce,'x-dengo-signature',signature),
 body:='{"action":"dispatch"}'::jsonb,timeout_milliseconds:=120000);
 delete from public.push_changes where created_at<now()-interval '3 days';
 delete from public.push_deliveries where created_at<now()-interval '35 days';
 delete from public.push_dispatch_nonces where created_at<now()-interval '10 minutes';
end $$;
revoke all on function dengo_private.signed_push_dispatch() from public,anon,authenticated;
create or replace function dengo_private.kick_push_dispatch() returns void language sql security invoker set search_path='' as $$
 select dengo_private.signed_push_dispatch();
$$;
revoke all on function dengo_private.kick_push_dispatch() from public,anon,authenticated;
