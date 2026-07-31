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
2. Execute os arquivos `supabase/migrations/0001_inicial.sql` e depois
   `0002_radar_eventos.sql` no SQL Editor do projeto, **nesta ordem**.
3. Crie o arquivo `.env` a partir de `.env.example` com `VITE_SUPABASE_URL` e
   `VITE_SUPABASE_ANON_KEY`.
4. No Supabase: *Authentication > URL Configuration*, defina `Site URL` como
   `http://localhost:5173` (dev) / sua URL na Vercel (produção) e adicione a URL do
   callback `.../auth/callback`. Habilite confirmação de e-mail.
5. `npm install && npm run dev`

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

O acesso é manual: insira o e-mail do comprador na tabela `acessos`:

```sql
insert into acessos (email) values ('cliente@email.com');
```

Sem a linha em `acessos`, o usuário logado vê a tela "Acesso em análise".

## Scripts

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — typecheck + build de produção
- `npm run preview` — pré-visualizar o build

## Estrutura

```
supabase/migrations/   → SQL do banco (schema + RLS)
src/lib/conteudo.ts    → conteúdo das 12 semanas (fonte do curso)
src/lib/manual.tsx    → geração do Manual da Empresa em PDF
src/lib/regras-radar.ts→ motor das 8 regras do Radar da Empresa
src/hooks/useRadar.ts  → carrega dados e sincroniza eventos do Radar
src/components/RadarEmpresa.tsx → card de alertas do dashboard
src/pages/             → telas (auth, onboarding, dashboard, semana, painel, manual)
```

## Segurança

- RLS ativo em todas as tabelas, sempre filtrando por `auth.uid()` capturado no servidor.
- Nenhuma chave secreta no front-end.
- O campo `origem` em `indicadores_semana` já está preparado para a futura sincronização
  com o Refriclube (fora do escopo da Fase 1).
