import { Download, Loader2, Share2, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { obterClassificacaoIme } from "@/lib/estagio-empresa";
import { slugificar } from "@/lib/slug";
import { supabase } from "@/lib/supabase";
import type { NivelConfiancaFaturamento } from "@/lib/types";
import { formatBRL } from "@/lib/utils";

const OURO = "#C9A227";
const PRETO = "#0A0A0A";

interface DadosCompartilhar {
  empresaNome: string | null;
  cidade: string | null;
  estado: string | null;
  paginaAtiva: boolean;
  mostrarFaturamento: boolean;
  imeInicial: number | null;
  imeFinal: number | null;
  chave: { titulo: string; cor_hex: string } | null;
  faturamento: { valor: number; nivel_confianca: NivelConfiancaFaturamento } | null;
  diasJornada: number | null;
}

interface IconeChaveProps {
  color: string;
  className?: string;
}

function IconeChave({ color, className }: IconeChaveProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4" />
      <path d="m21 2-9.6 9.6" />
      <circle cx="7.5" cy="15.5" r="5.5" />
    </svg>
  );
}

async function carregarDadosCompartilhar(userId: string): Promise<DadosCompartilhar> {
  const [resPerfil, resEmpresa, resIme, resFat, resChave, resAcesso] = await Promise.all([
    supabase
      .from("perfis")
      .select("pagina_publica_ativa, pagina_publica_mostrar_faturamento, cidade, estado")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("diagnostico_inicial")
      .select("nome_empresa")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("ime_historico")
      .select("score_total")
      .eq("user_id", userId)
      .order("data_calculo", { ascending: true }),
    supabase
      .from("faturamento_validado")
      .select("valor, nivel_confianca")
      .eq("user_id", userId)
      .order("data_referencia", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("chaves_usuario")
      .select("chaves(titulo, cor_hex)")
      .eq("user_id", userId)
      .order("desbloqueada_em", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("acessos").select("created_at").eq("user_id", userId).maybeSingle(),
  ]);

  if (
    resPerfil.error ||
    resEmpresa.error ||
    resIme.error ||
    resFat.error ||
    resChave.error ||
    resAcesso.error
  ) {
    throw new Error("Falha ao carregar os dados da evolução.");
  }

  const perfil = resPerfil.data as {
    pagina_publica_ativa: boolean;
    pagina_publica_mostrar_faturamento: boolean;
    cidade: string | null;
    estado: string | null;
  } | null;
  const empresa = resEmpresa.data as
    | { nome_empresa: string | null; cidade: string | null; estado: string | null }
    | null;
  const ime = (resIme.data ?? []) as { score_total: number }[];
  const faturamento = resFat.data as
    | { valor: number; nivel_confianca: NivelConfiancaFaturamento }
    | null;
  const chave = (resChave.data as
    | { chaves: { titulo: string; cor_hex: string } | null }
    | null)?.chaves;

  const inicio = resAcesso.data as { created_at: string } | null;
  let diasJornada: number | null = null;
  if (inicio?.created_at) {
    const inicioMs = new Date(inicio.created_at).getTime();
    if (Number.isFinite(inicioMs)) {
      diasJornada = Math.max(
        1,
        Math.floor((Date.now() - inicioMs) / 86400000) + 1
      );
    }
  }

  return {
    empresaNome: empresa?.nome_empresa ?? null,
    cidade: perfil?.cidade ?? null,
    estado: perfil?.estado ?? null,
    paginaAtiva: Boolean(perfil?.pagina_publica_ativa),
    mostrarFaturamento: Boolean(perfil?.pagina_publica_mostrar_faturamento),
    imeInicial: ime.length > 0 ? Number(ime[0].score_total) : null,
    imeFinal: ime.length > 0 ? Number(ime[ime.length - 1].score_total) : null,
    chave: chave ?? null,
    faturamento:
      faturamento && Number(faturamento.valor) > 0
        ? { valor: Number(faturamento.valor), nivel_confianca: faturamento.nivel_confianca }
        : null,
    diasJornada,
  };
}

export function CompartilharEvolucao({ userId }: { userId: string }) {
  const [dados, setDados] = useState<DadosCompartilhar | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const [gerando, setGerando] = useState(false);
  const [falhaExport, setFalhaExport] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro(false);
    async function carregar() {
      try {
        const dadosC = await carregarDadosCompartilhar(userId);
        if (!ativo) return;
        setDados(dadosC);
      } catch {
        if (!ativo) return;
        setErro(true);
      } finally {
        if (ativo) setCarregando(false);
      }
    }
    void carregar();
    return () => {
      ativo = false;
    };
  }, [userId, tentativa]);

  async function baixarImagem() {
    if (!cardRef.current || !dados) return;
    setFalhaExport(false);
    setGerando(true);
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });
      const link = document.createElement("a");
      link.download = `servicos-lucrativos-evolucao-${slugificar(dados.empresaNome || "empresa")}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      setFalhaExport(true);
    } finally {
      setGerando(false);
    }
  }

  const comDados = Boolean(dados && dados.imeFinal !== null);
  const nomeVisivel =
    dados && dados.paginaAtiva
      ? dados.empresaNome ?? "Minha empresa"
      : "Anônimo";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Share2 className="h-4 w-4 text-primary" />
          Compartilhar evolução
        </CardTitle>
        <CardDescription>
          Gere uma imagem pronta para postar no Instagram e WhatsApp com a sua evolução no
          Serviços Lucrativos. Baixe e publique onde quiser.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {carregando && (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}

        {erro && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-6 text-center">
            <TriangleAlert className="h-5 w-5 text-destructive" />
            <p className="text-sm text-foreground/90">
              Não foi possível carregar sua evolução para o card.
            </p>
            <Button variant="outline" size="sm" onClick={() => setTentativa((t) => t + 1)}>
              Tentar novamente
            </Button>
          </div>
        )}

        {!carregando && !erro && dados && (
          <>
            <div className="overflow-x-auto">
              <div
                ref={cardRef}
                className="mx-auto w-[420px] max-w-full rounded-2xl p-6 text-white"
                style={{
                  background: `radial-gradient(circle at top, #1b1713 0%, ${PRETO} 65%)`,
                  border: `1px solid ${OURO}55`,
                  fontFamily:
                    "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
                }}
              >
                {/* Marca */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-md"
                      style={{ background: OURO, color: PRETO }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-5 w-5"
                      >
                        <path d="M12 1v22" />
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                      </svg>
                    </span>
                    <span className="text-sm font-bold tracking-tight">
                      Serviços <span style={{ color: OURO }}>Lucrativos</span>
                    </span>
                  </div>
                  <span
                    className="text-[10px] uppercase tracking-widest"
                    style={{ color: OURO }}
                  >
                    Plano de 90 Dias
                  </span>
                </div>

                <div style={{ height: 26 }} />

                {/* Empresa */}
                <p
                  className="text-lg font-bold leading-tight"
                  style={{ color: OURO }}
                >
                  {nomeVisivel}
                </p>
                {dados.paginaAtiva && (dados.cidade || dados.estado) && (
                  <p className="mt-1 text-xs text-white/50">
                    {[dados.cidade, dados.estado].filter(Boolean).join(" · ")}
                  </p>
                )}

                {/* Chave atual */}
                {dados.chave && (
                  <div
                    className="mt-5 flex items-center gap-3 rounded-xl border px-3.5 py-2.5"
                    style={{
                      borderColor: `${dados.chave.cor_hex}55`,
                      background: `${dados.chave.cor_hex}14`,
                    }}
                  >
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border"
                      style={{
                        borderColor: dados.chave.cor_hex,
                        boxShadow: `0 0 18px -4px ${dados.chave.cor_hex}`,
                        background: PRETO,
                      }}
                    >
                      <IconeChave color={dados.chave.cor_hex} className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block text-[10px] uppercase tracking-wider text-white/50">
                        Chave atual
                      </span>
                      <span className="block text-sm font-semibold" style={{ color: dados.chave.cor_hex }}>
                        {dados.chave.titulo}
                      </span>
                    </span>
                  </div>
                )}

                {/* Evolução do IME */}
                <div className="mt-5 flex items-end justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-white/50">
                    Evolução do IME
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-white/50">
                    {obterClassificacaoIme(dados.imeFinal ?? 0).nome}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-3">
                  {dados.imeInicial !== null && dados.imeInicial !== dados.imeFinal && (
                    <>
                      <span className="text-3xl font-bold text-white/70">
                        {Math.round(dados.imeInicial)}
                      </span>
                      <span className="text-xl font-bold" style={{ color: OURO }}>
                        →
                      </span>
                    </>
                  )}
                  <span className="text-4xl font-bold" style={{ color: OURO }}>
                    {dados.imeFinal !== null ? Math.round(dados.imeFinal) : "—"}
                  </span>
                </div>

                {/* Faturamento (respeita a preferência de mostrar ou não) */}
                {dados.mostrarFaturamento && dados.faturamento && (
                  <div className="mt-5 flex items-center justify-between rounded-xl border px-3.5 py-2.5" style={{ borderColor: `${OURO}44` }}>
                    <span className="text-xs text-white/70">Faturamento atual</span>
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-bold" style={{ color: OURO }}>
                        {formatBRL(dados.faturamento.valor)}
                      </span>
                      {dados.faturamento.nivel_confianca === "autodeclarado" && (
                        <span
                          className="rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-wide"
                          style={{ borderColor: `${OURO}44`, color: "#a89f8f" }}
                        >
                          Autodeclarado
                        </span>
                      )}
                    </span>
                  </div>
                )}

                {/* Tempo de jornada */}
                {dados.diasJornada !== null && (
                  <p className="mt-5 text-xs text-white/60">
                    <span className="font-semibold" style={{ color: OURO }}>
                      {dados.diasJornada} {dados.diasJornada === 1 ? "dia" : "dias"}
                    </span>{" "}
                    de jornada de estruturação empresarial.
                  </p>
                )}

                <div style={{ height: 22 }} />

                {/* Rodapé do card */}
                <div className="border-t pt-3" style={{ borderColor: `${OURO}33` }}>
                  <p className="text-[10px] leading-relaxed text-white/45">
                    Sua empresa também pode evoluir com o Serviços Lucrativos — o método
                    de 90 dias para estruturar negócios de serviços.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                onClick={() => void baixarImagem()}
                disabled={gerando || !comDados}
                className="h-11 w-fit"
              >
                {gerando ? <Loader2 className="animate-spin" /> : <Download />}
                {gerando ? "Gerando imagem…" : "Baixar imagem (PNG)"}
              </Button>
              {!comDados && (
                <p className="text-xs text-muted-foreground">
                  Complete as primeiras semanas do plano para liberar o card de evolução.
                </p>
              )}
              {falhaExport && (
                <p className="flex items-center gap-2 text-xs text-destructive-foreground">
                  <TriangleAlert className="h-3.5 w-3.5" />
                  Não foi possível gerar a imagem agora. Tente novamente.
                </p>
              )}
            </div>

            {!dados.paginaAtiva && (
              <p className="text-xs leading-relaxed text-muted-foreground">
                Sem página pública ativa, o card usa “Anônimo” no lugar do nome da sua
                empresa. Ative a página em “Página pública da sua empresa” se quiser
                divulgar o nome. A preferência de mostrar o faturamento é respeitada no
                card.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}