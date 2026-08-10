import { supabase } from "@/lib/supabase";

// ------------------------------------------------------------------
// Trava de tempo mínimo entre semanas (espelho client da regra do
// banco — migration 0034). O BANCO é a fonte da verdade; estas
// funções servem para a UI calcular datas/dias restantes e decidir
// qual mensagem mostrar.
//
// Regra: Semana N libera a partir do dia 7×(N-1), contando o dia do
// acesso como dia 1 (ex.: Semana 2 libera no dia 7, Semana 3 no dia
// 14, Semana 4 no dia 21...).
// ------------------------------------------------------------------

const MS_DIA = 24 * 60 * 60 * 1000;

/** Data base do "dia 1" (data_primeiro_acesso com fallback em created_at). */
export function dataInicioPlano(acesso: { data_primeiro_acesso: string | null; created_at: string | null } | null): string | null {
  if (!acesso) return null;
  return acesso.data_primeiro_acesso ?? acesso.created_at;
}

/**
 * Dias corridos desde o início do plano (0 = próprio dia do acesso).
 * Retorna null quando não há data confiável.
 */
export function diasCorridosDoPlano(inicio: string | null | undefined): number | null {
  if (!inicio) return null;
  const data = new Date(inicio);
  if (Number.isNaN(data.getTime())) return null;
  const hoje = new Date();
  const inicioDia = Date.UTC(data.getFullYear(), data.getMonth(), data.getDate());
  const hojeDia = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.floor((hojeDia - inicioDia) / MS_DIA);
}

/**
 * Dia calendário do aluno (1 = dia do acesso, vai até 84+).
 * Mesma base usada pelas atividades diárias.
 */
export function diaCalendario(inicio: string | null | undefined): number | null {
  const dias = diasCorridosDoPlano(inicio);
  return dias === null ? null : dias + 1;
}

/** Data (dia) em que a Semana N libera por tempo. Null sem data base. */
export function dataLiberacaoSemana(inicio: string | null | undefined, semana: number): Date | null {
  if (!inicio || semana < 2) return null;
  const data = new Date(inicio);
  if (Number.isNaN(data.getTime())) return null;
  const d = new Date(Date.UTC(data.getFullYear(), data.getMonth(), data.getDate()));
  d.setUTCDate(d.getUTCDate() + 7 * (semana - 1) - 1);
  return d;
}

/** Dias restantes (inteiros) até a Semana N liberar. 0/null = já liberada ou sem data. */
export function diasAteLiberacao(inicio: string | null | undefined, semana: number): number | null {
  if (semana < 2) return 0;
  const liberacao = dataLiberacaoSemana(inicio, semana);
  if (!liberacao) return null;
  const hoje = new Date();
  const hojeDia = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const dias = Math.ceil((liberacao.getTime() - hojeDia) / MS_DIA);
  return Math.max(0, dias);
}

/**
 * Chama a RPC que desbloqueia as semanas cujo tempo mínimo já passou
 * (idempotente; só desbloqueia, nunca re-bloqueia). Chamada ao abrir
 * a Sala de Guerra, o Painel e uma semana — é o que faz a Semana N
 * "liberar sozinha" no dia certo, sem ação manual.
 */
export async function liberarSemanasPorTempo(): Promise<void> {
  try {
    await supabase.rpc("liberar_semanas_por_tempo");
  } catch {
    // Best-effort: se falhar (rede/erro), apenas não libera agora.
  }
}
