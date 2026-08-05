// ============================================================
// Serviços Lucrativos — Edge Function "enviar-lembretes-semanais"
//
// Prompt #25: lembrete semanal automático por e-mail para alunos
// inativos, trazendo de volta antes que vire desistência.
//
// Fluxo:
//   1. Busca a base de inativos na view crm_risco_desistencia
//      (Onda 7 — ≥ 7 dias sem login; NÃO duplica essa lógica);
//   2. Filtra por opt-out (perfis.receber_lembretes = true) e por
//      "sem envio nos últimos 6 dias" (lembretes_enviados) — nunca
//      mais de 1 lembrete por semana por aluno;
//   3. Para cada aluno, acha a semana atual + missão pendente
//      (mesma lógica da Sala de Guerra) e monta o e-mail;
//   4. Envia via Resend (RESEND_API_KEY — configurada manualmente
//      pelo Tiago com `supabase secrets set`, nunca versionada);
//   5. Após sucesso, grava linha em lembretes_enviados.
//
// Degradação graciosa: falha em UM e-mail é logada e o job segue
// para o próximo aluno — uma falha individual não trava o lote.
//
// Auth: aceita SOMENTE JWT de service role (o cron envia a chave
// via app.settings.service_role_key). Qualquer outro JWT → 401.
//
// Deploy:        supabase functions deploy enviar-lembretes-semanais
// Secret usada:  RESEND_API_KEY
// ============================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://servicos-lucrativos.vercel.app";
const EMAIL_FROM =
  Deno.env.get("EMAIL_FROM") ?? "Serviços Lucrativos <nao-responder@servicoslucrativos.com.br>";

const TIPO_LEMBRETE = "inatividade_semanal";
const JANELA_ANTI_DUPLICADO_DIAS = 6;

const CABECALHOS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ------------------------------------------------------------------
// Missão "principal" (índice 0) de cada semana — fallback estático
// quando o aluno ainda não marcou NENHUMA missão da semana atual
// (a tabela missoes só ganha linhas quando o aluno conclui algo).
// Espelha src/lib/conteudo.ts; se as missões pendentes existirem na
// tabela, o texto da tabela tem prioridade.
// ------------------------------------------------------------------
const MISSAO_PRINCIPAL_POR_SEMANA: Record<number, string> = {
  1: "Vitória rápida, ainda hoje: mande mensagem pra 5 clientes antigos perguntando se está tudo bem — ou aumente o preço de 1 serviço em 10% no seu próximo orçamento.",
  2: "Recalcule o preço de pelo menos 3 serviços dessa semana.",
  3: "Ofereça o complemento pros próximos 5 clientes que você atender essa semana.",
  4: "Vire a página e preencha seu primeiro Painel Mensal.",
  5: "Escolha 1 dia essa semana e cronometre de verdade: quanto tempo foi execução, quanto foi deslocamento/espera.",
  6: "Use esse processo, na íntegra, no seu próximo atendimento — sem pular nenhum passo.",
  7: "Monte sua agenda da próxima semana por região antes de sair de casa na segunda-feira.",
  8: "Aplique a sequência completa nos últimos 5 clientes que você já atendeu.",
  9: "Publique ou divulgue seu trabalho pelo menos 3 vezes essa semana nos canais escolhidos.",
  10: "Faça o follow-up de todos os orçamentos em aberto essa semana, sem exceção.",
  11: "Cadastre ou atualize seu perfil no Google Meu Negócio.",
  12: "Escreva e assuma, com data, seu próximo objetivo de 90 dias — mesmo que seja só consolidar.",
};

interface AlunoRisco {
  user_id: string;
  nome: string | null;
  email: string | null;
  dias_sem_login: number;
}

function responder(status: number, corpo: Record<string, unknown>) {
  return new Response(JSON.stringify(corpo), { status, headers: CABECALHOS });
}

// ------------------------------------------------------------------
// Auth: só service role pode disparar o lote (cron usa a chave do
// service role). Um JWT de aluno passa pelo gateway, mas não passa
// daqui — evita que um aluno force envios.
// ------------------------------------------------------------------
function ehChamadaDeServico(req: Request): boolean {
  const autorizacao = req.headers.get("Authorization") ?? "";
  const jwt = autorizacao.replace(/^Bearer\s+/i, "");
  if (!jwt) return false;
  try {
    const payload = JSON.parse(atob(jwt.split(".")[1] ?? ""));
    return payload.role === "service_role";
  } catch {
    return false;
  }
}

// Semana atual = mesma regra da Sala de Guerra (semanaAtualDe):
// última semana concluída + 1, cap 12; 1 se nada concluído.
function semanaAtualDe(concluidas: number[]): number {
  if (concluidas.length === 0) return 1;
  const ultima = Math.max(...concluidas);
  return ultima >= 12 ? 12 : ultima + 1;
}

