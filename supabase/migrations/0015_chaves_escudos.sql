-- ============================================================
-- Onda 4 — Chaves, Escudos e Reconhecimento Físico
-- Formaliza em schema os limiares de IME (30/60/85) que a Sala
-- de Guerra usava hardcoded, com desbloqueio automático via
-- trigger no ime_historico (mesmo padrão das conquistas).
-- Execute este arquivo após o 0014_gamificacao.sql.
-- ============================================================

-- ----------------------------------------------------------------------------
-- 1) Catálogo de chaves (limiares de IME → chaves físicas/simbólicas)
--    Público para leitura: o aluno precisa ver o que ainda falta.
-- ----------------------------------------------------------------------------
create table if not exists public.chaves (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,
  titulo text not null,
  cor_hex text not null,
  ime_minimo int not null,
  ordem int not null,
  descricao text
);

alter table public.chaves enable row level security;

drop policy if exists "autenticado_ve_catalogo_chaves" on public.chaves;
create policy "autenticado_ve_catalogo_chaves" on public.chaves
  for select using (auth.uid() is not null);

-- ----------------------------------------------------------------------------
-- 2) Chaves desbloqueadas por usuário
--    unique(user_id, chave_id) → cada chave só desbloqueia UMA vez
--    (protege contra o IME oscilar em torno do limiar).
-- ----------------------------------------------------------------------------
create table if not exists public.chaves_usuario (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chave_id uuid not null references public.chaves(id),
  desbloqueada_em timestamptz not null default now(),
  solicitacao_fisica_status text not null default 'nao_solicitada'
    check (solicitacao_fisica_status in ('nao_solicitada','solicitada','enviada')),
  solicitacao_fisica_em timestamptz,
  unique (user_id, chave_id)
);

alter table public.chaves_usuario enable row level security;

-- Usuário: lê e atualiza apenas a PRÓPRIA linha (RLS limita a linha;
-- grants abaixo limitam as colunas editáveis).
drop policy if exists "usuario_ve_so_suas_chaves" on public.chaves_usuario;
create policy "usuario_ve_so_suas_chaves" on public.chaves_usuario
  for select using (auth.uid() = user_id);

drop policy if exists "usuario_atualiza_so_sua_chave" on public.chaves_usuario;
create policy "usuario_atualiza_so_sua_chave" on public.chaves_usuario
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Admin: lê e atualiza qualquer linha (para marcar 'enviada').
drop policy if exists "admin_ve_chaves_de_todos" on public.chaves_usuario;
create policy "admin_ve_chaves_de_todos" on public.chaves_usuario
  for select using (auth.uid() in (select user_id from admins));

drop policy if exists "admin_atualiza_chaves_de_todos" on public.chaves_usuario;
create policy "admin_atualiza_chaves_de_todos" on public.chaves_usuario
  for update using (auth.uid() in (select user_id from admins))
  with check (auth.uid() in (select user_id from admins));

create index if not exists idx_chaves_usuario_user on public.chaves_usuario(user_id);
create index if not exists idx_chaves_usuario_chave on public.chaves_usuario(chave_id);

-- ----------------------------------------------------------------------------
-- 3) Seeds — limiares herdados da Sala de Guerra (Tiago pode ajustar aqui)
-- ----------------------------------------------------------------------------
insert into public.chaves (codigo, titulo, cor_hex, ime_minimo, ordem, descricao) values
  ('chave_verde', 'Chave Verde — Fundação', '#4ade80', 30, 1, 'Fundação: preço certo, custos sob controle e diagnóstico financeiro fechado.'),
  ('chave_azul', 'Chave Azul — Operação', '#38bdf8', 60, 2, 'Operação: processos documentados, equipe encaminhada e indicadores rodando.'),
  ('chave_ouro', 'Chave Ouro — Escala', '#c9a227', 85, 3, 'Escala: empresa estruturada, reserva financeira e pronto para crescer.')
on conflict (codigo) do nothing;

-- ----------------------------------------------------------------------------
-- 4) Verificação de chaves (idempotente — unique garante 1 vez)
--    Mesma lógica de verificar_conquistas: dispara a partir do IME atual.
-- ----------------------------------------------------------------------------
create or replace function public.verificar_chaves(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ime int;
begin
  select max(score_total)::int into v_ime
    from public.ime_historico
   where user_id = p_user;

  if v_ime is null then
    return;
  end if;

  insert into public.chaves_usuario (user_id, chave_id)
  select p_user, c.id
    from public.chaves c
   where c.ime_minimo <= v_ime
  on conflict (user_id, chave_id) do nothing;
end;
$$;

revoke execute on function public.verificar_chaves(uuid) from public, anon, authenticated;

-- Trigger: recalculo do IME (novo insert em ime_historico) → verifica chaves
create or replace function public.desbloqueia_chaves_ime()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.verificar_chaves(new.user_id);
  return new;
end;
$$;

drop trigger if exists trg_chaves_ime on public.ime_historico;
create trigger trg_chaves_ime
  after insert on public.ime_historico
  for each row execute function public.desbloqueia_chaves_ime();

-- ----------------------------------------------------------------------------
-- 5) View do escudo atual (chave de maior ordem desbloqueada)
--    security_invoker: o RLS das tabelas base se aplica ao chamador
--    (usuário só vê o próprio escudo; admin vê de todos).
-- ----------------------------------------------------------------------------
drop view if exists public.escudo_atual_usuario;
create view public.escudo_atual_usuario
with (security_invoker = true) as
select cu.user_id, c.codigo, c.titulo, c.cor_hex, c.ordem, cu.desbloqueada_em
from public.chaves_usuario cu
join public.chaves c on c.id = cu.chave_id
where c.ordem = (
  select max(c2.ordem)
  from public.chaves_usuario cu2
  join public.chaves c2 on c2.id = cu2.chave_id
  where cu2.user_id = cu.user_id
);

-- ----------------------------------------------------------------------------
-- 6) Permissões: catálogo público; aluno só edita o status de solicitação
-- ----------------------------------------------------------------------------
grant select on public.chaves to authenticated, anon;
grant select on public.chaves_usuario to authenticated;
grant select on public.escudo_atual_usuario to authenticated;

-- Aluno NUNCA edita user_id/chave_id/desbloqueada_em: update limitado ao
-- par (solicitacao_fisica_status, solicitacao_fisica_em) da própria linha.
revoke update on public.chaves_usuario from public, anon, authenticated;
grant update (solicitacao_fisica_status, solicitacao_fisica_em) on public.chaves_usuario to authenticated;

-- ----------------------------------------------------------------------------
-- 7) Backfill: alunos que já atingiram limiar antes desta migration
--    (o trigger não re-dispara no histórico gravado).
-- ----------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in (
    select distinct user_id from public.ime_historico
  ) loop
    perform public.verificar_chaves(r.user_id);
  end loop;
end;
$$;
