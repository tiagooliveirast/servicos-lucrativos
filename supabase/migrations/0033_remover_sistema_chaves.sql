-- ============================================================
-- 0033 — Remover o sistema de Chaves da plataforma
--
-- Decisão do Tiago (Prompt Antigravity #36): o sistema de Chaves
-- (faturamento + IME + missões + IE, 6 chaves de Branco a Preto)
-- não faz sentido num programa de 90 dias. As Chaves passam a ser
-- um recurso da Liga Refriclube (produto separado, fora do escopo
-- desta plataforma).
--
-- O que acontece aqui:
--   * drops de views/triggers/funções/tabelas de chaves;
--   * IE (ie_historico + recálculo) CONTINUA — recalcular_ie e
--     registrar_login_diario são recriados sem as partes de chave
--     (o componente "financeiro RefriClube" do IE lia
--     faturamento_validado, que sai junto com as chaves; os pesos
--     foram redistribuídos para continuar somando 100);
--   * página pública reaponta o faturamento para a hierarquia da
--     Onda 2 (painel mensal > check-in > indicador), sem o selo
--     "autodeclarado";
--   * crm_candidatos_case deixa de exigir chave alta e passa a ser
--     baseado apenas no Certificado de Implantação (IME + semanas +
--     painéis) — que não depende de chave.
--
-- NÃO mexer: Avatar/Estágio da Empresa (conquistas_usuario),
-- conquistas/baús, certificado, lembretes manuais (crm_risco).
-- ============================================================

-- ----------------------------------------------------------------------------
-- 1) Views dependentes primeiro
-- ----------------------------------------------------------------------------
drop view if exists public.escudo_atual_usuario;
drop view if exists public.crm_candidatos_case;

-- ----------------------------------------------------------------------------
-- 2) Triggers e funções específicas de chave
-- ----------------------------------------------------------------------------
drop trigger if exists trg_chaves_faturamento on public.faturamento_validado;
drop trigger if exists trg_chaves_ime on public.ime_historico;
drop trigger if exists trg_chaves_ie on public.ie_historico;

drop function if exists public.desbloqueia_chaves_faturamento();
drop function if exists public.desbloqueia_chaves_ime();
drop function if exists public.desbloqueia_chaves_ie();
drop function if exists public.verificar_chaves(uuid);

-- ----------------------------------------------------------------------------
-- 3) IE continua nos bastidores: recalcular_ie recriado SEM a leitura
--    de faturamento_validado (pesos redistribuídos para somar 100).
-- ----------------------------------------------------------------------------
create or replace function public.recalcular_ie(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_missoes_prazo int;
  v_missoes_esperadas int;
  v_checkins int;
  v_semanas int;
  v_streak int;
  v_indicadores int;
  s_em numeric; s_score numeric; s_kk numeric; s_ie numeric; total numeric;
  v_sess int;
  v_sem_atual int;
begin
  -- Semana atual do plano (como usado no resto: maior concluída + 1, cap 12)
  select coalesce(max(semana) + 1, 1) into v_sem_atual
    from public.progresso_semanas
   where user_id = p_user and status = 'concluida';
  v_sem_atual := least(v_sem_atual, 12);

  -- Missões no prazo: concluídas ÷ esperadas até semana atual (~2/semana), cap 100
  select count(*)::int into v_missoes_prazo
    from public.missoes
   where user_id = p_user and concluida and semana <= v_sem_atual;
  v_missoes_esperadas := v_sem_atual * 2;
  s_em := round(least(100, (v_missoes_prazo * 100.0) / v_missoes_esperadas));

  -- Check-ins ÷ semanas decorridas desde a ativação do acesso
  select count(*)::int into v_checkins
    from public.checkins_semanais
   where user_id = p_user;
  select greatest(1, ceil(extract(day from (now() - created_at)) / 7.0))::int into v_sess
    from public.acessos
   where user_id = p_user;
  v_sess := coalesce(v_sess, 1);
  s_score := round(least(100, (v_checkins * 100.0) / v_sess));

  -- Login (frequência): derivado do streak atual ÷ 30
  select coalesce(dias_consecutivos, 0) into v_streak
    from public.gamificacao_usuario
   where user_id = p_user;
  s_kk := round(least(100, (v_streak * 100.0) / 30.0));

  -- Indicadores atualizados: valor_depois nas semanas 1/2/3/7/10 ÷ 5
  select count(*)::int into v_indicadores
    from public.indicadores_semana
   where user_id = p_user
     and semana in (1,2,3,7,10)
     and valor_depois is not null;
  s_ie := round(least(100, (v_indicadores * 100.0) / 5.0));

  -- Pesos redistribuídos: sem faturamento_validado (componente do
  -- sistema de chaves, removido) os demais componentes somam 100%.
  total := s_em * 0.40 + s_score * 0.26 + s_kk * 0.20 + s_ie * 0.14;
  total := greatest(0, least(100, round(total)));

  insert into public.ie_historico (
    user_id, score_total,
    score_missoes_prazo, score_checkins, score_login,
    score_financeiro_refriclube, score_indicadores_atualizados
  ) values (
    p_user,
    round(total)::int,
    round(s_em)::int,
    round(s_score)::int,
    round(s_kk)::int,
    0,
    round(s_ie)::int
  );
end;
$$;

revoke execute on function public.recalcular_ie(uuid) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 4) registrar_login_diario continua, sem a chamada às chaves
-- ----------------------------------------------------------------------------
create or replace function public.registrar_login_diario()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := coalesce(auth.uid(), null);
  v_ultimo date;
