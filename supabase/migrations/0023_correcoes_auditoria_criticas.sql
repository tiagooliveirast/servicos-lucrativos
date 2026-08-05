-- ----------------------------------------------------------------------------
-- 0023 — Correções críticas da auditoria (Prompt #23/#24)
--
-- 1+2) Idempotência de XP (semana + missão) e bloqueio de regressão de status
-- 3)   REVOKE EXECUTE em calcular_ime / recalcular_ime_atual
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- 1+2) Colunas de idempotência: XP concedido uma única vez por linha
-- ----------------------------------------------------------------------------
alter table public.progresso_semanas add column if not exists xp_creditado boolean not null default false;
alter table public.missoes add column if not exists xp_creditado boolean not null default false;

-- Backfill: linhas já concluídas antes desta correção já receberam seu XP.
-- A flag evita re-concessão caso o status seja tocado novamente por engano.
update public.progresso_semanas set xp_creditado = true where status = 'concluida' and not xp_creditado;
update public.missoes set xp_creditado = true where concluida and not xp_creditado;

-- ----------------------------------------------------------------------------
-- 1+2) Regressão de status bloqueada via trigger BEFORE UPDATE:
-- uma vez 'concluida', o registro não pode voltar para estado anterior.
-- (Políticas RLS não suportam a referência a OLD no WITH CHECK — por isso a
-- checagem mora no trigger, que vale para client, admin e código futuro.)
-- ----------------------------------------------------------------------------
create or replace function public.impede_regressao_status_semana()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status = 'concluida' and new.status is distinct from 'concluida' then
    raise exception 'Semana % já concluída não pode voltar para %', new.semana, new.status;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_impede_regressao_status_semana on public.progresso_semanas;
create trigger trg_impede_regressao_status_semana
  before update of status on public.progresso_semanas
  for each row execute function public.impede_regressao_status_semana();

create or replace function public.impede_regressao_concluida_missao()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.concluida and not new.concluida then
    raise exception 'Missão concluída não pode ser desmarcada';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_impede_regressao_concluida_missao on public.missoes;
create trigger trg_impede_regressao_concluida_missao
  before update of concluida on public.missoes
  for each row execute function public.impede_regressao_concluida_missao();

-- ----------------------------------------------------------------------------
-- 1+2) Triggers de XP idempotentes.
-- Viraram BEFORE triggers para gravar xp_creditado = true na MESMA transação
-- (em AFTER trigger a alteração de NEW não persiste). O XP só é concedido
-- quando a flag ainda está false.
-- ----------------------------------------------------------------------------
create or replace function public.gamifica_semana()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'concluida'
     and (tg_op = 'INSERT' or old.status is distinct from 'concluida')
     and not new.xp_creditado then
    new.xp_creditado := true;
    perform public.adicionar_xp(new.user_id, 100, 'Semana ' || new.semana || ' concluída');
    perform public.verificar_conquistas(new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_gamifica_semana on public.progresso_semanas;
create trigger trg_gamifica_semana
  before insert or update of status on public.progresso_semanas
  for each row execute function public.gamifica_semana();

create or replace function public.gamifica_missao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.concluida
     and (tg_op = 'INSERT' or not old.concluida)
     and not new.xp_creditado then
    new.xp_creditado := true;
    perform public.adicionar_xp(new.user_id, 10, 'Missão concluída');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_gamifica_missao on public.missoes;
create trigger trg_gamifica_missao
  before insert or update of concluida on public.missoes
  for each row execute function public.gamifica_missao();

-- ----------------------------------------------------------------------------
-- 3) calcular_ime: SECURITY DEFINER que aceitava UUID arbitrário estava com
--    EXECUTE aberto a PUBLIC (default do PostgreSQL) — qualquer um podia
--    chamar calcular_ime('<uuid de outra pessoa>') via REST e gravar
--    ime_historico falso para a vítima, ignorando RLS. Restringe ao owner
--    (as demais funções/triggers SECURITY DEFINER que a chamam rodam como
--    o dono e continuam funcionando).
-- ----------------------------------------------------------------------------
revoke execute on function public.calcular_ime(uuid) from public, anon, authenticated;
grant execute on function public.calcular_ime(uuid) to postgres;

-- recalcular_ime_atual: RPC pública legítima (usa auth.uid() internamente,
-- nunca recebe UUID do client). Restringe a authenticated.
revoke execute on function public.recalcular_ime_atual() from public, anon;
grant execute on function public.recalcular_ime_atual() to authenticated;
