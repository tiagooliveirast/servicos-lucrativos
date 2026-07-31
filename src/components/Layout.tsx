import { LogOut } from "lucide-react";
import type { ReactNode } from "react";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

export function Layout({
  children,
  nomeUsuario,
}: {
  children: ReactNode;
  nomeUsuario?: string | null;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <a href="/" className="shrink-0">
            <Logo />
          </a>
          <div className="flex items-center gap-3">
            {nomeUsuario && (
              <span className="hidden text-sm text-muted-foreground sm:block">
                {nomeUsuario}
              </span>
            )}
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
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
      <footer className="border-t py-4">
        <p className="text-center text-xs text-muted-foreground">
          Gestão Lucrativa — O Plano de 90 Dias
        </p>
      </footer>
    </div>
  );
}
