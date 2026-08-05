-- ============================================================
-- 0029 — Auditoria: itens de segurança 6–13 (Prompt #30)
--
-- 6)  Teto de sanidade no faturamento autodeclarado (anti erro de
--     digitação com zero a mais — não é proteção contra fraude);
-- 7)  Revoga INSERT/UPDATE/DELETE do anon em TODAS as tabelas de
--     public (a página pública passa pela RPC buscar_pagina_publica,
--     SECURITY DEFINER — não depende de grant direto);
-- 8)  eh_admin(): checagem de admin centralizada; todas as políticas
--     com o subselect `auth.uid() in (select user_id from admins)`
--     são reescritas (DROP + CREATE) para usar a função;
-- 9)  Reforço explícito do REVOKE de recalcular_ime_atual (0023 já
--     revogara; repete por clareza do item de auditoria).
-- ============================================================

-- ----------------------------------------------------------------------------
-- 8) Função central de checagem de admin.
-- SECURITY DEFINER: roda como o dono da tabela (postgres) e por isso
-- enxerga admins sem passar pelo RLS — sem recursão quando usada nas
-- próprias políticas (o subselect inline que a 0007 contornou na tabela
-- admins deixa de ser necessário em qualquer lugar).
-- EXECUTE só para authenticated: anon e service role não precisam.
-- ----------------------------------------------------------------------------
create or replace function public.eh_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke all on function public.eh_admin() from public;
grant execute on function public.eh_admin() to authenticated;

-- ----------------------------------------------------------------------------
-- 6) Teto no faturamento autodeclarado (valor <= 200.000).
-- Apenas limite de sanidade contra erro de digitação (ex: zero a mais).
-- ----------------------------------------------------------------------------
alter table public.faturamento_validado
  drop constraint if exists faturamento_valor_teto;
alter table public.faturamento_validado
  add constraint faturamento_valor_teto check (valor <= 200000);

-- ----------------------------------------------------------------------------
-- 7) anon perde qualquer DML em todas as tabelas de public.
-- O fluxo anônimo (página pública) usa apenas a RPC buscar_pagina_publica
-- (SECURITY DEFINER); onboarding/check-in/semanas são de authenticated.
-- ----------------------------------------------------------------------------
do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('revoke insert, update, delete on table public.%I from anon;', r.tablename);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 9) recalcular_ime_atual: reforço explícito — apenas authenticated.
-- (A migration 0023 já fez este mesmo revoke; mantido aqui por clareza
-- do item de auditoria e por idempotência.)
-- ----------------------------------------------------------------------------
revoke execute on function public.recalcular_ime_atual() from public, anon;
grant execute on function public.recalcular_ime_atual() to authenticated;

-- ----------------------------------------------------------------------------
-- 8) Reescreve as políticas de admin para usar public.eh_admin().
-- Mesmo comportamento, sem o subselect inline duplicado (fonte única).
-- ----------------------------------------------------------------------------

-- 0004 — admin_atividade
drop policy if exists "admin_ve_atividade" on public.atividade_log;
create policy "admin_ve_atividade" on public.atividade_log
  for select using (public.eh_admin());

drop policy if exists "admin_ve_perfis_de_todos" on public.perfis;
create policy "admin_ve_perfis_de_todos" on public.perfis
  for select using (public.eh_admin());

drop policy if exists "admin_ve_diagnostico_de_todos" on public.diagnostico_inicial;
create policy "admin_ve_diagnostico_de_todos" on public.diagnostico_inicial
  for select using (public.eh_admin());

drop policy if exists "admin_ve_progresso_de_todos" on public.progresso_semanas;
create policy "admin_ve_progresso_de_todos" on public.progresso_semanas
  for select using (public.eh_admin());

drop policy if exists "admin_ve_missoes_de_todos" on public.missoes;
create policy "admin_ve_missoes_de_todos" on public.missoes
  for select using (public.eh_admin());

drop policy if exists "admin_ve_indicadores_de_todos" on public.indicadores_semana;
create policy "admin_ve_indicadores_de_todos" on public.indicadores_semana
  for select using (public.eh_admin());

drop policy if exists "admin_ve_paineis_de_todos" on public.paineis_mensais;
create policy "admin_ve_paineis_de_todos" on public.paineis_mensais
  for select using (public.eh_admin());

drop policy if exists "admin_ve_radar_de_todos" on public.radar_eventos;
create policy "admin_ve_radar_de_todos" on public.radar_eventos
  for select using (public.eh_admin());

-- 0005 — acessos
drop policy if exists "admin_ve_todos_acessos" on public.acessos;
create policy "admin_ve_todos_acessos" on public.acessos
  for select using (public.eh_admin());

drop policy if exists "admin_atualiza_acessos" on public.acessos;
create policy "admin_atualiza_acessos" on public.acessos
  for update using (public.eh_admin());

-- 0009 — aulas
drop policy if exists "admin_ve_todas_aulas" on public.aulas_semana;
create policy "admin_ve_todas_aulas" on public.aulas_semana
  for select using (public.eh_admin());

