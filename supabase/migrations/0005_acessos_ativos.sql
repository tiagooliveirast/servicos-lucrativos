-- ============================================================
-- Gestão Lucrativa — Fase 1, finalização
-- Controle de acesso ativo/inativo
-- Execute este arquivo após o 0004_admin_atividade.sql no SQL Editor.
-- ============================================================

-- A tabela acessos antiga era baseada em e-mail. A nova é baseada em
-- user_id e ganha a flag ativo (para desativar alguém sem apagar os dados).
-- Guardamos a tabela antiga como referência (emails de compradores que
-- ainda não têm conta criada); pode ser dropada depois de conferir.

alter table public.acessos rename to acessos_legado;

create table if not exists public.acessos (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,                      -- informativo (facilita conferência)
  ativo boolean not null default true,
  motivo_inativacao text,
  inativado_em timestamptz,
  created_at timestamptz default now()
);

alter table public.acessos enable row level security;

-- O aluno consulta apenas o próprio acesso (vindo do auth.uid() no servidor)
drop policy if exists "usuario_ve_proprio_acesso" on public.acessos;
create policy "usuario_ve_proprio_acesso" on public.acessos
  for select using (auth.uid() = user_id);

-- Admin enxerga e pode desativar/reverter o acesso de qualquer um
drop policy if exists "admin_ve_todos_acessos" on public.acessos;
create policy "admin_ve_todos_acessos" on public.acessos
  for select using (auth.uid() in (select user_id from admins));
drop policy if exists "admin_atualiza_acessos" on public.acessos;
create policy "admin_atualiza_acessos" on public.acessos
  for update using (auth.uid() in (select user_id from admins));

-- Migra liberações antigas: liga o e-mail ao user_id correspondente
insert into public.acessos (user_id, email, created_at)
select u.id, l.email, l.created_at
from public.acessos_legado l
join auth.users u on lower(u.email) = lower(l.email)
where l.liberado
on conflict (user_id) do nothing;

grant select, insert, update, delete on all tables in schema public to anon, authenticated;
