import {
  gerarCertificadoPdf,
  montarDadosCertificado,
} from "@/lib/certificado-implantacao";
import { baixarPdf } from "@/lib/pdf";
import {
  gerarRelatorioPdf,
  montarDadosRelatorio,
} from "@/lib/relatorio-implantacao";
import { carregarDadosTransformacao } from "@/lib/transformacao";
import { slug } from "@/lib/utils";

export async function exportarRelatorioPDF(userId: string): Promise<void> {
  const completos = await carregarDadosTransformacao(userId);
  const dados = montarDadosRelatorio(completos);
  const blob = await gerarRelatorioPdf(dados);
  baixarPdf(blob, `relatorio-implantacao-${slug(dados.empresaNome ?? "empresa")}.pdf`);
}

export async function exportarCertificadoPDF(userId: string): Promise<void> {
  const completos = await carregarDadosTransformacao(userId);
  const dados = montarDadosCertificado(completos);
  const blob = await gerarCertificadoPdf(dados);
  baixarPdf(blob, `certificado-implantacao-${slug(dados.alunoNome ?? "aluno")}.pdf`);
}
