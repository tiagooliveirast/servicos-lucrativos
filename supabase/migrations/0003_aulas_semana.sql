-- ============================================================
-- Gestão Lucrativa — Fase 1, continuação
-- Vídeo-aula por semana
-- Execute este arquivo após o 0002_radar_eventos.sql no SQL Editor.
-- ============================================================

-- Uma linha por semana (1 a 12), com o link da aula gravada no YouTube.
-- Preenchido diretamente no Table Editor (aula ainda sem link = video_url nulo).
create table if not exists public.aulas_semana (
  semana int primary key check (semana between 1 and 12),
  titulo text not null,
  video_url text,             -- link completo do YouTube, ex: https://youtu.be/XXXXXXXXXXX
  duracao_minutos int
);

-- Conteúdo da aula é igual para todo mundo: leitura para qualquer usuário autenticado,
-- sem filtro por user_id.
alter table public.aulas_semana enable row level security;

drop policy if exists "usuarios_autenticados_leem_aulas" on public.aulas_semana;
create policy "usuarios_autenticados_leem_aulas" on public.aulas_semana
  for select using (auth.role() = 'authenticated');

-- Popula as 12 semanas com os títulos do plano; video_url fica null
-- até o link ser cadastrado no Table Editor.
insert into public.aulas_semana (semana, titulo) values
  (1, 'Diagnóstico Financeiro Completo'),
  (2, 'Precificação Corrigida'),
  (3, 'Ticket Médio'),
  (4, 'Metas e Painel Financeiro'),
  (5, 'Experiência do Cliente e Tempo Produtivo'),
  (6, 'Processo Completo (POP)'),
  (7, 'Agenda Inteligente'),
  (8, 'Pós-venda'),
  (9, 'Captação de Clientes'),
  (10, 'Conversão de Orçamento'),
  (11, 'Indicadores e Autoridade'),
  (12, 'Escala e Fechamento')
on conflict (semana) do nothing;

grant select, insert, update, delete on all tables in schema public to anon, authenticated;
