# Gestão Lucrativa

Plataforma web do "Serviços Lucrativos: O Plano de 90 Dias" — as 12 semanas do plano em
formato guiado, com progresso salvo, desbloqueio sequencial, 3 painéis mensais, exportação
do Manual da Empresa em PDF e o Radar da Empresa (alertas inteligentes e determinísticos).

## Stack

- Frontend: React + Vite + TypeScript + Tailwind v4 + shadcn/ui
- Backend: Supabase (Auth + Postgres com RLS)
- Deploy: Vercel (branch `main`)
- PDF: @react-pdf/renderer (client-side)

## Rodando localmente

1. Crie um projeto **novo** no Supabase.
2. Execute os arquivos `supabase/migrations/0001_inicial.sql`, `0002_radar_eventos.sql`,
   `0003_aulas_semana.sql`, `0004_admin_atividade.sql` e `0005_acessos_ativos.sql` no SQL
   Editor do projeto, **nesta ordem**.
3. Crie o arquivo `.env` a partir de `.env.example` com `VITE_SUPABASE_URL` e
   `VITE_SUPABASE_ANON_KEY`.
4. No Supabase: *Authentication > URL Configuration*, defina `Site URL` como
   `http://localhost:5173` (dev) / sua URL na Vercel (produção) e adicione a URL do
   callback `.../auth/callback`. Habilite confirmação de e-mail.
5. `npm install && npm run dev`

## Variáveis de ambiente

| Variável | Onde | Finalidade |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | `.env` local + Vercel | URL do projeto (front-end) |
| `VITE_SUPABASE_ANON_KEY` | `.env` local + Vercel | Chave pública do front-end |
| `SUPABASE_SERVICE_ROLE_KEY` | Secrets da Edge Function | Só no servidor (nunca no front/bundle) |
| `VITE_REFRICLUBE_SECRET_KEY` | `.env` local + Vercel | Reservada p/ integração futura com o Refriclube |

O deploy da branch `main` para produção está ativo na Vercel (mesmo padrão do Refriclube e
do Viga Gestão).

## Contato de suporte (rodapé)

O rodapé mostra o canal de suporte definido em `src/lib/contato.ts` (WhatsApp/e-mail do
Documento de Boas-vindas). Preencha os valores lá; deixe vazio para ocultar.

## Desativar acesso de um aluno

Na página `/admin/usuarios/{id}`, o botão "Desativar acesso" (com motivo) marca
`acessos.ativo = false`. O aluno perde o acesso na próxima carga, mas os dados ficam
preservados. O mesmo card permite reativar depois.

## Checklist de teste manual (antes de liberar para os 3 usuários)

O roteiro completo está no final deste arquivo, na seção "Checklist de teste manual".

## Painel administrativo (`/admin`)

Área exclusiva para o dono da plataforma. Para ativá-la:

1. Crie a **sua** conta: *Authentication > Users > Add user* (e-mail + senha).
2. No SQL Editor, libere seu acesso e seu papel de admin (use o `id` do usuário criado):

```sql
insert into acessos (email) values ('seu@email.com');
insert into admins (user_id) values ('uuid-do-seu-usuario');
```

3. Pronto: o link **Admin** aparece no topo do site. O que existe em `/admin`:
   - **Visão geral** — total de usuários, ativos nos últimos 7 dias, progresso médio,
     quem concluiu os 90 dias, e o feed de atividade (semanas concluídas, painéis
     preenchidos, alertas verdes do Radar, plano concluído).
   - **Usuários** — lista com semana atual, % concluído, último acesso e início; o detalhe
     de cada aluno mostra diagnóstico inicial, progresso semana a semana, indicadores,
     painéis mensais e alertas do Radar (serve de base para a garantia condicional do curso).
   - **Novo acesso** — cria a conta do aluno na hora, com senha temporária para você
     copiar e enviar por WhatsApp/e-mail.

O banco registra sozinho o feed de atividade via triggers (nada de premiação/gamificação
na tela do aluno nesta fase — o acompanhamento é seu, no admin).

### Edge Function `criar-acesso`

Usada pela tela "Novo acesso". Publicada no Supabase (uma vez):

```
supabase functions deploy criar-acesso
```

Ou cole `supabase/functions/criar-acesso/index.ts` no *Dashboard > Edge Functions*.
Ela usa a service role key (só no servidor), verifica que quem chama está em `admins` e
cria o usuário com `email_confirm: true` — nenhuma chave secreta vai ao front-end.

