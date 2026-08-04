-- ============================================================
-- Prompt #22 — Dica de preenchimento da semana com IA sob demanda
--
-- Cache da dica personalizada gerada pela Edge Function
-- gerar-dica-semana (OpenAI). O aluno clica em "Gerar dica
-- personalizada" e a IA ajuda a preencher os campos da semana.
--
-- Regras:
--   * unique(user_id, semana_numero) → no máximo 1 dica por
--     semana; "Atualizar dica" sobrescreve (a Edge Function
--     faz upsert via service role);
--   * escrita SOMENTE via service role (Edge Function) — o
--     client (anon/authenticated) não insere/atualiza nada;
--   * leitura: cada usuário vê apenas a própria linha; admin
--     vê todas (mesmo padrão de analises_ia_diarias).
-- ============================================================

create table if not exists public.dicas_preenchimento_semana (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  semana_numero integer not null check (semana_numero between 1 and 12),
  texto text not null,
  modelo text not null,
  gerado_em timestamptz not null default now(),
  unique (user_id, semana_numero)
);

alter table public.dicas_preenchimento_semana enable row level security;

drop policy if exists "usuario_ve_so_sua_dica" on public.dicas_preenchimento_semana;
create policy "usuario_ve_so_sua_dica" on public.dicas_preenchimento_semana
  for select using (auth.uid() = user_id);

drop policy if exists "admin_ve_todas_dicas" on public.dicas_preenchimento_semana;
create policy "admin_ve_todas_dicas" on public.dicas_preenchimento_semana
  for select using (auth.uid() in (select user_id from admins));

create index if not exists idx_dicas_preenchimento_user_semana
  on public.dicas_preenchimento_semana(user_id, semana_numero);

-- O client nunca escreve aqui: escrita exclusiva da Edge Function
-- (service role), que é quem controla o custo de OpenAI.
revoke insert, update, delete on public.dicas_preenchimento_semana from anon, authenticated;
grant select on public.dicas_preenchimento_semana to authenticated;
