import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TIPO_ITEM_ROTULOS } from "@/lib/conteudo";
import type { ItemLista, TipoItem } from "@/lib/conteudo";

interface LinhaLocal {
  descricao: string;
  valor: string;
  tipo: TipoItem;
}

function linhaVazia(tipoPadrao: TipoItem): LinhaLocal {
  return { descricao: "", valor: "", tipo: tipoPadrao };
}

function normalizar(valor: unknown, tipoPadrao: TipoItem): LinhaLocal[] {
  if (!Array.isArray(valor)) return [linhaVazia(tipoPadrao)];
  const linhas = (valor as ItemLista[]).map((item) => ({
    descricao: item?.descricao ?? "",
    valor: typeof item?.valor === "number" && item.valor !== 0 ? String(item.valor) : "",
    tipo: item?.tipo ?? tipoPadrao,
  }));
  return linhas.length > 0 ? linhas : [linhaVazia(tipoPadrao)];
}

function paraItens(linhas: LinhaLocal[]): ItemLista[] {
  return linhas.map((linha) => ({
    descricao: linha.descricao,
    valor: linha.valor === "" ? 0 : Number(linha.valor),
    tipo: linha.tipo,
  }));
}

export function ListaItensComSoma({
  valor,
  aoMudar,
  rotuloItem,
  rotuloValor,
  tiposItem,
  rotuloTipo,
}: {
  valor: unknown;
  aoMudar: (itens: ItemLista[]) => void;
  rotuloItem?: string;
  rotuloValor?: string;
  tiposItem?: TipoItem[];
  rotuloTipo?: string;
}) {
  const tipoPadrao = tiposItem && tiposItem.length > 0 ? tiposItem[0] : "pessoal";
  const [linhas, setLinhas] = useState<LinhaLocal[]>(() => normalizar(valor, tipoPadrao));
  const chaveExterna = JSON.stringify(valor);

  useEffect(() => {
    setLinhas((atual) => {
      const externo = normalizar(valor, tipoPadrao);
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
            {tiposItem && (
              <div className="flex w-full flex-col gap-1 sm:w-36">
                <Label className="text-xs text-muted-foreground">{rotuloTipo ?? "Tipo"}</Label>
                <Select
                  value={linha.tipo}
                  onValueChange={(tipo) => {
                    const novas = [...linhas];
                    novas[i] = { ...novas[i], tipo: tipo as TipoItem };
                    atualizar(novas);
                  }}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposItem.map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>
                        {TIPO_ITEM_ROTULOS[tipo]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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
        onClick={() => atualizar([...linhas, linhaVazia(tipoPadrao)])}
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