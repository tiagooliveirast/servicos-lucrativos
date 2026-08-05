import { useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COMO_USAR_ESTE_PLANO, ESTADOS, PARA_QUEM_E_ESTE_PLANO, TEMPO_MERCADO_OPCOES } from "@/lib/conteudo";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface DadosOnboarding {
  nome: string;
  whatsapp: string;
  telefone: string;
  cidade: string;
  estado: string;
  email_refriclube: string;
  nome_empresa: string;
  area_atuacao: string;
  tempo_mercado: string;
  possui_cnpj: string;
  possui_funcionarios: string;
  trabalha_sozinho: string;
  faturamento_atual: string;
  lucro_atual: string;
  qtd_clientes: string;
  ticket_medio: string;
  numero_orcamentos: string;
}

const INICIAL: DadosOnboarding = {
  nome: "",
  whatsapp: "",
  telefone: "",
  cidade: "",
  estado: "",
  email_refriclube: "",
  nome_empresa: "",
  area_atuacao: "",
  tempo_mercado: "",
  possui_cnpj: "",
  possui_funcionarios: "",
  trabalha_sozinho: "",
  faturamento_atual: "",
  lucro_atual: "",
  qtd_clientes: "",
  ticket_medio: "",
  numero_orcamentos: "",
};

const PASSOS = [
  { titulo: "Para começar", descricao: "Leia com atenção antes de iniciar o plano." },
  { titulo: "Seus dados", descricao: "Como você quer ser chamado e como entramos em contato." },
  { titulo: "Sua empresa", descricao: "O básico do seu negócio para o diagnóstico." },
  { titulo: "Situação financeira", descricao: "Os números de hoje — honestos, sem vergonha." },
];

function BotaoSimNao({
  valor,
  aoMudar,
}: {
  valor: string;
  aoMudar: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {["sim", "nao"].map((opcao) => (
        <button
          key={opcao}
          type="button"
          onClick={() => aoMudar(opcao)}
          className={cn(
            "rounded-md border px-3 py-2 text-sm font-medium transition-colors",
            valor === opcao
              ? "border-primary bg-primary text-primary-foreground"
              : "border-input text-muted-foreground hover:bg-accent"
          )}
        >
          {opcao === "sim" ? "Sim" : "Não"}
        </button>
      ))}
    </div>
  );
}

