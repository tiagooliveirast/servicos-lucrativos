import { supabase } from "@/lib/supabase";
import type { CategoriaDuvida, Duvida, StatusDuvida } from "@/lib/types";

export const CATEGORIAS_DUVIDA: { valor: CategoriaDuvida; rotulo: string }[] = [
  { valor: "financeiro", rotulo: "Financeiro" },
  { valor: "comercial", rotulo: "Comercial" },
  { valor: "plataforma", rotulo: "Plataforma" },
  { valor: "conteudo", rotulo: "Conteúdo" },
  { valor: "outro", rotulo: "Outro" },
];

export const ROTULO_CATEGORIA: Record<CategoriaDuvida, string> = {
  financeiro: "Financeiro",
  comercial: "Comercial",
  plataforma: "Plataforma",
  conteudo: "Conteúdo",
  outro: "Outro",
};

export async function criarDuvida(input: {
  categoria: CategoriaDuvida;
  titulo: string;
  mensagem: string;
}): Promise<void> {
  const { error } = await supabase.from("duvidas").insert({
    categoria: input.categoria,
    titulo: input.titulo.trim(),
    mensagem: input.mensagem.trim(),
  });
  if (error) throw new Error("Não foi possível enviar sua dúvida. Tente novamente.");
}

export async function listarMinhasDuvidas(userId: string): Promise<Duvida[]> {
  const { data, error } = await supabase
    .from("duvidas")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Não foi possível carregar suas dúvidas.");
  return (data ?? []) as Duvida[];
}

export async function contarMinhasDuvidasRespondidas(
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("duvidas")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "respondida");
  if (error) return 0;
  return count ?? 0;
}

export async function listarDuvidasAdmin(
  status: StatusDuvida | "todas"
): Promise<Duvida[]> {
  let query = supabase
    .from("duvidas")
    .select("*, perfis(nome, email)")
    .order("created_at", { ascending: true });
  if (status !== "todas") query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw new Error("Não foi possível carregar as dúvidas.");
  return (data ?? []) as Duvida[];
}

export async function contarDuvidasAbertas(): Promise<number> {
  const { count, error } = await supabase
    .from("duvidas")
    .select("id", { count: "exact", head: true })
    .eq("status", "aberta");
  if (error) return 0;
  return count ?? 0;
}

export async function responderDuvida(
  duvidaId: string,
  resposta: string
): Promise<void> {
  const { error } = await supabase
    .from("duvidas")
    .update({
      status: "respondida",
      resposta_admin: resposta.trim(),
      respondida_em: new Date().toISOString(),
    })
    .eq("id", duvidaId);
  if (error)
    throw new Error("Não foi possível responder a dúvida. Você tem permissão de admin?");
}

export async function fecharDuvida(duvidaId: string): Promise<void> {
  const { error } = await supabase
    .from("duvidas")
    .update({ status: "fechada" })
    .eq("id", duvidaId);
  if (error) throw new Error("Não foi possível fechar a dúvida.");
}