import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ClipboardList,
  Loader2,
  PartyPopper,
  Sparkles,
  Ticket,
  Trophy,
} from "lucide-react";

import { CartaoCarregando } from "@/components/CartaoCarregando";
import { CartaoErro } from "@/components/CartaoErro";
import { Layout } from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { abrirBau, carregarBauis } from "@/lib/gamificacao";
import type { Bau, BauUsuario } from "@/lib/types";

export function PaginaBauis({ userId }: { userId: string }) {
  const [bauis, setBauis] = useState<BauUsuario[] | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [abrindo, setAbrindo] = useState<string | null>(null);
  const [abertoAgora, setAbertoAgora] = useState<Bau | null>(null);

  const carregar = useCallback(async () => {
    setErro(false);
    try {
      const dados = await carregarBauis(userId);
      setBauis(dados);
    } catch {
      setErro(true);
    } finally {
      setCarregando(false);
    }
  }, [userId]);

  useEffect(() => {
    let ativo = true;
    async function carregarInicial() {
      try {
        const dados = await carregarBauis(userId);
        if (!ativo) return;
        setBauis(dados);
      } catch {
        if (!ativo) return;
        setErro(true);
      } finally {
        if (ativo) setCarregando(false);
      }
    }
    void carregarInicial();
    return () => {
      ativo = false;
    };
  }, [userId]);

  async function aoAbrir(bauUsuario: BauUsuario) {
    if (!bauUsuario.bauis) return;
    setAbrindo(bauUsuario.id);
    setErro(false);
    try {
      const bau = await abrirBau(bauUsuario.id);
      setAbertoAgora(bau ?? bauUsuario.bauis);
      setBauis((prev) =>
        (prev ?? []).map((b) => (b.id === bauUsuario.id ? { ...b, aberto: true } : b))
      );
    } catch {
      setErro(true);
    } finally {
      setAbrindo(null);
    }
  }

  const desbloqueados = bauis ?? [];
  const naoAbertos = desbloqueados.filter((b) => !b.aberto);

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
            <Link to="/conquistas">
              <ArrowLeft />
              Conquistas
            </Link>
          </Button>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-primary">
              Gamificação
            </Badge>
          </div>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
            <PartyPopper className="h-7 w-7 text-primary" />
            Baús
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cada conquista desbloqueada pode abrir um baú com material bônus para a sua
            jornada. Abra para descobrir o que tem dentro.
          </p>
        </div>

        {carregando && <CartaoCarregando />}

        {erro && (
          <CartaoErro
            mensagem="Não foi possível acessar os baús agora. Tente novamente."
            onTentar={() => void carregar()}
          />
        )}

        {!carregando && !erro && desbloqueados.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-input bg-card/40 px-4 py-14 text-center">
            <Trophy className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-foreground/80">
              Você ainda não desbloqueou nenhum baú.
            </p>
            <p className="text-sm text-muted-foreground">
              Complete conquistas para destravar os baús com material bônus.
            </p>
            <Button asChild variant="outline">
              <Link to="/conquistas">Ver conquistas</Link>
            </Button>
          </div>
        )}

        {!carregando && !erro && desbloqueados.length > 0 && (
          <>
            {naoAbertos.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Prontos para abrir ({naoAbertos.length})
                </h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {naoAbertos.map((bau) => (
                    <div
                      key={bau.id}
                      className="flex flex-col gap-3 rounded-xl border border-primary/40 bg-gradient-to-r from-primary/10 to-transparent p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary">
                          <PartyPopper className="h-6 w-6" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold leading-snug">{bau.bauis?.titulo}</h3>
                          <p className="text-xs text-muted-foreground">
                            Desbloqueado com conquista • {bau.bauis?.conteudo_tipo}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => void aoAbrir(bau)}
                        disabled={abrindo !== null}
                        className="w-fit"
                      >
                        {abrindo === bau.id ? <Loader2 className="animate-spin" /> : <Sparkles />}
                        Abrir baú
                      </Button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {abertoAgora && (
              <section className="rounded-xl border border-primary/50 bg-primary/10 p-5">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <PartyPopper className="h-5 w-5 text-primary" />
                  Você abriu: {abertoAgora.titulo}
                </h2>
                {abertoAgora.conteudo_texto && (
                  <p className="mt-2 whitespace-pre-line text-sm text-foreground/90">
                    {abertoAgora.conteudo_texto}
                  </p>
                )}
                {abertoAgora.conteudo_url && (
                  <Button asChild variant="outline" className="mt-3 w-fit">
                    <a href={abertoAgora.conteudo_url} target="_blank" rel="noreferrer">
                      Acessar conteúdo
                    </a>
                  </Button>
                )}
              </section>
            )}

            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Já abertos ({desbloqueados.length - naoAbertos.length})
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {desbloqueados
                  .filter((b) => b.aberto)
                  .map((bau) => (
                    <div
                      key={bau.id}
                      className="flex items-start gap-3 rounded-xl border border-input bg-card/40 p-4"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <IconeBau tipo={bau.bauis?.conteudo_tipo} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold leading-snug">{bau.bauis?.titulo}</h3>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {bau.bauis?.conteudo_texto}
                        </p>
                      </div>
                      <Badge variant="sucesso" className="ml-auto shrink-0">
                        <Check className="h-3 w-3" />
                        Aberto
                      </Badge>
                    </div>
                  ))}
              </div>
            </section>
          </>
        )}
      </div>
    </Layout>
  );
}

function IconeBau({ tipo }: { tipo: Bau["conteudo_tipo"] | undefined }) {
  switch (tipo) {
    case "template":
      return <BookOpen className="h-5 w-5" />;
    case "checklist":
      return <ClipboardList className="h-5 w-5" />;
    case "cupom":
      return <Ticket className="h-5 w-5" />;
    default:
      return <Trophy className="h-5 w-5" />;
  }
}