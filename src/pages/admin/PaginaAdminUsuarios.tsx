import { AlertCircle, Loader2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/lib/supabase";
import type { Perfil, ProgressoSemana } from "@/lib/types";
import { formatData, semanaAtualDe } from "@/lib/utils";

export function PaginaAdminUsuarios() {
  const [perfis, setPerfis] = useState<Perfil[] | null>(null);
  const [progresso, setProgresso] = useState<ProgressoSemana[] | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      const [resPerfis, resProgresso] = await Promise.all([
        supabase.from("perfis").select("*"),
        supabase.from("progresso_semanas").select("user_id, semana, status"),
      ]);
      if (!ativo) return;
      if (resPerfis.error || resProgresso.error) {
        setErro(true);
        return;
      }
      setPerfis(resPerfis.data as Perfil[]);
      setProgresso(resProgresso.data as ProgressoSemana[]);
    }
    void carregar();
    return () => {
      ativo = false;
    };
  }, []);

  if (erro) {
    return (
      <p className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
        <AlertCircle className="h-4 w-4 shrink-0" />
        Não foi possível carregar os usuários.
      </p>
    );
  }

  if (!perfis || !progresso) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const linhas = perfis.map((p) => {
    const doUsuario = progresso.filter((x) => x.user_id === p.id);
    const concluidas = doUsuario.filter((x) => x.status === "concluida").map((x) => x.semana);
    const pct = Math.round((concluidas.length / 12) * 100);
    return { perfil: p, concluidas, pct };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-primary" />
          Usuários
        </CardTitle>
        <CardDescription>
          Clique em um aluno para ver o detalhe completo (diagnóstico, semanas, painéis e Radar).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {linhas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum usuário cadastrado ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Aluno</th>
                  <th className="pb-2 pr-4 font-medium">Semana atual</th>
                  <th className="w-44 pb-2 pr-4 font-medium">Concluído</th>
                  <th className="pb-2 pr-4 font-medium">Último acesso</th>
                  <th className="pb-2 font-medium">Início</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map(({ perfil, concluidas, pct }) => (
                  <tr key={perfil.id} className="border-b border-border last:border-b-0">
                    <td className="py-3 pr-4">
                      <Link
                        to={`/admin/usuarios/${perfil.id}`}
                        className="font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {perfil.nome ?? "Sem nome"}
                      </Link>
                      {perfil.email && (
                        <p className="text-xs text-muted-foreground">{perfil.email}</p>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      {concluidas.includes(12) ? (
                        <Badge variant="sucesso">90 dias concluídos</Badge>
                      ) : (
                        <Badge variant="outline">Semana {semanaAtualDe(concluidas)}</Badge>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <Progress value={pct} className="flex-1" />
                        <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
                          {pct}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground">
                      {perfil.ultimo_acesso_at ? formatData(perfil.ultimo_acesso_at) : "—"}
                    </td>
                    <td className="py-3 text-xs text-muted-foreground">
                      {perfil.created_at ? formatData(perfil.created_at) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
