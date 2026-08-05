import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  CalendarDays,
  Flame,
  Heart,
  KeyRound,
  Loader2,
  MessagesSquare,
  Radar,
  Shield,
  Target,
  TrendingUp,
  X,
} from "lucide-react";

import { CartaoCarregando } from "@/components/CartaoCarregando";
import { CartaoErro } from "@/components/CartaoErro";
import { Layout } from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { buscarAnaliseIa, type AnaliseIa } from "@/lib/analise-ia";
import {
  carregarMotivoPessoal,
  registrarMotivoExibido,
  textoMotivo,
} from "@/lib/motivo";
import type { AlertaRadar } from "@/lib/regras-radar";
import {
  carregarSalaDeGuerra,
  type SalaDeGuerra as DadosSala,
} from "@/lib/sala-de-guerra";
import { cn } from "@/lib/utils";

// Onda 8 Nível 1 (análise diária com IA) pausada por decisão de produto.
// Quando false: a mensagem do mentor não é gerada nem exibida, e o custo
// de OpenAI fica zero. Reativar basta trocar para true — o código e a
// Edge Function continuam existindo e funcionando.
const ANALISE_DIARIA_ATIVA = false;

// A partir de quantos dias sem login o retorno ganha a tela de boas-vindas.
const DIAS_MINIMOS_PARA_RETORNO = 7;

