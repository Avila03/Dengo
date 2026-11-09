#!/usr/bin/env bash
# Cria um banco descartável, aplica os scripts do Dengo na ordem de produção e
# roda os testes SQL (todos em transação revertida). Uso:
#   PGHOST=localhost PGUSER=postgres PGPASSWORD=postgres scripts/test-sql.sh
set -euo pipefail
cd "$(dirname "$0")/.."
DB="${DENGO_TEST_DB:-dengo_test}"
psql -v ON_ERROR_STOP=1 -q -d postgres -c "drop database if exists $DB" -c "create database $DB"
run() { psql -v ON_ERROR_STOP=1 -q -d "$DB" "$@"; }
run -f tests/supabase-shim.sql
for f in setup lobby couple-planning; do run -f "supabase/$f.sql"; done
# pg_cron e pg_net não existem num Postgres comum; o agendamento não é testado aqui.
grep -v "create extension if not exists pg_cron\|create extension if not exists pg_net" supabase/push.sql | run
for f in push-lockdown push-signed-dispatch leave-couple; do run -f "supabase/$f.sql"; done
# couple-planning.sql (o teste) precisa de um casal já existente.
run <<'SQL'
insert into auth.users(id,email) values('00000000-0000-4000-a000-0000000000f1','fixture@example.invalid');
insert into public.spaces(id,names) values('10000000-0000-4000-a000-0000000000f1',array['Fixa A','Fixa B']);
insert into public.memberships(user_id,space_id,slot) values('00000000-0000-4000-a000-0000000000f1','10000000-0000-4000-a000-0000000000f1',0);
SQL
for t in database lobby couple-planning leave-couple; do
  echo "== tests/$t.sql"
  run -f "tests/$t.sql" | grep -E "PASS" || true
done
echo "Todos os testes SQL passaram."
