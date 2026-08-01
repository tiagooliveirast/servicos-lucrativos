import { AlertTriangle, Loader2, OctagonAlert, Radar, Target, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRadar } from "@/hooks/useRadar";
import { missaoRecomendada, type AlertaRadar, type CategoriaRadar } from "@/lib/regras-radar";
import { cn } from "@/lib/utils";

const SECOES: {
  categoria: CategoriaRadar;
  titulo: string;
  icone: typeof TrendingUp;
  classeIcone: string;
  classeBorda: string;
}[] = [
  {
    categoria: "vermelho",
    titulo: "Riscos",
    icone: OctagonAlert,
    classeIcone: "text-red-400",
    classeBorda: "border-red-500/40",
  },
  {
    categoria: "amarelo",
    titulo: "Pontos de atenção",
    icone: AlertTriangle,
    classeIcone: "text-amber-400",
    classeBorda: "border-amber-500/40",
  },
  {
    categoria: "verde",
    titulo: "O que está indo bem",
    icone: TrendingUp,
    classeIcone: "text-emerald-400",
    classeBorda: "border-emerald-500/40",
  },
];

export function RadarEmpresa({ userId }: { userId: string }) {
  const { carregando, alertas, erro, tentarNovamente } = useRadar(userId);

  if (carregando) {
    return (
      <Card className="border-primary/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Radar className="h-4 w-4 text-primary" />
            Radar da Empresa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (erro) {
    return (
      <Card className="border-primary/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Radar className="h-4 w-4 text-primary" />
            Radar da Empresa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-start gap-3">
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              Não foi possível carregar o Radar da Empresa agora. Tente novamente.
            </p>
            <Button variant="outline" size="sm" onClick={tentarNovamente}>
              Tentar novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (alertas.length === 0) {
    return (
      <Card className="border-primary/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Radar className="h-4 w-4 text-primary" />
            Radar da Empresa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nenhum alerta por enquanto. Continue preenchendo suas semanas — o Radar avisa
            quando houver algo para corrigir ou comemorar.
          </p>
        </CardContent>
      </Card>
    );
  }

  const recomendada = missaoRecomendada(alertas);

  return (
    <Card className="border-primary/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Radar className="h-4 w-4 text-primary" />
          Radar da Empresa
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {recomendada && (
          <div className="rounded-xl border border-primary/50 bg-gradient-to-r from-primary/20 to-transparent p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Target className="h-4 w-4" />
              Missão recomendada de hoje
            </p>
            <p className="mt-1.5 text-sm leading-relaxed">{recomendada.missaoSugerida}</p>
          </div>
        )}

        {SECOES.map((secao) => {
          const itens = alertas.filter((a) => a.categoria === secao.categoria);
          if (itens.length === 0) return null;
          return (
            <div key={secao.categoria} className="flex flex-col gap-2">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <secao.icone className={cn("h-4 w-4", secao.classeIcone)} />
                {secao.titulo}
              </p>
              {itens.map((alerta) => (
                <AlertaItem key={alerta.regraId} alerta={alerta} classeBorda={secao.classeBorda} />
              ))}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function AlertaItem({ alerta, classeBorda }: { alerta: AlertaRadar; classeBorda: string }) {
  return (
    <div className={cn("rounded-lg border p-4", classeBorda)}>
      <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
        {alerta.mensagem}
      </p>
      {alerta.missaoSugerida && (
        <p className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
          <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          {alerta.missaoSugerida}
        </p>
      )}
    </div>
  );
}
