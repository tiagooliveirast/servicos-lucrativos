// ------------------------------------------------------------------
// Itens do avatar — derivados de conquistas_usuario (sem tabela nova).
// Cada conquista desbloqueada libera a camada visual correspondente:
// o PNG da camada (public/assets/avatar/item-*.png) sobreposto à base.
// Item bloqueado → silhueta esmaecida; desbloqueado → imagem real.
// O ícone (lucide) é usado apenas nos badges da fila de conquistas.
// Para adicionar um item: criar o arquivo em public/assets/avatar/ e
// adicionar uma entrada aqui (sem mudar arquitetura).
// ------------------------------------------------------------------

import { Gem, HardHat, Shield, Shirt } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface ItemAvatar {
  conquistaCodigo: string;
  nome: string;
  /** PNG real da camada sobre o avatar (mostrado quando desbloqueado). */
  imagem: string;
  /** Ícone usado nos badges da fila de conquistas. */
  icone: LucideIcon;
  /** Posição da camada sobre o avatar (classe CSS com posição fixa). */
  classe: string;
}

export const ITENS_AVATAR: ItemAvatar[] = [
  {
    conquistaCodigo: "modulo_1_completo",
    nome: "Capacete de obra",
    imagem: "/assets/avatar/item-modulo-1.png",
    icone: HardHat,
    classe: "left-1/2 top-[14%] -translate-x-1/2",
  },
  {
    conquistaCodigo: "modulo_2_completo",
    nome: "Uniforme da empresa",
    imagem: "/assets/avatar/item-modulo-2.png",
    icone: Shirt,
    classe: "left-1/2 top-[58%] -translate-x-1/2",
  },
  {
    conquistaCodigo: "modulo_3_completo",
    nome: "Distintivo de autoridade",
    imagem: "/assets/avatar/item-modulo-3.png",
    icone: Shield,
    classe: "left-[22%] top-[66%]",
  },
  {
    conquistaCodigo: "ime_70",
    nome: "Insígnia dourada",
    imagem: "/assets/avatar/item-ime-70.png",
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
