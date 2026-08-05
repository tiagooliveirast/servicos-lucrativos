import { listarAtivos, type AtivoCriado } from "@/lib/ativos";
import { supabase } from "@/lib/supabase";
import type {
  Chave,
  ChaveUsuario,
  EscudoAtual,
  ProgressoSemana,
} from "@/lib/types";
import { formatBRL } from "@/lib/utils";

export const WHATSAPP_TIAGO = "5571993262999";

export interface ChavesDaJornada {
  catalogo: Chave[];
  desbloqueadas: ChaveUsuario[];
  escudo: EscudoAtual | null;
}

// ------------------------------------------------------------------
// Chaves v2 — os 4 pilares de desbloqueio de cada chave
// (mesma regra do banco em public.verificar_chaves)
// ------------------------------------------------------------------
export interface ContextoDesbloqueio {
  imeAtual: number | null;
  ieAtual: number | null;
  faturamentoValidado: number;
  /** true se a leitura mais recente é autodeclarada (provisória). */
  faturamentoAutodeclarado: boolean;
  ativos: AtivoCriado[];
}

export interface PilarChave {
  id: "faturamento" | "ime" | "ie" | "missoes";
  rotulo: string;
  ok: boolean;
  detalhe: string;
}

export interface StatusPorChave {
  chave: Chave;
  desbloqueada: ChaveUsuario | null;
  pilares: PilarChave[];
  /** todos os pilares ok, mas a chave ainda não foi desbloqueada no banco */
  prontoParaDesbloquear: boolean;
}

export interface ProgressoChaves {
  daJornada: ChavesDaJornada;
  imeAtual: number | null;
  ieAtual: number | null;
  faturamentoValidado: number;
  faturamentoAutodeclarado: boolean;
  ativos: AtivoCriado[];
  lista: StatusPorChave[];
  proximaChave: Chave | null;
}

export function pilaresDaChave(
  chave: Chave,
  ctx: ContextoDesbloqueio
): PilarChave[] {
  const ativosCriados = new Set(
    ctx.ativos.filter((a) => a.preenchido).map((a) => a.id)
  );
  const ativosPorId = new Map(ctx.ativos.map((a) => [a.id, a]));
  const faltando = chave.missoes_obrigatorias.filter(
    (codigo) => !ativosCriados.has(codigo)
  );

  return [
    {
      id: "faturamento",
      rotulo: "Faturamento validado",
      ok: ctx.faturamentoValidado >= chave.faturamento_minimo,
      detalhe: `${formatBRL(ctx.faturamentoValidado)} de ${formatBRL(
        chave.faturamento_minimo
      )} (${ctx.faturamentoAutodeclarado ? "informado por você" : "RefriClube"})`,
    },
    {
      id: "ime",
      rotulo: "Índice de Maturidade (IME)",
      ok: ctx.imeAtual !== null && ctx.imeAtual >= chave.ime_minimo,
      detalhe: `${ctx.imeAtual ?? 0} de ${chave.ime_minimo} pts`,
    },
    {
      id: "ie",
      rotulo: "Índice de Engajamento (IE)",
      ok: ctx.ieAtual !== null && ctx.ieAtual >= chave.ie_minimo,
      detalhe: `${ctx.ieAtual ?? 0} de ${chave.ie_minimo} pts`,
    },
    {
      id: "missoes",
      rotulo: "Missões e ativos da jornada",
      ok: faltando.length === 0,
      detalhe:
        faltando.length === 0
          ? "Todos os ativos criados"
          : `Falta: ${faltando
              .map((codigo) => ativosPorId.get(codigo)?.rotulo ?? codigo)
              .join(", ")}`,
    },
  ];
}

