-- ============================================================
-- Onda 1 — Fundação de dados
-- 1) checkins_semanais: check-in semanal do aluno
-- 2) ime_historico: snapshots do IME (uma linha por recálculo)
-- 3) Cálculo do IME em SQL (fonte única da regra) + triggers
--    que gravam uma nova linha a cada semana concluída, painel
--    preenchido ou check-in semanal.
-- Execute este arquivo após o 0011_missoes_indice.sql.
-- ============================================================

-- ----------------------------------------------------------------------------
-- 1) Check-ins semanais
-- Limite de 1 por semana do plano: a integridade é garantida pelo índice
-- único (user_id, semana_referencia) aplicado na migration 0013. Aqui, a
-- tabela apenas existe com as colunas + RLS.
-- ----------------------------------------------------------------------------
create table if not exists public.checkins_semanais (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  semana_referencia int not null check (semana_referencia between 1 and 12),
  data_checkin timestamptz not null default now(),
  faturamento_semana numeric,
  lucro_semana numeric,
  atendimentos int,
  orcamentos_enviados int,
  orcamentos_fechados int,
  avaliacoes_recebidas int,
  horas_trabalhadas numeric,
  maior_dificuldade text,
  created_at timestamptz not null default now()
);

alter table public.checkins_semanais enable row level security;

drop policy if exists "usuario_ve_so_seus_checkins" on public.checkins_semanais;
create policy "usuario_ve_so_seus_checkins" on public.checkins_semanais
  for select using (auth.uid() = user_id);
drop policy if exists "usuario_edita_so_seus_checkins" on public.checkins_semanais;
create policy "usuario_edita_so_seus_checkins" on public.checkins_semanais
  for insert with check (auth.uid() = user_id);
drop policy if exists "usuario_atualiza_so_seus_checkins" on public.checkins_semanais;
create policy "usuario_atualiza_so_seus_checkins" on public.checkins_semanais
  for update using (auth.uid() = user_id);

drop policy if exists "admin_ve_checkins_de_todos" on public.checkins_semanais;
create policy "admin_ve_checkins_de_todos" on public.checkins_semanais
  for select using (auth.uid() in (select user_id from admins));

create index if not exists idx_checkins_semanais_user on public.checkins_semanais(user_id, data_checkin);

-- ----------------------------------------------------------------------------
-- 2) Histórico do IME
-- ----------------------------------------------------------------------------
create table if not exists public.ime_historico (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  data_calculo timestamptz not null default now(),
  score_total int not null,
  score_financeiro int not null,
  score_precificacao int not null,
  score_marketing int not null,
  score_comercial int not null,
  score_operacao int not null,
  score_organizacao int not null,
  score_indicadores int not null,
  score_processos int not null
);

alter table public.ime_historico enable row level security;

drop policy if exists "usuario_ve_so_seu_ime" on public.ime_historico;
create policy "usuario_ve_so_seu_ime" on public.ime_historico
  for select using (auth.uid() = user_id);
drop policy if exists "usuario_insere_so_seu_ime" on public.ime_historico;
create policy "usuario_insere_so_seu_ime" on public.ime_historico
  for insert with check (auth.uid() = user_id);

drop policy if exists "admin_ve_ime_de_todos" on public.ime_historico;
create policy "admin_ve_ime_de_todos" on public.ime_historico
  for select using (auth.uid() in (select user_id from admins));

create index if not exists idx_ime_historico_user on public.ime_historico(user_id, data_calculo);

