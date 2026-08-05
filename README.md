# Serviços Lucrativos

Plataforma web do "Serviços Lucrativos: O Plano de 90 Dias" — as 12 semanas do plano em
formato guiado, com desbloqueio sequencial, gamificação completa (XP, níveis, streak,
conquistas e baús), IME (Índice de Maturidade Empresarial), Sala de Guerra, sistema de
Chaves (6 níveis), relatório/certificado de implantação em PDF e painel administrativo
com CRM determinístico.

## O que existe hoje

- **Auth + onboarding** — login/recuperação de senha, acesso liberado manualmente pelo
  admin, onboarding com diagnóstico inicial e captura do **motivo pessoal** do aluno
  (reapresentado em início de módulo, cerimônia de chave e retorno após ausência).
- **Jornada de 12 semanas / 3 módulos** — missões, indicadores semanais, check-in
  semanal, painéis mensais e desbloqueio sequencial (Semana N libera N+1).
- **IME (0-100)** — cálculo por 8 pilares com histórico, gráficos de evolução
  (faturamento, lucro, ticket médio, conversão) e página dedicada.
- **IE (Índice de Engajamento, 0-100)** — composto usado no gate das chaves.
- **Gamificação** — XP, nível, streak (dias consecutivos), conquistas, baús e
  celebração automática ao melhorar indicador (semana, check-in, painel mensal).
- **Sala de Guerra** — tela central pós-login: missão do dia, indicador prioritário,
  dias consecutivos, % de implantação e próxima conquista.
- **Sistema de Chaves v2** — 6 chaves (Branco, Alumínio, Vermelho, Azul, Cinza, Preto)
  desbloqueadas pelo gate de 4 pilares (faturamento + IME + missões obrigatórias + IE),
  com escudo e solicitação da versão física via WhatsApp.
- **Faturamento autodeclarado** — provisório e marcado como tal na UI. A integração real
  com o RefriClube está **adiada por decisão do Tiago** (não construída).
- **Avatares** — empresa em 5 estágios por faixa de IME + avatar do usuário com itens
  desbloqueáveis por conquista.
- **Documentos em PDF** — Relatório de Implantação e Certificado (elegibilidade por
  regra fixa), gerados no cliente com `@react-pdf/renderer`.
- **Página pública** — `/empresa/:slug` opcional, com controle granular de privacidade.
- **Compartilhamento** — imagem da evolução para redes sociais (client-side).
- **Admin (`/admin`)** — visão consolidada, central de dúvidas, aprovação de anexos
  (Storage privado), CRM determinístico (risco de desistência, evolução acelerada,
  candidatos a case) e lembrete manual via WhatsApp.
- **IA sob demanda** — dicas de preenchimento por semana (ativa, Edge Function). A
  análise diária existe (infra pronta) mas está **pausada por flag**.
- **Radar da Empresa** — motor determinístico de 8 regras com alertas vermelho/amarelo/
  verde e deduplicação de 24h (`src/lib/regras-radar.ts`).

### Fora do escopo atual

- Integração real com o RefriClube (adiada por decisão do Tiago).
- Ranking entre alunos (adiado até haver volume de usuários).
- IA como mentor sob pergunta e gerador de documentos via IA (Níveis 2 e 3 da visão
  original — não construídos).
- Templates/bônus reais dentro dos baús (a estrutura existe; o conteúdo real está
  pendente de decisão com o Tiago).

## Stack

- **Frontend:** React 18 + Vite 6 + TypeScript + Tailwind v4 + shadcn/ui (Radix) +
  react-router v7
- **Backend:** Supabase (Auth + Postgres com RLS + Storage privado)
- **Edge Functions:** Deno (TypeScript) — `criar-acesso`, `gerar-dica-semana`,
  `gerar-analise-diaria` (pausada), `enviar-lembretes-semanais`, `cancelar-lembretes`
- **Gráficos:** Recharts (páginas internas) / SVG leve (página pública)
- **PDF:** @react-pdf/renderer (client-side)
- **Imagem de compartilhamento:** html-to-image
- **Deploy:** Vercel (branch `main`)

## Rodando localmente

1. Crie um projeto **novo** no Supabase.
2. Aplique as migrations `supabase/migrations/` em ordem numérica (0001 → 0031) — ou, com
   o CLI: `supabase link --project-ref <ref>` e `supabase db push --linked`.
3. Publique as Edge Functions no Supabase (as que você for usar):

   ```
   supabase functions deploy criar-acesso
   supabase functions deploy gerar-dica-semana
   supabase functions deploy gerar-analise-diaria   # opcional (flag desligada)
   supabase functions deploy enviar-lembretes-semanais
   supabase functions deploy cancelar-lembretes
   ```

4. Crie o arquivo `.env` a partir de `.env.example` com `VITE_SUPABASE_URL` e
   `VITE_SUPABASE_ANON_KEY`.
