-- ============================================================
-- Onda 7 — fix: embedding `perfis(...)` nas consultas admin
-- de duvidas/missoes_anexos retornava HTTP 400 (PostgREST não
-- resolve a relação sem FK direta). Como perfis.id é o próprio
-- auth-uid e o trigger de 0001 cria perfis para todo usuário,
-- adicionar FK de user_id → perfis(id) resolve o embed.
-- ============================================================

alter table public.duvidas
  drop constraint if exists duvidas_user_id_fk_perfis,
  add constraint duvidas_user_id_fk_perfis
  foreign key (user_id) references public.perfis(id) on delete cascade;

alter table public.missoes_anexos
  drop constraint if exists missoes_anexos_user_id_fk_perfis,
  add constraint missoes_anexos_user_id_fk_perfis
  foreign key (user_id) references public.perfis(id) on delete cascade;