export function PaginaOnboarding({ aoConcluir }: { aoConcluir: () => void }) {
  const [passo, setPasso] = useState(0);
  const [dados, setDados] = useState<DadosOnboarding>(INICIAL);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  function atualizar(campo: keyof DadosOnboarding, valor: string) {
    setDados((d) => ({ ...d, [campo]: valor }));
  }

  function passar() {
    setErro(null);
    if (!validarPasso(passo, dados)) {
      setErro("Preencha todos os campos obrigatórios para continuar.");
      return;
    }
    setPasso((p) => Math.min(p + 1, PASSOS.length - 1));
  }

  function voltar() {
    setErro(null);
    setPasso((p) => Math.max(p - 1, 0));
  }

  async function concluir() {
    if (!validarPasso(3, dados)) {
      setErro("Preencha os campos obrigatórios antes de começar.");
      return;
    }
    setErro(null);
    setSalvando(true);
    try {
      const { data: sessao } = await supabase.auth.getSession();
      const user = sessao.session?.user;
      if (!user) throw new Error("Sessão expirada. Entre novamente.");

      const perfil = {
        id: user.id,
        nome: dados.nome.trim() || null,
        whatsapp: dados.whatsapp.trim() || null,
        telefone: dados.telefone.trim() || null,
        cidade: dados.cidade.trim() || null,
        estado: dados.estado || null,
        email_refriclube: dados.email_refriclube.trim() || null,
      };
      const { error: erroPerfil } = await supabase
        .from("perfis")
        .upsert(perfil);
      if (erroPerfil) throw erroPerfil;

      const diagnostico = {
        user_id: user.id,
        nome_empresa: dados.nome_empresa.trim() || null,
        area_atuacao: dados.area_atuacao.trim() || null,
        tempo_mercado: dados.tempo_mercado || null,
        possui_cnpj: dados.possui_cnpj === "sim",
        possui_funcionarios: dados.possui_funcionarios === "sim",
        trabalha_sozinho: dados.trabalha_sozinho === "sim",
        faturamento_atual: numero(dados.faturamento_atual),
        lucro_atual: numero(dados.lucro_atual),
        qtd_clientes: inteiro(dados.qtd_clientes),
        ticket_medio: numero(dados.ticket_medio),
        numero_orcamentos: inteiro(dados.numero_orcamentos),
      };
      const { error: erroDiag } = await supabase
        .from("diagnostico_inicial")
        .upsert(diagnostico, { onConflict: "user_id" });
      if (erroDiag) throw erroDiag;

      const semanas = Array.from({ length: 12 }, (_, i) => ({
        user_id: user.id,
        semana: i + 1,
        status: i === 0 ? ("em_andamento" as const) : ("bloqueada" as const),
      }));
      const { error: erroSemanas } = await supabase
        .from("progresso_semanas")
        .upsert(semanas, { onConflict: "user_id,semana" });
      if (erroSemanas) throw erroSemanas;

      aoConcluir();
    } catch (err) {
      setErro(
        err instanceof Error
          ? err.message
          : "Não foi possível salvar. Verifique sua conexão e tente de novo."
      );
      setSalvando(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="mb-6">
        <Logo className="scale-110" />
      </div>
      <div className="mb-6 flex w-full max-w-xl items-center gap-2">
        {PASSOS.map((p, i) => (
          <div
            key={p.titulo}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i <= passo ? "bg-primary" : "bg-secondary"
            )}
          />
        ))}
      </div>
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle className="text-xl">{PASSOS[passo].titulo}</CardTitle>
          <CardDescription>{PASSOS[passo].descricao}</CardDescription>
        </CardHeader>
        <CardContent>
          {passo === 0 && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold text-primary">Para quem é este plano</p>
                {PARA_QUEM_E_ESTE_PLANO.map((paragrafo) => (
                  <p key={paragrafo.slice(0, 40)} className="text-sm leading-relaxed text-foreground/90">
                    {paragrafo}
                  </p>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold text-primary">Como usar este plano</p>
                <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-foreground/90">
                  {COMO_USAR_ESTE_PLANO.map((item) => (
                    <li key={item.slice(0, 40)}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {passo === 1 && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="nome">
                  Nome completo <span className="text-primary">*</span>
                </Label>
                <Input
                  id="nome"
                  value={dados.nome}
                  onChange={(e) => atualizar("nome", e.target.value)}
                  placeholder="Como você se chama"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="whatsapp">
                  WhatsApp (com DDD) <span className="text-primary">*</span>
                </Label>
                <Input
                  id="whatsapp"
                  value={dados.whatsapp}
                  onChange={(e) => atualizar("whatsapp", e.target.value)}
                  placeholder="(00) 00000-0000"
                />
                <p className="text-xs text-muted-foreground">
                  É por ele que a gente entra em contato se precisar te chamar.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="telefone">Telefone fixo (opcional)</Label>
                  <Input
                    id="telefone"
                    value={dados.telefone}
                    onChange={(e) => atualizar("telefone", e.target.value)}
                    placeholder="(00) 0000-0000"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    value={dados.cidade}
                    onChange={(e) => atualizar("cidade", e.target.value)}
                    placeholder="Sua cidade"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Estado</Label>
                <Select value={dados.estado} onValueChange={(v) => atualizar("estado", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS.map((uf) => (
                      <SelectItem key={uf} value={uf}>
                        {uf}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="email_refriclube">E-mail que usa no Refriclube</Label>
                <Input
                  id="email_refriclube"
                  type="email"
                  value={dados.email_refriclube}
                  onChange={(e) => atualizar("email_refriclube", e.target.value)}
                  placeholder="opcional"
                />
                <p className="text-xs text-muted-foreground">
                  Se você usa o Refriclube, informe o e-mail cadastrado lá para preparar a
                  sincronização automática no futuro.
                </p>
              </div>
            </div>
          )}

          {passo === 2 && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="nome_empresa">
                  Nome da empresa <span className="text-primary">*</span>
                </Label>
                <Input
                  id="nome_empresa"
                  value={dados.nome_empresa}
                  onChange={(e) => atualizar("nome_empresa", e.target.value)}
                  placeholder="Nome fantasia ou seu nome"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="area_atuacao">
                  Área de atuação <span className="text-primary">*</span>
                </Label>
                <Input
                  id="area_atuacao"
                  value={dados.area_atuacao}
                  onChange={(e) => atualizar("area_atuacao", e.target.value)}
                  placeholder="ex.: refrigeração, elétrica, hidráulica…"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Há quanto tempo atua no mercado?</Label>
                <Select
                  value={dados.tempo_mercado}
                  onValueChange={(v) => atualizar("tempo_mercado", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPO_MERCADO_OPCOES.map((opcao) => (
                      <SelectItem key={opcao} value={opcao}>
                        {opcao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-2">
                  <Label>Possui CNPJ?</Label>
                  <BotaoSimNao valor={dados.possui_cnpj} aoMudar={(v) => atualizar("possui_cnpj", v)} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Possui funcionários?</Label>
                  <BotaoSimNao valor={dados.possui_funcionarios} aoMudar={(v) => atualizar("possui_funcionarios", v)} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Trabalha sozinho?</Label>
                  <BotaoSimNao valor={dados.trabalha_sozinho} aoMudar={(v) => atualizar("trabalha_sozinho", v)} />
                </div>
              </div>
            </div>
          )}

          {passo === 3 && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="faturamento_atual">
                    Faturamento atual (R$/mês) <span className="text-primary">*</span>
                  </Label>
                  <Input
                    id="faturamento_atual"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={dados.faturamento_atual}
                    onChange={(e) => atualizar("faturamento_atual", e.target.value)}
                    placeholder="0,00"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="lucro_atual">Lucro atual (R$/mês)</Label>
                  <Input
                    id="lucro_atual"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={dados.lucro_atual}
                    onChange={(e) => atualizar("lucro_atual", e.target.value)}
                    placeholder="0,00"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="qtd_clientes">Quantidade de clientes</Label>
                  <Input
                    id="qtd_clientes"
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    value={dados.qtd_clientes}
                    onChange={(e) => atualizar("qtd_clientes", e.target.value)}
                    placeholder="ex.: 20"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="ticket_medio">Ticket médio (R$)</Label>
                  <Input
                    id="ticket_medio"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={dados.ticket_medio}
                    onChange={(e) => atualizar("ticket_medio", e.target.value)}
                    placeholder="0,00"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="numero_orcamentos">Número de orçamentos no último mês</Label>
                <Input
                  id="numero_orcamentos"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={dados.numero_orcamentos}
                  onChange={(e) => atualizar("numero_orcamentos", e.target.value)}
                  placeholder="ex.: 15"
                />
              </div>
              <p className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
                Seja honesto: o diagnóstico inicial só funciona com números reais.
              </p>
            </div>
          )}

          {erro && (
            <p className="mt-4 flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {erro}
            </p>
          )}

          <div className="mt-6 flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={voltar}
              disabled={passo === 0 || salvando}
            >
              <ArrowLeft />
              Voltar
            </Button>
            {passo < 3 ? (
              <Button type="button" onClick={passar}>
                Continuar
                <ArrowRight />
              </Button>
            ) : (
              <Button type="button" onClick={() => void concluir()} disabled={salvando}>
                {salvando && <Loader2 className="animate-spin" />}
                Começar o Plano
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function validarPasso(passo: number, dados: DadosOnboarding): boolean {
  if (passo === 0) {
    return true;
  }
  if (passo === 1) {
    return dados.nome.trim().length > 0 && dados.whatsapp.trim().length > 0;
  }
  if (passo === 2) {
    if (!dados.nome_empresa.trim() || !dados.area_atuacao.trim()) return false;
    if (!dados.possui_cnpj || !dados.possui_funcionarios || !dados.trabalha_sozinho) return false;
    return true;
  }
  if (passo === 3) {
    return dados.faturamento_atual !== "";
  }
  return true;
}

function numero(valor: string): number | null {
  if (valor === "") return null;
  const n = Number(valor.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function inteiro(valor: string): number | null {
  if (valor === "") return null;
  const n = Number(valor);
  return Number.isInteger(n) && n >= 0 ? n : null;
}
