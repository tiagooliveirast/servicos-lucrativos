import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Anchor,
  ArrowLeft,
  Check,
  KeyRound,
  Loader2,
  Lock,
  MessageCircle,
  Shield,
  Sparkles,
  X,
} from "lucide-react";

import { CartaoCarregando } from "@/components/CartaoCarregando";
import { CartaoErro } from "@/components/CartaoErro";
import { Layout } from "@/components/Layout";
import { CardFaturamentoAutodeclarado } from "@/components/CardFaturamentoAutodeclarado";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  carregarProgressoChaves,
  montarLinkChaveFisica,
  solicitarChaveFisica,
  type ProgressoChaves,
  type StatusPorChave,
} from "@/lib/chaves";
import { carregarMotivoPessoal, textoMotivo, type MotivoPessoal } from "@/lib/motivo";
import type { Chave, ChaveUsuario, StatusChaveFisica } from "@/lib/types";
import { cn } from "@/lib/utils";

const ROTULOS_STATUS: Record<StatusChaveFisica, string> = {
  nao_solicitada: "Não solicitada",
  solicitada: "Solicitada — aguardando envio",
  enviada: "Chave enviada",
};

const CERIMONIA_VISTA_KEY = "servicos_lucrativos:cerimonia_chaves_v1";

function carregarVistas(): Set<string> {
  try {
    const raw = localStorage.getItem(CERIMONIA_VISTA_KEY);
    return new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set<string>();
  }
}

function salvarVistas(vistas: Set<string>) {
  try {
    localStorage.setItem(CERIMONIA_VISTA_KEY, JSON.stringify([...vistas]));
  } catch {
    // armazenamento indisponível — a cerimônia reaparece no próximo acesso
  }
}

