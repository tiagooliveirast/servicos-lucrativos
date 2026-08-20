import { SEMANA_POR_NUMERO } from "@/lib/conteudo";
import type { ItemLista } from "@/lib/conteudo";
import type {
  DiagnosticoInicial,
  IndicadorSemana,
  Missao,
  PainelMensal,
  ProgressoSemana,
} from "@/lib/types";
import { formatBRL, formatNumero, formatPorcento } from "@/lib/utils";

export type CategoriaRadar = "verde" | "amarelo" | "vermelho";

export interface AlertaRadar {
  regraId: string;
  categoria: CategoriaRadar;
  mensagem: string;
  missaoSugerida: string | null;
  prioridade: number;
}

export interface DadosRadar {
  diagnostico: DiagnosticoInicial | null;
  semanas: ProgressoSemana[];
  missoes: Missao[];
  indicadores: IndicadorSemana[];
  paineis: PainelMensal[];
  ultimoAcessoAt: string | null;
  agora: Date;
}

const MS_DIA = 24 * 60 * 60 * 1000;

const PESO_CATEGORIA: Record<CategoriaRadar, number> = {
  vermelho: 0,
  amarelo: 1,
  verde: 2,
};

const CAMPOS_CALCULADOS = new Set(["f1_custo_vida", "f1_custo_negocio", "f1_meta_minima", "p4_meta_semanal", "p4_meta_diaria", "p10_taxa_conversao"]);

function diasEntre(agora: Date, data: string | null): number | null {
  if (!data) return null;
  return Math.max(0, Math.floor((agora.getTime() - new Date(data).getTime()) / MS_DIA));
}

function semana(d: DadosRadar, n: number): ProgressoSemana | undefined {
  return d.semanas.find((s) => s.semana === n);
}

function semanaConcluida(d: DadosRadar, n: number): boolean {
  return semana(d, n)?.status === "concluida";
}

function respostasSemana(d: DadosRadar, n: number): Record<string, unknown> {
  return semana(d, n)?.respostas ?? {};
}

function missaoConcluida(d: DadosRadar, n: number, tipo: "principal" | "rapida"): boolean {
  return d.missoes.some((m) => m.semana === n && m.tipo === tipo && m.concluida);
}

function indicadorPorNome(d: DadosRadar, nome: string): IndicadorSemana | null {
  const candidatos = d.indicadores.filter((i) => i.nome_indicador === nome);
  if (candidatos.length === 0) return null;
  // Preferência: valor manual primeiro; no futuro, se houver dado sincronizado
  // do Refriclube (origem = 'refriclube'), ele poderá ser considerado aqui.
  const fonte = candidatos.filter((i) => i.origem === "manual");
  const lista = fonte.length > 0 ? fonte : candidatos;
  return lista.sort(
    (a, b) => new Date(b.atualizado_em).getTime() - new Date(a.atualizado_em).getTime()
  )[0];
}

function paineisOrdenados(d: DadosRadar): PainelMensal[] {
  return [...d.paineis].sort((a, b) => a.numero_painel - b.numero_painel);
}

function painelMaisRecente(d: DadosRadar): PainelMensal | null {
  const ordenados = paineisOrdenados(d);
  return ordenados.length > 0 ? ordenados[ordenados.length - 1] : null;
}

