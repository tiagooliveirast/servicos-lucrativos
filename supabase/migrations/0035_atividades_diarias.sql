-- ============================================================
-- 0035 — Atividades diárias
--
-- Uma ação pequena e concreta por dia (7 por semana, 84 no plano).
-- Qual atividade é a "de hoje" é calculada no client a partir de
-- acessos.data_primeiro_acesso (mesma fonte da trava de tempo do 0034):
--   dia_calendario  = dias desde data_primeiro_acesso + 1
--   semana_numero   = floor((dia-1)/7)+1
--   dia_da_semana   = ((dia-1) mod 7)+1
-- Aluno atrasado vê a atividade da semana realmente desbloqueada.
--
-- XP: 5 XP por atividade (menor que a missão de 10 XP), concedido por
-- trigger AFTER INSERT — o unique(user_id, atividade_id) garante que
-- marcar 2x não concede XP de novo.
--
-- CONTEÚDO: Semana 1 é definitiva (Tiago). Semanas 2-12 são PLACEHOLDER
-- gerado a partir do conteúdo existente de conteudo.ts (dicas, missões e
-- checklist de cada semana) para a feature não ficar vazia. Quando o Tiago
-- enviar o conteúdo final, a substituição é um UPDATE simples (ou
-- DELETE + INSERT) na tabela atividades_diarias — sem mudança de código.
-- ============================================================

-- ----------------------------------------------------------------------------
-- 1) Catálogo (público para autenticado — aluno lê o plano completo)
-- ----------------------------------------------------------------------------
create table if not exists public.atividades_diarias (
  id uuid primary key default gen_random_uuid(),
  semana_numero int not null,
  dia_da_semana int not null check (dia_da_semana between 1 and 7),
  titulo text not null,
  descricao text not null,
  unique(semana_numero, dia_da_semana)
);

alter table public.atividades_diarias enable row level security;

drop policy if exists "autenticado_ve_atividades_diarias" on public.atividades_diarias;
create policy "autenticado_ve_atividades_diarias" on public.atividades_diarias
  for select using (auth.uid() is not null);

-- ----------------------------------------------------------------------------
-- 2) Marcações do aluno (só o próprio aluno marca; admin lê tudo)
-- ----------------------------------------------------------------------------
create table if not exists public.atividades_diarias_usuario (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  atividade_id uuid not null references public.atividades_diarias(id),
  concluida_em timestamptz not null default now(),
  unique(user_id, atividade_id)
);

alter table public.atividades_diarias_usuario enable row level security;

drop policy if exists "usuario_ve_suas_atividades_diarias" on public.atividades_diarias_usuario;
create policy "usuario_ve_suas_atividades_diarias" on public.atividades_diarias_usuario
  for select using (auth.uid() = user_id);

drop policy if exists "usuario_marca_atividade_diaria" on public.atividades_diarias_usuario;
create policy "usuario_marca_atividade_diaria" on public.atividades_diarias_usuario
  for insert with check (auth.uid() = user_id);

drop policy if exists "admin_ve_atividades_diarias_de_todos" on public.atividades_diarias_usuario;
create policy "admin_ve_atividades_diarias_de_todos" on public.atividades_diarias_usuario
  for select using (public.eh_admin());

create index if not exists idx_atividades_diarias_usuario_user
  on public.atividades_diarias_usuario(user_id);

-- ----------------------------------------------------------------------------
-- 3) XP da atividade diária (5 XP) — só no INSERT.
--    O unique(user_id, atividade_id) impede XP duplicado.
--    Ajustável: basta trocar o 5 aqui e re-executar a função.
-- ----------------------------------------------------------------------------
create or replace function public.gamifica_atividade_diaria()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.adicionar_xp(new.user_id, 5, 'Atividade diária concluída');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_gamifica_atividade_diaria on public.atividades_diarias_usuario;
create trigger trg_gamifica_atividade_diaria
  after insert on public.atividades_diarias_usuario
  for each row execute function public.gamifica_atividade_diaria();

