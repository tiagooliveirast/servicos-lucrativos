export type StatusSemana = "bloqueada" | "em_andamento" | "concluida";

export interface Perfil {
  id: string;
  nome: string | null;
  telefone: string | null;
  cidade: string | null;
  estado: string | null;
  email_refriclube: string | null;
  email: string | null;
  ultimo_acesso_at: string | null;
  created_at: string;
}

export interface DiagnosticoInicial {
  id: string;
  user_id: string;
  nome_empresa: string | null;
  area_atuacao: string | null;
  tempo_mercado: string | null;
  possui_cnpj: boolean | null;
  possui_funcionarios: boolean | null;
  trabalha_sozinho: boolean | null;
  faturamento_atual: number | null;
  lucro_atual: number | null;
  qtd_clientes: number | null;
  ticket_medio: number | null;
  numero_orcamentos: number | null;
  created_at: string;
}

export interface ProgressoSemana {
  id: string;
  user_id: string;
  semana: number;
  status: StatusSemana;
  respostas: Record<string, unknown>;
  concluida_em: string | null;
}

export interface Missao {
  id: string;
  user_id: string;
  semana: number;
  tipo: "principal" | "rapida";
  indice: number;
  descricao: string;
  concluida: boolean;
  concluida_em: string | null;
}

export interface IndicadorSemana {
  id: string;
  user_id: string;
  semana: number;
  nome_indicador: string;
  unidade: string | null;
  valor_antes: number | null;
  valor_depois: number | null;
  origem: "manual" | "refriclube";
  atualizado_em: string;
}

export interface PainelMensal {
  id: string;
  user_id: string;
  numero_painel: number;
  meta_mensal: number | null;
  faturamento_atual: number | null;
  lucro: number | null;
  ticket_medio: number | null;
  numero_clientes: number | null;
  numero_orcamentos: number | null;
  taxa_conversao: number | null;
  avaliacoes_google: number | null;
  reserva_emergencia: number | null;
  observacao: string | null;
  preenchido_em: string;
}

export interface Acesso {
  user_id: string;
  email: string | null;
  ativo: boolean;
  motivo_inativacao: string | null;
  inativado_em: string | null;
  created_at: string | null;
}

export interface RadarEvento {
  id: string;
  user_id: string;
  regra_id: string;
  categoria: "verde" | "amarelo" | "vermelho";
  mensagem: string;
  missao_sugerida: string | null;
  resolvido: boolean;
  criado_em: string;
  resolvido_em: string | null;
}

export interface AulaSemana {
  semana: number;
  titulo: string;
  video_url: string | null;
  duracao_minutos: number | null;
}

export type TipoAtividade = "semana_concluida" | "painel_preenchido" | "radar_verde" | "plano_concluido";

export interface AtividadeLog {
  id: string;
  user_id: string;
  tipo: TipoAtividade;
  descricao: string;
  criado_em: string;
}
