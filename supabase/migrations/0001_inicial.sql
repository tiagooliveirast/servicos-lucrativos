-- ============================================================
-- Gestão Lucrativa — Fase 1
-- Schema inicial + Row Level Security
-- Execute este arquivo no SQL Editor do novo projeto Supabase.
-- ============================================================

-- Perfil do usuário (complementa auth.users)
create table if not exists public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  telefone text,
  cidade text,
  estado text,
  email_refriclube text, -- e-mail que o usuário usa no Refriclube (pode ser diferente do login aqui)
  created_at timestamptz default now()
);

-- Diagnóstico inicial (preenchido uma vez, no onboarding)
create table if not exists public.diagnostico_inicial (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  nome_empresa text,
  area_atuacao text,
  tempo_mercado text,
  possui_cnpj boolean,
  possui_funcionarios boolean,
  trabalha_sozinho boolean,
  faturamento_atual numeric,
  lucro_atual numeric,
  qtd_clientes int,
  ticket_medio numeric,
  numero_orcamentos int,
  created_at timestamptz default now()
);

-- Progresso de cada uma das 12 semanas
create table if not exists public.progresso_semanas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  semana int not null check (semana between 1 and 12),
  status text not null default 'bloqueada' check (status in ('bloqueada','em_andamento','concluida')),
  respostas jsonb default '{}'::jsonb, -- respostas dos campos daquela semana
  concluida_em timestamptz,
  unique (user_id, semana)
);

-- Missões de cada semana
create table if not exists public.missoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  semana int not null,
  tipo text not null check (tipo in ('principal','rapida')),
  descricao text not null,
  concluida boolean default false,
  concluida_em timestamptz
);

-- Indicadores (antes/depois) por semana
create table if not exists public.indicadores_semana (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  semana int not null,
  nome_indicador text not null,
  unidade text, -- "R$", "%", "horas", etc.
  valor_antes numeric,
  valor_depois numeric,
  origem text not null default 'manual' check (origem in ('manual','refriclube')),
  atualizado_em timestamptz default now()
);

-- Painel mensal (3 registros por usuário: mês 1, 2, 3)
create table if not exists public.paineis_mensais (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  numero_painel int not null check (numero_painel between 1 and 3),
  meta_mensal numeric,
  faturamento_atual numeric,
  lucro numeric,
  ticket_medio numeric,
  numero_clientes int,
  numero_orcamentos int,
  taxa_conversao numeric,
  avaliacoes_google int,
  reserva_emergencia numeric,
  observacao text,
  preenchido_em timestamptz default now(),
  unique (user_id, numero_painel)
);

-- Acessos liberados manualmente (após compra na Hotmart)
create table if not exists public.acessos (
  email text primary key,
  liberado boolean default true,
  created_at timestamptz default now()
);

-- Índices
create index if not exists idx_diagnostico_user on public.diagnostico_inicial(user_id);
create index if not exists idx_progresso_user on public.progresso_semanas(user_id);
create index if not exists idx_missoes_user_semana on public.missoes(user_id, semana);
create unique index if not exists idx_missoes_user_semana_tipo on public.missoes(user_id, semana, tipo);
create index if not exists idx_indicadores_user_semana on public.indicadores_semana(user_id, semana);
create unique index if not exists idx_indicadores_user_semana_nome on public.indicadores_semana(user_id, semana, nome_indicador);
create index if not exists idx_paineis_user on public.paineis_mensais(user_id);

