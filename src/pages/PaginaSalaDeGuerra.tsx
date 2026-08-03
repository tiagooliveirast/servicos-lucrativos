import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Award,
  CalendarDays,
  Flame,
  Loader2,
  Radar,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";

import { Layout } from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { AlertaRadar } from "@/lib/regras-radar";
import {
  carregarSalaDeGuerra,
  LIMIARES_CHAVES,
  type SalaDeGuerra as DadosSala,
} from "@/lib/sala-de-guerra";
import { cn } from "@/lib/utils";

export function PaginaSalaDeGuerra({ perfilId }: { perfilId: string }) {
  const [dados, setDados] = useState<DadosSala | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro(false);
    async function carregar() {
      const { dados, erro } = await carregarSalaDeGuerra(perfilId);
      if (!ativo) return;
      setDados(dados);
      setErro(erro);
      setCarregando(false);
    }
    void carregar();
    return () => {
      ativo = false;
    };
  }, [perfilId, tentativa]);

  if (carregando) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center gap-4 py-32 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Montando sua Sala de Guerra…</p>
        </div>
      </Layout>
    );
  }

  if (erro || !dados) {
    return (
      <Layout>
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 px-6 py-12 text-center">
          <AlertTriangle className="h-6 w-6 text-destructive" />
          <p className="text-sm text-foreground/90">
            Não foi possível montar sua Sala de Guerra agora. Verifique sua conexão e tente
            novamente.
          </p>
          <Button variant="outline" onClick={() => setTentativa((t) => t + 1)}>
            Tentar novamente
          </Button>
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
          <Badge variant="outline" className="border-primary/50 text-primary">
            Semana {dados.semanaAtual} de 12
          </Badge>
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

        {/* Meio: o que fazer hoje */}
        <section className="flex flex-col gap-3">
          <CartaoMissaoDoDia
            missao={dados.missaoDoDia}
            emDia={dados.todasMissoesConcluidas}
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
          <CartaoProximaChave ime={dados.imeAtual} proxima={dados.proximaChave} />
        </section>

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
}: {
  missao: DadosSala["missaoDoDia"];
  emDia: boolean;
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
  return (
    <div className="rounded-2xl border border-primary/50 bg-gradient-to-b from-primary/20 to-transparent p-4">
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
  ime,
  proxima,
}: {
  ime: number | null;
  proxima: DadosSala["proximaChave"];
}) {
  const faltam = ime !== null && proxima ? Math.max(0, proxima.ime - ime) : null;
  const ultimoLimiar = LIMIARES_CHAVES[LIMIARES_CHAVES.length - 1];
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-primary/40 bg-card p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <Trophy className="h-4 w-4 text-primary" />
        Próxima chave
      </p>
      <p className="text-xl font-bold leading-tight text-primary">{proxima?.cor ?? "—"}</p>
      <p className="line-clamp-3 text-xs leading-snug text-muted-foreground">
        {faltam !== null && proxima
          ? `Faltam ${faltam} pontos de IME${ime !== null ? ` (você tem ${ime})` : ""}`
          : ime !== null && proxima === null
            ? `IME ${ime} — você já conquistou a ${ultimoLimiar.cor}!`
            : ime === null
              ? "Complete seu primeiro IME para destravar chaves."
              : "—"}
      </p>
    </div>
  );
}