import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import type { ReactElement } from "react";

import { contarAtivosCriados, listarAtivos } from "@/lib/ativos";
import { serieFaturamento, serieLucro, serieTicket } from "@/lib/evolucao";
import { CINZA, FONTE_PDF, OURO, PRETO } from "@/lib/pdf-estilos";
import type { DadosTransformacao } from "@/lib/transformacao";
import { formatData } from "@/lib/utils";

/** IME mínimo para obtenção do Certificado de Implantação. */
export const IME_MINIMO_CERTIFICADO = 70;

const estilos = StyleSheet.create({
  pagina: {
    padding: 32,
    fontFamily: FONTE_PDF,
    color: PRETO,
  },
  molduraExterna: {
    flexGrow: 1,
    borderWidth: 5,
    borderColor: OURO,
    padding: 8,
  },
  molduraInterna: {
    flexGrow: 1,
    borderWidth: 1,
    borderColor: OURO,
    alignItems: "center",
    paddingHorizontal: 30,
    paddingVertical: 24,
  },
  marca: {
    color: OURO,
    fontSize: 11,
    letterSpacing: 5,
    textTransform: "uppercase",
    marginBottom: 18,
  },
  titulo: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 6,
  },
  subtitulo: {
    fontSize: 13,
    color: CINZA,
    textAlign: "center",
    marginBottom: 26,
  },
  texto: {
    fontSize: 11,
    color: PRETO,
    textAlign: "center",
    lineHeight: 1.7,
  },
  nome: {
    fontSize: 20,
    fontWeight: "bold",
    color: OURO,
    marginTop: 14,
    marginBottom: 2,
  },
  empresa: {
    fontSize: 13,
    color: CINZA,
    marginBottom: 20,
    textAlign: "center",
  },
  stats: {
    flexDirection: "row",
    marginTop: 6,
    width: "100%",
  },
  celula: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: "#DDD8CC",
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  celulaRotulo: {
    fontSize: 7,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: CINZA,
    marginBottom: 3,
    textAlign: "center",
  },
  celulaValor: {
    fontSize: 11,
    fontWeight: "bold",
    textAlign: "center",
    color: OURO,
  },
  fechamento: {
    fontSize: 10,
    color: CINZA,
    textAlign: "center",
    marginTop: 18,
  },
  assinatura: {
    marginTop: 44,
    alignItems: "center",
  },
  linhaAssinatura: {
    width: 260,
    borderTopWidth: 1,
    borderTopColor: PRETO,
    paddingTop: 6,
  },
  assinaturaRotulo: {
    fontSize: 10,
    color: CINZA,
    textAlign: "center",
  },
});

