-- Execute depois de criar manualmente as duas contas em Authentication > Users.
-- Substitua os e-mails e nomes. O script falha sem alterar nada se as contas não existirem.
begin;
do $$
declare first_id uuid; second_id uuid; home_id uuid;
begin
 select id into first_id from auth.users where lower(email)=lower('PRIMEIRO_EMAIL_AQUI');
 select id into second_id from auth.users where lower(email)=lower('SEGUNDO_EMAIL_AQUI');
 if first_id is null or second_id is null or first_id=second_id then
  raise exception 'Crie duas contas distintas e preencha os e-mails antes de executar.';
 end if;
 select id into home_id from public.spaces order by created_at limit 1;
 if home_id is null then raise exception 'Espaço do Dengo não encontrado.'; end if;
 if exists(select 1 from public.memberships where space_id=home_id and user_id not in(first_id,second_id)) then
  raise exception 'O espaço já contém uma conta diferente. Revise antes de continuar.';
 end if;
 update public.spaces set names=array['Bruno','NOME_DA_OUTRA_PESSOA'] where id=home_id;
 insert into public.memberships(user_id,space_id) values(first_id,home_id),(second_id,home_id)
 on conflict(user_id) do nothing;
end $$;
commit;
