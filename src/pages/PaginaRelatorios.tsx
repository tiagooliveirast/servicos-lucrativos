import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Award,
  BadgeCheck,
  FileText,
  Loader2,
  TriangleAlert,
} from "lucide-react";

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
import {
  gerarCertificadoPdf,
  montarDadosCertificado,
  verificarElegibilidade,
} from "@/lib/certificado-implantacao";
import { baixarPdf, slug } from "@/lib/pdf";
import {
  gerarRelatorioPdf,
  montarDadosRelatorio,
} from "@/lib/relatorio-implantacao";
import { carregarDadosTransformacao, type DadosTransformacao } from "@/lib/transformacao";

export function PaginaRelatorios({ userId }: { userId: string }) {
  const [dados, setDados] = useState<DadosTransformacao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [gerando, setGerando] = useState<"relatorio" | "certificado" | null>(null);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      try {
        const transformacao = await carregarDadosTransformacao(userId);
        if (!ativo) return;
        setDados(transformacao);
      } catch {
        if (!ativo) return;
        setErro(true);
      } finally {
        if (ativo) setCarregando(false);
      }
    }
    void carregar();
    return () => {
      ativo = false;
    };
  }, [userId]);

  if (carregando) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const relatorio = dados ? montarDadosRelatorio(dados) : null;
  const certificado = dados ? montarDadosCertificado(dados) : null;
  const elegibilidade = dados ? verificarElegibilidade(dados) : null;

  async function exportarRelatorio() {
    if (!relatorio) return;
    setErro(false);
    setGerando("relatorio");
    try {
      const blob = await gerarRelatorioPdf(relatorio);
      baixarPdf(blob, `relatorio-implantacao-${slug(relatorio.empresaNome ?? "empresa")}.pdf`);
    } catch {
      setErro(true);
    } finally {
      setGerando(null);
    }
  }

  async function exportarCertificado() {
    if (!certificado || !elegibilidade?.elegivel) return;
    setErro(false);
    setGerando("certificado");
    try {
      const blob = await gerarCertificadoPdf(certificado);
      baixarPdf(blob, `certificado-implantacao-${slug(certificado.alunoNome ?? "aluno")}.pdf`);
    } catch {
      setErro(true);
    } finally {
      setGerando(null);
    }
  }

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
            <Link to="/dashboard">
              <ArrowLeft />
              Painel de semanas
            </Link>
          </Button>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-primary">
              Relatórios &amp; Certificado
            </Badge>
          </div>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
            <FileText className="h-7 w-7 text-primary" />
            Seus Documentos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Reúna o resultado da sua jornada de 90 dias no Relatório de Implantação e, ao
            cumprir os três critérios, conquiste o seu Certificado de Implantação.
          </p>
        </div>

        {erro && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-10 text-center">
            <TriangleAlert className="h-6 w-6 text-destructive" />
            <p className="text-sm text-foreground/90">
              Não foi possível gerar o PDF agora. Verifique sua conexão e tente novamente.
            </p>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-primary" />
              Relatório de Implantação
            </CardTitle>
            <CardDescription>
              O documento que resume o seu ponto de partida, a evolução do IME, das finanças,
              do comercial e da operação — além das conquistas e ativos criados até hoje.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button
              onClick={() => void exportarRelatorio()}
              disabled={gerando !== null}
              className="h-11 w-fit"
            >
              {gerando === "relatorio" ? <Loader2 className="animate-spin" /> : <FileText />}
              {gerando === "relatorio" ? "Gerando PDF…" : "Exportar Relatório de Implantação"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="h-4 w-4 text-primary" />
              Certificado de Implantação
            </CardTitle>
            <CardDescription>
              Para conquistar o certificado você precisa: concluir as 12 semanas, ter IME de
              70 pontos ou mais e preencher os 3 painéis mensais.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {elegibilidade?.elegivel ? (
              <>
                <Badge variant="sucesso" className="w-fit">
                  <BadgeCheck className="h-3 w-3" />
                  Pronto para exportar
                </Badge>
                <Button
                  onClick={() => void exportarCertificado()}
                  disabled={gerando !== null}
                  className="h-11 w-fit"
                >
                  {gerando === "certificado" ? <Loader2 className="animate-spin" /> : <Award />}
                  {gerando === "certificado"
                    ? "Gerando PDF…"
                    : "Exportar Certificado de Implantação"}
                </Button>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">
                  Você está quase lá. Faltam:
                </p>
                <ul className="flex flex-col gap-1.5 text-sm">
                  {(elegibilidade?.pendentes ?? []).map((pendente, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                      <span className="text-foreground/80">{pendente}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}