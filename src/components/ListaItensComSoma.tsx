import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ItemLista } from "@/lib/conteudo";

interface LinhaLocal {
  descricao: string;
  valor: string;
}

function linhaVazia(): LinhaLocal {
  return { descricao: "", valor: "" };
}

function normalizar(valor: unknown): LinhaLocal[] {
  if (!Array.isArray(valor)) return [linhaVazia()];
  const linhas = (valor as ItemLista[]).map((item) => ({
    descricao: item?.descricao ?? "",
    valor: typeof item?.valor === "number" && item.valor !== 0 ? String(item.valor) : "",
  }));
  return linhas.length > 0 ? linhas : [linhaVazia()];
}

function paraItens(linhas: LinhaLocal[]): ItemLista[] {
  return linhas.map((linha) => ({
    descricao: linha.descricao,
    valor: linha.valor === "" ? 0 : Number(linha.valor),
  }));
}

export function ListaItensComSoma({
  valor,
  aoMudar,
  rotuloItem,
  rotuloValor,
}: {
  valor: unknown;
  aoMudar: (itens: ItemLista[]) => void;
  rotuloItem?: string;
  rotuloValor?: string;
}) {
  const [linhas, setLinhas] = useState<LinhaLocal[]>(() => normalizar(valor));
  const chaveExterna = JSON.stringify(valor);

  useEffect(() => {
    setLinhas((atual) => {
      const externo = normalizar(valor);
      if (JSON.stringify(externo) === JSON.stringify(atual)) return atual;
      return externo;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveExterna]);

  function atualizar(novas: LinhaLocal[]) {
    setLinhas(novas);
    aoMudar(paraItens(novas));
  }

  const total = linhas.reduce(
    (soma, linha) => soma + (linha.valor === "" ? 0 : Number(linha.valor) || 0),
    0
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2">
        {linhas.map((linha, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-lg border border-input p-3 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-1">
              <Label className="text-xs text-muted-foreground">{rotuloItem ?? "Descrição"}</Label>
              <Input
                type="text"
                value={linha.descricao}
                placeholder={rotuloItem ?? "O que é"}
                onChange={(e) => {
                  const novas = [...linhas];
                  novas[i] = { ...novas[i], descricao: e.target.value };
                  atualizar(novas);
                }}
              />
            </div>
            <div className="flex items-end gap-2 sm:w-44">
              <div className="flex flex-1 flex-col gap-1">
                <Label className="text-xs text-muted-foreground">{rotuloValor ?? "Valor (R$)"}</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={linha.valor}
                  placeholder="0,00"
                  onChange={(e) => {
                    const novas = [...linhas];
                    novas[i] = { ...novas[i], valor: e.target.value };
                    atualizar(novas);
                  }}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Remover item"
                disabled={linhas.length <= 1}
                onClick={() => atualizar(linhas.filter((_, j) => j !== i))}
                className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive"
              >
                <Minus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        onClick={() => atualizar([...linhas, linhaVazia()])}
      >
        <Plus className="h-4 w-4" />
        Adicionar item
      </Button>
      <div className="flex items-center justify-between rounded-lg border border-primary/25 bg-primary/5 px-4 py-2.5">
        <span className="text-sm font-medium text-muted-foreground">Total</span>
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </span>
      </div>
    </div>
  );
}
