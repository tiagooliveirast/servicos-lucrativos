-- ============================================================
-- 0038 — Atividades diárias: conteúdo definitivo do Módulo 3
--
-- Substitui o conteúdo PLACEHOLDER das Semanas 9 a 12 por textos
-- definitivos do Tiago — fecha o plano completo: 84 atividades
-- (7 dias × 12 semanas) sem nenhum placeholder restante.
-- ============================================================

-- Semana 9 — Captação de Clientes
delete from atividades_diarias where semana_numero = 9;
insert into atividades_diarias (semana_numero, dia_da_semana, titulo, descricao) values
(9, 1, 'Liste de onde vieram seus últimos 5 clientes', 'Indicação? Rede social? Grupo de WhatsApp? Isso mostra o que já funciona pra você.'),
(9, 2, 'Escolha até 3 canais pra focar essas próximas semanas', 'Não precisa fazer de tudo — escolher pouco e fazer bem já muda o resultado.'),
(9, 3, 'Escreva sua frase de pedir indicação', 'Uma frase curta e natural, sem parecer forçado, pra usar com cliente satisfeito.'),
(9, 4, 'Divulgue seu trabalho em 1 dos canais escolhidos hoje', 'Um post, uma mensagem em grupo, o que fizer sentido pro canal escolhido.'),
(9, 5, 'Peça indicação a 3 clientes de forma direta hoje', 'Use a frase que você escreveu — direto é melhor que sugerido.'),
(9, 6, 'Divulgue de novo em outro canal escolhido', 'Repetição é o que constrói presença — 1 post só não sustenta captação.'),
(9, 7, 'Feche a semana com 3 divulgações e 10 pedidos de indicação', 'Essa é a missão principal — confira se bateu o número ao longo da semana.');

-- Semana 10 — Conversão de Orçamento
delete from atividades_diarias where semana_numero = 10;
insert into atividades_diarias (semana_numero, dia_da_semana, titulo, descricao) values
(10, 1, 'Liste os últimos 10 orçamentos que você enviou', 'Marque quais fecharam e quais não. Esse é o ponto de partida pra taxa de conversão.'),
(10, 2, 'Calcule sua taxa de conversão atual', 'Fechados ÷ enviados × 100. Esse número vai te acompanhar o resto da semana.'),
(10, 3, 'Escreva seu follow-up padrão pra orçamento sem resposta', 'Uma mensagem educada, sem soar insistente, pra depois de 2-3 dias sem retorno.'),
(10, 4, 'Faça follow-up de 1 orçamento parado hoje', 'Use a mensagem que você escreveu ontem — teste na prática.'),
(10, 5, 'Responda um orçamento novo em menos de 2 horas', 'Responder rápido é uma das formas mais simples de aumentar conversão.'),
(10, 6, 'Ao enviar o próximo orçamento, explique o valor, não só o preço', 'O que está incluso, por que aquele preço, o que o cliente ganha.'),
(10, 7, 'Faça follow-up de 100% dos orçamentos em aberto', 'Missão principal da semana — sem exceção, mesmo os que parecem perdidos.');

-- Semana 11 — Indicadores e Autoridade
delete from atividades_diarias where semana_numero = 11;
insert into atividades_diarias (semana_numero, dia_da_semana, titulo, descricao) values
(11, 1, 'Preencha quantos orçamentos você fez esse mês', 'Primeiro número do seu quadro completo de indicadores.'),
(11, 2, 'Preencha quantas vendas fechou e seu ticket médio', 'Dois números que já vêm de semanas anteriores — só organizar aqui.'),
(11, 3, 'Preencha lucro do mês e margem de lucro', 'Se não souber exato, estime — o objetivo é ter clareza, não perfeição.'),
(11, 4, 'Preencha clientes novos e clientes recuperados', 'Quantas pessoas voltaram a comprar com você depois de um tempo parado?'),
(11, 5, 'Cadastre ou atualize seu Google Meu Negócio', 'Uma das 3 missões de autoridade da semana — leva 10 minutos.'),
(11, 6, 'Peça avaliação a 3 clientes satisfeitos recentes', 'Avaliação no Google pesa muito pra quem está decidindo te contratar.'),
(11, 7, 'Tire foto de antes/depois no seu próximo serviço', 'Fecha as 3 missões de autoridade — e já vira material pra suas redes.');

-- Semana 12 — Escala e Fechamento
delete from atividades_diarias where semana_numero = 12;
insert into atividades_diarias (semana_numero, dia_da_semana, titulo, descricao) values
(12, 1, 'Releia o que você escreveu na Semana 1', 'Compare com onde você está hoje — a diferença já conta uma história.'),
(12, 2, 'Revise se você bateu sua meta mínima nos últimos 2 meses', 'Isso é um dos 3 critérios pra saber se está pronto pra formar equipe.'),
(12, 3, 'Revise se seu processo (POP) está pronto pra ensinar a outra pessoa', 'Um ajudante conseguiria seguir o que você escreveu na Semana 6?'),
(12, 4, 'Revise se você tem mais demanda do que consegue atender sozinho', 'Terceiro critério de prontidão pra escalar — seja honesto na resposta.'),
(12, 5, 'Escreva sua maior conquista nesses 90 dias', 'Com número, se possível. Esse registro vai valer muito daqui a um tempo.'),
(12, 6, 'Escreva o que ainda precisa melhorar', 'Não tem problema ter itens aqui — é sinal de que você está enxergando com clareza.'),
(12, 7, 'Escreva e assuma seu próximo objetivo de 90 dias', 'Missão final do plano — mesmo que seja só consolidar o que já está rodando.');
