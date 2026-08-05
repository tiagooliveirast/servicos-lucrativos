import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Award,
  Check,
  Crown,
  Flag,
  Flame,
  Gauge,
  Lock,
  Rocket,
  Trophy,
  Zap,
} from "lucide-react";

import { CartaoCarregando } from "@/components/CartaoCarregando";
import { CartaoErro } from "@/components/CartaoErro";
import { Layout } from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { carregarConquistas, type ConquistasDaJornada } from "@/lib/gamificacao";
import { cn } from "@/lib/utils";

const ICONES_CONQUISTA: Record<string, typeof Trophy> = {
  flag: Flag,
  dollar: Award,
  settings: Gauge,
  rocket: Rocket,
  gauge: Gauge,
  zap: Zap,
  flame: Flame,
  crown: Crown,
  check: Check,
};

export function PaginaConquistas({ userId }: { userId: string }) {
  const [dados, setDados] = useState<ConquistasDaJornada | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro(false);
    async function carregar() {
      try {
        const conquistas = await carregarConquistas(userId);
        if (!ativo) return;
        setDados(conquistas);
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
    () => new Map((dados?.desbloqueadas ?? []).map((d) => [d.conquista_id, d])),
    [dados]
  );
  const conquistadas = desbloqueadasPorId.size;

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
              Gamificação
            </Badge>
          </div>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
            <Trophy className="h-7 w-7 text-primary" />
            Conquistas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cada marco da sua jornada vira uma conquista. Continue avançando nas semanas, no
            IME e na constância para desbloquear todas.
          </p>
        </div>

        {carregando && <CartaoCarregando />}

        {erro && (
          <CartaoErro
            mensagem="Não foi possível carregar as conquistas agora. Tente novamente."
            onTentar={() => setTentativa((t) => t + 1)}
          />
        )}

        {!carregando && !erro && dados && (
          <>
            <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4">
              <div className="flex items-center gap-3">
                <Trophy className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold leading-none">
                    {conquistadas}
                    <span className="text-base font-medium text-muted-foreground">
                      {" "}
                      / {dados.catalogo.length}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">conquistas desbloqueadas</p>
                </div>
              </div>
              <div className="ml-auto hidden h-1.5 w-40 overflow-hidden rounded-full bg-muted sm:block">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    width: `${dados.catalogo.length ? (conquistadas / dados.catalogo.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {dados.catalogo.map((conquista) => {
                const desbloqueada = desbloqueadasPorId.get(conquista.id);
                const Icone = ICONES_CONQUISTA[conquista.icone ?? ""] ?? Trophy;
                return (
                  <div
                    key={conquista.id}
                    className={cn(
                      "flex flex-col gap-3 rounded-xl border p-4",
                      desbloqueada
                        ? "border-primary/50 bg-card"
                        : "border-input bg-card/40 opacity-70"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className={cn(
                          "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg",
                          desbloqueada
                            ? "bg-primary/15 text-primary"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {desbloqueada ? (
                          <Icone className="h-6 w-6" />
                        ) : (
                          <Lock className="h-5 w-5" />
                        )}
                      </div>
                      <Badge variant={desbloqueada ? "sucesso" : "outline"}>
                        {desbloqueada
                          ? `Desbloqueada em ${new Date(desbloqueada.desbloqueada_em).toLocaleDateString("pt-BR")}`
                          : "Bloqueada"}
                      </Badge>
                    </div>
                    <div>
                      <h3 className="font-semibold leading-snug">{conquista.titulo}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{conquista.descricao}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <Button asChild variant="outline" className="w-fit">
              <Link to="/bauis">
                <Award />
                Ver meus Baús
              </Link>
            </Button>
          </>
        )}
      </div>
    </Layout>
  );
}