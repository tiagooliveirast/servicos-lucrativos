-- ============================================================
-- Onda 42 — Corrige upsert do radar_eventos e motivo_exibicoes
-- PostgREST não aceita expressões no on_conflict (apenas nomes
-- de colunas). Substituímos o índice único de expressão por um
-- índice único sobre uma coluna gerada (dia em UTC), que o
-- PostgREST consegue usar no parâmetro on_conflict.
-- ============================================================

-- ----------------------------------------------------------------------------
-- 1) radar_eventos
-- ----------------------------------------------------------------------------
alter table public.radar_eventos
  add column if not exists criado_em_dia date
  generated always as ((criado_em AT TIME ZONE 'UTC')::date) stored;

drop index if exists idx_radar_user_regra_dia;
create unique index if not exists idx_radar_user_regra_dia
  on public.radar_eventos(user_id, regra_id, criado_em_dia);

-- ----------------------------------------------------------------------------
-- 2) motivo_exibicoes
-- ----------------------------------------------------------------------------
alter table public.motivo_exibicoes
  add column if not exists exibido_em_dia date
  generated always as ((exibido_em AT TIME ZONE 'UTC')::date) stored;

drop index if exists idx_motivo_exibicoes_dia;
create unique index if not exists idx_motivo_exibicoes_dia
  on public.motivo_exibicoes(user_id, contexto, exibido_em_dia);