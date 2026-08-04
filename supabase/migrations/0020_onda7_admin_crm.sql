-- ============================================================
-- Onda 7 — Admin/CRM avançado (Tiago)
--
-- Parte 1 — Central de dúvidas (aluno abre, admin responde)
-- Parte 2 — Aprovação de missões com upload de arquivo
--           (primeiro upload real de usuário → Supabase Storage,
--           bucket privado, acesso só via signed URL sob demanda)
-- Parte 3 — CRM determinístico (sem IA): views sobre dados que
--           já existem (risco de desistência, evolução acelerada,
--           candidatos a case).
--
-- Tudo regra determinística. Nenhuma notificação push/e-mail aqui:
-- só indicador visual (UI) e contadores.
-- ============================================================

-- ============================================================
-- PARTE 1 — Central de dúvidas
-- ============================================================
create table if not exists public.duvidas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  categoria text not null check (categoria in ('financeiro','comercial','plataforma','conteudo','outro')),
  titulo text not null,
  mensagem text not null,
  status text not null default 'aberta' check (status in ('aberta','respondida','fechada')),
  resposta_admin text,
  respondida_em timestamptz,
  created_at timestamptz not null default now()
);

alter table public.duvidas enable row level security;

-- Aluno lê e cria apenas as PRÓPRIAS dúvidas.
drop policy if exists "usuario_ve_so_suas_duvidas" on public.duvidas;
create policy "usuario_ve_so_suas_duvidas" on public.duvidas
  for select using (auth.uid() = user_id);

drop policy if exists "usuario_cria_so_suas_duvidas" on public.duvidas;
create policy "usuario_cria_so_suas_duvidas" on public.duvidas
  for insert with check (auth.uid() = user_id);

-- Admin lê todas e atualiza (responder, mudar status). O WITH CHECK
-- igual ao USING também trava a linha: aluno não consegue alterar.
drop policy if exists "admin_ve_duvidas_de_todos" on public.duvidas;
create policy "admin_ve_duvidas_de_todos" on public.duvidas
  for select using (auth.uid() in (select user_id from admins));

drop policy if exists "admin_atualiza_duvidas_de_todos" on public.duvidas;
create policy "admin_atualiza_duvidas_de_todos" on public.duvidas
  for update using (auth.uid() in (select user_id from admins))
  with check (auth.uid() in (select user_id from admins));

create index if not exists idx_duvidas_user on public.duvidas(user_id, created_at);
create index if not exists idx_duvidas_status on public.duvidas(status, created_at);

-- ============================================================
-- PARTE 2 — Anexos de missões (upload de arquivo)
-- ============================================================
create table if not exists public.missoes_anexos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  semana_numero int not null check (semana_numero between 1 and 12),
  tipo_anexo text not null, -- ex: 'tabela_precos', 'pop', 'foto_oficina'
  storage_path text not null,
  nome_arquivo text,
  status text not null default 'pendente' check (status in ('pendente','aprovado','rejeitado')),
  comentario_admin text,
  created_at timestamptz not null default now()
);

alter table public.missoes_anexos enable row level security;

-- Aluno lê/cria apenas os PRÓPRIOS anexos.
drop policy if exists "usuario_ve_so_seus_anexos" on public.missoes_anexos;
create policy "usuario_ve_so_seus_anexos" on public.missoes_anexos
  for select using (auth.uid() = user_id);

drop policy if exists "usuario_cria_so_seus_anexos" on public.missoes_anexos;
create policy "usuario_cria_so_seus_anexos" on public.missoes_anexos
  for insert with check (auth.uid() = user_id);

-- Admin lê todos e avalia (aprovado/rejeitado + comentário).
drop policy if exists "admin_ve_anexos_de_todos" on public.missoes_anexos;
create policy "admin_ve_anexos_de_todos" on public.missoes_anexos
  for select using (auth.uid() in (select user_id from admins));

drop policy if exists "admin_atualiza_anexos_de_todos" on public.missoes_anexos;
create policy "admin_atualiza_anexos_de_todos" on public.missoes_anexos
  for update using (auth.uid() in (select user_id from admins))
  with check (auth.uid() in (select user_id from admins));

create index if not exists idx_missoes_anexos_user on public.missoes_anexos(user_id, semana_numero);
create index if not exists idx_missoes_anexos_status on public.missoes_anexos(status, created_at);

-- ----------------------------------------------------------------------------
-- Bucket de Storage PRIVADO. O arquivo só é alcançável via signed URL gerada
-- sob demanda (createSignedUrl no client) — as políticas abaixo garantem que
-- o RLS do Storage também respeite "aluno vê o próprio, admin vê todos".
-- Conexão do path: primeira pasta = user_id (ex: <uuid>/tabela_precos-...).
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('missoes-anexos', 'missoes-anexos', false)
on conflict (id) do nothing;

