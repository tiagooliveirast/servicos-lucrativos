import { useEffect, useState } from "react";

import { carregarRadarEAtualizar } from "@/lib/radar-nucleo";
import type { AlertaRadar } from "@/lib/regras-radar";

interface EstadoRadar {
  carregando: boolean;
  alertas: AlertaRadar[];
  erro: boolean;
}

export function useRadar(userId: string): EstadoRadar & { tentarNovamente: () => void } {
  const [estado, setEstado] = useState<EstadoRadar>({
    carregando: true,
    alertas: [],
    erro: false,
  });
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    setEstado((e) => ({ ...e, carregando: true, erro: false }));

    async function rodar() {
      const { alertas, erro } = await carregarRadarEAtualizar(userId);
      if (!ativo) return;
      setEstado({ carregando: false, alertas, erro });
    }

    void rodar();

    return () => {
      ativo = false;
    };
  }, [userId, tentativa]);

  return { ...estado, tentarNovamente: () => setTentativa((t) => t + 1) };
}