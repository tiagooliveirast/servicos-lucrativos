import { LayoutDashboard, ShieldCheck, UserPlus, Users, Video } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import { Layout } from "@/components/Layout";
import { cn } from "@/lib/utils";

const ITENS_NAV = [
  { para: "/admin", rotulo: "Visão geral", icone: LayoutDashboard, fim: true },
  { para: "/admin/usuarios", rotulo: "Usuários", icone: Users, fim: false },
  { para: "/admin/novo-acesso", rotulo: "Novo acesso", icone: UserPlus, fim: false },
  { para: "/admin/aulas", rotulo: "Vídeo-aulas", icone: Video, fim: false },
];

export function PaginaAdminLayout() {
  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
            <ShieldCheck className="h-7 w-7 text-primary" />
            Painel administrativo
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe o progresso dos alunos e libere novos acessos.
          </p>
        </div>
        <nav className="flex flex-wrap gap-1 border-b border-border pb-3">
          {ITENS_NAV.map((item) => (
            <NavLink
              key={item.para}
              to={item.para}
              end={item.fim}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )
              }
            >
              <item.icone className="h-4 w-4" />
              {item.rotulo}
            </NavLink>
          ))}
        </nav>
        <Outlet />
      </div>
    </Layout>
  );
}