drop policy if exists "usuario_enviar_proprio_anexo" on storage.objects;
create policy "usuario_enviar_proprio_anexo" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'missoes-anexos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "usuario_ver_proprio_anexo" on storage.objects;
create policy "usuario_ver_proprio_anexo" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'missoes-anexos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "admin_ver_todos_anexos" on storage.objects;
create policy "admin_ver_todos_anexos" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'missoes-anexos'
    and auth.uid() in (select user_id from public.admins)
  );

-- ============================================================
-- PARTE 3 — CRM determinístico (views sobre dados existentes)
--
-- security_invoker = true: o RLS das tabelas base se aplica ao
-- chamador (aluno só enxerga a própria linha, se ela aparecer;
-- admin enxerga a turma toda). Limiares são propostas v1,
-- ajustáveis sem mudar arquitetura.
-- ============================================================

-- ----------------------------------------------------------------------------
-- 3.1 Risco de desistência: alunos com >= 7 dias sem login.
--     ultimo_login (streak) tem prioridade; cai para ultimo_acesso_at se o
--     streak ainda não foi gravado.
-- ----------------------------------------------------------------------------
drop view if exists public.crm_risco_desistencia;
create view public.crm_risco_desistencia
with (security_invoker = true) as
select
  p.id as user_id,
  p.nome,
  p.email,
  d.nome_empresa,
  coalesce(g.ultimo_login, p.ultimo_acesso_at::date) as ultimo_login,
  (current_date - coalesce(g.ultimo_login, p.ultimo_acesso_at::date)) as dias_sem_login
from public.perfis p
left join public.diagnostico_inicial d on d.user_id = p.id
left join public.gamificacao_usuario g on g.user_id = p.id
where (current_date - coalesce(g.ultimo_login, p.ultimo_acesso_at::date)) >= 7;

-- ----------------------------------------------------------------------------
-- 3.2 Evolução acelerada: ganho de >= 20 pontos de IME nos últimos 30 dias.
--     ih1 = snapshot mais recente; ih2 = snapshot mais recente com >= 30 dias.
-- ----------------------------------------------------------------------------
drop view if exists public.crm_evolucao_acelerada;
create view public.crm_evolucao_acelerada
with (security_invoker = true) as
select
  ih1.user_id,
  ih1.score_total as ime_atual,
  ih2.score_total as ime_ha_30_dias,
  (ih1.score_total - ih2.score_total) as ganho_30_dias,
  ih1.data_calculo as calculado_em
from public.ime_historico ih1
join public.ime_historico ih2
  on ih2.user_id = ih1.user_id
 and ih2.data_calculo = (
   select max(ihx.data_calculo)
     from public.ime_historico ihx
    where ihx.user_id = ih1.user_id
      and ihx.data_calculo <= now() - interval '30 days'
 )
where ih1.data_calculo = (
  select max(ihx.data_calculo)
    from public.ime_historico ihx
   where ihx.user_id = ih1.user_id
)
and (ih1.score_total - ih2.score_total) >= 20;

-- ----------------------------------------------------------------------------
-- 3.3 Candidatos a case: chave de nível alto (Vermelho = ordem 3 ou
--     acima) desbloqueada + certificado disponível (12 semanas concluídas
--     + IME atual >= 70 + 3 painéis mensais preenchidos) — mesma regra do
--     certificado exibida na tela do admin.
-- ----------------------------------------------------------------------------
drop view if exists public.crm_candidatos_case;
create view public.crm_candidatos_case
with (security_invoker = true) as
select
  p.id as user_id,
  p.nome,
  p.email,
  d.nome_empresa,
  topo_chave.codigo as chave_codigo,
  topo_chave.titulo as chave_titulo,
  topo_chave.cor_hex as chave_cor_hex,
  topo_chave.ordem as chave_ordem,
  topo_chave.desbloqueada_em as chave_desbloqueada_em,
  ih.score_total as ime_atual,
  total_concluidas.semanas_concluidas,
  total_paineis.paineis_preenchidos
from public.perfis p
left join public.diagnostico_inicial d on d.user_id = p.id
left join lateral (
  select c.codigo, c.titulo, c.cor_hex, c.ordem, cu.desbloqueada_em
    from public.chaves_usuario cu
    join public.chaves c on c.id = cu.chave_id
   where cu.user_id = p.id
   order by c.ordem desc
   limit 1
) topo_chave on true
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
where topo_chave.ordem >= 3
  and total_concluidas.semanas_concluidas >= 12
  and ih.score_total >= 70
  and total_paineis.paineis_preenchidos >= 3;

-- ============================================================
-- Permissões
-- ============================================================
grant select on public.duvidas to authenticated;
grant insert on public.duvidas to authenticated;
grant update on public.duvidas to authenticated;

grant select on public.missoes_anexos to authenticated;
grant insert on public.missoes_anexos to authenticated;
grant update on public.missoes_anexos to authenticated;

grant select on public.crm_risco_desistencia to authenticated;
grant select on public.crm_evolucao_acelerada to authenticated;
grant select on public.crm_candidatos_case to authenticated;