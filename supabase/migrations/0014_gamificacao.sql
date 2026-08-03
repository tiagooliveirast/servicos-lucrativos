-- ============================================================
-- Onda 3a — Fundação de Gamificação (XP, Nível, Streak, Conquistas, Baús)
-- Tudo determinístico: regra em SQL (fonte única) + triggers.
-- Execute este arquivo após o 0013_checkin_unique.sql.
-- ============================================================

-- ----------------------------------------------------------------------------
-- 1) Gamificação do usuário (XP, nível, streak)
-- Escrita SEMPRE via função/trigger server-side (nunca INSERT/UPDATE do client).
-- O nível é DERIVADO do XP (floor(xp_total/300)+1) — nunca um contador solto.
-- ----------------------------------------------------------------------------
create table if not exists public.gamificacao_usuario (
  user_id uuid primary key references auth.users(id) on delete cascade,
  xp_total int not null default 0,
  nivel int not null default 1,
  dias_consecutivos int not null default 0,
  maior_sequencia int not null default 0,
  ultimo_login date,
  updated_at timestamptz not null default now()
);

alter table public.gamificacao_usuario enable row level security;

drop policy if exists "usuario_ve_sua_gamificacao" on public.gamificacao_usuario;
create policy "usuario_ve_sua_gamificacao" on public.gamificacao_usuario
  for select using (auth.uid() = user_id);

drop policy if exists "admin_ve_gamificacao_de_todos" on public.gamificacao_usuario;
create policy "admin_ve_gamificacao_de_todos" on public.gamificacao_usuario
  for select using (auth.uid() in (select user_id from admins));

-- ----------------------------------------------------------------------------
-- 2) Catálogo de conquistas (badges)
--    Público para leitura: todo usuário autenticado vê o que ainda falta.
--    O que cada usuário JÁ desbloqueou fica em conquistas_usuario (RLS própria).
-- ----------------------------------------------------------------------------
create table if not exists public.conquistas (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,
  titulo text not null,
  descricao text not null,
  icone text,
  criterio jsonb not null
);

alter table public.conquistas enable row level security;

drop policy if exists "autenticado_ve_catalogo_conquistas" on public.conquistas;
create policy "autenticado_ve_catalogo_conquistas" on public.conquistas
  for select using (auth.uid() is not null);

-- ----------------------------------------------------------------------------
-- 3) Conquistas desbloqueadas por usuário (unique → cada conquista só uma vez)
-- ----------------------------------------------------------------------------
create table if not exists public.conquistas_usuario (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conquista_id uuid not null references public.conquistas(id),
  desbloqueada_em timestamptz not null default now(),
  unique (user_id, conquista_id)
);

alter table public.conquistas_usuario enable row level security;

drop policy if exists "usuario_ve_so_suas_conquistas" on public.conquistas_usuario;
create policy "usuario_ve_so_suas_conquistas" on public.conquistas_usuario
  for select using (auth.uid() = user_id);

drop policy if exists "admin_ve_conquistas_de_todos" on public.conquistas_usuario;
create policy "admin_ve_conquistas_de_todos" on public.conquistas_usuario
  for select using (auth.uid() in (select user_id from admins));

create index if not exists idx_conquistas_usuario_user on public.conquistas_usuario(user_id);

-- ----------------------------------------------------------------------------
-- 4) Baús (catálogo) e baús do usuário
--    O baú é criado automaticamente quando a conquista gatilho é desbloqueada,
--    mas só é ABERTO por ação do usuário (aberto/aberto_em).
-- ----------------------------------------------------------------------------
create table if not exists public.bauis (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,
  titulo text not null,
  conquista_gatilho_id uuid references public.conquistas(id),
  conteudo_tipo text not null check (conteudo_tipo in ('template','checklist','aula_bonus','cupom','wallpaper')),
  conteudo_url text,
  conteudo_texto text
);

alter table public.bauis enable row level security;