export function PaginaSalaDeGuerra({
  perfilId,
  ausenteDias,
}: {
  perfilId: string;
  ausenteDias: number | null;
}) {
  const [dados, setDados] = useState<DadosSala | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const [analiseMentor, setAnaliseMentor] = useState<AnaliseIa | null>(null);
  const [analiseCarregando, setAnaliseCarregando] = useState(true);
  const [retornoMotivo, setRetornoMotivo] = useState<string | null>(null);
  const retornoRegistradoRef = useRef(false);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro(false);
    setAnaliseCarregando(true);
    async function carregar() {
      const { dados, erro } = await carregarSalaDeGuerra(perfilId);
      if (!ativo) return;
      setDados(dados);
      setErro(erro);
      setCarregando(false);

      // A IA é best-effort: se falhar ou demorar, o card cai no fallback
      // estático do Radar e a tela continua 100% funcional.
      if (ANALISE_DIARIA_ATIVA) {
        const analise = await buscarAnaliseIa();
        if (!ativo) return;
        setAnaliseMentor(analise);
        setAnaliseCarregando(false);
      } else {
        setAnaliseCarregando(false);
      }
    }
    void carregar();
    return () => {
      ativo = false;
    };
  }, [perfilId, tentativa]);

  // Retorno após ausência (≥7 dias sem login): substitui o card do mentor
  // pausado por uma tela de boas-vindas com o motivo pessoal. Registra em
  // motivo_exibicoes 1x por dia — em remontagens do mesmo dia o ausenteDias
  // já vem zerado (o RPC de login rodou no primeiro acesso do dia).
  useEffect(() => {
    if (
      ausenteDias === null ||
      ausenteDias < DIAS_MINIMOS_PARA_RETORNO ||
      retornoRegistradoRef.current
    ) {
      return;
    }
    let ativo = true;
    async function prepararRetorno() {
      const motivo = await carregarMotivoPessoal(perfilId);
      if (!ativo) return;
      const texto = textoMotivo(motivo);
      if (!texto) return;
      retornoRegistradoRef.current = true;
      setRetornoMotivo(texto);
      void registrarMotivoExibido(perfilId, "retorno_apos_ausencia");
    }
    void prepararRetorno();
    return () => {
      ativo = false;
    };
  }, [ausenteDias, perfilId]);

  if (carregando) {
    return (
      <Layout>
        <CartaoCarregando texto="Montando sua Sala de Guerra…" className="py-32" />
      </Layout>
    );
  }

  if (erro || !dados) {
    return (
      <Layout>
        <CartaoErro
          mensagem="Não foi possível montar sua Sala de Guerra agora. Verifique sua conexão e tente novamente."
          onTentar={() => setTentativa((t) => t + 1)}
        />
      </Layout>
    );
  }

  // Boas-vindas de retorno: exibida no lugar do card do mentor quando o
  // aluno volta depois de 7+ dias fora e tem motivo pessoal registrado.
  if (retornoMotivo) {
    return (
      <Layout>
        <div className="flex flex-col gap-3">
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl">
            <Radar className="h-6 w-6 text-primary" />
            Sala de Guerra
          </h1>
          <div className="rounded-2xl border border-primary/50 bg-gradient-to-b from-primary/20 via-card to-card p-6">
            <div className="flex items-start justify-between gap-2">
              <p className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Heart className="h-4 w-4" />
                Que bom te ver de volta!
              </p>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setRetornoMotivo(null)}
                className="-mr-1 -mt-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-foreground/90">
              Você começou esse plano porque queria:{" "}
              <span className="font-medium text-primary">{retornoMotivo}</span>. Sua missão da
              Semana {dados.semanaAtual} ainda está esperando.
            </p>
            <Button asChild className="mt-5">
              <Link to={`/semana/${dados.semanaAtual}`}>
                Continuar de onde parei
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl">
            <Radar className="h-6 w-6 text-primary" />
            Sala de Guerra
          </h1>
          <div className="flex items-center gap-2">
            {dados.escudoAtual && (
              <Badge
                variant="outline"
                className="gap-1.5"
                style={{
                  borderColor: `${dados.escudoAtual.cor_hex}66`,
                  color: dados.escudoAtual.cor_hex,
                }}
              >
                <Shield className="h-3.5 w-3.5" style={{ color: dados.escudoAtual.cor_hex }} />
                {dados.escudoAtual.titulo}
              </Badge>
            )}
            <Badge variant="outline" className="border-primary/50 text-primary">
              Semana {dados.semanaAtual} de 12
            </Badge>
          </div>
        </div>

        {/* Topo: contexto geral — tempo + implantação */}
        <section className="grid grid-cols-2 gap-3">
          <CartaoContexto
            icone={<CalendarDays className="h-3.5 w-3.5 text-primary" />}
            rotulo="Dias restantes"
            valor={dados.diasRestantes !== null ? String(dados.diasRestantes) : "—"}
            sufixo="dias no plano"
          />
          <div className="rounded-2xl border border-primary/40 bg-card p-4">
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              Implantação
            </p>
            <div className="mt-2 text-3xl font-bold text-primary">{dados.percentualImplantacao}%</div>
            <Progress value={dados.percentualImplantacao} className="mt-3 h-2" />
            <p className="mt-1.5 text-xs text-muted-foreground">
              {Math.round((dados.percentualImplantacao / 100) * 12)} de 12 semanas concluídas
            </p>
          </div>
        </section>

        {/* Mensagem do mentor (IA) — com fallback estático do Radar.
            Pausada enquanto ANALISE_DIARIA_ATIVA = false. */}
        {ANALISE_DIARIA_ATIVA && (
          <CartaoMentor
            analise={analiseMentor}
            dados={dados}
            carregando={analiseCarregando}
          />
        )}

        {/* Meio: o que fazer hoje */}
        <section className="flex flex-col gap-3">
          <CartaoMissaoDoDia
            missao={dados.missaoDoDia}
            emDia={dados.todasMissoesConcluidas}
            numero={dados.semanaAtual}
          />
          {dados.recomendacaoRadar && <CartaoRecomendacao alerta={dados.recomendacaoRadar} />}
          {dados.alertaPrioritario && !dados.recomendacaoRadar && (
            <CartaoAlerta alerta={dados.alertaPrioritario} />
          )}
        </section>

        {/* Base: motivação — streak, conquista, chave */}
        <section className="grid grid-cols-3 gap-3">
          <CartaoMotivacao
            icone={<Flame className="h-4 w-4 text-orange-400" />}
            rotulo="Streak"
            valor={String(dados.streak)}
            sufixo="dias seguidos"
          />
          <CartaoMotivacao
            icone={<Award className="h-4 w-4 text-yellow-400" />}
            rotulo="Conquista"
            valor={dados.proximaConquista ? "Próxima" : "—"}
            sufixo={dados.proximaConquista?.titulo ?? "Todas desbloqueadas"}
          />
          <CartaoProximaChave
            proxima={dados.proximaChave}
            ultimaChave={[...dados.chaves].sort((a, b) => b.ordem - a.ordem)[0]}
          />
        </section>

        <div className="pt-1">
          <Link to="/chaves" className="text-sm text-primary hover:underline">
            <span className="mr-1">Ver minhas chaves e escudo</span>
          </Link>
          <span className="mx-2 text-muted-foreground/40">·</span>
          <Link to="/minha-empresa" className="text-sm text-primary hover:underline">
            Minha Empresa
          </Link>
        </div>

        <div className="pt-1">
          <Link to="/dashboard" className="text-sm text-primary hover:underline">
            Ir para o painel completo de semanas
          </Link>
        </div>
      </div>
    </Layout>
  );
}

function CartaoContexto({
  icone,
  rotulo,
  valor,
  sufixo,
}: {
  icone: React.ReactNode;
  rotulo: string;
  valor: string;
  sufixo: string;
}) {
  return (
    <div className="rounded-2xl border border-primary/40 bg-card p-4">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {icone}
        {rotulo}
      </p>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-3xl font-bold text-primary">{valor}</span>
        <span className="text-xs text-muted-foreground">{sufixo}</span>
      </div>
    </div>
  );
}

