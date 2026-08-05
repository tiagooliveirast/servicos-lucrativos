-- ----------------------------------------------------------------------------
-- 0024 — Ajuste pós-revisão dos triggers de XP (0023)
--
-- Em trigger BEFORE, verificar_conquistas() lia progresso_semanas antes de a
-- linha nova existir — conquistas ("primeira_semana", módulos completos, etc.)
-- nunca eram detectadas no momento da conclusão. Os triggers voltam a ser
-- AFTER (linha visível) e a flag xp_creditado é gravada num UPDATE interno na
-- MESMA transação. Esse UPDATE não re-dispara os triggers de status (que
-- escutam apenas 'update of status' / 'update of concluida').
-- ----------------------------------------------------------------------------
create or replace function public.gamifica_semana()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'concluida'
     and (tg_op = 'INSERT' or old.status is distinct from 'concluida')
     and not new.xp_creditado then
    perform public.adicionar_xp(new.user_id, 100, 'Semana ' || new.semana || ' concluída');
    perform public.verificar_conquistas(new.user_id);
    update public.progresso_semanas
       set xp_creditado = true
     where user_id = new.user_id and semana = new.semana;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_gamifica_semana on public.progresso_semanas;
create trigger trg_gamifica_semana
  after insert or update of status on public.progresso_semanas
  for each row execute function public.gamifica_semana();

create or replace function public.gamifica_missao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.concluida
     and (tg_op = 'INSERT' or not old.concluida)
     and not new.xp_creditado then
    perform public.adicionar_xp(new.user_id, 10, 'Missão concluída');
    update public.missoes
       set xp_creditado = true
     where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_gamifica_missao on public.missoes;
create trigger trg_gamifica_missao
  after insert or update of concluida on public.missoes
  for each row execute function public.gamifica_missao();
