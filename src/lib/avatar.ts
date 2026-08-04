// ------------------------------------------------------------------
// Itens do avatar — derivados de conquistas_usuario (sem tabela nova).
// Cada conquista desbloqueada libera a camada visual correspondente.
// Para adicionar um item: criar o arquivo em public/assets/avatar/ e
// adicionar uma entrada aqui (sem mudar arquitetura).
// ------------------------------------------------------------------

export interface ItemAvatar {
  conquistaCodigo: string;
  nome: string;
  imagem: string;
  /** Posição da camada sobre o avatar (classe CSS com posição fixa). */
  classe: string;
}

export const ITENS_AVATAR: ItemAvatar[] = [
  {
    conquistaCodigo: "modulo_1_completo",
    nome: "Capacete de obra",
    imagem: "/assets/avatar/item-modulo-1.png",
    classe: "left-1/2 top-[14%] -translate-x-1/2",
  },
  {
    conquistaCodigo: "modulo_2_completo",
    nome: "Uniforme da empresa",
    imagem: "/assets/avatar/item-modulo-2.png",
    classe: "left-1/2 top-[58%] -translate-x-1/2",
  },
  {
    conquistaCodigo: "modulo_3_completo",
    nome: "Distintivo de autoridade",
    imagem: "/assets/avatar/item-modulo-3.png",
    classe: "left-[22%] top-[66%]",
  },
  {
    conquistaCodigo: "ime_70",
    nome: "Insígnia dourada",
    imagem: "/assets/avatar/item-ime-70.png",
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