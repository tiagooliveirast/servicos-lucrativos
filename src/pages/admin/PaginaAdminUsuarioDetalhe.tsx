import {
  AlertCircle,
  Award,
  BadgeCheck,
  FileDown,
  FileText,
  Loader2,
  MessageCircle,
  OctagonAlert,
  ShieldBan,
  TrendingUp,
  UserX,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { CabecalhoPagina } from "@/components/CabecalhoPagina";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  verificarElegibilidade,
} from "@/lib/certificado-implantacao";
import {
  exportarCertificadoPDF,
  exportarRelatorioPDF,
} from "@/lib/exportacao-pdf";
import { supabase } from "@/lib/supabase";
import type { DadosTransformacao } from "@/lib/transformacao";
import type {
  Acesso,
  DiagnosticoInicial,
  ImeHistorico,
  IndicadorSemana,
  PainelMensal,
  Perfil,
  ProgressoSemana,
  RadarEvento,
} from "@/lib/types";
import { cn, formatBRL, formatData, formatNumero, formatPorcento, semanaAtualDe } from "@/lib/utils";

const CAMPOS_DIAGNOSTICO: { chave: keyof DiagnosticoInicial; rotulo: string }[] = [
  { chave: "nome_empresa", rotulo: "Empresa" },
  { chave: "area_atuacao", rotulo: "Área de atuação" },
  { chave: "tempo_mercado", rotulo: "Tempo de mercado" },
  { chave: "possui_cnpj", rotulo: "Possui CNPJ" },
  { chave: "possui_funcionarios", rotulo: "Tem funcionários" },
  { chave: "trabalha_sozinho", rotulo: "Trabalha sozinho" },
  { chave: "faturamento_atual", rotulo: "Faturamento atual" },
  { chave: "lucro_atual", rotulo: "Lucro atual" },
  { chave: "qtd_clientes", rotulo: "Nº de clientes" },
  { chave: "ticket_medio", rotulo: "Ticket médio" },
  { chave: "numero_orcamentos", rotulo: "Orçamentos por mês" },
];

interface DadosDetalhe {
  perfil: Perfil | null;
  diagnostico: DiagnosticoInicial | null;
  progresso: ProgressoSemana[];
  indicadores: IndicadorSemana[];
  paineis: PainelMensal[];
  radar: RadarEvento[];
  acesso: Acesso | null;
  ime: ImeHistorico[];
}

