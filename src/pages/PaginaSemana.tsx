import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  FileUp,
  Heart,
  Info,
  Loader2,
  Lock,
  RefreshCw,
  Rocket,
  Sparkles,
  Target,
  Upload,
  Video,
  X,
  Zap,
} from "lucide-react";

import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { CartaoCarregando } from "@/components/CartaoCarregando";
import { CartaoErro } from "@/components/CartaoErro";
import { ListaItensComSoma } from "@/components/ListaItensComSoma";
import { SemanaIndisponivel } from "@/components/SemanaIndisponivel";
import { Layout } from "@/components/Layout";
import { CelebracaoMelhoria, type MensagemCelebracao } from "@/components/CelebracaoMelhoria";
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
import { Textarea } from "@/components/ui/textarea";
import { useEhAdmin } from "@/hooks/useEhAdmin";
import {
  anexoEsperadoDaSemana,
  enviarAnexo,
  listarMeusAnexos,
} from "@/lib/anexos-missoes";
import { MODULOS, SEMANA_POR_NUMERO, type Campo, type ItemLista, type SemanaConteudo } from "@/lib/conteudo";
import { buscarDicaSemana, gerarDicaSemana } from "@/lib/dicas-semana";
import {
  DIRECAO_INDICADORES_SEMANA,
  melhoraCom,
  textoMelhoria,
} from "@/lib/direcaoIndicadores";
import {
  carregarMotivoPessoal,
  motivoJaExibido,
  registrarMotivoExibido,
  textoMotivo,
} from "@/lib/motivo";
import { supabase } from "@/lib/supabase";
import type {
  AulaSemana,
  DicaPreenchimentoSemana,
  IndicadorSemana,
  MissaoAnexo,
  ProgressoSemana,
} from "@/lib/types";
import { cn, extrairVideoId } from "@/lib/utils";

export function PaginaSemana({ userId }: { userId: string }) {
  const { numero } = useParams();
  const n = Number(numero);
  const semana = SEMANA_POR_NUMERO.get(n);
  const { ehAdmin, carregando: checandoAdmin } = useEhAdmin();

  const [progresso, setProgresso] = useState<ProgressoSemana | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [naoEncontrada, setNaoEncontrada] = useState(false);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro(false);
    async function carregar() {
      const { data, error } = await supabase
        .from("progresso_semanas")
        .select("*")
        .eq("user_id", userId)
        .eq("semana", n)
        .maybeSingle();
      if (!ativo) return;
      if (error) {
        setErro(true);
        setCarregando(false);
        return;
      }
      if (!data) setNaoEncontrada(true);
      else setProgresso(data);
      setCarregando(false);
    }
    void carregar();
    return () => {
      ativo = false;
    };
  }, [userId, n, tentativa]);

  if (!semana) {
    return (
      <Layout>
        <SemanaIndisponivel
          titulo="Semana não encontrada"
          descricao="Esta semana não existe na sua jornada."
        />
      </Layout>
    );
  }
  if (carregando || checandoAdmin) {
    return (
      <Layout>
        <CartaoCarregando />
      </Layout>
    );
  }
  if (erro) {
    return (
      <Layout>
        <CartaoErro
          mensagem="Não foi possível carregar seus dados agora. Verifique sua conexão e tente novamente."
          onTentar={() => setTentativa((t) => t + 1)}
        />
      </Layout>
    );
  }
  // Admin tem acesso de visualização a todas as semanas, mesmo sem ter
  // desbloqueado — mas sem concluir nem simular progresso.
  const visualizacao = ehAdmin && (!progresso || progresso.status === "bloqueada");
  if (!visualizacao) {
    if (naoEncontrada || progresso?.status === "bloqueada") {
      return (
        <Layout>
          <SemanaIndisponivel
            titulo="Semana ainda não disponível"
            descricao="Conclua as semanas anteriores na ordem para desbloquear esta."
          />
        </Layout>
      );
    }
  }
  const progressoEfetivo =
    progresso ??
    ({
      id: "",
      user_id: userId,
      semana: n,
      status: "em_andamento",
      respostas: {},
      concluida_em: null,
    } satisfies ProgressoSemana);

  return (
    <ConteudoSemana
      semana={semana}
      progresso={progressoEfetivo}
      visualizacao={visualizacao}
      userId={userId}
      aoConcluirLocalmente={() =>
        setProgresso((p) =>
          p ? { ...p, status: "concluida", concluida_em: new Date().toISOString() } : p
        )
      }
    />
  );
}