function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Token de descadastro: HMAC-SHA256(user_id, RESEND_API_KEY) — a
// mesma secret é usada pela função cancelar-lembretes para validar.
async function gerarTokenCancelamento(userId: string): Promise<string> {
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

function montarHtmlEmail(
  aluno: AlunoRisco,
  semana: number,
  missao: string,
  tokenCancelamento: string
): string {
  const nome = escaparHtml(aluno.nome ?? "você");
  const missaoEscapada = escaparHtml(missao);
  const linkSemana = `${SITE_URL}/semana/${semana}`;
  const linkCancelar = `${SITE_URL}/preferencias?user_id=${aluno.user_id}&token=${tokenCancelamento}`;
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a;">
      <h2 style="margin:0 0 16px;color:#111;">Sua Semana ${semana} está esperando</h2>
      <p style="font-size:15px;line-height:1.6;margin:0 0 12px;">Oi ${nome},</p>
      <p style="font-size:15px;line-height:1.6;margin:0 0 12px;">
        Faz <strong>${aluno.dias_sem_login} dias</strong> que você não abre a plataforma. Sua missão da
        Semana ${semana} — “${missaoEscapada}” — ainda está pendente.
      </p>
      <p style="font-size:15px;line-height:1.6;margin:0 0 20px;">
        20 minutos essa semana já bastam pra não perder o ritmo.
      </p>
      <p style="margin:0 0 28px;">
        <a href="${linkSemana}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:8px;">
          Continuar de onde parei
        </a>
      </p>
      <hr style="border:none;border-top:1px solid #e5e5e5;margin:0 0 12px;" />
      <p style="font-size:12px;color:#666;margin:0;">
        Não quer mais receber esses lembretes?
        <a href="${linkCancelar}" style="color:#666;text-decoration:underline;">Cancelar lembretes</a>
      </p>
    </div>
  `;
}

async function enviarViaResend(aluno: AlunoRisco, semana: number, missao: string): Promise<void> {
  const tokenCancelamento = await gerarTokenCancelamento(aluno.user_id);
  const resposta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: aluno.email,
      subject: `Sua Semana ${semana} está esperando`,
      html: montarHtmlEmail(aluno, semana, missao, tokenCancelamento),
    }),
    signal: AbortSignal.timeout(20000),
  });

  if (!resposta.ok) {
    const detalhe = await resposta.text();
    throw new Error(`Resend ${resposta.status}: ${detalhe.slice(0, 300)}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 204, headers: CABECALHOS });
  }
  if (req.method !== "POST") {
    return responder(405, { erro: "Método não permitido." });
  }
  if (!ehChamadaDeServico(req)) {
    return responder(401, { erro: "Não autorizado." });
  }
  if (!RESEND_API_KEY) {
    return responder(500, { erro: "RESEND_API_KEY não configurada. Rodar: supabase secrets set RESEND_API_KEY=..." });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    // ---- 1) Base de inativos (view da Onda 7) + filtros de opt-out ----
    const { data: baseInativos, error: erroBase } = await admin
      .from("crm_risco_desistencia")
      .select("user_id, nome, email, dias_sem_login");

    if (erroBase) {
      console.error("enviar-lembretes-semanais: falha na view crm_risco_desistencia", erroBase);
      return responder(500, { erro: "Falha ao buscar base de inativos.", detalhe: erroBase.message });
    }

    if (!baseInativos || baseInativos.length === 0) {
      return responder(200, { total: 0, enviados: 0, falhas: 0, ignorados: 0 });
    }

    const usuariosRisco = baseInativos as unknown as AlunoRisco[];

    // ---- 2) Opt-out (obrigatório) + e-mail presente ----
    const ids = usuariosRisco.map((u) => u.user_id);
    const { data: perfis, error: erroPerfis } = await admin
      .from("perfis")
      .select("id, receber_lembretes")
      .in("id", ids);

    if (erroPerfis) {
      console.error("enviar-lembretes-semanais: falha ao ler perfis", erroPerfis);
      return responder(500, { erro: "Falha ao ler preferências.", detalhe: erroPerfis.message });
    }

    const receberLembretes = new Set(
      (perfis ?? [])
        .filter((p) => (p as { receber_lembretes?: boolean }).receber_lembretes !== false)
        .map((p) => (p as { id: string }).id)
    );

    // ---- 3) Sem envio recente (Parte 2: anti-duplicado de 6 dias) ----
    const { data: enviadosRecentes, error: erroEnviados } = await admin
      .from("lembretes_enviados")
      .select("user_id")
      .eq("tipo", TIPO_LEMBRETE)
      .gte("enviado_em", new Date(Date.now() - JANELA_ANTI_DUPLICADO_DIAS * 86400000).toISOString());

    if (erroEnviados) {
      console.error("enviar-lembretes-semanais: falha ao ler lembretes_enviados", erroEnviados);
      return responder(500, { erro: "Falha ao checar envios recentes.", detalhe: erroEnviados.message });
    }

    const jaEnviado = new Set((enviadosRecentes ?? []).map((r) => (r as { user_id: string }).user_id));

    const alvo = usuariosRisco.filter(
      (u) => u.email && receberLembretes.has(u.user_id) && !jaEnviado.has(u.user_id)
    );

    if (alvo.length === 0) {
      return responder(200, {
        total: usuariosRisco.length,
        enviados: 0,
        falhas: 0,
        ignorados: usuariosRisco.length,
      });
    }

    // ---- 4) Semana atual + missão pendente (lógica da Sala de Guerra) ----
    const idsAlvo = alvo.map((u) => u.user_id);

    const [resSemanas, resMissoes] = await Promise.all([
      admin
        .from("progresso_semanas")
        .select("user_id, semana, status")
        .in("user_id", idsAlvo)
        .eq("status", "concluida"),
      admin
        .from("missoes")
        .select("user_id, semana, tipo, indice, descricao, concluida")
        .in("user_id", idsAlvo)
        .eq("concluida", false),
    ]);

    if (resSemanas.error || resMissoes.error) {
      console.error(
        "enviar-lembretes-semanais: falha ao montar contexto das semanas",
        resSemanas.error ?? resMissoes.error
      );
      return responder(500, { erro: "Falha ao montar contexto dos alunos." });
    }

    const concluidasPorUser = new Map<string, number[]>();
    for (const r of (resSemanas.data ?? []) as { user_id: string; semana: number }[]) {
      const lista = concluidasPorUser.get(r.user_id) ?? [];
      lista.push(r.semana);
      concluidasPorUser.set(r.user_id, lista);
    }

    const pendentesPorUser = new Map<string, { semana: number; tipo: string; indice: number; descricao: string }[]>();
    for (const m of (resMissoes.data ?? []) as {
      user_id: string;
      semana: number;
      tipo: string;
      indice: number;
      descricao: string;
    }[]) {
      const lista = pendentesPorUser.get(m.user_id) ?? [];
      lista.push({ semana: m.semana, tipo: m.tipo, indice: m.indice, descricao: m.descricao });
      pendentesPorUser.set(m.user_id, lista);
    }

    function missaoPendente(userId: string, semana: number): string {
      const pendentes = (pendentesPorUser.get(userId) ?? [])
        .filter((m) => m.semana === semana)
        .sort(
          (a, b) =>
            (a.tipo === "principal" ? 0 : 1) - (b.tipo === "principal" ? 0 : 1) ||
            a.indice - b.indice
        );
      if (pendentes.length > 0) return pendentes[0].descricao;
      return MISSAO_PRINCIPAL_POR_SEMANA[semana] ?? "continue o passo a passo da semana atual";
    }

    // ---- 5) Envio individual com degradação graciosa ----
    let enviados = 0;
    let falhas = 0;
    const idsEnviados: { user_id: string; tipo: string; enviado_em: string }[] = [];

    for (const aluno of alvo) {
      const semana = semanaAtualDe(concluidasPorUser.get(aluno.user_id) ?? []);
      const missao = missaoPendente(aluno.user_id, semana);
      try {
        await enviarViaResend(aluno, semana, missao);
        idsEnviados.push({
          user_id: aluno.user_id,
          tipo: TIPO_LEMBRETE,
          enviado_em: new Date().toISOString(),
        });
        enviados++;
      } catch (erro) {
        falhas++;
        console.error(
          `enviar-lembretes-semanais: falha no envio de ${aluno.email} (user ${aluno.user_id})`,
          erro
        );
      }
    }

    // ---- 6) Grava somente os envios bem-sucedidos ----
    if (idsEnviados.length > 0) {
      const { error: erroGravar } = await admin.from("lembretes_enviados").insert(idsEnviados);
      if (erroGravar) {
        console.error("enviar-lembretes-semanais: falha ao gravar lembretes_enviados", erroGravar);
      }
    }

    return responder(200, {
      total: usuariosRisco.length,
      enviados,
      falhas,
      ignorados: usuariosRisco.length - alvo.length,
    });
  } catch (erro) {
    console.error("enviar-lembretes-semanais:", erro);
    return responder(500, { erro: "Erro interno ao enviar lembretes." });
  }
});