drop policy if exists "autenticado_ve_catalogo_bauis" on public.bauis;
create policy "autenticado_ve_catalogo_bauis" on public.bauis
  for select using (auth.uid() is not null);

create table if not exists public.bauis_usuario (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  baul_id uuid not null references public.bauis(id),
  aberto boolean not null default false,
  desbloqueado_em timestamptz not null default now(),
  aberto_em timestamptz,
  unique (user_id, baul_id)
);

alter table public.bauis_usuario enable row level security;

drop policy if exists "usuario_ve_so_seus_bauis" on public.bauis_usuario;
create policy "usuario_ve_so_seus_bauis" on public.bauis_usuario
  for select using (auth.uid() = user_id);

drop policy if exists "usuario_abre_so_seu_bau" on public.bauis_usuario;
create policy "usuario_abre_so_seu_bau" on public.bauis_usuario
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "admin_ve_bauis_de_todos" on public.bauis_usuario;
create policy "admin_ve_bauis_de_todos" on public.bauis_usuario
  for select using (auth.uid() in (select user_id from admins));

create index if not exists idx_bauis_usuario_user on public.bauis_usuario(user_id);

-- ----------------------------------------------------------------------------
-- 5) XP: função central (SERVIDOR)
--    security definer porque só quem tem EXECUTE consegue chamar; abaixo a
--    EXECUTE é revogada para anon/authenticated/public — o client não
--    consegue NUNCA chamar adicionar_xp diretamente (nem via RPC).
-- ----------------------------------------------------------------------------
create or replace function public.adicionar_xp(
  p_user_id uuid,
  p_quantidade int,
  p_motivo text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_quantidade = 0 then return; end if;

  insert into public.gamificacao_usuario (user_id, xp_total, nivel)
  values (
    p_user_id,
    greatest(0, p_quantidade),
    floor(greatest(0, p_quantidade) / 300.0)::int + 1
  )
  on conflict (user_id) do update
    set xp_total = public.gamificacao_usuario.xp_total + p_quantidade,
        nivel = floor((public.gamificacao_usuario.xp_total + p_quantidade) / 300.0)::int + 1,
        updated_at = now();
end;
$$;

revoke execute on function public.adicionar_xp(uuid, int, text) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 6) Verificação de conquistas (idempotente — unique garante 1 vez)
--    Triggeradas após eventos, mas podem ser chamadas à vontade.
-- ----------------------------------------------------------------------------
create or replace function public.verificar_conquistas(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prog jsonb;
  v_ime int;
  v_streak int;
  v_checkins int;
  v_codigos text[] := '{}';
begin
  select coalesce(jsonb_object_agg(semana::text, status), '{}'::jsonb)
    into v_prog
    from public.progresso_semanas
    where user_id = p_user;

  select count(*)::int
    into v_checkins
    from public.checkins_semanais
    where user_id = p_user;

  select max(score_total)::int into v_ime
    from public.ime_historico
    where user_id = p_user;

  select dias_consecutivos into v_streak
    from public.gamificacao_usuario
    where user_id = p_user;
  v_streak := coalesce(v_streak, 0);

  if coalesce(v_prog ->> '1', '') = 'concluida' then
    v_codigos := array_append(v_codigos, 'primeira_semana');
  end if;

  if coalesce(v_prog ->> '1', '') = 'concluida'
     and coalesce(v_prog ->> '2', '') = 'concluida'
     and coalesce(v_prog ->> '3', '') = 'concluida'
     and coalesce(v_prog ->> '4', '') = 'concluida' then
    v_codigos := array_append(v_codigos, 'modulo_1_completo');
  end if;

  if coalesce(v_prog ->> '5', '') = 'concluida'
     and coalesce(v_prog ->> '6', '') = 'concluida'
     and coalesce(v_prog ->> '7', '') = 'concluida'
     and coalesce(v_prog ->> '8', '') = 'concluida' then
    v_codigos := array_append(v_codigos, 'modulo_2_completo');
  end if;

  if coalesce(v_prog ->> '9', '') = 'concluida'
     and coalesce(v_prog ->> '10', '') = 'concluida'
     and coalesce(v_prog ->> '11', '') = 'concluida'
     and coalesce(v_prog ->> '12', '') = 'concluida' then
    v_codigos := array_append(v_codigos, 'modulo_3_completo');
  end if;

  if v_ime is not null and v_ime >= 50 then
    v_codigos := array_append(v_codigos, 'ime_50');
  end if;

  if v_ime is not null and v_ime >= 70 then
    v_codigos := array_append(v_codigos, 'ime_70');
  end if;

  if v_streak >= 7 then v_codigos := array_append(v_codigos, 'streak_7'); end if;
  if v_streak >= 30 then v_codigos := array_append(v_codigos, 'streak_30'); end if;

  if v_checkins >= 12 then
    v_codigos := array_append(v_codigos, 'checkin_completo');
  end if;

  insert into public.conquistas_usuario (user_id, conquista_id)
  select p_user, c.id
    from public.conquistas c
   where c.codigo = any(v_codigos)
  on conflict (user_id, conquista_id) do nothing;
end;
$$;

revoke execute on function public.verificar_conquistas(uuid) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 7) Baú criado automaticamente ao desbloquear a conquista gatilho
-- ----------------------------------------------------------------------------
create or replace function public.criar_bau_conquista()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.bauis_usuario (user_id, baul_id)
  select new.user_id, b.id
    from public.bauis b
   where b.conquista_gatilho_id = new.conquista_id
  on conflict (user_id, baul_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_bau_conquista on public.conquistas_usuario;
create trigger trg_bau_conquista
  after insert on public.conquistas_usuario
  for each row execute function public.criar_bau_conquista();

-- ----------------------------------------------------------------------------
-- 8) Triggers de XP conectados aos eventos existentes
-- ----------------------------------------------------------------------------

