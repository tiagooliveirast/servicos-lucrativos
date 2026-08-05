// ============================================================
// Serviços Lucrativos — Edge Function "cancelar-lembretes"
//
// Prompt #25: link de descadastro do e-mail de lembrete semanal.
// Funciona SEM login — o link no e-mail aponta para a página
// pública /preferencias?user_id=...&token=..., que chama esta
// função para marcar receber_lembretes = false.
//
// Segurança: o token é HMAC-SHA256(user_id, RESEND_API_KEY).
// Só quem gerou o e-mail (a função enviar-lembretes-semanais,
// que tem a mesma secret) consegue produzir um token válido.
// Sem token válido → 400/401 e nada é alterado.
//
// Deploy: supabase functions deploy cancelar-lembretes --no-verify-jwt
//         (pública de propósito: o aluno clica deslogado)
// Secret usada: RESEND_API_KEY (mesma do envio)
// ============================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";

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
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    ...(permitida ? { "Access-Control-Allow-Origin": permitida } : {}),
  };
}

async function gerarToken(userId: string): Promise<string> {
  const chave = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(RESEND_API_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const assinatura = await crypto.subtle.sign("HMAC", chave, new TextEncoder().encode(userId));
  return Array.from(new Uint8Array(assinatura), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function tokenValido(userId: string, token: string): Promise<boolean> {
  if (!userId || !token) return false;
  const esperado = await gerarToken(userId);
  if (esperado.length !== token.length) return false;
  let diferenca = 0;
  for (let i = 0; i < esperado.length; i++) {
    diferenca |= esperado.charCodeAt(i) ^ token.charCodeAt(i);
  }
  return diferenca === 0;
}

function ehUuid(valor: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor);
}

Deno.serve(async (req) => {
  const headers = cabecalhos(req.headers.get("Origin"));
  const responder = (status: number, corpo: Record<string, unknown>) =>
    new Response(JSON.stringify(corpo), { status, headers });

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }
  if (req.method !== "GET" && req.method !== "POST") {
    return responder(405, { erro: "Método não permitido." });
  }
  if (!RESEND_API_KEY) {
    return responder(500, { erro: "RESEND_API_KEY não configurada." });
  }

  const url = new URL(req.url);
  let userId = (url.searchParams.get("user_id") ?? "").trim();
  let token = (url.searchParams.get("token") ?? "").trim();

  // Aceita também os parâmetros no corpo JSON (GET direto no link usa a
  // query string; o frontend chama via POST com body).
  if ((!userId || !token) && req.method === "POST") {
    try {
      const corpo = await req.json();
      userId = userId || String(corpo?.user_id ?? "").trim();
      token = token || String(corpo?.token ?? "").trim();
    } catch {
      // corpo ausente/inválido: continua com a query string
    }
  }

  if (!ehUuid(userId)) {
    return responder(400, { erro: "Link inválido." });
  }
  if (!(await tokenValido(userId, token))) {
    return responder(401, { erro: "Link inválido ou expirado." });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { error } = await admin
    .from("perfis")
    .update({ receber_lembretes: false })
    .eq("id", userId);

  if (error) {
    console.error("cancelar-lembretes:", error);
    return responder(500, { erro: "Não foi possível cancelar agora. Tente novamente." });
  }

  return responder(200, { ok: true, lembretes: false });
});
