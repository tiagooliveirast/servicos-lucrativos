import type { ImeHistorico } from "@/lib/types";

export interface PilarIME {
  chave: keyof Pick<
    ImeHistorico,
    | "score_financeiro"
    | "score_precificacao"
    | "score_marketing"
    | "score_comercial"
    | "score_operacao"
    | "score_organizacao"
    | "score_indicadores"
    | "score_processos"
  >;
  rotulo: string;
  peso: string;
}

export const PILARES_IME: PilarIME[] = [
  { chave: "score_financeiro", rotulo: "Financeiro", peso: "20%" },
  { chave: "score_precificacao", rotulo: "Precificação", peso: "10%" },
  { chave: "score_marketing", rotulo: "Marketing", peso: "10%" },
  { chave: "score_comercial", rotulo: "Comercial", peso: "15%" },
  { chave: "score_operacao", rotulo: "Operação", peso: "15%" },
  { chave: "score_organizacao", rotulo: "Organização", peso: "10%" },
  { chave: "score_indicadores", rotulo: "Indicadores", peso: "10%" },
  { chave: "score_processos", rotulo: "Processos", peso: "10%" },
];