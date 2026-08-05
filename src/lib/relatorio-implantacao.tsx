import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import type { ReactElement } from "react";

import { listarAtivos, type AtivoCriado } from "@/lib/ativos";
import { SEMANAS } from "@/lib/conteudo";
import {
  serieConversao,
  serieFaturamento,
  serieLucro,
  serieTicket,
} from "@/lib/evolucao";
import { PILARES_IME } from "@/lib/ime";
import { CINZA, FONTE_PDF, OURO, PRETO } from "@/lib/pdf-estilos";
import type { DadosTransformacao } from "@/lib/transformacao";
import type { ImeHistorico } from "@/lib/types";
import { formatBRL, formatData } from "@/lib/utils";

const estilos = StyleSheet.create({
  pagina: {
    padding: 40,
    fontFamily: FONTE_PDF,
    color: PRETO,
    fontSize: 10,
    lineHeight: 1.5,
  },
  capa: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  capaMarca: {
    color: OURO,
    fontSize: 11,
    letterSpacing: 4,
    textTransform: "uppercase",
    marginBottom: 16,
  },
  capaTitulo: {
    fontSize: 34,
    fontWeight: "bold",
    marginBottom: 8,
  },
  capaSubtitulo: {
    fontSize: 13,
    color: CINZA,
    marginBottom: 24,
  },
  capaNome: {
    fontSize: 16,
    fontWeight: "bold",
    color: OURO,
    marginBottom: 4,
  },
  capaEmpresa: {
    fontSize: 12,
    color: CINZA,
    marginBottom: 8,
  },
  capaData: {
    fontSize: 11,
    color: CINZA,
  },
  secaoTitulo: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 22,
    marginBottom: 12,
    color: OURO,
    borderBottomWidth: 1,
    borderBottomColor: OURO,
    paddingBottom: 6,
  },
  secaoSubtitulo: {
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 5,
  },
  rotulo: {
    color: CINZA,
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  valor: {
    marginBottom: 6,
  },
  linhaTabela: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#DDD8CC",
    paddingVertical: 5,
  },
  linhaTabelaCabecalho: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: PRETO,
    paddingVertical: 5,
    fontWeight: "bold",
  },
  celula: {
    flex: 1,
    paddingRight: 8,
  },
  celulaNumero: {
    width: 110,
    textAlign: "right",
  },
  celulaDelta: {
    width: 80,
    textAlign: "right",
  },
  itemConquista: {
    flexDirection: "row",
    marginBottom: 6,
  },
  bullet: {
    width: 12,
    color: OURO,
    fontWeight: "bold",
  },
  rodape: {
    marginTop: 32,
    borderTopWidth: 0.5,
    borderTopColor: "#DDD8CC",
    paddingTop: 8,
    fontSize: 8,
    color: CINZA,
    textAlign: "center",
  },
});

export interface ValorVariacao {
  antes: number | null;
  atual: number | null;
  variacao: number | null;
}

