-- ============================================================
-- Gestão Lucrativa — Fase 1, finalização
-- Idempotência do onboarding
-- Execute este arquivo após o 0007_fix_policy_admin.sql.
-- ============================================================

-- O onboarding usa upsert onConflict("user_id") ao gravar o diagnóstico.
-- Sem a restrição unique, uma reconexão durante o salvamento poderia
-- duplicar a linha e travar o usuário na tela de erro de sessão
-- (maybeSingle() retorna erro com 2 linhas).
create unique index if not exists idx_diagnostico_user_unique
  on public.diagnostico_inicial(user_id);

grant select, insert, update, delete on all tables in schema public to anon, authenticated;
