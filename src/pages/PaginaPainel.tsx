import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, BarChart3, CheckCircle2, Loader2 } from "lucide-react";

import { Layout } from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import type { PainelMensal } from "@/lib/types";
import { cn, formatBRL, formatNumero, formatPorcento } from "@/lib/utils";

const TEXTO_INTRO_PAINEL =
  "Pare aqui e atualize seu painel. Leva 5 minutos e é o que te mostra, em números, se você está evoluindo de verdade. Preencha com o que você tem hoje — se algum número você ainda não sabe, estime e ajuste no próximo painel.";

const DICA_PAINEL =
  "Compare com o painel anterior (se for o primeiro, guarde ele como referência pros próximos). O que mais mudou? O que ainda não saiu do lugar? Não precisa ser tudo positivo — o objetivo é ter clareza, não perfeição.";

const CONFIG_PAINEIS: Record<number, { rotulo: string; semanaChave: number }> = {
  1: { rotulo: "Fim do Módulo 1 — Dia 30", semanaChave: 4 },
  2: { rotulo: "Fim do Módulo 2 — Dia 60", semanaChave: 8 },
  3: { rotulo: "Fim do Módulo 3 — Dia 90 (Final)", semanaChave: 12 },
};

const CAMPOS_PAINEL = [
  { id: "meta_mensal", rotulo: "Meta mensal (R$)", tipo: "numero" as const, mascara: formatBRL },
  { id: "faturamento_atual", rotulo: "Faturamento atual (R$)", tipo: "numero" as const, mascara: formatBRL },
  { id: "lucro", rotulo: "Lucro (R$)", tipo: "numero" as const, mascara: formatBRL },
  { id: "ticket_medio", rotulo: "Ticket médio (R$)", tipo: "numero" as const, mascara: formatBRL },
  { id: "numero_clientes", rotulo: "Nº de clientes atendidos", tipo: "inteiro" as const, mascara: formatNumero },
  { id: "numero_orcamentos", rotulo: "Nº de orçamentos enviados", tipo: "inteiro" as const, mascara: formatNumero },
  { id: "taxa_conversao", rotulo: "Taxa de conversão (%)", tipo: "numero" as const, mascara: formatPorcento },
  { id: "avaliacoes_google", rotulo: "Avaliações no Google", tipo: "inteiro" as const, mascara: formatNumero },
  { id: "reserva_emergencia", rotulo: "Reserva de emergência (R$)", tipo: "numero" as const, mascara: formatBRL },
] as const;

export function PaginaPainel({ userId }: { userId: string }) {
  const { numero } = useParams();
  const n = Number(numero);
  const config = CONFIG_PAINEIS[n];
  const semanaChave = config?.semanaChave ?? 0;

  const [liberado, setLiberado] = useState<boolean | null>(null);
  const [painel, setPainel] = useState<PainelMensal | null>(null);
  const [painelAnterior, setPainelAnterior] = useState<PainelMensal | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro(false);
    async function carregar() {
      const { data: semana, error: erroSemana } = await supabase
        .from("progresso_semanas")
        .select("status")
        .eq("user_id", userId)
        .eq("semana", semanaChave)
        .maybeSingle();
      if (!ativo) return;
      if (erroSemana) {
        setErro(true);
        setCarregando(false);
        return;
      }
      if (!semana || semana.status !== "concluida") {
        setLiberado(false);
        setCarregando(false);
        return;
      }
      const [resPainel, resAnterior] = await Promise.all([
        supabase
          .from("paineis_mensais")
          .select("*")
          .eq("user_id", userId)
          .eq("numero_painel", n)
          .maybeSingle(),
        n > 1
          ? supabase
              .from("paineis_mensais")
              .select("*")
              .eq("user_id", userId)
              .eq("numero_painel", n - 1)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);
      if (!ativo) return;
      if (resPainel.error || resAnterior.error) {
        setErro(true);
        setCarregando(false);
        return;
      }
      setPainel((resPainel.data as PainelMensal | null) ?? null);
      setPainelAnterior((resAnterior.data as PainelMensal | null) ?? null);
      setLiberado(true);
      setCarregando(false);
    }
    void carregar();
    return () => {
      ativo = false;
    };
  }, [userId, n, semanaChave, tentativa]);

  if (carregando) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }
  if (erro) {
    return (
      <Layout>
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
      </Layout>
    );
  }
  if (!liberado || (n !== 1 && n !== 2 && n !== 3)) return <Navigate to="/" replace />;

  return (
    <PainelForm
      userId={userId}
      numero={n}
      painel={painel}
      painelAnterior={painelAnterior}
      config={config}
    />
  );
}

