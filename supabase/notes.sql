-- Dengo 2.9 — Bilhetes: recados curtos de um para o outro, como post-its no "Nosso dia".
-- Aplicar UMA vez, depois de couple-photo.sql.
--
-- * Só quem é do casal lê e escreve; ninguém edita um bilhete depois de colado.
-- * Quem escreveu pode apagar o próprio bilhete; o par não apaga o que não escreveu.
-- * O lugar (0/1) e a autoria vêm da sessão, nunca do app.
-- * Ao sair do casal, os bilhetes ficam com quem permanece, como os demais registros.
begin;

create table public.notes(
 id uuid primary key default gen_random_uuid(),
 space_id uuid not null references public.spaces(id) on delete cascade,
 author_slot smallint not null check(author_slot in (0,1)),
 created_by uuid references auth.users(id) on delete set null,
 body text not null check(char_length(btrim(body)) between 1 and 280),
 created_at timestamptz not null default now()
);
create index notes_recent on public.notes(space_id,created_at desc,id desc);
alter table public.notes enable row level security;

create function dengo_private.stamp_note_author() returns trigger language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); slot smallint;
begin
 if actor is null then raise exception 'Entre na sua conta para deixar um bilhete.'; end if;
 select m.slot into slot from public.memberships m where m.user_id=actor and m.space_id=new.space_id;
 if slot is null then raise exception 'Bilhete fora do seu casal.'; end if;
 new.created_by:=actor;
 new.author_slot:=slot;
 new.body:=btrim(new.body);
 new.created_at:=now();
 return new;
end $$;
revoke all on function dengo_private.stamp_note_author() from public,anon,authenticated;
create trigger stamp_note_author before insert on public.notes
 for each row execute function dengo_private.stamp_note_author();

grant select,insert,delete on public.notes to authenticated;
create policy read_couple_notes on public.notes for select to authenticated
 using(exists(select 1 from public.memberships m where m.space_id=notes.space_id and m.user_id=(select auth.uid())));
create policy write_couple_notes on public.notes for insert to authenticated
 with check(exists(select 1 from public.memberships m where m.space_id=notes.space_id and m.user_id=(select auth.uid())));
create policy delete_own_notes on public.notes for delete to authenticated
 using(created_by=(select auth.uid())
   and exists(select 1 from public.memberships m where m.space_id=notes.space_id and m.user_id=(select auth.uid())));

alter publication supabase_realtime add table public.notes;

commit;
