import type {
  CheckinSemanal,
  ImeHistorico,
  IndicadorSemana,
  PainelMensal,
} from "@/lib/types";

/**
 * Construção das séries usadas nos 5 gráficos da página de Evolução.
 * Todas usam a cor Ouro Sheik (#C9A227) na UI.
 */

export const PONTOS_MINIMOS = 2;

export interface PontoEvolucao {
  /** data ISO no formato yyyy-mm-dd (chave de ordenação/dedupe) */
  data: string;
  /** rótulo curto exibido no eixo X (dd/mm) */
  rotulo: string;
  valor: number;
}

export interface SerieEvolucao {
  pontos: PontoEvolucao[];
  suficiente: boolean;
}

type Fonte = { data: string; valor: number; prioridade: number };

function valorNumero(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function rotuloCurto(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

/**
 * Une fontes de datas distintas, priorizando a fonte mais confiável quando
 * duas caem no mesmo dia (painel > check-in > indicador).
 */
function montarSerie(fontes: Fonte[]): SerieEvolucao {
  const porData = new Map<string, { valor: number; prioridade: number }>();
  for (const fonte of fontes) {
    const chave = fonte.data.slice(0, 10);
    const atual = porData.get(chave);
    if (!atual || fonte.prioridade < atual.prioridade) {
      porData.set(chave, { valor: fonte.valor, prioridade: fonte.prioridade });
    }
  }
  const pontos = [...porData.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([data, valor]) => ({ data, rotulo: rotuloCurto(data), valor: valor.valor }));
  return {
    pontos,
    suficiente: pontos.length >= PONTOS_MINIMOS,
  };
}

function indicador(
  indicadores: IndicadorSemana[],
  nome: string
): Fonte[] {
  return indicadores
    .filter((i) => i.nome_indicador === nome)
    .map((i) => {
      const valor = valorNumero(i.valor_depois ?? i.valor_antes);
      if (valor === null || !i.atualizado_em) return null;
      return { data: i.atualizado_em, valor, prioridade: 2 } as Fonte;
    })
    .filter((f): f is Fonte => f !== null);
}

function painelCampo(
  paineis: PainelMensal[],
  campo: "faturamento_atual" | "lucro" | "ticket_medio" | "taxa_conversao"
): Fonte[] {
  return paineis
    .filter((p) => p.preenchido_em)
    .map((p) => {
      const valor = valorNumero(p[campo]);
      if (valor === null) return null;
      return { data: p.preenchido_em, valor, prioridade: 0 } as Fonte;
    })
    .filter((f): f is Fonte => f !== null);
}

/** IME (Índice de Maturidade Empresarial) por data de cálculo. */
export function serieIme(ime: ImeHistorico[]): SerieEvolucao {
  const fontes = ime
    .filter((i) => i.data_calculo)
    .map((i) => ({ data: i.data_calculo, valor: i.score_total, prioridade: 0 }));
  return montarSerie(fontes);
}

/** Faturamento: preferência pelo Painel Mensal; sem painel, usa o indicador. */
export function serieFaturamento(
  indicadores: IndicadorSemana[],
  paineis: PainelMensal[],
  checkins: CheckinSemanal[]
): SerieEvolucao {
  const fontes: Fonte[] = [
    ...painelCampo(paineis, "faturamento_atual"),
    ...checkins
      .filter((c) => c.faturamento_semana !== null && c.data_checkin)
      .map((c) => ({ data: c.data_checkin, valor: c.faturamento_semana as number, prioridade: 1 })),
    ...indicador(indicadores, "Faturamento do último mês"),
  ];
  return montarSerie(fontes);
}

/** Lucro: painéis + check-ins. */
export function serieLucro(
  paineis: PainelMensal[],
  checkins: CheckinSemanal[]
): SerieEvolucao {
  const fontes: Fonte[] = [
    ...painelCampo(paineis, "lucro"),
    ...checkins
      .filter((c) => c.lucro_semana !== null && c.data_checkin)
      .map((c) => ({ data: c.data_checkin, valor: c.lucro_semana as number, prioridade: 1 })),
  ];
  return montarSerie(fontes);
}

/** Ticket médio comercial: painel + indicador. */
export function serieTicket(
  indicadores: IndicadorSemana[],
  paineis: PainelMensal[]
): SerieEvolucao {
  return montarSerie([
    ...painelCampo(paineis, "ticket_medio"),
    ...indicador(indicadores, "Meu ticket médio"),
  ]);
}

/** Conversão comercial: painel + indicador. */
export function serieConversao(
  indicadores: IndicadorSemana[],
  paineis: PainelMensal[]
): SerieEvolucao {
  return montarSerie([
    ...painelCampo(paineis, "taxa_conversao"),
    ...indicador(indicadores, "Minha taxa de conversão de orçamentos"),
  ]);
}