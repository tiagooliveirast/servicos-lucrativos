import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Award, HardHat, Loader2, Store } from "lucide-react";

import { Layout } from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CompartilharEvolucao } from "@/components/CompartilharEvolucao";
import { ConfiguracaoLembretes } from "@/components/ConfiguracaoLembretes";
import { ConfiguracaoPaginaPublica } from "@/components/ConfiguracaoPaginaPublica";
import { AVATAR_BASE, ITENS_AVATAR } from "@/lib/avatar";
import {
  ESTAGIOS_EMPRESA,
  obterEstagioEmpresa,
} from "@/lib/estagio-empresa";
import { supabase } from "@/lib/supabase";
import type { ConquistaUsuario, ImeHistorico } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Imagem com fallback seguro: se o arquivo ainda não existir (ou não
 * carregar), mostra um substituto visual sem quebrar o layout. Assim,
 * trocar um placeholder por uma imagem real não exige mudança de código.
 */
function ImagemComFallback({
  src,
  alt,
  className,
  fallback,
  imgClassName,
  title,
}: {
  src: string;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
  imgClassName?: string;
  title?: string;
}) {
  const [falhou, setFalhou] = useState(false);
  return (
    <div className={className}>
      {falhou || !src ? (
        fallback ?? <div className="h-full w-full" />
      ) : (
        <img
          src={src}
          alt={alt}
          title={title}
          loading="lazy"
          className={cn("h-full w-full object-cover", imgClassName)}
          onError={() => setFalhou(true)}
        />
      )}
    </div>
  );
}