function CartaoMissaoDoDia({
  missao,
  emDia,
  numero,
}: {
  missao: DadosSala["missaoDoDia"];
  emDia: boolean;
  numero: number;
}) {
  if (emDia || !missao) {
    return (
      <div className="rounded-2xl border border-primary/40 bg-gradient-to-r from-primary/20 to-transparent p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Target className="h-4 w-4" />
          Missão do dia
        </p>
        <p className="mt-1.5 text-sm text-foreground/80">
          Você está em dia! Aproveite para revisar o conteúdo da próxima semana e manter o
          ritmo dos 90 dias.
        </p>
      </div>
    );
  }
  const destino = `/semana/${numero}`;
  return (
    <div className="relative rounded-2xl border border-primary/50 bg-gradient-to-b from-primary/20 to-transparent p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Target className="h-4 w-4" />
          Missão do dia
        </p>
        <Badge variant={missao.concluida ? "sucesso" : "pendente"}>
          {missao.concluida ? "Concluída" : "Pendente"}
        </Badge>
      </div>
      <p className="mt-1.5 text-sm font-medium leading-relaxed">{missao.descricao}</p>
      <Button asChild className="relative z-10 mt-3 w-full sm:w-auto">
        <Link to={destino}>
          Continuar Semana {numero}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
      <Link
        to={destino}
        aria-label={`Continuar a Semana ${numero}`}
        className="after:absolute after:inset-0 after:rounded-2xl"
      />
    </div>
  );
}

function CartaoRecomendacao({ alerta }: { alerta: AlertaRadar }) {
  return (
    <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-amber-400">
        <AlertTriangle className="h-4 w-4" />
        Recomendação do Radar
      </p>
      <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
        {alerta.mensagem}
      </p>
      {alerta.missaoSugerida && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
          <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          {alerta.missaoSugerida}
        </p>
      )}
    </div>
  );
}

function CartaoAlerta({ alerta }: { alerta: AlertaRadar }) {
  return (
    <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-red-400">
        <AlertTriangle className="h-4 w-4" />
        Atenção hoje
      </p>
      <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
        {alerta.mensagem}
      </p>
    </div>
  );
}

function CartaoMotivacao({
  icone,
  rotulo,
  valor,
  sufixo,
}: {
  icone: React.ReactNode;
  rotulo: string;
  valor: string;
  sufixo: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-primary/40 bg-card p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {icone}
        {rotulo}
      </p>
      <p className={cn("text-xl font-bold leading-tight text-foreground")}>{valor}</p>
      <p className="line-clamp-3 text-xs leading-snug text-muted-foreground">{sufixo}</p>
    </div>
  );
}

function CartaoProximaChave({
  proxima,
  ultimaChave,
}: {
  proxima: DadosSala["proximaChave"];
  ultimaChave: DadosSala["chaves"][number] | undefined;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-primary/40 bg-card p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <KeyRound className="h-4 w-4 text-primary" />
        Próxima chave
      </p>
      <p className="text-xl font-bold leading-tight text-primary">{proxima?.titulo ?? "—"}</p>
      <p className="line-clamp-3 text-xs leading-snug text-muted-foreground">
        {proxima
          ? "Alcance os 4 pilares: faturamento validado, IME, IE e missões."
          : ultimaChave
            ? `Você conquistou todas as chaves, até a ${ultimaChave.titulo}!`
            : "Complete os 4 pilares para destravar chaves."}
      </p>
    </div>
  );
}

// ------------------------------------------------------------------
// Mensagem do mentor — AI narra os mesmos fatos que o Radar já mostra.
// Sempre exibe um texto (IA ou fallback determinístico) para nunca
// quebrar a tela nem ficar em loading infinito.
// ------------------------------------------------------------------
function textoMentorFallback(dados: DadosSala): string {
  const alerta = dados.recomendacaoRadar ?? dados.alertaPrioritario;
  if (alerta) return alerta.mensagem;
  if (dados.missaoDoDia?.descricao) {
    return `Hoje, mantenha o foco na missão: ${dados.missaoDoDia.descricao}`;
  }
  return "Você está em dia com a sua implantação. Mantenha o ritmo da semana atual e continue os 90 dias.";
}

function CartaoMentor({
  analise,
  dados,
  carregando,
}: {
  analise: AnaliseIa | null;
  dados: DadosSala;
  carregando: boolean;
}) {
  const texto = analise?.texto.trim() ? analise.texto : textoMentorFallback(dados);
  const ehIa = analise !== null && analise.origem !== "fallback" && Boolean(analise.texto.trim());

  return (
    <div className="rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/15 via-card to-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-primary">
          <MessagesSquare className="h-4 w-4" />
          Mensagem do seu mentor
        </p>
        {carregando ? (
          <Badge variant="outline" className="gap-1.5 text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            gerando…
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className={ehIa ? "border-primary/50 text-primary" : "text-muted-foreground"}
          >
            {ehIa ? "Personalizada por IA" : "Com base no seu Radar"}
          </Badge>
        )}
      </div>
      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/90">{texto}</p>
    </div>
  );
}