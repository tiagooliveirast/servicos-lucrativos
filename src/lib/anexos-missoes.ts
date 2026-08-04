import { supabase } from "@/lib/supabase";
import type { MissaoAnexo, StatusAnexo } from "@/lib/types";

export interface AnexoEsperado {
  semana: number;
  tipo: string;
  rotulo: string;
  descricao: string;
  aceitos: string;
}

// Onde faz sentido pedir upload (proposta v1 — ajustável no Tiago).
export const ANEXOS_ESPERADOS: AnexoEsperado[] = [
  {
    semana: 2,
    tipo: "tabela_precos",
    rotulo: "Minha Tabela de Preços",
    descricao:
      "Envie o arquivo da sua tabela de preços (foto, planilha ou PDF) para o Tiago revisar.",
    aceitos: "Foto, planilha ou PDF — até 15 MB.",
  },
  {
    semana: 6,
    tipo: "pop",
    rotulo: "Meu POP documentado",
    descricao:
      "Envie o documento com o seu processo completo (POP) para o Tiago revisar.",
    aceitos: "Foto, texto ou PDF — até 15 MB.",
  },
];

export function anexoEsperadoDaSemana(semana: number): AnexoEsperado | null {
  return ANEXOS_ESPERADOS.find((a) => a.semana === semana) ?? null;
}

export function rotuloTipoAnexo(tipo: string): string {
  return (
    ANEXOS_ESPERADOS.find((a) => a.tipo === tipo)?.rotulo ??
    {
      tabela_precos: "Tabela de Preços",
      pop: "POP",
      foto_oficina: "Foto da oficina",
    }[tipo] ??
    tipo
  );
}

export async function listarMeusAnexos(
  userId: string,
  semana: number,
  tipo: string
): Promise<MissaoAnexo[]> {
  const { data, error } = await supabase
    .from("missoes_anexos")
    .select("*")
    .eq("user_id", userId)
    .eq("semana_numero", semana)
    .eq("tipo_anexo", tipo)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Não foi possível carregar os anexos.");
  return (data ?? []) as MissaoAnexo[];
}

export async function enviarAnexo(
  userId: string,
  semana: number,
  tipo: string,
  arquivo: File
): Promise<void> {
  const extensao = arquivo.name.split(".").pop()?.toLowerCase() ?? "arquivo";
  const nomeBase = arquivo.name.replace(/\.[^/.]+$/, "").slice(0, 60);
  const caminho = `${userId}/${semana}-${tipo}-${Date.now()}.${extensao}`;

  const { error: erroUpload } = await supabase.storage
    .from("missoes-anexos")
    .upload(caminho, arquivo, { upsert: false });
  if (erroUpload) {
    throw new Error(
      erroUpload.message.includes("RLS")
        ? "Envio negado — você só pode enviar para a própria pasta."
        : "Não foi possível enviar o arquivo. Tente novamente."
    );
  }

  const { error: erroRegistro } = await supabase.from("missoes_anexos").insert({
    user_id: userId,
    semana_numero: semana,
    tipo_anexo: tipo,
    storage_path: caminho,
    nome_arquivo: `${nomeBase}.${extensao}`,
    status: "pendente",
  });
  if (erroRegistro) {
    void supabase.storage.from("missoes-anexos").remove([caminho]);
    throw new Error("Não foi possível registrar o anexo. Tente novamente.");
  }
}

export async function listarAnexosPendentesAdmin(): Promise<MissaoAnexo[]> {
  const { data, error } = await supabase
    .from("missoes_anexos")
    .select("*, perfis(nome, email)")
    .eq("status", "pendente")
    .order("created_at", { ascending: true });
  if (error) throw new Error("Não foi possível carregar os anexos pendentes.");
  return (data ?? []) as MissaoAnexo[];
}

export async function listarAnexosRevisadosAdmin(limite = 15): Promise<MissaoAnexo[]> {
  const { data, error } = await supabase
    .from("missoes_anexos")
    .select("*, perfis(nome, email)")
    .in("status", ["aprovado", "rejeitado"])
    .order("created_at", { ascending: false })
    .limit(limite);
  if (error) throw new Error("Não foi possível carregar os anexos revisados.");
  return (data ?? []) as MissaoAnexo[];
}

export async function contarAnexosPendentes(): Promise<number> {
  const { count, error } = await supabase
    .from("missoes_anexos")
    .select("id", { count: "exact", head: true })
    .eq("status", "pendente");
  if (error) return 0;
  return count ?? 0;
}

export async function avaliarAnexoAdmin(
  anexoId: string,
  status: Exclude<StatusAnexo, "pendente">,
  comentario: string | null
): Promise<void> {
  const { error } = await supabase
    .from("missoes_anexos")
    .update({
      status,
      comentario_admin: comentario?.trim() || null,
    })
    .eq("id", anexoId);
  if (error)
    throw new Error("Não foi possível avaliar o anexo. Você tem permissão de admin?");
}

export async function urlAssinadaAnexo(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("missoes-anexos")
    .createSignedUrl(storagePath, 60);
  if (error || !data) throw new Error("Não foi possível gerar o link do arquivo.");
  return data.signedUrl;
}