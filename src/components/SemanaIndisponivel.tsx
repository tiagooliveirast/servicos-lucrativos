import { Lock } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

interface SemanaIndisponivelProps {
  titulo?: string;
  descricao: string;
  linkPara?: { para: string; rotulo: string };
}

export function SemanaIndisponivel({
  titulo,
  descricao,
  linkPara,
}: SemanaIndisponivelProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-primary/20 bg-card px-4 py-12 text-center">
      <div className="rounded-full bg-primary/10 p-3">
        <Lock className="h-6 w-6 text-primary" />
      </div>
      <h2 className="text-base font-semibold">
        {titulo ?? "Conteúdo ainda não disponível"}
      </h2>
      <p className="max-w-md text-sm text-muted-foreground">{descricao}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Button asChild variant="outline">
          <Link to="/dashboard">Ver meu painel de semanas</Link>
        </Button>
        {linkPara && (
          <Button asChild>
            <Link to={linkPara.para}>{linkPara.rotulo}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