begin
  if v_user is null then
    raise exception 'Não autenticado';
  end if;

  insert into public.gamificacao_usuario (user_id)
  values (v_user)
  on conflict (user_id) do nothing;

  select ultimo_login into v_ultimo
    from public.gamificacao_usuario
   where user_id = v_user;

  if v_ultimo is distinct from current_date then
    update public.gamificacao_usuario
       set dias_consecutivos = case
             when v_ultimo = current_date - 1 then dias_consecutivos + 1
             else 1
           end,
           maior_sequencia = greatest(
             maior_sequencia,
             case when v_ultimo = current_date - 1 then dias_consecutivos + 1 else 1 end
           ),
           ultimo_login = current_date,
           updated_at = now()
     where user_id = v_user;

    perform public.adicionar_xp(v_user, 5, 'Login diário');
    perform public.verificar_conquistas(v_user);
    perform public.recalcular_ie(v_user);
  end if;
end;
$$;

revoke execute on function public.registrar_login_diario() from public, anon;
grant execute on function public.registrar_login_diario() to authenticated;

-- ----------------------------------------------------------------------------
-- 5) Página pública: sem chave/troféu; faturamento pela hierarquia da
--    Onda 2 (painel mensal > check-in > indicador), sem selo autodeclarado.
-- ----------------------------------------------------------------------------
create or replace function public.buscar_pagina_publica(slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_perfil uuid;
  v_ativa boolean;
  v_mostrar_faturamento boolean;
  v_ime int;
  v_nome_empresa text;
  v_cidade text;
  v_estado text;
  v_faturamento jsonb;
  v_ime_historico jsonb;
  v_certificado boolean;
begin
  select id, pagina_publica_ativa, pagina_publica_mostrar_faturamento
    into v_perfil, v_ativa, v_mostrar_faturamento
    from public.perfis
   where pagina_publica_slug = slug
   limit 1;

  if v_perfil is null or not coalesce(v_ativa, false) then
    return null;
  end if;

  -- IME atual (mais recente por data de cálculo)
  select score_total into v_ime
    from public.ime_historico
   where user_id = v_perfil
   order by data_calculo desc
   limit 1;

  -- Empresa e localização
  select nome_empresa into v_nome_empresa
    from public.diagnostico_inicial
   where user_id = v_perfil
   order by created_at desc
   limit 1;

  select cidade, estado into v_cidade, v_estado
    from public.perfis
   where id = v_perfil;

  -- Faturamento: só sai se o aluno marcou o toggle específico. Fonte =
  -- hierarquia dos gráficos de evolução: painel mensal (0) > check-in (1)
  -- > indicador "Faturamento do último mês" (2).
  if coalesce(v_mostrar_faturamento, false) then
    select jsonb_build_object('valor', fonte.v_valor, 'data_referencia', fonte.v_data)
      into v_faturamento
      from (
        select painel.faturamento_atual as v_valor, painel.preenchido_em::date as v_data, 0 as prioridade
          from public.paineis_mensais painel
         where painel.user_id = v_perfil
           and painel.faturamento_atual is not null
           and painel.preenchido_em is not null
        union all
        select ci.faturamento_semana, ci.data_checkin, 1
          from public.checkins_semanais ci
         where ci.user_id = v_perfil
           and ci.faturamento_semana is not null
           and ci.data_checkin is not null
        union all
        select coalesce(ind.valor_depois, ind.valor_antes), ind.atualizado_em::date, 2
          from public.indicadores_semana ind
         where ind.user_id = v_perfil
           and ind.nome_indicador = 'Faturamento do último mês'
           and ind.atualizado_em is not null
      ) fonte
     order by fonte.prioridade asc, fonte.v_data desc nulls last
     limit 1;
  end if;

  -- Série de IME completa (gráfico somente-leitura da vitrine)
  select coalesce(
           jsonb_agg(
             jsonb_build_object('data', data_calculo::date, 'valor', score_total)
             order by data_calculo
           ),
           '[]'::jsonb
         )
    into v_ime_historico
    from public.ime_historico
   where user_id = v_perfil;

  -- Selo de certificado: mesmos critérios do app (12 semanas + IME >= 70 +
  -- 3 painéis preenchidos). Só expõe o SELO, nunca o PDF.
  select (
           (select count(*)::int from public.progresso_semanas
             where user_id = v_perfil and status = 'concluida') >= 12
           and coalesce(v_ime, 0) >= 70
           and (select count(*)::int from public.paineis_mensais
                 where user_id = v_perfil and faturamento_atual is not null) >= 3
         )
    into v_certificado;

  return jsonb_build_object(
    'slug', slug,
    'nome_empresa', v_nome_empresa,
    'cidade', v_cidade,
    'estado', v_estado,
    'ime_atual', v_ime,
    'ime_historico', v_ime_historico,
    'faturamento', v_faturamento,
    'certificado_disponivel', coalesce(v_certificado, false)
  );
end;
$$;

grant execute on function public.buscar_pagina_publica(text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 6) crm_candidatos_case recriado sem chaves: "case" = Certificado de
--    Implantação disponível (12 semanas + IME >= 70 + 3 painéis).
-- ----------------------------------------------------------------------------
create view public.crm_candidatos_case
with (security_invoker = true) as
select
  p.id as user_id,
  p.nome,
  p.email,
  d.nome_empresa,
  ih.score_total as ime_atual,
  total_concluidas.semanas_concluidas,
  total_paineis.paineis_preenchidos
from public.perfis p
left join public.diagnostico_inicial d on d.user_id = p.id
left join lateral (
  select score_total
    from public.ime_historico ihx
   where ihx.user_id = p.id
   order by data_calculo desc
   limit 1
) ih on true
left join lateral (
  select count(*)::int as semanas_concluidas
    from public.progresso_semanas ps
   where ps.user_id = p.id
     and ps.status = 'concluida'
) total_concluidas on true
left join lateral (
  select count(*)::int as paineis_preenchidos
    from public.paineis_mensais pm
   where pm.user_id = p.id
     and pm.faturamento_atual is not null
) total_paineis on true
where total_concluidas.semanas_concluidas >= 12
  and ih.score_total >= 70
  and total_paineis.paineis_preenchidos >= 3;

grant select on public.crm_candidatos_case to authenticated;

-- ----------------------------------------------------------------------------
-- 7) Tabelas (após remover todas as dependências acima)
-- ----------------------------------------------------------------------------
drop table if exists public.chaves_usuario;
drop table if exists public.chaves;
drop table if exists public.faturamento_validado;
