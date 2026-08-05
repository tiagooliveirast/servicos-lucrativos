-- ============================================================
-- Prompt #25 — Agendamento semanal dos lembretes
--
-- Roda a Edge Function "enviar-lembretes-semanais" toda
-- segunda-feira às 12:00 UTC (= 09:00 em Brasília, UTC-3).
--
-- IMPORTANTE (depende do plano do Supabase):
--   * pg_cron e pg_net exigem plano pago (Pro+). Em planos
--     gratuitos a criação é bloqueada — o bloco abaixo captura
--     o erro e apenas avisa, sem quebrar as migrations.
--   * Se os lembretes NÃO foram agendados, habilitar manualmente
--     em Dashboard > Database > Extensions (habilitar pg_cron e
--     pg_net) e rodar o bloco final deste arquivo no SQL Editor.
--   * O Authorization usa app.settings.service_role_key: definir
--     UMA VEZ a chave do service role com (não commitar a chave):
--       alter role postgres set app.settings.service_role_key = '<SERVICE_ROLE_KEY>';
--     Ou, se preferir, ajustar o comando para chamar a função com
--     um JWT próprio da Edge Function.
-- ============================================================

-- Tag do bloco externo diferente das aspas internas ($$ ... $$): evita
-- que o parser do PL/pgSQL confunda os delimitadores aninhados.
do $lembretes$
begin
  -- 1) Extensões (podem falhar em plano gratuito)
  begin
    create extension if not exists pg_cron;
  exception when insufficient_privilege or others then
    raise notice 'pg_cron não pôde ser habilitado (plano sem suporte?). Habilitar manualmente em Database > Extensions.';
  end;

  begin
    create extension if not exists pg_net;
  exception when insufficient_privilege or others then
    raise notice 'pg_net não pôde ser habilitado (plano sem suporte?). Habilitar manualmente em Database > Extensions.';
  end;

  -- 2) Agendamento (só se pg_cron existir)
  if exists (select 1 from pg_proc where proname = 'schedule' and pronamespace = 'cron'::regnamespace) then
    begin
      perform cron.unschedule('lembretes-semanais')
        where exists (select 1 from cron.job where jobname = 'lembretes-semanais');

      perform cron.schedule(
        'lembretes-semanais',
        '0 12 * * 1', -- segunda-feira, 12h UTC (= 9h em Brasília)
        $$
        select net.http_post(
          url := 'https://orlngwrzfzuxnflcgnum.supabase.co/functions/v1/enviar-lembretes-semanais',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
          )
        );
        $$
      );
      raise notice 'Lembrete semanal agendado (cron: lembretes-semanais).';
    exception when others then
      raise notice 'Agendamento não concluído: % — verificar se pg_net e app.settings.service_role_key estão configurados.', sqlerrm;
    end;
  else
    raise notice 'pg_cron indisponível — lembrete semanal NÃO agendado. Habilitar extensões e rodar este arquivo no SQL Editor.';
  end if;
end;
$lembretes$;
