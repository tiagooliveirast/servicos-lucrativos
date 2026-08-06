# Roadmap — Plataforma Serviços Lucrativos (Gestão Lucrativa)

> **Este documento é o changelog histórico do projeto.** Ele descreve a visão original
> (Ondas 1–8) e o que foi de fato construído até hoje. O roadmap "vivo" — decisões de
> prioridade do que vem a seguir — é mantido **fora do repositório** (pelo Tiago, com o
> Claude).
>
> Princípio que guiou (e continua guiando) as decisões: tudo que se resolve com regra
> determinística (se X então Y) vem antes. IA real (LLM) entra por último, e só se fizer
> falta — evita custo variável e risco de alucinação enquanto a base de usuários é pequena.

## Ondas originais e o que foi entregue

### Onda 1 — Fundação de dados ✅ entregue
- Tabela `checkins_semanais` (faturamento, lucro, atendimentos, orçamentos, avaliações, horas, maior dificuldade)
- Cálculo do IME (Índice de Maturidade Empresarial), 0–100, 8 pilares com pesos
- Histórico/série temporal das métricas (snapshot por data)
- Tela do IME (valor + pilares)

### Onda 2 — Provar a transformação ✅ entregue
- Gráficos de evolução (faturamento, lucro, ticket médio, conversão, IME) com Recharts
- Relatório de Implantação (PDF) e Certificado de Implantação (PDF, critério por regra fixa)
- A comparação "antes x depois" foi absorvida pela página de Evolução (que cruza o
  diagnóstico inicial com o estado atual)

### Onda 3 — Engajamento core (o "jogo" determinístico) ✅ entregue
- XP, níveis, sequência de login (streak)
- Conquistas/badges via triggers determinísticos
- Baús (estrutura completa; o conteúdo real dos templates/bônus está pendente de decisão com o Tiago)
- **Sala de Guerra** — tela central pós-login (missão do dia, indicador prioritário,
  dias consecutivos, % de implantação, próxima conquista)

### Onda 4 — Reconhecimento físico (chaves + escudos) ❌ descontinuado
- **Chaves v2** — 6 chaves (Branco, Alumínio, Vermelho, Azul, Cinza, Preto) com gate de
  4 pilares: faturamento + IME + missões obrigatórias + IE (Índice de Engajamento)
- Escudo acumulado conforme a chave mais alta
- "Solicitar Chave Física" abre o WhatsApp com mensagem pré-preenchida
- **Descontinuado por decisão do Tiago** (migration 0033): não fazia sentido num
  programa de 90 dias. O conceito passa a ser um recurso **planejado da Liga
  Refriclube** (produto separado, fora deste repositório). O IE continua calculado
  nos bastidores; Avatar/Estágio da Empresa (Onda 5) não usa chaves e não mudou.
- Ranking/hall da fama — **adiado** até haver volume real de usuários

### Onda 5 — Avatar + evolução visual da empresa ✅ entregue
- Empresa em 5 estágios visuais por faixa de IME
- Avatar do usuário com itens desbloqueáveis por conquista

### Onda 6 — Marketing e prova social ✅ entregue (parcial)
- Página pública da empresa (`/empresa/:slug`) com controle granular de privacidade
- Compartilhar evolução (imagem gerada no cliente, client-side)
- Benchmark de turma — **não construído** (aguarda 15–20+ alunos completos na base)

### Onda 7 — Admin/CRM avançado ✅ entregue
- Central de dúvidas (categorias + resposta + aviso no painel do aluno)
- Aprovação de anexos das missões (Supabase Storage privado)
- CRM determinístico: risco de desistência, evolução acelerada, candidatos a case
- Vídeo-aulas editáveis pelo admin (cadastro de link do YouTube por semana)
- Biblioteca de conteúdo editável mais ampla — **não construída**

### Onda 8 — IA real (OpenAI), por último e opcional ⏸️ parcial
- **Nível 1 (análise diária)** — infraestrutura construída e pronta (`gerar-analise-diaria`,
  `analises_ia_diarias`), mas **pausada por flag** até o Tiago decidir ativar o custo
- **IA sob demanda** — dicas de preenchimento por semana (`gerar-dica-semana`), **ativa**
- **Níveis 2 e 3** (mentor sob pergunta, gerador de documentos) — **não construídos**

## Adições posteriores às ondas

- **Radar da Empresa** — motor determinístico de 8 regras (vermelho/amarelo/verde) com
  deduplicação de 24h e sugestão de missão
- **Faturamento autodeclarado** — provisório (marcado como tal na UI); integração real
  com o RefriClube **adiada por decisão do Tiago**, não construída
- **Âncora de motivo pessoal** — capturada no onboarding e reexibida em início de
  módulo e retorno após ausência (a exibição na cerimônia de chave saiu junto com o
  sistema de Chaves)
- **Lembretes de inatividade** — agendamento semanal e cancelamento via Edge Functions
  (`enviar-lembretes-semanais`, `cancelar-lembretes`) + envio manual no admin
- **Celebração automática** ao melhorar indicador (semana, check-in, painel mensal)
- **Qualidade de base** — AuthContext global (1 round-trip), navegação persistente,
  tratamento de erro amigável, auditorias de segurança/performance (migrations
  0023–0031: correções críticas, índices, lacunas de permissão)

## Fora do escopo atual (decisões do Tiago)

- Sistema de **Chaves** (descontinuado nesta plataforma na migration 0033; conceito
  planejado para a **Liga Refriclube**, produto separado)
- Integração real com o RefriClube (adiada)
- Ranking entre alunos (adiado até volume de usuários)
- IA mentor sob pergunta e gerador de documentos via IA (Níveis 2 e 3)
- Templates/bônus reais nos baús (estrutura existe; conteúdo pendente de decisão)

## Nota técnica: numeração de migrations

As migrations vão de `0001` a `0033`. A `0006` **nunca existiu** (gap desde o início) e
não será renumerada — ver comentário em `0007_fix_policy_admin.sql`.
