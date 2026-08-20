import { supabase } from "@/lib/supabase";

export const MOTIVOS = [
  { valor: "parar_fim_de_semana", rotulo: "Parar de trabalhar todo fim de semana" },
  { valor: "reserva_emergencia", rotulo: "Ter uma reserva de emergência, dinheiro guardado" },
  { valor: "contratar_ajudante", rotulo: "Contratar um ajudante, parar de fazer tudo sozinho" },
  { valor: "sair_do_aperto", rotulo: "Sair do aperto financeiro no fim do mês" },
  { valor: "crescer_empresa_de_verdade", rotulo: "Crescer e ter uma empresa de verdade" },
  { valor: "outro", rotulo: "Outro motivo" },
] as const;

export const ROTULO_MOTIVO: Record<string, string> = Object.fromEntries(
  MOTIVOS.map((m) => [m.valor, m.rotulo])
);

export interface MotivoPessoal {
  categoria: string | null;
  detalhe: string | null;
}

export async function carregarMotivoPessoal(userId: string): Promise<MotivoPessoal | null> {
  const { data, error } = await supabase
    .from("diagnostico_inicial")
    .select("motivo_categoria, motivo_detalhe")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return null;
  return data as MotivoPessoal | null;
}

export function textoMotivo(motivo: MotivoPessoal | null): string | null {
  if (!motivo?.categoria) return null;
  if (motivo.detalhe && motivo.detalhe.trim() !== "") return motivo.detalhe.trim();
  return ROTULO_MOTIVO[motivo.categoria] ?? null;
}

export async function motivoJaExibido(userId: string, contexto: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("motivo_exibicoes")
    .select("id")
    .eq("user_id", userId)
    .eq("contexto", contexto)
    .limit(1)
    .maybeSingle();
  if (error) return false;
  return data !== null;
}

export async function registrarMotivoExibido(userId: string, contexto: string): Promise<void> {
  // ignoreDuplicates: no máximo 1 exibição por contexto por dia (índice único
  // com a data) — repetir a chamada no mesmo dia não gera erro nem duplicata.
  await supabase
    .from("motivo_exibicoes")
    .upsert(
      { user_id: userId, contexto, exibido_em: new Date().toISOString() },
      {
        onConflict: "user_id,contexto,exibido_em_dia",
        ignoreDuplicates: true,
      }
    );
}

const MS_DIA = 24 * 60 * 60 * 1000;

export function diasDesdeUltimoLogin(ultimoLogin: string | null): number | null {
  if (!ultimoLogin) return null;
  const [ano, mes, dia] = ultimoLogin.split("-").map(Number);
  if (!ano || !mes || !dia) return null;
  const ultima = new Date(ano, mes - 1, dia);
  const hoje = new Date();
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.round((inicioHoje.getTime() - ultima.getTime()) / MS_DIA);
}
