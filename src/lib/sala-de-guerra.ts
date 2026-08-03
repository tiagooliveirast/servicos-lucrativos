import { SEMANA_POR_NUMERO } from "@/lib/conteudo";
import { carregarRadarEAtualizar } from "@/lib/radar-nucleo";
import type { AlertaRadar } from "@/lib/regras-radar";
import { supabase } from "@/lib/supabase";
import type {
  Conquista,
  GamificacaoUsuario,
  ImeHistorico,
  Missao,
  ProgressoSemana,
} from "@/lib/types";
import { semanaAtualDe } from "@/lib/utils";

const MS_DIA = 24 * 60 * 60 * 1000;

// ------------------------------------------------------------------
// Limiares de chaves — Onda 3b (leitura antecipada; Onda 4 formaliza)
// Valores de exemplo a serem confirmados pelo Tiago.
// ------------------------------------------------------------------
export const LIMIARES_CHAVES = [
  { ime: 30, cor: "Chave Verde" },
  { ime: 60, cor: "Chave Azul" },
  { ime: 85, cor: "Chave Ouro" },
] as const;

// ------------------------------------------------------------------
// Ordem natural das conquistas para a "próxima conquista" (sequencial)
// ------------------------------------------------------------------
export const ORDEM_CONQUISTAS = [
  "primeira_semana",
  "modulo_1_completo",
  "modulo_2_completo",
  "modulo_3_completo",
  "ime_50",
  "ime_70",
  "streak_7",
  "streak_30",
  "checkin_completo",
] as const;

export interface SalaDeGuerra {
  // Contexto geral
  diasRestantes: number | null;
  percentualImplantacao: number;
  semanaAtual: number;
  // O que fazer hoje
  missaoDoDia: Missao | null;
  todasMissoesConcluidas: boolean;
  alertaPrioritario: AlertaRadar | null;
  recomendacaoRadar: AlertaRadar | null;
  // Motivação
  streak: number;
  proximaConquista: Conquista | null;
  proximaChave: { ime: number; cor: string } | null;
  imeAtual: number | null;
}

function missaoDaSemana(semanaNumero: number, indice: number): Missao {
  const conteudo = SEMANA_POR_NUMERO.get(semanaNumero);
  const definida = conteudo?.missoes[indice];
  return {
    id: "",
    user_id: "",
    semana: semanaNumero,
    tipo: definida?.tipo ?? "principal",
    indice,
    descricao:
      definida?.descricao ??
      "Siga o passo a passo da semana para manter o ritmo de 90 dias.",
    concluida: false,
    concluida_em: null,
  };
}

export async function carregarSalaDeGuerra(
  userId: string
): Promise<{ dados: SalaDeGuerra; erro: boolean }> {
  const [
    resAcesso,
    resSemanas,
    resMissoes,
    resGamificacao,
    resConquistas,
    resDesbloqueadas,
    resIme,
    radar,
  ] = await Promise.all([
    supabase.from("acessos").select("created_at").eq("user_id", userId).maybeSingle(),
    supabase.from("progresso_semanas").select("semana, status").eq("user_id", userId),
    supabase.from("missoes").select("*").eq("user_id", userId),
    supabase.from("gamificacao_usuario").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("conquistas").select("*").order("codigo"),
    supabase.from("conquistas_usuario").select("conquista_id").eq("user_id", userId),
    supabase
      .from("ime_historico")
      .select("score_total")
      .eq("user_id", userId)
      .order("data_calculo", { ascending: false })
      .limit(1)
      .maybeSingle(),
    carregarRadarEAtualizar(userId),
  ]);

  const falhou = [
    resAcesso.error,
    resSemanas.error,
    resMissoes.error,
    resGamificacao.error,
    resConquistas.error,
    resDesbloqueadas.error,
    resIme.error,
    radar.erro,
  ].some(Boolean);

  if (falhou) {
    return { dados: salaVazia(), erro: true };
  }

  const semanas = (resSemanas.data ?? []) as Pick<ProgressoSemana, "semana" | "status">[];
  const concluidas = semanas.filter((s) => s.status === "concluida").map((s) => s.semana);
  const semanaAtual = semanaAtualDe(concluidas);

  const missoes = (resMissoes.data ?? []) as Missao[];
  const missoesSemanaAtual = missoes.filter((m) => m.semana === semanaAtual);
  const pendentes = missoesSemanaAtual
    .filter((m) => !m.concluida)
    .sort(
      (a, b) =>
        (a.tipo === "principal" ? 0 : 1) - (b.tipo === "principal" ? 0 : 1) || a.indice - b.indice
    );

  const missaoDoDia: Missao = pendentes[0] ?? missaoDaSemana(semanaAtual, 0);
  const todasMissoesConcluidas = missoesSemanaAtual.length > 0 && pendentes.length === 0;

  const gamificacao = (resGamificacao.data as GamificacaoUsuario | null) ?? null;
  const streak = gamificacao?.dias_consecutivos ?? 0;

  const catalogo = (resConquistas.data ?? []) as Conquista[];
  const desbloqueadas = new Set(
    ((resDesbloqueadas.data ?? []) as { conquista_id: string }[]).map((d) => d.conquista_id)
  );
  const proximaConquista =
    ORDEM_CONQUISTAS.map((codigo) => catalogo.find((c) => c.codigo === codigo))
      .find((c) => c && !desbloqueadas.has(c.id)) ?? null;

  const imeAtualRaw = resIme.data as Pick<ImeHistorico, "score_total"> | null;
  const imeAtual = imeAtualRaw !== null ? Number(imeAtualRaw.score_total) : null;
  const proximaChave =
    imeAtual === null
      ? { ime: LIMIARES_CHAVES[0].ime, cor: LIMIARES_CHAVES[0].cor }
      : (LIMIARES_CHAVES.find((t) => imeAtual < t.ime) ?? null);

  const alertaPrioritario = radar.alertas[0] ?? null;
  const recomendacaoRadar =
    alertaPrioritario && alertaPrioritario.missaoSugerida !== null
      ? alertaPrioritario
      : null;

  const createdAt = (resAcesso.data as { created_at: string | null } | null)?.created_at ?? null;
  let diasRestantes: number | null = null;
  if (createdAt) {
    const limite = new Date(new Date(createdAt).getTime() + 90 * MS_DIA);
    diasRestantes = Math.max(0, Math.ceil((limite.getTime() - Date.now()) / MS_DIA));
  }

  return {
    dados: {
      diasRestantes,
      percentualImplantacao: Math.round((concluidas.length / 12) * 100),
      semanaAtual,
      missaoDoDia,
      todasMissoesConcluidas,
      alertaPrioritario,
      recomendacaoRadar,
      streak,
      proximaConquista,
      proximaChave,
      imeAtual,
    },
    erro: false,
  };
}

function salaVazia(): SalaDeGuerra {
  return {
    diasRestantes: null,
    percentualImplantacao: 0,
    semanaAtual: 1,
    missaoDoDia: null,
    todasMissoesConcluidas: false,
    alertaPrioritario: null,
    recomendacaoRadar: null,
    streak: 0,
    proximaConquista: null,
    proximaChave: null,
    imeAtual: null,
  };
}