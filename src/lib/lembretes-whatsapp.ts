// ============================================================
// Lembrete manual via WhatsApp (Prompt #27)
//
// O Tiago abre o link wa.me com a mensagem pronta e manda ele
// mesmo. Este módulo centraliza: limpeza do número, montagem do
// link, mensagem personalizada (nome + dias sem login + missão
// da semana — mesma lógica da Sala de Guerra) e o texto de
// "enviado há X dias" da lista.
// ============================================================

import { SEMANA_POR_NUMERO } from "@/lib/conteudo";
import type { Missao } from "@/lib/types";

export function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

export function montarLinkWhatsApp(whatsapp: string, mensagem: string): string {
  return `https://wa.me/55${apenasDigitos(whatsapp)}?text=${encodeURIComponent(mensagem)}`;
}

export function montarMensagemLembrete(opcoes: {
  nome: string | null;
  diasSemLogin: number;
  semana: number;
  missao: string;
}): string {
  const nome = opcoes.nome?.trim() || "você";
  return (
    `Oi ${nome}! Notei que faz ${opcoes.diasSemLogin} dias que você não acessa a plataforma.\n` +
    `Sua missão da Semana ${opcoes.semana} ainda tá esperando: "${opcoes.missao}"\n\n` +
    `Precisa de alguma ajuda pra continuar? Qualquer coisa me chama por aqui mesmo 🙂`
  );
}

// Semana atual = mesma regra da Sala de Guerra (semanaAtualDe):
// última semana concluída + 1, cap 12; 1 se nada concluído.
export function missaoPendenteDe(
  pendentes: Pick<Missao, "semana" | "tipo" | "indice" | "descricao">[],
  semana: number
): string {
  const daSemana = pendentes
    .filter((m) => m.semana === semana)
    .sort(
      (a, b) =>
        (a.tipo === "principal" ? 0 : 1) - (b.tipo === "principal" ? 0 : 1) || a.indice - b.indice
    );
  if (daSemana.length > 0) return daSemana[0].descricao;
  const conteudo = SEMANA_POR_NUMERO.get(semana);
  return conteudo?.missoes[0]?.descricao ?? "continue o passo a passo da semana atual";
}

export function formatarUltimoLembrete(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "Lembrete enviado";
  const agora = new Date();
  const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const inicioData = new Date(data.getFullYear(), data.getMonth(), data.getDate());
  const dias = Math.round((inicioHoje.getTime() - inicioData.getTime()) / 86400000);
  if (dias <= 0) return "Lembrete enviado hoje";
  if (dias === 1) return "Lembrete enviado há 1 dia";
  return `Lembrete enviado há ${dias} dias`;
}
