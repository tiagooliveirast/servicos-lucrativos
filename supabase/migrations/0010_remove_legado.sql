-- ============================================================
-- Gestão Lucrativa — Fase 1, finalização
-- Remove a tabela legada acessos_legado (a migration 0005 já migrou
-- os e-mails liberados para a tabela nova baseada em user_id).
-- Execute este arquivo após o 0009_admin_aulas.sql.
-- ============================================================

drop table if exists public.acessos_legado;

grant select, insert, update, delete on all tables in schema public to anon, authenticated;
