import { useContext } from "react";

import { AuthContexto, type ContextoAuth } from "@/hooks/AuthContext";

export type { FaseAuth, EstadoAuth } from "@/hooks/AuthContext";

export function useAuth(): ContextoAuth {
  const contexto = useContext(AuthContexto);
  if (!contexto) {
    throw new Error("useAuth deve ser usado dentro de <AuthProvider>.");
  }
  return contexto;
}
