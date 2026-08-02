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
