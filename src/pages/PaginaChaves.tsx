import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  KeyRound,
  Loader2,
  Lock,
  MessageCircle,
  Shield,
} from "lucide-react";

import { Layout } from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  carregarChaves,
  montarLinkChaveFisica,
  solicitarChaveFisica,
  type ChavesDaJornada,
} from "@/lib/chaves";
import type { Chave, ChaveUsuario, StatusChaveFisica } from "@/lib/types";
import { cn } from "@/lib/utils";

const ROTULOS_STATUS: Record<StatusChaveFisica, string> = {
  nao_solicitada: "Não solicitada",
  solicitada: "Solicitada — aguardando envio",
  enviada: "Chave enviada",
};

export function PaginaChaves({
  userId,
  nomeAluno,
}: {
  userId: string;
  nomeAluno: string;
}) {
  const [dados, setDados] = useState<ChavesDaJornada | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const [solicitando, setSolicitando] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro(false);
    async function carregar() {
      try {
        const chaves = await carregarChaves(userId);
        if (!ativo) return;
        setDados(chaves);
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

  const desbloqueadasPorId = useMemo(
    () => new Map((dados?.desbloqueadas ?? []).map((d) => [d.chave_id, d])),
    [dados]
  );

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
              desbloqueadas: d.desbloqueadas.map((cu) =>
                cu.id === chaveUsuario.id
                  ? {
                      ...cu,
                      solicitacao_fisica_status: "solicitada",
                      solicitacao_fisica_em: new Date().toISOString(),
                    }
                  : cu
              ),
            }
          : d
      );
    } catch {
      setErro(true);
    } finally {
      setSolicitando(null);
    }
  }

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
            A cada nível de IME você desbloqueia uma chave. Cada chave vale uma
            versão física da sua conquista — basta solicitar.
          </p>
        </div>

        {carregando && (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {erro && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-10 text-center">
            <Lock className="h-6 w-6 text-destructive" />
            <p className="text-sm text-foreground/90">
              Não foi possível carregar as chaves agora. Tente novamente.
            </p>
            <Button variant="outline" onClick={() => setTentativa((t) => t + 1)}>
              Tentar novamente
            </Button>
          </div>
        )}

        {!carregando && !erro && dados && (
          <>
            <EscudoAtualCard escudo={dados.escudo} />

            <div className="flex flex-col gap-4">
              {dados.catalogo.map((chave) => {
                const desbloqueada = desbloqueadasPorId.get(chave.id);
                return (
                  <CartaoChave
                    key={chave.id}
                    chave={chave}
                    desbloqueada={desbloqueada}
                    solicitando={solicitando === desbloqueada?.id}
                    aoSolicitar={aoSolicitar}
                  />
                );
              })}
            </div>

            <p className="rounded-lg border border-border bg-card/50 px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground">
              Ao tocar em “Solicitar”, o WhatsApp abre com uma mensagem pronta
              para o Tiago — você mesmo envia. O status só muda para “Enviada”
              quando ele confirmar o envio da chave física.
            </p>
          </>
        )}
      </div>
    </Layout>
  );
}

function EscudoAtualCard({ escudo }: { escudo: ChavesDaJornada["escudo"] }) {
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
            Alcance IME 30 para desbloquear sua primeira chave.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div
      className="flex animate-in items-center gap-4 rounded-xl border p-5"
      style={{
        borderColor: `${escudo.cor_hex}66`,
        background: `linear-gradient(120deg, ${escudo.cor_hex}1f, transparent 65%)`,
      }}
    >
      <div
        className="flex h-14 w-14 shrink-0 animate-in items-center justify-center rounded-full border bg-card shadow-[0_0_24px_-6px_var(--color)]"
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

function CartaoChave({
  chave,
  desbloqueada,
  solicitando,
  aoSolicitar,
}: {
  chave: Chave;
  desbloqueada?: ChaveUsuario;
  solicitando: boolean;
  aoSolicitar: (cu: ChaveUsuario, c: Chave) => void;
}) {
  const desbloqueadaDeVerdade = Boolean(desbloqueada);
  const status = desbloqueada?.solicitacao_fisica_status ?? null;
  const [animando, setAnimando] = useState(false);

  useEffect(() => {
    if (desbloqueadaDeVerdade && !animando) {
      const t = setTimeout(() => setAnimando(true), 250);
      return () => clearTimeout(t);
    }
  }, [desbloqueadaDeVerdade, animando]);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border p-5 transition-all duration-500",
        desbloqueadaDeVerdade
          ? animando
            ? "animate-in zoom-in-95 bg-card"
            : "animate-in fade-in bg-card"
          : "border-input bg-card/40 opacity-75"
      )}
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
            className={cn(
              "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border transition-all duration-500",
              desbloqueadaDeVerdade ? "bg-card" : "bg-muted text-muted-foreground"
            )}
            style={
              desbloqueadaDeVerdade
                ? { borderColor: chave.cor_hex, boxShadow: `0 0 20px -8px ${chave.cor_hex}` }
                : undefined
            }
          >
            {desbloqueadaDeVerdade ? (
              <KeyRound className="h-7 w-7" style={{ color: chave.cor_hex }} />
            ) : (
              <Lock className="h-6 w-6" />
            )}
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Chave {chave.ordem} de {`3`}
            </p>
            <h3 className="font-semibold leading-snug">{chave.titulo}</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">{chave.descricao}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge
            variant={
              status === "enviada"
                ? "sucesso"
                : status === "solicitada"
                  ? "pendente"
                  : desbloqueadaDeVerdade
                    ? "default"
                    : "outline"
            }
          >
            {desbloqueadaDeVerdade
              ? ROTULOS_STATUS[status ?? "nao_solicitada"]
              : `Requer IME ${chave.ime_minimo}`}
          </Badge>
          {desbloqueadaDeVerdade && (
            <p className="text-xs text-muted-foreground">
              Desbloqueada em{" "}
              {new Date(desbloqueada!.desbloqueada_em).toLocaleDateString("pt-BR")}
            </p>
          )}
        </div>
      </div>

      {desbloqueadaDeVerdade && status === "nao_solicitada" && (
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

      {desbloqueadaDeVerdade && status === "solicitada" && (
        <p className="mt-4 flex items-center gap-2 text-xs text-amber-400">
          <Check className="h-3.5 w-3.5" />
          Solicitação registrada — o Tiago vai providenciar o envio.
        </p>
      )}

      {desbloqueadaDeVerdade && status === "enviada" && (
        <p className="mt-4 flex items-center gap-2 text-xs text-emerald-400">
          <Check className="h-3.5 w-3.5" />
          Chave enviada. Fique de olho na sua caixa de entrada / WhatsApp.
        </p>
      )}

      {!desbloqueadaDeVerdade && (
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: "0%" }} />
          </div>
          Continue avançando no IME para desbloquear.
        </div>
      )}
    </div>
  );
}