export interface DadosRelatorio {
  alunoNome: string | null;
  empresaNome: string | null;
  dataInicio: string;
  dataFim: string;
  imeInicial: ImeHistorico | null;
  imeAtual: ImeHistorico | null;
  financasIniciais: {
    custoVida: number | null;
    custoNegocio: number | null;
    lucroDesejado: number | null;
    metaMinima: number | null;
  };
  faturamento: ValorVariacao;
  lucro: ValorVariacao;
  ticket: ValorVariacao;
  conversao: ValorVariacao;
  operacoes: { semana: number; titulo: string; concluida: boolean }[];
  conquistas: string[];
  ativos: AtivoCriado[];
  proximoPasso: string | null;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function primeiroUltimo(pontos: { valor: number }[]): { primeiro: number | null; ultimo: number | null } {
  const valores = pontos.map((p) => p.valor).filter((v) => Number.isFinite(v));
  if (valores.length === 0) return { primeiro: null, ultimo: null };
  return { primeiro: valores[0], ultimo: valores[valores.length - 1] };
}

function variacao(antes: number | null | undefined, depois: number | null | undefined): number | null {
  if (antes === null || antes === undefined || depois === null || depois === undefined || antes === 0) {
    return null;
  }
  return ((depois - antes) / antes) * 100;
}

export function montarDadosRelatorio(dados: DadosTransformacao): DadosRelatorio {
  const { empresa, perfil, progresso, indicadores, ime } = dados;

  const respostas1 = progresso.find((p) => p.semana === 1)?.respostas ?? {};
  const financasIniciais = {
    custoVida: num(respostas1["f1_custo_vida"]),
    custoNegocio: num(respostas1["f1_custo_negocio"]),
    lucroDesejado: num(respostas1["f1_lucro_desejado"]),
    metaMinima: num(respostas1["f1_meta_minima"]),
  };

  const fatur = primeiroUltimo(serieFaturamento(indicadores, dados.paineis, dados.checkins).pontos);
  const lucro = primeiroUltimo(serieLucro(dados.paineis, dados.checkins).pontos);
  const ticket = primeiroUltimo(serieTicket(indicadores, dados.paineis).pontos);
  const conversao = primeiroUltimo(serieConversao(indicadores, dados.paineis).pontos);

  const operacoes = [5, 6, 7, 8].map((n) => ({
    semana: n,
    titulo: SEMANAS.find((s) => s.numero === n)?.tituloCurto ?? `Semana ${n}`,
    concluida: progresso.find((p) => p.semana === n)?.status === "concluida",
  }));

  const conquistas: string[] = [];
  if (progresso.find((p) => p.semana === 12)?.status === "concluida") {
    conquistas.push("Plano de 90 dias concluído (todas as 12 semanas).");
  }
  for (const ind of indicadores) {
    const antes = num(ind.valor_antes);
    const depois = num(ind.valor_depois);
    if (antes !== null && antes > 0 && depois !== null && depois >= antes * 1.2) {
      const unidade = ind.unidade ? ` ${ind.unidade}` : "";
      const pct = Math.round(((depois - antes) / antes) * 100);
      conquistas.push(
        `${ind.nome_indicador}: de ${formatNumero(antes)}${unidade} para ${formatNumero(depois)}${unidade} (+${pct}%).`
      );
    }
  }
  if (fatur.ultimo !== null && fatur.primeiro !== null && fatur.primeiro > 0 && fatur.ultimo >= fatur.primeiro * 1.2) {
    conquistas.push(
      `Faturamento em evolução: de ${formatBRL(fatur.primeiro)} para ${formatBRL(fatur.ultimo)}.`
    );
  }

  const respostas12 = progresso.find((p) => p.semana === 12)?.respostas ?? {};
  const proximoPasso = (respostas12["p12_proximo_objetivo"] as string | undefined)?.trim() ?? null;

  let dataInicio = ime.length > 0 ? ime[0].data_calculo : null;
  if (!dataInicio) dataInicio = empresa?.created_at ?? perfil?.created_at ?? null;
  let dataFim = progresso.find((p) => p.semana === 12)?.concluida_em ?? null;
  if (!dataFim && ime.length > 0) dataFim = ime[ime.length - 1].data_calculo;
  if (!dataFim && dados.paineis.length > 0) {
    const preenchidos = dados.paineis.filter((p) => p.preenchido_em);
    dataFim = preenchidos[preenchidos.length - 1]?.preenchido_em ?? null;
  }

  return {
    alunoNome: perfil?.nome ?? null,
    empresaNome: empresa?.nome_empresa ?? null,
    dataInicio: dataInicio ?? new Date().toISOString(),
    dataFim: dataFim ?? new Date().toISOString(),
    imeInicial: ime.length > 0 ? ime[0] : null,
    imeAtual: ime.length > 0 ? ime[ime.length - 1] : null,
    financasIniciais,
    faturamento: {
      antes: fatur.primeiro,
      atual: fatur.ultimo,
      variacao: variacao(fatur.primeiro, fatur.ultimo),
    },
    lucro: { antes: lucro.primeiro, atual: lucro.ultimo, variacao: variacao(lucro.primeiro, lucro.ultimo) },
    ticket: { antes: ticket.primeiro, atual: ticket.ultimo, variacao: variacao(ticket.primeiro, ticket.ultimo) },
    conversao: {
      antes: conversao.primeiro,
      atual: conversao.ultimo,
      variacao: variacao(conversao.primeiro, conversao.ultimo),
    },
    operacoes,
    conquistas,
    ativos: listarAtivos(progresso),
    proximoPasso,
  };
}

function formatNumero(v: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(v);
}

function formatVariacao(v: number | null): string {
  if (v === null) return "—";
  const sinal = v > 0 ? "+" : "";
  return `${sinal}${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(v)}%`;
}

function ItemRotuloValor({ rotulo, valor }: { rotulo: string; valor: string | null }) {
  return (
    <View style={{ marginBottom: 6 }}>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      <Text style={estilos.valor}>{valor ?? "—"}</Text>
    </View>
  );
}

function LinhaTabela({ titulo, colunas }: { titulo: string; colunas: string[] }) {
  return (
    <View style={estilos.linhaTabela}>
      <Text style={estilos.celula}>{titulo}</Text>
      {colunas.map((v, i) => (
        <Text key={i} style={estilos.celulaNumero}>
          {v}
        </Text>
      ))}
    </View>
  );
}

function LinhaTabelaCabecalho({ colunas }: { colunas: string[] }) {
  return (
    <View style={estilos.linhaTabelaCabecalho}>
      <Text style={estilos.celula}>{colunas[0]}</Text>
      {colunas.slice(1).map((v, i) => (
        <Text key={i} style={estilos.celulaNumero}>
          {v}
        </Text>
      ))}
    </View>
  );
}

function ItemVariacao({
  titulo,
  dados,
  mascara,
}: {
  titulo: string;
  dados: ValorVariacao;
  mascara: (v: number) => string;
}) {
  const texto = (v: number | null) => (v === null ? "—" : mascara(v));
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={estilos.secaoSubtitulo}>{titulo}</Text>
      <LinhaTabela titulo="Início do plano" colunas={[texto(dados.antes)]} />
      <LinhaTabela titulo="Atual" colunas={[texto(dados.atual)]} />
      <LinhaTabela titulo="Variação" colunas={[formatVariacao(dados.variacao)]} />
    </View>
  );
}

