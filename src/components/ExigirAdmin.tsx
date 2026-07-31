import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { useEhAdmin } from "@/hooks/useEhAdmin";
import { useAuth } from "@/hooks/useAuth";

export function ExigirAdmin({ children }: { children: ReactNode }) {
  const { fase } = useAuth();
  const { ehAdmin, carregando } = useEhAdmin();

  if (carregando || fase === "carregando") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (fase !== "logado" || !ehAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
}
