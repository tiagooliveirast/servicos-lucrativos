-- ============================================================
-- Missões: suportar mais de uma missão do mesmo tipo por semana
-- (a Semana 11 tem duas missões "rápidas").
-- A ordem de cada missão dentro da semana fica no novo campo `indice`.
-- ============================================================

alter table public.missoes add column if not exists indice int not null default 0;

drop index if exists idx_missoes_user_semana_tipo;
create unique index if not exists idx_missoes_user_semana_tipo on public.missoes (user_id, semana, tipo, indice);