function SecaoPilares({ dados }: { dados: DadosRelatorio }) {
  return (
    <View>
      <LinhaTabelaCabecalho colunas={["Pilar", "Inicial", "Atual", "Δ"]} />
      {PILARES_IME.map((pilar) => {
        const inicial = dados.imeInicial ? num(dados.imeInicial[pilar.chave]) : null;
        const atual = dados.imeAtual ? num(dados.imeAtual[pilar.chave]) : null;
        const delta = variacao(inicial, atual);
        return (
          <LinhaTabela
            key={pilar.chave}
            titulo={pilar.rotulo}
            colunas={[
              inicial === null ? "—" : String(inicial),
              atual === null ? "—" : String(atual),
              delta === null ? "—" : formatVariacao(delta),
            ]}
          />
        );
      })}
    </View>
  );
}

function DocumentoRelatorio({ dados }: { dados: DadosRelatorio }) {
  return (
    <Document title="Relatório de Implantação — Serviços Lucrativos">
      <Page size="A4" style={estilos.pagina}>
        <View style={estilos.capa}>
          <Text style={estilos.capaMarca}>Serviços Lucrativos — O Plano de 90 Dias</Text>
          <Text style={estilos.capaTitulo}>Relatório de Implantação</Text>
          <Text style={estilos.capaSubtitulo}>O diagnóstico da sua transformação</Text>
          <Text style={estilos.capaNome}>{dados.alunoNome ?? "—"}</Text>
          <Text style={estilos.capaEmpresa}>{dados.empresaNome ?? ""}</Text>
          <Text style={estilos.capaData}>
            {formatData(dados.dataInicio)} a {formatData(dados.dataFim)}
          </Text>
        </View>
      </Page>

      <Page size="A4" style={estilos.pagina}>
        <Text style={estilos.secaoTitulo}>1. Ponto de Partida</Text>
        <ItemRotuloValor rotulo="Custo de vida" valor={formatBRL(dados.financasIniciais.custoVida)} />
        <ItemRotuloValor rotulo="Custo do negócio" valor={formatBRL(dados.financasIniciais.custoNegocio)} />
        <ItemRotuloValor rotulo="Lucro desejado" valor={formatBRL(dados.financasIniciais.lucroDesejado)} />
        <ItemRotuloValor rotulo="Meta mínima" valor={formatBRL(dados.financasIniciais.metaMinima)} />

        <Text style={estilos.secaoTitulo}>2. Índice de Maturidade (IME)</Text>
        {dados.imeInicial && dados.imeAtual ? (
          <>
            <Text style={estilos.valor}>
              O IME saiu de{" "}
              <Text style={{ fontWeight: "bold", color: OURO }}>{dados.imeInicial.score_total}</Text>{" "}
              para{" "}
              <Text style={{ fontWeight: "bold", color: OURO }}>{dados.imeAtual.score_total}</Text>.
            </Text>
<SecaoPilares dados={dados} />
          </>
        ) : (
          <Text style={{ color: CINZA }}>O IME ainda não foi calculado para esta empresa.</Text>
        )}

        <Text style={estilos.secaoTitulo}>3. Evolução Financeira</Text>
        <ItemVariacao titulo="Faturamento" dados={dados.faturamento} mascara={formatBRL} />
        <ItemVariacao titulo="Lucro" dados={dados.lucro} mascara={formatBRL} />

        <Text style={estilos.secaoTitulo}>4. Evolução Comercial</Text>
        <ItemVariacao titulo="Ticket médio" dados={dados.ticket} mascara={formatBRL} />
        <ItemVariacao
          titulo="Taxa de conversão"
          dados={dados.conversao}
          mascara={(v) => `${formatNumero(v)}%`}
        />

        <Text style={estilos.secaoTitulo}>5. Evolução Operacional</Text>
        <LinhaTabelaCabecalho colunas={["Semana", "Foco", "Status"]} />
        {dados.operacoes.map((op) => (
          <LinhaTabela
            key={op.semana}
            titulo={`Semana ${op.semana}`}
            colunas={[op.titulo, op.concluida ? "Concluída" : "—"]}
          />
        ))}

        <Text style={estilos.secaoTitulo}>6. Principais Conquistas</Text>
        {dados.conquistas.length === 0 ? (
          <Text style={{ color: CINZA }}>Registros ainda insuficientes para listar conquistas.</Text>
        ) : (
          dados.conquistas.map((conquista, i) => (
            <View key={i} style={estilos.itemConquista}>
              <Text style={estilos.bullet}>•</Text>
              <Text style={estilos.celula}>{conquista}</Text>
            </View>
          ))
        )}

        <Text style={estilos.secaoTitulo}>7. Ativos Criados</Text>
        {dados.ativos.map((ativo) => (
          <LinhaTabela
            key={ativo.id}
            titulo={ativo.rotulo}
            colunas={ativo.preenchido ? ["✓"] : ["—"]}
          />
        ))}

        <Text style={estilos.secaoTitulo}>8. Próximo Passo</Text>
        {dados.proximoPasso ? (
          <Text style={estilos.valor}>{dados.proximoPasso}</Text>
        ) : (
          <Text style={{ color: CINZA }}>Ainda não definiu o próximo objetivo.</Text>
        )}

        <Text style={estilos.rodape}>
          Serviços Lucrativos: O Plano de 90 Dias. Relatório gerado em{" "}
          {new Date().toLocaleDateString("pt-BR")}.
        </Text>
      </Page>
    </Document>
  );
}

export async function gerarRelatorioPdf(dados: DadosRelatorio): Promise<Blob> {
  const elemento = DocumentoRelatorio({ dados }) as ReactElement;
  return pdf(elemento).toBlob();
}