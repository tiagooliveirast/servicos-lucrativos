-- ============================================================
-- Onda 8 (Nível 1) — Análise diária com IA real
--
-- Cache da mensagem do "mentor" gerada pela Edge Function
-- gerar-analise-diaria (OpenAI). A IA apenas reescreve em
-- linguagem natural o que o motor de regras já calculou
-- (IME, IE, Radar, missão, chaves) — não toma decisão nova.
--
-- Controle de custo:
--   * unique(user_id, data) → no máximo 1 geração por usuário
--     por dia (a Edge Function retorna o cache nas chamadas
--     seguintes do mesmo dia);
--   * escrita SOMENTE via service role (Edge Function) — o
--     client (anon/authenticated) não insere/atualiza nada;
--   * leitura: cada usuário vê apenas a própria linha; admin
--     vê todas (mesmo padrão de faturamento_validado).
-- ============================================================

create table if not exists public.analises_ia_diarias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  data date not null,
  texto text not null,
  modelo text not null,
  created_at timestamptz not null default now(),
  unique (user_id, data)
);

alter table public.analises_ia_diarias enable row level security;

drop policy if exists "usuario_ve_so_sua_analise" on public.analises_ia_diarias;
create policy "usuario_ve_so_sua_analise" on public.analises_ia_diarias
  for select using (auth.uid() = user_id);

drop policy if exists "admin_ve_todas_analises" on public.analises_ia_diarias;
create policy "admin_ve_todas_analises" on public.analises_ia_diarias
  for select using (auth.uid() in (select user_id from admins));

create index if not exists idx_analises_ia_user_data
  on public.analises_ia_diarias(user_id, data);

-- O client nunca escreve aqui: escrita exclusiva da Edge Function
-- (service role), que é quem controla o teto diário de gastos.
revoke insert, update, delete on public.analises_ia_diarias from anon, authenticated;
grant select on public.analises_ia_diarias to authenticated;
