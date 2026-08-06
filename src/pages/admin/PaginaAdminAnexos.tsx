import { AlertCircle, CheckCircle2, ExternalLink, FileUp, Loader2, Paperclip, XCircle } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  avaliarAnexoAdmin,
  listarAnexosPendentesAdmin,
  listarAnexosRevisadosAdmin,
  rotuloTipoAnexo,
  urlAssinadaAnexo,
} from "@/lib/anexos-missoes";
import type { MissaoAnexo } from "@/lib/types";
import { cn, formatarQuando } from "@/lib/utils";

export function PaginaAdminAnexos() {
  const [pendentes, setPendentes] = useState<MissaoAnexo[] | null>(null);
  const [revisados, setRevisados] = useState<MissaoAnexo[]>([]);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const [comentarios, setComentarios] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState<string | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [gerando, setGerando] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    setErro(false);
    setPendentes(null);
    async function carregar() {
      try {
        const [pend, rev] = await Promise.all([
          listarAnexosPendentesAdmin(),
          listarAnexosRevisadosAdmin(),
        ]);
        if (!ativo) return;
        setPendentes(pend);
        setRevisados(rev);
      } catch {
        if (ativo) setErro(true);
      }
    }
    void carregar();
    return () => {
      ativo = false;
    };
  }, [tentativa]);

  async function avaliar(
    anexo: MissaoAnexo,
    status: "aprovado" | "rejeitado"
  ) {
    setSalvando(anexo.id);
    setErroAcao(null);
    try {
      await avaliarAnexoAdmin(anexo.id, status, comentarios[anexo.id] ?? null);
      const [pend, rev] = await Promise.all([
        listarAnexosPendentesAdmin(),
        listarAnexosRevisadosAdmin(),
      ]);
      setPendentes(pend);
      setRevisados(rev);
    } catch (e) {
      setErroAcao(e instanceof Error ? e.message : "Não foi possível avaliar.");
    } finally {
      setSalvando(null);
    }
  }

  async function abrirArquivo(anexo: MissaoAnexo) {
    setGerando(anexo.id);
    setErroAcao(null);
    try {
      const url = await urlAssinadaAnexo(anexo.storage_path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setErroAcao(e instanceof Error ? e.message : "Não foi possível abrir o arquivo.");
    } finally {
      setGerando(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Paperclip className="h-5 w-5 text-primary" />
          Aprovação de anexos das missões
        </h2>
        <p className="text-sm text-muted-foreground">
          Arquivos enviados pelos alunos nas semanas que pedem entrega. A aprovação é
          feedback qualitativo do progresso das missões.
        </p>
      </div>

      {erro ? (
        <CartaoErro
          mensagem="Não foi possível carregar os anexos. Verifique sua conexão e tente novamente."
          onTentar={() => setTentativa((t) => t + 1)}
        />
      ) : pendentes === null ? (
        <CartaoCarregando />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileUp className="h-4 w-4 text-primary" />
                Pendentes ({pendentes.length})
              </CardTitle>
              <CardDescription>
                Os mais antigos primeiro. Abra o arquivo, revise e aprove ou rejeite.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendentes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum anexo aguardando revisão. 
                </p>
              ) : (
                <ul className="flex flex-col">
                  {pendentes.map((a) => (
                    <li
                      key={a.id}
                      className="flex flex-col gap-3 border-b border-border py-4 last:border-b-0"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="pendente">Pendente</Badge>
                        <Badge variant="secondary">Semana {a.semana_numero}</Badge>
                        <Badge variant="outline">{rotuloTipoAnexo(a.tipo_anexo)}</Badge>
                        <span className="text-sm font-medium">
                          <Link to={`/admin/usuarios/${a.user_id}`} className="hover:underline">
                            {a.perfis?.nome ?? a.perfis?.email ?? "Aluno(a)"}
                          </Link>
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatarQuando(a.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {a.nome_arquivo ?? `Arquivo ${a.storage_path.split("/").pop()}`}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void abrirArquivo(a)}
                          disabled={gerando === a.id}
                        >
                          {gerando === a.id ? (
                            <Loader2 className="animate-spin" />
                          ) : (
                            <ExternalLink />
                          )}
                          Ver arquivo
                        </Button>
                      </div>
                      <div className="flex flex-col gap-2 rounded-lg border border-input p-4">
                        <Textarea
                          rows={2}
                          placeholder="Comentário opcional para o aluno (ex.: ajustar o preço do Serviço 2)…"
                          value={comentarios[a.id] ?? ""}
                          onChange={(e) =>
                            setComentarios((c) => ({ ...c, [a.id]: e.target.value }))
                          }
                          disabled={salvando === a.id}
                        />
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => void avaliar(a, "rejeitado")}
                            disabled={salvando === a.id}
                          >
                            {salvando === a.id ? (
                              <Loader2 className="animate-spin" />
                            ) : (
                              <XCircle />
                            )}
                            Rejeitar
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => void avaliar(a, "aprovado")}
                            disabled={salvando === a.id}
                          >
                            {salvando === a.id ? (
                              <Loader2 className="animate-spin" />
                            ) : (
                              <CheckCircle2 />
                            )}
                            Aprovar
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Paperclip className="h-4 w-4 text-primary" />
                Revisados recentemente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {revisados.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum anexo revisado ainda.
                </p>
              ) : (
                <ul className="flex flex-col">
                  {revisados.map((a) => (
                    <li
                      key={a.id}
                      className="flex flex-wrap items-center gap-2 border-b border-border py-3 last:border-b-0"
                    >
                      <Badge
                        variant={a.status === "aprovado" ? "sucesso" : "destrutivo"}
                      >
                        {a.status === "aprovado" ? "Aprovado" : "Rejeitado"}
                      </Badge>
                      <Badge variant="secondary">Semana {a.semana_numero}</Badge>
                      <span className="text-sm font-medium">
                        {a.perfis?.nome ?? a.perfis?.email ?? "Aluno(a)"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {a.nome_arquivo ?? "Arquivo"} · {formatarQuando(a.created_at)}
                      </span>
                      {a.comentario_admin && (
                        <span className={cn("w-full text-xs text-muted-foreground")}>
                          Comentário: {a.comentario_admin}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {erroAcao && (
        <p className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {erroAcao}
        </p>
      )}
    </div>
  );
}