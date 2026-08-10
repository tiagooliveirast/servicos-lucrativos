-- ============================================================
-- 0037 — Atividades diárias: conteúdo definitivo do Módulo 2
--
-- Substitui o conteúdo PLACEHOLDER das Semanas 5 a 8 por textos
-- definitivos do Tiago (mesmo padrão das semanas 1-4: dia 7
-- reforça o fechamento da semana).
--
-- Semanas 9 a 12 continuam com o placeholder — serão trocadas
-- quando o conteúdo definitivo chegar.
-- ============================================================

-- Semana 5 — Experiência do Cliente e Tempo Produtivo
delete from atividades_diarias where semana_numero = 5;
insert into atividades_diarias (semana_numero, dia_da_semana, titulo, descricao) values
(5, 1, 'Observe como você chega no cliente hoje', 'Pontualidade, apresentação, primeira impressão. Anote 1 coisa que você faz bem e 1 que pode melhorar.'),
(5, 2, 'Preste atenção em como você explica o problema pro cliente', 'Usa termo técnico difícil sem perceber? Simplifique na próxima explicação que der hoje.'),
(5, 3, 'Cronometre quanto tempo você passou dirigindo hoje', 'Sem julgar o número ainda, só registrar. Amanhã a gente olha o quadro completo.'),
(5, 4, 'Cronometre quanto tempo você passou esperando cliente', 'Esperar em local errado, esperar confirmação, esperar acesso ao local. Some tudo.'),
(5, 5, 'Cronometre quanto tempo você gastou fazendo orçamento', 'Da conversa até o número fechado. Esse tempo também é custo, mesmo sem parecer.'),
(5, 6, 'Escolha 1 dia essa semana pra cronometrar tudo de verdade', 'Marque exatamente quanto foi execução vs. deslocamento/espera — é a missão principal da semana.'),
(5, 7, 'Registre o que descobriu cronometrando seu dia', 'Quantas horas por semana são realmente produtivas? Esse número vai guiar suas próximas decisões.');

-- Semana 6 — Processo Completo (POP)
delete from atividades_diarias where semana_numero = 6;
insert into atividades_diarias (semana_numero, dia_da_semana, titulo, descricao) values
(6, 1, 'Anote como um atendimento seu começa de verdade', 'Do primeiro contato do cliente até você confirmar o horário — escreva exatamente como acontece hoje.'),
(6, 2, 'Anote o que você faz assim que chega no local', 'Apresentação, diagnóstico, primeira conversa. Isso vira o Passo 2 do seu POP.'),
(6, 3, 'Anote como você explica problema e preço pro cliente', 'Essa é geralmente a parte mais improvisada — hoje é o dia de deixar isso mais claro no papel.'),
(6, 4, 'Anote como você executa e confere o serviço', 'O que você sempre checa antes de dar por encerrado? Coloque no papel, mesmo que pareça óbvio.'),
(6, 5, 'Anote como você cobra e encerra o atendimento', 'Da cobrança ao agradecimento — como isso acontece hoje, de verdade?'),
(6, 6, 'Escreva os 6 passos do seu processo completo na plataforma', 'Junte tudo que você anotou essa semana — esse é o seu POP.'),
(6, 7, 'Use o processo completo no seu próximo atendimento', 'Sem pular nenhum passo, mesmo que pareça mais devagar hoje. Esse é o teste real do que você documentou.');

-- Semana 7 — Agenda Inteligente
delete from atividades_diarias where semana_numero = 7;
insert into atividades_diarias (semana_numero, dia_da_semana, titulo, descricao) values
(7, 1, 'Olhe sua agenda da semana passada', 'Quantas vezes você cruzou a cidade inteira no mesmo dia sem precisar?'),
(7, 2, 'Liste as regiões/bairros que você mais atende', 'Isso vai virar a base pra organizar sua próxima semana por região.'),
(7, 3, 'Agrupe os atendimentos já marcados por região', 'Dá pra juntar 2 atendimentos da mesma área no mesmo dia?'),
(7, 4, 'Calcule quanto tempo de deslocamento você economizaria', 'Compare a agenda de hoje (bagunçada) com uma agenda organizada por região.'),
(7, 5, 'Organize a segunda e a terça da próxima semana por região', 'Comece pelos 2 primeiros dias — o resto vem nos próximos dias.'),
(7, 6, 'Termine de organizar a semana inteira por região', 'Quarta, quinta e sexta — feche o planejamento completo.'),
(7, 7, 'Monte sua agenda da próxima semana antes de sair de casa segunda-feira', 'Essa é a missão principal — a agenda pronta antes de o dia começar.');

-- Semana 8 — Pós-venda
delete from atividades_diarias where semana_numero = 8;
insert into atividades_diarias (semana_numero, dia_da_semana, titulo, descricao) values
(8, 1, 'Pense em como avisar o cliente 24h depois do serviço', 'Uma mensagem curta perguntando se está tudo certo. Escreva um rascunho hoje.'),
(8, 2, 'Pense em como pedir avaliação 7 dias depois', 'Uma pesquisa rápida de satisfação — não precisa ser formal, precisa ser genuína.'),
(8, 3, 'Pense em como pedir indicação 30 dias depois', 'Cliente satisfeito geralmente indica se for perguntado no momento certo.'),
(8, 4, 'Pense em uma oferta ou lembrete pra 90 dias depois', 'Manutenção preventiva, novo serviço, o que fizer sentido pro seu ramo.'),
(8, 5, 'Escreva as 4 mensagens completas na plataforma', '24h, 7 dias, 30 dias e 90 dias — sua sequência de pós-venda fica pronta hoje.'),
(8, 6, 'Aplique a mensagem de 24h no seu atendimento mais recente', 'Teste a primeira mensagem da sequência ainda hoje, com um cliente de verdade.'),
(8, 7, 'Aplique a sequência completa nos últimos 5 clientes atendidos', 'Fim do Módulo 2! Essa é a missão principal — pode fazer aos poucos ao longo do dia.');