-- Cria perfil automaticamente quando um usuário se cadastra
create or replace function public.handle_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfis (id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_novo_usuario();

-- ============================================================
-- ROW LEVEL SECURITY
-- Regra: cada usuário vê e edita SOMENTE os próprios dados.
-- O identificador vem de auth.uid() no servidor — nunca do client.
-- ============================================================

alter table public.perfis enable row level security;
alter table public.diagnostico_inicial enable row level security;
alter table public.progresso_semanas enable row level security;
alter table public.missoes enable row level security;
alter table public.indicadores_semana enable row level security;
alter table public.paineis_mensais enable row level security;
alter table public.acessos enable row level security;

-- perfis
drop policy if exists "usuario_ve_so_seus_dados" on public.perfis;
create policy "usuario_ve_so_seus_dados" on public.perfis
  for select using (auth.uid() = id);
drop policy if exists "usuario_edita_so_seus_dados" on public.perfis;
create policy "usuario_edita_so_seus_dados" on public.perfis
  for insert with check (auth.uid() = id);
drop policy if exists "usuario_atualiza_so_seus_dados" on public.perfis;
create policy "usuario_atualiza_so_seus_dados" on public.perfis
  for update using (auth.uid() = id);

-- diagnostico_inicial
drop policy if exists "usuario_ve_so_seus_dados" on public.diagnostico_inicial;
create policy "usuario_ve_so_seus_dados" on public.diagnostico_inicial
  for select using (auth.uid() = user_id);
drop policy if exists "usuario_edita_so_seus_dados" on public.diagnostico_inicial;
create policy "usuario_edita_so_seus_dados" on public.diagnostico_inicial
  for insert with check (auth.uid() = user_id);
drop policy if exists "usuario_atualiza_so_seus_dados" on public.diagnostico_inicial;
create policy "usuario_atualiza_so_seus_dados" on public.diagnostico_inicial
  for update using (auth.uid() = user_id);

-- progresso_semanas
drop policy if exists "usuario_ve_so_seus_dados" on public.progresso_semanas;
create policy "usuario_ve_so_seus_dados" on public.progresso_semanas
  for select using (auth.uid() = user_id);
drop policy if exists "usuario_edita_so_seus_dados" on public.progresso_semanas;
create policy "usuario_edita_so_seus_dados" on public.progresso_semanas
  for insert with check (auth.uid() = user_id);
drop policy if exists "usuario_atualiza_so_seus_dados" on public.progresso_semanas;
create policy "usuario_atualiza_so_seus_dados" on public.progresso_semanas
  for update using (auth.uid() = user_id);

-- missoes
drop policy if exists "usuario_ve_so_seus_dados" on public.missoes;
create policy "usuario_ve_so_seus_dados" on public.missoes
  for select using (auth.uid() = user_id);
drop policy if exists "usuario_edita_so_seus_dados" on public.missoes;
create policy "usuario_edita_so_seus_dados" on public.missoes
  for insert with check (auth.uid() = user_id);
drop policy if exists "usuario_atualiza_so_seus_dados" on public.missoes;
create policy "usuario_atualiza_so_seus_dados" on public.missoes
  for update using (auth.uid() = user_id);

-- indicadores_semana
drop policy if exists "usuario_ve_so_seus_dados" on public.indicadores_semana;
create policy "usuario_ve_so_seus_dados" on public.indicadores_semana
  for select using (auth.uid() = user_id);
drop policy if exists "usuario_edita_so_seus_dados" on public.indicadores_semana;
create policy "usuario_edita_so_seus_dados" on public.indicadores_semana
  for insert with check (auth.uid() = user_id);
drop policy if exists "usuario_atualiza_so_seus_dados" on public.indicadores_semana;
create policy "usuario_atualiza_so_seus_dados" on public.indicadores_semana
  for update using (auth.uid() = user_id);

-- paineis_mensais
drop policy if exists "usuario_ve_so_seus_dados" on public.paineis_mensais;
create policy "usuario_ve_so_seus_dados" on public.paineis_mensais
  for select using (auth.uid() = user_id);
drop policy if exists "usuario_edita_so_seus_dados" on public.paineis_mensais;
create policy "usuario_edita_so_seus_dados" on public.paineis_mensais
  for insert with check (auth.uid() = user_id);
drop policy if exists "usuario_atualiza_so_seus_dados" on public.paineis_mensais;
create policy "usuario_atualiza_so_seus_dados" on public.paineis_mensais
  for update using (auth.uid() = user_id);

-- acessos: cada usuário só consulta o próprio e-mail (vindo do JWT do Supabase)
drop policy if exists "usuario_consulta_proprio_acesso" on public.acessos;
create policy "usuario_consulta_proprio_acesso" on public.acessos
  for select using (email = auth.jwt() ->> 'email');

-- ============================================================
-- Permissões padrão
-- ============================================================
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
