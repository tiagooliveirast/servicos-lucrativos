import { supabase } from "@/lib/supabase";
import type { SemanaConteudo } from "@/lib/conteudo";
import type { DicaPreenchimentoSemana } from "@/lib/types";

export interface DicaGerada {
  texto: string;
  modelo: string;
}

export async function buscarDicaSemana(
  userId: string,
  semanaNumero: number
): Promise<DicaPreenchimentoSemana | null> {
  const { data, error } = await supabase
    .from("dicas_preenchimento_semana")
    .select("*")
    .eq("user_id", userId)
    .eq("semana_numero", semanaNumero)
    .maybeSingle();

  if (error) throw error;
  return data as DicaPreenchimentoSemana | null;
}

function payloadDaSemana(semana: SemanaConteudo) {
  return {
    titulo: semana.titulo ?? "",
    objetivo: semana.objetivo ?? "",
    explicacao: semana.explicacao ?? [],
    dicas: (semana.dicas ?? []).map((d) => ({
      titulo: d.titulo ?? "",
      texto: d.texto ?? "",
    })),
    campos: (semana.campos ?? []).map((c) => ({
      rotulo: c.rotulo,
      tipo: c.tipo ?? "texto",
      obrigatorio: "obrigatorio" in c ? c.obrigatorio === true : false,
      dica: c.dica ?? null,
      exemplo: c.exemplo ?? null,
    })),
  };
}

export async function gerarDicaSemana(
  semanaNumero: number,
  semana: SemanaConteudo
): Promise<DicaGerada> {
  const { data, error } = await supabase.functions.invoke("gerar-dica-semana", {
    body: {
      semana_numero: semanaNumero,
      semana: payloadDaSemana(semana),
    },
  });

  if (error) {
    throw new Error(
      (error.context as { message?: string })?.message ?? "Não foi possível gerar a dica agora."
    );
  }
  if (!data?.texto) {
    throw new Error("Não foi possível gerar a dica agora.");
  }
  return { texto: data.texto as string, modelo: (data.modelo as string) ?? "" };
}
