import { supabase } from "@/lib/supabase";

export type OrigemAnalise = "ia" | "cache" | "fallback";

export interface AnaliseIa {
  texto: string;
  origem: OrigemAnalise;
}

// A Edge Function decide se gera novo, retorna o cache do dia ou cai no
// fallback. Este helper garante a degradação graciosa do lado do client:
// nunca lança, e interrompe após TIMEOUT_MS para o card nunca ficar em
// loading infinito.
const TIMEOUT_MS = 12000;

export async function buscarAnaliseIa(): Promise<AnaliseIa | null> {
  try {
    const resposta = await Promise.race([
      supabase.functions.invoke<{ texto?: unknown; origem?: unknown }>("gerar-analise-diaria"),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), TIMEOUT_MS)),
    ]);

    if (!resposta || resposta.error) return null;
    const texto =
      typeof resposta.data?.texto === "string" ? resposta.data.texto.trim() : "";
    if (!texto) return null;
    const origem: OrigemAnalise =
      resposta.data?.origem === "fallback" ? "fallback" : "ia";
    return { texto, origem };
  } catch {
    return null;
  }
}