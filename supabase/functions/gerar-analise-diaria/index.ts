// ============================================================
// Serviços Lucrativos — Edge Function "gerar-analise-diaria"
//
// Nível 1 da visão de IA: um único parágrafo diário que REESCREVE
// em linguagem natural o que o motor de regras já calculou
// (IME, IE, Radar, missão do dia, próxima chave). A IA não toma
// nenhuma decisão nova: o system prompt proíbe inventar números,
// sugerir ações fora dos dados ou mencionar escopo não informado.
//
// Regras de custo:
//   * cache: se já existe linha (user_id, data = hoje) em
//     analises_ia_diarias, devolve o texto salvo SEM chamar a
//     OpenAI (no máximo 1 chamada por usuário por dia);
//   * teto: se o total de linhas de hoje alcançou
//     LIMITE_ANALISES_DIARIAS_TOTAL (default 50), para de chamar
//     a OpenAI e cai no fallback estático do Radar.
//   * fallback: qualquer falha da OpenAI (timeout, chave inválida,
//     erro de API) devolve o texto estático do Radar — a
//     plataforma segue 100% funcional sem IA.
//
// Auth: user_id vem do JWT do usuário autenticado (Authorization
// header). NUNCA do body do cliente.
//
// Deploy (uma vez):  supabase functions deploy gerar-analise-diaria
// Secrets:           supabase secrets set OPENAI_API_KEY=...
//                    supabase secrets set LIMITE_ANALISES_DIARIAS_TOTAL=50
// ============================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const LIMITE_ANALISES_DIARIAS_TOTAL = Number(
  Deno.env.get("LIMITE_ANALISES_DIARIAS_TOTAL") ?? "50"
) || 50;
const MODELO_IA = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";
const TEMPO_ESPERA_OPENAI_MS = 20000;

// Origens autorizadas (CORS restrito — nada de "*"):
// produção (Vercel) + dev local (porta padrão do Vite).
const ORIGENS_PERMITIDAS = [
  "https://servicos-lucrativos.vercel.app",
  "http://localhost:5173",
];

function cabecalhos(origem: string | null): Record<string, string> {
  const permitida = origem !== null && ORIGENS_PERMITIDAS.includes(origem) ? origem : "";
  return {
    "Content-Type": "application/json",
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    ...(permitida ? { "Access-Control-Allow-Origin": permitida } : {}),
  };
}

const PROMPT_SISTEMA = [
  "Você é o mentor da plataforma 'Serviços Lucrativos'. Você escreve para o dono de uma pequena empresa que está implantando um plano de gestão de 90 dias.",
  "",
  "Regras OBRIGATÓRIAS:",
  "- Escreva UM parágrafo curto, de 3 a 5 frases, em português do Brasil.",
  "- Tom direto, motivador e de aconselhamento, sem enrolação.",
  "- Use SOMENTE os dados fornecidos em <dados></dados>. Não invente números, não cite valores que não estejam aí, não sugira ações que não estejam nos campos missao_do_dia ou recomendacao_radar, não mencione nada fora do escopo informado.",
  "- Se um dado estiver ausente (null), não o invente e não o mencione.",
  "- Não use emojis, não use markdown, não use cabeçalhos, não assine a mensagem.",
].join("\n");

function dataHojeUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function textoEstatico(
  radar: { categoria: string; mensagem: string; missao_sugerida: string | null } | null,
  missaoDoDia: { descricao: string } | null
): string {
  if (radar?.mensagem) {
    const base = `Conforme o seu Radar de hoje: ${radar.mensagem}`;
    return radar.missao_sugerida
      ? `${base}\n\nFoco de hoje: ${radar.missao_sugerida}`
      : base;
  }
  if (missaoDoDia?.descricao) {
    return `Hoje, mantenha o foco na missão: ${missaoDoDia.descricao}`;
  }
  return "Você está em dia com a sua implantação. Mantenha o ritmo da semana atual e continue os 90 dias.";
}