-- 8.1 Semana concluída (última transição para 'concluida')
create or replace function public.gamifica_semana()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'concluida' and (tg_op = 'INSERT' or old.status is distinct from 'concluida') then
    perform public.adicionar_xp(new.user_id, 100, 'Semana ' || new.semana || ' concluída');
    perform public.verificar_conquistas(new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_gamifica_semana on public.progresso_semanas;
create trigger trg_gamifica_semana
  after insert or update of status on public.progresso_semanas
  for each row execute function public.gamifica_semana();

-- 8.2 Check-in semanal
create or replace function public.gamifica_checkin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.adicionar_xp(new.user_id, 20, 'Check-in semanal');
  perform public.verificar_conquistas(new.user_id);
  return new;
end;
$$;

drop trigger if exists trg_gamifica_checkin on public.checkins_semanais;
create trigger trg_gamifica_checkin
  after insert on public.checkins_semanais
  for each row execute function public.gamifica_checkin();

-- 8.3 Painel Mensal preenchido (faturamento informado = preenchido)
create or replace function public.gamifica_painel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.faturamento_atual is not null
     and (tg_op = 'INSERT' or old.faturamento_atual is null) then
    perform public.adicionar_xp(new.user_id, 50, 'Painel Mensal ' || new.numero_painel || ' preenchido');
    perform public.verificar_conquistas(new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_gamifica_painel on public.paineis_mensais;
create trigger trg_gamifica_painel
  after insert or update of faturamento_atual on public.paineis_mensais
  for each row execute function public.gamifica_painel();

-- 8.4 Missão concluída (principal ou rápida)
create or replace function public.gamifica_missao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.concluida and (tg_op = 'INSERT' or not old.concluida) then
    perform public.adicionar_xp(new.user_id, 10, 'Missão concluída');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_gamifica_missao on public.missoes;
create trigger trg_gamifica_missao
  after insert or update of concluida on public.missoes
  for each row execute function public.gamifica_missao();

-- 8.5 IME recalculado (im_historico) → checar ime_50/ime_70
create or replace function public.gamifica_ime()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.verificar_conquistas(new.user_id);
  return new;
end;
$$;

drop trigger if exists trg_gamifica_ime on public.ime_historico;
create trigger trg_gamifica_ime
  after insert on public.ime_historico
  for each row execute function public.gamifica_ime();

-- ----------------------------------------------------------------------------
-- 9) RPC: registro de login diário (streak + XP do dia)
--    Usa current_date do servidor — o relógio do device não participa da regra.
-- ----------------------------------------------------------------------------
create or replace function public.registrar_login_diario()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := coalesce(auth.uid(), null);
  v_ultimo date;
begin
  if v_user is null then
    raise exception 'não autenticado';
  end if;

  insert into public.gamificacao_usuario (user_id)
  values (v_user)
  on conflict (user_id) do nothing;

  select ultimo_login into v_ultimo
    from public.gamificacao_usuario
   where user_id = v_user;

  if v_ultimo is distinct from current_date then
    update public.gamificacao_usuario
       set dias_consecutivos = case
             when v_ultimo = current_date - 1 then dias_consecutivos + 1
             else 1
           end,
           maior_sequencia = greatest(
             maior_sequencia,
             case when v_ultimo = current_date - 1 then dias_consecutivos + 1 else 1 end
           ),
           ultimo_login = current_date,
           updated_at = now()
     where user_id = v_user;

    perform public.adicionar_xp(v_user, 5, 'Login diário');
    perform public.verificar_conquistas(v_user);
  end if;
end;
$$;

revoke execute on function public.registrar_login_diario() from public, anon;
grant execute on function public.registrar_login_diario() to authenticated;

-- ----------------------------------------------------------------------------
-- 10) Seeds — catálogo de conquistas (v1)
-- ----------------------------------------------------------------------------
insert into public.conquistas (codigo, titulo, descricao, icone, criterio) values
  ('primeira_semana', 'Primeiro Passo', 'Complete a Semana 1: diagnóstico financeiro.', 'flag', '{"tipo":"semana","semanas":[1]}'::jsonb),
  ('modulo_1_completo', 'Fundação Financeira Completa', 'Complete as Semanas 1 a 4.', 'dollar', '{"tipo":"modulo","semanas":[1,2,3,4]}'::jsonb),
  ('modulo_2_completo', 'Operação Lucrativa Completa', 'Complete as Semanas 5 a 8.', 'settings', '{"tipo":"modulo","semanas":[5,6,7,8]}'::jsonb),
  ('modulo_3_completo', 'Crescimento e Escala Completo', 'Complete as Semanas 9 a 12.', 'rocket', '{"tipo":"modulo","semanas":[9,10,11,12]}'::jsonb),
  ('ime_50', 'Meio Caminho', 'Atinge IME de 50 pontos a metade da maturidade.', 'gauge', '{"tipo":"ime","minimo":50}'::jsonb),
  ('ime_70', 'Quase Lá', 'Atinge IME de 70 pontos e está perto da maturidade.', 'zap', '{"tipo":"ime","minimo":70}'::jsonb),
  ('streak_7', 'Uma Semana de Foco', 'Abra a plataforma por 7 dias consecutivos.', 'flame', '{"tipo":"streak","minimo":7}'::jsonb),
  ('streak_30', 'Um Mês de Constância', 'Abra a plataforma por 30 dias consecutivos.', 'crown', '{"tipo":"streak","minimo":30}'::jsonb),
  ('checkin_completo', 'Hábito Formado', 'Faça 12 check-ins semanais.', 'check', '{"tipo":"checkins","minimo":12}'::jsonb)
