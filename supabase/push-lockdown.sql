-- pg_net queues include dispatch authentication headers until delivery.
revoke all on all tables in schema net from public,anon,authenticated;
revoke all on all functions in schema net from public,anon,authenticated;
grant execute on all functions in schema net to service_role;
