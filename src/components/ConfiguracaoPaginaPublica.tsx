import { AlertCircle, CheckCircle2, Globe, Loader2, RefreshCcw, Save } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { slugificar } from "@/lib/slug";
import { supabase } from "@/lib/supabase";
import type { Perfil } from "@/lib/types";

function erroEhSlugDuplicado(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null;
  return e?.code === "23505" || (e?.message ?? "").includes("duplicate key");
}

export function ConfiguracaoPaginaPublica({ userId }: { userId: string }) {
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erroMsg, setErroMsg] = useState<string | null>(null);

  const [ativa, setAtiva] = useState(false);
  const [mostrarFaturamento, setMostrarFaturamento] = useState(false);
  const [slug, setSlug] = useState("");
  const [nomeEmpresa, setNomeEmpresa] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      const [resPerfil, resEmpresa] = await Promise.all([
        supabase
          .from("perfis")
          .select("pagina_publica_ativa, pagina_publica_slug, pagina_publica_mostrar_faturamento")
          .eq("id", userId)
          .maybeSingle(),
        supabase
          .from("diagnostico_inicial")
          .select("nome_empresa")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (!ativo) return;
      if (!resPerfil.error && resPerfil.data) {
        const p = resPerfil.data as Partial<Perfil>;
        setAtiva(Boolean(p.pagina_publica_ativa));
        setMostrarFaturamento(Boolean(p.pagina_publica_mostrar_faturamento));
        setSlug(p.pagina_publica_slug ?? "");
      }
      if (!resEmpresa.error && resEmpresa.data) {
        setNomeEmpresa((resEmpresa.data as { nome_empresa: string | null }).nome_empresa);
      }
      setCarregando(false);
    }
    void carregar();
    return () => {
      ativo = false;
    };
  }, [userId]);

  function gerarSlugAutomatico() {
    const base = slugificar(nomeEmpresa) || slugificar("minha-empresa");
    setSlug(base);
    setSalvo(false);
    setErroMsg(null);
  }

  async function salvar() {
    const slugBase = slugificar(slug) || slugificar(nomeEmpresa) || "minha-empresa";
    setSalvando(true);
    setSalvo(false);
    setErroMsg(null);

    try {
      // Slug duplicado: busca em UMA query todos os slugs existentes que
      // começam com a base e resolve em memória o próximo sufixo livre
      // (-2, -3, …). Nunca sobrescreve a página de outro aluno.
      const { data: existentes, error: erroBusca } = await supabase
        .from("perfis")
        .select("pagina_publica_slug")
        .like("pagina_publica_slug", `${slugBase}%`)
        .neq("id", userId);

      if (erroBusca) throw erroBusca;

      const ocupados = new Set(
        ((existentes ?? []) as { pagina_publica_slug: string | null }[])
          .map((p) => p.pagina_publica_slug)
          .filter((s): s is string => s !== null)
      );

      let candidato = slugBase;
      if (ocupados.has(slugBase)) {
        for (let sufixo = 2; sufixo <= 50; sufixo++) {
          const tentativa = `${slugBase}-${sufixo}`;
          if (!ocupados.has(tentativa)) {
            candidato = tentativa;
            break;
          }
        }
        if (candidato === slugBase) {
          setErroMsg(
            "Este endereço já está em uso por outro aluno. Escolha outro nome para a sua página."
          );
          setSalvando(false);
          return;
        }
      }

      const { error } = await supabase
        .from("perfis")
        .update({
          pagina_publica_ativa: ativa,
          pagina_publica_mostrar_faturamento: mostrarFaturamento,
          pagina_publica_slug: candidato,
        })
        .eq("id", userId);

      if (error) {
        // Sobra apenas o caso raro de corrida (outro aluno pegou o slug
        // entre a leitura e o UPDATE) — a unique constraint protege.
        setErroMsg(
          erroEhSlugDuplicado(error)
            ? "Este endereço já está em uso por outro aluno. Escolha outro nome para a sua página."
            : "Não foi possível salvar sua página pública. Verifique sua conexão e tente novamente."
        );
        setSalvando(false);
        return;
      }

      setSlug(candidato);
      setSalvo(true);
      setSalvando(false);
    } catch {
      setErroMsg(
        "Não foi possível salvar sua página pública. Verifique sua conexão e tente novamente."
      );
      setSalvando(false);
    }
  }

  const urlPagina =
    slug.length > 0
      ? `${window.location.origin}/empresa/${slugificar(slug)}`
      : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4 text-primary" />
            Página pública da sua empresa
          </CardTitle>
          {ativa && <Badge variant="sucesso">Ativa</Badge>}
        </div>
        <CardDescription>
          Uma vitrine com o nome da sua empresa, a classificação do IME e a evolução da
          jornada — perfeita para compartilhar com clientes e no Instagram. Nada fica
          público sem você ativar.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {carregando ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <label className="flex cursor-pointer items-start gap-3">
              <Checkbox
                checked={ativa}
                onCheckedChange={(v) => {
                  setAtiva(Boolean(v));
                  setSalvo(false);
                }}
                className="mt-0.5"
              />
              <span>
                <span className="text-sm font-medium">Ativar minha página pública</span>
                <span className="block text-xs text-muted-foreground">
                  Ao ativar, o endereço abaixo passa a mostrar a sua evolução para quem
                  acessar.
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3">
              <Checkbox
                checked={mostrarFaturamento}
                onCheckedChange={(v) => {
                  setMostrarFaturamento(Boolean(v));
                  setSalvo(false);
                }}
                className="mt-0.5"
              />
              <span>
                <span className="text-sm font-medium">Mostrar meu faturamento na página</span>
                <span className="block text-xs text-muted-foreground">
                  Você pode ter página pública sem expor o valor exato do faturamento. Se
                  ativar e o valor for autodeclarado, ele aparece com o selo “faturamento
                  autodeclarado”.
                </span>
              </span>
            </label>

            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="flex flex-1 flex-col gap-2">
                  <Label htmlFor="slug_pagina">Endereço da página</Label>
                  <div className="flex gap-2">
                    <Input
                      id="slug_pagina"
                      value={slug}
                      placeholder="minha-empresa"
                      disabled={salvando}
                      onChange={(e) => {
                        setSlug(e.target.value);
                        setSalvo(false);
                        setErroMsg(null);
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      title="Gerar a partir do nome da empresa"
                      onClick={gerarSlugAutomatico}
                    >
                      <RefreshCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Button
                  onClick={() => void salvar()}
                  disabled={salvando}
                  className="h-11"
                >
                  {salvando ? <Loader2 className="animate-spin" /> : <Save />}
                  Salvar
                </Button>
              </div>
              {urlPagina && (
                <p className="text-xs text-muted-foreground">
                  Sua página ficará em:{" "}
                  <span className="font-medium text-primary">{urlPagina}</span>
                </p>
              )}
            </div>

            {salvo && (
              <p className="flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Configurações salvas.
                {ativa && urlPagina ? " Sua página já está no ar." : ""}
              </p>
            )}

            {erroMsg && (
              <p className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {erroMsg}
              </p>
            )}

            <p className="text-xs leading-relaxed text-muted-foreground">
              Se o endereço escolhido já estiver em uso por outro aluno, um número é
              acrescentado automaticamente (ex: “minha-empresa-2”). O card de
              compartilhamento usa “Anônimo” enquanto a página pública estiver desativada.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}