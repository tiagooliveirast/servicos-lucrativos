-- ============================================================
-- Onda 16 — Chaves v2: 6 chaves, 4 pilares (Faturamento, IME,
-- Missões, IE) + Índice de Engajamento + faturamento validado.
--
-- SubSTITUI o sistema de chaves da Onda 4 (Verde/Azul/Ouro):
--  - truncar as tabelas antigas (dados de teste, sem aluno real);
--  - novos critérios nas chaves (faturamento_minimo, ie_minimo,
--    missoes_obrigatorias);
--  - seed das 6 chaves.
--
-- IMPORTANTE (design do produto): o pilar de faturamento só
-- desbloqueia quando houver faturamento validado via RefriClube.
-- A tabela faturamento_validado fica VAZIA até a integração
-- existir (próxima tarefa) → nenhuma chave desbloqueia de forma
-- real até lá, por design. Não usar faturamento autodeclarado.
-- ============================================================

-- ----------------------------------------------------------------------------
-- 0) Limpar sistema antigo (Verde/Azul/Ouro) — confirmado só dados de teste
-- ----------------------------------------------------------------------------
truncate table public.chaves_usuario cascade;
truncate table public.chaves cascade;

-- ----------------------------------------------------------------------------
-- 1) Novos campos de Chave
-- ----------------------------------------------------------------------------
alter table public.chaves
  add column if not exists faturamento_minimo numeric not null default 0,
  add column if not exists ie_minimo int not null default 0,
  add column if not exists missoes_obrigatorias jsonb not null default '[]'::jsonb;

-- ----------------------------------------------------------------------------
-- 2) Seed das 6 chaves (v2)
--    missoes_obrigatorias: códigos de ativos (ver função ativos_criados).
--    Proposta v1: chaves 1–2 exigem ativos das semanas 1–4 (financeiro);
--    chaves 3–4 exigem também operação (semanas 5–8); chaves 5–6 exigem o
--    conjunto completo (12 semanas). Ajustar conforme necessidade do Tiago.
-- ----------------------------------------------------------------------------
insert into public.chaves (codigo, titulo, cor_hex, ime_minimo, faturamento_minimo, ie_minimo, ordem, missoes_obrigatorias) values
  ('chave_branco',   'Chave Branco',    '#F5F5F0', 30, 2000,  60, 1, '["diagnostico_financeiro","tabela_precos","metas_definidas"]'::jsonb),
  ('chave_aluminio', 'Chave Alumínio',  '#B0B3B8', 45, 5000,  70, 2, '["diagnostico_financeiro","tabela_precos","metas_definidas"]'::jsonb),
  ('chave_vermelho', 'Chave Vermelho',  '#C0392B', 60, 10000, 75, 3, '["diagnostico_financeiro","tabela_precos","metas_definidas","padrao_atendimento","pop_documentado","agenda_regioes","pos_venda"]'::jsonb),
  ('chave_azul',     'Chave Azul',      '#2563EB', 75, 20000, 80, 4, '["diagnostico_financeiro","tabela_precos","metas_definidas","padrao_atendimento","pop_documentado","agenda_regioes","pos_venda"]'::jsonb),
  ('chave_cinza',    'Chave Cinza',     '#4B5563', 85, 35000, 85, 5, '["diagnostico_financeiro","tabela_precos","metas_definidas","padrao_atendimento","pop_documentado","agenda_regioes","pos_venda","canais_captacao","followup_orcamentos","painel_indicadores","plano_90dias"]'::jsonb),
  ('chave_preto',    'Chave Preto',     '#0A0A0A', 95, 50000, 90, 6, '["diagnostico_financeiro","tabela_precos","metas_definidas","padrao_atendimento","pop_documentado","agenda_regioes","pos_venda","canais_captacao","followup_orcamentos","painel_indicadores","plano_90dias"]'::jsonb)
on conflict (codigo) do nothing;

-- ----------------------------------------------------------------------------
-- 3) faturamento_validado — Nível 2 (RefriClube), integração futura.
--    Só escrita pela futura Edge Function (service role). Client NUNCA
--    insere/atualiza: apenas leitura da própria linha (e admin tudo).
-- ----------------------------------------------------------------------------
create table if not exists public.faturamento_validado (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  valor numeric not null,
  data_referencia date not null,
  fonte text not null default 'refriclube',
  sincronizado_em timestamptz not null default now()
);

