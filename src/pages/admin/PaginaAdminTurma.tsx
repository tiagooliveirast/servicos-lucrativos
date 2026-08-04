import { AlertCircle, Crown, Loader2, Rocket, Star, Telescope, TrendingUp, UserX } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import type {
  CrmCandidatoCase,
  CrmEvolucaoAcelerada,
  CrmRiscoDesistencia,
} from "@/lib/types";
import { formatData } from "@/lib/utils";

interface DadosTurma {
  risco: CrmRiscoDesistencia[];
  evolucao: CrmEvolucaoAcelerada[];
  candidatos: CrmCandidatoCase[];
}

export function PaginaAdminTurma() {
  const [dados, setDados] = useState<DadosTurma | null>(null);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    setErro(false);
    setDados(null);
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
      setDados({
        risco: (resRisco.data ?? []) as CrmRiscoDesistencia[],
        evolucao: (resEvolucao.data ?? []) as CrmEvolucaoAcelerada[],
        candidatos: (resCandidatos.data ?? []) as CrmCandidatoCase[],
      });
    }
    void carregar();
    return () => {
      ativo = false;
    };
  }, [tentativa]);

  if (erro) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-10 text-center">
        <AlertCircle className="h-6 w-6 text-destructive" />
        <p className="text-sm text-foreground/90">
          Não foi possível carregar a visão da turma. Verifique sua conexão e tente novamente.
        </p>
        <Button variant="outline" onClick={() => setTentativa((t) => t + 1)}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (!dados) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
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
              Alunos há {dados.risco.length === 0 ? "" : ""}7 dias ou mais sem login
              (maior tempo primeiro).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dados.risco.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum aluno em risco no momento.
              </p>
            ) : (
              <ul className="flex flex-col">
                {dados.risco.map((r) => (
                  <li key={r.user_id} className="border-b border-border py-2.5 last:border-b-0">
                    <Link
                      to={`/admin/usuarios/${r.user_id}`}
                      className="flex items-center justify-between gap-2 hover:underline"
                    >
                      <span className="min-w-0 truncate text-sm">
                        <span className="font-medium">{r.nome ?? r.email ?? "Aluno(a)"}</span>
                        {r.nome_empresa && (
                          <span className="text-muted-foreground"> · {r.nome_empresa}</span>
                        )}
                      </span>
                      <Badge variant="destrutivo">{r.dias_sem_login} dias</Badge>
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