function ConteudoSemana({
  semana,
  progresso,
  userId,
  visualizacao,
  aoConcluirLocalmente,
}: {
  semana: SemanaConteudo;
  progresso: ProgressoSemana;
  userId: string;
  visualizacao?: boolean;
  aoConcluirLocalmente: () => void;
}) {
  const [respostas, setRespostas] = useState<Record<string, unknown>>(
    progresso.respostas ?? {}
  );
  const [missoes, setMissoes] = useState<Record<string, boolean>>({});
  const [indicador, setIndicador] = useState<{ antes: string; depois: string } | null>(null);
  const [checklistFinal, setChecklistFinal] = useState(false);
  const [salvoEm, setSalvoEm] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [concluindo, setConcluindo] = useState(false);
  const [concluida, setConcluida] = useState(progresso.status === "concluida");
  const [celebracao, setCelebracao] = useState<MensagemCelebracao | null>(null);
  const [bannerMotivo, setBannerMotivo] = useState<string | null>(null);
  const [mostrarMigracao, setMostrarMigracao] = useState(
    semana.numero === 1 && temFormatoAntigoS1(progresso.respostas ?? {})
  );

  // Banner "Lembra por que você começou?" — 1x por módulo (semanas 1, 5, 9).
  useEffect(() => {
    if (
      visualizacao ||
      (semana.numero !== 1 && semana.numero !== 5 && semana.numero !== 9)
    ) {
      return;
    }
    let ativo = true;
    const contexto = `inicio_modulo_${(semana.numero - 1) / 4 + 1}`;
    async function carregarBanner() {
      const [motivo, jaVisto] = await Promise.all([
        carregarMotivoPessoal(userId),
        motivoJaExibido(userId, contexto),
      ]);
      if (!ativo) return;
      const texto = textoMotivo(motivo);
      if (!texto || jaVisto) return;
      setBannerMotivo(texto);
      void registrarMotivoExibido(userId, contexto);
    }
    void carregarBanner();
    return () => {
      ativo = false;
    };
  }, [userId, semana.numero, visualizacao]);

  useEffect(() => {
    let ativo = true;
    async function carregarDados() {
      const [resMissoes, resIndicador] = await Promise.all([
        supabase.from("missoes").select("*").eq("user_id", userId).eq("semana", semana.numero),
        supabase
          .from("indicadores_semana")
          .select("*")
          .eq("user_id", userId)
          .eq("semana", semana.numero)
          .eq("nome_indicador", semana.indicador?.nome ?? "")
          .maybeSingle(),
      ]);
      if (!ativo) return;
      if (resMissoes.data) {
        const mapa: Record<string, boolean> = {};
        for (const m of resMissoes.data) mapa[`${m.tipo}:${m.indice}`] = m.concluida;
        setMissoes(mapa);
      }
      const ind = resIndicador.data as IndicadorSemana | null;
      if (ind) {
        setIndicador({
          antes: ind.valor_antes?.toString() ?? "",
          depois: ind.valor_depois?.toString() ?? "",
        });
      }
    }
    void carregarDados();
    return () => {
      ativo = false;
    };
  }, [userId, semana.numero, semana.indicador?.nome]);

  const calculados = useMemo(
    () => calcularValores(semana.numero, respostas),
    [semana.numero, respostas]
  );

  const salvar = useCallback(
    async (novasRespostas: Record<string, unknown>) => {
      if (visualizacao) return;
      setSalvando(true);
      const { error } = await supabase
        .from("progresso_semanas")
        .upsert(
          { user_id: userId, semana: semana.numero, respostas: novasRespostas },
          { onConflict: "user_id,semana" }
        );
      setSalvando(false);
      if (error) {
        setErro("Não foi possível salvar. Verifique sua conexão.");
      } else {
        setErro(null);
        setSalvoEm(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
      }
    },
    [userId, semana.numero, visualizacao]
  );

  const jaCarregou = useRef(false);

  useEffect(() => {
    if (!jaCarregou.current) {
      jaCarregou.current = true;
      return;
    }
    const timer = setTimeout(() => {
      const comCalculados = { ...respostas, ...calculados };
      void salvar(comCalculados);
    }, 700);
    return () => clearTimeout(timer);
  }, [respostas, calculados, salvar]);

  function setCampo(id: string, valor: unknown) {
    setRespostas((r) => ({ ...r, [id]: valor }));
  }

  async function alternarMissao(tipo: "principal" | "rapida", indice: number) {
    if (visualizacao) return;
    const missao = semana.missoes[indice];
    if (!missao || missao.tipo !== tipo) return;
    const chave = `${tipo}:${indice}`;
    if (missoes[chave]) return;
    const novo = true;
    setMissoes((m) => ({ ...m, [chave]: novo }));
    const { error } = await supabase
      .from("missoes")
      .upsert(
        {
          user_id: userId,
          semana: semana.numero,
          tipo,
          indice,
          descricao: missao.descricao,
          concluida: novo,
          concluida_em: novo ? new Date().toISOString() : null,
        },
        { onConflict: "user_id,semana,tipo,indice" }
      );
    if (error) setErro("Não foi possível salvar a missão.");
  }

  async function atualizarIndicador(campo: "antes" | "depois", valor: string) {
    const novo = { ...(indicador ?? { antes: "", depois: "" }), [campo]: valor };
    setIndicador(novo);
    if (!semana.indicador || visualizacao) return;
    const { error } = await supabase
      .from("indicadores_semana")
      .upsert(
        {
          user_id: userId,
          semana: semana.numero,
          nome_indicador: semana.indicador.nome,
          unidade: semana.indicador.unidade,
          valor_antes: novo.antes === "" ? null : Number(novo.antes),
          valor_depois: novo.depois === "" ? null : Number(novo.depois),
          origem: "manual",
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: "user_id,semana,nome_indicador" }
      );
    if (error) {
      setErro("Não foi possível salvar o indicador.");
      return;
    }
    if (campo === "depois" && novo.antes !== "" && novo.depois !== "") {
      const antes = Number(novo.antes);
      const depois = Number(novo.depois);
      const direcao = DIRECAO_INDICADORES_SEMANA[semana.numero];
      if (direcao && Number.isFinite(antes) && Number.isFinite(depois) && melhoraCom(antes, depois, direcao)) {
        setCelebracao({
          id: `indicador-${semana.numero}-${depois}-${Date.now()}`,
          titulo: "Melhoria registrada",
          texto: textoMelhoria({
            chave: `indicador-${semana.numero}`,
            rotulo: semana.indicador.nome,
            antes,
            depois,
            direcao,
            unidade: semana.indicador.unidade,
          }),
        });
      }
    }
  }

  async function concluirSemana() {
    if (visualizacao) return;
    const validacao = validarCampos(semana, respostas, calculados, checklistFinal);
    if (validacao) {
      setErro(validacao);
      return;
    }
    setErro(null);
    setConcluindo(true);
    try {
      const agora = new Date().toISOString();
      const comCalculados = { ...respostas, ...calculados };
      const { error: erroSemana } = await supabase
        .from("progresso_semanas")
        .upsert(
          {
            user_id: userId,
            semana: semana.numero,
            status: "concluida",
            concluida_em: agora,
            respostas: comCalculados,
          },
          { onConflict: "user_id,semana" }
        );
      if (erroSemana) throw erroSemana;

      if (semana.numero < 12) {
        const { error: erroProxima } = await supabase
          .from("progresso_semanas")
          .update({ status: "em_andamento" })
          .eq("user_id", userId)
          .eq("semana", semana.numero + 1);
        if (erroProxima) throw erroProxima;
      }

      if (semana.painelAoTerminar) {
        const painel = semana.painelAoTerminar;
        const { data: existente } = await supabase
          .from("paineis_mensais")
          .select("id")
          .eq("user_id", userId)
          .eq("numero_painel", painel)
          .maybeSingle();
        if (!existente) {
          const { error: erroPainel } = await supabase
            .from("paineis_mensais")
            .insert({ user_id: userId, numero_painel: painel });
          if (erroPainel) throw erroPainel;
        }
      }

      setConcluida(true);
      aoConcluirLocalmente();
    } catch {
      setErro("Não foi possível concluir a semana. Tente novamente.");
      setConcluindo(false);
    }
  }

  const decisaoItens = semana.checklistDecisao?.itens ?? [];

  const modulo = MODULOS.find((m) => m.numero === semana.modulo)!;

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <CabecalhoPagina
          voltarPara="/dashboard"
          textoVoltar="Painel de semanas"
          badges={
            <>
              <Badge variant="outline" className="text-primary">
                Semana {semana.numero}
              </Badge>
              <Badge variant="secondary">
                Módulo {semana.modulo} — {modulo.titulo}
              </Badge>
              {concluida && <Badge variant="sucesso">Concluída</Badge>}
            </>
          }
          titulo={semana.titulo}
          descricao={
            <>
              <p className="mt-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Corresponde à Aula {semana.numero} do curso
              </p>
              <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
                <Target className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Objetivo: {semana.objetivo}
              </p>
            </>
          }
        />

        {bannerMotivo && (
          <div className="flex items-start gap-3 rounded-xl border border-primary/50 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Heart className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-primary">Lembra por que você começou?</p>
              <p className="mt-1 text-sm leading-relaxed text-foreground/90">
                Você disse: <span className="font-medium">{bannerMotivo}</span>
              </p>
            </div>
            <button
              type="button"
              aria-label="Fechar"
              onClick={() => setBannerMotivo(null)}
              className="-mr-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <BlocoAula semana={semana.numero} />

        {visualizacao && (
          <p className="flex items-start gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-primary">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            Modo visualização (admin): você pode conferir esta semana livremente, mas nada é salvo
            nem concluído — seu progresso real continua intacto.
          </p>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nesta semana</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {semana.explicacao.map((paragrafo, i) => (
              <p key={i} className="text-sm leading-relaxed text-foreground/90">
                {paragrafo}
              </p>
            ))}
          </CardContent>
        </Card>

        {semana.dicas.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Info className="h-4 w-4 text-primary" />
                Dicas de preenchimento
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {semana.dicas.map((dica) => (
                <div
                  key={dica.titulo}
                  className="rounded-lg border border-primary/25 bg-primary/5 p-4"
                >
                  <p className="text-sm font-semibold text-primary">{dica.titulo}</p>
                  <p className="mt-1 text-sm text-foreground/90">{dica.texto}</p>
                  {dica.exemplo && (
                    <p className="mt-2 border-l-2 border-primary/40 pl-3 text-sm italic text-muted-foreground">
                      {dica.exemplo}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <BlocoDicaSemana semana={semana} userId={userId} visualizacao={visualizacao} />

        {mostrarMigracao && !visualizacao && (
          <div className="flex flex-col gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <p className="flex-1 text-sm leading-relaxed text-foreground/90">
                Você preencheu esta semana no formato antigo. Pode continuar usando os valores
                calculados, ou refazer no novo formato de lista abaixo.
              </p>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setMostrarMigracao(false)}
                className="-mr-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setRespostas((r) => migrarFormatoAntigoS1(r));
                  setMostrarMigracao(false);
                }}
              >
                Migrar meus valores para as listas
              </Button>
              <span className="text-xs text-muted-foreground">
                Cria um item "Valor anterior" com o número que você já tinha salvo — depois você
                pode editar.
              </span>
            </div>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preenchimento</CardTitle>
            <CardDescription>Suas respostas são salvas automaticamente.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {semana.rotuloSeccao && (
              <p className="text-sm font-medium text-foreground/90">{semana.rotuloSeccao}</p>
            )}
            {agruparCampos(semana.campos).map((grupo, i) => (
              <GrupoCampos
                key={`${grupo.caixa ?? grupo.lado ?? "campo"}-${i}`}
                grupo={grupo}
                respostas={respostas}
                calculados={calculados}
                aoMudar={setCampo}
              />
            ))}
            {semana.nota && (
              <p className="rounded-lg border border-primary/25 bg-primary/5 p-4 text-sm text-foreground/90">
                {semana.nota}
              </p>
            )}
            <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
              {visualizacao
                ? "Modo visualização — nada é salvo"
                : salvando
                  ? "Salvando…"
                  : salvoEm
                    ? `Salvo às ${salvoEm}`
                    : "Tudo salvo"}
            </div>
          </CardContent>
        </Card>

        {semana.missoes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Rocket className="h-4 w-4 text-primary" />
                Missões da semana
              </CardTitle>
              <CardDescription>Missões fazem a teoria virar resultado.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {semana.missoes.map((missao, indice) => {
                const chave = `${missao.tipo}:${indice}`;
                return (
                  <label
                    key={chave}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors",
                      missoes[chave]
                        ? "border-emerald-500/50 bg-emerald-500/5"
                        : "border-input hover:bg-accent"
                    )}
                  >
                    <Checkbox
                      checked={missoes[chave] ?? false}
                      onCheckedChange={() => void alternarMissao(missao.tipo, indice)}
                      className="mt-0.5"
                    />
<span className="flex flex-col gap-1">
                        <span
                          className={cn(
                            "inline-flex w-fit items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                            missao.tipo === "principal"
                              ? "bg-primary/20 text-primary"
                              : "bg-secondary text-muted-foreground"
                          )}
                        >
                          {missao.tipo === "principal" ? "Missão principal" : "Vitória rápida"}
                        </span>
                        <span className="text-sm text-foreground/90">{missao.descricao}</span>
                        {missao.paraComecando && (
                          <span className="mt-1 flex flex-col gap-1 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/30 px-3 py-2">
                            <span className="inline-flex w-fit rounded bg-muted-foreground/10 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                              Para quem está começando
                            </span>
                            <span className="text-sm text-foreground/90">
                              {missao.paraComecando}
                            </span>
                          </span>
                        )}
                      </span>
                  </label>
                );
              })}
            </CardContent>
          </Card>
        )}

        {anexoEsperadoDaSemana(semana.numero) && (
          <BlocoAnexoSemana
            userId={userId}
            semana={semana.numero}
            visualizacao={visualizacao}
          />
        )}

        {semana.camposAposMissoes && semana.camposAposMissoes.length > 0 && (
          <Card>
            <CardContent className="flex flex-col gap-5 pt-6">
              {agruparCampos(semana.camposAposMissoes).map((grupo, i) => (
                <GrupoCampos
                  key={`${grupo.caixa ?? grupo.lado ?? "campo"}-${i}`}
                  grupo={grupo}
                  respostas={respostas}
                  calculados={calculados}
                  aoMudar={setCampo}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {semana.indicador && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-4 w-4 text-primary" />
                Indicador da semana
              </CardTitle>
              <CardDescription>
                {semana.indicador.nome} ({semana.indicador.unidade})
                {semana.indicador.dica ? ` — ${semana.indicador.dica}` : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="ind_antes">Antes</Label>
                  <Input
                    id="ind_antes"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={indicador?.antes ?? ""}
                    placeholder={semana.indicador.unidade}
                    onChange={(e) => void atualizarIndicador("antes", e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="ind_depois">Depois</Label>
                  <Input
                    id="ind_depois"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={indicador?.depois ?? ""}
                    placeholder={semana.indicador.unidade}
                    onChange={(e) => void atualizarIndicador("depois", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {semana.checklistDecisao && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Checklist de decisão</CardTitle>
              <CardDescription>
                Responda com honestidade para decidir o próximo passo do negócio.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                Marque os itens que já são verdade no seu negócio hoje.
              </p>
              {decisaoItens.map((item) => (
                <label
                  key={item.id}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-input p-4 hover:bg-accent"
                >
                  <Checkbox
                    checked={respostas[item.id] === true}
                    onCheckedChange={(v) => setCampo(item.id, v === true)}
                    className="mt-0.5"
                  />
                  <span className="text-sm text-foreground/90">{item.rotulo}</span>
                </label>
              ))}
              {semana.checklistDecisao.sugestao && (
                <p className="flex items-start gap-2 rounded-lg border border-primary/40 bg-primary/10 p-4 text-sm text-primary">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  {semana.checklistDecisao.sugestao}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Checklist de conclusão</CardTitle>
          </CardHeader>
          <CardContent>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-input p-4 hover:bg-accent">
              <Checkbox
                checked={checklistFinal}
                onCheckedChange={(v) => setChecklistFinal(v === true)}
                className="mt-0.5"
              />
              <span className="text-sm text-foreground/90">{semana.checklistFinal}</span>
            </label>
          </CardContent>
        </Card>

        {erro && (
          <p className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {erro}
          </p>
        )}

        {visualizacao ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 p-6 text-center">
            <Info className="h-8 w-8 text-primary" />
            <p className="font-semibold">Semana em modo visualização</p>
            <p className="text-sm text-muted-foreground">
              Como admin, você pode navegar por todas as semanas. Esta semana não é concluída em
              modo visualização — conclua pelo seu fluxo normal se quiser registrá-la.
            </p>
            <Button asChild variant="outline">
              <Link to="/dashboard">Voltar ao painel de semanas</Link>
            </Button>
          </div>
        ) : concluida ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            <p className="font-semibold">Semana {semana.numero} concluída!</p>
            {semana.painelAoTerminar ? (
              <Button asChild>
                <Link to={`/painel/${semana.painelAoTerminar}`}>
                  Preencher o Painel Mensal {semana.painelAoTerminar}
                </Link>
              </Button>
            ) : (
              <Button asChild>
                <Link to="/dashboard">Voltar ao painel de semanas</Link>
              </Button>
            )}
          </div>
        ) : (
          <Button onClick={() => void concluirSemana()} disabled={concluindo} className="h-11">
            {concluindo && <Loader2 className="animate-spin" />}
            Concluir semana {semana.numero}
          </Button>
        )}

        {!concluida && !visualizacao && (
          <p className="-mt-3 flex items-start gap-2 text-xs text-muted-foreground">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            A semana só é concluída quando todos os campos obrigatórios estiverem preenchidos e o
            checklist de conclusão marcado.
          </p>
        )}
      </div>
      <CelebracaoMelhoria mensagem={celebracao} aoFechar={() => setCelebracao(null)} />
    </Layout>
  );
}

interface GrupoCampos {
  lado?: string;
  caixa?: string;
  colunas: number;
  campos: Campo[];
}

function agruparCampos(campos: Campo[]): GrupoCampos[] {
  const grupos: GrupoCampos[] = [];
  for (const campo of campos) {
    const lado = "lado" in campo ? campo.lado : undefined;
    const caixa = "caixa" in campo ? campo.caixa : undefined;
    const chave = `${caixa ?? ""}|${lado ?? ""}`;
    const ultimo = grupos[grupos.length - 1];
    const colunas = "grade" in campo && campo.grade ? campo.grade : 1;
    if (chave !== "|" && ultimo && ultimo.caixa === caixa && ultimo.lado === lado) {
      ultimo.campos.push(campo);
    } else {
      grupos.push({ lado, caixa, colunas, campos: [campo] });
    }
  }
  return grupos;
}

function gradeClasse(colunas: number): string {
  if (colunas >= 4) return "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4";
  if (colunas === 3) return "grid grid-cols-1 gap-4 sm:grid-cols-3";
  if (colunas === 2) return "grid grid-cols-1 gap-4 sm:grid-cols-2";
  return "flex flex-col gap-5";
}

function GrupoCampos({
  grupo,
  respostas,
  calculados,
  aoMudar,
}: {
  grupo: GrupoCampos;
  respostas: Record<string, unknown>;
  calculados: Record<string, number>;
  aoMudar: (id: string, valor: unknown) => void;
}) {
  const conteudo = (
    <div className={gradeClasse(grupo.colunas)}>
      {grupo.campos.map((campo) => (
        <CampoForm
          key={campo.id}
          campo={campo}
          respostas={respostas}
          calculados={calculados}
          aoMudar={aoMudar}
        />
      ))}
    </div>
  );

  if (!grupo.caixa) return conteudo;

  return (
    <div className="rounded-lg border border-input p-4">
      <p className="mb-3 text-sm font-semibold text-foreground/90">{grupo.caixa}</p>
      {conteudo}
    </div>
  );
}

function CampoForm({
  campo,
  respostas,
  calculados,
  aoMudar,
}: {
  campo: Campo;
  respostas: Record<string, unknown>;
  calculados: Record<string, number>;
  aoMudar: (id: string, valor: unknown) => void;
}) {
  const obrigatorio = ("obrigatorio" in campo ? campo.obrigatorio : false) ?? false;

  function valorTexto(id: string): string {
    const v = respostas[id];
    if (typeof v === "string") return v;
    return v === null || v === undefined ? "" : String(v);
  }

  function valorNumero(id: string): string {
    const v = respostas[id];
    if (typeof v === "number") return String(v);
    return typeof v === "string" ? v : "";
  }

  if (campo.tipo === "tabela") {
    const linhas = Array.isArray(respostas[campo.id])
      ? (respostas[campo.id] as Record<string, string | number>[])
      : Array.from({ length: campo.linhasMin }, () => ({}) as Record<string, string | number>);
    return (
      <div className="flex flex-col gap-2">
        <CampoRotulo campo={campo} obrigatorio={obrigatorio} />
        <div className="flex flex-col gap-2">
          {linhas.map((linha, i) => (
            <div key={i} className="grid gap-2 rounded-lg border border-input p-3 sm:grid-cols-2">
              {campo.colunas.map((coluna) => (
                <div key={coluna.id} className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">{coluna.rotulo}</Label>
                  <Input
                    type={coluna.tipo === "numero" ? "number" : "text"}
                    inputMode={coluna.tipo === "numero" ? "decimal" : undefined}
                    step={coluna.tipo === "numero" ? "0.01" : undefined}
                    min={coluna.tipo === "numero" ? "0" : undefined}
                    value={String(linha[coluna.id] ?? "")}
                    placeholder={coluna.tipo === "numero" ? "0,00" : ""}
                    onChange={(e) => {
                      const novo = [...linhas];
                      novo[i] = { ...novo[i], [coluna.id]: e.target.value };
                      aoMudar(campo.id, novo);
                    }}
                  />
                </div>
              ))}
            </div>
          ))}
          <div className="flex gap-2">
            {linhas.length > campo.linhasMin && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => aoMudar(campo.id, linhas.slice(0, -1))}
              >
                Remover última linha
              </Button>
            )}
            {linhas.length < campo.linhasMax && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => aoMudar(campo.id, [...linhas, {} as Record<string, string | number>])}
              >
                Adicionar linha ({linhas.length}/{campo.linhasMax})
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (campo.tipo === "tabela_fixa") {
    const objeto = (respostas[campo.id] ?? {}) as Record<string, unknown>;
    return (
      <div className="flex flex-col gap-2">
        <CampoRotulo campo={campo} obrigatorio />
        <div className="overflow-hidden rounded-lg border border-input">
          {campo.linhas.map((linha, i) => (
            <div
              key={linha.id}
              className={cn("flex items-center gap-3 px-3 py-2", i % 2 === 0 ? "bg-card" : "bg-muted/40")}
            >
              <span className="flex-1 text-sm text-foreground/90">{linha.rotulo}</span>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                className="h-8 w-32 text-right"
                value={typeof objeto[linha.id] === "number" ? String(objeto[linha.id]) : ""}
                placeholder="0"
                onChange={(e) => {
                  const valor = e.target.value === "" ? null : Number(e.target.value);
                  aoMudar(campo.id, { ...objeto, [linha.id]: valor });
                }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const ehCalculado = campo.id in calculados;
  const valorCalculado = ehCalculado ? calculados[campo.id] : null;

  if (campo.tipo === "lista_itens") {
    return (
      <div className="flex flex-col gap-2">
        <CampoRotulo campo={campo} obrigatorio={obrigatorio} />
        <ListaItensComSoma
          valor={respostas[campo.id]}
          rotuloItem={campo.rotuloItem}
          rotuloValor={campo.rotuloValor}
          aoMudar={(itens) => aoMudar(campo.id, itens)}
        />
      </div>
    );
  }

  if (campo.tipo === "textarea") {
    return (
      <div className="flex flex-col gap-2">
        <CampoRotulo campo={campo} obrigatorio={obrigatorio} />
        <Textarea value={valorTexto(campo.id)} onChange={(e) => aoMudar(campo.id, e.target.value)} rows={4} />
      </div>
    );
  }

  if (campo.tipo === "data") {
    return (
      <div className="flex flex-col gap-2">
        <CampoRotulo campo={campo} obrigatorio={obrigatorio} />
        <Input type="date" value={valorTexto(campo.id)} onChange={(e) => aoMudar(campo.id, e.target.value)} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <CampoRotulo campo={campo} obrigatorio={obrigatorio} />
      <Input
        type={campo.tipo === "numero" ? "number" : "text"}
        inputMode={campo.tipo === "numero" ? "decimal" : undefined}
        step={campo.tipo === "numero" ? "0.01" : undefined}
        min={campo.tipo === "numero" ? "0" : undefined}
        value={
          ehCalculado && valorCalculado !== null
            ? String(valorCalculado)
            : campo.tipo === "numero"
              ? valorNumero(campo.id)
              : valorTexto(campo.id)
        }
        onChange={(e) => {
          if (!ehCalculado) aoMudar(campo.id, e.target.value);
        }}
        disabled={ehCalculado}
        placeholder={campo.placeholder}
        className={ehCalculado ? "cursor-not-allowed opacity-80" : undefined}
      />
    </div>
  );
}

function BlocoAula({ semana }: { semana: number }) {
  const [aula, setAula] = useState<AulaSemana | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      const { data } = await supabase
        .from("aulas_semana")
        .select("*")
        .eq("semana", semana)
        .maybeSingle();
      if (!ativo) return;
      setAula((data as AulaSemana | null) ?? null);
      setCarregando(false);
    }
    void carregar();
    return () => {
      ativo = false;
    };
  }, [semana]);

  if (carregando) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Video className="h-4 w-4 text-primary" />
            Vídeo-aula
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center rounded-lg border border-dashed border-muted-foreground/40 px-4 py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const videoId = aula?.video_url ? extrairVideoId(aula.video_url) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Video className="h-4 w-4 text-primary" />
          Vídeo-aula
        </CardTitle>
        {aula?.titulo && (
          <CardDescription>
            {aula.titulo}
            {aula.duracao_minutos ? ` · ${aula.duracao_minutos} min` : ""}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {videoId ? (
          <div className="aspect-video w-full overflow-hidden rounded-lg border border-input">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              title={aula?.titulo ?? `Vídeo-aula da semana ${semana}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5 rounded-lg border border-dashed border-muted-foreground/40 px-4 py-10 text-center">
            <Video className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground/90">Aula em breve</p>
            <p className="text-xs text-muted-foreground">
              O vídeo desta semana ainda não foi publicado.
            </p>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Assista a aula antes de preencher os campos abaixo.
        </p>
      </CardContent>
    </Card>
  );
}

function BlocoAnexoSemana({
  userId,
  semana,
  visualizacao,
}: {
  userId: string;
  semana: number;
  visualizacao?: boolean;
}) {
  const esperado = anexoEsperadoDaSemana(semana);
  const [anexos, setAnexos] = useState<MissaoAnexo[] | null>(null);
  const [erro, setErro] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!esperado) return;
    let ativo = true;
    setErro(false);
    setAnexos(null);
    const tipo = esperado.tipo;
    async function carregar() {
      try {
        const lista = await listarMeusAnexos(userId, semana, tipo);
        if (!ativo) return;
        setAnexos(lista);
      } catch {
        if (ativo) setErro(true);
      }
    }
    void carregar();
    return () => {
      ativo = false;
    };
  }, [userId, semana, esperado]);

  if (!esperado) return null;

  const aprovado = (anexos ?? []).some((a) => a.status === "aprovado");
  const podeEnviar = !visualizacao && !aprovado;

  async function enviar(arquivo: File | undefined | null) {
    if (!arquivo || !esperado) return;
    setEnviando(true);
    setErroEnvio(null);
    setSucesso(false);
    try {
      await enviarAnexo(userId, semana, esperado.tipo, arquivo);
      const lista = await listarMeusAnexos(userId, semana, esperado.tipo);
      setAnexos(lista);
      setSucesso(true);
    } catch (e) {
      setErroEnvio(e instanceof Error ? e.message : "Não foi possível enviar o arquivo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileUp className="h-4 w-4 text-primary" />
          Entrega: {esperado.rotulo}
        </CardTitle>
        <CardDescription>
          {esperado.descricao} {esperado.aceitos}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {erro ? (
          <p className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Não foi possível carregar seus anexos.
          </p>
        ) : anexos === null ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {anexos.length > 0 && (
              <ul className="flex flex-col gap-2">
                {anexos.map((a) => (
                  <li
                    key={a.id}
                    className="flex flex-col gap-1.5 rounded-lg border border-input px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          a.status === "aprovado"
                            ? "sucesso"
                            : a.status === "rejeitado"
                              ? "destrutivo"
                              : "pendente"
                        }
                      >
                        {a.status === "aprovado"
                          ? "Aprovado"
                          : a.status === "rejeitado"
                            ? "Rejeitado"
                            : "Pendente"}
                      </Badge>
                      <span className="truncate text-sm text-foreground/85">
                        {a.nome_arquivo ?? a.storage_path.split("/").pop()}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(a.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    {a.comentario_admin && (
                      <p className="text-sm text-foreground/90">
                        <span className="font-medium text-foreground">Tiago:</span>{" "}
                        {a.comentario_admin}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {podeEnviar ? (
              <div className="flex flex-col gap-2">
                <input
                  ref={inputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    void enviar(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => inputRef.current?.click()}
                    disabled={enviando}
                  >
                    {enviando ? <Loader2 className="animate-spin" /> : <Upload />}
                    {enviando ? "Enviando…" : "Enviar arquivo"}
                  </Button>
                  {anexos.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      Você pode reenviar — o Tiago avalia a versão mais recente.
                    </span>
                  )}
                </div>
                {erroEnvio && (
                  <p className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {erroEnvio}
                  </p>
                )}
                {sucesso && !erroEnvio && (
                  <p className="flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    Arquivo enviado! O Tiago vai avaliar em breve.
                  </p>
                )}
              </div>
            ) : visualizacao ? (
              <p className="text-xs text-muted-foreground">
                Modo visualização (admin) — envio desabilitado.
              </p>
            ) : (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                Entrega aprovada — nada mais a enviar.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function BlocoDicaSemana({
  semana,
  userId,
  visualizacao,
}: {
  semana: SemanaConteudo;
  userId: string;
  visualizacao?: boolean;
}) {
  const [dica, setDica] = useState<DicaPreenchimentoSemana | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    async function carregar() {
      try {
        const existente = await buscarDicaSemana(userId, semana.numero);
        if (!ativo) return;
        setDica(existente);
      } catch {
        if (ativo) setErro("Não foi possível carregar sua dica.");
      } finally {
        if (ativo) setCarregando(false);
      }
    }
    void carregar();
    return () => {
      ativo = false;
    };
  }, [userId, semana.numero]);

  async function gerar() {
    setGerando(true);
    setErro(null);
    try {
      const gerada = await gerarDicaSemana(semana.numero, semana);
      setDica({
        id: "",
        user_id: userId,
        semana_numero: semana.numero,
        texto: gerada.texto,
        modelo: gerada.modelo,
        gerado_em: new Date().toISOString(),
      });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível gerar a dica agora.");
    } finally {
      setGerando(false);
    }
  }

  if (visualizacao) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          Dica personalizada pra você
        </CardTitle>
        <CardDescription>
          A IA considera seu ramo de atuação e o que você já preencheu. Só é gerada quando você
          pede.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {carregando ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : dica ? (
          <>
            <div className="rounded-lg border border-primary/25 bg-primary/5 p-4">
              <p className="whitespace-pre-line text-sm text-foreground/90">{dica.texto}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Gerada em {new Date(dica.gerado_em).toLocaleDateString("pt-BR")}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => void gerar()}
              disabled={gerando}
            >
              {gerando ? <Loader2 className="animate-spin" /> : <RefreshCw />}
              {gerando ? "Gerando…" : "Atualizar dica"}
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Quer uma ajuda extra para preencher esta semana? A IA dá um direcionamento prático
              com base no seu negócio.
            </p>
            <Button className="w-fit" onClick={() => void gerar()} disabled={gerando}>
              {gerando ? <Loader2 className="animate-spin" /> : <Sparkles />}
              {gerando ? "Gerando…" : "Gerar dica personalizada"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Usamos parte dos seus dados de negócio para personalizar esta dica.
            </p>
          </>
        )}
        {erro && (
          <p className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {erro}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function CampoRotulo({ campo, obrigatorio }: { campo: Campo; obrigatorio: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <Label>
        {campo.rotulo}
        {obrigatorio && <span className="text-primary"> *</span>}
      </Label>
      {"dica" in campo && campo.dica && (
        <p className="text-xs text-muted-foreground">{campo.dica}</p>
      )}
      {"exemplo" in campo && campo.exemplo && (
        <p className="text-xs italic text-muted-foreground/75">{campo.exemplo}</p>
      )}
    </div>
  );
}

function calcularValores(semana: number, respostas: Record<string, unknown>): Record<string, number> {
  const resultado: Record<string, number> = {};
  const num = (id: string): number | null => {
    const v = respostas[id];
    if (typeof v === "number") return v;
    if (typeof v === "string" && v !== "") return Number(v);
    return null;
  };

  if (semana === 1) {
    const somaItens = (id: string): number | null => {
      const v = respostas[id];
      if (!Array.isArray(v)) return null;
      let total = 0;
      for (const item of v) {
        const valor = Number((item as Partial<ItemLista> | null)?.valor);
        if (Number.isFinite(valor) && valor > 0) total += valor;
      }
      return Math.round(total * 100) / 100;
    };
    // Soma automática das listas; cai no valor digitado no formato antigo
    // enquanto o aluno ainda não migrou (dado preservado, nunca sobrescrito).
    // O campo é sempre calculado (somente leitura) — sem dado, mostra 0.
    const custoVida = somaItens("custo_vida_itens") ?? num("f1_custo_vida") ?? 0;
    const fixas = somaItens("despesas_fixas");
    const variaveis = somaItens("despesas_variaveis");
    const custoNegocio =
      fixas !== null || variaveis !== null
        ? Math.round(((fixas ?? 0) + (variaveis ?? 0)) * 100) / 100
        : (num("f1_custo_negocio") ?? 0);
    resultado.f1_custo_vida = custoVida;
    resultado.f1_custo_negocio = custoNegocio;
    const lucro = num("f1_lucro_desejado");
    if (lucro !== null) {
      resultado.f1_meta_minima =
        Math.round((custoVida + custoNegocio + lucro) * 100) / 100;
    }
  }

  if (semana === 4) {
    const meta = num("p4_meta_mensal");
    if (meta !== null) {
      const semanal = meta / 4;
      resultado.p4_meta_semanal = Math.round(semanal * 100) / 100;
      resultado.p4_meta_diaria = Math.round((semanal / 5) * 100) / 100;
    }
  }

  if (semana === 10) {
    const enviados = num("p10_orcamentos_enviados");
    const fechados = num("p10_orcamentos_fechados");
    if (enviados !== null && fechados !== null) {
      resultado.p10_taxa_conversao =
        enviados > 0 ? Math.round((fechados / enviados) * 1000) / 10 : 0;
    }
  }

  return resultado;
}

const CHAVES_LEGADO_S1 = ["custo_vida_pessoal", "custos_fixos_negocio"] as const;

function temFormatoAntigoS1(respostas: Record<string, unknown>): boolean {
  const texto = (v: unknown) => typeof v === "string" && v.trim() !== "";
  return (
    CHAVES_LEGADO_S1.some((chave) => texto(respostas[chave])) ||
    texto(respostas.f1_custo_vida) ||
    texto(respostas.f1_custo_negocio)
  );
}

/**
 * Converte dados da Semana 1 no formato antigo (texto livre + valores digitados)
 * para o formato novo de listas. Não destrutivo: só cria itens a partir de
 * números que já estavam salvos e remove as chaves antigas quando migradas.
 */
function migrarFormatoAntigoS1(
  respostas: Record<string, unknown>
): Record<string, unknown> {
  const proximo = { ...respostas };
  const numeroLegado = (id: string): number | null => {
    const v = proximo[id];
    if (typeof v === "number") return v;
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };
  const criarItem = (listaId: string, fonte: string, textareaId: string | null) => {
    const valor = numeroLegado(fonte);
    if (valor === null || valor <= 0) return;
    const existentes = Array.isArray(proximo[listaId])
      ? (proximo[listaId] as ItemLista[])
      : [];
    proximo[listaId] = [...existentes, { descricao: "Valor anterior", valor }];
    delete proximo[fonte];
    if (textareaId) delete proximo[textareaId];
  };
  criarItem("custo_vida_itens", "f1_custo_vida", "custo_vida_pessoal");
  criarItem("despesas_fixas", "f1_custo_negocio", "custos_fixos_negocio");
  return proximo;
}

function validarCampos(
  semana: SemanaConteudo,
  respostas: Record<string, unknown>,
  calculados: Record<string, number>,
  checklistFinal: boolean
): string | null {
  if (!checklistFinal) return "Marque o checklist de conclusão para terminar a semana.";

  for (const campo of semana.campos) {
    const obrigatorio = ("obrigatorio" in campo ? campo.obrigatorio : false) ?? false;
    if (!obrigatorio) continue;

    if (campo.tipo === "tabela") {
      const linhas = Array.isArray(respostas[campo.id])
        ? (respostas[campo.id] as Record<string, unknown>[])
        : [];
      if (linhas.length === 0) return `Preencha o campo "${campo.rotulo}".`;
      const incompleta = linhas.some((linha) =>
        campo.colunas.some((c) => {
          const v = linha[c.id];
          return v === undefined || v === null || String(v).trim() === "";
        })
      );
      if (incompleta) return `Preencha todas as células da "${campo.rotulo}".`;
      continue;
    }

    if (campo.tipo === "tabela_fixa") {
      const objeto = (respostas[campo.id] ?? {}) as Record<string, unknown>;
      const incompleta = campo.linhas.some((linha) => {
        const v = objeto[linha.id];
        return v === undefined || v === null || String(v).trim() === "";
      });
      if (incompleta)
        return `Preencha todos os itens da "${campo.rotulo}" antes de concluir.`;
      continue;
    }

    if (campo.tipo === "lista_itens") {
      const linhas = Array.isArray(respostas[campo.id])
        ? (respostas[campo.id] as ItemLista[])
        : [];
      const temAlguma = linhas.some(
        (l) => (l.descricao ?? "").trim() !== "" || (typeof l.valor === "number" && l.valor > 0)
      );
      if (!temAlguma) return `Preencha o campo "${campo.rotulo}".`;
      const incompleta = linhas.some((l) => {
        const temDescricao = (l.descricao ?? "").trim() !== "";
        const temValor = typeof l.valor === "number" && l.valor > 0;
        return (temDescricao || temValor) && (!temDescricao || !temValor);
      });
      if (incompleta)
        return `Preencha descrição e valor em todas as linhas de "${campo.rotulo}".`;
      continue;
    }

    if (campo.id in calculados) continue;

    const v = respostas[campo.id];
    const vazio = v === undefined || v === null || String(v).trim() === "";
    if (vazio) return `Preencha o campo "${campo.rotulo}".`;
  }

  return null;
}
