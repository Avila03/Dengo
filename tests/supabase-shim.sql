-- Simulação mínima do ambiente Supabase (auth, extensions, vault, net) para rodar os testes SQL do Dengo num Postgres comum. Nunca aplicar no projeto real.
do $$ begin
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
 if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end $$;
grant anon, authenticated, service_role to postgres;
create schema auth; create schema extensions;
create extension pgcrypto with schema extensions;
grant usage on schema extensions to public;
create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb);
create function auth.uid() returns uuid language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),(nullif(current_setting('request.jwt.claims',true),'')::jsonb)->>'sub')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid(), auth.jwt() to public;
grant usage on schema public to anon, authenticated, service_role;
create publication supabase_realtime;
create schema vault; create table vault.secrets(name text primary key, secret text);
create view vault.decrypted_secrets as select name, secret as decrypted_secret from vault.secrets;
create schema net; create function net.http_post(url text, headers jsonb default '{}', body jsonb default '{}', timeout_milliseconds int default 1000) returns bigint language sql as 'select 1::bigint';
-- Como no Supabase: tabelas novas em public recebem todas as permissões para anon e authenticated.
alter default privileges in schema public grant all on tables to anon, authenticated;
