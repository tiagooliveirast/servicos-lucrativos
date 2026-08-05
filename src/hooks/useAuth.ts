import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { registrarLoginDiario } from "@/lib/gamificacao";
import { diasDesdeUltimoLogin } from "@/lib/motivo";
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
  /** Dias desde o último login antes do login de hoje (null quando não dá pra saber). */
  ausenteDias: number | null;
}

export function useAuth(recarregar = 0): EstadoAuth {
  const [estado, setEstado] = useState<EstadoAuth>({
    fase: "carregando",
    user: null,
    perfil: null,
    ausenteDias: null,
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
        setEstado({ fase: "deslogado", user: null, perfil: null, ausenteDias: null });
        return;
      }
      try {
        const { data: perfil } = await supabase
          .from("perfis")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (!perfil) {
          setEstado({ fase: "onboarding", user, perfil: null, ausenteDias: null });
          return;
        }
        const { data: acesso } = await supabase
          .from("acessos")
          .select("ativo")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!ativo) return;
        if (!acesso) {
          setEstado({ fase: "sem_acesso", user, perfil, ausenteDias: null });
          return;
        }
        if (!acesso.ativo) {
          setEstado({ fase: "acesso_inativo", user, perfil, ausenteDias: null });
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
          setEstado({ fase: "onboarding", user, perfil, ausenteDias: null });
          return;
        }

        // Lê o último login ANTES do registrar_login_diario atualizá-lo —
        // é o que permite detectar retorno após ausência na Sala de Guerra.
        let ausenteDias: number | null = null;
        try {
          const { data: gamificacao } = await supabase
            .from("gamificacao_usuario")
            .select("ultimo_login")
            .eq("user_id", user.id)
            .maybeSingle();
          const ultimoLogin = (gamificacao as { ultimo_login: string | null } | null)
            ?.ultimo_login;
          ausenteDias = diasDesdeUltimoLogin(ultimoLogin ?? null);
        } catch {
          ausenteDias = null;
        }

        if (!ativo) return;
        setEstado({ fase: "logado", user, perfil, ausenteDias });
        // Registra no servidor o login diário (streak + XP). Fogo-e-esquece:
        // se falhar, apenas não pontua hoje.
        void registrarLoginDiario().catch(() => undefined);
      } catch {
        // Erro de rede/servidor: mantém o usuário com sessão, mas mostra
        // uma tela de erro com opção de tentar novamente (em vez de
        // tratar como deslogado e mostrar a tela de login).
        if (ativo) setEstado({ fase: "erro", user, perfil: null, ausenteDias: null });
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
