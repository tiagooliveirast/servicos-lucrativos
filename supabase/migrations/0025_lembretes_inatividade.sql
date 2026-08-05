-- ============================================================
-- Prompt #25 — Lembrete semanal automático por e-mail (opt-out)
--
-- Parte 1: opt-out obrigatório. Todo aluno nasce com
--         receber_lembretes = true; desativa via e-mail
--         (link de descadastro) ou nas configurações da conta.
-- Parte 2: tabela de controle de envio — garante no MÁXIMO 1
--         lembrete de inatividade a cada 6 dias por aluno,
--         mesmo que o job rode 2x por engano.
--
-- Nenhum e-mail é enviado aqui: isso é só a base de dados da
-- Edge Function "enviar-lembretes-semanais".
-- ============================================================

-- ------------------------------------------------------------
-- PARTE 1 — Opt-out (perfis)
-- ------------------------------------------------------------
alter table public.perfis
  add column if not exists receber_lembretes boolean not null default true;

-- ------------------------------------------------------------
-- PARTE 2 — Controle de envio
-- ------------------------------------------------------------
create table if not exists public.lembretes_enviados (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null default 'inatividade_semanal',
  enviado_em timestamptz not null default now()
);

create index if not exists idx_lembretes_enviados_user_data
  on public.lembretes_enviados(user_id, enviado_em);

-- Tabela interna de auditoria: escrita e leitura apenas via
-- service role (Edge Function). Sem políticas = nenhum aluno
-- enxerga ou mexe nela.
alter table public.lembretes_enviados enable row level security;

-- A função "enviar-lembretes-semanais" roda com service role
-- (ignora RLS), então nada mais precisa ser concedido aqui.
