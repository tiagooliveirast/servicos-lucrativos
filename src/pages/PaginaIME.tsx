import { ArrowLeft, Gauge, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { CartaoCarregando } from "@/components/CartaoCarregando";
import { CartaoErro } from "@/components/CartaoErro";
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
import { Progress } from "@/components/ui/progress";
import { PILARES_IME } from "@/lib/ime";
import { supabase } from "@/lib/supabase";
import type { ImeHistorico } from "@/lib/types";
import { formatData } from "@/lib/utils";

export function PaginaIME({ userId }: { userId: string }) {
  const [ime, setIme] = useState<ImeHistorico | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [recalculando, setRecalculando] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro(false);
    async function carregar() {
      const { data, error } = await supabase
        .from("ime_historico")
        .select("*")
        .eq("user_id", userId)
        .order("data_calculo", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!ativo) return;
      if (error) {
        setErro(true);
        setCarregando(false);
        return;
      }
      setIme((data as ImeHistorico | null) ?? null);
      setCarregando(false);
    }
    void carregar();
    return () => {
      ativo = false;
    };
  }, [userId, tentativa]);

  async function recalcular() {
    setRecalculando(true);
    const { error } = await supabase.rpc("recalcular_ime_atual");
    setRecalculando(false);
    if (error) {
      setErro(true);
      return;
    }
    setTentativa((t) => t + 1);
  }

  if (carregando) {
    return (
      <Layout>
        <CartaoCarregando />
      </Layout>
    );
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
          <div className="mt-3 flex items-center gap-2">
            <Badge variant="outline" className="text-primary">
              Índice de Maturidade Empresarial
            </Badge>
          </div>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
            <Gauge className="h-7 w-7 text-primary" />
            Seu IME
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            O IME resume, de 0 a 100, a maturidade da sua empresa a partir de 8 pilares.
          </p>
        </div>

        {erro && (
          <CartaoErro
            mensagem="Não foi possível carregar seu IME agora. Verifique sua conexão e tente novamente."
            onTentar={() => setTentativa((t) => t + 1)}
          />
        )}

        {!erro && !ime && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">IME ainda não calculado</CardTitle>
              <CardDescription>
                Seu IME é atualizado automaticamente quando você conclui uma semana,
                preenche um painel mensal ou faz um check-in semanal.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => void recalcular()} disabled={recalculando}>
                {recalculando && <Loader2 className="h-4 w-4 animate-spin" />}
                Calcular agora
              </Button>
            </CardContent>
          </Card>
        )}

        {!erro && ime && (
          <>
            <Card>
              <CardContent className="flex flex-col items-center gap-4 pt-6">
                <p className="text-5xl font-black tabular-nums tracking-tight text-primary">
                  {ime.score_total}
                  <span className="text-lg font-semibold text-muted-foreground">/100</span>
                </p>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Atualizado em {formatData(ime.data_calculo)}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void recalcular()}
                  disabled={recalculando}
                >
                  {recalculando && <Loader2 className="h-4 w-4 animate-spin" />}
                  Recalcular agora
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Os 8 pilares</CardTitle>
                <CardDescription>Cada pilar vale de 0 a 100.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {PILARES_IME.map((pilar) => {
                  const valor = ime[pilar.chave];
                  return (
                    <div key={pilar.chave} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium text-foreground/90">{pilar.rotulo}</span>
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <span className="tabular-nums">{valor}</span>
                          <span className="w-8 text-right text-xs">{pilar.peso}</span>
                        </span>
                      </div>
                      <Progress value={valor} />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}