import { TrendingUp } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OURO } from "@/lib/pdf-estilos";
import type { SerieEvolucao } from "@/lib/evolucao";

/**
 * Gráfico de linha da página de Evolução, reutilizado em versão somente
 * leitura na página pública da empresa (/empresa/[slug]). Sem interações
 * de escrita — apenas apresentação dos dados já calculados.
 */
export function GraficoEvolucao({
  titulo,
  descricao,
  serie,
  mascara,
  altura = 260,
  mensagemVazia,
}: {
  titulo: string;
  descricao: string;
  serie: SerieEvolucao;
  mascara: (v: number) => string;
  altura?: number;
  mensagemVazia?: string;
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
          <ResponsiveContainer width="100%" height={altura}>
            <RechartsLineChart
              data={serie.pontos}
              margin={{ top: 8, right: 12, bottom: 0, left: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#2e2820" />
              <XAxis
                dataKey="rotulo"
                tick={{ fontSize: 12, fill: "#6B6559" }}
                tickLine={false}
                axisLine={{ stroke: "#3a332a" }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#6B6559" }}
                tickLine={false}
                axisLine={{ stroke: "#3a332a" }}
                width={80}
                tickFormatter={(v: number) => mascara(v)}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #3a332a",
                  fontSize: 12,
                  background: "#141110",
                }}
                formatter={(v: number | string) => mascara(Number(v))}
                labelStyle={{ color: "#a89f8f", fontWeight: 600 }}
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
            {mensagemVazia ??
              "Ainda não há dados suficientes para este gráfico. Continue as semanas, preencha indicadores e painéis para começar a ver sua evolução."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}