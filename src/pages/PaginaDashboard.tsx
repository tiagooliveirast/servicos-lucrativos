import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Award,
  BarChart3,
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  FileText,
  Flame,
  Gauge,
  HardHat,
  HelpCircle,
  LineChart,
  Lock,
  PartyPopper,
  PlayCircle,
} from "lucide-react";

import { CartaoCarregando } from "@/components/CartaoCarregando";
import { CartaoErro } from "@/components/CartaoErro";
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
import { useEhAdmin } from "@/hooks/useEhAdmin";
import { MODULOS, SEMANAS } from "@/lib/conteudo";
import { contarMinhasDuvidasRespondidas } from "@/lib/duvidas";
import { carregarPerfilGamificacao } from "@/lib/gamificacao";
import { supabase } from "@/lib/supabase";
import type { GamificacaoUsuario, PainelMensal, Perfil, ProgressoSemana } from "@/lib/types";
import { cn, formatBRL, formatNumero } from "@/lib/utils";
const STATUS_INFO = {
  bloqueada: { rotulo: "Bloqueada", icon: Lock, classes: "text-muted-foreground" },
  em_andamento: { rotulo: "Em andamento", icon: PlayCircle, classes: "text-amber-400" },
  concluida: { rotulo: "Concluída", icon: CheckCircle2, classes: "text-emerald-400" },
  liberada: { rotulo: "Liberada", icon: CheckCircle2, classes: "text-primary" },
} as const;

