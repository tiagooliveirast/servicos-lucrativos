// ============================================================
// Serviços Lucrativos — Edge Function "gerar-dica-semana"
//
// Prompt #22: dica personalizada de preenchimento da semana,
// gerada SOB DEMANDA (o aluno clica em "Gerar dica").
//
// A função recebe do frontend o conteúdo estático da semana
// (conteudo.ts é a fonte única — não duplicamos conteúdo no
// servidor) e busca no banco o contexto do aluno:
//   * diagnostico_inicial.area_atuacao (ramo de atuação) —
//     se preenchido, a IA adapta exemplos; se ausente, fica
//     genérica (nunca presume o ramo);
//   * diagnostico_inicial.tempo_mercado — contexto geral;
//   * respostas de progresso_semanas da semana — apenas os
//     RÓTULOS dos campos que o aluno JÁ preencheu (para a IA
//     não repetir o que ele sabe). Os VALORES digitados (valores
//     financeiros, preços, metas) NUNCA saem do banco (auditoria
//     item 13: minimizar dados enviados à OpenAI).
//
// Regras de custo:
//   * sem geração automática: só roda quando o usuário pede;
//   * upsert em dicas_preenchimento_semana com unique(user_id,
//     semana_numero) — "Atualizar dica" sobrescreve a linha;
//   * escrita somente via service role; leitura via RLS.
//
// Auth: user_id vem do JWT (Authorization header). NUNCA do body.
//
// Deploy:        supabase functions deploy gerar-dica-semana
// Secret usada:  OPENAI_API_KEY (já configurada)
// ============================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
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
  "Você é o mentor da plataforma 'Serviços Lucrativos'. Você ajuda o dono de um negócio de serviços a preencher corretamente os campos de uma semana do seu plano de implantação de 90 dias.",
  "",
  "Regras OBRIGATÓRIAS:",
  "- Escreva UM parágrafo curto, de 3 a 6 frases, em português do Brasil.",
  "- Tom direto, prático e de aconselhamento, sem enrolação.",
  "- Explique COMO preencher cada campo pedido e o que aquele dado vai viabilizar na gestão do negócio.",
  "- Contexto do aluno vem em <dados>. Se area_atuacao estiver preenchido, adapte os exemplos ao ramo; se estiver ausente, seja genérico e NUNCA presuma o ramo do negócio.",
  "- Não invente números, valores, faturamento ou metas que não estejam em <dados>.",
  "- Se o aluno já preencheu algum campo (lista preenchidos), não repita instruções sobre ele.",
  "- Não use emojis, não use markdown, não use cabeçalhos, não assine a mensagem.",
].join("\n");

function textoLimpo(valor: unknown, limite = 500): string | null {
  if (typeof valor !== "string") return null;
  const t = valor.trim().slice(0, limite);
  return t === "" ? null : t;
}

