import { lazy, Suspense, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AlertTriangle, Loader2 } from "lucide-react";

import { ExigirAdmin } from "@/components/ExigirAdmin";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const PaginaAcessoPendente = lazy(() =>
  import("@/pages/PaginaAcessoPendente").then((m) => ({ default: m.PaginaAcessoPendente }))
);
const PaginaAcessoInativo = lazy(() =>
  import("@/pages/PaginaAcessoInativo").then((m) => ({ default: m.PaginaAcessoInativo }))
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
const PaginaNovaSenha = lazy(() =>
  import("@/pages/PaginaNovaSenha").then((m) => ({ default: m.PaginaNovaSenha }))
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
const PaginaAdminLayout = lazy(() =>
  import("@/pages/admin/PaginaAdminLayout").then((m) => ({ default: m.PaginaAdminLayout }))
);
const PaginaAdminIndex = lazy(() =>
  import("@/pages/admin/PaginaAdminIndex").then((m) => ({ default: m.PaginaAdminIndex }))
);
const PaginaAdminNovoAcesso = lazy(() =>
  import("@/pages/admin/PaginaAdminNovoAcesso").then((m) => ({ default: m.PaginaAdminNovoAcesso }))
);
const PaginaAdminUsuarios = lazy(() =>
  import("@/pages/admin/PaginaAdminUsuarios").then((m) => ({ default: m.PaginaAdminUsuarios }))
);
const PaginaAdminUsuarioDetalhe = lazy(() =>
  import("@/pages/admin/PaginaAdminUsuarioDetalhe").then((m) => ({
    default: m.PaginaAdminUsuarioDetalhe,
  }))
);

function TelaCarregando() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

function TelaErroSessao({ aoTentar }: { aoTentar: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4">
      <div className="flex w-full max-w-md flex-col items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-6 py-10 text-center">
        <AlertTriangle className="h-6 w-6 text-destructive" />
        <p className="text-sm text-foreground/90">
          Não foi possível carregar seus dados agora. Verifique sua conexão e tente novamente.
        </p>
        <Button variant="outline" onClick={aoTentar}>
          Tentar novamente
        </Button>
      </div>
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

  if (fase === "erro") {
    return <TelaErroSessao aoTentar={() => setRecarregar((r) => r + 1)} />;
  }

  return (
    <Suspense fallback={<TelaCarregando />}>
      <Routes>
        <Route path="/auth/callback" element={<PaginaAuthCallback />} />

        <Route
          path="/nova-senha"
          element={
            fase === "logado" ? <PaginaNovaSenha /> : <Navigate to="/" replace />
          }
        />

        <Route
          path="/"
          element={
            fase === "deslogado" ? (
              <PaginaEntrar />
            ) : fase === "sem_acesso" ? (
              <PaginaAcessoPendente />
            ) : fase === "acesso_inativo" ? (
              <PaginaAcessoInativo />
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

        <Route
          path="/admin"
          element={
            fase === "logado" ? (
              <ExigirAdmin>
                <PaginaAdminLayout />
              </ExigirAdmin>
            ) : (
              <Navigate to="/" replace />
            )
          }
        >
          <Route index element={<PaginaAdminIndex />} />
          <Route path="usuarios" element={<PaginaAdminUsuarios />} />
          <Route path="usuarios/:id" element={<PaginaAdminUsuarioDetalhe />} />
          <Route path="novo-acesso" element={<PaginaAdminNovoAcesso />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
