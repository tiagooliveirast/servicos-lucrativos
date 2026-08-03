-- ============================================================
-- Onda 1 — Reforço de integridade
-- Limite de 1 check-in por semana no BANCO, não só na aplicação.
-- A regra "no máximo 1 check-in por user_id por semana_referencia"
-- protege o histórico que alimenta o IME: se o app tiver bug ou
-- alguém chamar a API direto (Postman/REST), a duplicação é
-- rejeitada aqui — nunca confiar só na camada de cliente para
-- regra de consistência de dado.
-- Execute este arquivo após o 0012_checkins_ime.sql.
-- ============================================================

create unique index if not exists idx_checkins_semanais_user_semana
  on public.checkins_semanais(user_id, semana_referencia);