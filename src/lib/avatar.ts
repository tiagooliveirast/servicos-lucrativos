// ------------------------------------------------------------------
// Itens do avatar — derivados de conquistas_usuario (sem tabela nova).
// Cada conquista desbloqueada libera a camada visual correspondente:
// o PNG da camada (public/assets/avatar/item-*.png) sobreposto à base
// na posição do equipamento no boneco. Itens bloqueados aparecem na
// "vitrine" lateral ao lado do avatar, sem cor (slots cinza).
// Para adicionar um item: criar o arquivo em public/assets/avatar/ e
// adicionar uma entrada aqui (sem mudar arquitetura).
// ------------------------------------------------------------------

export interface ItemAvatar {
  conquistaCodigo: string;
  nome: string;
  /** PNG real da camada sobre o avatar (mostrado quando desbloqueado). */
  imagem: string;
  /** Posição da camada sobre o avatar (classe CSS com posição fixa). */
  classe: string;
}

export const ITENS_AVATAR: ItemAvatar[] = [
  {
    conquistaCodigo: "modulo_1_completo",
    nome: "Capacete de obra",
    imagem: "/assets/avatar/item-modulo-1.png",
    classe: "left-1/2 top-[3%] -translate-x-1/2",
  },
  {
    conquistaCodigo: "modulo_2_completo",
    nome: "Uniforme da empresa",
    imagem: "/assets/avatar/item-modulo-2.png",
    classe: "left-1/2 top-[38%] -translate-x-1/2",
  },
  {
    conquistaCodigo: "modulo_3_completo",
    nome: "Distintivo de autoridade",
    imagem: "/assets/avatar/item-modulo-3.png",
    classe: "left-[26%] top-[42%]",
  },
  {
    conquistaCodigo: "ime_70",
    nome: "Insígnia dourada",
    imagem: "/assets/avatar/item-ime-70.png",
    classe: "right-[26%] top-[42%]",
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