-- ----------------------------------------------------------------------------
-- 4) Conteúdo — Semana 1 (definitiva)
-- ----------------------------------------------------------------------------
insert into public.atividades_diarias (semana_numero, dia_da_semana, titulo, descricao) values
(1, 1, 'Anote cada gasto de hoje', 'Sem exceção — até o cafezinho. O objetivo é começar a enxergar pra onde seu dinheiro vai de verdade, não estimar de cabeça.'),
(1, 2, 'Liste 3 gastos fixos que você nem percebe pagando', 'Aluguel, internet, seguro do carro... aqueles que saem todo mês no automático. Anote os 3 primeiros que vierem à cabeça.'),
(1, 3, 'Separe 15 minutos e comece seu diagnóstico', 'Abra a Semana 1 na plataforma e preencha o que der — não precisa terminar hoje, só começar.'),
(1, 4, 'Pergunte-se: já teve um mês que sumiu dinheiro sem explicação?', 'Anote o que lembrar, mesmo que vago. Isso ajuda a identificar onde seu controle financeiro está mais fraco.'),
(1, 5, 'Revise os custos do seu negócio', 'Ferramentas, combustível, manutenção, material. Esqueceu de listar algum desses na plataforma? Hoje é o dia de completar.'),
(1, 6, 'Calcule quanto você gastou de deslocamento essa semana', 'Combustível, transporte, tempo perdido no trânsito. Esse número vai te surpreender.'),
(1, 7, 'Termine seu Diagnóstico Financeiro completo', 'Hoje é o dia de fechar a Semana 1 de vez e descobrir sua Meta Mínima — o número que você precisa faturar todo mês pra sobreviver e lucrar.');

