import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

interface CartaoCarregandoProps {
  texto?: string;
  className?: string;
}

export function CartaoCarregando({ texto, className }: CartaoCarregandoProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground",
        className
      )}
    >
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      {texto ? <p className="text-sm">{texto}</p> : null}
    </div>
  );
}