function numeroDe(respostas: Record<string, unknown>, id: string): number | null {
  const v = respostas[id];
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function taxaConversao(d: DadosRadar): number | null {
  let taxa: number | null = null;
  const ind = indicadorPorNome(d, "Minha taxa de conversão de orçamentos");
  if (ind) taxa = ind.valor_depois ?? ind.valor_antes;
  const recente = painelMaisRecente(d);
  if (recente && recente.taxa_conversao !== null) taxa = recente.taxa_conversao;
  return taxa;
}

// ------------------------------------------------------------------
// Regra 1 — preco_desatualizado
// ------------------------------------------------------------------
function regraPrecoDesatualizado(d: DadosRadar): AlertaRadar | null {
  if (!semanaConcluida(d, 2)) return null;
  const dias = diasEntre(d.agora, semana(d, 2)!.concluida_em);
  if (dias === null || dias <= 7) return null;
  if (missaoConcluida(d, 2, "rapida")) return null;

  const r = respostasSemana(d, 2);
  const servico = [1, 2, 3]
    .map((n) => ({
      precoAtual: numeroDe(r, `p2_servico_${n}_preco_atual`),
      precoCorreto: numeroDe(r, `p2_servico_${n}_preco_correto`),
    }))
    .find((s) => s.precoAtual !== null && s.precoCorreto !== null);
  if (!servico) return null;
  const precoAtual = servico.precoAtual as number;
  const precoCorreto = servico.precoCorreto as number;

  return {
    regraId: "preco_desatualizado",
    categoria: "amarelo",
    mensagem: `Você recalculou seu preço na Semana 2 (de ${formatBRL(precoAtual)} para ${formatBRL(precoCorreto)}), mas ainda não confirmou que aplicou esse valor num orçamento real. Isso pode estar custando dinheiro toda semana que passa.`,
    missaoSugerida: "Aplique o novo preço no seu próximo orçamento e marque a missão como concluída.",
    prioridade: 0,
  };
}

// ------------------------------------------------------------------
// Regra 2 — ticket_medio_parado
// ------------------------------------------------------------------
function regraTicketMedioParado(d: DadosRadar): AlertaRadar | null {
  if (!semanaConcluida(d, 3)) return null;
  const ind = indicadorPorNome(d, "Meu ticket médio");
  if (!ind || ind.valor_antes === null) return null;
  // PostgREST devolve numeric como string — normaliza antes de comparar
  const antes = Number(ind.valor_antes);
  const depois = ind.valor_depois === null ? null : Number(ind.valor_depois);
  if (!Number.isFinite(antes)) return null;
  const parado = depois === null || !Number.isFinite(depois) || depois <= antes;
  if (!parado) return null;

  return {
    regraId: "ticket_medio_parado",
    categoria: "amarelo",
    mensagem: `Seu ticket médio continua em torno de ${formatBRL(antes)}. Você já identificou serviços complementares na Semana 3, mas ainda não viu esse número subir.`,
    missaoSugerida: "Ofereça um serviço complementar nos seus próximos 3 atendimentos.",
    prioridade: 1,
  };
}

// ------------------------------------------------------------------
// Regra 3 — sem_avaliacao_nova
// ------------------------------------------------------------------
function regraSemAvaliacaoNova(d: DadosRadar): AlertaRadar | null {
  if (!semanaConcluida(d, 11)) return null;
  const v = respostasSemana(d, 11).p11_avaliacoes_google;
  const total = v === undefined || v === null || v === "" ? 0 : Number(v);
  if (total > 0) return null;

  return {
    regraId: "sem_avaliacao_nova",
    categoria: "amarelo",
    mensagem: `Você concluiu a Semana de Indicadores e Autoridade, mas ainda não conseguiu nenhuma avaliação nova no Google. Hoje sua empresa tem ${formatNumero(total)} avaliações.`,
    missaoSugerida: "Peça avaliação para os últimos 3 clientes atendidos.",
    prioridade: 2,
  };
}

// ------------------------------------------------------------------
// Regra 4 — gargalo_conversao_baixa
// ------------------------------------------------------------------
function regraGargaloConversaoBaixa(d: DadosRadar): AlertaRadar | null {
  const taxa = taxaConversao(d);
  if (taxa === null || taxa >= 40) return null;

  return {
    regraId: "gargalo_conversao_baixa",
    categoria: "vermelho",
    mensagem: `Sua taxa de conversão de orçamentos está em ${formatPorcento(taxa)}. Seu maior problema hoje não é falta de cliente — é converter quem já pediu orçamento.`,
    missaoSugerida: "Faça o follow-up de todos os orçamentos em aberto antes de investir em captar mais cliente.",
    prioridade: 3,
  };
}

// ------------------------------------------------------------------
// Regra 5 — conversao_alta_pouco_volume
// ------------------------------------------------------------------
function regraConversaoAltaPoucoVolume(d: DadosRadar): AlertaRadar | null {
  const taxa = taxaConversao(d);
  if (taxa === null || taxa <= 70) return null;

  const ordenados = paineisOrdenados(d);
  const recente = ordenados[ordenados.length - 1];
  if (!recente || recente.numero_orcamentos === null) return null;

  const anteriores = ordenados.slice(0, -1).filter((p) => p.numero_orcamentos !== null);
  let volumeBaixo: boolean;
  if (anteriores.length === 0) {
    volumeBaixo = recente.numero_orcamentos < 10;
  } else {
    const media =
      anteriores.reduce((soma, p) => soma + (p.numero_orcamentos as number), 0) /
      anteriores.length;
    volumeBaixo = recente.numero_orcamentos < media;
  }
  if (!volumeBaixo) return null;

  return {
    regraId: "conversao_alta_pouco_volume",
    categoria: "verde",
    mensagem: `Sua conversão está em ${formatPorcento(taxa)}, bem acima da média. Seu desafio agora não é melhorar o fechamento — é aumentar o número de oportunidades.`,
    missaoSugerida: "Foque as próximas ações em captação de clientes novos.",
    prioridade: 4,
  };
}

// ------------------------------------------------------------------
// Regra 6 — pronto_para_contratar
// ------------------------------------------------------------------
function regraProntoParaContratar(d: DadosRadar): AlertaRadar | null {
  if (!semanaConcluida(d, 12)) return null;
  const r12 = respostasSemana(d, 12);
  const decisaoOk =
    r12.decisao_meta_minima === true &&
    r12.decisao_processo === true &&
    r12.decisao_clientes === true;
  if (!decisaoOk) return null;

  const custoMensal = numeroDe(respostasSemana(d, 1), "f1_custo_negocio");
  const reserva = painelMaisRecente(d)?.reserva_emergencia ?? null;
  if (custoMensal === null || custoMensal <= 0 || reserva === null) return null;

  // Reserva ÷ custo mensal = meses de caixa. A meta do curso é 60 DIAS
  // (≈ 2 meses), então o cálculo usa o custo diário (custo mensal ÷ 30).
  const custoDiario = custoMensal / 30;
  const diasReserva = Math.floor(reserva / custoDiario);
  if (diasReserva >= 60) {
    return {
      regraId: "pronto_para_contratar",
      categoria: "verde",
      mensagem:
        "Você reúne todas as condições para contratar seu primeiro ajudante: demanda, processo documentado e reserva financeira.",
      missaoSugerida: "Comece o processo de contratação do seu primeiro ajudante.",
      prioridade: 5,
    };
  }

  return {
    regraId: "pronto_para_contratar",
    categoria: "amarelo",
    mensagem: `Você já tem demanda suficiente para contratar um ajudante. Porém sua reserva financeira hoje cobre apenas ${diasReserva} dias de operação.`,
    missaoSugerida: "Antes de contratar, forme pelo menos 60 dias de caixa de reserva.",
    prioridade: 5,
  };
}

// ------------------------------------------------------------------
// Regra 7 — usuario_inativo
// ------------------------------------------------------------------
function regraUsuarioInativo(d: DadosRadar): AlertaRadar | null {
  const dias = diasEntre(d.agora, d.ultimoAcessoAt);
  if (dias === null || dias <= 5) return null;
  if (!d.semanas.some((s) => s.status !== "concluida")) return null;

  const tarefas = Math.max(1, contarTarefasSemanaAtual(d));
  return {
    regraId: "usuario_inativo",
    categoria: "vermelho",
    mensagem: `Faz ${dias} dias que você não avança na implantação. Faltam ${tarefas} tarefas para concluir a semana atual.`,
    missaoSugerida: "Volte hoje e conclua a semana atual para desbloquear a próxima.",
    prioridade: 6,
  };
}

function contarTarefasSemanaAtual(d: DadosRadar): number {
  const atual = d.semanas
    .filter((s) => s.status === "em_andamento")
    .sort((a, b) => a.semana - b.semana)[0];
  if (!atual) return 0;
  const conteudo = SEMANA_POR_NUMERO.get(atual.semana);
  if (!conteudo) return 0;

  let tarefas = 1; // checklist de conclusão
  const r = atual.respostas ?? {};

  for (const campo of conteudo.campos) {
    const obrigatorio = ("obrigatorio" in campo ? campo.obrigatorio : false) ?? false;
    if (!obrigatorio && campo.tipo !== "tabela_fixa") continue;
    if (campo.tipo === "tabela") {
      const linhas = Array.isArray(r[campo.id]) ? (r[campo.id] as Record<string, unknown>[]) : [];
      const completo =
        linhas.length > 0 &&
        linhas.every((linha) =>
          campo.colunas.every((c) => {
            const v = linha[c.id];
            return v !== undefined && v !== null && String(v).trim() !== "";
          })
        );
      if (!completo) tarefas++;
    } else if (campo.tipo === "tabela_fixa") {
      const objeto = (r[campo.id] ?? {}) as Record<string, unknown>;
      const completo = campo.linhas.every((linha) => {
        const v = objeto[linha.id];
        return v !== undefined && v !== null && String(v).trim() !== "";
      });
      if (!completo) tarefas++;
    } else if (campo.tipo === "lista_itens") {
      const linhas = Array.isArray(r[campo.id]) ? (r[campo.id] as ItemLista[]) : [];
      const temAlguma = linhas.some(
        (l) => (l.descricao ?? "").trim() !== "" || (typeof l.valor === "number" && l.valor > 0)
      );
      const semParcial = linhas.every((l) => {
        const temDescricao = (l.descricao ?? "").trim() !== "";
        const temValor = typeof l.valor === "number" && l.valor > 0;
        return !(temDescricao || temValor) || (temDescricao && temValor);
      });
      // Formato antigo da Semana 1 (três listas separadas) ainda não migrado
      // conta como preenchido para não penalizar quem ainda não migrou.
      const temLegado =
        campo.id === "gastos_itens" &&
        ["custo_vida_itens", "despesas_fixas", "despesas_variaveis"].some((id) =>
          Array.isArray(r[id]) &&
          (r[id] as ItemLista[]).some(
            (l) => (l.descricao ?? "").trim() !== "" || Number(l?.valor) > 0
          )
        );
      if (!temAlguma && !temLegado) tarefas++;
      else if (!semParcial) tarefas++;
    } else if (!CAMPOS_CALCULADOS.has(campo.id)) {
      const v = r[campo.id];
      if (v === undefined || v === null || String(v).trim() === "") tarefas++;
    }
  }

  for (const missao of conteudo.missoes) {
    if (!missaoConcluida(d, atual.semana, missao.tipo)) tarefas++;
  }

  return tarefas;
}

// ------------------------------------------------------------------
// Regra 8 — relatorio_mensal
// ------------------------------------------------------------------
const AREAS_PAINEL = [
  { id: "faturamento", rotulo: "faturamento", acao: "aumentar o faturamento", valor: (p: PainelMensal) => p.faturamento_atual },
  { id: "lucro", rotulo: "lucro", acao: "melhorar o lucro", valor: (p: PainelMensal) => p.lucro },
  { id: "ticket", rotulo: "ticket médio", acao: "aumentar o ticket médio", valor: (p: PainelMensal) => p.ticket_medio },
  { id: "conversao", rotulo: "conversão de orçamentos", acao: "elevar a taxa de conversão", valor: (p: PainelMensal) => p.taxa_conversao },
] as const;

function regraRelatorioMensal(d: DadosRadar): AlertaRadar | null {
  const ordenados = paineisOrdenados(d);
  if (ordenados.length < 2) return null;
  const anterior = ordenados[ordenados.length - 2];
  const recente = ordenados[ordenados.length - 1];
  if (!recente.preenchido_em) return null;
  const idade = d.agora.getTime() - new Date(recente.preenchido_em).getTime();
  if (idade > MS_DIA) return null;
  if (recente.faturamento_atual === null) return null;

  const linhas: string[] = [];
  linhas.push(`- faturou ${formatBRL(recente.faturamento_atual)}`);
  if (recente.lucro !== null) linhas.push(`- lucro de ${formatBRL(recente.lucro)}`);

  if (recente.ticket_medio !== null) {
    if (anterior.ticket_medio !== null && anterior.ticket_medio > 0) {
      const pct = ((recente.ticket_medio - anterior.ticket_medio) / anterior.ticket_medio) * 100;
      const direcao = pct >= 0 ? "subiu" : "caiu";
      linhas.push(`- ticket médio ${direcao} ${formatPorcento(Math.abs(pct))}`);
    } else {
      linhas.push(`- ticket médio de ${formatBRL(recente.ticket_medio)}`);
    }
  }

  if (recente.taxa_conversao !== null) {
    if (anterior.taxa_conversao !== null) {
      linhas.push(
        `- conversão foi de ${formatPorcento(anterior.taxa_conversao)} para ${formatPorcento(recente.taxa_conversao)}`
      );
    } else {
      linhas.push(`- conversão de ${formatPorcento(recente.taxa_conversao)}`);
    }
  }

  const avancos = AREAS_PAINEL.map((area) => ({
    rotulo: area.rotulo,
    valorAtual: area.valor(recente),
    valorAnterior: area.valor(anterior),
  }))
    .filter((x) => x.valorAtual !== null && x.valorAnterior !== null && x.valorAnterior! > 0)
    .map((x) => ({
      rotulo: x.rotulo,
      pct: ((x.valorAtual! - x.valorAnterior!) / x.valorAnterior!) * 100,
    }))
    .sort((a, b) => b.pct - a.pct);

  if (avancos.length > 0) linhas.push(`Seu maior avanço foi em ${avancos[0].rotulo}.`);

  const menorNumero = AREAS_PAINEL.map((area) => ({ area, valor: area.valor(recente) }))
    .filter((x): x is { area: (typeof AREAS_PAINEL)[number]; valor: number } => x.valor !== null)
    .sort((a, b) => a.valor - b.valor)[0];

  if (menorNumero) linhas.push(`Seu próximo desafio é ${menorNumero.area.acao}.`);

  return {
    regraId: "relatorio_mensal",
    categoria: "verde",
    mensagem: "Neste mês sua empresa:\n" + linhas.join("\n"),
    missaoSugerida: null,
    prioridade: 7,
  };
}

// ------------------------------------------------------------------
// Execução: roda as 8 regras e ordena por categoria + ordem da Seção 3
// ------------------------------------------------------------------
const REGRAS: ((d: DadosRadar) => AlertaRadar | null)[] = [
  regraPrecoDesatualizado,
  regraTicketMedioParado,
  regraSemAvaliacaoNova,
  regraGargaloConversaoBaixa,
  regraConversaoAltaPoucoVolume,
  regraProntoParaContratar,
  regraUsuarioInativo,
  regraRelatorioMensal,
];

export function executarRegras(d: DadosRadar): AlertaRadar[] {
  return REGRAS.map((regra) => regra(d))
    .filter((alerta): alerta is AlertaRadar => alerta !== null)
    .sort(
      (a, b) =>
        PESO_CATEGORIA[a.categoria] - PESO_CATEGORIA[b.categoria] ||
        a.prioridade - b.prioridade
    );
}

export function missaoRecomendada(alertas: AlertaRadar[]): AlertaRadar | null {
  return alertas.find((a) => a.missaoSugerida !== null) ?? null;
}
