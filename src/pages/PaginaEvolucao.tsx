import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, LineChart } from "lucide-react";

import { GraficoEvolucao } from "@/components/GraficoEvolucao";
import { CartaoCarregando } from "@/components/CartaoCarregando";
import { CartaoErro } from "@/components/CartaoErro";
import { Layout } from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
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
        <CartaoCarregando />
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
          <CartaoErro
            mensagem="Não foi possível carregar seus dados agora. Verifique sua conexão e tente novamente."
            onTentar={() => setTentativa((t) => t + 1)}
          />
        )}

        {!erro && dados && series && <Graficos series={series} />}
      </div>
    </Layout>
  );
}

function Graficos({ series }: { series: SeriesEvolucao }) {
  return (
    <div className="flex flex-col gap-4">
      <GraficoEvolucao
        titulo="Índice de Maturidade Empresarial (IME)"
        descricao="De 0 a 100, atualizado a cada semana concluída, painel preenchido e check-in."
        serie={series.ime}
        mascara={(v) => String(Math.round(v))}
      />
      <GraficoEvolucao
        titulo="Faturamento"
        descricao="Evolução do faturamento mensal (painéis, check-ins e indicador da Semana 1)."
        serie={series.faturamento}
        mascara={(v) => formatBRL(v)}
      />
      <GraficoEvolucao
        titulo="Lucro"
        descricao="Evolução do lucro mensal (painéis e check-ins)."
        serie={series.lucro}
        mascara={(v) => formatBRL(v)}
      />
      <GraficoEvolucao
        titulo="Ticket médio"
        descricao="Preço médio do que você vende (painéis e indicador da Semana 3)."
        serie={series.ticket}
        mascara={(v) => formatBRL(v)}
      />
      <GraficoEvolucao
        titulo="Taxa de conversão"
        descricao="Percentual dos orçamentos que viram venda (painéis e indicador da Semana 10)."
        serie={series.conversao}
        mascara={(v) => `${v.toFixed(1)}%`}
      />
    </div>
  );
}