export function PaginaChaves({
  userId,
  nomeAluno,
}: {
  userId: string;
  nomeAluno: string;
}) {
  const [dados, setDados] = useState<ProgressoChaves | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const [solicitando, setSolicitando] = useState<string | null>(null);
  const [cerimonia, setCerimonia] = useState<ChaveUsuario | null>(null);
  const [motivo, setMotivo] = useState<MotivoPessoal | null>(null);

  useEffect(() => {
    let ativo = true;
    void carregarMotivoPessoal(userId).then((m) => {
      if (ativo) setMotivo(m);
    });
    return () => {
      ativo = false;
    };
  }, [userId]);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro(false);
    async function carregar() {
      try {
        const chaves = await carregarProgressoChaves(userId);
        if (!ativo) return;
        setDados(chaves);

        const vistas = carregarVistas();
        const naoVistas = chaves.daJornada.desbloqueadas.filter(
          (d) => d.chave_id && !vistas.has(d.chave_id)
        );
        if (naoVistas.length > 0) {
          setCerimonia(naoVistas[naoVistas.length - 1]);
        }
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

  function fecharCerimonia() {
    if (cerimonia) {
      const vistas = carregarVistas();
      vistas.add(cerimonia.chave_id);
      salvarVistas(vistas);
    }
    setCerimonia(null);
  }

  async function aoSolicitar(chaveUsuario: ChaveUsuario, chave: Chave) {
    setSolicitando(chaveUsuario.id);
    try {
      await solicitarChaveFisica(chaveUsuario.id);
      window.open(
        montarLinkChaveFisica(nomeAluno, chave.titulo),
        "_blank",
        "noopener"
      );
      setDados((d) =>
        d
          ? {
              ...d,
              daJornada: {
                ...d.daJornada,
                desbloqueadas: d.daJornada.desbloqueadas.map((cu) =>
                  cu.id === chaveUsuario.id
                    ? {
                        ...cu,
                        solicitacao_fisica_status: "solicitada",
                        solicitacao_fisica_em: new Date().toISOString(),
                      }
                    : cu
                ),
              },
            }
          : d
      );
    } catch {
      setErro(true);
    } finally {
      setSolicitando(null);
    }
  }

  const desbloqueadasPorId = useMemo(
    () =>
      new Map(
        (dados?.daJornada.desbloqueadas ?? []).map((d) => [d.chave_id, d])
      ),
    [dados]
  );

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
            <Link to="/dashboard">
              <ArrowLeft />
              Painel de semanas
            </Link>
          </Button>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-primary">
              Reconhecimento
            </Badge>
          </div>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
            <KeyRound className="h-7 w-7 text-primary" />
            Chaves da Jornada
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cada chave é desbloqueada quando quatro pilares estão prontos:
            faturamento, IME, IE e as missões/ativos da jornada. Cada chave
            vale uma versão física da sua conquista.
          </p>
        </div>

        {carregando && <CartaoCarregando />}

        {erro && (
          <CartaoErro
            mensagem="Não foi possível carregar as chaves agora. Tente novamente."
            onTentar={() => setTentativa((t) => t + 1)}
          />
        )}

        {!carregando && !erro && dados && (
          <>
            <EscudoAtualCard escudo={dados.daJornada.escudo} />

            {dados.proximaChave && <ProximaChaveCard dados={dados} />}

            <CardFaturamentoAutodeclarado
              userId={userId}
              aoSalvar={() => setTentativa((t) => t + 1)}
            />

            <div className="flex flex-col gap-4">
              {dados.lista.map((status) => {
                const desbloqueada = desbloqueadasPorId.get(status.chave.id);
                return (
                  <CartaoChave
                    key={status.chave.id}
                    status={status}
                    desbloqueada={desbloqueada}
                    totalChaves={dados.lista.length}
                    faturamentoAutodeclarado={dados.faturamentoAutodeclarado}
                    solicitando={solicitando === desbloqueada?.id}
                    aoSolicitar={aoSolicitar}
                  />
                );
              })}
            </div>

            <p className="rounded-lg border border-border bg-card/50 px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground">
              Ao tocar em “Solicitar”, o WhatsApp abre com uma mensagem pronta
              para o Tiago — você mesmo envia. O status só muda para “Enviada”
              quando ele confirmar o envio da chave física. Neste momento, o
              pilar de faturamento é informado por você (autodeclarado) — em
              breve será validado automaticamente pela integração com o
              RefriClube.
            </p>
          </>
        )}
      </div>

      {cerimonia && (
        <CerimoniaDesbloqueio
          chaveUsuario={cerimonia}
          motivo={motivo}
          solicitando={solicitando === cerimonia.id}
          aoSolicitar={aoSolicitar}
          aoFechar={fecharCerimonia}
        />
      )}
    </Layout>
  );
}

function EscudoAtualCard({
  escudo,
}: {
  escudo: ProgressoChaves["daJornada"]["escudo"];
}) {
  if (!escudo) {
    return (
      <div className="flex items-center gap-4 rounded-xl border border-input bg-card/40 p-5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-muted bg-muted/50 text-muted-foreground">
          <Shield className="h-7 w-7" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Escudo atual
          </p>
          <p className="font-semibold">Nenhuma chave ainda</p>
          <p className="text-sm text-muted-foreground">
            Complete os quatro pilares para desbloquear sua primeira chave.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div
      className="flex items-center gap-4 rounded-xl border p-5"
      style={{
        borderColor: `${escudo.cor_hex}66`,
        background: `linear-gradient(120deg, ${escudo.cor_hex}1f, transparent 65%)`,
      }}
    >
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border bg-card"
        style={{ borderColor: escudo.cor_hex, boxShadow: `0 0 24px -6px ${escudo.cor_hex}` }}
      >
        <Shield className="h-7 w-7" style={{ color: escudo.cor_hex }} />
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Escudo atual
        </p>
        <p className="font-semibold" style={{ color: escudo.cor_hex }}>
          {escudo.titulo}
        </p>
        <p className="text-sm text-muted-foreground">
          Desbloqueado em{" "}
          {new Date(escudo.desbloqueada_em).toLocaleDateString("pt-BR")}
        </p>
      </div>
    </div>
  );
}

function ProximaChaveCard({ dados }: { dados: ProgressoChaves }) {
  const proxima = dados.proximaChave;
  if (!proxima) return null;

  const pendentes = dados.lista.find((s) => s.chave.id === proxima.id)?.pilares ?? [];
  const prontos = pendentes.filter((p) => p.ok).length;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/40 bg-card">
        <KeyRound className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Próxima chave
        </p>
        <p className="truncate font-semibold">{proxima.titulo}</p>
      </div>
      <p className="text-xs text-muted-foreground">
        {prontos} de 4 pilares prontos — o faturamento deste mês é informado
        por você (autodeclarado, validação automática com o RefriClube em
        breve).
      </p>
    </div>
  );
}

function CartaoChave({
  status,
  desbloqueada,
  totalChaves,
  faturamentoAutodeclarado,
  solicitando,
  aoSolicitar,
}: {
  status: StatusPorChave;
  desbloqueada?: ChaveUsuario;
  totalChaves: number;
  faturamentoAutodeclarado: boolean;
  solicitando: boolean;
  aoSolicitar: (cu: ChaveUsuario, c: Chave) => void;
}) {
  const { chave, pilares } = status;
  const desbloqueadaDeVerdade = Boolean(desbloqueada);
  const prontos = pilares.filter((p) => p.ok).length;
  const statusFisico = desbloqueada?.solicitacao_fisica_status ?? null;

  return (
    <div
      className="relative overflow-hidden rounded-xl border p-5 transition-all duration-500"
      style={
        desbloqueadaDeVerdade && chave.cor_hex
          ? {
              borderColor: `${chave.cor_hex}59`,
              background: `linear-gradient(135deg, ${chave.cor_hex}14, transparent 70%), var(--card)`,
            }
          : undefined
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border"
            style={
              desbloqueadaDeVerdade
                ? { borderColor: chave.cor_hex, boxShadow: `0 0 20px -8px ${chave.cor_hex}` }
                : undefined
            }
          >
            {desbloqueadaDeVerdade ? (
              <KeyRound className="h-7 w-7" style={{ color: chave.cor_hex }} />
            ) : (
              <Lock className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Chave {chave.ordem} de {totalChaves}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold leading-snug">{chave.titulo}</h3>
              {desbloqueadaDeVerdade && faturamentoAutodeclarado && (
                <Badge
                  variant="outline"
                  className="font-medium text-muted-foreground"
                >
                  Faturamento autodeclarado
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">{chave.descricao}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge
            variant={
              statusFisico === "enviada"
                ? "sucesso"
                : statusFisico === "solicitada"
                  ? "pendente"
                  : desbloqueadaDeVerdade
                    ? "default"
                    : "outline"
            }
          >
            {desbloqueadaDeVerdade
              ? ROTULOS_STATUS[statusFisico ?? "nao_solicitada"]
              : status.prontoParaDesbloquear
                ? "Pronta para desbloquear"
                : `${prontos} de 4 pilares`}
          </Badge>
          {desbloqueadaDeVerdade && (
            <p className="text-xs text-muted-foreground">
              Desbloqueada em{" "}
              {new Date(desbloqueada!.desbloqueada_em).toLocaleDateString("pt-BR")}
            </p>
          )}
        </div>
      </div>

      {/* Checklist dos 4 pilares */}
      <div className="mt-4 flex flex-col gap-2">
        {pilares.map((pilar) => (
          <div
            key={pilar.id}
            className="flex items-center gap-2.5 text-sm"
          >
            <span
              className={
                pilar.ok
                  ? "flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400"
                  : "flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
              }
            >
              {pilar.ok ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <X className="h-3.5 w-3.5" />
              )}
            </span>
            <span className="min-w-0">
              <span
                className={cn(
                  pilar.ok ? "text-foreground" : "text-muted-foreground",
                  "font-medium"
                )}
              >
                {pilar.rotulo}
              </span>
              <span className="ml-2 text-xs text-muted-foreground">
                {pilar.detalhe}
              </span>
            </span>
          </div>
        ))}
      </div>

      {desbloqueadaDeVerdade && statusFisico === "nao_solicitada" && (
        <div className="mt-4">
          <Button
            size="sm"
            onClick={() => aoSolicitar(desbloqueada!, chave)}
            disabled={solicitando}
            className="w-fit"
          >
            {solicitando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessageCircle className="h-4 w-4" />
            )}
            Solicitar minha chave física
          </Button>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Abre o WhatsApp com uma mensagem pronta para o Tiago.
          </p>
        </div>
      )}

      {desbloqueadaDeVerdade && statusFisico === "solicitada" && (
        <p className="mt-4 flex items-center gap-2 text-xs text-amber-400">
          <Check className="h-3.5 w-3.5" />
          Solicitação registrada — o Tiago vai providenciar o envio.
        </p>
      )}

      {desbloqueadaDeVerdade && statusFisico === "enviada" && (
        <p className="mt-4 flex items-center gap-2 text-xs text-emerald-400">
          <Check className="h-3.5 w-3.5" />
          Chave enviada. Fique de olho na sua caixa de entrada / WhatsApp.
        </p>
      )}
    </div>
  );
}

function CerimoniaDesbloqueio({
  chaveUsuario,
  motivo,
  solicitando,
  aoSolicitar,
  aoFechar,
}: {
  chaveUsuario: ChaveUsuario;
  motivo: MotivoPessoal | null;
  solicitando: boolean;
  aoSolicitar: (cu: ChaveUsuario, c: Chave) => void;
  aoFechar: () => void;
}) {
  const chave = chaveUsuario.chaves;
  if (!chave) return null;
  const cor = chave.cor_hex;
  const motivoTexto = textoMotivo(motivo);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={aoFechar}
      />
      <div className="relative w-full max-w-md animate-in zoom-in-95 fade-in rounded-2xl border bg-card p-6 text-center shadow-2xl">
        <div
          className="mx-auto flex h-24 w-24 animate-in zoom-in-95 items-center justify-center rounded-full border-2 bg-card"
          style={{
            borderColor: cor,
            boxShadow: `0 0 48px -8px ${cor}`,
          }}
        >
          <KeyRound className="h-12 w-12" style={{ color: cor }} />
        </div>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs font-medium uppercase tracking-widest text-amber-400">
          <Sparkles className="h-3.5 w-3.5" />
          Chave desbloqueada
          <Sparkles className="h-3.5 w-3.5" />
        </p>
        <h2 className="mt-1 text-2xl font-bold" style={{ color: cor }}>
          {chave.titulo}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Você completou os quatro pilares — faturamento, IME, IE e missões da
          jornada. Essa conquista vale uma chave física.
        </p>

        {motivoTexto && (
          <p className="mt-4 flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2.5 text-left text-sm leading-relaxed text-foreground/85">
            <Anchor className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              Você começou porque queria:{" "}
              <span className="font-medium text-primary">{motivoTexto}</span>. Essa chave prova
              que você está no caminho certo.
            </span>
          </p>
        )}

        <div className="mt-5 flex flex-col gap-2">
          <Button
            onClick={() => aoSolicitar(chaveUsuario, chave)}
            disabled={solicitando}
            className="w-full"
          >
            {solicitando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessageCircle className="h-4 w-4" />
            )}
            Solicitar minha chave física
          </Button>
          <Button variant="ghost" onClick={aoFechar} className="w-full">
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
