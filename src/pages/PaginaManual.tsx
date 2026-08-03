import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, FileText, Loader2 } from "lucide-react";

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
import { gerarManualPdf, montarDadosManual } from "@/lib/manual";
import { supabase } from "@/lib/supabase";
import type { DiagnosticoInicial, PainelMensal, ProgressoSemana } from "@/lib/types";

export function PaginaManual({ userId }: { userId: string }) {
  const [liberado, setLiberado] = useState<boolean | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      const { data: semana12 } = await supabase
        .from("progresso_semanas")
        .select("status")
        .eq("user_id", userId)
        .eq("semana", 12)
        .maybeSingle();
      if (!ativo) return;
      setLiberado(semana12?.status === "concluida");
      setCarregando(false);
    }
    void carregar();
    return () => {
      ativo = false;
    };
  }, [userId]);

  async function gerar() {
    setErro(null);
    setGerando(true);
    try {
      const [resEmpresa, resProgresso, resPaineis] = await Promise.all([
        supabase
          .from("diagnostico_inicial")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from("progresso_semanas").select("*").eq("user_id", userId),
        supabase.from("paineis_mensais").select("*").eq("user_id", userId),
      ]);

      if (!resEmpresa.data) throw new Error("Dados da empresa não encontrados.");

      const dados = montarDadosManual(
        resEmpresa.data as DiagnosticoInicial,
        (resProgresso.data ?? []) as ProgressoSemana[],
        (resPaineis.data ?? []) as PainelMensal[]
      );
      const blob = await gerarManualPdf(dados);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `manual-da-empresa-${slug(dados.empresa.nome_empresa ?? "gestao-lucrativa")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setErro("Não foi possível gerar o PDF. Tente novamente.");
    } finally {
      setGerando(false);
    }
  }

  if (carregando) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }
  if (!liberado) return <Navigate to="/" replace />;

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
              Manual da Empresa
            </Badge>
            <Badge variant="sucesso">Disponível</Badge>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            O Manual da Sua Empresa
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Você concluiu as 12 semanas. Este PDF reúne tudo: os dados da sua empresa, as
            respostas-chave de cada semana e a evolução dos 3 painéis mensais.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-primary" />
              Exportação em PDF
            </CardTitle>
            <CardDescription>
              O Manual da Empresa é o documento final do plano — guarde, imprima e use no
              dia a dia do seu negócio.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button onClick={() => void gerar()} disabled={gerando} className="h-11 w-fit">
              {gerando ? <Loader2 className="animate-spin" /> : <FileText />}
              {gerando ? "Gerando PDF…" : "Gerar meu Manual da Empresa em PDF"}
            </Button>
            {erro && <p className="text-sm text-destructive">{erro}</p>}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

function slug(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
