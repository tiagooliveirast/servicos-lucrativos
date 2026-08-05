-- ============================================================
-- Onda 28 — Âncora de Motivo Pessoal
-- Captura o "porquê" do aluno no onboarding (diagnostico_inicial)
-- e registra as exibições do motivo em momentos de alto impacto
-- (início de módulo, cerimônia de chave, retorno após ausência).
-- ============================================================

-- ----------------------------------------------------------------------------
-- 1) Motivo no diagnóstico inicial (preenchido uma vez, no onboarding)
--    O detalhe é sempre opcional; a categoria é obrigatória para contas novas.
-- ----------------------------------------------------------------------------
alter table public.diagnostico_inicial
  add column if not exists motivo_categoria text
    check (motivo_categoria in (
      'parar_fim_de_semana',
      'reserva_emergencia',
      'contratar_ajudante',
      'sair_do_aperto',
      'crescer_empresa_de_verdade',
      'outro'
    )),
  add column if not exists motivo_detalhe text;

-- ----------------------------------------------------------------------------
-- 2) Controle de exibição do motivo
--    Contextos:
--      - inicio_modulo_1/2/3: aparece 1x por módulo (semanas 1, 5, 9);
--      - retorno_apos_ausencia: pode (e deve) repetir a cada retorno real,
--        por isso a unicidade inclui o dia — no máximo 1 exibição por dia.
-- ----------------------------------------------------------------------------
create table if not exists public.motivo_exibicoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contexto text not null check (contexto in (
    'inicio_modulo_1',
    'inicio_modulo_2',
    'inicio_modulo_3',
    'retorno_apos_ausencia'
  )),
  exibido_em timestamptz not null default now()
);

alter table public.motivo_exibicoes enable row level security;

drop policy if exists "usuario_ve_so_seus_motivos" on public.motivo_exibicoes;
create policy "usuario_ve_so_seus_motivos" on public.motivo_exibicoes
  for select using (auth.uid() = user_id);

drop policy if exists "usuario_registra_so_seus_motivos" on public.motivo_exibicoes;
create policy "usuario_registra_so_seus_motivos" on public.motivo_exibicoes
  for insert with check (auth.uid() = user_id);

-- Mesmo padrão do radar_eventos: "AT TIME ZONE 'UTC'" torna a expressão
-- IMMUTABLE (necessário para índice único com cast de data).
create unique index if not exists idx_motivo_exibicoes_dia
  on public.motivo_exibicoes(user_id, contexto, ((exibido_em AT TIME ZONE 'UTC')::date));

create index if not exists idx_motivo_exibicoes_user on public.motivo_exibicoes(user_id);

grant select, insert on public.motivo_exibicoes to authenticated;
