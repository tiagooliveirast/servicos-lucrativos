import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Award, Loader2, MapPin, ShieldCheck, Store } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GraficoEvolucaoVitrine } from "@/components/GraficoEvolucaoVitrine";
import { Logo } from "@/components/Logo";
import { obterClassificacaoIme } from "@/lib/estagio-empresa";
import { serieIme } from "@/lib/evolucao";
import {
  buscarPaginaPublica,
  RODAPE_VITRINE,
  type PaginaPublica,
} from "@/lib/pagina-publica";
import { formatBRL, formatData } from "@/lib/utils";

type EstadoCarga = "carregando" | "nao_encontrada" | "erro" | "pronto";

export function PaginaEmpresaPublica() {
  const { slug: slugBruto } = useParams<{ slug: string }>();
  const slug = slugBruto ?? "";
  const [estado, setEstado] = useState<EstadoCarga>("carregando");
  const [dados, setDados] = useState<PaginaPublica | null>(null);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    if (!slug) {
      setEstado("nao_encontrada");
      return;
    }
    setEstado("carregando");
    async function carregar() {
      try {
        const pagina = await buscarPaginaPublica(slug);
        if (!ativo) return;
        if (!pagina) {
          setEstado("nao_encontrada");
          return;
        }
        setDados(pagina);
        setEstado("pronto");
      } catch {
        if (!ativo) return;
        setEstado("erro");
      }
    }
    void carregar();
    return () => {
      ativo = false;
    };
  }, [slug, tentativa]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4">
          <a href="/" className="shrink-0">
            <Logo />
          </a>
          <a
            href="/"
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Conhecer o método
          </a>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-8">
        {estado === "carregando" && (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm">Carregando a vitrine…</p>
          </div>
        )}

        {estado === "nao_encontrada" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
            <Logo className="scale-110" />
            <div>
              <p className="text-2xl font-bold tracking-tight">Página não encontrada</p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                Esta empresa ainda não possui uma página pública ativa ou o endereço foi
                digitado de forma incorreta.
              </p>
            </div>
            <Button asChild variant="outline">
              <a href="/">Voltar para o início</a>
            </Button>
          </div>
        )}

        {estado === "erro" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
            <Award className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold tracking-tight">Não foi possível carregar</p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                Ocorreu um problema ao carregar esta página. Verifique sua conexão e tente
                novamente.
              </p>
            </div>
            <Button variant="outline" onClick={() => setTentativa((t) => t + 1)}>
              Tentar novamente
            </Button>
          </div>
        )}

        {estado === "pronto" && dados && <VitrineEmpresa dados={dados} />}
      </main>

      <footer className="border-t py-5">
        <p className="text-center text-xs text-muted-foreground">{RODAPE_VITRINE}</p>
      </footer>
    </div>
  );
}

function VitrineEmpresa({ dados }: { dados: PaginaPublica }) {
  const classificacao = dados.ime_atual !== null ? obterClassificacaoIme(dados.ime_atual) : null;

  return (
    <>
      {/* Empresa */}
      <section className="rounded-2xl border border-primary/40 bg-card p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-primary/40 bg-primary/10 text-primary">
            <Store className="h-7 w-7" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Empresa
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              {dados.nome_empresa ?? "Empresa participante"}
            </h1>
            {(dados.cidade || dados.estado) && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {[dados.cidade, dados.estado].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Classificação do IME — mostra a faixa, não o número exato */}
      <section className="rounded-2xl border border-primary/40 bg-card p-6">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Maturidade empresarial
        </p>
        {classificacao ? (
          <>
            <Badge variant="default" className="mt-4 w-fit text-sm">
              {classificacao.nome}
            </Badge>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Empresa classificada pelo Índice de Maturidade Empresarial
              (IME) do método Serviços Lucrativos.
            </p>
          </>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            A classificação aparece depois dos primeiros passos da jornada.
          </p>
        )}
      </section>

      {dados.faturamento && (
        <section className="rounded-2xl border border-primary/40 bg-card p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Faturamento recente
          </p>
          <p className="mt-3 text-2xl font-bold text-primary">
            {formatBRL(dados.faturamento.valor)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Referência de {formatData(dados.faturamento.data_referencia)}
          </p>
        </section>
      )}

      {dados.certificado_disponivel && (
        <section className="flex items-center gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-emerald-500/50 bg-emerald-500/15 text-emerald-400">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold text-emerald-400">
              Certificado de Implantação
            </p>
            <p className="text-sm text-muted-foreground">
              Esta empresa concluiu o processo de implantação do método.
            </p>
          </div>
        </section>
      )}

      <GraficoEvolucaoVitrine
        titulo="Evolução do IME"
        descricao="Como a maturidade da empresa cresceu ao longo da jornada de 90 dias."
        serie={serieIme(
          dados.ime_historico.map((p) => ({ data_calculo: p.data, score_total: p.valor }))
        )}
        mascara={(v) => String(Math.round(v))}
        mensagemVazia="A evolução do IME desta empresa ainda está começando."
      />
    </>
  );
}