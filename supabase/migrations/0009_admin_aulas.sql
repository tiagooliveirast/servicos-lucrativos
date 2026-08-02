-- ============================================================
-- Gestão Lucrativa — Fase 1, finalização
-- Admin gerencia os vídeos das aulas (painel /admin/aulas)
-- Execute este arquivo após o 0008_onboarding_idempotente.sql.
-- ============================================================

-- O aluno continua lendo (política existente "usuarios_autenticados_leem_aulas").
-- O admin ganha SELECT e UPDATE — somente leitura para os demais continua valendo.
drop policy if exists "admin_ve_todas_aulas" on public.aulas_semana;
create policy "admin_ve_todas_aulas" on public.aulas_semana
  for select using (auth.uid() in (select user_id from admins));

drop policy if exists "admin_atualiza_aulas" on public.aulas_semana;
create policy "admin_atualiza_aulas" on public.aulas_semana
  for update using (auth.uid() in (select user_id from admins))
  with check (auth.uid() in (select user_id from admins));

grant select, insert, update, delete on all tables in schema public to anon, authenticated;