## Liberação de acesso (após compra na Hotmart)

O caminho recomendado é a tela **/admin/novo-acesso** (cria a conta + senha temporária +
perfil + libera o acesso). Manualmente, o equivalente é:

```sql
insert into acessos (user_id) values ('uuid-do-usuario-criado');
```

Sem a linha em `acessos` (ou sem conta criada), o usuário vê a tela "Acesso em análise".

## Recuperação de senha

O link "Esqueci minha senha" na tela de login usa o fluxo padrão do Supabase
(`resetPasswordForEmail`). O e-mail enviado aponta para `/auth/callback`, que detecta o
link de recuperação e leva o usuário à tela `/nova-senha` para definir a senha nova.

## Radar da Empresa

Módulo de alertas exibido no topo do dashboard. É 100% determinístico: um motor de 8
regras (`src/lib/regras-radar.ts`) roda no navegador a cada carga do dashboard e compara
os dados do usuário (semanas, indicadores, painéis, acesso) com as regras do curso —
**sem IA nem chamadas externas**.

- Alertas por categoria: **vermelho** (urgente) → **amarelo** (atenção) → **verde** (bom).
- Cada alerta pode sugerir uma missão (`missaoRecomendada` aparece no card do Radar).
- Eventos ficam em `radar_eventos` com deduplicação de 24h (o mesmo alerta não se repete
  no mesmo dia) e são marcados como `resolvido` quando a condição deixa de valer.
- Exemplos: preço desatualizado sem aplicação em orçamento, ticket médio parado, sem
  avaliações novas, conversão baixa, reserva pronta para contratar, usuário inativo,
  relatório mensal de evolução.

## Liberação de acesso (após compra na Hotmart)

O acesso é manual: o caminho recomendado é a tela **/admin/novo-acesso** (cria a conta +
senha temporária + perfil + libera o acesso). Sem a linha em `acessos`, o usuário logado
vê a tela "Acesso em análise".

## Checklist de teste manual (antes de liberar para os 3 usuários)

1. Como admin: criar um novo acesso de teste em `/admin/novo-acesso` e copiar a senha gerada.
2. Logar com essa conta nova → deve cair em `/onboarding` (primeira vez).
3. Preencher o onboarding → deve cair em `/dashboard`, com Semana 1 em andamento e
   Semanas 2–12 bloqueadas.
4. Abrir a Semana 1, ver o vídeo (ou "Aula em breve" se ainda não houver link), preencher
   os campos, marcar missões e o checklist, concluir → a Semana 2 deve desbloquear.
5. Verificar que o Radar da Empresa aparece no Dashboard (mesmo sem nenhum alerta ainda).
6. Avançar até a Semana 4 e preencher o Painel Mensal 1.
7. Como admin: abrir `/admin/usuarios/{id}` do usuário de teste e conferir que os dados
   batem com o que foi preenchido.
8. Desativar o acesso do usuário de teste (`ativo = false`) e confirmar que, ao logar de
   novo, aparece a tela de acesso inativo.
9. Repetir tudo no celular (a partir de 360px de largura), não só no computador.

## Scripts

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — typecheck + build de produção
- `npm run preview` — pré-visualizar o build

## Estrutura

```
supabase/migrations/      → SQL do banco (schema + RLS)
supabase/functions/       → Edge Functions (criar-acesso usa service role)
src/lib/conteudo.ts       → conteúdo das 12 semanas (fonte do curso)
src/lib/manual.tsx        → geração do Manual da Empresa em PDF
src/lib/regras-radar.ts   → motor das 8 regras do Radar da Empresa
src/hooks/useRadar.ts     → carrega dados e sincroniza eventos do Radar
src/components/RadarEmpresa.tsx → card de alertas do dashboard
src/components/ExigirAdmin.tsx → protege as rotas /admin/* no front
src/pages/                → telas (auth, onboarding, dashboard, semana, painel, manual)
src/pages/admin/          → painel administrativo (visão geral, usuários, novo acesso)
```

## Segurança

- RLS ativo em todas as tabelas, sempre filtrando por `auth.uid()` capturado no servidor.
- O admin lê os dados de todos (políticas extras por estar em `admins`), mas nunca edita
  pelo app; o aluno continua vendo apenas os próprios dados.
- Nenhuma chave secreta no front-end (a service role só existe na Edge Function).
- O campo `origem` em `indicadores_semana` já está preparado para a futura sincronização
  com o Refriclube (fora do escopo da Fase 1).
