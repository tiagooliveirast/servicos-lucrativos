-- ============================================================
-- Auditoria (item 36) — Rotação do log de atividade
--
-- A atividade_log cresce indefinidamente (1 insert por marco,
-- sem limite nem limpeza). Política simples: manter só os
-- últimos 90 dias, com uma limpeza mensal via pg_cron.
--
-- IMPORTANTE (depende do plano do Supabase):
--   * pg_cron exige plano pago (Pro+). Em planos gratuitos a
--     criação é bloqueada — o bloco abaixo captura o erro e
--     apenas avisa, sem quebrar as migrations.
--   * Se a rotação NÃO foi agendada, habilitar pg_cron em
--     Dashboard > Database > Extensions e rodar o bloco final
--     deste arquivo no SQL Editor.
--   * Para testar manualmente sem esperar o cron:
--       select public.limpar_atividade_log();
-- ============================================================

-- ------------------------------------------------------------------
-- 1) Policy de DELETE restrita ao service role
-- A rotina de limpeza roda como postgres (isento de RLS), mas a
-- política permite que o service role apague diretamente via API
-- (ex.: uma Edge Function de manutenção) sem abrir isso para anon
-- nem para o aluno autenticado.
-- ------------------------------------------------------------------
drop policy if exists "rotina_limpa_atividade_log" on public.atividade_log;
create policy "rotina_limpa_atividade_log" on public.atividade_log
  for delete using (current_user = 'service_role');

-- ------------------------------------------------------------------
-- 2) Função de limpeza: apaga o que é mais antigo que 90 dias
-- ------------------------------------------------------------------
create or replace function public.limpar_atividade_log()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.atividade_log
  where criado_em < now() - interval '90 days';
end;
$$;

-- ------------------------------------------------------------------
-- 3) Agendamento mensal (só se pg_cron existir)
-- Todo dia 1º do mês às 3h UTC (0h em Brasília, UTC-3).
-- ------------------------------------------------------------------
do $rotacao$
begin
  if exists (select 1 from pg_proc where proname = 'schedule' and pronamespace = 'cron'::regnamespace) then
    begin
      perform cron.unschedule('limpeza-atividade-log')
        where exists (select 1 from cron.job where jobname = 'limpeza-atividade-log');

      perform cron.schedule(
        'limpeza-atividade-log',
        '0 3 1 * *',
        $$ select public.limpar_atividade_log(); $$
      );
      raise notice 'Rotação de atividade_log agendada (cron: limpeza-atividade-log).';
    exception when others then
      raise notice 'Rotação não agendada: % — verificar se pg_cron está habilitado.', sqlerrm;
    end;
  else
    raise notice 'pg_cron indisponível — rotação de atividade_log NÃO agendada. Habilitar extensões e rodar este arquivo no SQL Editor.';
  end if;
end;
$rotacao$;
