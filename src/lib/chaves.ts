import { supabase } from "@/lib/supabase";
import type { Chave, ChaveUsuario, EscudoAtual } from "@/lib/types";

export const WHATSAPP_TIAGO = "5571993262999";

export interface ChavesDaJornada {
  catalogo: Chave[];
  desbloqueadas: ChaveUsuario[];
  escudo: EscudoAtual | null;
}

export async function carregarChaves(userId: string): Promise<ChavesDaJornada> {
  const [resCatalogo, resDesbloqueadas, resEscudo] = await Promise.all([
    supabase.from("chaves").select("*").order("ordem"),
    supabase
      .from("chaves_usuario")
      .select("id, user_id, chave_id, desbloqueada_em, solicitacao_fisica_status, solicitacao_fisica_em, chaves(*)")
      .eq("user_id", userId)
      .order("desbloqueada_em"),
    supabase
      .from("escudo_atual_usuario")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (resCatalogo.error || resDesbloqueadas.error || resEscudo.error) {
    throw new Error("Falha ao carregar as chaves.");
  }

  return {
    catalogo: (resCatalogo.data ?? []) as Chave[],
    desbloqueadas: (resDesbloqueadas.data ?? []) as unknown as ChaveUsuario[],
    escudo: (resEscudo.data as EscudoAtual | null) ?? null,
  };
}

export async function carregarChavesAdmin(
  userId: string
): Promise<ChaveUsuario[]> {
  const { data, error } = await supabase
    .from("chaves_usuario")
    .select("id, user_id, chave_id, desbloqueada_em, solicitacao_fisica_status, solicitacao_fisica_em, chaves(*)")
    .eq("user_id", userId)
    .order("desbloqueada_em");

  if (error) throw new Error("Falha ao carregar as chaves do aluno.");

  return (data ?? []) as unknown as ChaveUsuario[];
}

export function montarLinkChaveFisica(
  nomeAluno: string,
  chaveTitulo: string
): string {
  const mensagem = [
    `Olá, Tiago! Acabei de desbloquear a ${chaveTitulo} no Serviços Lucrativos.`,
    `Meu nome é ${nomeAluno}.`,
    "Pode me enviar minha chave física?",
  ].join("\n\n");
  return `https://wa.me/${WHATSAPP_TIAGO}?text=${encodeURIComponent(mensagem)}`;
}

export async function solicitarChaveFisica(
  chaveUsuarioId: string
): Promise<void> {
  const { error } = await supabase
    .from("chaves_usuario")
    .update({
      solicitacao_fisica_status: "solicitada",
      solicitacao_fisica_em: new Date().toISOString(),
    })
    .eq("id", chaveUsuarioId);

  if (error) throw new Error("Não foi possível registrar a solicitação.");
}

export async function marcarChaveEnviada(chaveUsuarioId: string): Promise<void> {
  const { error } = await supabase
    .from("chaves_usuario")
    .update({ solicitacao_fisica_status: "enviada" })
    .eq("id", chaveUsuarioId);

  if (error) throw new Error("Não foi possível atualizar o status da chave.");
}