on conflict (codigo) do nothing;

-- ----------------------------------------------------------------------------
-- 11) Seeds — Baús da v1 (conteúdo real que a plataforma já tem)
-- Logo do baú vem da conquista gatilho (cada conquista dá acesso ao conteúdo).
-- ----------------------------------------------------------------------------
insert into public.bauis (codigo, titulo, conquista_gatilho_id, conteudo_tipo, conteudo_texto)
select
  'bau_tabela_precos',
  'Template da minha Tabela de Preços',
  c.id,
  'template',
  'Preço do meu serviço? Nada de chute.\n\n1. Liste seus 3 principais serviços.\n2. Você precisa saber o preço certo (que paga custo de vida + custo do negócio + lucro).\n3. Corrija o preço cobrado hoje (preço atual → preço novo).\n4. Ajuste sua oferta nova e a forma de vender.\n5. Anote aqui o resultado de cada serviço e mantenha a tabela viva todo mês.'
from public.conquistas c where c.codigo = 'modulo_1_completo'
on conflict (codigo) do nothing;

insert into public.bauis (codigo, titulo, conquista_gatilho_id, conteudo_tipo, conteudo_texto)
select
  'modelo_pop_atendimento',
  'Meu Modelo de POP (Processo)',
  (select id from public.conquistas c where c.codigo = 'modulo_2_completo'),
  'template',
  'PATRIMONIAL OPERACIONAL: o passo a passo do seu serviço, memorizável.\n\n1. Abertura do atendimento (o que você fala/cumprimenta).\n2. Descoberta (perguntas que você sempre faz).\n3. Criação do orçamento (como sai o preço).\n4. Fechamento da venda.\n5. Entrega / execução do serviço.\n6. Pós-venda (24h • 7d • 30d • 90d).\n\nSe pode ser ensinado a outra pessoa, vira um POP.'
