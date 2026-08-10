import { SEMANA_POR_NUMERO } from "@/lib/conteudo";
import { carregarRadarEAtualizar } from "@/lib/radar-nucleo";
import type { AlertaRadar } from "@/lib/regras-radar";
import { calcularAtividadeDeHoje, type AtividadeDeHoje } from "@/lib/atividades-diarias";
import { supabase } from "@/lib/supabase";
import { dataInicioPlano, liberarSemanasPorTempo } from "@/lib/trava-semanas";
import type {
  AtividadeDiaria,
  Conquista,
  GamificacaoUsuario,
  ImeHistorico,
  Missao,
  ProgressoSemana,
} from "@/lib/types";
import { semanaAtualDe } from "@/lib/utils";

const MS_DIA = 24 * 60 * 60 * 1000;

// ------------------------------------------------------------------
// Ordem natural das conquistas para a "próxima conquista" (sequencial)
// ------------------------------------------------------------------
const ORDEM_CONQUISTAS = [
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
  atividadeDeHoje: AtividadeDeHoje | null;
  alertaPrioritario: AlertaRadar | null;
  recomendacaoRadar: AlertaRadar | null;
  // Motivação
  streak: number;
  proximaConquista: Conquista | null;
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
  // Trava de tempo: desbloqueia sozinha as semanas cujo tempo mínimo já
  // passou (ex.: Semana 2 no dia 7). Idempotente e segura — se falhar,
  // seguimos com os dados atuais.
  await liberarSemanasPorTempo();

  const [
    resAcesso,
    resSemanas,
    resMissoes,
    resGamificacao,
    resConquistas,
    resDesbloqueadas,
    resIme,
    resAtividades,
    resAtividadesMarcadas,
    radar,
  ] = await Promise.all([
    supabase
      .from("acessos")
      .select("data_primeiro_acesso, created_at")
      .eq("user_id", userId)
      .maybeSingle(),
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
    supabase.from("atividades_diarias").select("*").order("semana_numero, dia_da_semana"),
    supabase.from("atividades_diarias_usuario").select("atividade_id").eq("user_id", userId),
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
    resAtividades.error,
    resAtividadesMarcadas.error,
    radar.erro,
  ].some(Boolean);

  if (falhou) {
    return { dados: salaVazia(), erro: true };
  }

  const semanas = (resSemanas.data ?? []) as Pick<ProgressoSemana, "semana" | "status">[];
  const concluidas = semanas.filter((s) => s.status === "concluida").map((s) => s.semana);
  const semanaAtual = semanaAtualDe(concluidas);

  // Trava de tempo: se a semana que deveria ser a atual ainda está
  // bloqueada (anterior concluída, mas tempo mínimo não passou), o
  // aluno está "em dia" — a missão do dia vira a mensagem de revisão
  // em vez de apontar para uma semana que ele não pode abrir.
  const progressoPorNumero = new Map(semanas.map((s) => [s.semana, s.status]));
  const aguardandoTempo =
    semanaAtual < 12 &&
    concluidas.length > 0 &&
    progressoPorNumero.get(semanaAtual) === "bloqueada";

  const missoes = (resMissoes.data ?? []) as Missao[];
  const missoesSemanaAtual = missoes.filter((m) => m.semana === semanaAtual);
  const pendentes = missoesSemanaAtual
    .filter((m) => !m.concluida)
    .sort(
      (a, b) =>
        (a.tipo === "principal" ? 0 : 1) - (b.tipo === "principal" ? 0 : 1) || a.indice - b.indice
    );

  const missaoDoDia: Missao = pendentes[0] ?? missaoDaSemana(semanaAtual, 0);
  const todasMissoesConcluidas =
    aguardandoTempo || (missoesSemanaAtual.length > 0 && pendentes.length === 0);

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

  const alertaPrioritario = radar.alertas[0] ?? null;
  const recomendacaoRadar =
    alertaPrioritario && alertaPrioritario.missaoSugerida !== null
      ? alertaPrioritario
      : null;

  // Atividade diária de hoje (dia calendário do aluno — mesma base da
  // trava de tempo). Null para quem não tem data de início (ex.: admin).
  const inicio = dataInicioPlano(
    (resAcesso.data as { data_primeiro_acesso: string | null; created_at: string | null } | null) ??
      null
  );
  const atividadeDeHoje = calcularAtividadeDeHoje({
    inicio,
    progresso: semanas,
    catalogo: (resAtividades.data ?? []) as AtividadeDiaria[],
    marcadas: ((resAtividadesMarcadas.data ?? []) as { atividade_id: string }[]).map(
      (m) => m.atividade_id
    ),
  });

  let diasRestantes: number | null = null;
  if (inicio) {
    const limite = new Date(new Date(inicio).getTime() + 90 * MS_DIA);
    diasRestantes = Math.max(0, Math.ceil((limite.getTime() - Date.now()) / MS_DIA));
  }

  return {
    dados: {
      diasRestantes,
      percentualImplantacao: Math.round((concluidas.length / 12) * 100),
      semanaAtual,
      missaoDoDia,
      todasMissoesConcluidas,
      atividadeDeHoje,
      alertaPrioritario,
      recomendacaoRadar,
      streak,
      proximaConquista,
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
    atividadeDeHoje: null,
    alertaPrioritario: null,
    recomendacaoRadar: null,
    streak: 0,
    proximaConquista: null,
    imeAtual: null,
  };
}