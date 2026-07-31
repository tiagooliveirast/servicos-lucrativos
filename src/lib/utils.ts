import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBRL(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

export function formatNumero(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return "—";
  return new Intl.NumberFormat("pt-BR").format(valor);
}

export function formatPorcento(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return "—";
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(valor)}%`;
}

export function formatData(data: string | null | undefined): string {
  if (!data) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(
    new Date(data)
  );
}

export function formatarQuando(iso: string): string {
  const data = new Date(iso);
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
