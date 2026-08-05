import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CartaoErroProps {
  mensagem?: string;
  onTentar?: () => void;
  className?: string;
}

export function CartaoErro({ mensagem, onTentar, className }: CartaoErroProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-10 text-center",
        className
      )}
    >
      <AlertCircle className="h-6 w-6 text-destructive" />
      <p className="text-sm text-foreground/90">
        {mensagem ??
          "Não foi possível carregar os dados. Verifique sua conexão e tente novamente."}
      </p>
      {onTentar ? (
        <Button variant="outline" onClick={onTentar}>
          Tentar novamente
        </Button>
      ) : null}
    </div>
  );
}
