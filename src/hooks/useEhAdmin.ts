import { useContext } from "react";

import { AuthContexto } from "@/hooks/AuthContext";

export function useEhAdmin(): { ehAdmin: boolean; carregando: boolean } {
  const contexto = useContext(AuthContexto);
  if (!contexto) {
    throw new Error("useEhAdmin deve ser usado dentro de <AuthProvider>.");
  }
  return { ehAdmin: contexto.ehAdmin, carregando: contexto.ehAdminCarregando };
}
