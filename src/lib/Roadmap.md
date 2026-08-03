# Roadmap — Plataforma Serviços Lucrativos (Gestão Lucrativa)
### Da visão de RPG de implantação empresarial ao que já está no ar

**Princípio geral do roadmap:** tudo que dá pra resolver com regra determinística (se X então Y) vem antes. IA real (OpenAI/LLM) só entra na Onda 8, e só se, depois de rodar as ondas anteriores com os 3 parceiros de validação, ainda fizer falta. Isso evita custo variável e risco de alucinação enquanto a base de usuários é pequena, e evita reconstruir infraestrutura depois.

Cada onda assume que a anterior já está no ar. Não pule ondas — cada uma alimenta dados pra próxima.

---

## Onda 1 — Fundação de dados
**Status:** ⬜ Não iniciada

Sem gamificação ainda. Só estrutura de dados que todas as ondas seguintes vão consumir.

- [ ] Tabela `checkins_semanais` (faturamento, lucro, atendimentos, orçamentos enviados/fechados, avaliações, horas trabalhadas, maior dificuldade)
- [ ] Cálculo do IME (Índice de Maturidade Empresarial), 0–100, 8 pilares com pesos
- [ ] Histórico/série temporal — cada métrica relevante ganha snapshot por data, não só valor atual
- [ ] Tela simples mostrando o IME atual (sem estilo de jogo ainda, só o número e os 8 pilares)

**Entrega:** Prompt Antigravity #1 (em anexo separado)

---

## Onda 2 — Provar a transformação
**Status:** ⬜ Não iniciada

O "ouro" que a visão identificou: o material de marketing mais forte de toda a plataforma, sem precisar de IA.

- [ ] Gráficos de evolução (faturamento, lucro, ticket médio, conversão, IME) — Recharts
- [ ] Relatório Oficial de Implantação (PDF) — reaproveita a infra do `manual.tsx` (`@react-pdf/renderer`)
- [ ] Certificado de Implantação (PDF) — critério de emissão é regra fixa (ex: IME final ≥ X e todos os módulos concluídos), não IA
- [ ] Tela "Antes x Depois" da empresa (comparação visual dos números no diagnóstico inicial vs. atual)

---

## Onda 3 — Engajamento core (o "jogo", parte determinística)
**Status:** ⬜ Não iniciada

- [ ] XP, níveis, sequência de login (streak)
- [ ] Conquistas/badges (trigger determinístico: completou semana X → desbloqueia badge)
- [ ] Baús (mesma lógica de conquistas, com recompensa associada: template, cupom, aula bônus)
- [ ] **Sala de Guerra** — tela de agregação (missão do dia, indicador prioritário do Radar, dias consecutivos, % de implantação concluída, próxima conquista). 100% dados que já existem, sem IA nova.

---

## Onda 4 — Reconhecimento físico (chaves + escudos)
**Status:** ⬜ Não iniciada

- [ ] Chaves — regra: IME ou faturamento cruza um limiar → chave desbloqueada. Animação em frontend (Framer Motion/CSS)
- [ ] Escudos — variação visual acumulada conforme chave mais alta (tipo ranking)
- [ ] Botão "Solicitar Chave Física" → abre WhatsApp (`wa.me/5571993262999`) com mensagem pré-preenchida
- [ ] Hall da Fama / ranking por engajamento — **adiar até ter volume real de usuários** (não faz sentido com 3 parceiros)

---

## Onda 5 — Avatar + evolução visual da empresa
**Status:** ⬜ Não iniciada

Onda de design, não de lógica.

- [ ] Definir os 5 estágios visuais da empresa (garagem → oficina → loja → centro de operações → empresa profissional)
- [ ] Decidir produção de arte: gerar uma vez (Midjourney/DALL-E) ou contratar designer pontual — custo único, não recorrente
- [ ] Avatar do empresário com itens desbloqueáveis por marco (semana 4, semana 8, 90 dias)

---

## Onda 6 — Marketing e prova social
**Status:** ⬜ Não iniciada

- [ ] Página pública da empresa implantada (`/empresa/[slug]`)
- [ ] Compartilhar evolução (gera imagem antes/depois, client-side com `html-to-image` ou Canvas API)
- [ ] Benchmark de turma ("a média dos alunos aumenta faturamento em X%") — **só ativar com 15-20+ alunos completos na base**

---

## Onda 7 — Admin/CRM avançado
**Status:** ⬜ Não iniciada

- [ ] Central de dúvidas (categorias: Financeiro, Comercial, Plataforma, RefriClube, Conteúdo, Outro + resposta + notificação)
- [ ] Aprovação de missões que exigem envio de arquivo (tabela de preços, POP, foto da oficina) — primeiro uso de Supabase Storage no projeto
- [ ] CRM determinístico: risco de desistência (X dias sem login), evolução acelerada (IME subiu Y pontos em Z semanas), candidato a case
- [ ] Biblioteca de conteúdo editável pelo admin (novas aulas, templates, bônus sem precisar mexer no código)

---

## Onda 8 — IA real (OpenAI), por último e opcional
**Status:** ⬜ Não iniciada — decisão pendente

Única onda com custo variável recorrente e dependência de serviço externo. Recomendação: só avaliar depois de rodar a Onda 3 (Sala de Guerra com regras) com os 3 parceiros e ver se a experiência já é suficiente sem LLM.

- [ ] Nível 1 — Análise automática diária (a mais barata, começar por aqui se decidir avançar)
- [ ] Nível 2 — Mentor sob pergunta, com contexto da empresa
- [ ] Nível 3 — Gerador de documentos (POP, Manual, Plano Comercial) via IA
- [ ] Arquitetura: chave da OpenAI sempre em Edge Function/servidor, nunca no frontend

**Fora do roadmap por enquanto** (só fazem sentido com dezenas/centenas de usuários simultâneos): mercado entre usuários, desafios coletivos, eventos ao vivo, sistema de votação, loja de XP.

---

## Como usar este documento
Risque os itens conforme forem implementados e testados ao vivo (não só codados). Ao final de cada onda, é um bom momento pra parar e rodar com os 3 parceiros antes de avançar pra próxima — cada onda é validável sozinha.