-- ============================================================
-- NOTA SOBRE NUMERAÇÃO DE MIGRATIONS
-- A migration `0006` NUNCA existiu neste projeto — o gap está
-- presente desde o início (as migrations sempre foram aplicadas
-- em ordem numérica: 0005 -> 0007). Nada foi perdido nem pulado.
-- O gap é conhecido e intencionalmente NÃO corrigido: renumerar
-- migrations já aplicadas quebraria o histórico registrado em
-- supabase_migrations.schema_migrations. Não é uma migration
-- perdida ou corrompida.
-- ============================================================

-- ============================================================
-- Correção: recursão infinita na política "so_admin_ve_admins"
-- A política consultava a própria tabela admins (auth.uid() in
-- (select user_id from admins)), gerando SQLSTATE 42P17
-- ("infinite recursion detected") em QUALQUER consulta que
-- tocasse admins — inclusive perfis/acessos via políticas admin.
--
-- O app só checa se o usuário atual é admin (select ... where
-- user_id = auth.uid()), então a política pode ser simplesmente
-- "cada um vê a própria linha". As demais políticas (em outras
-- tabelas) seguem usando o subselect — sem recursão, pois a
-- política da própria tabela agora é direta.
-- ============================================================

drop policy if exists "so_admin_ve_admins" on public.admins;
create policy "so_admin_ve_admins" on public.admins
  for select using (auth.uid() = user_id);
