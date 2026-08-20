import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
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
const PaginaIME = lazy(() =>
  import("@/pages/PaginaIME").then((m) => ({ default: m.PaginaIME }))
);
const PaginaEvolucao = lazy(() =>
  import("@/pages/PaginaEvolucao").then((m) => ({ default: m.PaginaEvolucao }))
);
const PaginaRelatorios = lazy(() =>
  import("@/pages/PaginaRelatorios").then((m) => ({ default: m.PaginaRelatorios }))
);
const PaginaSalaDeGuerra = lazy(() =>
  import("@/pages/PaginaSalaDeGuerra").then((m) => ({ default: m.PaginaSalaDeGuerra }))
);
const PaginaBoasVindas = lazy(() =>
  import("@/pages/PaginaBoasVindas").then((m) => ({ default: m.PaginaBoasVindas }))
);
const PaginaConquistas = lazy(() =>
  import("@/pages/PaginaConquistas").then((m) => ({ default: m.PaginaConquistas }))
);
const PaginaBauis = lazy(() =>
  import("@/pages/PaginaBauis").then((m) => ({ default: m.PaginaBauis }))
);
const PaginaEmpresa = lazy(() =>
  import("@/pages/PaginaEmpresa").then((m) => ({ default: m.PaginaEmpresa }))
);
const PaginaCheckin = lazy(() =>
  import("@/pages/PaginaCheckin").then((m) => ({ default: m.PaginaCheckin }))
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
const PaginaAdminAulas = lazy(() =>
  import("@/pages/admin/PaginaAdminAulas").then((m) => ({ default: m.PaginaAdminAulas }))
);
const PaginaEmpresaPublica = lazy(() =>
  import("@/pages/PaginaEmpresaPublica").then((m) => ({ default: m.PaginaEmpresaPublica }))
);
const PaginaDuvidas = lazy(() =>
  import("@/pages/PaginaDuvidas").then((m) => ({ default: m.PaginaDuvidas }))
);
const PaginaAdminDuvidas = lazy(() =>
  import("@/pages/admin/PaginaAdminDuvidas").then((m) => ({ default: m.PaginaAdminDuvidas }))
);
const PaginaAdminAnexos = lazy(() =>
  import("@/pages/admin/PaginaAdminAnexos").then((m) => ({ default: m.PaginaAdminAnexos }))
);
const PaginaAdminTurma = lazy(() =>
  import("@/pages/admin/PaginaAdminTurma").then((m) => ({ default: m.PaginaAdminTurma }))
);
const PaginaPreferencias = lazy(() =>
  import("@/pages/PaginaPreferencias").then((m) => ({ default: m.PaginaPreferencias }))
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
  const { fase, user, perfil, ausenteDias, reavaliar } = useAuth();
  const location = useLocation();

  // Toda troca de rota volta ao topo da página (evita herdar o scroll de
  // páginas longas ao navegar entre telas).
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Página pública da empresa: funciona sem sessão (e enquanto a sessão é
  // avaliada), então foge dos gates de carregando/erro abaixo.
  const ehRotaPublica =
    location.pathname.startsWith("/empresa/") || location.pathname.startsWith("/preferencias");

  if (fase === "carregando" && !ehRotaPublica) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background">
        <Logo className="scale-110" />
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (fase === "erro" && !ehRotaPublica) {
    return <TelaErroSessao aoTentar={reavaliar} />;
  }

  return (
    <Suspense fallback={<TelaCarregando />}>
      <Routes>
        <Route path="/empresa/:slug" element={<PaginaEmpresaPublica />} />
        <Route path="/preferencias" element={<PaginaPreferencias />} />
        <Route path="/auth/callback" element={<PaginaAuthCallback />} />

        <Route path="/nova-senha" element={<PaginaNovaSenha />} />

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
              <PaginaOnboarding aoConcluir={reavaliar} />
            ) : perfil && !perfil.boas_vindas_vista ? (
              // Primeira vez: tela de boas-vindas (vídeos institucionais)
              // antes da primeira visita à Sala de Guerra. Só 1x.
              <Navigate to="/boas-vindas" replace />
            ) : perfil ? (
              <PaginaSalaDeGuerra perfilId={perfil.id} ausenteDias={ausenteDias} />
            ) : (
              // Ainda avaliando a sessão (carregando/erro) — em rotas
              // públicas esse elemento é construído antecipadamente e não
              // pode dereferenciar perfil nulo.
              <TelaCarregando />
            )
          }
        />

        <Route
          path="/boas-vindas"
          element={
            fase === "logado" ? (
              <PaginaBoasVindas userId={user!.id} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/dashboard"
          element={
            fase === "logado" ? (
              <PaginaDashboard perfil={perfil!} />
            ) : (
              <Navigate to="/" replace />
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
          path="/ime"
          element={
            fase === "logado" ? (
              <PaginaIME userId={user!.id} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/check-in"
          element={
            fase === "logado" ? (
              <PaginaCheckin userId={user!.id} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/evolucao"
          element={
            fase === "logado" ? (
              <PaginaEvolucao userId={user!.id} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/relatorios"
          element={
            fase === "logado" ? (
              <PaginaRelatorios userId={user!.id} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/conquistas"
          element={
            fase === "logado" ? (
              <PaginaConquistas userId={user!.id} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/bauis"
          element={
            fase === "logado" ? (
              <PaginaBauis userId={user!.id} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/minha-empresa"
          element={
            fase === "logado" ? (
              <PaginaEmpresa userId={user!.id} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/duvidas"
          element={
            fase === "logado" ? (
              <PaginaDuvidas userId={user!.id} />
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
          <Route path="aulas" element={<PaginaAdminAulas />} />
          <Route path="turma" element={<PaginaAdminTurma />} />
          <Route path="duvidas" element={<PaginaAdminDuvidas />} />
          <Route path="anexos" element={<PaginaAdminAnexos />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
