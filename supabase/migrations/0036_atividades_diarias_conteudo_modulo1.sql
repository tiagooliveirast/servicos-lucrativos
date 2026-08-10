-- ============================================================
-- 0036 — Atividades diárias: conteúdo definitivo do Módulo 1
--
-- Substitui o conteúdo PLACEHOLDER (gerado a partir do conteudo.ts)
-- das Semanas 2 a 4 por textos definitivos do Tiago, no mesmo
-- ritmo da Semana 1: dia 7 sempre reforça o fechamento da semana.
--
-- Semanas 5 a 12 continuam com o placeholder — serão trocadas
-- quando o conteúdo definitivo chegar (mesmo padrão: DELETE +
-- INSERT por semana_numero).
-- ============================================================

-- Semana 2 — Precificação Corrigida
delete from atividades_diarias where semana_numero = 2;
insert into atividades_diarias (semana_numero, dia_da_semana, titulo, descricao) values
(2, 1, 'Escolha seus 3 principais serviços', 'Os que você mais faz ou os que mais pesam no seu faturamento. Vai ser neles que você vai recalcular o preço essa semana.'),
(2, 2, 'Cronometre o tempo real de 1 serviço', 'Da próxima vez que atender, marque quanto tempo levou de verdade — do início ao fim, sem arredondar pra baixo.'),
(2, 3, 'Some o custo de material de 1 serviço recente', 'Pegue o último atendimento que você fez e some quanto gastou em material. Muita gente subestima esse número.'),
(2, 4, 'Calcule sua hora de trabalho', 'Quanto você precisa ganhar por hora pra bater sua meta mínima (Semana 1)? Divida sua meta pelas horas produtivas que você tem no mês.'),
(2, 5, 'Recalcule o preço de 1 serviço agora', 'Tempo + material + deslocamento + margem. Não precisa ser perfeito, precisa ser real.'),
(2, 6, 'Compare o preço novo com o que você cobra hoje', 'A diferença te assustou? É normal. É exatamente esse gap que estava comendo seu lucro.'),
(2, 7, 'Aplique o preço novo no próximo orçamento', 'Não espere o mês virar. O primeiro orçamento que você fizer depois de hoje já sai com o preço certo.');

-- Semana 3 — Ticket Médio
delete from atividades_diarias where semana_numero = 3;
insert into atividades_diarias (semana_numero, dia_da_semana, titulo, descricao) values
(3, 1, 'Calcule seu ticket médio atual', 'Faturamento do último mês ÷ número de atendimentos. Esse é o número que você vai tentar aumentar essa semana.'),
(3, 2, 'Pense em 1 serviço complementar que você já sabe fazer', 'Algo que você poderia oferecer junto do seu serviço principal, sem precisar aprender nada novo.'),
(3, 3, 'Escreva como você vai oferecer esse complemento', 'Uma frase simples e natural — não precisa parecer venda, precisa parecer cuidado com o cliente.'),
(3, 4, 'Ofereça o complemento no seu próximo atendimento', 'Só oferecer já é a missão de hoje, independente do cliente aceitar ou não.'),
(3, 5, 'Anote a reação do cliente', 'Aceitou? Recusou? Ficou em dúvida? Isso te ajuda a ajustar como você vai oferecer da próxima vez.'),
(3, 6, 'Pense em um segundo complemento possível', 'Diversificar o que você oferece aumenta a chance de algum cliente topar.'),
(3, 7, 'Feche a semana calculando quantos aceitaram', 'De todos que você ofereceu, quantos disseram sim? Esse número é o ponto de partida pra melhorar.');

-- Semana 4 — Metas e Painel Financeiro
delete from atividades_diarias where semana_numero = 4;
insert into atividades_diarias (semana_numero, dia_da_semana, titulo, descricao) values
(4, 1, 'Revise sua meta mínima da Semana 1', 'Ela ainda faz sentido? Seus custos mudaram desde então? Ajuste se precisar.'),
(4, 2, 'Divida sua meta mensal por 4 semanas', 'Quanto você precisa faturar por semana pra bater a meta do mês?'),
(4, 3, 'Divida sua meta semanal por dias úteis', 'Chegou no seu número por dia. Esse é o alvo que cabe numa segunda-feira comum.'),
(4, 4, 'Confira: você bateu a meta do dia hoje?', 'Não tem problema se não bateu — só o hábito de checar já muda o jogo.'),
(4, 5, 'Anote seu faturamento desta semana até agora', 'Está perto da meta semanal? Longe? Registrar é o primeiro passo pra corrigir.'),
(4, 6, 'Marque na agenda o dia do seu próximo Painel Mensal', 'Daqui a 30 dias, mesmo dia. Esse hábito é o que te dá visão de longo prazo.'),
(4, 7, 'Preencha seu primeiro Painel Mensal', 'Fim do Módulo 1! Pare 5 minutos e registre onde você está — é a foto que você vai comparar daqui a 30 dias.');
