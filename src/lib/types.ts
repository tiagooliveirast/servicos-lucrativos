export type StatusSemana = "bloqueada" | "em_andamento" | "concluida";

export interface Perfil {
  id: string;
  nome: string | null;
  telefone: string | null;
  whatsapp: string | null;
  cidade: string | null;
  estado: string | null;
  email_refriclube: string | null;
  email: string | null;
  ultimo_acesso_at: string | null;
  pagina_publica_ativa: boolean;
  pagina_publica_slug: string | null;
  pagina_publica_mostrar_faturamento: boolean;
  receber_lembretes: boolean;
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
  motivo_categoria: string | null;
  motivo_detalhe: string | null;
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
  /** Marco do "dia 1" do plano — preenchida na ativação do acesso (não no onboarding). */
  data_primeiro_acesso: string | null;
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

export interface CheckinSemanal {
  id: string;
  user_id: string;
  semana_referencia: number;
  data_checkin: string;
  faturamento_semana: number | null;
  lucro_semana: number | null;
  atendimentos: number | null;
  orcamentos_enviados: number | null;
  orcamentos_fechados: number | null;
  avaliacoes_recebidas: number | null;
  horas_trabalhadas: number | null;
  maior_dificuldade: string | null;
  created_at: string;
}

export interface ImeHistorico {
  id: string;
  user_id: string;
  data_calculo: string;
  score_total: number;
  score_financeiro: number;
  score_precificacao: number;
  score_marketing: number;
  score_comercial: number;
  score_operacao: number;
  score_organizacao: number;
  score_indicadores: number;
  score_processos: number;
}

export interface IeHistorico {
  id: string;
  user_id: string;
  data_calculo: string;
  score_total: number;
  score_missoes_prazo: number;
  score_checkins: number;
  score_login: number;
  score_financeiro_refriclube: number;
  score_indicadores_atualizados: number;
}

export interface GamificacaoUsuario {
  user_id: string;
  xp_total: number;
  nivel: number;
  dias_consecutivos: number;
  maior_sequencia: number;
  ultimo_login: string | null;
  updated_at: string;
}

export interface Conquista {
  id: string;
  codigo: string;
  titulo: string;
  descricao: string;
  icone: string | null;
  criterio: Record<string, unknown>;
}

export interface ConquistaUsuario {
  id: string;
  user_id: string;
  conquista_id: string;
  desbloqueada_em: string;
  conquistas: Conquista | null;
}

export interface Bau {
  id: string;
  codigo: string;
  titulo: string;
  conquista_gatilho_id: string | null;
  conteudo_tipo: "template" | "checklist" | "aula_bonus" | "cupom" | "wallpaper";
  conteudo_url: string | null;
  conteudo_texto: string | null;
  conquistas: Conquista | null;
}

export interface BauUsuario {
  id: string;
  user_id: string;
  baul_id: string;
  aberto: boolean;
  desbloqueado_em: string;
  aberto_em: string | null;
  bauis: Bau | null;
}

export type CategoriaDuvida =
  | "financeiro"
  | "comercial"
  | "plataforma"
  | "conteudo"
  | "outro";

export type StatusDuvida = "aberta" | "respondida" | "fechada";

export interface Duvida {
  id: string;
  user_id: string;
  categoria: CategoriaDuvida;
  titulo: string;
  mensagem: string;
  status: StatusDuvida;
  resposta_admin: string | null;
  respondida_em: string | null;
  created_at: string;
  perfis?: { nome: string | null; email: string | null } | null;
}

export type StatusAnexo = "pendente" | "aprovado" | "rejeitado";

export interface MissaoAnexo {
  id: string;
  user_id: string;
  semana_numero: number;
  tipo_anexo: string;
  storage_path: string;
  nome_arquivo: string | null;
  status: StatusAnexo;
  comentario_admin: string | null;
  created_at: string;
  perfis?: { nome: string | null; email: string | null } | null;
}

export interface CrmRiscoDesistencia {
  user_id: string;
  nome: string | null;
  email: string | null;
  whatsapp: string | null;
  nome_empresa: string | null;
  ultimo_login: string | null;
  dias_sem_login: number;
}

export interface LembreteEnviado {
  id: string;
  user_id: string;
  tipo: string;
  enviado_em: string;
}

export interface CrmEvolucaoAcelerada {
  user_id: string;
  ime_atual: number;
  ime_ha_30_dias: number;
  ganho_30_dias: number;
  calculado_em: string;
}

export interface CrmCandidatoCase {
  user_id: string;
  nome: string | null;
  email: string | null;
  nome_empresa: string | null;
  ime_atual: number | null;
  semanas_concluidas: number;
  paineis_preenchidos: number;
}

export interface DicaPreenchimentoSemana {
  id: string;
  user_id: string;
  semana_numero: number;
  texto: string;
  modelo: string;
  gerado_em: string;
}

export interface AtividadeDiaria {
  id: string;
  semana_numero: number;
  dia_da_semana: number;
  titulo: string;
  descricao: string;
}

export interface AtividadeDiariaUsuario {
  id: string;
  user_id: string;
  atividade_id: string;
  concluida_em: string;
}
