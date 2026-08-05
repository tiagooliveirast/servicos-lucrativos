import { AlertCircle, ArrowLeft, CalendarCheck, CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Layout } from "@/components/Layout";
import { CelebracaoMelhoria, type MensagemCelebracao } from "@/components/CelebracaoMelhoria";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import {
  DIRECAO_CHECKINS_SEMANAIS,
  maiorDestaque,
  melhoraCom,
  textoMelhoria,
  type MelhoriaComparavel,
} from "@/lib/direcaoIndicadores";
import type { CheckinSemanal } from "@/lib/types";
import { formatBRL, semanaAtualDe } from "@/lib/utils";

const CAMPOS_CHECKIN = [
  { id: "faturamento_semana", rotulo: "Faturamento da semana (R$)", tipo: "numero" },
  { id: "lucro_semana", rotulo: "Lucro da semana (R$)", tipo: "numero" },
  { id: "atendimentos", rotulo: "Atendimentos realizados", tipo: "inteiro" },
  { id: "orcamentos_enviados", rotulo: "Orçamentos enviados", tipo: "inteiro" },
  { id: "orcamentos_fechados", rotulo: "Orçamentos fechados", tipo: "inteiro" },
  { id: "avaliacoes_recebidas", rotulo: "Avaliações recebidas", tipo: "inteiro" },
  { id: "horas_trabalhadas", rotulo: "Horas trabalhadas na semana", tipo: "numero" },
] as const;

type IdCampo = (typeof CAMPOS_CHECKIN)[number]["id"];