function textoLimpoOuPadrao(valor: unknown, padrao: string, limite = 500): string {
  return textoLimpo(valor, limite) ?? padrao;
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

    // Cliente admin (service role): ignora RLS para ler/gravar.
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // ---- 2) Validar body: semana_numero + conteúdo estático da semana ----
    let corpo: Record<string, unknown>;
    try {
      corpo = await req.json();
    } catch {
      return responder(400, { erro: "Corpo JSON inválido." });
    }

    const semanaNumero = Number(corpo.semana_numero);
    if (!Number.isInteger(semanaNumero) || semanaNumero < 1 || semanaNumero > 12) {
      return responder(400, { erro: "semana_numero deve ser um inteiro entre 1 e 12." });
    }

    const semanaRecebida =
      corpo.semana && typeof corpo.semana === "object" ? (corpo.semana as Record<string, unknown>) : {};
    const tituloSemana = textoLimpoOuPadrao(semanaRecebida.titulo, `Semana ${semanaNumero}`);
    const objetivoSemana = textoLimpoOuPadrao(semanaRecebida.objetivo, "", 1000);

    const explicacao = Array.isArray(semanaRecebida.explicacao)
      ? (semanaRecebida.explicacao as unknown[])
          .map((e) => textoLimpo(e, 1000))
          .filter((e): e is string => e !== null)
          .slice(0, 10)
      : [];

    const dicas = Array.isArray(semanaRecebida.dicas)
      ? (semanaRecebida.dicas as unknown[]).slice(0, 8).map((d) => {
          const item = d && typeof d === "object" ? (d as Record<string, unknown>) : {};
          return {
            titulo: textoLimpoOuPadrao(item.titulo, "Dica"),
            texto: textoLimpo(item.texto, 1000),
          };
        })
      : [];

    const campos = Array.isArray(semanaRecebida.campos)
      ? (semanaRecebida.campos as unknown[]).slice(0, 30).map((c) => {
          const campo = c && typeof c === "object" ? (c as Record<string, unknown>) : {};
          return {
            rotulo: textoLimpoOuPadrao(campo.rotulo, "campo"),
            tipo: textoLimpoOuPadrao(campo.tipo, "texto", 30),
            obrigatorio: Boolean(campo.obrigatorio),
            dica: textoLimpo(campo.dica, 500),
            exemplo: textoLimpo(campo.exemplo, 300),
          };
        })
      : [];

    if (campos.length === 0) {
      return responder(400, { erro: "A semana informada não tem campos para dar dicas." });
    }

    // ---- 3) Contexto do aluno (service role): SOMENTE o mínimo para a
    // dica — ramo, tempo de mercado e quais campos já foram preenchidos
    // (rótulos). Nenhum valor financeiro/numérico sensível vai à OpenAI.
    const [resDiagnostico, resProgresso] = await Promise.all([
      admin
        .from("diagnostico_inicial")
        .select("area_atuacao, tempo_mercado")
        .eq("user_id", userId)
        .maybeSingle(),
      admin
        .from("progresso_semanas")
        .select("respostas")
        .eq("user_id", userId)
        .eq("semana", semanaNumero)
        .maybeSingle(),
    ]);

    const diagnostico = resDiagnostico.data ?? {};

    const areaAtuacao = textoLimpo(diagnostico.area_atuacao, 200);
    const tempoMercado = textoLimpo(diagnostico.tempo_mercado, 100);

    // Campos que o aluno já preencheu nesta semana — para a IA não
    // repetir instruções sobre o que ele já sabe. Só os RÓTULOS dos
    // campos vão no payload; os valores digitados ficam no banco.
    const respostas =
      resProgresso.data && typeof resProgresso.data.respostas === "object"
        ? (resProgresso.data.respostas as Record<string, unknown>)
        : {};
    const jaPreenchidos: string[] = [];
    for (const [chave, valor] of Object.entries(respostas)) {
      if (jaPreenchidos.length >= 25) break;
      if (valor === null || valor === undefined || valor === "") continue;
      if (typeof valor === "object") continue;
      jaPreenchidos.push(textoLimpoOuPadrao(chave, "campo", 100));
    }

    // ---- 4) Gerar com a OpenAI (sob demanda; sem cache prévio) ----
    if (!OPENAI_API_KEY) {
      return responder(500, { erro: "OPENAI_API_KEY não configurada." });
    }

    let textoGerado: string;
    try {
      textoGerado = await chamarOpenAI({
        semana_numero: semanaNumero,
        semana_titulo: tituloSemana,
        semana_objetivo: objetivoSemana,
        explicacao: explicacao,
        dicas: dicas,
        campos: campos,
        aluno: {
          area_atuacao: areaAtuacao,
          tempo_mercado: tempoMercado,
        },
        campos_ja_preenchidos: jaPreenchidos,
      });
    } catch (erro) {
      console.error("gerar-dica-semana: falha na OpenAI", erro);
      return responder(502, {
        erro: "Não foi possível gerar a dica agora. Tente novamente em instantes.",
      });
    }

    // ---- 5) Salvar (upsert sobrescreve em "Atualizar dica") ----
    const { error: erroUpsert } = await admin.from("dicas_preenchimento_semana").upsert(
      {
        user_id: userId,
        semana_numero: semanaNumero,
        texto: textoGerado,
        modelo: MODELO_IA,
      },
      { onConflict: "user_id,semana_numero" }
    );
    if (erroUpsert) {
      console.error("gerar-dica-semana: falha ao salvar", erroUpsert);
      return responder(500, { erro: "Dica gerada, mas não foi possível salvar. Tente novamente." });
    }

    return responder(200, { texto: textoGerado, origem: "ia", modelo: MODELO_IA });
  } catch (erro) {
    console.error("gerar-dica-semana:", erro);
    return responder(500, { erro: "Erro interno ao gerar a dica. Tente novamente." });
  }
});