alter table public.faturamento_validado enable row level security;

drop policy if exists "usuario_ve_so_seu_faturamento_validado" on public.faturamento_validado;
create policy "usuario_ve_so_seu_faturamento_validado" on public.faturamento_validado
  for select using (auth.uid() = user_id);

drop policy if exists "admin_ve_faturamento_validado_de_todos" on public.faturamento_validado;
create policy "admin_ve_faturamento_validado_de_todos" on public.faturamento_validado
  for select using (auth.uid() in (select user_id from admins));

create index if not exists idx_faturamento_validado_user on public.faturamento_validado(user_id, data_referencia);

-- Garantir que o client não escreve na tabela (criação/updates/delete negados).
revoke insert, update, delete on public.faturamento_validado from anon, authenticated;
grant select on public.faturamento_validado to authenticated;

-- ----------------------------------------------------------------------------
-- 4) ie_historico — índice de engagement, mesmo padrão do ime_historico
-- ----------------------------------------------------------------------------
create table if not exists public.ie_historico (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  data_calculo timestamptz not null default now(),
  score_total int not null,
  score_missoes_prazo int not null,
  score_checkins int not null,
  score_login int not null,
  score_financeiro_refriclube int not null,
  score_indicadores_atualizados int not null
);

alter table public.ie_historico enable row level security;

drop policy if exists "usuario_ve_so_seu_ie" on public.ie_historico;
create policy "usuario_ve_so_seu_ie" on public.ie_historico
  for select using (auth.uid() = user_id);

drop policy if exists "admin_ve_ie_de_todos" on public.ie_historico;
create policy "admin_ve_ie_de_todos" on public.ie_historico
  for select using (auth.uid() in (select user_id from admins));

create index if not exists idx_ie_historico_user on public.ie_historico(user_id, data_calculo);

grant select on public.ie_historico to authenticated;

-- ----------------------------------------------------------------------------
-- 5) Ativos criados (equivalente em SQL de ativos.ts — fonte única no banco)
--    Devolve a lista de códigos de ativos preenchidos (ver ativos.ts).
-- ----------------------------------------------------------------------------
create or replace function public.ativos_criados(p_user uuid)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prog jsonb;
  result text[] := '{}';
