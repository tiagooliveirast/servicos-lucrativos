-- ============================================================
-- 0034 — Trava de tempo mínimo entre semanas (7 dias por semana)
--
-- Semana N só libera quando as DUAS condições valem:
--   1) Semana N-1 concluída (regra sequencial que já existia)
--   2) Pelo menos 7 dias corridos desde data_primeiro_acesso × (N-1)
--      (dia do acesso = dia 1 → Semana N libera a partir do dia 7×(N-1))
--
-- Compatibilidade retroativa: a trava NUNCA bloqueia progresso
-- existente. Ela só impede desbloqueios NOVOS de semanas ainda
-- 'bloqueada' — quem já tem semanas concluídas/em andamento
-- continua exatamente como está (a função de liberação só
-- desbloqueia, nunca re-bloqueia).
--
-- Ponto de partida: coluna data_primeiro_acesso em acessos,
-- preenchida no momento da ATIVAÇÃO do acesso (criar-acesso),
-- não no onboarding. Backfill usa created_at para quem já tinha.
-- ============================================================

-- ----------------------------------------------------------------------------
-- 1) data_primeiro_acesso: marco do "dia 1" do aluno
-- ----------------------------------------------------------------------------
alter table public.acessos
  add column if not exists data_primeiro_acesso timestamptz;

update public.acessos
   set data_primeiro_acesso = created_at
 where data_primeiro_acesso is null
   and created_at is not null;

-- ----------------------------------------------------------------------------
-- 2) Regra de tempo (SQL puro — usada pelo RPC e pelos triggers)
--    "dias corridos" = current_date - data_primeiro_acesso.
--    Semana N libera por tempo quando dias corridos >= 7*(N-1)-1
--    (dia 7 = 6 dias depois do acesso; dia 14 = 13 dias, e assim por diante).
--    Sem data confiável (acesso inexistente ou datas nulas) retorna true —
--    nunca bloqueia quem não tem como calcular o tempo.
-- ----------------------------------------------------------------------------
create or replace function public.semana_liberada_por_tempo(
  p_user_id uuid,
  p_semana int
)
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce(
    (
      current_date
      - coalesce(a.data_primeiro_acesso::date, a.created_at::date)
    ) >= 7 * (p_semana - 1) - 1,
    true
  )
  from public.acessos a
  where a.user_id = p_user_id;
$$;

revoke execute on function public.semana_liberada_por_tempo(uuid, int) from public, anon;

-- ----------------------------------------------------------------------------
-- 3) Liberação automática das semanas cujo tempo já passou
--    Idempotente: só faz 'bloqueada' → 'em_andamento' quando a anterior está
--    concluída E o tempo mínimo passou. Nunca re-bloqueia nada.
-- ----------------------------------------------------------------------------
create or replace function public.liberar_semanas_do_aluno(p_user_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_liberadas int := 0;
  v_prev_status text;
  v_row record;
begin
  for v_row in
    select semana
      from public.progresso_semanas
     where user_id = p_user_id
       and status = 'bloqueada'
       and semana between 2 and 12
     order by semana
  loop
    select status into v_prev_status
      from public.progresso_semanas
     where user_id = p_user_id
       and semana = v_row.semana - 1;

    if v_prev_status = 'concluida'
       and public.semana_liberada_por_tempo(p_user_id, v_row.semana) then
      update public.progresso_semanas
         set status = 'em_andamento'
       where user_id = p_user_id
         and semana = v_row.semana;
      v_liberadas := v_liberadas + 1;
    end if;
  end loop;

  return v_liberadas;
end;
$$;

revoke execute on function public.liberar_semanas_do_aluno(uuid) from public, anon;

-- RPC usado pelo client (sem parâmetro — o user vem de auth.uid()).
-- Chamado ao abrir a Sala de Guerra, o Painel e uma semana: desbloqueia
-- sozinho as semanas cujo tempo já passou ("libera no dia X sem ação manual").
create or replace function public.liberar_semanas_por_tempo()
returns int
language sql
security definer
set search_path = public
as $$
  select public.liberar_semanas_do_aluno(auth.uid());
$$;

revoke execute on function public.liberar_semanas_por_tempo() from public, anon;
grant execute on function public.liberar_semanas_por_tempo() to authenticated;

-- ----------------------------------------------------------------------------
-- 4) Trava no banco (antes do UPDATE/INSERT):
--    qualquer tentativa de tirar uma semana de 'bloqueada' sem cumprir
--    (anterior concluída E tempo mínimo) volta para 'bloqueada'.
--    Não afeta progresso já existente (não há transição 'bloqueada' nesse caso).
-- ----------------------------------------------------------------------------
create or replace function public.trava_tempo_antes_desbloqueio()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_prev_status text;
begin
  if new.semana = 1 then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and (old.status <> 'bloqueada' or new.status = 'bloqueada') then
    return new;
  end if;

  if tg_op = 'INSERT' and new.status = 'bloqueada' then
    return new;
  end if;

  select status into v_prev_status
    from public.progresso_semanas
   where user_id = new.user_id
     and semana = new.semana - 1;

  if v_prev_status is distinct from 'concluida'
     or not public.semana_liberada_por_tempo(new.user_id, new.semana) then
    new.status := 'bloqueada';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_trava_tempo_semana on public.progresso_semanas;
create trigger trg_trava_tempo_semana
  before update of status on public.progresso_semanas
  for each row execute function public.trava_tempo_antes_desbloqueio();

drop trigger if exists trg_trava_tempo_semana_insert on public.progresso_semanas;
create trigger trg_trava_tempo_semana_insert
  before insert on public.progresso_semanas
  for each row execute function public.trava_tempo_antes_desbloqueio();

-- ----------------------------------------------------------------------------
-- 5) Liberação automática no momento da conclusão:
--    quando uma semana vira 'concluida', roda a liberação do aluno — a
--    próxima só abre se o tempo mínimo já passou.
--    (O UPDATE interno da liberação muda 'bloqueada' → 'em_andamento', que
--     não é 'concluida' → sem re-disparo/recursão aqui nem no gamifica_semana.)
-- ----------------------------------------------------------------------------
create or replace function public.desbloqueia_proxima_apos_conclusao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'concluida'
     and (tg_op = 'INSERT' or old.status is distinct from 'concluida') then
    perform public.liberar_semanas_do_aluno(new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_desbloqueia_proxima_apos_conclusao on public.progresso_semanas;
create trigger trg_desbloqueia_proxima_apos_conclusao
  after insert or update of status on public.progresso_semanas
  for each row execute function public.desbloqueia_proxima_apos_conclusao();
