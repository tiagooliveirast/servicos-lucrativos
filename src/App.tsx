import { lazy, Suspense, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { Logo } from "@/components/Logo";
import { useAuth } from "@/hooks/useAuth";

const PaginaAcessoPendente = lazy(() =>
  import("@/pages/PaginaAcessoPendente").then((m) => ({ default: m.PaginaAcessoPendente }))
);
const PaginaAuthCallback = lazy(() =>
  import("@/pages/PaginaAuthCallback").then((m) => ({ default: m.PaginaAuthCallback }))
);
const PaginaDashboard = lazy(() =>
  import("@/pages/PaginaDashboard").then((m) => ({ default: m.PaginaDashboard }))
);
const PaginaEntrar = lazy(() =>
  import("@/pages/PaginaEntrar").then((m) => ({ default: m.PaginaEntrar }))
);
const PaginaManual = lazy(() =>
  import("@/pages/PaginaManual").then((m) => ({ default: m.PaginaManual }))
);
const PaginaOnboarding = lazy(() =>
  import("@/pages/PaginaOnboarding").then((m) => ({ default: m.PaginaOnboarding }))
);
const PaginaPainel = lazy(() =>
  import("@/pages/PaginaPainel").then((m) => ({ default: m.PaginaPainel }))
);
const PaginaSemana = lazy(() =>
  import("@/pages/PaginaSemana").then((m) => ({ default: m.PaginaSemana }))
);

function TelaCarregando() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

export default function App() {
  const [recarregar, setRecarregar] = useState(0);
  const { fase, user, perfil } = useAuth(recarregar);

  if (fase === "carregando") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background">
        <Logo className="scale-110" />
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Suspense fallback={<TelaCarregando />}>
      <Routes>
        <Route path="/auth/callback" element={<PaginaAuthCallback />} />

        <Route
          path="/"
          element={
            fase === "deslogado" ? (
              <PaginaEntrar />
            ) : fase === "sem_acesso" ? (
              <PaginaAcessoPendente />
            ) : fase === "onboarding" ? (
              <PaginaOnboarding aoConcluir={() => setRecarregar((r) => r + 1)} />
            ) : (
              <PaginaDashboard perfil={perfil!} />
            )
          }
        />

        <Route
          path="/semana/:numero"
          element={
            fase === "logado" ? (
              <PaginaSemana userId={user!.id} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/painel/:numero"
          element={
            fase === "logado" ? (
              <PaginaPainel userId={user!.id} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/manual"
          element={
            fase === "logado" ? (
              <PaginaManual userId={user!.id} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