function PainelForm({
  userId,
  numero,
  painel,
  painelAnterior,
  config,
}: {
  userId: string;
  numero: number;
  painel: PainelMensal | null;
  painelAnterior: PainelMensal | null;
  config: { rotulo: string; semanaChave: number };
}) {
  const [valores, setValores] = useState<Record<string, string>>(inicializar(painel));
  const [observacao, setObservacao] = useState(painel?.observacao ?? "");
  const [salvoEm, setSalvoEm] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [completo, setCompleto] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const estadoInicialRef = useRef<string>(
    JSON.stringify({ ...inicializar(painel), observacao: painel?.observacao ?? "" })
  );

  useEffect(() => {
    let ativo = true;
    async function verificarCompleto() {
      const { data } = await supabase
        .from("paineis_mensais")
        .select("faturamento_atual")
        .eq("user_id", userId)
        .eq("numero_painel", numero)
        .maybeSingle();
      if (!ativo) return;
      setCompleto(data?.faturamento_atual != null);
      setCarregando(false);
    }
    void verificarCompleto();
    return () => {
      ativo = false;
    };
  }, [userId, numero]);

  const salvar = useCallback(
    async (novosValores: Record<string, string>, novaObservacao: string) => {
      setSalvando(true);
      const corpo = Object.fromEntries(
        Object.entries(novosValores).map(([id, valor]) => [
          id,
          valor === "" ? null : Number(valor),
        ])
      );
      // Só registra "preenchido em" quando houve mudança real — isso evita que
      // simples visitas à página disparem o relatório mensal (Regra 8 do Radar).
      const mudou =
        JSON.stringify({ ...novosValores, observacao: novaObservacao }) !==
        estadoInicialRef.current;
      const { error } = await supabase
        .from("paineis_mensais")
        .upsert(
          {
            user_id: userId,
            numero_painel: numero,
            ...corpo,
            observacao: novaObservacao || null,
            ...(mudou ? { preenchido_em: new Date().toISOString() } : {}),
          },
          { onConflict: "user_id,numero_painel" }
        );
      setSalvando(false);
      if (!error) {
        setSalvoEm(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
        // Só marca "Preenchido" quando o faturamento foi de fato informado —
        // salvar um painel vazio não conta como preenchimento.
        const faturamento = novosValores.faturamento_atual;
        setCompleto(faturamento !== undefined && faturamento !== "");
      }
    },
    [userId, numero]
  );

  const jaCarregou = useRef(false);

  useEffect(() => {
    if (!jaCarregou.current) {
      jaCarregou.current = true;
      return;
    }
    const timer = setTimeout(() => {
      void salvar(valores, observacao);
    }, 700);
    return () => clearTimeout(timer);
  }, [valores, observacao, salvar]);

  function atualizar(id: string, valor: string) {
    setValores((v) => ({ ...v, [id]: valor }));
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
              Painel Mensal {numero}
            </Badge>
            {completo && <Badge variant="sucesso">Preenchido</Badge>}
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Painel Mensal {numero}
          </h1>
          <p className="mt-1 text-sm font-medium text-primary">{config.rotulo}</p>
          <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
            <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            {TEXTO_INTRO_PAINEL}
          </p>
        </div>

        <p className="rounded-lg border border-primary/25 bg-primary/5 p-4 text-sm text-foreground/90">
          {DICA_PAINEL}
        </p>

        {carregando ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Indicadores do mês</CardTitle>
              <CardDescription>Compare com o painel anterior e veja sua evolução.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                {CAMPOS_PAINEL.map((campo) => (
                  <div key={campo.id} className="flex flex-col gap-2">
                    <Label htmlFor={campo.id}>{campo.rotulo}</Label>
                    <Input
                      id={campo.id}
                      type="number"
                      min="0"
                      step={campo.tipo === "inteiro" ? "1" : "0.01"}
                      inputMode={campo.tipo === "inteiro" ? "numeric" : "decimal"}
                      value={valores[campo.id] ?? ""}
                      placeholder="0"
                      onChange={(e) => atualizar(campo.id, e.target.value)}
                    />
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="observacao">O que mais me chamou atenção nesse painel:</Label>
                <Textarea
                  id="observacao"
                  rows={3}
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
                {salvando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {salvando ? "Salvando…" : salvoEm ? `Salvo às ${salvoEm}` : "Tudo salvo"}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Evolução entre painéis
            </CardTitle>
            <CardDescription>
              {painelAnterior
                ? "Veja de onde você saiu e onde está agora."
                : "Preencha este painel para começar o comparativo."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Comparativo painelAtual={painel} painelAnterior={painelAnterior} valores={valores} />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

function paraNumero(valor: number | string | null | undefined): number | null {
  if (valor === null || valor === undefined) return null;
  const n = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(n) ? n : null;
}

function Comparativo({
  painelAtual,
  painelAnterior,
  valores,
}: {
  painelAtual: PainelMensal | null;
  painelAnterior: PainelMensal | null;
  valores: Record<string, string>;
}) {
  const colunas =
    "grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_1fr_1fr] gap-x-6";

  return (
    <div className="flex flex-col gap-2">
      <div className={cn(colunas, "border-b pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground")}>
        <span>Indicador</span>
        <span className="text-right">Painel anterior</span>
        <span className="text-right">Este painel</span>
      </div>
      {CAMPOS_PAINEL.map((campo) => {
        const anterior = painelAnterior
          ? campo.mascara(
              paraNumero(painelAnterior[campo.id as keyof PainelMensal] as number | string | null)
            )
          : "—";
        const atual =
          painelAtual
            ? campo.mascara(
                paraNumero(painelAtual[campo.id as keyof PainelMensal] as number | string | null)
              )
            : valores[campo.id] !== undefined && valores[campo.id] !== ""
              ? campo.mascara(Number(valores[campo.id]))
              : "—";
        return (
          <div key={campo.id} className={cn(colunas, "border-b py-2 text-sm last:border-0")}>
            <span className="text-foreground/90">{campo.rotulo}</span>
            <span className="text-right text-muted-foreground">{anterior}</span>
            <span className="text-right font-medium">{atual}</span>
          </div>
        );
      })}
    </div>
  );
}

function inicializar(painel: PainelMensal | null): Record<string, string> {
  if (!painel) return {};
  const resultado: Record<string, string> = {};
  for (const campo of CAMPOS_PAINEL) {
    const v = painel[campo.id as keyof PainelMensal];
    // O PostgREST devolve colunas numeric como string; ambos são aceitos.
    if (typeof v === "number" || typeof v === "string") {
      if (v !== "") resultado[campo.id] = String(v);
    }
  }
  return resultado;
}
