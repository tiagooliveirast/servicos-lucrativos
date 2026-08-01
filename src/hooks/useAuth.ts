import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";
import type { Perfil } from "@/lib/types";

export type FaseAuth =
  | "carregando"
  | "deslogado"
  | "sem_acesso"
  | "acesso_inativo"
  | "onboarding"
  | "logado"
  | "erro";

interface EstadoAuth {
  fase: FaseAuth;
  user: User | null;
  perfil: Perfil | null;
}

export function useAuth(recarregar = 0): EstadoAuth {
  const [estado, setEstado] = useState<EstadoAuth>({
    fase: "carregando",
    user: null,
    perfil: null,
  });

  useEffect(() => {
    let ativo = true;

    async function avaliarSessao() {
      const { data } = await supabase.auth.getSession();
      await processarUsuario(data.session?.user ?? null);
    }

    async function processarUsuario(user: User | null) {
      if (!ativo) return;
      if (!user) {
        setEstado({ fase: "deslogado", user: null, perfil: null });
        return;
      }
      try {
        const { data: perfil } = await supabase
          .from("perfis")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (!perfil) {
          setEstado({ fase: "onboarding", user, perfil: null });
          return;
        }
        const { data: acesso } = await supabase
          .from("acessos")
          .select("ativo")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!ativo) return;
        if (!acesso) {
          setEstado({ fase: "sem_acesso", user, perfil });
          return;
        }
        if (!acesso.ativo) {
          setEstado({ fase: "acesso_inativo", user, perfil });
          return;
        }

        // Primeiro uso = ainda não existe diagnóstico inicial → onboarding
        const { data: diagnostico } = await supabase
          .from("diagnostico_inicial")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!ativo) return;
        if (!diagnostico) {
          setEstado({ fase: "onboarding", user, perfil });
          return;
        }

        setEstado({ fase: "logado", user, perfil });
      } catch {
        // Erro de rede/servidor: mantém o usuário com sessão, mas mostra
        // uma tela de erro com opção de tentar novamente (em vez de
        // tratar como deslogado e mostrar a tela de login).
        if (ativo) setEstado({ fase: "erro", user, perfil: null });
      }
    }

    const { data: subscription } = supabase.auth.onAuthStateChange((_evento, sessao) => {
      void processarUsuario(sessao?.user ?? null);
    });

    void avaliarSessao();

    return () => {
      ativo = false;
      subscription.subscription.unsubscribe();
    };
  }, [recarregar]);

  return estado;
}
