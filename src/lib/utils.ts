import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ValorNumerico = number | string | null | undefined;

function paraNumero(valor: ValorNumerico): number | null {
  if (valor === null || valor === undefined) return null;
  const n = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(n) ? n : null;
}

export function formatBRL(valor: ValorNumerico): string {
  const n = paraNumero(valor);
  if (n === null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}

export function formatNumero(valor: ValorNumerico): string {
  const n = paraNumero(valor);
  if (n === null) return "—";
  return new Intl.NumberFormat("pt-BR").format(n);
}

export function formatPorcento(valor: ValorNumerico): string {
  const n = paraNumero(valor);
  if (n === null) return "—";
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(n)}%`;
}

export function formatData(data: string | null | undefined): string {
  if (!data) return "—";
  const d = new Date(data);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(d);
}

export function formatarQuando(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "—";
  const agora = new Date();
  const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const inicioData = new Date(data.getFullYear(), data.getMonth(), data.getDate());
  const dias = Math.round((inicioHoje.getTime() - inicioData.getTime()) / 86400000);
  const hora = data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (dias <= 0) return `Hoje, ${hora}`;
  if (dias === 1) return `Ontem, ${hora}`;
  return `${dias} dias atrás`;
}

export function semanaAtualDe(concluidas: number[]): number {
  if (concluidas.length === 0) return 1;
  const ultima = Math.max(...concluidas);
  return ultima >= 12 ? 12 : ultima + 1;
}

export function slug(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function extrairVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([\w-]{11})/
  );
  return match ? match[1] : null;
}

const PADRAO_ERRO_TECNICO =
  /(error|failed|violates|duplicate|invalid|undefined|permission denied|could not|fetch|network|jwt|auth session|token|expected|unexpected|null)/i;

export function mensagemErroAmigavel(
  err: unknown,
  fallback = "Algo deu errado. Tente novamente."
): string {
  const original =
    err instanceof Error
      ? err.message
      : err === null || err === undefined
        ? ""
        : String(err);
  if (original.trim()) console.error("Erro não tratado:", original);
  if (!original.trim()) return fallback;

  const msg = original.trim();
  if (/Invalid login credentials/.test(msg)) {
    return "E-mail ou senha incorretos.";
  }
  if (/Email not confirmed/.test(msg)) {
    return "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada (e o spam).";
  }
  if (/already registered/.test(msg)) {
    return "Este e-mail já está cadastrado. Tente entrar.";
  }
  if (/Password should be at least 6 characters/.test(msg)) {
    return "A senha precisa ter pelo menos 6 caracteres.";
  }
  if (/Unable to validate email address/.test(msg)) {
    return "E-mail inválido. Verifique e tente novamente.";
  }
  if (/duplicate key/.test(msg)) {
    return "Este registro já existe. Atualize a página e tente novamente.";
  }
  if (/violates row-level security policy|permission denied/.test(msg)) {
    return "Você não tem permissão para realizar esta ação.";
  }
  if (/Failed to fetch|NetworkError|fetch failed|network request failed/.test(msg)) {
    return "Sem conexão com a internet. Verifique sua conexão e tente novamente.";
  }
  if (/JWT|jwt|Auth session missing|token (is )?(invalid|expired)/.test(msg)) {
    return "Sua sessão expirou. Faça login novamente.";
  }
  if (PADRAO_ERRO_TECNICO.test(msg)) return fallback;
  return msg;
}
