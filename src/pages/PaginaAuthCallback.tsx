import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { supabase } from "@/lib/supabase";

export function PaginaAuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const codigo = params.get("code");
    if (!codigo) {
      navigate("/", { replace: true });
      return;
    }
    let veioDeRecuperacao = false;
    const { data: inscricao } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === "PASSWORD_RECOVERY") veioDeRecuperacao = true;
    });
    supabase.auth
      .exchangeCodeForSession(codigo)
      .then(({ error }) => {
        inscricao.subscription.unsubscribe();
        if (error) {
          setErro("Não foi possível confirmar seu acesso. Tente entrar novamente.");
          return;
        }
        // Link "Esqueci minha senha": leva à tela para criar a senha nova.
        navigate(veioDeRecuperacao ? "/nova-senha" : "/", { replace: true });
      })
      .catch(() => setErro("Não foi possível confirmar seu acesso. Tente entrar novamente."));
  }, [params, navigate]);

  if (erro) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <p className="text-sm text-destructive">{erro}</p>
        <a href="/" className="mt-4 text-sm text-primary underline-offset-4 hover:underline">
          Voltar para a tela de entrada
        </a>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p className="text-sm">Confirmando seu acesso…</p>
    </div>
  );
}
