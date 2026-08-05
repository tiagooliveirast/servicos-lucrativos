-- ============================================================
-- 0030 — Auditoria: fechamento de lacunas do 0029 (Prompt #30)
--
-- O 0029 revogou DML do anon apenas em TABELAS (pg_tables).
-- Verificação pós-push mostrou duas lacunas:
--
-- 1) Views de public (escudo_atual_usuario, crm_risco_desistencia,
--    crm_evolucao_acelerada, crm_candidatos_case) herdaram grants
--    INSERT/UPDATE/DELETE de DEFAULT PRIVILEGES da plataforma
--    (o comando "all tables in schema" das migrations antigas não
--    cobre objetos criados depois; os defaults sim). Nenhuma delas
--    é escrevível de verdade (RLS nas tabelas base + anon sem DML),
--    mas o grant em si viola o item 7 da auditoria.
-- 2) eh_admin() e admin_atualizar_whatsapp() ganharam EXECUTE do
--    anon pelos mesmos default privileges da plataforma — "revoke
--    from public" não remove grant direto ao papel anon. Corrige
--    revogando explicitamente de anon/service_role.
--
-- Também torna durável a restrição: os default privileges de
-- postgres em public deixam de conceder DML ao anon para objetos
-- criados daqui em diante.
-- ============================================================

-- ----------------------------------------------------------------------------
-- 7b) DML do anon em VIEWS e MATERIALIZED VIEWS de public (tabelas já
-- cobertas pelo 0029). Idempotente.
-- ----------------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select viewname as nome from pg_views where schemaname = 'public'
    union all
    select matviewname as nome from pg_matviews where schemaname = 'public'
  loop
    execute format('revoke insert, update, delete on public.%I from anon;', r.nome);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 7c) Durabilidade: objetos futuros criados por postgres em public (as
-- migrations) deixam de herdar DML do anon via default privileges.
-- ----------------------------------------------------------------------------
alter default privileges for role postgres in schema public
  revoke insert, update, delete on tables from anon;

-- ----------------------------------------------------------------------------
-- 8b) eh_admin(): revogar EXECUTE também de anon e service_role (grant
-- direto dos default privileges da plataforma — "from public" não cobre).
-- ----------------------------------------------------------------------------
revoke all on function public.eh_admin() from public, anon, service_role;
grant execute on function public.eh_admin() to authenticated;

-- ----------------------------------------------------------------------------
-- 8c) admin_atualizar_whatsapp: mesmo tratamento (o 0029 reescreveu a
-- função, mas o ACL antigo dos default privileges mantinha anon/sr).
-- ----------------------------------------------------------------------------
revoke all on function public.admin_atualizar_whatsapp(uuid, text) from public, anon, service_role;
grant execute on function public.admin_atualizar_whatsapp(uuid, text) to authenticated;
