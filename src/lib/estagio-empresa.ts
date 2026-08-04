// ------------------------------------------------------------------
// Estágio visual da empresa — derivado do IME (sem tabela no banco).
// A faixa transforma o score do ime_historico em um estágio 1..5.
// Os nomes são placeholders — basta ajustar aqui, sem mexer em lógica.
// ------------------------------------------------------------------

export interface EstagioEmpresa {
  numero: number;
  nome: string;
  faixaMin: number;
  faixaMax: number;
  imagem: string;
}

export const ESTAGIOS_EMPRESA: EstagioEmpresa[] = [
  { numero: 1, nome: "Garagem", faixaMin: 0, faixaMax: 19, imagem: "/assets/empresa/estagio-1.png" },
  { numero: 2, nome: "Oficina", faixaMin: 20, faixaMax: 39, imagem: "/assets/empresa/estagio-2.png" },
  { numero: 3, nome: "Loja", faixaMin: 40, faixaMax: 59, imagem: "/assets/empresa/estagio-3.png" },
  { numero: 4, nome: "Centro de Operações", faixaMin: 60, faixaMax: 79, imagem: "/assets/empresa/estagio-4.png" },
  { numero: 5, nome: "Empresa Profissional", faixaMin: 80, faixaMax: 100, imagem: "/assets/empresa/estagio-5.png" },
] as const;

export function obterEstagioEmpresa(imeScore: number): EstagioEmpresa {
  if (imeScore < 20) return ESTAGIOS_EMPRESA[0];
  if (imeScore < 40) return ESTAGIOS_EMPRESA[1];
  if (imeScore < 60) return ESTAGIOS_EMPRESA[2];
  if (imeScore < 80) return ESTAGIOS_EMPRESA[3];
  return ESTAGIOS_EMPRESA[4];
}

export function estagioPorNumero(numero: number): EstagioEmpresa {
  return ESTAGIOS_EMPRESA[numero - 1] ?? ESTAGIOS_EMPRESA[0];
}

/** Pontos de IME que faltam para subir de estágio (null = no topo). */
export function pontosParaProximoEstagio(
  imeScore: number,
  proximo: EstagioEmpresa | null
): number | null {
  return proximo ? Math.max(0, proximo.faixaMin - imeScore) : null;
}

// ------------------------------------------------------------------
// Classificação pública do IME (usada na página da empresa /empresa/[slug]
// e no card de compartilhamento). Mesmas faixas do estágio visual, mas com
// nomes de "marketing" — é o que aparece para visitantes no lugar do
// número exato do IME (dado interno).
// ------------------------------------------------------------------

export interface ClassificacaoIme {
  numero: number;
  nome: string;
  faixaMin: number;
  faixaMax: number;
}

export const CLASSIFICACOES_IME: ClassificacaoIme[] = [
  { numero: 1, nome: "Empresa Inicial", faixaMin: 0, faixaMax: 19 },
  { numero: 2, nome: "Empresa em Estruturação", faixaMin: 20, faixaMax: 39 },
  { numero: 3, nome: "Empresa em Crescimento", faixaMin: 40, faixaMax: 59 },
  { numero: 4, nome: "Empresa Sólida", faixaMin: 60, faixaMax: 79 },
  { numero: 5, nome: "Empresa Preparada para Escalar", faixaMin: 80, faixaMax: 100 },
] as const;

export function obterClassificacaoIme(imeScore: number): ClassificacaoIme {
  for (const faixa of CLASSIFICACOES_IME) {
    if (imeScore >= faixa.faixaMin && imeScore <= faixa.faixaMax) return faixa;
  }
  return CLASSIFICACOES_IME[0];
}