import { AlertCircle, CheckCircle2, Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";

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
import { supabase } from "@/lib/supabase";
import type { NivelConfiancaFaturamento } from "@/lib/types";
import { formatBRL } from "@/lib/utils";

export function dataReferenciaMesCorrente(): string {
  const hoje = new Date();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  return `${hoje.getFullYear()}-${mes}-01`;
}

function nomeMesCorrente(): string {
  return new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date());
}

export function CardFaturamentoAutodeclarado({
  userId,
  aoSalvar,
}: {
  userId: string;
  aoSalvar: () => void;
}) {
  const [carregando, setCarregando] = useState(true);
  const [valorAtual, setValorAtual] = useState<number | null>(null);
  const [valor, setValor] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erroMsg, setErroMsg] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      const { data, error } = await supabase
        .from("faturamento_validado")
        .select("valor, nivel_confianca")
        .eq("user_id", userId)
        .eq("data_referencia", dataReferenciaMesCorrente())
        .order("sincronizado_em", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!ativo) return;
      if (!error && data) {
        const nivel = (data as { nivel_confianca: NivelConfiancaFaturamento })
          .nivel_confianca;
        if (nivel === "autodeclarado") {
          const atual = Number((data as { valor: number }).valor);
          setValorAtual(atual);
          setValor(String(atual));
        }
      }
      setCarregando(false);
    }
    void carregar();
    return () => {
      ativo = false;
    };
  }, [userId]);

  async function submeter() {
    const n = Number(valor);
    if (!Number.isFinite(n) || n <= 0) {
      setErroMsg("Informe um valor maior que zero.");
      return;
    }
    setEnviando(true);
    setErroMsg(null);
    setSalvo(false);
    const { error } = await supabase.from("faturamento_validado").insert({
      user_id: userId,
      valor: n,
      data_referencia: dataReferenciaMesCorrente(),
      fonte: "autodeclarado",
      nivel_confianca: "autodeclarado",
    });
    setEnviando(false);
    if (error) {
      setErroMsg(
        "Não foi possível salvar seu faturamento. Verifique sua conexão e tente novamente."
      );
      return;
    }
    setValorAtual(n);
    setSalvo(true);
    aoSalvar();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Faturamento deste mês</CardTitle>
          <Badge variant="outline" className="text-muted-foreground">
            Autodeclarado
          </Badge>
        </div>
        <CardDescription>
          {carregando
            ? "Carregando…"
            : valorAtual !== null
              ? `Você informou ${formatBRL(valorAtual)} em ${nomeMesCorrente()}. Pode atualizar abaixo.`
              : `Nenhum valor informado em ${nomeMesCorrente()} ainda.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor="faturamento_mes">
              Qual foi seu faturamento este mês? (R$)
            </Label>
            <Input
              id="faturamento_mes"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={valor}
              placeholder="0"
              disabled={enviando}
              onChange={(e) => {
                setValor(e.target.value);
                setSalvo(false);
                setErroMsg(null);
              }}
            />
          </div>
          <Button
            onClick={() => void submeter()}
            disabled={enviando || valor.trim() === ""}
            className="h-11"
          >
            {enviando ? <Loader2 className="animate-spin" /> : <Save />}
            Salvar faturamento
          </Button>
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">
          Este valor é informado por você. Em breve, será possível validar
          automaticamente pela integração com o RefriClube, o que dará mais
          peso ao desbloqueio da sua chave.
        </p>

        {salvo && (
          <p className="flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Faturamento salvo — as chaves foram reavaliadas.
          </p>
        )}

        {erroMsg && (
          <p className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {erroMsg}
          </p>
        )}
      </CardContent>
    </Card>
  );
}