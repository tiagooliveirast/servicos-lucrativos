import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
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

export interface EstadoAuth {
  fase: FaseAuth;
  user: User | null;
  perfil: Perfil | null;
  /** Dias desde o último login antes do login de hoje (null quando não dá pra saber). */
  ausenteDias: number | null;
}

export interface ContextoAuth extends EstadoAuth {
  ehAdmin: boolean;
  ehAdminCarregando: boolean;
  /** Reavalia sessão + perfil + admin (retry de erro / pós-onboarding). */
  reavaliar: () => void;
}

export const AuthContexto = createContext<ContextoAuth | null>(null);

/**
 * Resolve UMA única vez por sessão: sessão Supabase + perfil + status de
 * acesso + onboarding + status de admin (em paralelo, 1 round-trip).
 * Reage a eventos de auth (login/logout/troca de conta) via onAuthStateChange.
 * useAuth e useEhAdmin apenas leem deste contexto — sem chamadas duplicadas.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoAuth>({
    fase: "carregando",
    user: null,
    perfil: null,
    ausenteDias: null,
  });
  const [ehAdmin, setEhAdmin] = useState(false);
  const [ehAdminCarregando, setEhAdminCarregando] = useState(true);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let ativo = true;

    async function processarUsuario(user: User | null) {
      if (!ativo) return;
      if (!user) {
        setEstado({ fase: "deslogado", user: null, perfil: null, ausenteDias: null });
        setEhAdmin(false);
        setEhAdminCarregando(false);
        return;
      }
      try {
        const [resPerfil, resAcesso, resDiagnostico, resGamificacao, resAdmin] =
          await Promise.all([
            supabase.from("perfis").select("*").eq("id", user.id).maybeSingle(),
            supabase.from("acessos").select("ativo").eq("user_id", user.id).maybeSingle(),
            supabase
              .from("diagnostico_inicial")
              .select("id")
              .eq("user_id", user.id)
              .maybeSingle(),
            supabase
              .from("gamificacao_usuario")
              .select("ultimo_login")
              .eq("user_id", user.id)
              .maybeSingle(),
            supabase.from("admins").select("user_id").eq("user_id", user.id).maybeSingle(),
          ]);
        if (!ativo) return;

        setEhAdmin(Boolean(resAdmin.data));
        setEhAdminCarregando(false);

        const perfil = resPerfil.data as Perfil | null;
        if (!perfil) {
          setEstado({ fase: "onboarding", user, perfil: null, ausenteDias: null });
          return;
        }
        const acesso = resAcesso.data as { ativo: boolean } | null;
        if (!acesso) {
          setEstado({ fase: "sem_acesso", user, perfil, ausenteDias: null });
          return;
        }
        if (!acesso.ativo) {
          setEstado({ fase: "acesso_inativo", user, perfil, ausenteDias: null });
          return;
        }
        if (!resDiagnostico.data) {
          setEstado({ fase: "onboarding", user, perfil, ausenteDias: null });
          return;
        }

        // Lê o último login ANTES do registrar_login_diario atualizá-lo —
        // é o que permite detectar retorno após ausência na Sala de Guerra.
        let ausenteDias: number | null = null;
        try {
          const ultimoLogin = (
            resGamificacao.data as { ultimo_login: string | null } | null
          )?.ultimo_login;
          ausenteDias = diasDesdeUltimoLogin(ultimoLogin ?? null);
        } catch {
          ausenteDias = null;
        }

        setEstado({ fase: "logado", user, perfil, ausenteDias });
        // Registra no servidor o login diário (streak + XP). Fogo-e-esquece:
        // se falhar, apenas não pontua hoje.
        void registrarLoginDiario().catch(() => undefined);
      } catch {
        // Erro de rede/servidor: mantém o usuário com sessão, mas mostra
        // uma tela de erro com opção de tentar novamente (em vez de
        // tratar como deslogado e mostrar a tela de login).
        if (ativo) {
          setEstado({ fase: "erro", user, perfil: null, ausenteDias: null });
          setEhAdminCarregando(false);
        }
      }
    }

    async function avaliarSessao() {
      const { data } = await supabase.auth.getSession();
      await processarUsuario(data.session?.user ?? null);
    }

    const { data: subscription } = supabase.auth.onAuthStateChange((_evento, sessao) => {
      void processarUsuario(sessao?.user ?? null);
    });

    void avaliarSessao();

    return () => {
      ativo = false;
      subscription.subscription.unsubscribe();
    };
  }, [versao]);

  const reavaliar = useCallback(() => setVersao((v) => v + 1), []);

  const valor = useMemo<ContextoAuth>(
    () => ({ ...estado, ehAdmin, ehAdminCarregando, reavaliar }),
    [estado, ehAdmin, ehAdminCarregando, reavaliar]
  );

  return <AuthContexto.Provider value={valor}>{children}</AuthContexto.Provider>;
}
