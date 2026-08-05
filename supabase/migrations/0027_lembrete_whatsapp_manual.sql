-- ============================================================
-- Prompt #27 — Lembrete manual via WhatsApp no admin
--
-- Substitui o envio automático por e-mail: o cron semanal é
-- PAUSADO (sem remover nada — a Edge Function enviar-lembretes-
-- semanais e a tabela lembretes_enviados continuam existindo e
-- podem ser reagendadas no futuro). Quem envia passa a ser o
-- Tiago, pelo botão "Abrir WhatsApp" na Visão Geral da Turma.
--
-- Parte 1: pausa o cron de e-mail (cron.unschedule).
-- Parte 2: coluna perfis.whatsapp (formato livre).
-- Parte 3: RLS de lembretes_enviados — admin pode ler e
--          registrar envios manuais (tipo 'whatsapp_manual').
-- Parte 4: crm_risco_desistencia passa a expor o whatsapp,
--          para a lista do admin montar o link sem join extra.
-- ============================================================

-- ------------------------------------------------------------
-- PARTE 1 — Pausar o cron de e-mail (sem remover código)
-- ------------------------------------------------------------
do $pausa$
begin
  if exists (
    select 1 from pg_proc
    where proname = 'unschedule' and pronamespace = 'cron'::regnamespace
  ) then
    begin
      perform cron.unschedule('lembretes-semanais');
      raise notice 'Cron lembretes-semanais pausado.';
    exception when others then
      raise notice 'Não foi possível pausar o cron: %', sqlerrm;
    end;
  else
    raise notice 'pg_cron indisponível — nada a pausar (os lembretes de e-mail já não rodam).';
  end if;
end;
$pausa$;

-- ------------------------------------------------------------
-- PARTE 2 — Campo de WhatsApp no perfil
-- ------------------------------------------------------------
alter table public.perfis
  add column if not exists whatsapp text;

-- ------------------------------------------------------------
-- PARTE 3 — RLS de lembretes_enviados para o envio manual
--
-- Antes: só service role (Edge Function) lia/escrevia. Agora o
-- admin (Tiago) precisa REGISTRAR o envio manual e LER o último
-- envio de cada aluno para a lista mostrar "enviado há X dias".
-- O aluno comum continua sem acesso à tabela.
-- ------------------------------------------------------------
drop policy if exists "admin_registra_lembrete_manual" on public.lembretes_enviados;
create policy "admin_registra_lembrete_manual" on public.lembretes_enviados
  for insert to authenticated
  with check (
    auth.uid() in (select user_id from admins)
  );

drop policy if exists "admin_ve_lembretes_enviados" on public.lembretes_enviados;
create policy "admin_ve_lembretes_enviados" on public.lembretes_enviados
  for select to authenticated
  using (
    auth.uid() in (select user_id from admins)
  );

grant insert, select on public.lembretes_enviados to authenticated;

-- ------------------------------------------------------------
-- Parte 2 (complemento) — Admin edita o WhatsApp de qualquer
-- aluno (os 3 parceiros de validação se cadastraram antes do
-- campo existir). Função security definer: expõe APENAS a
-- coluna whatsapp, sem abrir update amplo em perfis.
-- ------------------------------------------------------------
create or replace function public.admin_atualizar_whatsapp(alvo uuid, novo_whatsapp text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.admins where user_id = auth.uid()) then
    raise exception 'Apenas administradores podem editar o WhatsApp.';
  end if;
  update public.perfis
     set whatsapp = nullif(trim(novo_whatsapp), '')
   where id = alvo;
end;
$$;

grant execute on function public.admin_atualizar_whatsapp(uuid, text) to authenticated;

-- ------------------------------------------------------------
-- PARTE 4 — View da turma expõe o WhatsApp
-- (drop/recreate perde os grants da migration 0020 → regrant)
-- ------------------------------------------------------------
drop view if exists public.crm_risco_desistencia;
create view public.crm_risco_desistencia
with (security_invoker = true) as
select
  p.id as user_id,
  p.nome,
  p.email,
  p.whatsapp,
  d.nome_empresa,
  coalesce(g.ultimo_login, p.ultimo_acesso_at::date) as ultimo_login,
  (current_date - coalesce(g.ultimo_login, p.ultimo_acesso_at::date)) as dias_sem_login
from public.perfis p
left join public.diagnostico_inicial d on d.user_id = p.id
left join public.gamificacao_usuario g on g.user_id = p.id
where (current_date - coalesce(g.ultimo_login, p.ultimo_acesso_at::date)) >= 7;

grant select on public.crm_risco_desistencia to authenticated;
