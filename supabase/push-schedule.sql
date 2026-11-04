select cron.schedule('dengo-push-every-minute','* * * * *','select dengo_private.kick_push_dispatch()');
