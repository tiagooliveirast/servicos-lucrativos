import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

interface CabecalhoPaginaProps {
  voltarPara: string;
  textoVoltar: string;
  badges?: ReactNode;
  titulo: ReactNode;
  descricao?: ReactNode;
}

export function CabecalhoPagina({
  voltarPara,
  textoVoltar,
  badges,
  titulo,
  descricao,
}: CabecalhoPaginaProps) {
  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
        <Link to={voltarPara}>
          <ArrowLeft />
          {textoVoltar}
        </Link>
      </Button>
      {badges && <div className="mt-3 flex flex-wrap items-center gap-2">{badges}</div>}
      <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
        {titulo}
      </h1>
      {descricao}
    </div>
  );
}