export function PaginaDashboard({ perfil }: { perfil: Perfil }) {
  const navigate = useNavigate();
  const { ehAdmin, carregando: checandoAdmin } = useEhAdmin();
  const [semanas, setSemanas] = useState<ProgressoSemana[] | null>(null);
  const [paineis, setPaineis] = useState<PainelMensal[]>([]);
  const [gamificacao, setGamificacao] = useState<GamificacaoUsuario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const [duvidasRespondidas, setDuvidasRespondidas] = useState(0);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro(false);
    async function carregar() {
      const [resSemanas, resPaineis, resGamificacao, resDuvidas] = await Promise.all([
        supabase
          .from("progresso_semanas")
          .select("*")
          .order("semana", { ascending: true }),
        supabase
          .from("paineis_mensais")
          .select("*")
          .order("numero_painel", { ascending: true }),
        (async () => {
          try {
            return await carregarPerfilGamificacao(perfil.id);
          } catch {
            return null;
          }
        })(),
        contarMinhasDuvidasRespondidas(perfil.id).catch(() => 0),
      ]);
      if (!ativo) return;
      if (resSemanas.error || resPaineis.error) {
        setErro(true);
        setCarregando(false);
        return;
      }
      setSemanas(resSemanas.data);
      setPaineis(resPaineis.data);
      setGamificacao(resGamificacao);
      setDuvidasRespondidas(resDuvidas);
      setCarregando(false);
    }
    void carregar();
    return () => {
      ativo = false;
    };
  }, [tentativa, perfil.id]);

  const semanaPorNumero = new Map((semanas ?? []).map((s) => [s.semana, s]));
  const concluidas = (semanas ?? []).filter((s) => s.status === "concluida").length;
  const semana12 = semanaPorNumero.get(12);
  const manualLiberado = semana12?.status === "concluida";

  return (
    <Layout nomeUsuario={perfil.nome ?? perfil.email_refriclube ?? ""}>
      <div className="flex flex-col gap-8">
        <RadarEmpresa userId={perfil.id} />

        {duvidasRespondidas > 0 && (
          <section className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-5">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <HelpCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold leading-snug">
                    Você tem {duvidasRespondidas}{" "}
                    {duvidasRespondidas === 1
                      ? "dúvida respondida"
                      : "dúvidas respondidas"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    O Tiago respondeu na Central de Dúvidas.
                  </p>
                </div>
              </div>
              <Button onClick={() => navigate("/duvidas")} variant="outline" className="shrink-0">
                Ver resposta
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </section>
        )}

        {gamificacao && (
          <section className="rounded-xl border border-primary/40 bg-gradient-to-r from-primary/15 to-transparent p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                  <Award className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-lg font-bold leading-none">
                    Nível {gamificacao.nivel}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {gamificacao.xp_total} XP
                  </p>
                </div>
                {gamificacao.dias_consecutivos > 0 && (
                  <div className="ml-2 flex items-center gap-1.5 rounded-full bg-orange-500/15 px-3 py-1 text-sm font-medium text-orange-400">
                    <Flame className="h-4 w-4" />
                    {gamificacao.dias_consecutivos} dias
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link to="/conquistas">
                    <Award className="h-4 w-4" />
                    Conquistas
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link to="/bauis">
                    <PartyPopper className="h-4 w-4" />
                    Baús
                  </Link>
                </Button>
              </div>
            </div>
            <Progress
              value={(gamificacao.xp_total % 300) * (100 / 300)}
              className="mt-4 h-2"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              {300 - (gamificacao.xp_total % 300)} XP para o Nível {gamificacao.nivel + 1}
            </p>
          </section>
        )}

        <section>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <LinkAcesso
              to="/ime"
              icone={Gauge}
              titulo="Seu IME"
              texto="Acompanhe de 0 a 100 a maturidade da sua empresa."
            />
            <LinkAcesso
              to="/check-in"
              icone={CalendarCheck}
              titulo="Check-in semanal"
              texto="Registre como foi sua semana em 2 minutos."
            />
            <LinkAcesso
              to="/evolucao"
              icone={LineChart}
              titulo="Sua Evolução"
              texto="Veja os gráficos do seu faturamento, lucro, ticket e IME."
            />
            <LinkAcesso
              to="/relatorios"
              icone={FileText}
              titulo="Relatórios & Certificado"
              texto="Gere o Relatório de Implantação e o Certificado."
            />
            <LinkAcesso
              to="/minha-empresa"
              icone={HardHat}
              titulo="Minha Empresa"
              texto="Veja o estágio da sua empresa e o avatar com os itens desbloqueados."
            />
            <LinkAcesso
              to="/duvidas"
              icone={HelpCircle}
              titulo="Central de Dúvidas"
              texto="Envie dúvidas e veja as respostas do Tiago."
            />
          </div>
        </section>

        {carregando && <CartaoCarregando />}

        {erro && (
          <CartaoErro
            mensagem="Não foi possível carregar seus dados agora. Verifique sua conexão e tente novamente."
            onTentar={() => setTentativa((t) => t + 1)}
          />
        )}

        {!carregando && !checandoAdmin && !erro && (
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
                  Painéis mensais
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {paineis.map((painel) => (
                  <UltimoPainel key={painel.numero_painel} painel={painel} />
                ))}
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
                  const status = ehAdmin
                    ? "liberada"
                    : (progresso?.status ?? "bloqueada");
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
                          <h3 className="mt-1 font-semibold leading-snug">{semana.tituloCurto}</h3>
                        </div>
                        <Badge variant={status === "concluida" ? "sucesso" : status === "em_andamento" ? "pendente" : "outline"}>
                          <info.icon className="h-3 w-3" />
                          {info.rotulo}
                        </Badge>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                        {semana.objetivo}
                      </p>
                      {status === "concluida" && (() => {
                        const concluidaEm = semanaPorNumero.get(semana.numero)?.concluida_em;
                        if (!concluidaEm) return null;
                        return (
                          <p className="mt-2 text-xs text-emerald-400/80">
                            Concluída em{" "}
                            {new Date(concluidaEm).toLocaleDateString("pt-BR")}
                          </p>
                        );
                      })()}
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

function LinkAcesso({
  to,
  titulo,
  texto,
  icone: Icone,
}: {
  to: string;
  titulo: string;
  texto: string;
  icone: typeof Gauge;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-4 rounded-xl border bg-card p-4 transition-colors hover:border-primary/60"
    >
      <Icone className="h-6 w-6 shrink-0 text-primary" />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="font-semibold leading-snug">{titulo}</span>
        <span className="text-sm text-muted-foreground">{texto}</span>
      </span>
      <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}

function UltimoPainel({ painel }: { painel: PainelMensal }) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-input p-4 sm:flex-row sm:items-center sm:justify-between">
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
          <p className="font-semibold">{formatNumero(painel.numero_clientes)}</p>
        </div>
      </div>
      <Button asChild variant="outline">
        <Link to={`/painel/${painel.numero_painel}`}>
          Abrir Painel {painel.numero_painel} <ChevronRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