-- ----------------------------------------------------------------------------
-- 3) Cálculo do IME (Índice de Maturidade Empresarial) — 0 a 100
-- Cada pilar vale 0–100 e o total é a soma ponderada, arredondada para inteiro.
-- A regra mora AQUI (em SQL), o client só lê o histórico — assim a lógica
-- nunca diverge entre telas.
-- ----------------------------------------------------------------------------
create or replace function public.calcular_ime(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  st jsonb;
  s1 boolean;  s2 boolean;  s3 boolean;  s4 boolean;  s5 boolean;  s6 boolean;
  s7 boolean;  s8 boolean;  s9 boolean;  s10 boolean; s11 boolean;

  preco_antes numeric; preco_depois numeric;
  conv_antes numeric;  conv_depois numeric;
  lucro_recente numeric;
  paineis_preenchidos int;
  aval_google numeric;

  f_financeiro numeric; f_precificacao numeric; f_marketing numeric;
  f_comercial numeric;   f_operacao numeric;    f_organizacao numeric;
  f_indicadores numeric; f_processos numeric;
  total numeric;
begin
  select coalesce(jsonb_object_agg(semana::text, status), '{}'::jsonb)
    into st
    from public.progresso_semanas
    where user_id = p_user;

  s1  := (st ->> '1')  = 'concluida';
  s2  := (st ->> '2')  = 'concluida';
  s3  := (st ->> '3')  = 'concluida';
  s4  := (st ->> '4')  = 'concluida';
  s5  := (st ->> '5')  = 'concluida';
  s6  := (st ->> '6')  = 'concluida';
  s7  := (st ->> '7')  = 'concluida';
  s8  := (st ->> '8')  = 'concluida';
  s9  := (st ->> '9')  = 'concluida';
  s10 := (st ->> '10') = 'concluida';
  s11 := (st ->> '11') = 'concluida';

  -- Indicadores: último registro por nome (padrão usado no Radar)
  select valor_antes, valor_depois
    into preco_antes, preco_depois
    from public.indicadores_semana
   where user_id = p_user
     and nome_indicador = 'Preço médio dos meus 3 principais serviços'
   order by atualizado_em desc nulls last
   limit 1;

  select valor_antes, valor_depois
    into conv_antes, conv_depois
    from public.indicadores_semana
   where user_id = p_user
     and nome_indicador = 'Minha taxa de conversão de orçamentos'
   order by atualizado_em desc nulls last
   limit 1;

  -- Painel mais recente já preenchido (faturamento informado = preenchido)
  select lucro
    into lucro_recente
    from public.paineis_mensais
   where user_id = p_user
     and faturamento_atual is not null
   order by numero_painel desc
   limit 1;

  select count(*)::int
    into paineis_preenchidos
    from public.paineis_mensais
   where user_id = p_user
     and faturamento_atual is not null;

  select (nullif(respostas ->> 'p11_avaliacoes_google', ''))::numeric
    into aval_google
    from public.progresso_semanas
   where user_id = p_user and semana = 11
   limit 1;
  if aval_google is null then aval_google := 0; end if;

  -- ------------------------------------------------------------------
  -- Financeiro (20%): semanas 1 e 4 (0/50/100) + bônus de 20 se o lucro
  -- do painel mais recente for positivo (cap 100)
  -- ------------------------------------------------------------------
  f_financeiro := (case when s1 then 1 else 0 end + case when s4 then 1 else 0 end) * 50;
  if lucro_recente is not null and lucro_recente > 0 then
    f_financeiro := least(100, f_financeiro + 20);
  end if;

  -- ------------------------------------------------------------------
  -- Precificação (10%): semana 2 concluída + preço médio "Depois" > "Antes"
  -- ------------------------------------------------------------------
  if s2 then
    if preco_depois is not null and preco_antes is not null and preco_depois > preco_antes then
      f_precificacao := 100;
    else
      f_precificacao := 60;
    end if;
  else
    f_precificacao := 0;
  end if;

  -- ------------------------------------------------------------------
  -- Marketing (10%): média entre a semana 9 e as avaliações no Google
  -- registradas na semana 11 (p11_avaliacoes_google)
  -- ------------------------------------------------------------------
  f_marketing := (case when s9 then 100 else 0 end + case when aval_google > 0 then 100 else 0 end) / 2;

  -- ------------------------------------------------------------------
  -- Comercial (15%): média semanas 3 e 10 + bônus de 20 se a conversão
  -- melhorou ("Depois" > "Antes"), cap 100
  -- ------------------------------------------------------------------
  f_comercial := (case when s3 then 100 else 0 end + case when s10 then 100 else 0 end) / 2;
  if conv_depois is not null and conv_antes is not null and conv_depois > conv_antes then
    f_comercial := least(100, f_comercial + 20);
  end if;

  -- ------------------------------------------------------------------
  -- Operação (15%): média semanas 5 e 7
  -- ------------------------------------------------------------------
  f_operacao := (case when s5 then 100 else 0 end + case when s7 then 100 else 0 end) / 2;

  -- ------------------------------------------------------------------
  -- Organização (10%): semana 6 (POP)
  -- ------------------------------------------------------------------
  f_organizacao := case when s6 then 100 else 0 end;

  -- ------------------------------------------------------------------
  -- Indicadores (10%): média semana 11 com painéis preenchidos / 3
  -- ------------------------------------------------------------------
  f_indicadores := (case when s11 then 100 else 0 end + paineis_preenchidos * 100.0 / 3.0) / 2;

  -- ------------------------------------------------------------------
  -- Processos (10%): média semanas 6 (POP) e 8 (pós-venda)
  -- ------------------------------------------------------------------
  f_processos := (case when s6 then 100 else 0 end + case when s8 then 100 else 0 end) / 2;

  total := f_financeiro * 0.20 + f_precificacao * 0.10 + f_marketing * 0.10
         + f_comercial * 0.15 + f_operacao * 0.15 + f_organizacao * 0.10
         + f_indicadores * 0.10 + f_processos * 0.10;
  total := greatest(0, least(100, round(total)));

  -- Cada recálculo gera uma NOVA linha (histórico para o gráfico da Onda 2)
  insert into public.ime_historico (
    user_id,
    score_total,
    score_financeiro,
    score_precificacao,
    score_marketing,
    score_comercial,
    score_operacao,
    score_organizacao,
    score_indicadores,
    score_processos
  ) values (
    p_user,
    round(total)::int,
    round(f_financeiro)::int,
    round(f_precificacao)::int,
    round(f_marketing)::int,
    round(f_comercial)::int,
    round(f_operacao)::int,
    round(f_organizacao)::int,
    round(f_indicadores)::int,
    round(f_processos)::int
  );
end;
$$;

-- RPC para recálculo manual (o client pode disparar "Recalcular" na página
-- do IME). O id vem de auth.uid() — nunca do client.
create or replace function public.recalcular_ime_atual()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'não autenticado';
  end if;
  perform public.calcular_ime(auth.uid());
end;
$$;

-- ----------------------------------------------------------------------------
-- 4) Triggers: recálculo automático (cada evento grava uma nova linha)
-- ----------------------------------------------------------------------------
create or replace function public.dispara_ime_semana()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'concluida' and (tg_op = 'INSERT' or old.status is distinct from 'concluida') then
    perform public.calcular_ime(new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ime_semana_concluida on public.progresso_semanas;
create trigger trg_ime_semana_concluida
  after insert or update of status on public.progresso_semanas
  for each row execute function public.dispara_ime_semana();

create or replace function public.dispara_ime_painel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.preenchido_em is distinct from old.preenchido_em then
    perform public.calcular_ime(new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ime_painel_preenchido on public.paineis_mensais;
create trigger trg_ime_painel_preenchido
  after update of preenchido_em on public.paineis_mensais
  for each row execute function public.dispara_ime_painel();

create or replace function public.dispara_ime_checkin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.calcular_ime(new.user_id);
  return new;
end;
$$;

drop trigger if exists trg_ime_checkin on public.checkins_semanais;
create trigger trg_ime_checkin
  after insert on public.checkins_semanais
  for each row execute function public.dispara_ime_checkin();

grant select, insert, update, delete on all tables in schema public to anon, authenticated;