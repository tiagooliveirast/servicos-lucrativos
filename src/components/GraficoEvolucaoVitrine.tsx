import { TrendingUp } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OURO } from "@/lib/pdf-estilos";
import type { SerieEvolucao } from "@/lib/evolucao";

const LARGURA = 320;
const ALTURA = 170;
const MARGEM_X = 12;
const MARGEM_TOPO = 20;
const MARGEM_BAIXO = 26;

/**
 * Versão leve do gráfico de evolução para a página pública (/empresa/[slug]),
 * onde qualquer visitante anônimo pode cair. É um sparkline SVG puro, sem
 * Recharts — a biblioteca de gráficos (grande) só é carregada nas telas
 * internas do aluno.
 */
export function GraficoEvolucaoVitrine({
  titulo,
  descricao,
  serie,
  mascara,
  mensagemVazia,
}: {
  titulo: string;
  descricao: string;
  serie: SerieEvolucao;
  mascara: (v: number) => string;
  mensagemVazia?: string;
}) {
  const pontos = serie.pontos;
  const suficientes = serie.suficiente && pontos.length >= 2;

  const geometria = (() => {
    if (!suficientes) return null;
    const valores = pontos.map((p) => p.valor);
    const minimo = Math.min(...valores);
    const maximo = Math.max(...valores);
    const intervalo = maximo - minimo || 1;
    const alturaInterna = ALTURA - MARGEM_TOPO - MARGEM_BAIXO;
    const coordenadas = pontos.map((p, i) => {
      const x = MARGEM_X + (i * (LARGURA - MARGEM_X * 2)) / (pontos.length - 1);
      const y = MARGEM_TOPO + (1 - (p.valor - minimo) / intervalo) * alturaInterna;
      return { x, y };
    });
    const primeiro = coordenadas[0];
    const ultimo = coordenadas[coordenadas.length - 1];
    return {
      polilinha: coordenadas.map((c) => `${c.x},${c.y}`).join(" "),
      primeiro,
      ultimo,
      primeiroRotulo: pontos[0].rotulo,
      ultimoRotulo: pontos[pontos.length - 1].rotulo,
      primeiroTexto: mascara(pontos[0].valor),
      ultimoTexto: mascara(pontos[pontos.length - 1].valor),
    };
  })();

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
        {geometria ? (
          <svg
            viewBox={`0 0 ${LARGURA} ${ALTURA}`}
            className="h-auto w-full"
            role="img"
            aria-label={titulo}
          >
            <polygon
              points={`${MARGEM_X},${ALTURA - MARGEM_BAIXO} ${geometria.polilinha} ${LARGURA - MARGEM_X},${ALTURA - MARGEM_BAIXO}`}
              fill={OURO}
              opacity={0.08}
            />
            <polyline
              points={geometria.polilinha}
              fill="none"
              stroke={OURO}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx={geometria.primeiro.x} cy={geometria.primeiro.y} r={3} fill={OURO} />
            <circle cx={geometria.ultimo.x} cy={geometria.ultimo.y} r={4} fill={OURO} />
            <text x={MARGEM_X} y={ALTURA - 8} fontSize={11} fill="#6B6559">
              {geometria.primeiroRotulo}
            </text>
            <text
              x={LARGURA - MARGEM_X}
              y={ALTURA - 8}
              fontSize={11}
              fill="#6B6559"
              textAnchor="end"
            >
              {geometria.ultimoRotulo}
            </text>
            <text
              x={MARGEM_X}
              y={geometria.primeiro.y - 8}
              fontSize={11}
              fontWeight={600}
              fill={OURO}
            >
              {geometria.primeiroTexto}
            </text>
            <text
              x={geometria.ultimo.x}
              y={geometria.ultimo.y - 10}
              fontSize={11}
              fontWeight={600}
              fill={OURO}
              textAnchor="end"
            >
              {geometria.ultimoTexto}
            </text>
          </svg>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {mensagemVazia ??
              "Ainda não há dados suficientes para este gráfico. Continue as semanas, preencha indicadores e painéis para começar a ver sua evolução."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
