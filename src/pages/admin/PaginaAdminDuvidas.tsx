import { AlertCircle, CheckCircle2, HelpCircle, Loader2, Lock, MessageSquare, Send } from "lucide-react";
import { useEffect, useState } from "react";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  fecharDuvida,
  listarDuvidasAdmin,
  responderDuvida,
  ROTULO_CATEGORIA,
} from "@/lib/duvidas";
import type { Duvida, StatusDuvida } from "@/lib/types";
import { cn, formatarQuando } from "@/lib/utils";

type Filtro = StatusDuvida | "todas";

export function PaginaAdminDuvidas() {
  const [filtro, setFiltro] = useState<Filtro>("aberta");
  const [duvidas, setDuvidas] = useState<Duvida[] | null>(null);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState<string | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    setErro(false);
    setDuvidas(null);
    async function carregar() {
      try {
        const lista = await listarDuvidasAdmin(filtro);
        if (!ativo) return;
        setDuvidas(lista);
      } catch {
        if (ativo) setErro(true);
      }
    }
    void carregar();
    return () => {
      ativo = false;
    };
  }, [filtro, tentativa]);

  async function responder(duvida: Duvida) {
    const texto = (respostas[duvida.id] ?? "").trim();
    if (!texto) return;
    setSalvando(duvida.id);
    setErroAcao(null);
    try {
      await responderDuvida(duvida.id, texto);
      const lista = await listarDuvidasAdmin(filtro);
      setDuvidas(lista);
    } catch (e) {
      setErroAcao(e instanceof Error ? e.message : "Não foi possível responder.");
    } finally {
      setSalvando(null);
    }
  }

  async function fechar(duvida: Duvida) {
    setSalvando(duvida.id);
    setErroAcao(null);
    try {
      await fecharDuvida(duvida.id);
      const lista = await listarDuvidasAdmin(filtro);
      setDuvidas(lista);
    } catch (e) {
      setErroAcao(e instanceof Error ? e.message : "Não foi possível fechar.");
    } finally {
      setSalvando(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <HelpCircle className="h-5 w-5 text-primary" />
            Central de dúvidas
          </h2>
          <p className="text-sm text-muted-foreground">
            Dúvidas mais antigas sem resposta aparecem primeiro.
          </p>
        </div>
        <Select value={filtro} onValueChange={(v) => setFiltro(v as Filtro)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="aberta">Abertas</SelectItem>
            <SelectItem value="respondida">Respondidas</SelectItem>
            <SelectItem value="fechada">Fechadas</SelectItem>
            <SelectItem value="todas">Todas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {erro ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-10 text-center">
          <AlertCircle className="h-6 w-6 text-destructive" />
          <p className="text-sm text-foreground/90">
            Não foi possível carregar as dúvidas. Verifique sua conexão e tente novamente.
          </p>
          <Button variant="outline" onClick={() => setTentativa((t) => t + 1)}>
            Tentar novamente
          </Button>
        </div>
      ) : duvidas === null ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : duvidas.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma dúvida {filtro === "todas" ? "" : filtro === "aberta" ? "aberta" : filtro} por aqui.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4 text-primary" />
              {duvidas.length} {duvidas.length === 1 ? "dúvida" : "dúvidas"}
            </CardTitle>
            <CardDescription>
              {filtro === "aberta"
                ? "Responda para atualizar o status e avisar o aluno no painel dele."
                : "Alterar o filtro acima para revisar outros status."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col">
              {duvidas.map((d) => (
                <li key={d.id} className="flex flex-col gap-3 border-b border-border py-4 last:border-b-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        d.status === "respondida"
                          ? "sucesso"
                          : d.status === "fechada"
                            ? "outline"
                            : "pendente"
                      }
                    >
                      {d.status === "respondida"
                        ? "Respondida"
                        : d.status === "fechada"
                          ? "Fechada"
                          : "Aberta"}
                    </Badge>
                    <Badge variant="secondary">{ROTULO_CATEGORIA[d.categoria]}</Badge>
                    <span className="text-sm font-medium">
                      {d.perfis?.nome ?? d.perfis?.email ?? "Aluno(a)"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatarQuando(d.created_at)}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold leading-snug">{d.titulo}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/85">
                      {d.mensagem}
                    </p>
                  </div>

                  {d.status === "aberta" && (
                    <div className="flex flex-col gap-2 rounded-lg border border-input p-4">
                      <Textarea
                        rows={3}
                        placeholder={`Resposta para ${d.perfis?.nome ?? "o aluno"}…`}
                        value={respostas[d.id] ?? ""}
                        onChange={(e) =>
                          setRespostas((r) => ({ ...r, [d.id]: e.target.value }))
                        }
                        disabled={salvando === d.id}
                      />
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          onClick={() => void responder(d)}
                          disabled={salvando === d.id || !(respostas[d.id] ?? "").trim()}
                        >
                          {salvando === d.id ? (
                            <Loader2 className="animate-spin" />
                          ) : (
                            <Send />
                          )}
                          Responder
                        </Button>
                      </div>
                    </div>
                  )}

                  {d.status === "respondida" && d.resposta_admin && (
                    <div className="rounded-lg border border-primary/25 bg-primary/5 px-4 py-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-primary">
                        Resposta enviada{d.respondida_em ? ` · ${formatarQuando(d.respondida_em)}` : ""}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">
                        {d.resposta_admin}
                      </p>
                    </div>
                  )}

                  {d.status === "respondida" && (
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void fechar(d)}
                        disabled={salvando === d.id}
                      >
                        <Lock />
                        Fechar dúvida
                      </Button>
                    </div>
                  )}

                  {d.status === "fechada" && (
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Encerrada — o aluno não pode mais acompanhar como aberta.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {erroAcao && (
        <p className={cn("flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground")}>
          <AlertCircle className="h-4 w-4 shrink-0" />
          {erroAcao}
        </p>
      )}
    </div>
  );
}