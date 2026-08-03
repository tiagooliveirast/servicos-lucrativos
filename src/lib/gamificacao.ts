import { supabase } from "@/lib/supabase";
import type {
  Bau,
  BauUsuario,
  Conquista,
  ConquistaUsuario,
  GamificacaoUsuario,
} from "@/lib/types";

/**
 * Registra o login diário do usuário autenticado (streak + XP do dia).
 * A regra roda no servidor (current_date), então chamar mais de uma vez
 * no mesmo dia não dá XP novamente.
 */
export async function registrarLoginDiario(): Promise<void> {
  await supabase.rpc("registrar_login_diario");
}

/**
 * Carrega o perfil de gamificação (XP, nível, streak) do usuário.
 * Retorna null quando ainda não existe registro (ex.: usuário nunca logou
 * após a feature ser liberada — o RPC de login cria a linha).
 */
export async function carregarPerfilGamificacao(
  userId: string
): Promise<GamificacaoUsuario | null> {
  const { data, error } = await supabase
    .from("gamificacao_usuario")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error("Falha ao carregar a sua pontuação.");

  return data ?? null;
}

export interface ConquistasDaJornada {
  catalogo: Conquista[];
  desbloqueadas: ConquistaUsuario[];
}

/**
 * Carrega o catálogo completo de conquistas + as que o usuário já
 * desbloqueou (para marcar em destaque na página).
 */
export async function carregarConquistas(
  userId: string
): Promise<ConquistasDaJornada> {
  const [resCatalogo, resDesbloqueadas] = await Promise.all([
    supabase
      .from("conquistas")
      .select("*")
      .order("codigo"),
    supabase
      .from("conquistas_usuario")
      .select("id, user_id, conquista_id, desbloqueada_em, conquistas(*)")
      .eq("user_id", userId),
  ]);

  if (resCatalogo.error || resDesbloqueadas.error) {
    throw new Error("Falha ao carregar as conquistas.");
  }

  return {
    catalogo: (resCatalogo.data ?? []) as Conquista[],
    desbloqueadas: (resDesbloqueadas.data ?? []) as unknown as ConquistaUsuario[],
  };
}

/**
 * Carrega os baús: catálogo completo + os do usuário (para saber quais
 * estão desbloqueados, abertos ou ainda fechados).
 */
export async function carregarBauis(userId: string): Promise<BauUsuario[]> {
  const { data, error } = await supabase
    .from("bauis_usuario")
    .select("id, user_id, baul_id, aberto, desbloqueado_em, aberto_em, bauis(*)")
    .eq("user_id", userId)
    .order("desbloqueado_em", { ascending: false });

  if (error) throw new Error("Falha ao carregar os seus baús.");

  return (data ?? []) as unknown as BauUsuario[];
}

/**
 * Abre um baú do usuário (marca como aberto com aberto_em agora).
 */
export async function abrirBau(bauUsuarioId: string): Promise<Bau | null> {
  const { data, error } = await supabase
    .from("bauis_usuario")
    .update({ aberto: true, aberto_em: new Date().toISOString() })
    .eq("id", bauUsuarioId)
    .select("bauis(*)")
    .single();

  if (error) throw new Error("Não foi possível abrir o baú agora.");

  if (!data?.bauis) return null;

  return data.bauis as unknown as Bau;
}