-- ----------------------------------------------------------------------------
-- 5) Conteúdo — Semanas 2 a 12 (PLACEHOLDER até o Tiago enviar o definitivo;
--    substituição é só um UPDATE/DELETE+INSERT na tabela, sem código novo)
-- ----------------------------------------------------------------------------
insert into public.atividades_diarias (semana_numero, dia_da_semana, titulo, descricao) values
  (2, 1, 'Dica 1 da Semana 2', 'Some: tempo gasto (valor da sua hora) + material usado + deslocamento + margem de lucro.'),
  (2, 2, 'Missão da Semana 2', 'Recalcule o preço de pelo menos 3 serviços dessa semana.'),
  (2, 3, 'Missão extra da Semana 2', 'Aplique o novo preço já no seu próximo orçamento — não espere o mês virar.'),
  (2, 4, 'Objetivo da Semana 2', 'parar de cobrar no olho e saber seu preço real'),
  (2, 5, 'Checklist da Semana 2', 'Já apliquei o preço novo em pelo menos 1 orçamento real'),
  (2, 6, 'Dica 1 da Semana 2', 'Some: tempo gasto (valor da sua hora) + material usado + deslocamento + margem de lucro.'),
  (2, 7, 'Feche a Semana 2', 'Termine o preenchimento da Semana 2 na plataforma e conclua a semana. Já apliquei o preço novo em pelo menos 1 orçamento real'),
  (3, 1, 'Dica 1 da Semana 3', 'Pense em serviços complementares que você já sabe fazer e pode oferecer junto do serviço principal.'),
  (3, 2, 'Missão da Semana 3', 'Ofereça o complemento pros próximos 5 clientes que você atender essa semana.'),
  (3, 3, 'Começando na Semana 3', 'Começando agora: ainda sem clientes? Treine a oferta do complemento com quem você atender primeiro (amigos, vizinhos, um serviço-teste) — ou simule em voz alta até ficar natural.'),
  (3, 4, 'Missão extra da Semana 3', 'Anote quantos aceitaram.'),
  (3, 5, 'Objetivo da Semana 3', 'aumentar o quanto cada cliente já paga, sem precisar de cliente novo'),
  (3, 6, 'Checklist da Semana 3', 'Ofereci o complemento pra pelo menos 5 clientes de verdade'),
  (3, 7, 'Feche a Semana 3', 'Termine o preenchimento da Semana 3 na plataforma e conclua a semana. Ofereci o complemento pra pelo menos 5 clientes de verdade'),
  (4, 1, 'Dica 1 da Semana 4', 'Pegue sua meta mínima mensal (Semana 1) e divida por 4 semanas, depois por dias úteis.'),
  (4, 2, 'Missão da Semana 4', 'Vire a página e preencha seu primeiro Painel Mensal.'),
  (4, 3, 'Missão extra da Semana 4', 'Marque na agenda o mesmo dia, daqui a 30 dias, pra preencher o próximo.'),
  (4, 4, 'Objetivo da Semana 4', 'quebrar sua meta grande em algo que cabe no dia a dia'),
  (4, 5, 'Checklist da Semana 4', 'Minha meta semanal e diária estão anotadas em lugar visível'),
  (4, 6, 'Dica 1 da Semana 4', 'Pegue sua meta mínima mensal (Semana 1) e divida por 4 semanas, depois por dias úteis.'),
  (4, 7, 'Feche a Semana 4', 'Termine o preenchimento da Semana 4 na plataforma e conclua a semana. Minha meta semanal e diária estão anotadas em lugar visível'),
  (5, 1, 'Dica 1 da Semana 5', 'Pense em cada ponto de contato com o cliente e como você quer que ele aconteça.'),
  (5, 2, 'Dica 2 da Semana 5', 'Pense numa semana comum e estime quanto tempo você gasta em cada coisa. Não precisa ser exato.'),
  (5, 3, 'Missão da Semana 5', 'Escolha 1 dia essa semana e cronometre de verdade: quanto tempo foi execução, quanto foi deslocamento/espera.'),
  (5, 4, 'Objetivo da Semana 5', 'melhorar a experiência de quem te contrata e descobrir pra onde seu tempo está indo'),
  (5, 5, 'Checklist da Semana 5', 'Sei hoje, de verdade, quantas horas por semana são produtivas'),
  (5, 6, 'Dica 1 da Semana 5', 'Pense em cada ponto de contato com o cliente e como você quer que ele aconteça.'),
  (5, 7, 'Feche a Semana 5', 'Termine o preenchimento da Semana 5 na plataforma e conclua a semana. Sei hoje, de verdade, quantas horas por semana são produtivas'),
  (6, 1, 'Dica 1 da Semana 6', 'Escreva na ordem em que realmente acontece, do primeiro contato até o pagamento.'),
  (6, 2, 'Missão da Semana 6', 'Use esse processo, na íntegra, no seu próximo atendimento — sem pular nenhum passo.'),
  (6, 3, 'Começando na Semana 6', 'Começando agora: ainda sem atendimento marcado? Ensaie o processo do começo ao fim com um amigo (ou um atendimento-teste real), seguindo cada passo que você escreveu.'),
  (6, 4, 'Objetivo da Semana 6', 'documentar do seu jeito como você atende, do início ao pós-atendimento'),
  (6, 5, 'Checklist da Semana 6', 'Apliquei o processo completo em pelo menos 1 atendimento real'),
  (6, 6, 'Dica 1 da Semana 6', 'Escreva na ordem em que realmente acontece, do primeiro contato até o pagamento.'),
  (6, 7, 'Feche a Semana 6', 'Termine o preenchimento da Semana 6 na plataforma e conclua a semana. Apliquei o processo completo em pelo menos 1 atendimento real'),
  (7, 1, 'Dica 1 da Semana 7', 'Agrupe atendimentos da mesma região no mesmo dia, sempre que possível.'),
  (7, 2, 'Missão da Semana 7', 'Monte sua agenda da próxima semana por região antes de sair de casa na segunda-feira.'),
  (7, 3, 'Objetivo da Semana 7', 'organizar sua rota pra perder menos tempo e gastar menos combustível'),
  (7, 4, 'Checklist da Semana 7', 'Minha agenda da próxima semana já está organizada por região'),
  (7, 5, 'Dica 1 da Semana 7', 'Agrupe atendimentos da mesma região no mesmo dia, sempre que possível.'),
  (7, 6, 'Missão da Semana 7', 'Monte sua agenda da próxima semana por região antes de sair de casa na segunda-feira.'),
  (7, 7, 'Feche a Semana 7', 'Termine o preenchimento da Semana 7 na plataforma e conclua a semana. Minha agenda da próxima semana já está organizada por região'),
  (8, 1, 'Dica 1 da Semana 8', 'Defina uma mensagem curta pra cada momento da sequência de pós-venda.'),
  (8, 2, 'Missão da Semana 8', 'Aplique a sequência completa nos últimos 5 clientes que você já atendeu.'),
  (8, 3, 'Começando na Semana 8', 'Começando agora: ainda sem clientes atendidos? Programe o lembrete automático (ou anote no papel) para acionar cada mensagem nos prazos certos depois do seu primeiro atendimento — assim a sequência já nasce funcionando.'),
  (8, 4, 'Objetivo da Semana 8', 'continuar gerando resultado depois que o atendimento termina'),
  (8, 5, 'Checklist da Semana 8', 'Apliquei a sequência de pós-venda em pelo menos 5 clientes reais'),
  (8, 6, 'Dica 1 da Semana 8', 'Defina uma mensagem curta pra cada momento da sequência de pós-venda.'),
  (8, 7, 'Feche a Semana 8', 'Termine o preenchimento da Semana 8 na plataforma e conclua a semana. Apliquei a sequência de pós-venda em pelo menos 5 clientes reais'),
  (9, 1, 'Dica 1 da Semana 9', 'Canal é o caminho que o cliente usa pra te encontrar. Escolha no máximo 3.'),
  (9, 2, 'Missão da Semana 9', 'Publique ou divulgue seu trabalho pelo menos 3 vezes essa semana nos canais escolhidos.'),
  (9, 3, 'Missão extra da Semana 9', 'Peça indicação, de forma direta, a pelo menos 10 clientes.'),
  (9, 4, 'Objetivo da Semana 9', 'ter um processo ativo de atrair cliente novo, não depender só de sorte'),
  (9, 5, 'Checklist da Semana 9', 'Divulguei nos canais escolhidos e pedi indicação de verdade'),
  (9, 6, 'Dica 1 da Semana 9', 'Canal é o caminho que o cliente usa pra te encontrar. Escolha no máximo 3.'),
  (9, 7, 'Feche a Semana 9', 'Termine o preenchimento da Semana 9 na plataforma e conclua a semana. Divulguei nos canais escolhidos e pedi indicação de verdade'),
  (10, 1, 'Dica 1 da Semana 10', 'Liste os últimos orçamentos que você enviou e marque quais fecharam.'),
  (10, 2, 'Dica 2 da Semana 10', 'Formas simples de aumentar conversão: responder rápido (primeiras horas), explicar o valor do serviço e não só o preço, e fazer um follow-up educado depois de 2-3 dias sem resposta.'),
  (10, 3, 'Missão da Semana 10', 'Faça o follow-up de todos os orçamentos em aberto essa semana, sem exceção.'),
  (10, 4, 'Começando na Semana 10', 'Começando agora: ainda sem orçamentos em aberto? Escreva seu follow-up padrão, salve pronto para usar e envie para qualquer pessoa que você já mandou preço ou orçamento — mesmo sem resposta ainda.'),
  (10, 5, 'Objetivo da Semana 10', 'descobrir quantos orçamentos viram serviço fechado, e melhorar essa taxa'),
  (10, 6, 'Checklist da Semana 10', 'Fiz follow-up de 100% dos orçamentos em aberto'),
  (10, 7, 'Feche a Semana 10', 'Termine o preenchimento da Semana 10 na plataforma e conclua a semana. Fiz follow-up de 100% dos orçamentos em aberto'),
  (11, 1, 'Dica 1 da Semana 11', 'Autoridade não precisa virar um curso de marketing. Três passos simples já ajudam bastante.'),
  (11, 2, 'Missão da Semana 11', 'Cadastre ou atualize seu perfil no Google Meu Negócio.'),
  (11, 3, 'Missão extra da Semana 11', 'Peça avaliação a pelo menos 3 clientes satisfeitos recentes.'),
  (11, 4, 'Objetivo da Semana 11', 'medir seu negócio de verdade e ser mais lembrado na sua região'),
  (11, 5, 'Checklist da Semana 11', 'Completei as 3 missões de autoridade dessa semana'),
  (11, 6, 'Dica 1 da Semana 11', 'Autoridade não precisa virar um curso de marketing. Três passos simples já ajudam bastante.'),
  (11, 7, 'Feche a Semana 11', 'Termine o preenchimento da Semana 11 na plataforma e conclua a semana. Completei as 3 missões de autoridade dessa semana'),
  (12, 1, 'Missão da Semana 12', 'Escreva e assuma, com data, seu próximo objetivo de 90 dias — mesmo que seja só consolidar.'),
  (12, 2, 'Objetivo da Semana 12', 'decidir com clareza o que vem depois dos 90 dias'),
  (12, 3, 'Checklist da Semana 12', 'Tenho clareza do meu próximo passo e já marquei na agenda'),
  (12, 4, 'Missão da Semana 12', 'Escreva e assuma, com data, seu próximo objetivo de 90 dias — mesmo que seja só consolidar.'),
  (12, 5, 'Objetivo da Semana 12', 'decidir com clareza o que vem depois dos 90 dias'),
  (12, 6, 'Checklist da Semana 12', 'Tenho clareza do meu próximo passo e já marquei na agenda'),
  (12, 7, 'Feche a Semana 12', 'Termine o preenchimento da Semana 12 na plataforma e conclua a semana. Tenho clareza do meu próximo passo e já marquei na agenda');