export function PaginaAdminUsuarioDetalhe() {
  const { id } = useParams();
  const [dados, setDados] = useState<DadosDetalhe | null>(null);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const [confirmando, setConfirmando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [gerando, setGerando] = useState<"relatorio" | "certificado" | null>(null);
  const [whatsapp, setWhatsapp] = useState("");
  const [salvandoWhatsApp, setSalvandoWhatsApp] = useState(false);
  const [erroWhatsApp, setErroWhatsApp] = useState<string | null>(null);
  const [sucessoWhatsApp, setSucessoWhatsApp] = useState(false);

  useEffect(() => {
    setWhatsapp(dados?.perfil?.whatsapp ?? "");
  }, [dados?.perfil?.whatsapp]);

  useEffect(() => {
    let ativo = true;
    setErro(false);
    setDados(null);
    async function carregar() {
      if (!id) return;
      const [resPerfil, resDiagnostico, resProgresso, resIndicadores, resPaineis, resRadar, resAcesso, resIme] =
        await Promise.all([
          supabase.from("perfis").select("*").eq("id", id).maybeSingle(),
          supabase
            .from("diagnostico_inicial")
            .select("*")
            .eq("user_id", id)
            .maybeSingle(),
          supabase
            .from("progresso_semanas")
            .select("semana, status, concluida_em")
            .eq("user_id", id)
            .order("semana"),
          supabase
            .from("indicadores_semana")
            .select("semana, nome_indicador, unidade, valor_antes, valor_depois, atualizado_em")
            .eq("user_id", id)
            .order("semana"),
          supabase
            .from("paineis_mensais")
            .select("*")
            .eq("user_id", id)
            .order("numero_painel"),
          supabase
            .from("radar_eventos")
            .select("*")
            .eq("user_id", id)
            .order("criado_em", { ascending: false })
            .limit(50),
          supabase.from("acessos").select("*").eq("user_id", id).maybeSingle(),
          supabase
            .from("ime_historico")
            .select("*")
            .eq("user_id", id)
            .order("data_calculo", { ascending: true }),
        ]);
      if (!ativo) return;
      if (
        resPerfil.error ||
        resDiagnostico.error ||
        resProgresso.error ||
        resIndicadores.error ||
        resPaineis.error ||
        resRadar.error ||
        resAcesso.error ||
        resIme.error
      ) {
        setErro(true);
        return;
      }
      setDados({
        perfil: (resPerfil.data as Perfil | null) ?? null,
        diagnostico: (resDiagnostico.data as DiagnosticoInicial | null) ?? null,
        progresso: resProgresso.data as ProgressoSemana[],
        indicadores: resIndicadores.data as IndicadorSemana[],
        paineis: resPaineis.data as PainelMensal[],
        radar: resRadar.data as RadarEvento[],
        acesso: (resAcesso.data as Acesso | null) ?? null,
        ime: (resIme.data ?? []) as ImeHistorico[],
      });
    }
    void carregar();
    return () => {
      ativo = false;
    };
  }, [id, tentativa]);

  if (!dados) {
    return <CartaoCarregando />;
  }

  if (erro) {
    return (
      <CartaoErro
        mensagem="Não foi possível carregar este aluno. Verifique sua conexão e tente novamente."
        onTentar={() => setTentativa((t) => t + 1)}
      />
    );
  }

  if (!dados.perfil) {
    return (
      <p className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
        <AlertCircle className="h-4 w-4 shrink-0" />
        Aluno não encontrado.
      </p>
    );
  }

  const { perfil, diagnostico, progresso, indicadores, paineis, radar, acesso } = dados;
  const concluidas = progresso.filter((p) => p.status === "concluida").map((p) => p.semana);
  const pct = Math.round((concluidas.length / 12) * 100);

  async function desativarAcesso() {
    if (!id) return;
    setSalvando(true);
    setErroAcao(null);
    const { error, data } = await supabase
      .from("acessos")
      .update({
        ativo: false,
        motivo_inativacao: motivo.trim() || null,
        inativado_em: new Date().toISOString(),
      })
      .eq("user_id", id)
      .select("user_id");
    setSalvando(false);
    if (error || !data || data.length === 0) {
      setErroAcao(
        error
          ? "Não foi possível atualizar o acesso."
          : "Nenhum registro de acesso encontrado para este aluno."
      );
      return;
    }
    setConfirmando(false);
    setMotivo("");
    setDados((d) => (d ? { ...d, acesso: { ...(d.acesso ?? { user_id: id }), ativo: false, motivo_inativacao: motivo.trim() || null, inativado_em: new Date().toISOString() } as Acesso } : d));
  }

  async function reativarAcesso() {
    if (!id) return;
    setSalvando(true);
    setErroAcao(null);
    const { error, data } = await supabase
      .from("acessos")
      .update({ ativo: true, motivo_inativacao: null, inativado_em: null })
      .eq("user_id", id)
      .select("user_id");
    setSalvando(false);
    if (error || !data || data.length === 0) {
      setErroAcao(
        error
          ? "Não foi possível atualizar o acesso."
          : "Nenhum registro de acesso encontrado para este aluno."
      );
      return;
    }
    setDados((d) => (d ? { ...d, acesso: { ...(d.acesso ?? { user_id: id }), ativo: true, motivo_inativacao: null, inativado_em: null } as Acesso } : d));
  }

  async function salvarWhatsApp() {
    if (!id) return;
    setSalvandoWhatsApp(true);
    setErroWhatsApp(null);
    setSucessoWhatsApp(false);
    const { error } = await supabase.rpc("admin_atualizar_whatsapp", {
      alvo: id,
      novo_whatsapp: whatsapp,
    });
    setSalvandoWhatsApp(false);
    if (error) {
      setErroWhatsApp("Não foi possível salvar o WhatsApp.");
      return;
    }
    setSucessoWhatsApp(true);
    setDados((d) =>
      d && d.perfil
        ? { ...d, perfil: { ...d.perfil, whatsapp: whatsapp.trim() || null } }
        : d
    );
  }

  async function exportarRelatorio() {
    if (!id) return;
    setErroAcao(null);
    setGerando("relatorio");
    try {
      await exportarRelatorioPDF(id);
    } catch {
      setErroAcao("Não foi possível gerar o Relatório de Implantação.");
    } finally {
      setGerando(null);
    }
  }

  async function exportarCertificado() {
    if (!id) return;
    setErroAcao(null);
    setGerando("certificado");
    try {
      await exportarCertificadoPDF(id);
    } catch {
      setErroAcao("Não foi possível gerar o Certificado de Implantação.");
    } finally {
      setGerando(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <CabecalhoPagina
        voltarPara="/admin/usuarios"
        textoVoltar="Usuários"
        badges={
          <>
            {concluidas.includes(12) ? (
              <Badge variant="sucesso">90 dias concluídos</Badge>
            ) : (
              <Badge variant="outline">Semana {semanaAtualDe(concluidas)}</Badge>
            )}
            <Badge variant="secondary">{pct}% do plano</Badge>
          </>
        }
        titulo={perfil.nome ?? "Sem nome"}
        descricao={
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              {perfil.email ?? "—"}
              {perfil.whatsapp ? ` · WhatsApp ${perfil.whatsapp}` : ""}
              {perfil.telefone ? ` · ${perfil.telefone}` : ""}
              {perfil.cidade ? ` · ${perfil.cidade}${perfil.estado ? `/${perfil.estado}` : ""}` : ""}
            </p>
            {perfil.email_refriclube && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Refriclube: {perfil.email_refriclube}
              </p>
            )}
            <p className="mt-0.5 text-xs text-muted-foreground">
              Início: {formatData(perfil.created_at)} · Último acesso:{" "}
              {formatData(perfil.ultimo_acesso_at)}
            </p>
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldBan className="h-4 w-4 text-primary" />
            Controle de acesso
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={acesso?.ativo === false ? "destrutivo" : "sucesso"}>
              {acesso?.ativo === false ? "Acesso inativo" : "Acesso ativo"}
            </Badge>
            {acesso?.inativado_em && (
              <span className="text-xs text-muted-foreground">
                Inativado em {formatData(acesso.inativado_em)}
              </span>
            )}
          </div>
          {acesso?.ativo === false && acesso.motivo_inativacao && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
              <span className="font-semibold">Motivo:</span> {acesso.motivo_inativacao}
            </p>
          )}
          {!confirmando ? (
            acesso?.ativo === false ? (
              <Button variant="outline" onClick={() => void reativarAcesso()} disabled={salvando} className="w-fit">
                {salvando && <Loader2 className="animate-spin" />}
                Reativar acesso
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={() => setConfirmando(true)}
                className="w-fit"
              >
                <UserX />
                Desativar acesso
              </Button>
            )
          ) : (
            <div className="flex flex-col gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="motivo">
                  Motivo da desativação <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="motivo"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ex: devolução da garantia condicional"
                  autoFocus
                />
              </div>
              <p className="text-xs text-muted-foreground">
                O aluno perde o acesso imediatamente, mas os dados dele continuam salvos.
              </p>
              {erroAcao && (
                <p className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {erroAcao}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="destructive"
                  disabled={salvando || motivo.trim() === ""}
                  onClick={() => void desativarAcesso()}
                >
                  {salvando && <Loader2 className="animate-spin" />}
                  Confirmar desativação
                </Button>
                <Button variant="outline" onClick={() => setConfirmando(false)} disabled={salvando}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="h-4 w-4 text-primary" />
            Contato pelo WhatsApp
          </CardTitle>
          <CardDescription>
            É o número usado no lembrete manual da Visão Geral da Turma. Alunos cadastrados
            antes desse campo existir podem ter o WhatsApp preenchido aqui.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="whatsapp">WhatsApp (com DDD)</Label>
              <Input
                id="whatsapp"
                value={whatsapp}
                onChange={(e) => {
                  setWhatsapp(e.target.value);
                  setSucessoWhatsApp(false);
                }}
                placeholder="(00) 00000-0000"
              />
            </div>
            <Button
              onClick={() => void salvarWhatsApp()}
              disabled={salvandoWhatsApp || whatsapp.trim() === (perfil.whatsapp ?? "")}
              className="w-fit"
            >
              {salvandoWhatsApp && <Loader2 className="animate-spin" />}
              Salvar WhatsApp
            </Button>
          </div>
          {erroWhatsApp && (
            <p className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {erroWhatsApp}
            </p>
          )}
          {sucessoWhatsApp && (
            <p className="flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">
              <BadgeCheck className="h-4 w-4 shrink-0" />
              WhatsApp salvo.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Diagnóstico inicial</CardTitle>
        </CardHeader>
        <CardContent>
          {!diagnostico ? (
            <p className="text-sm text-muted-foreground">
              Ainda não preencheu o diagnóstico (onboarding incompleto).
            </p>
          ) : (
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              {CAMPOS_DIAGNOSTICO.map((campo) => {
                const valor = diagnostico[campo.chave];
                let texto = "—";
                if (typeof valor === "boolean") texto = valor ? "Sim" : "Não";
                else if (valor !== null && valor !== undefined) {
                  if (["faturamento_atual", "lucro_atual", "ticket_medio"].includes(campo.chave)) {
                    // O PostgREST devolve colunas numeric como string
                    texto = formatBRL(valor as number | string);
                  } else if (
                    typeof valor === "number" ||
                    (typeof valor === "string" && valor.trim() !== "")
                  ) {
                    texto = formatNumero(valor as number | string);
                  } else {
                    texto = String(valor);
                  }
                }
                return (
                  <div key={campo.chave}>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                      {campo.rotulo}
                    </dt>
                    <dd className="text-sm font-medium">{texto}</dd>
                  </div>
                );
              })}
            </dl>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Progresso semana a semana</CardTitle>
          <CardDescription>Semana 12 concluída = plano completo.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => {
              const status = progresso.find((p) => p.semana === n)?.status ?? "bloqueada";
              return (
                <div
                  key={n}
                  title={status === "concluida" ? "Concluída" : status === "em_andamento" ? "Em andamento" : "Bloqueada"}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-semibold",
                    status === "concluida"
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                      : status === "em_andamento"
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-input text-muted-foreground"
                  )}
                >
                  {n}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Indicadores registrados</CardTitle>
        </CardHeader>
        <CardContent>
          {indicadores.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum indicador registrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Semana</th>
                    <th className="pb-2 pr-4 font-medium">Indicador</th>
                    <th className="pb-2 pr-4 font-medium">Antes</th>
                    <th className="pb-2 pr-4 font-medium">Depois</th>
                    <th className="pb-2 font-medium">Atualizado</th>
                  </tr>
                </thead>
                <tbody>
                  {indicadores.map((ind) => (
                    <tr key={`${ind.semana}-${ind.nome_indicador}`} className="border-b border-border last:border-b-0">
                      <td className="py-2.5 pr-4">{ind.semana}</td>
                      <td className="py-2.5 pr-4">{ind.nome_indicador}</td>
                      <td className="py-2.5 pr-4 tabular-nums">
                        {ind.valor_antes === null ? "—" : `${formatNumero(ind.valor_antes)}${ind.unidade ? ` ${ind.unidade}` : ""}`}
                      </td>
                      <td className="py-2.5 pr-4 tabular-nums">
                        {ind.valor_depois === null ? "—" : `${formatNumero(ind.valor_depois)}${ind.unidade ? ` ${ind.unidade}` : ""}`}
                      </td>
                      <td className="py-2.5 text-xs text-muted-foreground">
                        {formatData(ind.atualizado_em)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Painéis mensais</CardTitle>
        </CardHeader>
        <CardContent>
          {paineis.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum painel liberado ainda.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {paineis.map((painel) => {
                // Um painel criado automaticamente pela conclusão da semana tem
                // preenchido_em com default now() — o sinal real de preenchimento
                // é o faturamento informado (mesmo critério usado na página do aluno).
                const preenchido = painel.faturamento_atual != null;
                return (
                  <div key={painel.numero_painel} className="rounded-lg border border-input p-4">
                    <p className="text-sm font-semibold">Painel Mensal {painel.numero_painel}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {preenchido ? formatData(painel.preenchido_em) : "Ainda não preenchido"}
                    </p>
                    <dl className="mt-3 flex flex-col gap-1.5 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Meta mensal</dt>
                        <dd className="font-medium tabular-nums">{formatBRL(painel.meta_mensal)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Faturamento</dt>
                        <dd className="font-medium tabular-nums">{formatBRL(painel.faturamento_atual)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Lucro</dt>
                        <dd className="font-medium tabular-nums">{formatBRL(painel.lucro)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Ticket médio</dt>
                        <dd className="font-medium tabular-nums">{formatBRL(painel.ticket_medio)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Clientes</dt>
                        <dd className="font-medium tabular-nums">{formatNumero(painel.numero_clientes)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Orçamentos</dt>
                        <dd className="font-medium tabular-nums">{formatNumero(painel.numero_orcamentos)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Conversão</dt>
                        <dd className="font-medium tabular-nums">{formatPorcento(painel.taxa_conversao)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Avaliações Google</dt>
                        <dd className="font-medium tabular-nums">{formatNumero(painel.avaliacoes_google)}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Reserva</dt>
                        <dd className="font-medium tabular-nums">{formatBRL(painel.reserva_emergencia)}</dd>
                      </div>
                      {painel.observacao && (
                        <p className="mt-1 rounded-md bg-muted/50 px-2.5 py-1.5 text-xs text-foreground/80">
                          {painel.observacao}
                        </p>
                      )}
                    </dl>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary" />
            Relatório e Certificado
          </CardTitle>
          <CardDescription>
            Exporte o Relatório de Implantação ou o Certificado (quando os 3 critérios forem
            alcançados pelo aluno).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {(() => {
            const elegibilidade = verificarElegibilidade({
              perfil: dados.perfil,
              empresa: dados.diagnostico,
              progresso: dados.progresso,
              indicadores: dados.indicadores,
              paineis: dados.paineis,
              ime: dados.ime,
              checkins: [],
            } as DadosTransformacao);
            return (
              <>
                <Button
                  onClick={() => void exportarRelatorio()}
                  disabled={gerando !== null}
                  className="w-fit"
                >
                  {gerando === "relatorio" ? <Loader2 className="animate-spin" /> : <FileDown />}
                  {gerando === "relatorio"
                    ? "Gerando relatório…"
                    : "Exportar Relatório de Implantação"}
                </Button>
                {elegibilidade.elegivel ? (
                  <>
                    <Badge variant="sucesso" className="w-fit">
                      <BadgeCheck className="h-3 w-3" />
                      Certificado disponível
                    </Badge>
                    <Button
                      onClick={() => void exportarCertificado()}
                      disabled={gerando !== null}
                      className="w-fit"
                    >
                      {gerando === "certificado" ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <Award />
                      )}
                      {gerando === "certificado"
                        ? "Gerando certificado…"
                        : "Exportar Certificado de Implantação"}
                    </Button>
                  </>
                ) : (
                  <div className="flex flex-col gap-1.5 text-sm">
                    <p className="text-muted-foreground">Certificado ainda não liberado:</p>
                    {elegibilidade.pendentes.map((pendente, i) => (
                      <p key={i} className="flex items-start gap-2">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                        <span className="text-foreground/80">{pendente}</span>
                      </p>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
          {erroAcao && (
            <p className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {erroAcao}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alertas do Radar da Empresa</CardTitle>
          <CardDescription>Últimos 50 eventos disparados para este aluno.</CardDescription>
        </CardHeader>
        <CardContent>
          {radar.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum alerta registrado.</p>
          ) : (
            <ul className="flex flex-col">
              {radar.map((evento) => (
                <li
                  key={evento.id}
                  className={cn(
                    "flex items-start gap-3 border-b border-border py-3 last:border-b-0",
                    evento.resolvido && "opacity-50"
                  )}
                >
                  {evento.categoria === "verde" ? (
                    <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  ) : evento.categoria === "amarelo" ? (
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" />
                  ) : (
                    <OctagonAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                  )}
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm text-foreground/90">{evento.mensagem}</p>
                    {evento.missao_sugerida && (
                      <p className="text-xs text-primary">{evento.missao_sugerida}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatData(evento.criado_em)}
                      {evento.resolvido ? " · resolvido" : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
