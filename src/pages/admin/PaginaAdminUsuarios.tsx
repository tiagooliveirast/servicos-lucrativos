import { Users } from "lucide-react";

import { CartaoCarregando } from "@/components/CartaoCarregando";
import { CartaoErro } from "@/components/CartaoErro";
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
import type { Perfil } from "@/lib/types";
import { formatData, semanaAtualDe } from "@/lib/utils";

type StatusAcesso = "ativo" | "inativo" | "sem_registro";

interface LinhaUsuario {
  perfil: Perfil;
  concluidas: number[];
  pct: number;
  statusAcesso: StatusAcesso;
}

function BadgeAcesso({ status }: { status: StatusAcesso }) {
  if (status === "inativo") return <Badge variant="destrutivo">Acesso inativo</Badge>;
  if (status === "sem_registro") return <Badge variant="outline">Sem acesso</Badge>;
  return <Badge variant="sucesso">Ativo</Badge>;
}

function SemanaBadge({ concluidas }: { concluidas: number[] }) {
  if (concluidas.includes(12)) {
    return <Badge variant="sucesso">90 dias concluídos</Badge>;
  }
  return <Badge variant="outline">Semana {semanaAtualDe(concluidas)}</Badge>;
}

export function PaginaAdminUsuarios() {
  const [linhas, setLinhas] = useState<LinhaUsuario[] | null>(null);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    setErro(false);
    setLinhas(null);
    async function carregar() {
      const [resPerfis, resProgresso, resAcessos] = await Promise.all([
        supabase.from("perfis").select("*"),
        supabase.from("progresso_semanas").select("user_id, semana, status"),
        supabase.from("acessos").select("user_id, ativo"),
      ]);
      if (!ativo) return;
      if (resPerfis.error || resProgresso.error || resAcessos.error) {
        setErro(true);
        return;
      }
      const acessos = new Map(
        (resAcessos.data as { user_id: string; ativo: boolean }[]).map((a) => [
          a.user_id,
          a.ativo,
        ])
      );
      const porUsuario = new Map<
        string,
        { semana: number; status: string }[]
      >();
      for (const x of resProgresso.data as {
        user_id: string;
        semana: number;
        status: string;
      }[]) {
        const lista = porUsuario.get(x.user_id) ?? [];
        lista.push(x);
        porUsuario.set(x.user_id, lista);
      }
      setLinhas(
        (resPerfis.data as Perfil[]).map((perfil) => {
          const doUsuario = porUsuario.get(perfil.id) ?? [];
          const concluidas = doUsuario
            .filter((x) => x.status === "concluida")
            .map((x) => x.semana);
          const pct = Math.round((concluidas.length / 12) * 100);
          const statusAcesso: StatusAcesso = !acessos.has(perfil.id)
            ? "sem_registro"
            : acessos.get(perfil.id)
              ? "ativo"
              : "inativo";
          return { perfil, concluidas, pct, statusAcesso };
        })
      );
    }
    void carregar();
    return () => {
      ativo = false;
    };
  }, [tentativa]);

  if (erro) {
    return (
      <CartaoErro
        mensagem="Não foi possível carregar os usuários. Verifique sua conexão e tente novamente."
        onTentar={() => setTentativa((t) => t + 1)}
      />
    );
  }

  if (!linhas) {
    return <CartaoCarregando />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-primary" />
          Usuários
        </CardTitle>
        <CardDescription>
          Clique em um aluno para ver o detalhe completo (diagnóstico, semanas,
          painéis e Radar).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {linhas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum usuário cadastrado ainda.
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-3 md:hidden">
              {linhas.map(({ perfil, concluidas, pct, statusAcesso }) => (
                <div
                  key={perfil.id}
                  className="flex flex-col gap-2 rounded-lg border border-input p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-0.5">
                      <Link
                        to={`/admin/usuarios/${perfil.id}`}
                        className="font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {perfil.nome ?? "Sem nome"}
                      </Link>
                      {perfil.email && (
                        <span className="text-xs text-muted-foreground">
                          {perfil.email}
                        </span>
                      )}
                    </div>
                    <BadgeAcesso status={statusAcesso} />
                  </div>
                  <SemanaBadge concluidas={concluidas} />
                  <div className="flex items-center gap-2">
                    <Progress value={pct} className="flex-1" />
                    <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
                      {pct}%
                    </span>
                  </div>
                  <dl className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                    <div className="flex flex-col">
                      <dt className="uppercase tracking-wide">Último acesso</dt>
                      <dd className="font-medium text-foreground/80">
                        {perfil.ultimo_acesso_at
                          ? formatData(perfil.ultimo_acesso_at)
                          : "—"}
                      </dd>
                    </div>
                    <div className="flex flex-col">
                      <dt className="uppercase tracking-wide">Início</dt>
                      <dd className="font-medium text-foreground/80">
                        {perfil.created_at ? formatData(perfil.created_at) : "—"}
                      </dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Aluno</th>
                    <th className="pb-2 pr-4 font-medium">Semana atual</th>
                    <th className="w-40 pb-2 pr-4 font-medium">Concluído</th>
                    <th className="pb-2 pr-4 font-medium">Acesso</th>
                    <th className="pb-2 pr-4 font-medium">Último acesso</th>
                    <th className="pb-2 font-medium">Início</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map(({ perfil, concluidas, pct, statusAcesso }) => (
                    <tr
                      key={perfil.id}
                      className="border-b border-border last:border-b-0"
                    >
                      <td className="py-3 pr-4">
                        <Link
                          to={`/admin/usuarios/${perfil.id}`}
                          className="font-medium text-primary underline-offset-4 hover:underline"
                        >
                          {perfil.nome ?? "Sem nome"}
                        </Link>
                        {perfil.email && (
                          <p className="text-xs text-muted-foreground">
                            {perfil.email}
                          </p>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <SemanaBadge concluidas={concluidas} />
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <Progress value={pct} className="flex-1" />
                          <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
                            {pct}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <BadgeAcesso status={statusAcesso} />
                      </td>
                      <td className="py-3 pr-4 text-xs text-muted-foreground">
                        {perfil.ultimo_acesso_at
                          ? formatData(perfil.ultimo_acesso_at)
                          : "—"}
                      </td>
                      <td className="py-3 text-xs text-muted-foreground">
                        {perfil.created_at
                          ? formatData(perfil.created_at)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
