import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, LineChart, Loader2, TriangleAlert, TrendingUp } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
import {
  OURO,
  serieConversao,
  serieFaturamento,
  serieIme,
  serieLucro,
  serieTicket,
  type SerieEvolucao,
} from "@/lib/evolucao";
import { carregarDadosTransformacao, type DadosTransformacao } from "@/lib/transformacao";
import { formatBRL } from "@/lib/utils";

interface SeriesEvolucao {
  ime: SerieEvolucao;
  faturamento: SerieEvolucao;
  lucro: SerieEvolucao;
  ticket: SerieEvolucao;
  conversao: SerieEvolucao;
}

export function PaginaEvolucao({ userId }: { userId: string }) {
  const [dados, setDados] = useState<DadosTransformacao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro(false);
    async function carregar() {
      try {
        const transformacao = await carregarDadosTransformacao(userId);
        if (!ativo) return;
        setDados(transformacao);
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

  if (carregando) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const series = dados
    ? {
        ime: serieIme(dados.ime),
        faturamento: serieFaturamento(dados.indicadores, dados.paineis, dados.checkins),
        lucro: serieLucro(dados.paineis, dados.checkins),
        ticket: serieTicket(dados.indicadores, dados.paineis),
        conversao: serieConversao(dados.indicadores, dados.paineis),
      }
    : null;

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
          <div className="mt-3 flex items-center gap-2">
            <Badge variant="outline" className="text-primary">
              Evolução
            </Badge>
          </div>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
            <LineChart className="h-7 w-7 text-primary" />
            Sua Evolução
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe seu progresso mês a mês. Os gráficos são montados a partir dos seus
            indicadores, painéis mensais, check-ins semanais e do seu IME.
          </p>
        </div>

        {erro && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-10 text-center">
            <TriangleAlert className="h-6 w-6 text-destructive" />
            <p className="text-sm text-foreground/90">
              Não foi possível carregar seus dados agora. Verifique sua conexão e tente
              novamente.
            </p>
            <Button variant="outline" onClick={() => setTentativa((t) => t + 1)}>
              Tentar novamente
            </Button>
          </div>
        )}

        {!erro && dados && series && <Graficos series={series} />}
      </div>
    </Layout>
  );
}

function Graficos({ series }: { series: SeriesEvolucao }) {
  return (
    <div className="flex flex-col gap-4">
      <GraficoLinha
        titulo="Índice de Maturidade Empresarial (IME)"
        descricao="De 0 a 100, atualizado a cada semana concluída, painel preenchido e check-in."
        serie={series.ime}
        mascara={(v) => String(Math.round(v))}
      />
      <GraficoLinha
        titulo="Faturamento"
        descricao="Evolução do faturamento mensal (painéis, check-ins e indicador da Semana 1)."
        serie={series.faturamento}
        mascara={(v) => formatBRL(v)}
      />
      <GraficoLinha
        titulo="Lucro"
        descricao="Evolução do lucro mensal (painéis e check-ins)."
        serie={series.lucro}
        mascara={(v) => formatBRL(v)}
      />
      <GraficoLinha
        titulo="Ticket médio"
        descricao="Preço médio do que você vende (painéis e indicador da Semana 3)."
        serie={series.ticket}
        mascara={(v) => formatBRL(v)}
      />
      <GraficoLinha
        titulo="Taxa de conversão"
        descricao="Percentual dos orçamentos que viram venda (painéis e indicador da Semana 10)."
        serie={series.conversao}
        mascara={(v) => `${v.toFixed(1)}%`}
      />
    </div>
  );
}

function GraficoLinha({
  titulo,
  descricao,
  serie,
  mascara,
}: {
  titulo: string;
  descricao: string;
  serie: SerieEvolucao;
  mascara: (v: number) => string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4 text-primary" />
          {titulo}
        </CardTitle>
        <CardDescription>{descricao}</CardDescription>
      </CardHeader>
      <CardContent>
        {serie.suficiente ? (
          <ResponsiveContainer width="100%" height={260}>
            <RechartsLineChart
              data={serie.pontos}
              margin={{ top: 8, right: 12, bottom: 0, left: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#EFEADD" />
              <XAxis
                dataKey="rotulo"
                tick={{ fontSize: 12, fill: "#6B6559" }}
                tickLine={false}
                axisLine={{ stroke: "#E5DFD0" }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#6B6559" }}
                tickLine={false}
                axisLine={{ stroke: "#E5DFD0" }}
                width={80}
                tickFormatter={(v: number) => mascara(v)}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #E5DFD0",
                  fontSize: 12,
                  background: "#FFFFFF",
                }}
                formatter={(v: number | string) => mascara(Number(v))}
                labelStyle={{ color: "#6B6559", fontWeight: 600 }}
              />
              <Line
                type="monotone"
                dataKey="valor"
                stroke={OURO}
                strokeWidth={2.5}
                dot={{ r: 4, fill: OURO, strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Ainda não há dados suficientes para este gráfico. Continue as semanas, preencha
            indicadores e painéis para começar a ver sua evolução.
          </p>
        )}
      </CardContent>
    </Card>
  );
}