// ------------------------------------------------------------------
// Carga de dados
// ------------------------------------------------------------------
export async function carregarProgressoChaves(
  userId: string
): Promise<ProgressoChaves> {
  const [
    resCatalogo,
    resDesbloqueadas,
    resEscudo,
    resIme,
    resIe,
    resFat,
    resProgresso,
  ] = await Promise.all([
    supabase.from("chaves").select("*").order("ordem"),
    supabase
      .from("chaves_usuario")
      .select("id, user_id, chave_id, desbloqueada_em, solicitacao_fisica_status, solicitacao_fisica_em, chaves(*)")
      .eq("user_id", userId)
      .order("desbloqueada_em"),
    supabase
      .from("escudo_atual_usuario")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("ime_historico")
      .select("score_total")
      .eq("user_id", userId)
      .order("data_calculo", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("ie_historico")
      .select("score_total")
      .eq("user_id", userId)
      .order("data_calculo", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("faturamento_validado")
      .select("valor, nivel_confianca")
      .eq("user_id", userId)
      .order("data_referencia", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("progresso_semanas").select("*").eq("user_id", userId),
  ]);

  const falhou = [
    resCatalogo.error,
    resDesbloqueadas.error,
    resEscudo.error,
    resIme.error,
    resIe.error,
    resFat.error,
    resProgresso.error,
  ].some(Boolean);

  if (falhou) {
    throw new Error("Falha ao carregar o progresso das chaves.");
  }

  const catalogo = (resCatalogo.data ?? []) as Chave[];
  const desbloqueadas = (resDesbloqueadas.data ?? []) as unknown as ChaveUsuario[];
  const escudo = (resEscudo.data as EscudoAtual | null) ?? null;
  const imeAtual =
    resIme.data !== null ? Number((resIme.data as { score_total: number }).score_total) : null;
  const ieAtual =
    resIe.data !== null ? Number((resIe.data as { score_total: number }).score_total) : null;
  const faturamentoValidado =
    resFat.data !== null
      ? Number((resFat.data as { valor: number }).valor)
      : 0;
  const faturamentoAutodeclarado =
    resFat.data !== null &&
    (resFat.data as { nivel_confianca?: string }).nivel_confianca ===
      "autodeclarado";
  const ativos = listarAtivos((resProgresso.data ?? []) as ProgressoSemana[]);

  const ctx: ContextoDesbloqueio = {
    imeAtual,
    ieAtual,
    faturamentoValidado,
    faturamentoAutodeclarado,
    ativos,
  };
  const desbloqueadasPorId = new Map(desbloqueadas.map((d) => [d.chave_id, d]));

  const lista: StatusPorChave[] = catalogo.map((chave) => {
    const desbloqueada = desbloqueadasPorId.get(chave.id) ?? null;
    const pilares = pilaresDaChave(chave, ctx);
    return {
      chave,
      desbloqueada,
      pilares,
      prontoParaDesbloquear: !desbloqueada && pilares.every((p) => p.ok),
    };
  });

  const proximaChave = lista.find((s) => !s.desbloqueada)?.chave ?? null;

  return {
    daJornada: { catalogo, desbloqueadas, escudo },
    imeAtual,
    ieAtual,
    faturamentoValidado,
    faturamentoAutodeclarado,
    ativos,
    lista,
    proximaChave,
  };
}

export async function carregarChavesAdmin(
  userId: string
): Promise<ChaveUsuario[]> {
  const { data, error } = await supabase
    .from("chaves_usuario")
    .select("id, user_id, chave_id, desbloqueada_em, solicitacao_fisica_status, solicitacao_fisica_em, chaves(*)")
    .eq("user_id", userId)
    .order("desbloqueada_em");

  if (error) throw new Error("Falha ao carregar as chaves do aluno.");

  return (data ?? []) as unknown as ChaveUsuario[];
}

export function montarLinkChaveFisica(
  nomeAluno: string,
  chaveTitulo: string
): string {
  const mensagem = [
    `Olá, Tiago! Acabei de desbloquear a ${chaveTitulo} no Serviços Lucrativos.`,
    `Meu nome é ${nomeAluno}.`,
    "Pode me enviar minha chave física?",
  ].join("\n\n");
  return `https://wa.me/${WHATSAPP_TIAGO}?text=${encodeURIComponent(mensagem)}`;
}

export async function solicitarChaveFisica(
  chaveUsuarioId: string
): Promise<void> {
  const { error } = await supabase
    .from("chaves_usuario")
    .update({
      solicitacao_fisica_status: "solicitada",
      solicitacao_fisica_em: new Date().toISOString(),
    })
    .eq("id", chaveUsuarioId);

  if (error) throw new Error("Não foi possível registrar a solicitação.");
}

export async function marcarChaveEnviada(chaveUsuarioId: string): Promise<void> {
  const { error } = await supabase
    .from("chaves_usuario")
    .update({ solicitacao_fisica_status: "enviada" })
    .eq("id", chaveUsuarioId);

  if (error) throw new Error("Não foi possível atualizar o status da chave.");
}
