import { AlertCircle, Check, Loader2, Video, X } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SEMANA_POR_NUMERO } from "@/lib/conteudo";
import { supabase } from "@/lib/supabase";
import type { AulaSemana } from "@/lib/types";

interface LinhaAula extends AulaSemana {
  temVideo: boolean;
}

function extrairVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/
  );
  return match ? match[1] : null;
}

export function PaginaAdminAulas() {
  const [aulas, setAulas] = useState<LinhaAula[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvos, setSalvos] = useState<number[]>([]);
  const [salvando, setSalvando] = useState<number | null>(null);

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const { data, error } = await supabase
        .from("aulas_semana")
        .select("*")
        .order("semana");
      if (error) throw error;
      setAulas(
        ((data as AulaSemana[] | null) ?? []).map((a) => ({
          ...a,
          temVideo: Boolean(a.video_url && extrairVideoId(a.video_url)),
        }))
      );
    } catch (err) {
      setErro(
        err instanceof Error
          ? err.message
          : "Não foi possível carregar as aulas. Tente novamente."
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void carregar();
  }, []);

  function atualizar(semana: number, campo: "titulo" | "video_url" | "duracao_minutos", valor: string) {
    setAulas((lista) =>
      lista.map((a) =>
        a.semana === semana
          ? {
              ...a,
              [campo]:
                campo === "duracao_minutos" ? (valor === "" ? null : Number(valor)) : valor,
              temVideo: Boolean(
                (campo === "video_url" ? valor : a.video_url) &&
                  extrairVideoId(campo === "video_url" ? valor : a.video_url ?? "")
              ),
            }
          : a
      )
    );
  }

  async function salvar(aula: LinhaAula) {
    setSalvando(aula.semana);
    setErro(null);
    try {
      const { error } = await supabase
        .from("aulas_semana")
        .update({
          titulo: aula.titulo || null,
          video_url: aula.video_url?.trim() || null,
          duracao_minutos: aula.duracao_minutos,
        })
        .eq("semana", aula.semana);
      if (error) throw error;
      setSalvos((s) => [...s, aula.semana]);
      setTimeout(() => setSalvos((s) => s.filter((n) => n !== aula.semana)), 2000);
    } catch (err) {
      setErro(
        err instanceof Error
          ? err.message
          : "Não foi possível salvar a aula. Verifique se você é administrador."
      );
    } finally {
      setSalvando(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Video className="h-4 w-4 text-primary" />
            Vídeo-aulas das 12 semanas
          </CardTitle>
          <CardDescription>
            Cole o link do YouTube (ex.: https://youtu.be/XXXXXXXXXXX) para cada aula. Enquanto
            o link estiver vazio, o aluno vê "Aula em breve" naquela semana.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {erro && (
            <p className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {erro}
            </p>
          )}

          {carregando ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando aulas…
            </div>
          ) : (
            aulas.map((aula) => {
              const conteudo = SEMANA_POR_NUMERO.get(aula.semana);
              return (
                <div
                  key={aula.semana}
                  className="grid grid-cols-1 gap-3 rounded-lg border border-border p-3 sm:grid-cols-[3rem_1fr_1fr_5.5rem_auto] sm:items-end"
                >
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">Semana</Label>
                    <div className="flex h-9 items-center text-sm font-semibold">
                      {String(aula.semana).padStart(2, "0")}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">Título</Label>
                    <Input
                      value={aula.titulo ?? ""}
                      onChange={(e) => atualizar(aula.semana, "titulo", e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">Link do YouTube</Label>
                    <Input
                      value={aula.video_url ?? ""}
                      onChange={(e) => atualizar(aula.semana, "video_url", e.target.value)}
                      placeholder="https://youtu.be/XXXXXXXXXXX"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">Duração (min)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={aula.duracao_minutos ?? ""}
                      onChange={(e) =>
                        atualizar(aula.semana, "duracao_minutos", e.target.value)
                      }
                      placeholder="0"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    {aula.temVideo ? (
                      <Badge variant="sucesso">Publicada</Badge>
                    ) : (
                      <Badge variant="outline">Aula em breve</Badge>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant={salvos.includes(aula.semana) ? "outline" : "default"}
                      disabled={salvando === aula.semana}
                      onClick={() => void salvar(aula)}
                    >
                      {salvando === aula.semana ? (
                        <Loader2 className="animate-spin" />
                      ) : salvos.includes(aula.semana) ? (
                        <Check />
                      ) : (
                        <X className="hidden" />
                      )}
                      {salvando === aula.semana
                        ? "Salvando…"
                        : salvos.includes(aula.semana)
                          ? "Salvo"
                          : "Salvar"}
                    </Button>
                  </div>
                  {conteudo && (
                    <p className="col-span-full -mt-1 text-xs text-muted-foreground">
                      {conteudo.titulo}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