begin
  select coalesce(jsonb_object_agg(semana::text, respostas), '{}'::jsonb)
    into v_prog
    from public.progresso_semanas
    where user_id = p_user;

  -- Diagnóstico financeiro (sem 1): pelo menos um dos 4
  if (v_prog #>> '{1,f1_meta_minima}') is not null
     or (v_prog #>> '{1,f1_custo_vida}') is not null
     or (v_prog #>> '{1,f1_custo_negocio}') is not null
     or (v_prog #>> '{1,f1_lucro_desejado}') is not null then
    result := array_append(result, 'diagnostico_financeiro');
  end if;

  -- Tabela de preços (sem 2): algum preço corrigido
  if (v_prog #>> '{2,p2_servico_1_preco_correto}') is not null
     or (v_prog #>> '{2,p2_servico_2_preco_correto}') is not null
     or (v_prog #>> '{2,p2_servico_3_preco_correto}') is not null then
    result := array_append(result, 'tabela_precos');
  end if;

  -- Metas definidas (sem 4): todos os 3
  if (v_prog #>> '{4,p4_meta_mensal}') is not null
     and (v_prog #>> '{4,p4_meta_semanal}') is not null
     and (v_prog #>> '{4,p4_meta_diaria}') is not null then
    result := array_append(result, 'metas_definidas');
  end if;

  -- Padrão de atendimento (sem 5): algum
  if (v_prog #>> '{5,p5_padrao_atendimento}') is not null
     or (v_prog #>> '{5,p5_apresentacao}') is not null
     or (v_prog #>> '{5,p5_comunicacao}') is not null
     or (v_prog #>> '{5,p5_explicacao_orcamento}') is not null then
    result := array_append(result, 'padrao_atendimento');
  end if;

  -- POP documentado (sem 6): todos os 3
  if (v_prog #>> '{6,p6_passo_1}') is not null
     and (v_prog #>> '{6,p6_passo_2}') is not null
     and (v_prog #>> '{6,p6_passo_3}') is not null then
    result := array_append(result, 'pop_documentado');
  end if;

  -- Agenda (sem 7): todos os 5 dias
  if (v_prog #>> '{7,p7_segunda}') is not null
     and (v_prog #>> '{7,p7_terca}') is not null
     and (v_prog #>> '{7,p7_quarta}') is not null
     and (v_prog #>> '{7,p7_quinta}') is not null
     and (v_prog #>> '{7,p7_sexta}') is not null then
    result := array_append(result, 'agenda_regioes');
  end if;

  -- Pós-venda (sem 8): todos os 4
  if (v_prog #>> '{8,p8_mensagem_24h}') is not null
     and (v_prog #>> '{8,p8_mensagem_7dias}') is not null
     and (v_prog #>> '{8,p8_mensagem_30dias}') is not null
     and (v_prog #>> '{8,p8_mensagem_90dias}') is not null then
    result := array_append(result, 'pos_venda');
  end if;

  -- Canais de captação (sem 9): algum
  if (v_prog #>> '{9,p9_canal_1}') is not null
     or (v_prog #>> '{9,p9_canal_2}') is not null
     or (v_prog #>> '{9,p9_canal_3}') is not null
     or (v_prog #>> '{9,p9_frase_indicacao}') is not null then
    result := array_append(result, 'canais_captacao');
  end if;

  -- Follow-up (sem 10): preenchido
  if (v_prog #>> '{10,p10_followup_padrao}') is not null then
    result := array_append(result, 'followup_orcamentos');
  end if;

  -- Painel de indicadores (sem 11): algum
  if (v_prog #>> '{11,p11_orcamentos_mes}') is not null
     or (v_prog #>> '{11,p11_vendas_fechadas}') is not null
     or (v_prog #>> '{11,p11_ticket_medio}') is not null
     or (v_prog #>> '{11,p11_margem_lucro}') is not null then
    result := array_append(result, 'painel_indicadores');
  end if;

  -- Plano 90 dias (sem 12): algum
  if (v_prog #>> '{12,p12_conquista}') is not null
     or (v_prog #>> '{12,p12_melhorar}') is not null
     or (v_prog #>> '{12,p12_proximo_objetivo}') is not null then
    result := array_append(result, 'plano_90dias');
  end if;

  return result;
end;
$$;

revoke execute on function public.ativos_criados(uuid) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 6) IE — calcular e gravar histórico (uma linha por recálculo)
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
  v_fin_ref int;
  v_indicadores int;
  s_em numeric; s_score numeric; s_kk numeric; s_fr numeric; s_ie numeric; total numeric;
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

  -- Financeiro RefriClube: 100 se houver registro no mês corrente
  select 100 into s_fr from public.faturamento_validado
   where user_id = p_user and date_trunc('month', data_referencia) = date_trunc('month', current_date)
   limit 1;
  if s_fr is null then s_fr := 0; end if;

  -- Indicadores atualizados: valor_depois nas semanas 1/2/3/7/10 ÷ 5
  select count(*)::int into v_indicadores
    from public.indicadores_semana
   where user_id = p_user
     and semana in (1,2,3,7,10)
     and valor_depois is not null;
  s_ie := round(least(100, (v_indicadores * 100.0) / 5.0));

  total := s_em * 0.33 + s_score * 0.22 + s_kk * 0.17 + s_fr * 0.17 + s_ie * 0.11;
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
    round(s_fr)::int,
    round(s_ie)::int
  );
end;
$$;

revoke execute on function public.recalcular_ie(uuid) from public, anon, authenticated;

-- Triggers de IE: mesmos gatilhos do IME
create or replace function public.despara_ie_semana()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'concluida' and (tg_op = 'INSERT' or old.status is distinct from 'concluida') then
    perform public.recalcular_ie(new.user_id);
  end if;
  return new;
end;
$$;
drop trigger if exists trg_ie_semana on public.progresso_semanas;
create trigger trg_ie_semana
  after insert or update of status on public.progresso_semanas
  for each row execute function public.despara_ie_semana();

create or replace function public.re_ie_checkin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.recalcular_ie(new.user_id);
  return new;
end;
$$;
drop trigger if exists trg_ie_checkin on public.checkins_semanais;
create trigger trg_ie_checkin
  after insert on public.checkins_semanais
  for each row execute function public.re_ie_checkin();

create or replace function public.re_ie_painel()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.faturamento_atual is not null and (tg_op = 'INSERT' or old.faturamento_atual is null) then
    perform public.recalcular_ie(new.user_id);
  end if;
  return new;
end;
$$;
drop trigger if exists trg_ie_painel on public.paineis_mensais;
create trigger trg_ie_painel
  after insert or update of faturamento_atual on public.paineis_mensais
  for each row execute function public.re_ie_painel();

-- ----------------------------------------------------------------------------
-- 7) Gate de desbloqueio com 4 pilares (subSTitui verificar_chaves)
-- ----------------------------------------------------------------------------
create or replace function public.verificar_chaves(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fat numeric;
  v_ime int;
  v_ie int;
  v_ativos text[];
begin
  -- Fat | IME | IE mais recente (por data), ativos criados
  select valor into v_fat from public.faturamento_validado
   where user_id = p_user
   order by data_referencia desc, sincronizado_em desc
   limit 1;

  select score_total into v_ime from public.ime_historico
   where user_id = p_user
   order by data_calculo desc
   limit 1;

  select score_total into v_ie from public.ie_historico
   where user_id = p_user
   order by data_calculo desc
   limit 1;

  v_ativos := public.ativos_criados(p_user);

  insert into public.chaves_usuario (user_id, chave_id)
  select p_user, c.id
    from public.chaves c
   where c.faturamento_minimo <= coalesce(v_fat, 0)
     and c.ime_minimo <= coalesce(v_ime, 0)
     and c.ie_minimo <= coalesce(v_ie, 0)
     -- todas as missões/ativos obrigatórios já foram criados pelo aluno
     and (select count(*) = 0
            from jsonb_array_elements_text(c.missoes_obrigatorias) m
           where not (m = any(v_ativos)))
  on conflict (user_id, chave_id) do nothing;
end;
$$;

revoke execute on function public.verificar_chaves(uuid) from public, anon, authenticated;

-- Trigger: recalculo do IME (novo insert em ime_historico) → verificar_chaves
create or replace function public.desbloqueia_chaves_ime()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.verificar_chaves(new.user_id);
  return new;
end;
$$;
drop trigger if exists trg_chaves_ime on public.ime_historico;
create trigger trg_chaves_ime
  after insert on public.ime_historico
  for each row execute function public.desbloqueia_chaves_ime();

-- Trigger: recalculo do IE → verificar_chaves também
create or replace function public.desbloqueia_chaves_ie()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.verificar_chaves(new.user_id);
  return new;
end;
$$;
drop trigger if exists trg_chaves_ie on public.ie_historico;
create trigger trg_chaves_ie
  after insert on public.ie_historico
  for each row execute function public.desbloqueia_chaves_ie();

-- Trigger: chegada de faturamento válido do RefriClube → reavalia as chaves.
-- (A tabela fica vazia até a integração; quando ela sincronizar, cada
-- insert novo dispara a verificação — é assim que "a chave desbloqueia".)
create or replace function public.desbloqueia_chaves_faturamento()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.verificar_chaves(new.user_id);
  return new;
end;
$$;
drop trigger if exists trg_chaves_faturamento on public.faturamento_validado;
create trigger trg_chaves_faturamento
  after insert on public.faturamento_validado
  for each row execute function public.desbloqueia_chaves_faturamento();

-- ----------------------------------------------------------------------------
-- 8) Login diário também recalcula o IE (frequência de login é componente)
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
    perform public.verificar_chaves(v_user);
  end if;
end;
$$;

revoke execute on function public.registrar_login_diario() from public, anon;
grant execute on function public.registrar_login_diario() to authenticated;

-- ----------------------------------------------------------------------------
-- 9) Permissões globais para as tabelas novas (padrão do projeto)
-- ----------------------------------------------------------------------------
grant select on public.ie_historico to authenticated;
grant select on public.faturamento_validado to authenticated;

-- ----------------------------------------------------------------------------
-- 10) Backfill: reavalia chaves de quem já tem histórico (o trigger não
--     re-dispara sobre dados já gravados antes desta migration).
--     Com a tabela faturamento_validado vazia o pilar de faturamento fica
--     zerado (v_fat = 0), então por design nada desbloqueia por aqui ainda.
-- ----------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in (
    select distinct user_id from public.ime_historico
    union select distinct user_id from public.ie_historico
    union select distinct user_id from public.progresso_semanas
  ) loop
    perform public.verificar_chaves(r.user_id);
  end loop;
end;
$$;