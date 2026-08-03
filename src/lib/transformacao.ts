import { supabase } from "@/lib/supabase";
import type {
  CheckinSemanal,
  DiagnosticoInicial,
  ImeHistorico,
  IndicadorSemana,
  PainelMensal,
  Perfil,
  ProgressoSemana,
} from "@/lib/types";

export interface DadosTransformacao {
  perfil: Perfil | null;
  empresa: DiagnosticoInicial | null;
  progresso: ProgressoSemana[];
  paineis: PainelMensal[];
  indicadores: IndicadorSemana[];
  ime: ImeHistorico[];
  checkins: CheckinSemanal[];
}

/**
 * Carrega, em paralelo, todos os dados usados pelos módulos da Onda 2
 * (gráficos de evolução, Relatório e Certificado de Implantação).
 * A leitura usa o UID do usuário, então funciona tanto para o aluno
 * quanto para o admin visualizando qualquer aluno.
 */
export async function carregarDadosTransformacao(
  userId: string
): Promise<DadosTransformacao> {
  const [
    resPerfil,
    resEmpresa,
    resProgresso,
    resPaineis,
    resIndicadores,
    resIme,
    resCheckins,
  ] = await Promise.all([
    supabase.from("perfis").select("*").eq("id", userId).maybeSingle(),
    supabase
      .from("diagnostico_inicial")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("progresso_semanas")
      .select("*")
      .eq("user_id", userId)
      .order("semana"),
    supabase
      .from("paineis_mensais")
      .select("*")
      .eq("user_id", userId)
      .order("numero_painel"),
    supabase
      .from("indicadores_semana")
      .select("*")
      .eq("user_id", userId)
      .order("semana"),
    supabase
      .from("ime_historico")
      .select("*")
      .eq("user_id", userId)
      .order("data_calculo", { ascending: true }),
    supabase
      .from("checkins_semanais")
      .select("*")
      .eq("user_id", userId)
      .order("data_checkin", { ascending: true }),
  ]);

  const algumErro = [
    resPerfil.error,
    resEmpresa.error,
    resProgresso.error,
    resPaineis.error,
    resIndicadores.error,
    resIme.error,
    resCheckins.error,
  ].some(Boolean);
  if (algumErro) throw new Error("Falha ao carregar os dados.");

  return {
    perfil: (resPerfil.data as Perfil | null) ?? null,
    empresa: (resEmpresa.data as DiagnosticoInicial | null) ?? null,
    progresso: (resProgresso.data ?? []) as ProgressoSemana[],
    paineis: (resPaineis.data ?? []) as PainelMensal[],
    indicadores: (resIndicadores.data ?? []) as IndicadorSemana[],
    ime: (resIme.data ?? []) as ImeHistorico[],
    checkins: (resCheckins.data ?? []) as CheckinSemanal[],
  };
}