import { formatNumero } from "@/lib/utils";

export type DirecaoIndicador = "maior" | "menor";

// Mapa fixo de direção de melhoria por indicador de semana.
// "maior" = subir é melhor; "menor" = cair é melhor (ex.: Semana 7, tempo de deslocamento).
export const DIRECAO_INDICADORES_SEMANA: Record<number, DirecaoIndicador> = {
  1: "maior", // Faturamento do último mês
  2: "maior", // Preço médio dos 3 principais serviços
  3: "maior", // Ticket médio
  7: "menor", // Tempo estimado de deslocamento por semana
  10: "maior", // Taxa de conversão de orçamentos
};

// Todos os indicadores do Painel Mensal são "quanto maior, melhor".
export const DIRECAO_PAINEIS_MENSAIS: Record<string, DirecaoIndicador> = {
  meta_mensal: "maior",
  faturamento_atual: "maior",
  lucro: "maior",
  ticket_medio: "maior",
  numero_clientes: "maior",
  numero_orcamentos: "maior",
  taxa_conversao: "maior",
  avaliacoes_google: "maior",
  reserva_emergencia: "maior",
};

// Campos do Painel Mensal que entram na celebração de melhoria.
// meta_mensal fica de fora: é meta, não resultado.
export const CAMPOS_MELHORIA_PAINEL = [
  "faturamento_atual",
  "lucro",
  "ticket_medio",
  "numero_clientes",
  "numero_orcamentos",
  "taxa_conversao",
  "avaliacoes_google",
  "reserva_emergencia",
] as const;

export const ROTULOS_MELHORIA_PAINEL: Record<string, string> = {
  faturamento_atual: "Faturamento",
  lucro: "Lucro",
  ticket_medio: "Ticket médio",
  numero_clientes: "Nº de clientes atendidos",
  numero_orcamentos: "Nº de orçamentos enviados",
  taxa_conversao: "Taxa de conversão",
  avaliacoes_google: "Avaliações no Google",
  reserva_emergencia: "Reserva de emergência",
};

export const UNIDADE_MELHORIA_PAINEL: Record<string, string | null> = {
  faturamento_atual: "R$",
  lucro: "R$",
  ticket_medio: "R$",
  numero_clientes: null,
  numero_orcamentos: null,
  taxa_conversao: "%",
  avaliacoes_google: null,
  reserva_emergencia: "R$",
};

// Check-in semanal: faturamento e lucro, quanto maior, melhor.
export const DIRECAO_CHECKINS_SEMANAIS: Record<string, DirecaoIndicador> = {
  faturamento_semana: "maior",
  lucro_semana: "maior",
};

export function melhoraCom(antes: number, depois: number, direcao: DirecaoIndicador): boolean {
  return direcao === "maior" ? depois > antes : depois < antes;
}

export function variacaoPercentual(antes: number, depois: number): number | null {
  if (antes === 0) return null;
  return ((depois - antes) / antes) * 100;
}

export function formatarVariacao(variacao: number | null): string {
  if (variacao === null) return "";
  const sinal = variacao > 0 ? "+" : "";
  return `${sinal}${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(variacao)}%`;
}

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(valor);
}

export function formatarValorIndicador(valor: number, unidade: string | null): string {
  if (unidade === "R$") return formatarMoeda(valor);
  if (unidade === "%")
    return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(valor)}%`;
  const sufixo = unidade ? ` ${unidade}` : "";
  return `${formatNumero(valor)}${sufixo}`;
}

export interface MelhoriaComparavel {
  chave: string;
  rotulo: string;
  antes: number;
  depois: number;
  direcao: DirecaoIndicador;
  unidade?: string | null;
}

// Dentre várias melhorias no mesmo salvamento, devolve a de maior destaque
// (maior variação percentual) — para não empilhar celebrações na tela.
export function maiorDestaque(melhorias: MelhoriaComparavel[]): MelhoriaComparavel | null {
  let melhor: MelhoriaComparavel | null = null;
  let melhorScore = -Infinity;
  for (const m of melhorias) {
    const variacao = variacaoPercentual(m.antes, m.depois);
    const score = variacao === null ? Number.POSITIVE_INFINITY : Math.abs(variacao);
    if (score > melhorScore) {
      melhorScore = score;
      melhor = m;
    }
  }
  return melhor;
}

export function textoMelhoria(m: MelhoriaComparavel): string {
  const verbo = m.direcao === "menor" ? "caiu" : "subiu";
  const antes = formatarValorIndicador(m.antes, m.unidade ?? null);
  const depois = formatarValorIndicador(m.depois, m.unidade ?? null);
  const variacao = variacaoPercentual(m.antes, m.depois);
  const textoVariacao = variacao === null ? "" : ` (${formatarVariacao(variacao)})`;
  return `${m.rotulo} ${verbo} de ${antes} para ${depois}${textoVariacao}`;
}