async function chamarOpenAI(payload: unknown): Promise<string> {
  const resposta = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODELO_IA,
      messages: [
        { role: "system", content: PROMPT_SISTEMA },
        { role: "user", content: `<dados>\n${JSON.stringify(payload, null, 2)}\n</dados>` },
      ],
      max_tokens: 300,
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(TEMPO_ESPERA_OPENAI_MS),
  });

  if (!resposta.ok) {
    const detalhe = await resposta.text();
    throw new Error(`OpenAI ${resposta.status}: ${detalhe.slice(0, 200)}`);
  }

  const json = await resposta.json();
  const texto: unknown = json?.choices?.[0]?.message?.content;
  if (typeof texto !== "string" || texto.trim() === "") {
    throw new Error("OpenAI retornou conteúdo vazio");
  }
  return texto.trim();
}

Deno.serve(async (req) => {
  const headers = cabecalhos(req.headers.get("Origin"));
  const responder = (status: number, corpo: Record<string, unknown>) =>
    new Response(JSON.stringify(corpo), { status, headers });

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }
  if (req.method !== "POST") {
    return responder(405, { erro: "Método não permitido." });
  }

  try {
    // ---- 1) Quem está chamando? user_id SEMPRE do JWT, nunca do body ----
    const autorizacao = req.headers.get("Authorization") ?? "";
    const clienteUsuario = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: autorizacao } },
    });
    const { data: sessao, error: erroSessao } = await clienteUsuario.auth.getUser();
    if (erroSessao || !sessao.user) {
      return responder(401, { erro: "Não autenticado. Faça login primeiro." });
    }
    const userId = sessao.user.id;
    const hoje = dataHojeUtc();

    // Cliente admin (service role): ignora RLS para ler/gravar.
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // ---- 2) Cache do dia: se já gerou hoje, devolve sem chamar a OpenAI ----
    const { data: cache } = await admin
      .from("analises_ia_diarias")
      .select("texto, modelo")
      .eq("user_id", userId)
      .eq("data", hoje)
      .maybeSingle();
    if (cache && typeof cache.texto === "string" && cache.texto.trim() !== "") {
      return responder(200, { texto: cache.texto, origem: "cache", modelo: cache.modelo });
    }

    // ---- 3) Teto de orçamento do dia ----
    const { count } = await admin
      .from("analises_ia_diarias")
      .select("id", { count: "exact", head: true })
      .eq("data", hoje);
    const atingiuTeto = (count ?? 0) >= LIMITE_ANALISES_DIARIAS_TOTAL;

    // ---- 4) Dados estruturados já existentes (motor de regras) ----
    const [resIme, resIe, resRadar, resSemanas, resMissoes, resChaves, resChavesUsuario, resFaturamento] =
      await Promise.all([
        admin
          .from("ime_historico")
          .select("score_total")
          .eq("user_id", userId)
          .order("data_calculo", { ascending: false })
          .limit(1)
          .maybeSingle(),
        admin
          .from("ie_historico")
          .select("score_total")
          .eq("user_id", userId)
          .order("data_calculo", { ascending: false })
          .limit(1)
          .maybeSingle(),
        admin
          .from("radar_eventos")
          .select("categoria, mensagem, missao_sugerida")
          .eq("user_id", userId)
          .eq("resolvido", false)
          .order("criado_em", { ascending: false })
          .limit(1)
          .maybeSingle(),
        admin
          .from("progresso_semanas")
          .select("semana, status")
          .eq("user_id", userId),
        admin
          .from("missoes")
          .select("semana, tipo, indice, descricao, concluida")
          .eq("user_id", userId),
        admin.from("chaves").select("id, titulo, ordem, ime_minimo, ie_minimo, faturamento_minimo").order("ordem"),
        admin
          .from("chaves_usuario")
          .select("chave_id")
          .eq("user_id", userId),
        admin
          .from("faturamento_validado")
          .select("valor")
          .eq("user_id", userId)
          .order("data_referencia", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    const imeAtual =
      resIme.data && typeof resIme.data.score_total === "number" ? resIme.data.score_total : null;
    const ieAtual =
      resIe.data && typeof resIe.data.score_total === "number" ? resIe.data.score_total : null;

    const radar =
      resRadar.data && typeof resRadar.data.mensagem === "string"
        ? {
            categoria: String(resRadar.data.categoria),
            mensagem: resRadar.data.mensagem,
            missao_sugerida: typeof resRadar.data.missao_sugerida === "string"
              ? resRadar.data.missao_sugerida
              : null,
          }
        : null;

    // Semana atual = maior semana concluída + 1, cap 12 (mesmo cálculo do app)
    const semanas = (resSemanas.data ?? []) as { semana: number; status: string }[];
    const concluidas = semanas.filter((s) => s.status === "concluida").map((s) => s.semana);
    const semanaAtual = Math.min((concluidas.length > 0 ? Math.max(...concluidas) : 0) + 1, 12);

    // Missão do dia: primeira pendente da semana atual (principal antes de rápida)
    const missoes = (resMissoes.data ?? []) as {
      semana: number;
      tipo: string;
      indice: number;
      descricao: string;
      concluida: boolean;
    }[];
    const pendentes = missoes
      .filter((m) => m.semana === semanaAtual && !m.concluida)
      .sort((a, b) => (a.tipo === "principal" ? 0 : 1) - (b.tipo === "principal" ? 0 : 1) || a.indice - b.indice);
    const missaoDoDia = pendentes[0] ?? null;

    // Próxima chave + progresso dos pilares (só status, sem valores sensíveis)
    const chaves = (resChaves.data ?? []) as {
      id: string;
      titulo: string;
      ordem: number;
      ime_minimo: number;
      ie_minimo: number;
      faturamento_minimo: number;
    }[];
    const desbloqueadas = new Set(
      ((resChavesUsuario.data ?? []) as { chave_id: string }[]).map((c) => c.chave_id)
    );
    const proximaChave = chaves.find((c) => !desbloqueadas.has(c.id)) ?? null;
    const faturamentoValidadoAtual =
      resFaturamento.data && typeof resFaturamento.data.valor === "number"
        ? resFaturamento.data.valor
        : null;
    const progressoChave = proximaChave
      ? {
          titulo: proximaChave.titulo,
          ordem: proximaChave.ordem,
          pilar_ime_ok: imeAtual !== null && imeAtual >= Number(proximaChave.ime_minimo),
          pilar_ie_ok: ieAtual !== null && ieAtual >= Number(proximaChave.ie_minimo),
          pilar_faturamento_ok:
            faturamentoValidadoAtual !== null &&
            faturamentoValidadoAtual >= Number(proximaChave.faturamento_minimo),
        }
      : null;

    const textoFallback = textoEstatico(radar, missaoDoDia);

    // ---- 5) Teto atingido: fallback estático, sem chamar a OpenAI ----
    if (atingiuTeto) {
      return responder(200, { texto: textoFallback, origem: "fallback", motivo: "limite" });
    }

    // ---- 6) Gerar com a OpenAI (apenas reescrever os fatos acima) ----
    let textoGerado: string;
    try {
      if (!OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY não configurada");
      }
      textoGerado = await chamarOpenAI({
        ime_atual: imeAtual,
        ie_atual: ieAtual,
        semana_atual: semanaAtual,
        recomendacao_radar: radar,
        missao_do_dia: missaoDoDia ? missaoDoDia.descricao : null,
        proxima_chave: progressoChave,
      });
    } catch (erro) {
      console.error("gerar-analise-diaria: falha na OpenAI, usando fallback", erro);
      return responder(200, { texto: textoFallback, origem: "fallback" });
    }

    // ---- 7) Salvar no cache do dia (service role; unique user+data protege corrida) ----
    await admin
      .from("analises_ia_diarias")
      .upsert(
        { user_id: userId, data: hoje, texto: textoGerado, modelo: MODELO_IA },
        { onConflict: "user_id,data", ignoreDuplicates: true }
      );

    return responder(200, { texto: textoGerado, origem: "ia", modelo: MODELO_IA });
  } catch (erro) {
    console.error("gerar-analise-diaria:", erro);
    return responder(500, { erro: "Erro interno ao gerar a análise. Tente novamente." });
  }
});
