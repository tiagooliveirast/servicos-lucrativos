import { supabase } from "@/lib/supabase";
import type { NivelConfiancaFaturamento } from "@/lib/types";

/**
 * Dados expostos pela página pública. A leitura é feita por UMA função
 * security definer (`buscar_pagina_publica`) que devolve apenas o que a
 * vitrine deve mostrar — nunca custos/lucro pessoais, e o faturamento só
 * quando o aluno ativou o toggle específico.
 */

export interface ChavePublica {
  codigo: string;
  titulo: string;
  cor_hex: string;
  ordem: number;
  desbloqueada_em: string;
}

export interface FaturamentoPublico {
  valor: number;
  nivel_confianca: NivelConfiancaFaturamento;
  data_referencia: string;
}

export interface PontoImePublico {
  data: string;
  valor: number;
}

export interface PaginaPublica {
  slug: string;
  nome_empresa: string | null;
  cidade: string | null;
  estado: string | null;
  ime_atual: number | null;
  ime_historico: PontoImePublico[];
  chave: ChavePublica | null;
  faturamento: FaturamentoPublico | null;
  certificado_disponivel: boolean;
}

/** Retorna os dados da página pública, ou null se o slug não existir/inativo. */
export async function buscarPaginaPublica(
  slug: string
): Promise<PaginaPublica | null> {
  const { data, error } = await supabase.rpc("buscar_pagina_publica", {
    slug,
  });

  if (error) {
    throw new Error("Falha ao carregar a página da empresa.");
  }

  return (data as PaginaPublica | null) ?? null;
}

/** Ícone/frase do rodapé e cabeçalho da vitrine. */
export const RODAPE_VITRINE = "Serviços Lucrativos — O Plano de 90 Dias";