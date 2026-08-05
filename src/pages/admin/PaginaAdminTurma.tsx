import {
  Crown,
  MessageCircle,
  Rocket,
  Star,
  Telescope,
  TrendingUp,
  UserX,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { CartaoCarregando } from "@/components/CartaoCarregando";
import { CartaoErro } from "@/components/CartaoErro";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatarUltimoLembrete,
  missaoPendenteDe,
  montarLinkWhatsApp,
  montarMensagemLembrete,
} from "@/lib/lembretes-whatsapp";
import { supabase } from "@/lib/supabase";
import type {
  CrmCandidatoCase,
  CrmEvolucaoAcelerada,
  CrmRiscoDesistencia,
  LembreteEnviado,
  Missao,
} from "@/lib/types";
import { formatData, semanaAtualDe } from "@/lib/utils";

interface DadosTurma {
  risco: CrmRiscoDesistencia[];
  evolucao: CrmEvolucaoAcelerada[];
  candidatos: CrmCandidatoCase[];
}

interface ContextoAluno {
  semana: number;
  missao: string;
  ultimoLembrete: LembreteEnviado | null;
}

export function PaginaAdminTurma() {
  const [dados, setDados] = useState<DadosTurma | null>(null);
  const [porUsuario, setPorUsuario] = useState<Record<string, ContextoAluno>>({});
  const [contextoPronto, setContextoPronto] = useState(false);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    setErro(false);
    setDados(null);
    setPorUsuario({});
    setContextoPronto(false);

    async function carregarContexto(risco: CrmRiscoDesistencia[]) {
      const ids = risco.map((r) => r.user_id);
      if (ids.length === 0) {
        setPorUsuario({});
        setContextoPronto(true);
        return;
      }
      const [resProgresso, resMissoes, resLembretes] = await Promise.all([
        supabase
          .from("progresso_semanas")
          .select("user_id, semana")
          .in("user_id", ids)
          .eq("status", "concluida"),
        supabase
          .from("missoes")
          .select("user_id, semana, tipo, indice, descricao")
          .in("user_id", ids)
          .eq("concluida", false),
        supabase
          .from("lembretes_enviados")
          .select("id, user_id, tipo, enviado_em")
          .in("user_id", ids)
          .order("enviado_em", { ascending: false }),
      ]);
      if (!ativo) return;
      if (resProgresso.error || resMissoes.error || resLembretes.error) {
        setErro(true);
        return;
      }

      const concluidasPorUser = new Map<string, number[]>();
      for (const linha of (resProgresso.data ?? []) as { user_id: string; semana: number }[]) {
        const lista = concluidasPorUser.get(linha.user_id) ?? [];
        lista.push(linha.semana);
        concluidasPorUser.set(linha.user_id, lista);
      }

      const pendentesPorUser = new Map<
        string,
        Pick<Missao, "user_id" | "semana" | "tipo" | "indice" | "descricao">[]
      >();
      for (const linha of (resMissoes.data ?? []) as Pick<
        Missao,
        "user_id" | "semana" | "tipo" | "indice" | "descricao"
      >[]) {
        const lista = pendentesPorUser.get(linha.user_id) ?? [];
        lista.push(linha);
        pendentesPorUser.set(linha.user_id, lista);
      }

      const ultimoLembretePorUser = new Map<string, LembreteEnviado>();
      for (const linha of (resLembretes.data ?? []) as LembreteEnviado[]) {
        if (!ultimoLembretePorUser.has(linha.user_id)) {
          ultimoLembretePorUser.set(linha.user_id, linha);
        }
      }

      const mapa: Record<string, ContextoAluno> = {};
      for (const r of risco) {
        const semana = semanaAtualDe(concluidasPorUser.get(r.user_id) ?? []);
        mapa[r.user_id] = {
          semana,
          missao: missaoPendenteDe(pendentesPorUser.get(r.user_id) ?? [], semana),
          ultimoLembrete: ultimoLembretePorUser.get(r.user_id) ?? null,
        };
      }
      setPorUsuario(mapa);
      setContextoPronto(true);
    }

    async function carregar() {
      const [resRisco, resEvolucao, resCandidatos] = await Promise.all([
        supabase
          .from("crm_risco_desistencia")
          .select("*")
          .order("dias_sem_login", { ascending: false }),
        supabase
          .from("crm_evolucao_acelerada")
          .select("*")
          .order("ganho_30_dias", { ascending: false }),
        supabase
          .from("crm_candidatos_case")
          .select("*")
          .order("ime_atual", { ascending: false }),
      ]);
      if (!ativo) return;
      if (resRisco.error || resEvolucao.error || resCandidatos.error) {
        setErro(true);
        return;
      }
      const risco = (resRisco.data ?? []) as CrmRiscoDesistencia[];
      setDados({
        risco,
        evolucao: (resEvolucao.data ?? []) as CrmEvolucaoAcelerada[],
        candidatos: (resCandidatos.data ?? []) as CrmCandidatoCase[],
      });
      await carregarContexto(risco);
    }
    void carregar();
    return () => {
      ativo = false;
    };
  }, [tentativa]);

  async function registrarLembreteManual(aluno: CrmRiscoDesistencia) {
    const { error } = await supabase.from("lembretes_enviados").insert({
      user_id: aluno.user_id,
      tipo: "whatsapp_manual",
    });
    if (!error) {
      const enviado: LembreteEnviado = {
        id: "",
        user_id: aluno.user_id,
        tipo: "whatsapp_manual",
        enviado_em: new Date().toISOString(),
      };
      setPorUsuario((m) => ({
        ...m,
        [aluno.user_id]: {
          ...(m[aluno.user_id] ?? { semana: 1, missao: "continue o passo a passo da semana atual" }),
          ultimoLembrete: enviado,
        },
      }));
    }
  }

  if (erro) {
    return (
      <CartaoErro
        mensagem="Não foi possível carregar a visão da turma. Verifique sua conexão e tente novamente."
        onTentar={() => setTentativa((t) => t + 1)}
      />
    );
  }

  if (!dados || !contextoPronto) {
    return <CartaoCarregando />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Telescope className="h-5 w-5 text-primary" />
          Visão Geral da Turma
        </h2>
        <p className="text-sm text-muted-foreground">
          Quem precisa de atenção, quem está acelerando e quem pode virar case. Tudo
          calculado do que já existe — sem trabalho manual.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1 lg:max-w-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserX className="h-4 w-4 text-red-400" />
              Risco de desistência
            </CardTitle>
            <CardDescription>
              Alunos há 7 dias ou mais sem login (maior tempo primeiro). Envie o lembrete
              pelo WhatsApp para trazer de volta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dados.risco.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum aluno em risco no momento.
              </p>
            ) : (
              <ul className="flex flex-col">
                {dados.risco.map((r) => {
                  const contexto = porUsuario[r.user_id];
                  const semWhatsapp = !r.whatsapp || r.whatsapp.trim() === "";
                  const linkWhatsApp = semWhatsapp
                    ? null
                    : montarLinkWhatsApp(
                        r.whatsapp!,
                        montarMensagemLembrete({
                          nome: r.nome,
                          diasSemLogin: r.dias_sem_login,
                          semana: contexto?.semana ?? 1,
                          missao: contexto?.missao ?? "continue o passo a passo da semana atual",
                        })
                      );
                  return (
                    <li key={r.user_id} className="border-b border-border py-3 last:border-b-0">
                      <div className="flex items-center justify-between gap-2">
                        <Link
                          to={`/admin/usuarios/${r.user_id}`}
                          className="flex min-w-0 items-center gap-2 hover:underline"
                        >
                          <span className="min-w-0 truncate text-sm">
                            <span className="font-medium">{r.nome ?? r.email ?? "Aluno(a)"}</span>
                            {r.nome_empresa && (
                              <span className="text-muted-foreground"> · {r.nome_empresa}</span>
                            )}
                          </span>
                        </Link>
                        <Badge variant="destrutivo">{r.dias_sem_login} dias</Badge>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                        {linkWhatsApp ? (
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            onClick={() => void registrarLembreteManual(r)}
                          >
                            <a href={linkWhatsApp} target="_blank" rel="noreferrer">
                              <MessageCircle className="h-3.5 w-3.5" />
                              Abrir WhatsApp
                            </a>
                          </Button>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            Sem WhatsApp cadastrado
                            <Link
                              to={`/admin/usuarios/${r.user_id}`}
                              className="font-medium text-primary underline-offset-2 hover:underline"
                            >
                              preencher
                            </Link>
                          </span>
                        )}
                        {contexto?.ultimoLembrete && (
                          <span className="text-xs text-muted-foreground">
                            {formatarUltimoLembrete(contexto.ultimoLembrete.enviado_em)}
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:max-w-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Rocket className="h-4 w-4 text-emerald-400" />
              Evolução acelerada
            </CardTitle>
            <CardDescription>
              Ganho de 20+ pontos de IME nos últimos 30 dias (maior ganho primeiro).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dados.evolucao.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum aluno com evolução acelerada ainda.
              </p>
            ) : (
              <ul className="flex flex-col">
                {dados.evolucao.map((e) => (
                  <li key={e.user_id} className="border-b border-border py-2.5 last:border-b-0">
                    <Link
                      to={`/admin/usuarios/${e.user_id}`}
                      className="flex items-center justify-between gap-2 hover:underline"
                    >
                      <span className="text-sm">
                        <span className="font-medium">IME {e.ime_ha_30_dias} → {e.ime_atual}</span>
                        <span className="block text-xs text-muted-foreground">
                          {formatData(e.calculado_em)}
                        </span>
                      </span>
                      <Badge variant="sucesso">
                        <TrendingUp className="h-3 w-3" />
                        +{e.ganho_30_dias}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:max-w-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Crown className="h-4 w-4 text-yellow-400" />
              Candidatos a case
            </CardTitle>
            <CardDescription>
              Chave alta (Vermelho ou acima) desbloqueada + certificado disponível.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dados.candidatos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum candidato a case ainda.
              </p>
            ) : (
              <ul className="flex flex-col">
                {dados.candidatos.map((c) => (
                  <li key={c.user_id} className="border-b border-border py-2.5 last:border-b-0">
                    <Link
                      to={`/admin/usuarios/${c.user_id}`}
                      className="flex items-center justify-between gap-2 hover:underline"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border bg-card">
                          <Star className="h-3.5 w-3.5" style={{ color: c.chave_cor_hex ?? undefined }} />
                        </span>
                        <span className="min-w-0 text-sm">
                          <span className="truncate font-medium">
                            {c.nome ?? c.email ?? "Aluno(a)"}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {c.chave_titulo ?? "Chave alta"} · IME {c.ime_atual ?? "—"}
                          </span>
                        </span>
                      </span>
                      <Badge variant="outline">
                        {c.semanas_concluidas}/12 sem
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
