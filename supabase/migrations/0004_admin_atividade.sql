-- ============================================================
-- Gestão Lucrativa — Fase 1, continuação
-- Painel administrativo (Tiago) + feed de atividade
-- Execute este arquivo após o 0003_aulas_semana.sql no SQL Editor.
-- ============================================================

-- ------------------------------------------------------------------
-- 1) Administradores
-- A conta do próprio Tiago é criada pelo fluxo normal (Supabase Auth)
-- e o user_id é inserido aqui manualmente, pelo Table Editor.
-- Esta tabela é a fonte da verdade para todas as políticas "admin" abaixo.
-- ------------------------------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  criado_em timestamptz default now()
);

alter table public.admins enable row level security;

drop policy if exists "so_admin_ve_admins" on public.admins;
create policy "so_admin_ve_admins" on public.admins
  for select using (auth.uid() in (select user_id from admins));

-- ------------------------------------------------------------------
-- 2) Feed de atividade (alimentado pelos triggers da Seção 4)
-- Só admin lê; os inserts vêm de triggers security definer ou da
-- Edge Function (service role) — nenhum aluno insere aqui.
-- ------------------------------------------------------------------
create table if not exists public.atividade_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  tipo text not null check (tipo in ('semana_concluida','painel_preenchido','radar_verde','plano_concluido')),
  descricao text not null, -- texto pronto pra exibir no feed, ex: "concluiu a Semana 4"
  criado_em timestamptz default now()
);

alter table public.atividade_log enable row level security;

drop policy if exists "admin_ve_atividade" on public.atividade_log;
create policy "admin_ve_atividade" on public.atividade_log
  for select using (auth.uid() in (select user_id from admins));

create index if not exists idx_atividade_user on public.atividade_log(user_id);
create index if not exists idx_atividade_criado on public.atividade_log(criado_em desc);

-- ------------------------------------------------------------------
-- 3) Admin passa a LER os dados de todos os usuários
-- Mesmo padrão em todas as tabelas de dados do aluno: quem está em
-- admins enxerga tudo (somente leitura). O aluno continua vendo
-- apenas os próprios dados pelas políticas existentes.
-- ------------------------------------------------------------------
drop policy if exists "admin_ve_perfis_de_todos" on public.perfis;
create policy "admin_ve_perfis_de_todos" on public.perfis
  for select using (auth.uid() in (select user_id from admins));

drop policy if exists "admin_ve_diagnostico_de_todos" on public.diagnostico_inicial;
create policy "admin_ve_diagnostico_de_todos" on public.diagnostico_inicial
  for select using (auth.uid() in (select user_id from admins));

drop policy if exists "admin_ve_progresso_de_todos" on public.progresso_semanas;
create policy "admin_ve_progresso_de_todos" on public.progresso_semanas
  for select using (auth.uid() in (select user_id from admins));

drop policy if exists "admin_ve_missoes_de_todos" on public.missoes;
create policy "admin_ve_missoes_de_todos" on public.missoes
  for select using (auth.uid() in (select user_id from admins));

drop policy if exists "admin_ve_indicadores_de_todos" on public.indicadores_semana;
create policy "admin_ve_indicadores_de_todos" on public.indicadores_semana
  for select using (auth.uid() in (select user_id from admins));

drop policy if exists "admin_ve_paineis_de_todos" on public.paineis_mensais;
create policy "admin_ve_paineis_de_todos" on public.paineis_mensais
  for select using (auth.uid() in (select user_id from admins));

drop policy if exists "admin_ve_radar_de_todos" on public.radar_eventos;
create policy "admin_ve_radar_de_todos" on public.radar_eventos
  for select using (auth.uid() in (select user_id from admins));

-- E-mail do usuário para o painel admin. O client não consegue ler
-- auth.users, então o trigger abaixo guarda o e-mail no perfil.
alter table public.perfis add column if not exists email text;

create or replace function public.handle_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfis (id, email) values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_novo_usuario();

-- ------------------------------------------------------------------
-- 4) Triggers que alimentam atividade_log
-- Todos security definer: o aluno não tem (nem deve ter) permissão
-- de inserir em atividade_log — o log é gravado pelo banco.
-- ------------------------------------------------------------------

-- 4.1 Semana concluída (+ evento especial dos 90 dias na Semana 12)
create or replace function public.log_atividade_semana()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'concluida' and (tg_op = 'INSERT' or old.status is distinct from 'concluida') then
    if new.semana in (4, 8, 12) then
      insert into public.atividade_log (user_id, tipo, descricao)
      values (new.user_id, 'semana_concluida',
        'concluiu a Semana ' || new.semana || ' e liberou o Painel Mensal ' || (new.semana / 4)::int);
    else
      insert into public.atividade_log (user_id, tipo, descricao)
      values (new.user_id, 'semana_concluida', 'concluiu a Semana ' || new.semana);
    end if;
    if new.semana = 12 then
      insert into public.atividade_log (user_id, tipo, descricao)
      values (new.user_id, 'plano_concluido', 'concluiu os 90 dias! 🎉');
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_log_semana_concluida on public.progresso_semanas;
create trigger trg_log_semana_concluida
  after insert or update of status on public.progresso_semanas
  for each row execute function public.log_atividade_semana();

-- 4.2 Painel mensal preenchido (o app só mexe em preenchido_em quando
-- houve mudança real de dados, então isto é o sinal de "preencheu")
create or replace function public.log_atividade_painel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.preenchido_em is distinct from old.preenchido_em then
    insert into public.atividade_log (user_id, tipo, descricao)
    values (new.user_id, 'painel_preenchido', 'preencheu o Painel Mensal ' || new.numero_painel);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_log_painel_preenchido on public.paineis_mensais;
create trigger trg_log_painel_preenchido
  after update of preenchido_em on public.paineis_mensais
  for each row execute function public.log_atividade_painel();

-- 4.3 Alerta verde do Radar (mensagem curta por regra, pronta pro feed)
create or replace function public.log_atividade_radar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  descricao_verde text;
begin
  if new.categoria = 'verde' then
    descricao_verde := case new.regra_id
      when 'conversao_alta_pouco_volume' then 'atingiu taxa de conversão acima de 70%'
      when 'pronto_para_contratar' then 'está pronto para contratar o primeiro ajudante'
      when 'relatorio_mensal' then 'preencheu o relatório mensal do negócio'
      else 'teve um resultado positivo no Radar da Empresa'
    end;
    insert into public.atividade_log (user_id, tipo, descricao)
    values (new.user_id, 'radar_verde', descricao_verde);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_log_radar_verde on public.radar_eventos;
create trigger trg_log_radar_verde
  after insert on public.radar_eventos
  for each row execute function public.log_atividade_radar();

grant select, insert, update, delete on all tables in schema public to anon, authenticated;
