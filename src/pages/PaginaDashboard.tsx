import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  FileText,
  Loader2,
  Lock,
  PlayCircle,
} from "lucide-react";

import { Layout } from "@/components/Layout";
import { RadarEmpresa } from "@/components/RadarEmpresa";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MODULOS, SEMANAS } from "@/lib/conteudo";
import { supabase } from "@/lib/supabase";
import type { PainelMensal, Perfil, ProgressoSemana } from "@/lib/types";
import { cn, formatBRL } from "@/lib/utils";
const STATUS_INFO = {
  bloqueada: { rotulo: "Bloqueada", icon: Lock, classes: "text-muted-foreground" },
  em_andamento: { rotulo: "Em andamento", icon: PlayCircle, classes: "text-amber-400" },
  concluida: { rotulo: "Concluída", icon: CheckCircle2, classes: "text-emerald-400" },
} as const;

export function PaginaDashboard({ perfil }: { perfil: Perfil }) {
  const navigate = useNavigate();
  const [semanas, setSemanas] = useState<ProgressoSemana[] | null>(null);
  const [paineis, setPaineis] = useState<PainelMensal[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro(false);
    async function carregar() {
      const [resSemanas, resPaineis] = await Promise.all([
        supabase
          .from("progresso_semanas")
          .select("*")
          .order("semana", { ascending: true }),
        supabase
          .from("paineis_mensais")
          .select("*")
          .order("numero_painel", { ascending: true }),
      ]);
      if (!ativo) return;
      if (resSemanas.error || resPaineis.error) {
        setErro(true);
        setCarregando(false);
        return;
      }
      setSemanas(resSemanas.data);
      setPaineis(resPaineis.data);
      setCarregando(false);
    }
    void carregar();
    return () => {
      ativo = false;
    };
  }, [tentativa]);

  const semanaPorNumero = new Map((semanas ?? []).map((s) => [s.semana, s]));
  const concluidas = (semanas ?? []).filter((s) => s.status === "concluida").length;
  const semana12 = semanaPorNumero.get(12);
  const manualLiberado = semana12?.status === "concluida";

  return (
    <Layout nomeUsuario={perfil.nome ?? perfil.email_refriclube ?? ""}>
      <div className="flex flex-col gap-8">
        <RadarEmpresa userId={perfil.id} />

        {carregando && (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {erro && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-10 text-center">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <p className="text-sm text-foreground/90">
              Não foi possível carregar seus dados agora. Verifique sua conexão e tente
              novamente.
            </p>
            <Button variant="outline" onClick={() => setTentativa((t) => t + 1)}>
              Tentar novamente
            </Button>
          </div>
        )}

        {!carregando && !erro && (
          <>
        <section>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Olá, {perfil.nome?.split(" ")[0] ?? "profissional"}.
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Seu caminho para transformar o seu negócio em 90 dias.
          </p>
          <div className="mt-5 flex items-center gap-3">
            <Progress value={(concluidas / 12) * 100} className="h-2.5 flex-1" />
            <span className="whitespace-nowrap text-sm font-medium">
              {concluidas} de 12 semanas concluídas
            </span>
          </div>
        </section>

        {manualLiberado && (
          <section className="rounded-xl border border-primary/50 bg-gradient-to-r from-primary/15 to-transparent p-5">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Plano concluído — Parabéns!
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Reúna tudo o que construiu nos 90 dias no seu Manual da Empresa.
                </p>
              </div>
              <Button onClick={() => navigate("/manual")}>
                <FileText />
                Gerar Manual da Empresa
              </Button>
            </div>
          </section>
        )}

        {paineis.length > 0 && (
          <section>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Painel Mensal mais recente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <UltimoPainel painel={paineis[paineis.length - 1]} />
              </CardContent>
            </Card>
          </section>
        )}

        {MODULOS.map((modulo) => {
          const semanasModulo = SEMANAS.filter((s) => s.modulo === modulo.numero);
          return (
            <section key={modulo.numero}>
              <div className="mb-4">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h2 className="text-xl font-bold text-primary">
                    Módulo {modulo.numero} — {modulo.titulo}
                  </h2>
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {modulo.dias}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{modulo.descricao}</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {semanasModulo.map((semana) => {
                  const progresso = semanaPorNumero.get(semana.numero);
                  const status = progresso?.status ?? "bloqueada";
                  const info = STATUS_INFO[status];
                  const clicavel = status !== "bloqueada";
                  return (
                    <Link
                      key={semana.numero}
                      to={clicavel ? `/semana/${semana.numero}` : "#"}
                      aria-disabled={!clicavel}
                      className={cn(
                        "group rounded-xl border bg-card p-4 transition-colors",
                        clicavel
                          ? "hover:border-primary/60 hover:bg-card/80"
                          : "cursor-not-allowed opacity-60"
                      )}
                      onClick={(e) => {
                        if (!clicavel) e.preventDefault();
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wider text-primary">
                            Semana {semana.numero}
                          </p>
                          <h3 className="mt-1 font-semibold leading-snug">{semana.titulo}</h3>
                        </div>
                        <Badge variant={status === "concluida" ? "sucesso" : status === "em_andamento" ? "pendente" : "outline"}>
                          <info.icon className="h-3 w-3" />
                          {info.rotulo}
                        </Badge>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                        {semana.objetivo}
                      </p>
                      {status === "concluida" && (
                        <p className="mt-2 text-xs text-emerald-400/80">
                          Concluída em{" "}
                          {new Date(
                            semanaPorNumero.get(semana.numero)!.concluida_em!
                          ).toLocaleDateString("pt-BR")}
                        </p>
                      )}
                      {clicavel && (
                        <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                          Abrir semana <ChevronRight className="h-3 w-3" />
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
          </>
        )}
      </div>
    </Layout>
  );
}

function UltimoPainel({ painel }: { painel: PainelMensal }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">Faturamento</p>
          <p className="font-semibold">{formatBRL(painel.faturamento_atual)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Lucro</p>
          <p className="font-semibold">{formatBRL(painel.lucro)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Ticket médio</p>
          <p className="font-semibold">{formatBRL(painel.ticket_medio)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Clientes</p>
          <p className="font-semibold">{painel.numero_clientes ?? "—"}</p>
        </div>
      </div>
      <Button asChild variant="outline">
        <Link to={`/painel/${painel.numero_painel}`}>
          Abrir painel <ChevronRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
