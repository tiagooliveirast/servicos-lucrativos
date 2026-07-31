import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

export function useEhAdmin(): { ehAdmin: boolean; carregando: boolean } {
  const [ehAdmin, setEhAdmin] = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    async function checar() {
      const { data: sessao } = await supabase.auth.getSession();
      const user = sessao.session?.user;
      if (!user) {
        if (ativo) {
          setEhAdmin(false);
          setCarregando(false);
        }
        return;
      }
      const { data } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (ativo) {
        setEhAdmin(!!data);
        setCarregando(false);
      }
    }
    void checar();
    return () => {
      ativo = false;
    };
  }, []);

  return { ehAdmin, carregando };
}
