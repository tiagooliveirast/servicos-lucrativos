// ============================================================
// Vídeos institucionais — URLs fixas no código (fora do admin).
//
// Diferente das 12 aulas semanais (tabela aulas_semana + painel
// admin), estes 5 vídeos quase não mudam depois de gravados, então
// ficam como constantes aqui. O Tiago preenche a URL do YouTube
// quando gravar cada um.
//
// Enquanto a URL estiver vazia, as telas mostram o mesmo padrão
// "em breve" das aulas semanais — nada quebra, nada de erro.
// ============================================================

export const VIDEO_BOAS_VINDAS = ""; // URL do YouTube — Tiago preenche quando gravar
export const VIDEO_COMO_FUNCIONA = ""; // URL do YouTube

export const VIDEOS_ABERTURA_MODULO: Record<number, string> = {
  1: "", // Abertura Módulo 1
  2: "", // Abertura Módulo 2
  3: "", // Abertura Módulo 3
};