export function PaginaEmpresa({ userId }: { userId: string }) {
  const [ime, setIme] = useState<number | null>(null);
  const [conquistas, setConquistas] = useState<ConquistaUsuario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro(false);
    async function carregar() {
      const [resIme, resConquistas] = await Promise.all([
        supabase
          .from("ime_historico")
          .select("score_total")
          .eq("user_id", userId)
          .order("data_calculo", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("conquistas_usuario")
          .select("id, user_id, conquista_id, desbloqueada_em, conquistas(*)")
          .eq("user_id", userId),
      ]);
      if (!ativo) return;
      if (resIme.error || resConquistas.error) {
        setErro(true);
        setCarregando(false);
        return;
      }
      const raw = resIme.data as Pick<ImeHistorico, "score_total"> | null;
      setIme(raw !== null ? Number(raw.score_total) : null);
      setConquistas((resConquistas.data ?? []) as unknown as ConquistaUsuario[]);
      setCarregando(false);
    }
    void carregar();
    return () => {
      ativo = false;
    };
  }, [userId, tentativa]);

  const desbloqueadas = useMemo(
    () =>
      new Set(
        (conquistas ?? [])
          .map((c) => c.conquistas?.codigo)
          .filter((c): c is string => Boolean(c))
      ),
    [conquistas]
  );

  const imeAtual = ime ?? 0;
  const estagio = useMemo(() => obterEstagioEmpresa(imeAtual), [imeAtual]);
  const proximo =
    estagio.numero < ESTAGIOS_EMPRESA.length ? ESTAGIOS_EMPRESA[estagio.numero] : null;
  const faltam = proximo ? Math.max(0, proximo.faixaMin - imeAtual) : null;

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
              Visualização
            </Badge>
          </div>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
            <HardHat className="h-7 w-7 text-primary" />
            Minha Empresa
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sua empresa evolui junto com o seu IME. Conquiste marcos para liberar os itens
            do avatar.
          </p>
        </div>

        {carregando && (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {erro && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-10 text-center">
            <Loader2 className="h-6 w-6 text-destructive" />
            <p className="text-sm text-foreground/90">
              Não foi possível carregar sua empresa agora. Tente novamente.
            </p>
            <Button variant="outline" onClick={() => setTentativa((t) => t + 1)}>
              Tentar novamente
            </Button>
          </div>
        )}

        {!carregando && !erro && (
          <div className="flex flex-col gap-6">
            {/* Estágio atual */}
            <section className="rounded-2xl border border-primary/40 bg-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Estágio atual
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-primary">
                    {estagio.numero}. {estagio.nome}
                  </h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    IME atual: {imeAtual} de 100
                  </p>
                </div>
                <ImagemComFallback
                  src={estagio.imagem}
                  alt={`Estágio ${estagio.numero} — ${estagio.nome}`}
                  className="h-24 w-24 shrink-0 rounded-xl border border-primary/30 bg-muted/40"
                  fallback={
                    <div className="flex h-full w-full items-center justify-center text-primary">
                      <Store className="h-8 w-8" />
                    </div>
                  }
                />
              </div>
              <Progress value={(imeAtual / 100) * 100} className="mt-4 h-2" />
              <p className="mt-1.5 text-xs text-muted-foreground">
                {faltam !== null && faltam > 0
                  ? `Faltam ${faltam} pontos de IME para o Estágio ${proximo?.numero} (${proximo?.nome}).`
                  : imeAtual >= 100
                    ? "Você atingiu o estágio máximo. Sua empresa está pronta!"
                    : faltam === 0
                      ? "Você atingiu o próximo estágio! Continue subindo o IME."
                      : "Continue subindo o IME para evoluir sua empresa."}
              </p>
            </section>

            {/* Avatar */}
            <section className="rounded-2xl border border-primary/40 bg-card p-5">
              <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-center">
                <div className="relative h-56 w-56 shrink-0">
                  <ImagemComFallback
                    src={AVATAR_BASE.imagem}
                    alt="Base do avatar"
                    className="absolute inset-0 h-full w-full"
                    fallback={
                      <div className="flex h-full w-full items-center justify-center rounded-full border border-primary/30 bg-muted/30 text-muted-foreground">
                        <HardHat className="h-16 w-16" />
                      </div>
                    }
                  />
                  {ITENS_AVATAR.map((item) => {
                    const liberado = desbloqueadas.has(item.conquistaCodigo);
                    if (!liberado) return null;
                    return (
                      <ImagemComFallback
                        key={item.conquistaCodigo}
                        src={item.imagem}
                        alt={item.nome}
                        title={item.nome}
                        className={cn("absolute h-14 w-14", item.classe)}
                        fallback={
                          <div className="flex h-full w-full items-center justify-center rounded-full bg-muted/40" />
                        }
                      />
                    );
                  })}
                </div>

                <div className="flex w-full max-w-xs flex-col gap-2">
                  {ITENS_AVATAR.map((item) => {
                    const liberado = desbloqueadas.has(item.conquistaCodigo);
                    return (
                      <div
                        key={item.conquistaCodigo}
                        title={liberado ? item.nome : `${item.nome} (bloqueado)`}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border p-2.5",
                          liberado
                            ? "border-primary/40 bg-card"
                            : "border-input bg-muted/40"
                        )}
                      >
                        <div
                          className={cn(
                            "relative h-11 w-11 shrink-0 overflow-hidden rounded-lg",
                            !liberado && "grayscale"
                          )}
                        >
                          <img
                            src={item.imagem}
                            alt={item.nome}
                            loading="lazy"
                            className={cn(
                              "h-full w-full object-contain",
                              !liberado && "opacity-30"
                            )}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{item.nome}</p>
                          <Badge
                            variant={liberado ? "sucesso" : "outline"}
                            className={cn(
                              "mt-1",
                              !liberado && "text-muted-foreground/60"
                            )}
                          >
                            {liberado ? "Desbloqueado" : "Bloqueado"}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Próximos marcos */}
            <section className="rounded-xl border border-input bg-card/40 p-4">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
                <Award className="h-4 w-4" />
                Como evoluir
              </h3>
              <ul className="flex flex-col gap-2 text-sm text-foreground/80">
                <li className="flex items-start gap-2">
                  <HardHat className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  Complete as semanas para aumentar seu IME e desbloquear o próximo estágio.
                </li>
                <li className="flex items-start gap-2">
                  <Award className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  Complete módulos e atinja IME 70 para liberar os itens do avatar.
                </li>
              </ul>
            </section>

            {/* Onda 6 — vitrine pública + compartilhamento */}
            <ConfiguracaoPaginaPublica userId={userId} />
            <CompartilharEvolucao userId={userId} />

            {/* Prompt #25 — opt-out dos lembretes semanais */}
            <ConfiguracaoLembretes userId={userId} />
          </div>
        )}
      </div>
    </Layout>
  );
}