drop policy if exists "admin_atualiza_aulas" on public.aulas_semana;
create policy "admin_atualiza_aulas" on public.aulas_semana
  for update using (public.eh_admin())
  with check (public.eh_admin());

-- 0012 — checkins e IME
drop policy if exists "admin_ve_checkins_de_todos" on public.checkins_semanais;
create policy "admin_ve_checkins_de_todos" on public.checkins_semanais
  for select using (public.eh_admin());

drop policy if exists "admin_ve_ime_de_todos" on public.ime_historico;
create policy "admin_ve_ime_de_todos" on public.ime_historico
  for select using (public.eh_admin());

-- 0014 — gamificação
drop policy if exists "admin_ve_gamificacao_de_todos" on public.gamificacao_usuario;
create policy "admin_ve_gamificacao_de_todos" on public.gamificacao_usuario
  for select using (public.eh_admin());

drop policy if exists "admin_ve_conquistas_de_todos" on public.conquistas_usuario;
create policy "admin_ve_conquistas_de_todos" on public.conquistas_usuario
  for select using (public.eh_admin());

drop policy if exists "admin_ve_bauis_de_todos" on public.bauis_usuario;
create policy "admin_ve_bauis_de_todos" on public.bauis_usuario
  for select using (public.eh_admin());

-- 0015 — chaves
drop policy if exists "admin_ve_chaves_de_todos" on public.chaves_usuario;
create policy "admin_ve_chaves_de_todos" on public.chaves_usuario
  for select using (public.eh_admin());

drop policy if exists "admin_atualiza_chaves_de_todos" on public.chaves_usuario;
create policy "admin_atualiza_chaves_de_todos" on public.chaves_usuario
  for update using (public.eh_admin())
  with check (public.eh_admin());

-- 0016 — faturamento validado e IE
drop policy if exists "admin_ve_faturamento_validado_de_todos" on public.faturamento_validado;
create policy "admin_ve_faturamento_validado_de_todos" on public.faturamento_validado
  for select using (public.eh_admin());

drop policy if exists "admin_ve_ie_de_todos" on public.ie_historico;
create policy "admin_ve_ie_de_todos" on public.ie_historico
  for select using (public.eh_admin());

-- 0019 — análises IA diárias
drop policy if exists "admin_ve_todas_analises" on public.analises_ia_diarias;
create policy "admin_ve_todas_analises" on public.analises_ia_diarias
  for select using (public.eh_admin());

-- 0020 — central de dúvidas, anexos e storage
drop policy if exists "admin_ve_duvidas_de_todos" on public.duvidas;
create policy "admin_ve_duvidas_de_todos" on public.duvidas
  for select using (public.eh_admin());

drop policy if exists "admin_atualiza_duvidas_de_todos" on public.duvidas;
create policy "admin_atualiza_duvidas_de_todos" on public.duvidas
  for update using (public.eh_admin())
  with check (public.eh_admin());

drop policy if exists "admin_ve_anexos_de_todos" on public.missoes_anexos;
create policy "admin_ve_anexos_de_todos" on public.missoes_anexos
  for select using (public.eh_admin());

drop policy if exists "admin_atualiza_anexos_de_todos" on public.missoes_anexos;
create policy "admin_atualiza_anexos_de_todos" on public.missoes_anexos
  for update using (public.eh_admin())
  with check (public.eh_admin());

drop policy if exists "admin_ver_todos_anexos" on storage.objects;
create policy "admin_ver_todos_anexos" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'missoes-anexos'
    and public.eh_admin()
  );

-- 0022 — dicas de preenchimento
drop policy if exists "admin_ve_todas_dicas" on public.dicas_preenchimento_semana;
create policy "admin_ve_todas_dicas" on public.dicas_preenchimento_semana
  for select using (public.eh_admin());

-- 0027 — lembretes enviados (envio manual pelo admin)
drop policy if exists "admin_registra_lembrete_manual" on public.lembretes_enviados;
create policy "admin_registra_lembrete_manual" on public.lembretes_enviados
  for insert to authenticated
  with check (public.eh_admin());

drop policy if exists "admin_ve_lembretes_enviados" on public.lembretes_enviados;
create policy "admin_ve_lembretes_enviados" on public.lembretes_enviados
  for select to authenticated
  using (public.eh_admin());

-- ----------------------------------------------------------------------------
-- 8) admin_atualizar_whatsapp (0027) também passa a usar eh_admin() —
-- mesma semântica, checagem centralizada.
-- ----------------------------------------------------------------------------
create or replace function public.admin_atualizar_whatsapp(alvo uuid, novo_whatsapp text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.eh_admin() then
    raise exception 'Apenas administradores podem editar o WhatsApp.';
  end if;
  update public.perfis
     set whatsapp = nullif(trim(novo_whatsapp), '')
   where id = alvo;
end;
$$;

revoke all on function public.admin_atualizar_whatsapp(uuid, text) from public;
grant execute on function public.admin_atualizar_whatsapp(uuid, text) to authenticated;
