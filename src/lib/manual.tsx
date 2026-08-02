import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import type { ReactElement } from "react";

import { SEMANAS, type SemanaConteudo } from "@/lib/conteudo";
import type { DiagnosticoInicial, PainelMensal, ProgressoSemana } from "@/lib/types";
import { formatBRL } from "@/lib/utils";

const OURO = "#C9A227";
const PRETO = "#0A0A0A";
const CINZA = "#6B6559";

const estilos = StyleSheet.create({
  pagina: {
    padding: 40,
    fontFamily: "Helvetica",
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
  capaEmpresa: {
    fontSize: 16,
    fontWeight: "bold",
    color: OURO,
    marginBottom: 8,
  },
  capaData: {
    fontSize: 11,
    color: CINZA,
  },
  secaoTitulo: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 24,
    marginBottom: 12,
    color: OURO,
    borderBottomWidth: 1,
    borderBottomColor: OURO,
    paddingBottom: 6,
  },
  secaoSubtitulo: {
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 14,
    marginBottom: 6,
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
    width: 90,
    textAlign: "right",
  },
  colunaPainel: {
    width: 80,
    textAlign: "right",
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

export interface ItemManual {
  rotulo: string;
  texto: string;
}

export interface DadosManual {
  empresa: DiagnosticoInicial;
  semanas: { numero: number; titulo: string; itens: ItemManual[] }[];
  paineis: PainelMensal[];
  dataConclusao: string;
}

const CAMPOS_MONEY = new Set([
  "custo_vida", "custos_fixos_negocio", "despesas_fixas", "despesas_variaveis",
  "lucro_desejado", "meta_minima", "meta_mensal", "meta_semanal", "meta_diaria",
  "faturamento_atual", "lucro", "ticket_medio", "reserva_emergencia",
  "preco_atual", "preco_correto",
]);

const CAMPOS_PERCENT = new Set(["taxa_conversao", "margem"]);

function formatarNumero(campoId: string, valor: number): string {
  if (CAMPOS_MONEY.has(campoId)) return formatBRL(valor);
  if (CAMPOS_PERCENT.has(campoId)) return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(valor)}%`;
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(valor);
}

function formatarData(valor: string): string {
  return new Date(valor).toLocaleDateString("pt-BR");
}

function textoCampo(semana: SemanaConteudo, campoId: string, respostas: Record<string, unknown>): string | null {
  const campo = semana.campos.find((c) => c.id === campoId);
  const v = respostas[campoId];

  if (campo?.tipo === "tabela") {
    if (!Array.isArray(v) || v.length === 0) return null;
    return v
      .map((linha) => {
        const objeto = linha as Record<string, string | number>;
        return campo.colunas
          .map((coluna) => {
            const celula = objeto[coluna.id];
            if (celula === undefined || celula === null || String(celula).trim() === "") return null;
            if (coluna.tipo === "numero") return formatarNumero(coluna.id, Number(celula));
            return String(celula);
          })
          .filter(Boolean)
          .join(" — ");
      })
      .filter(Boolean)
      .join("\n");
  }

  if (campo?.tipo === "tabela_fixa") {
    if (!v || typeof v !== "object") return null;
    const objeto = v as Record<string, unknown>;
    const linhas = campo.linhas
      .map((linha) => {
        const celula = objeto[linha.id];
        if (celula === null || celula === undefined || String(celula).trim() === "") return null;
        const ehMoney = linha.rotulo.includes("R$");
        const ehPercent = linha.rotulo.includes("%");
        const valorFormatado = ehMoney
          ? formatBRL(Number(celula))
          : ehPercent
            ? `${celula}%`
            : String(celula);
        return `${linha.rotulo}: ${valorFormatado}`;
      })
      .filter(Boolean);
    return linhas.length > 0 ? linhas.join("\n") : null;
  }

  if (v === null || v === undefined || String(v).trim() === "") return null;
  if (campo?.tipo === "data") return formatarData(String(v));
  if (campo?.tipo === "numero" || typeof v === "number") return formatarNumero(campoId, Number(v));
  return String(v);
}

function rotuloCampo(semana: SemanaConteudo, campoId: string): string {
  const campo = semana.campos.find((c) => c.id === campoId);
  return campo?.rotulo ?? campoId;
}

function montarItens(
  semana: SemanaConteudo,
  respostas: Record<string, unknown>
): ItemManual[] {
  const itens: ItemManual[] = [];
  for (const campoId of semana.camposManual) {
    const texto = textoCampo(semana, campoId, respostas);
    if (texto !== null) itens.push({ rotulo: rotuloCampo(semana, campoId), texto });
  }
  return itens;
}

const PAINEIS_CAMPOS: { id: string; rotulo: string; mascara: (v: number | null) => string }[] = [
  { id: "meta_mensal", rotulo: "Meta mensal", mascara: formatBRL },
  { id: "faturamento_atual", rotulo: "Faturamento", mascara: formatBRL },
  { id: "lucro", rotulo: "Lucro", mascara: formatBRL },
  { id: "ticket_medio", rotulo: "Ticket médio", mascara: formatBRL },
  { id: "numero_clientes", rotulo: "Clientes", mascara: (v) => (v === null ? "—" : String(v)) },
  { id: "numero_orcamentos", rotulo: "Orçamentos", mascara: (v) => (v === null ? "—" : String(v)) },
  { id: "taxa_conversao", rotulo: "Conversão", mascara: (v) => (v === null ? "—" : `${v}%`) },
  { id: "avaliacoes_google", rotulo: "Avaliações Google", mascara: (v) => (v === null ? "—" : String(v)) },
  { id: "reserva_emergencia", rotulo: "Reserva", mascara: formatBRL },
];

function LinhaPainel({
  campo,
  paineis,
}: {
  campo: (typeof PAINEIS_CAMPOS)[number];
  paineis: (PainelMensal | null)[];
}) {
  return (
    <View style={estilos.linhaTabela}>
      <Text style={estilos.celula}>{campo.rotulo}</Text>
      {paineis.map((p, i) => (
        <Text key={i} style={estilos.colunaPainel}>
          {p ? campo.mascara(p[campo.id as keyof PainelMensal] as number | null) : "—"}
        </Text>
      ))}
    </View>
  );
}

function DocumentoManual({ dados }: { dados: DadosManual }) {
  const { empresa } = dados;
  const paineisColunas = [1, 2, 3].map((n) => dados.paineis.find((p) => p.numero_painel === n) ?? null);

  return (
    <Document title={`Manual da Empresa — ${empresa.nome_empresa ?? "Serviços Lucrativos"}`}>
      <Page size="A4" style={estilos.pagina}>
        <View style={estilos.capa}>
          <Text style={estilos.capaMarca}>Serviços Lucrativos — O Plano de 90 Dias</Text>
          <Text style={estilos.capaTitulo}>Manual da Empresa</Text>
          <Text style={estilos.capaSubtitulo}>O resumo de tudo o que foi construído em 90 dias</Text>
          <Text style={estilos.capaEmpresa}>{empresa.nome_empresa ?? "—"}</Text>
          <Text style={estilos.capaData}>Concluído em {formatarData(dados.dataConclusao)}</Text>
        </View>
      </Page>

      <Page size="A4" style={estilos.pagina}>
        <Text style={estilos.secaoTitulo}>1. Dados da Empresa</Text>
        <ItemRotuloValor rotulo="Nome da empresa" valor={empresa.nome_empresa} />
        <ItemRotuloValor rotulo="Área de atuação" valor={empresa.area_atuacao} />
        <ItemRotuloValor rotulo="Tempo de mercado" valor={empresa.tempo_mercado} />
        <ItemRotuloValor rotulo="Possui CNPJ" valor={empresa.possui_cnpj === null ? null : empresa.possui_cnpj ? "Sim" : "Não"} />
        <ItemRotuloValor rotulo="Possui funcionários" valor={empresa.possui_funcionarios === null ? null : empresa.possui_funcionarios ? "Sim" : "Não"} />
        <ItemRotuloValor rotulo="Trabalha sozinho" valor={empresa.trabalha_sozinho === null ? null : empresa.trabalha_sozinho ? "Sim" : "Não"} />
        <ItemRotuloValor rotulo="Faturamento atual (diagnóstico)" valor={formatBRL(empresa.faturamento_atual)} />
        <ItemRotuloValor rotulo="Lucro atual (diagnóstico)" valor={formatBRL(empresa.lucro_atual)} />
        <ItemRotuloValor rotulo="Clientes (diagnóstico)" valor={empresa.qtd_clientes === null ? null : String(empresa.qtd_clientes)} />
        <ItemRotuloValor rotulo="Ticket médio (diagnóstico)" valor={formatBRL(empresa.ticket_medio)} />
        <ItemRotuloValor rotulo="Orçamentos no último mês (diagnóstico)" valor={empresa.numero_orcamentos === null ? null : String(empresa.numero_orcamentos)} />

        <Text style={estilos.secaoTitulo}>2. A Jornada dos 90 Dias</Text>
        {dados.semanas.map((semana) => (
          <View key={semana.numero} wrap={false}>
            <Text style={estilos.secaoSubtitulo}>
              Semana {semana.numero} — {semana.titulo}
            </Text>
            {semana.itens.length === 0 ? (
              <Text style={{ color: CINZA, marginBottom: 6 }}>Sem respostas registradas.</Text>
            ) : (
              semana.itens.map((item, i) => (
                <View key={i} style={{ marginBottom: 6 }}>
                  <Text style={estilos.rotulo}>{item.rotulo}</Text>
                  <Text style={estilos.valor}>{item.texto}</Text>
                </View>
              ))
            )}
          </View>
        ))}
      </Page>

      <Page size="A4" style={estilos.pagina}>
        <Text style={estilos.secaoTitulo}>3. Evolução dos Painéis Mensais</Text>
        <View style={estilos.linhaTabelaCabecalho}>
          <Text style={estilos.celula}>Indicador</Text>
          <Text style={estilos.colunaPainel}>Painel 1</Text>
          <Text style={estilos.colunaPainel}>Painel 2</Text>
          <Text style={estilos.colunaPainel}>Painel 3</Text>
        </View>
        {PAINEIS_CAMPOS.map((campo) => (
          <LinhaPainel key={campo.id} campo={campo} paineis={paineisColunas} />
        ))}
        <Text style={estilos.rodape}>
          Serviços Lucrativos: O Plano de 90 Dias. Manual gerado em{" "}
          {new Date().toLocaleDateString("pt-BR")}.
        </Text>
      </Page>
    </Document>
  );
}

function ItemRotuloValor({ rotulo, valor }: { rotulo: string; valor: string | null }) {
  return (
    <View style={{ marginBottom: 6 }}>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      <Text style={estilos.valor}>{valor ?? "—"}</Text>
    </View>
  );
}

export async function gerarManualPdf(dados: DadosManual): Promise<Blob> {
  const elemento = DocumentoManual({ dados }) as ReactElement;
  return pdf(elemento).toBlob();
}

export function montarDadosManual(
  empresa: DiagnosticoInicial,
  progresso: ProgressoSemana[],
  paineis: PainelMensal[]
): DadosManual {
  const semana12 = progresso.find((p) => p.semana === 12);
  const semanas = SEMANAS.map((semana) => {
    const registro = progresso.find((p) => p.semana === semana.numero);
    return {
      numero: semana.numero,
      titulo: semana.titulo,
      itens: montarItens(semana, registro?.respostas ?? {}),
    };
  });
  return {
    empresa,
    semanas,
    paineis,
    dataConclusao: semana12?.concluida_em ?? new Date().toISOString(),
  };
}
