// ------------------------------------------------------------------
// Itens do avatar — derivados de conquistas_usuario (sem tabela nova).
// Cada conquista desbloqueada libera a camada visual correspondente.
// As camadas são ícones SVG inline (lucide): não dependem de rede nem
// de arquivos externos, então nunca podem falhar como imagens.
// Para adicionar um item: escolher um ícone do lucide-react e adicionar
// uma entrada aqui (sem mudar arquitetura).
// ------------------------------------------------------------------

import { Gem, HardHat, Shield, Shirt } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface ItemAvatar {
  conquistaCodigo: string;
  nome: string;
  /** Ícone da camada (SVG inline — nunca falha por rede). */
  icone: LucideIcon;
  /** Posição da camada sobre o avatar (classe CSS com posição fixa). */
  classe: string;
}

export const ITENS_AVATAR: ItemAvatar[] = [
  {
    conquistaCodigo: "modulo_1_completo",
    nome: "Capacete de obra",
    icone: HardHat,
    classe: "left-1/2 top-[14%] -translate-x-1/2",
  },
  {
    conquistaCodigo: "modulo_2_completo",
    nome: "Uniforme da empresa",
    icone: Shirt,
    classe: "left-1/2 top-[58%] -translate-x-1/2",
  },
  {
    conquistaCodigo: "modulo_3_completo",
    nome: "Distintivo de autoridade",
    icone: Shield,
    classe: "left-[22%] top-[66%]",
  },
  {
    conquistaCodigo: "ime_70",
    nome: "Insígnia dourada",
    icone: Gem,
    classe: "right-[18%] top-[20%]",
  },
];

export const AVATAR_BASE = {
  imagem: "/assets/avatar/base.png",
  nome: "Minha empresa",
};

export function itemConquistado(
  codigo: string,
  conquistasDesbloqueadas: Set<string>
): boolean {
  return conquistasDesbloqueadas.has(codigo);
}