from public.conquistas c where c.codigo = 'modulo_2_completo'
on conflict (codigo) do nothing;

insert into public.bauis (codigo, titulo, conquista_gatilho_id, conteudo_tipo, conteudo_texto)
select
  'checklist_indicadores_mensais',
  'Checklist dos Indicadores Mensais',
  (select id from public.conquistas c where c.codigo = 'modulo_3_completo'),
  'checklist',
  'Todo mês, feche estes números:\n\n[ ] Orçamentos enviados\n[ ] Vendas fechadas\n[ ] Ticket médio\n[ ] Lucro do mês\n[ ] Margem de lucro\n[ ] Clientes novos\n[ ] Clientes recuperados\n[ ] Indicações\n[ ] Avaliações no Google\n\nComparando mês a mês você descobre o que está melhorando (faturamento, margem, conversão).'
from public.conquistas c where c.codigo = 'modulo_3_completo'
on conflict (codigo) do nothing;

-- ----------------------------------------------------------------------------
-- 12) Backfill: XP e conquistas para dados existentes (migração não re-dispara
--     triggers no histórico já gravado). Também cria o login streak inicial.
-- ----------------------------------------------------------------------------
do $$
declare
  r record;
  l_xp int;
begin
  for r in (
    select distinct user_id from public.progresso_semanas
    union select distinct user_id from public.checkins_semanais
    union select distinct user_id from public.paineis_mensais
    union select distinct user_id from public.missoes
  ) loop
    select
      coalesce((select count(*) from public.progresso_semanas b where b.user_id = r.user_id and b.status = 'concluida') * 100, 0)
      + coalesce((select count(*) from public.checkins_semanais b where b.user_id = r.user_id) * 20, 0)
      + coalesce((select count(*) from public.paineis_mensais b where b.user_id = r.user_id and b.faturamento_atual is not null) * 50, 0)
      + coalesce((select count(*) from public.missoes b where b.user_id = r.user_id and b.concluida) * 10, 0)
      into l_xp;

    insert into public.gamificacao_usuario (user_id, xp_total, nivel, updated_at)
    values (r.user_id, l_xp, floor(l_xp / 300.0)::int + 1, now())
    on conflict (user_id) do nothing;

    perform public.verificar_conquistas(r.user_id);
  end loop;
end;
$$;

-- ----------------------------------------------------------------------------
-- 13) Permissões essenciais (as migrations anteriores já cobrem o resto)
-- ----------------------------------------------------------------------------
grant select on public.gamificacao_usuario, public.conquistas, public.conquistas_usuario, public.bauis, public.bauis_usuario to authenticated, anon;
grant update on public.bauis_usuario to authenticated;