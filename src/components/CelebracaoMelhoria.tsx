import { useEffect, useRef, useState } from "react";
import { TrendingUp, X } from "lucide-react";

import { cn } from "@/lib/utils";

export interface MensagemCelebracao {
  id: string;
  titulo?: string;
  texto: string;
}

const DURACAO_PADRAO_MS = 6000;
const DURACAO_SAIDA_MS = 200;

export function CelebracaoMelhoria({
  mensagem,
  aoFechar,
  duracaoMs = DURACAO_PADRAO_MS,
}: {
  mensagem: MensagemCelebracao | null;
  aoFechar: () => void;
  duracaoMs?: number;
}) {
  const [atual, setAtual] = useState<MensagemCelebracao | null>(null);
  const [saindo, setSaindo] = useState(false);
  const timerAuto = useRef<number | null>(null);
  const timerSaida = useRef<number | null>(null);

  useEffect(() => {
    if (!mensagem) return;
    setAtual((a) => (a && a.id === mensagem.id ? a : mensagem));
    setSaindo(false);
  }, [mensagem]);

  useEffect(() => {
    if (!atual || saindo) return;
    timerAuto.current = window.setTimeout(() => setSaindo(true), duracaoMs);
    return () => {
      if (timerAuto.current !== null) window.clearTimeout(timerAuto.current);
    };
  }, [atual, saindo, duracaoMs]);

  useEffect(() => {
    if (!saindo || !atual) return;
    timerSaida.current = window.setTimeout(() => {
      setAtual(null);
      setSaindo(false);
      aoFechar();
    }, DURACAO_SAIDA_MS);
    return () => {
      if (timerSaida.current !== null) window.clearTimeout(timerSaida.current);
    };
  }, [saindo, atual, aoFechar]);

  if (!atual) return null;

  return (
    <div
      role="status"
      className={cn(
        "fixed bottom-6 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2",
        "rounded-xl border border-primary/60 bg-black/95 p-4 shadow-2xl shadow-black/50 backdrop-blur",
        "animate-in fade-in slide-in-from-bottom-4 duration-300",
        saindo && "animate-out fade-out slide-out-to-bottom-4 duration-200"
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <TrendingUp className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          {atual.titulo && (
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              {atual.titulo}
            </p>
          )}
          <p className="text-sm text-foreground/90">{atual.texto}</p>
        </div>
        <button
          type="button"
          aria-label="Fechar"
          onClick={() => setSaindo(true)}
          className="-mr-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
