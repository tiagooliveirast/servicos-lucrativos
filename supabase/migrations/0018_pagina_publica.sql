-- ============================================================
-- Onda 6 — Página pública da empresa + compartilhamento de evolução
--
-- Controle de privacidade ANTES de qualquer página pública existir:
--   * pagina_publica_ativa            → default FALSE, nada fica exposto
--     sem ação explícita do aluno;
--   * pagina_publica_slug             → identificador único da URL;
--   * pagina_publica_mostrar_faturamento → separado da ativação geral:
--     o aluno pode ter página pública mostrando IME/chave/evolução, mas
--     esconder o valor exato de faturamento (relevante enquanto o
--     faturamento é autodeclarado, não validado).
--
-- A leitura pública NÃO libera as tabelas (RLS continua fechado): tudo é
-- servido por UMA função security definer que devolve apenas o que a
-- página pública deve mostrar — e devolve NULL se o slug não existe ou a
-- página não está ativa (404 simples no app).
-- ============================================================

-- ----------------------------------------------------------------------------
-- 1) Colunas de privacidade em perfis
-- ----------------------------------------------------------------------------
alter table public.perfis
  add column if not exists pagina_publica_ativa boolean not null default false,
  add column if not exists pagina_publica_slug text,
  add column if not exists pagina_publica_mostrar_faturamento boolean not null default false;

-- Slug único: dois alunos nunca compartilham a mesma página.
alter table public.perfis
  add constraint if not exists perfis_pagina_publica_slug_unique
  unique (pagina_publica_slug);

-- Slug sanitizado: minúsculas, dígitos e hífens (mesma regra que o client aplica).
alter table public.perfis
  add constraint if not exists perfis_pagina_publica_slug_formato
  check (
    pagina_publica_slug is null
    or pagina_publica_slug ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$'
  );

-- ----------------------------------------------------------------------------
-- 2) RPC da página pública — security definer: devolve SOMENTE o que a
--    vitrine deve expor, independente de quem está olhando (anon ou aluno).
--    Segue as mesmas faixas visuais; o faixa/nome do IME é derivado no
--    client a partir do ime_atual (não expõe números internos quando não
--    queremos). No banco, cuidamos de NUNCA vazar custo/lucro pessoal.
-- ----------------------------------------------------------------------------
create or replace function public.buscar_pagina_publica(slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_perfil uuid;
  v_ativa boolean;
  v_mostrar_faturamento boolean;
  v_ime int;
  v_nome_empresa text;
  v_cidade text;
  v_estado text;
  v_chave jsonb;
  v_faturamento jsonb;
  v_ime_historico jsonb;
  v_certificado boolean;
begin
  select id, pagina_publica_ativa, pagina_publica_mostrar_faturamento
    into v_perfil, v_ativa, v_mostrar_faturamento
    from public.perfis
   where pagina_publica_slug = slug
   limit 1;

  if v_perfil is null or not coalesce(v_ativa, false) then
    return null;
  end if;

  -- IME atual (mais recente por data de cálculo)
  select score_total into v_ime
    from public.ime_historico
   where user_id = v_perfil
   order by data_calculo desc
   limit 1;

  -- Empresa e localização
  select nome_empresa into v_nome_empresa
    from public.diagnostico_inicial
   where user_id = v_perfil
   order by created_at desc
   limit 1;

  select cidade, estado into v_cidade, v_estado
    from public.perfis
   where id = v_perfil;

  -- Chave atual (a mais recente desbloqueada) — o "troféu", não dado sensível
  select jsonb_build_object(
           'codigo', c.codigo,
           'titulo', c.titulo,
           'cor_hex', c.cor_hex,
           'ordem', c.ordem,
           'desbloqueada_em', cu.desbloqueada_em
         )
    into v_chave
    from public.chaves_usuario cu
    join public.chaves c on c.id = cu.chave_id
   where cu.user_id = v_perfil
   order by cu.desbloqueada_em desc
   limit 1;

  -- Faturamento: só sai se o aluno marcou o toggle específico.
  -- Quando a origem é autodeclarada, o client mostra o mesmo selo da área
  -- interna ("faturamento autodeclarado") para manter a transparência.
  if coalesce(v_mostrar_faturamento, false) then
    select jsonb_build_object(
             'valor', valor,
             'nivel_confianca', nivel_confianca,
             'data_referencia', data_referencia
           )
      into v_faturamento
      from public.faturamento_validado
     where user_id = v_perfil
     order by data_referencia desc, sincronizado_em desc
     limit 1;
  end if;

  -- Série de IME completa (gráfico somente-leitura da vitrine)
  select coalesce(
           jsonb_agg(
             jsonb_build_object('data', data_calculo::date, 'valor', score_total)
             order by data_calculo
           ),
           '[]'::jsonb
         )
    into v_ime_historico
    from public.ime_historico
   where user_id = v_perfil;

  -- Selo de certificado: mesmos critérios do app (12 semanas + IME >= 70 +
  -- 3 painéis preenchidos). Só expõe o SELO, nunca o PDF.
  select (
           (select count(*)::int from public.progresso_semanas
             where user_id = v_perfil and status = 'concluida') >= 12
           and coalesce(v_ime, 0) >= 70
           and (select count(*)::int from public.paineis_mensais
                 where user_id = v_perfil and faturamento_atual is not null) >= 3
         )
    into v_certificado;

  return jsonb_build_object(
    'slug', slug,
    'nome_empresa', v_nome_empresa,
    'cidade', v_cidade,
    'estado', v_estado,
    'ime_atual', v_ime,
    'ime_historico', v_ime_historico,
    'chave', v_chave,
    'faturamento', v_faturamento,
    'certificado_disponivel', coalesce(v_certificado, false)
  );
end;
$$;

-- Página pública pode ser acessada por qualquer visitante (anon) ou aluno.
grant execute on function public.buscar_pagina_publica(text) to anon, authenticated;