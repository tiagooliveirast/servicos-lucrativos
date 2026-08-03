import type { ProgressoSemana } from "@/lib/types";

/**
 * Função única que interpreta as respostas de cada semana e devolve a lista
 * de "ativos criados" — os entregáveis que o aluno montou durante o plano.
 * Usada pelo Relatório de Implantação, pelo Certificado e pela página Evolução.
 */

export interface AtivoCriado {
  id: string;
  rotulo: string;
  semana: number;
  preenchido: boolean;
}

function preenchido(
  respostas: Record<string, unknown>,
  campos: string[],
  exigirTodos: boolean
): boolean {
  if (campos.length === 0) return false;
  const presentes = campos
    .map((c) => respostas[c])
    .filter((v) => v !== null && v !== undefined && String(v).trim() !== "");
  return exigirTodos ? presentes.length === campos.length : presentes.length > 0;
}

const CAMPOS_ATIVOS: {
  id: string;
  rotulo: string;
  semana: number;
  campos: string[];
  exigirTodos: boolean;
}[] = [
  {
    id: "diagnostico_financeiro",
    rotulo: "Diagnóstico financeiro completo",
    semana: 1,
    campos: ["f1_custo_vida", "f1_custo_negocio", "f1_lucro_desejado", "f1_meta_minima"],
    exigirTodos: false,
  },
  {
    id: "tabela_precos",
    rotulo: "Tabela de preços corrigida",
    semana: 2,
    campos: [
      "p2_servico_1_preco_correto",
      "p2_servico_2_preco_correto",
      "p2_servico_3_preco_correto",
    ],
    exigirTodos: false,
  },
  {
    id: "metas_definidas",
    rotulo: "Metas mensal, semanal e diária definidas",
    semana: 4,
    campos: ["p4_meta_mensal", "p4_meta_semanal", "p4_meta_diaria"],
    exigirTodos: true,
  },
  {
    id: "padrao_atendimento",
    rotulo: "Padrão de atendimento documentado",
    semana: 5,
    campos: ["p5_padrao_atendimento", "p5_apresentacao", "p5_comunicacao", "p5_explicacao_orcamento"],
    exigirTodos: false,
  },
  {
    id: "pop_documentado",
    rotulo: "Processo (POP) documentado",
    semana: 6,
    campos: ["p6_passo_1", "p6_passo_2", "p6_passo_3"],
    exigirTodos: true,
  },
  {
    id: "agenda_regioes",
    rotulo: "Agenda organizada por região",
    semana: 7,
    campos: ["p7_segunda", "p7_terca", "p7_quarta", "p7_quinta", "p7_sexta"],
    exigirTodos: true,
  },
  {
    id: "pos_venda",
    rotulo: "Sequência de pós-venda definida (24h, 7, 30 e 90 dias)",
    semana: 8,
    campos: ["p8_mensagem_24h", "p8_mensagem_7dias", "p8_mensagem_30dias", "p8_mensagem_90dias"],
    exigirTodos: true,
  },
  {
    id: "canais_captacao",
    rotulo: "Canais de captação definidos",
    semana: 9,
    campos: ["p9_canal_1", "p9_canal_2", "p9_canal_3", "p9_frase_indicacao"],
    exigirTodos: false,
  },
  {
    id: "followup_orcamentos",
    rotulo: "Follow-up padrão de orçamentos",
    semana: 10,
    campos: ["p10_followup_padrao"],
    exigirTodos: true,
  },
  {
    id: "painel_indicadores",
    rotulo: "Painel de indicadores montado",
    semana: 11,
    campos: ["p11_orcamentos_mes", "p11_vendas_fechadas", "p11_ticket_medio", "p11_margem_lucro"],
    exigirTodos: false,
  },
  {
    id: "plano_90dias",
    rotulo: "Plano dos próximos 90 dias definido",
    semana: 12,
    campos: ["p12_conquista", "p12_melhorar", "p12_proximo_objetivo"],
    exigirTodos: false,
  },
];

export function listarAtivos(progresso: ProgressoSemana[]): AtivoCriado[] {
  return CAMPOS_ATIVOS.map((ativo) => {
    const registro = progresso.find((p) => p.semana === ativo.semana);
    return {
      id: ativo.id,
      rotulo: ativo.rotulo,
      semana: ativo.semana,
      preenchido: preenchido(registro?.respostas ?? {}, ativo.campos, ativo.exigirTodos),
    };
  });
}

export function contarAtivosCriados(ativos: AtivoCriado[]): number {
  return ativos.filter((a) => a.preenchido).length;
}