export interface DadosCertificado {
  alunoNome: string | null;
  empresaNome: string | null;
  dataConclusao: string;
  imeInicial: number | null;
  imeFinal: number | null;
  evolucaoFaturamento: number | null;
  evolucaoLucro: number | null;
  evolucaoTicket: number | null;
  ativosCriados: number;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function variacaoEntre(pontos: { valor: number }[]): number | null {
  const valores = pontos.map((p) => p.valor).filter((v) => Number.isFinite(v));
  if (valores.length < 2 || valores[0] === 0) return null;
  return ((valores[valores.length - 1] - valores[0]) / valores[0]) * 100;
}

export function montarDadosCertificado(dados: DadosTransformacao): DadosCertificado {
  const semana12 = dados.progresso.find((p) => p.semana === 12);
  const imeInicial = num(dados.ime.length > 0 ? dados.ime[0].score_total : null);
  const imeFinal = num(dados.ime.length > 0 ? dados.ime[dados.ime.length - 1].score_total : null);

  return {
    alunoNome: dados.perfil?.nome ?? null,
    empresaNome: dados.empresa?.nome_empresa ?? null,
    dataConclusao: semana12?.concluida_em ?? new Date().toISOString(),
    imeInicial,
    imeFinal,
    evolucaoFaturamento: variacaoEntre(
      serieFaturamento(dados.indicadores, dados.paineis, dados.checkins).pontos
    ),
    evolucaoLucro: variacaoEntre(serieLucro(dados.paineis, dados.checkins).pontos),
    evolucaoTicket: variacaoEntre(serieTicket(dados.indicadores, dados.paineis).pontos),
    ativosCriados: contarAtivosCriados(listarAtivos(dados.progresso)),
  };
}

export interface Elegibilidade {
  elegivel: boolean;
  pendentes: string[];
}

/**
 * Regras do Certificado: 12 semanas concluídas + IME atual ≥ 70 + pelo menos
 * 3 painéis mensais preenchidos (mesmo critério da plataforma: painel vale
 * preenchido quando o faturamento foi informado).
 */
export function verificarElegibilidade(dados: DadosTransformacao): Elegibilidade {
  const pendentes: string[] = [];

  const concluidas = dados.progresso.filter((p) => p.status === "concluida").length;
  if (concluidas < 12) {
    pendentes.push(`Concluir as 12 semanas do plano (faltam ${12 - concluidas}).`);
  }

  const imeAtual = dados.ime.length > 0 ? num(dados.ime[dados.ime.length - 1].score_total) : null;
  if (imeAtual === null || imeAtual < IME_MINIMO_CERTIFICADO) {
    pendentes.push(`Atingir IME de ${IME_MINIMO_CERTIFICADO} pontos (atual: ${imeAtual ?? "—"}).`);
  }

  const paineisPreenchidos = dados.paineis.filter((p) => p.faturamento_atual !== null).length;
  if (paineisPreenchidos < 3) {
    pendentes.push(`Preencher os 3 painéis mensais (faltam ${3 - paineisPreenchidos}).`);
  }

  return { elegivel: pendentes.length === 0, pendentes };
}

function formatVariacao(v: number | null): string {
  if (v === null) return "—";
  const sinal = v > 0 ? "+" : "";
  return `${sinal}${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(v)}%`;
}

function Celula({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View style={estilos.celula}>
      <Text style={estilos.celulaRotulo}>{rotulo}</Text>
      <Text style={estilos.celulaValor}>{valor}</Text>
    </View>
  );
}

function DocumentoCertificado({ dados }: { dados: DadosCertificado }) {
  return (
    <Document title="Certificado de Implantação — Serviços Lucrativos">
      <Page size="A4" orientation="landscape" style={estilos.pagina}>
        <View style={estilos.molduraExterna}>
          <View style={estilos.molduraInterna}>
            <Text style={estilos.marca}>Serviços Lucrativos</Text>
            <Text style={estilos.titulo}>Certificado de Implantação Empresarial</Text>
            <Text style={estilos.subtitulo}>
              Método Serviços Lucrativos — O Plano de 90 Dias
            </Text>

            <Text style={estilos.texto}>
              Certificamos que {dados.alunoNome ?? "o profissional"}
              {dados.empresaNome ? `, da empresa ${dados.empresaNome}` : ""}, concluiu o
              processo de implantação empresarial do Método Serviços Lucrativos, validando a
              estruturação financeira, operacional, comercial e de crescimento do negócio.
            </Text>

            <Text style={estilos.nome}>{dados.alunoNome ?? "—"}</Text>
            <Text style={estilos.empresa}>{dados.empresaNome ?? ""}</Text>

            <View style={estilos.stats}>
              <Celula rotulo="IME inicial" valor={dados.imeInicial === null ? "—" : String(dados.imeInicial)} />
              <Celula rotulo="IME final" valor={dados.imeFinal === null ? "—" : String(dados.imeFinal)} />
              <Celula
                rotulo="Evolução do faturamento"
                valor={formatVariacao(dados.evolucaoFaturamento)}
              />
              <Celula rotulo="Evolução do lucro" valor={formatVariacao(dados.evolucaoLucro)} />
              <Celula rotulo="Evolução do ticket" valor={formatVariacao(dados.evolucaoTicket)} />
              <Celula rotulo="Ativos criados" valor={String(dados.ativosCriados)} />
            </View>

            <Text style={estilos.fechamento}>
              Concluído em {formatData(dados.dataConclusao)}
              {dados.imeFinal !== null ? ` com IME final de ${dados.imeFinal} pontos.` : "."}
            </Text>

            <View style={estilos.assinatura}>
              <View style={estilos.linhaAssinatura}>
                <Text style={estilos.assinaturaRotulo}>Equipe Serviços Lucrativos</Text>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function gerarCertificadoPdf(dados: DadosCertificado): Promise<Blob> {
  const elemento = DocumentoCertificado({ dados }) as ReactElement;
  return pdf(elemento).toBlob();
}