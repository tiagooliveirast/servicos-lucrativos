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

import { CartaoCarregando } from "@/components/CartaoCarregando";
import { CartaoErro } from "@/components/CartaoErro";
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
  verificarElegibilidade,
} from "@/lib/certificado-implantacao";
import {
  exportarCertificadoPDF,
  exportarRelatorioPDF,
} from "@/lib/exportacao-pdf";
import { carregarDadosTransformacao, type DadosTransformacao } from "@/lib/transformacao";

export function PaginaRelatorios({ userId }: { userId: string }) {
  const [dados, setDados] = useState<DadosTransformacao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState(false);
  const [erroGeracao, setErroGeracao] = useState(false);
  const [gerando, setGerando] = useState<"relatorio" | "certificado" | null>(null);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      try {
        const transformacao = await carregarDadosTransformacao(userId);
        if (!ativo) return;
        setDados(transformacao);
      } catch {
        if (!ativo) return;
        setErroCarga(true);
      } finally {
        if (ativo) setCarregando(false);
      }
    }
    void carregar();
    return () => {
      ativo = false;
    };
  }, [userId, tentativa]);

  if (carregando) {
    return (
      <Layout>
        <CartaoCarregando />
      </Layout>
    );
  }

  if (erroCarga) {
    return (
      <Layout>
        <CartaoErro
          mensagem="Não foi possível carregar seus dados agora. Verifique sua conexão e tente novamente."
          onTentar={() => setTentativa((t) => t + 1)}
        />
      </Layout>
    );
  }

  const elegibilidade = dados ? verificarElegibilidade(dados) : null;

  async function exportarRelatorio() {
    setErroGeracao(false);
    setGerando("relatorio");
    try {
      await exportarRelatorioPDF(userId);
    } catch {
      setErroGeracao(true);
    } finally {
      setGerando(null);
    }
  }

  async function exportarCertificado() {
    if (!elegibilidade?.elegivel) return;
    setErroGeracao(false);
    setGerando("certificado");
    try {
      await exportarCertificadoPDF(userId);
    } catch {
      setErroGeracao(true);
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

        {erroGeracao && (
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