import { supabase } from "@/lib/supabase";
import { diaCalendario } from "@/lib/trava-semanas";
import type { AtividadeDiaria } from "@/lib/types";
import { semanaAtualDe } from "@/lib/utils";

// ------------------------------------------------------------------
// Atividades diárias — uma ação pequena e concreta por dia.
//
// Qual atividade é a "de hoje" sai do dia calendário do aluno
// (acessos.data_primeiro_acesso — mesma fonte da trava de tempo):
//   dia_calendario = dias desde o início + 1  (1 a 84+)
//   semana         = floor((dia-1)/7)+1
//   dia_da_semana  = ((dia-1) mod 7)+1
//
// Aluno atrasado (dia calendário aponta para semana ainda bloqueada
// por não ter concluído a anterior) vê a atividade da semana
// atualmente desbloqueada, nunca a da semana futura.
// ------------------------------------------------------------------

/** XP concedido ao marcar uma atividade diária (5 XP < missão de 10 XP). */
export const XP_ATIVIDADE_DIARIA = 5;

export interface AtividadeDeHoje {
  atividade: AtividadeDiaria;
  /** Já marcada pelo aluno (independente do dia). */
  marcada: boolean;
  /** Semana efetivamente usada (calendário ou a desbloqueada, se menor). */
  semanaEfetiva: number;
  /** Dia calendário do aluno (1 = dia do acesso). */
  diaDoPlano: number;
}

export function semanaEDiaCalendario(dia: number): { semana: number; diaDaSemana: number } {
  return {
    semana: Math.floor((dia - 1) / 7) + 1,
    diaDaSemana: ((dia - 1) % 7) + 1,
  };
}

/**
 * Calcula a atividade de hoje. Recebe os dados já carregados (sem
 * consultas extras): data de início, progresso das semanas, catálogo
 * completo e ids das marcações do aluno.
 */
export function calcularAtividadeDeHoje({
  inicio,
  progresso,
  catalogo,
  marcadas,
}: {
  inicio: string | null;
  progresso: { semana: number; status: string }[];
  catalogo: AtividadeDiaria[];
  marcadas: string[];
}): AtividadeDeHoje | null {
  const dia = diaCalendario(inicio);
  if (dia === null) return null;

  const calendario = semanaEDiaCalendario(dia);
  const concluidas = progresso
    .filter((s) => s.status === "concluida")
    .map((s) => s.semana);
  const semanaDesbloqueada = semanaAtualDe(concluidas);
  const semanaEfetiva = Math.min(calendario.semana, semanaDesbloqueada);

  const atividade =
    catalogo.find(
      (a) => a.semana_numero === semanaEfetiva && a.dia_da_semana === calendario.diaDaSemana
    ) ?? null;
  if (!atividade) return null;

  return {
    atividade,
    marcada: marcadas.includes(atividade.id),
    semanaEfetiva,
    diaDoPlano: dia,
  };
}

/**
 * Marca a atividade como feita (insere a marcação do aluno).
 * Retorna false apenas em falha real — duplicata (já marcada) é
 * tratada como sucesso: o unique(user_id, atividade_id) garante que
 * o servidor não concede XP de novo.
 */
export async function marcarAtividadeDeHoje(userId: string, atividadeId: string): Promise<boolean> {
  const { error } = await supabase
    .from("atividades_diarias_usuario")
    .insert({ user_id: userId, atividade_id: atividadeId });
  if (!error) return true;
  if (error.code === "23505") return true; // já marcada
  return false;
}