function numeroOuNull(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function PaginaCheckin({ userId }: { userId: string }) {
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  const [jaFeito, setJaFeito] = useState(false);
  const [jaFeitoEm, setJaFeitoEm] = useState<CheckinSemanal | null>(null);
  const [semanaReferencia, setSemanaReferencia] = useState(1);

  const [valores, setValores] = useState<Record<string, string>>({});
  const [dificuldade, setDificuldade] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erroMsg, setErroMsg] = useState<string | null>(null);
  const [registrado, setRegistrado] = useState(false);
  const [celebracao, setCelebracao] = useState<MensagemCelebracao | null>(null);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro(false);
    async function carregar() {
      const [resCheckins, resProgresso] = await Promise.all([
        supabase
          .from("checkins_semanais")
          .select("*")
          .eq("user_id", userId)
          .order("data_checkin", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from("progresso_semanas").select("semana, status"),
      ]);
      if (!ativo) return;
      if (resCheckins.error || resProgresso.error) {
        setErro(true);
        setCarregando(false);
        return;
      }
      const ultimo = (resCheckins.data as CheckinSemanal | null) ?? null;
      const concluidas =
        ((resProgresso.data as { semana: number; status: string }[] | null) ?? [])
          .filter((p) => p.status === "concluida")
          .map((p) => p.semana);
      const planoAtual = semanaAtualDe(concluidas);
      setSemanaReferencia(planoAtual);
      setJaFeito(!!ultimo && ultimo.semana_referencia === planoAtual);
      setJaFeitoEm(ultimo);
      setCarregando(false);
    }
    void carregar();
    return () => {
      ativo = false;
    };
  }, [userId, tentativa]);

  function atualizar(id: IdCampo, valor: string) {
    setValores((v) => ({ ...v, [id]: valor }));
  }

  async function submeter() {
    setEnviando(true);
    setErroMsg(null);
    const corpo = {
      user_id: userId,
      semana_referencia: semanaReferencia,
      faturamento_semana: numeroOuNull(valores.faturamento_semana ?? ""),
      lucro_semana: numeroOuNull(valores.lucro_semana ?? ""),
      atendimentos: numeroOuNull(valores.atendimentos ?? ""),
      orcamentos_enviados: numeroOuNull(valores.orcamentos_enviados ?? ""),
      orcamentos_fechados: numeroOuNull(valores.orcamentos_fechados ?? ""),
      avaliacoes_recebidas: numeroOuNull(valores.avaliacoes_recebidas ?? ""),
      horas_trabalhadas: numeroOuNull(valores.horas_trabalhadas ?? ""),
      maior_dificuldade: dificuldade.trim() === "" ? null : dificuldade.trim(),
    };
    const { error } = await supabase.from("checkins_semanais").insert(corpo);
    setEnviando(false);
    if (error) {
      setErroMsg("Não foi possível registrar seu check-in. Verifique sua conexão e tente novamente.");
      return;
    }
    setRegistrado(true);
    const { data: ultimos } = await supabase
      .from("checkins_semanais")
      .select("*")
      .eq("user_id", userId)
      .order("data_checkin", { ascending: false })
      .limit(2);
    const anterior = (ultimos as CheckinSemanal[] | null)?.[1];
    if (!anterior) return;
    const melhorias: MelhoriaComparavel[] = [];
    for (const campo of ["faturamento_semana", "lucro_semana"] as const) {
      const antes = anterior[campo];
      const depois = corpo[campo];
      const direcao = DIRECAO_CHECKINS_SEMANAIS[campo];
      if (direcao && antes !== null && depois !== null && melhoraCom(antes, depois, direcao)) {
        melhorias.push({
          chave: `checkin-${campo}`,
          rotulo:
            campo === "faturamento_semana" ? "Faturamento da semana" : "Lucro da semana",
          antes,
          depois,
          direcao,
          unidade: "R$",
        });
      }
    }
    const destaque = maiorDestaque(melhorias);
    if (destaque) {
      setCelebracao({
        id: `checkin-${Date.now()}`,
        titulo: "Check-in melhorou",
        texto: textoMelhoria(destaque),
      });
    }
  }

  if (carregando) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (erro) {
    return (
      <Layout>
        <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-10 text-center">
          <AlertCircle className="h-6 w-6 text-destructive" />
          <p className="text-sm text-foreground/90">
            Não foi possível carregar o check-in agora. Verifique sua conexão e tente
            novamente.
          </p>
          <Button variant="outline" onClick={() => setTentativa((t) => t + 1)}>
            Tentar novamente
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
            <Link to="/dashboard">
              <ArrowLeft />
              Painel de semanas
            </Link>
          </Button>
          <div className="mt-3 flex items-center gap-2">
            <Badge variant="outline" className="text-primary">
              Check-in semanal
            </Badge>
          </div>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
            <CalendarCheck className="h-7 w-7 text-primary" />
            Como foi sua semana?
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Leva menos de 2 minutos e ajuda a acompanhar sua evolução semana a semana.
          </p>
        </div>

        {registrado && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            <p className="font-semibold">Check-in registrado</p>
            <p className="text-sm text-muted-foreground">
              Sua semana {semanaReferencia} foi registrada e seu IME foi atualizado.
            </p>
            <Button asChild variant="outline">
              <Link to="/ime">Ver meu IME</Link>
            </Button>
          </div>
        )}

        {!registrado && jaFeito && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            <p className="font-semibold">Check-in já feito</p>
            <p className="text-sm text-muted-foreground">
              Você já registrou o check-in da Semana {semanaReferencia}. O próximo
              check-in é liberado quando você avançar para a próxima semana do plano.
            </p>
            {jaFeitoEm && (
              <Card className="w-full max-w-md">
                <CardContent className="flex flex-col gap-1 pt-6 text-sm">
                  <p>
                    Semana referência:{" "}
                    <span className="font-medium text-foreground/90">
                      {jaFeitoEm.semana_referencia}
                    </span>
                  </p>
                  <p>
                    Feito em:{" "}
                    <span className="font-medium text-foreground/90">
                      {new Date(jaFeitoEm.data_checkin).toLocaleString("pt-BR", {
                        dateStyle: "long",
                        timeStyle: "short",
                      })}
                    </span>
                  </p>
                  <p>
                    Faturamento:{" "}
                    <span className="font-medium text-foreground/90">
                      {formatBRL(jaFeitoEm.faturamento_semana)}
                    </span>
                  </p>
                  <p>
                    Lucro:{" "}
                    <span className="font-medium text-foreground/90">
                      {formatBRL(jaFeitoEm.lucro_semana)}
                    </span>
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {!registrado && !jaFeito && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dados da semana</CardTitle>
              <CardDescription>
                Você está na Semana {semanaReferencia} do plano. Preencha o que você
                conseguir — nenhum campo é obrigatório.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                {CAMPOS_CHECKIN.map((campo) => (
                  <div key={campo.id} className="flex flex-col gap-2">
                    <Label htmlFor={campo.id}>{campo.rotulo}</Label>
                    <Input
                      id={campo.id}
                      type="number"
                      min="0"
                      step={campo.tipo === "inteiro" ? "1" : "0.01"}
                      inputMode={campo.tipo === "inteiro" ? "numeric" : "decimal"}
                      value={valores[campo.id] ?? ""}
                      placeholder="0"
                      onChange={(e) => atualizar(campo.id, e.target.value)}
                    />
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="maior_dificuldade">Maior dificuldade da semana</Label>
                <Textarea
                  id="maior_dificuldade"
                  rows={3}
                  value={dificuldade}
                  onChange={(e) => setDificuldade(e.target.value)}
                  placeholder="O que travou ou quase travou seu negócio nesta semana?"
                />
              </div>

              {erroMsg && (
                <p className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {erroMsg}
                </p>
              )}

              <div className="flex justify-end">
                <Button onClick={() => void submeter()} disabled={enviando} className="h-11">
                  {enviando && <Loader2 className="animate-spin" />}
                  Registrar check-in
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      <CelebracaoMelhoria mensagem={celebracao} aoFechar={() => setCelebracao(null)} />
    </Layout>
  );
}