import {
  AlertCircle,
  ArrowLeft,
  Loader2,
  OctagonAlert,
  ShieldBan,
  TrendingUp,
  UserX,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

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
import { supabase } from "@/lib/supabase";
import type {
  Acesso,
  DiagnosticoInicial,
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
}

export function PaginaAdminUsuarioDetalhe() {
  const { id } = useParams();
  const [dados, setDados] = useState<DadosDetalhe | null>(null);
  const [erro, setErro] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erroAcao, setErroAcao] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      if (!id) return;
      const [resPerfil, resDiagnostico, resProgresso, resIndicadores, resPaineis, resRadar, resAcesso] =
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
        ]);
      if (!ativo) return;
      if (
        resPerfil.error ||
        resDiagnostico.error ||
        resProgresso.error ||
        resIndicadores.error ||
        resPaineis.error ||
        resRadar.error ||
        resAcesso.error
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
      });
    }
    void carregar();
    return () => {
      ativo = false;
    };
  }, [id]);

  if (erro || !dados) {
    return (
      <p className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
        <AlertCircle className="h-4 w-4 shrink-0" />
        Não foi possível carregar este aluno.
      </p>
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

  if (!dados) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const { perfil, diagnostico, progresso, indicadores, paineis, radar, acesso } = dados;
  const concluidas = progresso.filter((p) => p.status === "concluida").map((p) => p.semana);
  const pct = Math.round((concluidas.length / 12) * 100);

  async function desativarAcesso() {
    if (!id) return;
    setSalvando(true);
    setErroAcao(null);
    const { error } = await supabase
      .from("acessos")
      .update({
        ativo: false,
        motivo_inativacao: motivo.trim() || null,
        inativado_em: new Date().toISOString(),
      })
      .eq("user_id", id);
    setSalvando(false);
    if (error) {
      setErroAcao("Não foi possível atualizar o acesso.");
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
    const { error } = await supabase
      .from("acessos")
      .update({ ativo: true, motivo_inativacao: null, inativado_em: null })
      .eq("user_id", id);
    setSalvando(false);
    if (error) {
      setErroAcao("Não foi possível atualizar o acesso.");
      return;
    }
    setDados((d) => (d ? { ...d, acesso: { ...(d.acesso ?? { user_id: id }), ativo: true, motivo_inativacao: null, inativado_em: null } as Acesso } : d));
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link to="/admin/usuarios">
            <ArrowLeft />
            Usuários
          </Link>
        </Button>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {concluidas.includes(12) ? (
            <Badge variant="sucesso">90 dias concluídos</Badge>
          ) : (
            <Badge variant="outline">Semana {semanaAtualDe(concluidas)}</Badge>
          )}
          <Badge variant="secondary">{pct}% do plano</Badge>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          {perfil.nome ?? "Sem nome"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {perfil.email ?? "—"}
          {perfil.telefone ? ` · ${perfil.telefone}` : ""}
          {perfil.cidade ? ` · ${perfil.cidade}${perfil.estado ? `/${perfil.estado}` : ""}` : ""}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Início: {formatData(perfil.created_at)} · Último acesso:{" "}
          {formatData(perfil.ultimo_acesso_at)}
        </p>
      </div>

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
                else if (typeof valor === "number") {
                  texto = ["faturamento_atual", "lucro_atual", "ticket_medio"].includes(
                    campo.chave
                  )
                    ? formatBRL(valor)
                    : formatNumero(valor);
                } else if (valor !== null && valor !== undefined) texto = String(valor);
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
              {paineis.map((painel) => (
                <div key={painel.numero_painel} className="rounded-lg border border-input p-4">
                  <p className="text-sm font-semibold">Painel Mensal {painel.numero_painel}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {painel.preenchido_em ? formatData(painel.preenchido_em) : "Ainda não preenchido"}
                  </p>
                  <dl className="mt-3 flex flex-col gap-1.5 text-sm">
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
                      <dt className="text-muted-foreground">Conversão</dt>
                      <dd className="font-medium tabular-nums">{formatPorcento(painel.taxa_conversao)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Reserva</dt>
                      <dd className="font-medium tabular-nums">{formatBRL(painel.reserva_emergencia)}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
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