5. No Supabase: *Authentication > URL Configuration*, defina `Site URL` como
   `http://localhost:5173` (dev) / sua URL na Vercel (produção) e adicione a URL de
   callback `.../auth/callback`. Habilite confirmação de e-mail.
6. `npm install && npm run dev`

## Variáveis de ambiente

| Variável | Onde | Finalidade |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | `.env` local + Vercel | URL do projeto (front-end) |
| `VITE_SUPABASE_ANON_KEY` | `.env` local + Vercel | Chave pública do front-end |
| `SUPABASE_SERVICE_ROLE_KEY` | Secrets das Edge Functions | Só no servidor (nunca no front/bundle) |
| `REFRICLUBE_SECRET_KEY` | Secrets das Edge Functions | Reservada p/ integração futura com o RefriClube (sem prefixo `VITE_` — nunca vai ao bundle) |

## Migrations e numeração

As migrations vão de `0001` até `0031`. A migration `0006` **nunca existiu** (gap
presente desde o início do projeto) — é conhecido e não foi corrigido de propósito;
veja o comentário no início de `0007_fix_policy_admin.sql`. Não renumerar migrations já
aplicadas: isso quebraria o histórico de `supabase_migrations.schema_migrations`.

## Estrutura

```
supabase/migrations/        → SQL do banco (schema + RLS), 0001–0031
supabase/functions/         → Edge Functions (criar-acesso, dicas, lembretes, análise IA)
src/
  components/               → UI reutilizável (Layout com navegação, CartaoCarregando,
  │                            CartaoErro, SemanaIndisponivel, RadarEmpresa, graficos…)
  hooks/                    → AuthContext (sessão+perfil+acesso em 1 round-trip), useEhAdmin
  lib/                      → lógica: conteudo.ts (12 semanas), gamificacao.ts, chaves.ts,
  │                            transformacao.ts, exportacao-pdf.ts, pdf-estilos.ts,
  │                            regras-radar.ts, utils.ts (erros amigáveis, formatadores), …
  pages/                    → telas (auth, onboarding, sala-de-guerra, dashboard, semana,
  │                            painel, ime, evolucao, relatorios, chaves, conquistas, bauis,
  │                            empresa, duvidas, manual, preferencias) + admin/
  main.tsx / App.tsx        → bootstrap e rotas
```

## Painel administrativo (`/admin`)

1. Crie a **sua** conta: *Authentication > Users > Add user* (e-mail + senha).
2. No SQL Editor, libere seu acesso e seu papel de admin (use o `id` do usuário criado):

```sql
insert into acessos (user_id) values ('uuid-do-seu-usuario');
insert into admins (user_id) values ('uuid-do-seu-usuario');
```

3. O link **Admin** aparece no topo do site. O que existe em `/admin`:
   - **Visão geral** — total de usuários, ativos nos últimos 7 dias, progresso médio,
     quem concluiu os 90 dias e o feed de atividade.
   - **Usuários** — lista com semana atual, % concluído e último acesso; o detalhe mostra
     diagnóstico, progresso, indicadores, painéis, IME e chaves (base para a garantia do curso).
   - **Novo acesso** — cria a conta do aluno na hora (Edge Function `criar-acesso`), com
     senha temporária para copiar e enviar.
   - **Aulas** — cadastra o link do YouTube de cada semana (`youtu.be`, `watch`, `/embed`,
     `/shorts`); sem link, o aluno vê "Aula em breve".
   - **Turma** — visão do CRM determinístico (risco de desistência, aceleração, cases) e
     lembrete manual via WhatsApp.
   - **Dúvidas** — central de dúvidas dos alunos (responder fecha e notifica no painel).
   - **Anexos** — aprovação/rejeição dos arquivos enviados nas missões (Storage privado).

## Acesso e recuperação de senha

- A liberação de acesso é manual: o caminho recomendado é `/admin/novo-acesso` (cria
  conta + senha temporária + perfil + libera). Sem linha em `acessos`, o usuário vê
  "Acesso em análise"; com `acessos.ativo = false`, vê "Acesso inativo".
- "Esqueci minha senha" usa o fluxo do Supabase (`resetPasswordForEmail`): o e-mail
  aponta para `/auth/callback`, que detecta a recuperação e leva a `/nova-senha`. A
  própria tela valida a sessão e mostra "Link inválido ou expirado" quando preciso.

## Segurança

- RLS ativo em todas as tabelas, sempre filtrando por `auth.uid()`.
- Admin lê dados de todos via políticas específicas; o aluno vê apenas os próprios dados.
- Nenhuma chave secreta no front-end (service role só existe nas Edge Functions).
- Página pública respeita o controle granular de privacidade do aluno.

## Scripts

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — typecheck (`tsc --noEmit`) + build de produção
- `npm run preview` — pré-visualizar o build
- `npm run typecheck` — apenas o typecheck

## Contato de suporte (rodapé)

O rodapé mostra o canal definido em `src/lib/contato.ts` (WhatsApp/e-mail). Preencha os
valores lá; deixe vazio para ocultar.
