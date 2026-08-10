import {
  CalendarCheck,
  FileText,
  Gift,
  LayoutGrid,
  LineChart,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  PlayCircle,
  Radar,
  ShieldCheck,
  Store,
  Trophy,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useEhAdmin } from "@/hooks/useEhAdmin";
import { CONTATO_SUPORTE } from "@/lib/contato";
import { supabase } from "@/lib/supabase";

interface LinkNavegacao {
  para: string;
  rotulo: string;
  icone: typeof Radar;
  fim?: boolean;
}

const LINKS_NAVEGACAO: LinkNavegacao[] = [
  { para: "/", rotulo: "Sala de Guerra", icone: Radar, fim: true },
  { para: "/dashboard", rotulo: "Painel de semanas", icone: LayoutGrid },
  { para: "/check-in", rotulo: "Check-in", icone: CalendarCheck },
  { para: "/minha-empresa", rotulo: "Minha Empresa", icone: Store },
  { para: "/evolucao", rotulo: "Evolução", icone: LineChart },
  { para: "/relatorios", rotulo: "Relatórios", icone: FileText },
  { para: "/conquistas", rotulo: "Conquistas", icone: Trophy },
  { para: "/bauis", rotulo: "Baús", icone: Gift },
];

export function Layout({
  children,
  nomeUsuario,
}: {
  children: ReactNode;
  nomeUsuario?: string | null;
}) {
  const { ehAdmin } = useEhAdmin();
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <a href="/" className="shrink-0">
            <Logo />
          </a>
          <div className="flex items-center gap-3">
            {ehAdmin && (
              <Link
                to="/admin"
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <ShieldCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            )}
            {nomeUsuario && (
              <span className="hidden text-sm text-muted-foreground sm:block">
                {nomeUsuario}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => setMenuAberto((a) => !a)}
              aria-label={menuAberto ? "Fechar menu de navegação" : "Abrir menu de navegação"}
            >
              {menuAberto ? <X /> : <Menu />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void supabase.auth.signOut()}
              className="text-muted-foreground"
            >
              <LogOut />
              Sair
            </Button>
          </div>
        </div>

        <nav className="mx-auto hidden w-full max-w-5xl items-center gap-1 overflow-x-auto px-4 pb-2 md:flex">
          {LINKS_NAVEGACAO.map((link) => {
            const Icone = link.icone;
            return (
              <NavLink
                key={link.para}
                to={link.para}
                end={link.fim ?? false}
                className={({ isActive }) =>
                  `flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors ${
                    isActive
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`
                }
              >
                <Icone className="h-3.5 w-3.5" />
                {link.rotulo}
              </NavLink>
            );
          })}
        </nav>

        {menuAberto && (
          <nav className="border-t bg-background md:hidden">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-1 px-4 py-3">
              {LINKS_NAVEGACAO.map((link) => {
                const Icone = link.icone;
                return (
                  <NavLink
                    key={link.para}
                    to={link.para}
                    end={link.fim ?? false}
                    onClick={() => setMenuAberto(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2 rounded-md px-3 py-2.5 text-sm transition-colors ${
                        isActive
                          ? "bg-primary/10 font-medium text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`
                    }
                  >
                    <Icone className="h-4 w-4" />
                    {link.rotulo}
                  </NavLink>
                );
              })}
            </div>
          </nav>
        )}
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
      <footer className="border-t py-4">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-2 px-4">
          <p className="text-center text-xs text-muted-foreground">
            Serviços Lucrativos — O Plano de 90 Dias
          </p>
          {(CONTATO_SUPORTE.whatsapp || CONTATO_SUPORTE.email) && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {CONTATO_SUPORTE.whatsapp && (
                <a
                  href={`https://wa.me/${CONTATO_SUPORTE.whatsapp}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 hover:text-foreground"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Suporte no WhatsApp
                </a>
              )}
              <Link
                to="/boas-vindas"
                className="flex items-center gap-1.5 hover:text-foreground"
              >
                <PlayCircle className="h-3.5 w-3.5" />
                Como funciona a plataforma
              </Link>
              {CONTATO_SUPORTE.email && (
                <a
                  href={`mailto:${CONTATO_SUPORTE.email}`}
                  className="flex items-center gap-1.5 hover:text-foreground"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {CONTATO_SUPORTE.email}
                </a>
              )}
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
