// ============================================================
// Gestão Lucrativa — Edge Function "criar-acesso"
// Cria um aluno no Supabase Auth com senha temporária, grava o
// perfil (nome/telefone/e-mail) e libera o acesso na tabela acessos.
// Só quem está na tabela admins pode chamar.
//
// Deploy (uma vez):  supabase functions deploy criar-acesso
// (ou colar este arquivo no Dashboard > Edge Functions > Create)
// Variaveis de ambiente: SUPABASE_URL, SUPABASE_ANON_KEY e
// SUPABASE_SERVICE_ROLE_KEY (já existem automaticamente).
// ============================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CABECALHOS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Alfabeto sem caracteres ambíguos (0/O, 1/l/I), fácil de digitar/ditar
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

function gerarSenha(tamanho = 8): string {
  const valores = crypto.getRandomValues(new Uint32Array(tamanho));
  return Array.from(valores, (v) => ALFABETO[v % ALFABETO.length]).join("");
}

function responder(status: number, corpo: Record<string, unknown>) {
  return new Response(JSON.stringify(corpo), { status, headers: CABECALHOS });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 204, headers: CABECALHOS });
  }
  if (req.method !== "POST") {
    return responder(405, { erro: "Método não permitido." });
  }

  try {
    // ---- 1) Quem está chamando? Precisa ser um admin logado ----
    const autorizacao = req.headers.get("Authorization") ?? "";
    const clienteUsuario = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: autorizacao } },
    });
    const { data: sessao, error: erroSessao } = await clienteUsuario.auth.getUser();
    if (erroSessao || !sessao.user) {
      return responder(401, { erro: "Não autenticado. Faça login primeiro." });
    }
    const { data: admin } = await clienteUsuario
      .from("admins")
      .select("user_id")
      .eq("user_id", sessao.user.id)
      .maybeSingle();
    if (!admin) {
      return responder(403, { erro: "Só administradores podem criar acessos." });
    }

    // ---- 2) Validar os dados recebidos ----
    const corpo = await req.json();
    const nome = String(corpo?.nome ?? "").trim();
    const email = String(corpo?.email ?? "").trim().toLowerCase();
    const telefone = String(corpo?.telefone ?? "").trim() || null;
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!nome || !emailValido) {
      return responder(400, { erro: "Informe o nome e um e-mail válido." });
    }

    // ---- 3) Criar o usuário com senha temporária (service role) ----
    const senhaTemporaria = gerarSenha();
    const clienteAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: criado, error: erroCriar } = await clienteAdmin.auth.admin.createUser({
      email,
      password: senhaTemporaria,
      email_confirm: true, // o acesso entra sem depender de e-mail de confirmação
      user_metadata: { nome, telefone },
    });
    if (erroCriar) {
      const mensagem = erroCriar.message.includes("already registered")
        ? "Este e-mail já está cadastrado. Use outro ou reenvie o acesso desse aluno."
        : erroCriar.message.includes("Unable to validate email address")
          ? "E-mail inválido."
          : erroCriar.message;
      return responder(400, { erro: mensagem });
    }

    // ---- 4) Gravar perfil + liberar acesso ----
    const usuarioId = criado.user.id;
    const { error: erroPerfil } = await clienteAdmin
      .from("perfis")
      .update({ nome, telefone, email })
      .eq("id", usuarioId);
    if (erroPerfil) {
      console.error("criar-acesso: falha ao gravar perfil", erroPerfil.message);
      await clienteAdmin.auth.admin.deleteUser(usuarioId);
      return responder(500, { erro: "Erro ao gravar o perfil. Tente novamente." });
    }

    const { error: erroAcesso } = await clienteAdmin
      .from("acessos")
      .upsert({ user_id: usuarioId, email, ativo: true }, { onConflict: "user_id" });
    if (erroAcesso) {
      console.error("criar-acesso: falha ao liberar acesso", erroAcesso.message);
      await clienteAdmin.auth.admin.deleteUser(usuarioId);
      return responder(500, { erro: "Erro ao liberar o acesso. Tente novamente." });
    }

    return responder(200, {
      email,
      senhaTemporaria,
      nome,
      usuarioId,
    });
  } catch (erro) {
    console.error("criar-acesso:", erro);
    return responder(500, { erro: "Erro interno ao criar o acesso. Tente novamente." });
  }
});
