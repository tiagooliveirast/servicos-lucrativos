import { Activity, AlertCircle, HelpCircle, Loader2, Paperclip, TrendingUp, Trophy, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { contarAnexosPendentes } from "@/lib/anexos-missoes";
import { contarDuvidasAbertas } from "@/lib/duvidas";
import { supabase } from "@/lib/supabase";
import type { AtividadeLog, Perfil, ProgressoSemana } from "@/lib/types";
import { formatarQuando, formatNumero } from "@/lib/utils";

interface DadosAdmin {
  perfis: Perfil[];
  progresso: ProgressoSemana[];
  atividade: AtividadeLog[];
}

export function PaginaAdminIndex() {
  const [dados, setDados] = useState<DadosAdmin | null>(null);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const [duvidasAbertas, setDuvidasAbertas] = useState(0);
  const [anexosPendentes, setAnexosPendentes] = useState(0);

  useEffect(() => {
    let ativo = true;
    setErro(false);
    setDados(null);
    async function carregar() {
      const [resPerfis, resProgresso, resAtividade, duvidas, anexos] = await Promise.all([
        supabase.from("perfis").select("id, nome, email, ultimo_acesso_at, created_at"),
        supabase.from("progresso_semanas").select("user_id, semana, status"),
        supabase
          .from("atividade_log")
          .select("id, user_id, tipo, descricao, criado_em")
          .order("criado_em", { ascending: false })
          .limit(30),
        contarDuvidasAbertas(),
        contarAnexosPendentes(),
      ]);
      if (!ativo) return;
      if (resPerfis.error || resProgresso.error || resAtividade.error) {
        setErro(true);
        return;
      }
      setDados({
        perfis: resPerfis.data as Perfil[],
        progresso: resProgresso.data as ProgressoSemana[],
        atividade: resAtividade.data as AtividadeLog[],
      });
      setDuvidasAbertas(duvidas);
      setAnexosPendentes(anexos);
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
          Não foi possível carregar os dados. Verifique sua conexão e tente novamente.
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

  const agora = Date.now();
  const seteDias = 7 * 24 * 60 * 60 * 1000;
  const ativos7d = dados.perfis.filter((p) => {
    if (!p.ultimo_acesso_at) return false;
    return agora - new Date(p.ultimo_acesso_at).getTime() <= seteDias;
  }).length;

  const concluidasPorUsuario = new Map<string, number>();
  const concluiram90 = new Set<string>();
  for (const p of dados.progresso) {
    if (p.status !== "concluida") continue;
    concluidasPorUsuario.set(p.user_id, (concluidasPorUsuario.get(p.user_id) ?? 0) + 1);
    if (p.semana === 12) concluiram90.add(p.user_id);
  }
  const total = dados.perfis.length;
  const progressoMedio =
    total > 0
      ? Math.round(
          (Array.from(concluidasPorUsuario.values()).reduce((soma, n) => soma + n, 0) /
            total /
            12) *
            1000
        ) / 10
      : 0;

  const nomes = new Map(dados.perfis.map((p) => [p.id, p.nome ?? p.email ?? "Aluno(a)"]));

  const metricas = [
    { rotulo: "Usuários com acesso", valor: formatNumero(total), icone: Users },
    { rotulo: "Ativos nos últimos 7 dias", valor: formatNumero(ativos7d), icone: Activity },
    { rotulo: "Progresso médio", valor: `${progressoMedio}%`, icone: TrendingUp },
    { rotulo: "Concluíram os 90 dias", valor: formatNumero(concluiram90.size), icone: Trophy },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metricas.map((m) => (
          <Card key={m.rotulo}>
            <CardContent className="flex flex-col gap-1 p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <m.icone className="h-4 w-4 text-primary" />
                {m.rotulo}
              </div>
              <p className="text-2xl font-bold">{m.valor}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          to="/admin/duvidas"
          className="group flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 transition-colors hover:border-amber-500/60"
        >
          <div className="flex items-center gap-3">
            <HelpCircle className="h-5 w-5 text-amber-400" />
            <div>
              <p className="font-semibold">
                {duvidasAbertas} {duvidasAbertas === 1 ? "dúvida aberta" : "dúvidas abertas"}
              </p>
              <p className="text-sm text-muted-foreground">
                Aguardando resposta do Tiago
              </p>
            </div>
          </div>
          <span className="text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
            Responder →
          </span>
        </Link>
        <Link
          to="/admin/anexos"
          className="group flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 p-4 transition-colors hover:border-primary/60"
        >
          <div className="flex items-center gap-3">
            <Paperclip className="h-5 w-5 text-primary" />
            <div>
              <p className="font-semibold">
                {anexosPendentes} {anexosPendentes === 1 ? "anexo pendente" : "anexos pendentes"}
              </p>
              <p className="text-sm text-muted-foreground">
                Entregas de missões para revisar
              </p>
            </div>
          </div>
          <span className="text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
            Revisar →
          </span>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-primary" />
            Atividade recente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dados.atividade.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma atividade registrada ainda.
            </p>
          ) : (
            <ul className="flex flex-col">
              {dados.atividade.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-0.5 border-b border-border py-3 last:border-b-0"
                >
                  <p className="text-sm">
                    <span className="font-medium text-foreground/90">
                      {nomes.get(item.user_id) ?? "Aluno(a)"}
                    </span>{" "}
                    {item.descricao}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatarQuando(item.criado_em)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
