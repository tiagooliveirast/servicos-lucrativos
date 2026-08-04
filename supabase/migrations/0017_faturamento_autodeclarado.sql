-- ============================================================
-- Onda 17 — Faturamento autodeclarado (provisório, apresentação)
--
-- Decisão consciente e TEMPORÁRIA (Tiago): para apresentar a
-- plataforma hoje, o próprio aluno informa o faturamento que
-- desbloqueia a chave — sem validação externa ainda. Isso fica
-- marcado no dado (nivel_confianca = 'autodeclarado', fonte =
-- 'autodeclarado') e na UI, para não ser confundido com o
-- faturamento validado via RefriClube quando a integração existir.
--
-- NÃO altera a lógica de IME/IE nem o gate dos 4 pilares.
-- ============================================================

-- 1) Nível de confiança da origem do faturamento.
--    Default 'autodeclarado' (origem temporária). Quando a integração
--    real existir, os inserts do RefriClube usarão 'refriclube'.
alter table public.faturamento_validado
  add column if not exists nivel_confianca text not null default 'autodeclarado'
    check (nivel_confianca in ('autodeclarado', 'refriclube', 'verificado'));

-- 2) RLS: o aluno insere apenas a PRÓPRIA linha e sempre como
--    'autodeclarado'. O check trava 'refriclube'/'verificado' —
--    preserva a possibilidade de apertar o padrão depois sem
--    reescrever nada. UPDATE/DELETE continuam negados.
drop policy if exists "usuario_insere_proprio_faturamento_autodeclarado" on public.faturamento_validado;
create policy "usuario_insere_proprio_faturamento_autodeclarado"
on public.faturamento_validado
for insert
to authenticated
with check (
  auth.uid() = user_id
  and nivel_confianca = 'autodeclarado' -- trava: usuário só consegue inserir como autodeclarado, nunca como 'refriclube' ou 'verificado'
);

-- 3) Permissão de INSERT (a Onda 16 revogou todo insert do client;
--    a política acima limita linha e nivel_confianca). As demais
--    permissões de leitura/revogações seguem como estavam.
grant insert on public.faturamento_validado to authenticated;