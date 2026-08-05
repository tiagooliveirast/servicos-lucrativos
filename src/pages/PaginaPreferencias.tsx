import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, BellOff, Loader2 } from "lucide-react";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

/**
 * Página pública de preferências de lembretes (descadastro).
 *
 * O link do e-mail aponta para cá sem o aluno precisar logar:
 *   /preferencias?user_id=<uuid>&token=<hmac>
 *
 * A página chama a Edge Function pública "cancelar-lembretes",
 * que valida o token e marca receber_lembretes = false.
 */
export function PaginaPreferencias() {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get("user_id") ?? "";
  const token = searchParams.get("token") ?? "";
  const [estado, setEstado] = useState<"carregando" | "ok" | "invalido" | "erro">("carregando");

  useEffect(() => {
    let ativo = true;
    async function cancelar() {
      if (!userId || !token) {
        setEstado("invalido");
        return;
      }
      try {
        const { error } = await supabase.functions.invoke("cancelar-lembretes", {
          body: { user_id: userId, token },
        });
        if (!ativo) return;
        if (error) {
          setEstado("invalido");
        } else {
          setEstado("ok");
        }
      } catch {
        if (ativo) setEstado("erro");
      }
    }
    void cancelar();
    return () => {
      ativo = false;
    };
  }, [userId, token]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4">
          <a href="/" className="shrink-0">
            <Logo />
          </a>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-5 px-4 py-10">
        {estado === "carregando" && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-input bg-card px-6 py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Atualizando suas preferências…</p>
          </div>
        )}

        {estado === "ok" && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-6 py-12 text-center">
            <BellOff className="h-10 w-10 text-emerald-400" />
            <p className="text-lg font-semibold text-foreground">Lembretes cancelados</p>
            <p className="max-w-sm text-sm leading-relaxed text-foreground/80">
              Você não vai mais receber os lembretes semanais por e-mail. Se mudar de ideia,
              é só reativar em “Minha Empresa” dentro da plataforma.
            </p>
            <Button asChild variant="outline" className="mt-2">
              <a href="/">Voltar para a plataforma</a>
            </Button>
          </div>
        )}

        {estado === "invalido" && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 px-6 py-12 text-center">
            <AlertTriangle className="h-10 w-10 text-destructive" />
            <p className="text-lg font-semibold text-foreground">Link inválido</p>
            <p className="max-w-sm text-sm leading-relaxed text-foreground/80">
              Este link de cancelamento não é válido ou já foi usado. Se o problema
              continuar, cancele direto em “Minha Empresa” dentro da plataforma.
            </p>
            <Button asChild variant="outline" className="mt-2">
              <a href="/">Voltar para a plataforma</a>
            </Button>
          </div>
        )}

        {estado === "erro" && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 px-6 py-12 text-center">
            <AlertTriangle className="h-10 w-10 text-destructive" />
            <p className="text-lg font-semibold text-foreground">Não foi possível cancelar</p>
            <p className="max-w-sm text-sm leading-relaxed text-foreground/80">
              Ocorreu um erro ao atualizar suas preferências. Tente novamente em instantes
              ou cancele em “Minha Empresa” dentro da plataforma.
            </p>
            <Button asChild variant="outline" className="mt-2">
              <a href="/">Voltar para a plataforma</a>
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
