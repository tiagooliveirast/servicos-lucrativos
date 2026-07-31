-- ============================================================
-- Gestão Lucrativa — Fase 1, continuação
-- Radar da Empresa
-- Execute este arquivo após o 0001_inicial.sql no SQL Editor.
-- ============================================================

-- Registra quais alertas já foram mostrados, pra não repetir o mesmo
-- alerta todo dia e pra permitir o histórico do relatório mensal (Regra 8)
create table if not exists public.radar_eventos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  regra_id text not null,          -- identificador da regra, ex: 'preco_desatualizado'
  categoria text not null check (categoria in ('verde','amarelo','vermelho')),
  mensagem text not null,          -- texto final já formatado, com os números do usuário
  missao_sugerida text,
  resolvido boolean default false, -- true quando a condição que gerou o alerta deixa de ser verdadeira
  criado_em timestamptz default now(),
  resolvido_em timestamptz
);

alter table public.radar_eventos enable row level security;

drop policy if exists "usuario_ve_so_seus_eventos" on public.radar_eventos;
create policy "usuario_ve_so_seus_eventos" on public.radar_eventos
  for select using (auth.uid() = user_id);
drop policy if exists "usuario_edita_so_seus_eventos" on public.radar_eventos;
create policy "usuario_edita_so_seus_eventos" on public.radar_eventos
  for insert with check (auth.uid() = user_id);
drop policy if exists "usuario_atualiza_so_seus_eventos" on public.radar_eventos;
create policy "usuario_atualiza_so_seus_eventos" on public.radar_eventos
  for update using (auth.uid() = user_id);

create index if not exists idx_radar_user on public.radar_eventos(user_id);
-- no máximo um evento por regra por dia (protege contra duplicação)
create unique index if not exists idx_radar_user_regra_dia
  on public.radar_eventos(user_id, regra_id, (criado_em::date));

-- Último acesso do usuário (base da Regra 7 — usuário inativo).
-- O client não consegue ler auth.users, então registramos aqui.
alter table public.perfis add column if not exists ultimo_acesso_at timestamptz;

grant select, insert, update, delete on all tables in schema public to anon, authenticated;
