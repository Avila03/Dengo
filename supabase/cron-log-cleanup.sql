-- Dengo 2.8.1 — o agendador de push roda a cada minuto e o pg_cron guarda cada
-- execução em cron.job_run_details, sem limite. Mantém só os últimos 7 dias.
-- Aplicado em produção em 09/11/2026 (migração dengo_cron_log_cleanup). Aplicar uma vez.
select cron.schedule(
  'dengo-cron-log-cleanup',
  '17 6 * * *', -- 03h17 em Brasília
  $$delete from cron.job_run_details where end_time < now() - interval '7 days'$$
);
