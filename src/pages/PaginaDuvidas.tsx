import { AlertCircle, HelpCircle, Loader2, MessageSquare, Send } from "lucide-react";
import { useEffect, useState } from "react";

import { Layout } from "@/components/Layout";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CATEGORIAS_DUVIDA,
  criarDuvida,
  listarMinhasDuvidas,
  ROTULO_CATEGORIA,
} from "@/lib/duvidas";
import type { CategoriaDuvida, Duvida } from "@/lib/types";
import { cn, formatarQuando } from "@/lib/utils";

export function PaginaDuvidas({ userId }: { userId: string }) {
  const [duvidas, setDuvidas] = useState<Duvida[] | null>(null);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  const [categoria, setCategoria] = useState<CategoriaDuvida>("plataforma");
  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [enviada, setEnviada] = useState(false);

  useEffect(() => {
    let ativo = true;
    setErro(false);
    setDuvidas(null);
    async function carregar() {
      try {
        const lista = await listarMinhasDuvidas(userId);
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
  }, [userId, tentativa]);

  async function enviar() {
    if (titulo.trim() === "" || mensagem.trim() === "") {
      setErroEnvio("Preencha título e mensagem para enviar.");
      return;
    }
    setErroEnvio(null);
    setEnviando(true);
    try {
      await criarDuvida({ categoria, titulo, mensagem });
      setTitulo("");
      setMensagem("");
      setEnviada(true);
      const lista = await listarMinhasDuvidas(userId);
      setDuvidas(lista);
    } catch (e) {
      setErroEnvio(e instanceof Error ? e.message : "Não foi possível enviar.");
    } finally {
      setEnviando(false);
    }
  }

  const respondidas = (duvidas ?? []).filter((d) => d.status === "respondida").length;

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
            <HelpCircle className="h-7 w-7 text-primary" />
            Central de Dúvidas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Envie sua dúvida — o Tiago responde por aqui. Você é avisado no seu painel
            quando chegar resposta.
          </p>
        </div>

        {erro ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-10 text-center">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <p className="text-sm text-foreground/90">
              Não foi possível carregar suas dúvidas. Verifique sua conexão e tente novamente.
            </p>
            <Button variant="outline" onClick={() => setTentativa((t) => t + 1)}>
              Tentar novamente
            </Button>
          </div>
        ) : duvidas === null ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Send className="h-4 w-4 text-primary" />
                  Nova dúvida
                </CardTitle>
                <CardDescription>
                  Conte o que está travando no seu negócio ou na plataforma.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="categoria">Categoria</Label>
                    <Select value={categoria} onValueChange={(v) => setCategoria(v as CategoriaDuvida)}>
                      <SelectTrigger id="categoria">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIAS_DUVIDA.map((c) => (
                          <SelectItem key={c.valor} value={c.valor}>
                            {c.rotulo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2 sm:col-span-2">
                    <Label htmlFor="titulo">Título</Label>
                    <Input
                      id="titulo"
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      placeholder="Resumo da sua dúvida"
                      maxLength={120}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="mensagem">Mensagem</Label>
                  <Textarea
                    id="mensagem"
                    value={mensagem}
                    onChange={(e) => setMensagem(e.target.value)}
                    rows={5}
                    placeholder="Descreva sua dúvida com o máximo de contexto que conseguir…"
                  />
                </div>
                {erroEnvio && (
                  <p className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {erroEnvio}
                  </p>
                )}
                {enviada && !erroEnvio && (
                  <p className="flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
                    <Send className="h-4 w-4 shrink-0" />
                    Dúvida enviada! Você verá a resposta aqui assim que o Tiago responder.
                  </p>
                )}
                <div className="flex justify-end">
                  <Button
                    onClick={() => void enviar()}
                    disabled={enviando || titulo.trim() === "" || mensagem.trim() === ""}
                  >
                    {enviando ? <Loader2 className="animate-spin" /> : <Send />}
                    Enviar dúvida
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  Minhas dúvidas
                </CardTitle>
                <CardDescription>
                  {duvidas.length === 0
                    ? "Você ainda não enviou nenhuma dúvida."
                    : `${duvidas.length} ${duvidas.length === 1 ? "dúvida" : "dúvidas"} · ${respondidas} respondida${respondidas === 1 ? "" : "s"}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {duvidas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma dúvida ainda. Use o formulário acima para começar.
                  </p>
                ) : (
                  <ul className="flex flex-col">
                    {duvidas.map((d) => (
                      <li
                        key={d.id}
                        className="flex flex-col gap-3 border-b border-border py-4 last:border-b-0"
                      >
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
                        {d.status === "respondida" && d.resposta_admin && (
                          <div
                            className={cn(
                              "rounded-lg border border-primary/25 bg-primary/5 px-4 py-3"
                            )}
                          >
                            <p className="text-xs font-medium uppercase tracking-wide text-primary">
                              Resposta do Tiago
                              {d.respondida_em
                                ? ` · ${formatarQuando(d.respondida_em)}`
                                : ""}
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">
                              {d.resposta_admin}
                            </p>
                          </div>
                        )}
                        {d.status === "fechada" && d.resposta_admin && (
                          <p className="text-xs text-muted-foreground">
                            Encerrada após a resposta.
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}