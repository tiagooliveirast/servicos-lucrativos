import { Bell, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabase";

/**
 * Toggle de opt-out dos lembretes semanais por e-mail (Prompt #25).
 * Quem desativa aqui não entra na lista de envio — mesma regra do
 * link de cancelamento que vai no rodapé de cada e-mail.
 */
export function ConfiguracaoLembretes({ userId }: { userId: string }) {
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [ativo, setAtivo] = useState(true);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function carregar() {
      const { data, error } = await supabase
        .from("perfis")
        .select("receber_lembretes")
        .eq("id", userId)
        .maybeSingle();
      if (!mounted) return;
      if (!error && data) {
        setAtivo(data.receber_lembretes !== false);
      }
      setCarregando(false);
    }
    void carregar();
    return () => {
      mounted = false;
    };
  }, [userId]);

  async function alternar(novoValor: boolean) {
    setSalvando(true);
    setSalvo(false);
    setErro(false);
    const { error } = await supabase
      .from("perfis")
      .update({ receber_lembretes: novoValor })
      .eq("id", userId);
    setSalvando(false);
    if (error) {
      setErro(true);
      setAtivo(!novoValor);
      return;
    }
    setAtivo(novoValor);
    setSalvo(true);
  }

  return (
    <section className="rounded-xl border border-input bg-card/40 p-4">
      <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-primary">
        <Bell className="h-4 w-4" />
        Lembretes semanais por e-mail
      </h3>
      <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
        Um e-mail por semana te avisando se você ficou sem abrir a plataforma, com a missão
        pendente da sua semana. Você pode cancelar a qualquer momento.
      </p>

      {carregando ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Carregando…
        </div>
      ) : (
        <label className="flex cursor-pointer items-start gap-3">
          <Checkbox
            checked={ativo}
            disabled={salvando}
            onCheckedChange={(v) => void alternar(Boolean(v))}
            className="mt-0.5"
          />
          <span>
            <span className="text-sm font-medium">Receber lembretes de inatividade</span>
            <span className="block text-xs text-muted-foreground">
              {ativo
                ? "Ativado: você recebe 1 e-mail semanal se ficar mais de 7 dias sem entrar."
                : "Desativado: nenhum lembrete semanal será enviado para você."}
            </span>
          </span>
        </label>
      )}

      {salvando && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Salvando…
        </p>
      )}
      {salvo && !salvando && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Preferência salva.
        </p>
      )}
      {erro && !salvando && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-destructive">
          <XCircle className="h-3.5 w-3.5" />
          Não foi possível salvar. Verifique sua conexão e tente novamente.
        </p>
      )}
    </section>
  );
}
