import { AlertCircle, Check, Copy, KeyRound, Loader2, UserPlus } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
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
import { supabase } from "@/lib/supabase";

interface ResultadoAcesso {
  email: string;
  senhaTemporaria: string;
  nome: string;
}

export function PaginaAdminNovoAcesso() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoAcesso | null>(null);
  const [copiado, setCopiado] = useState<"senha" | null>(null);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setResultado(null);
    setCriando(true);
    try {
      const { data, error } = await supabase.functions.invoke("criar-acesso", {
        body: { nome, email, telefone },
      });
      if (error) {
        throw new Error(
          "Não foi possível chamar a função criar-acesso. Verifique se ela está publicada no Supabase."
        );
      }
      const retorno = data as Partial<ResultadoAcesso> & { erro?: string };
      if (retorno.erro) throw new Error(retorno.erro);
      if (!retorno.email || !retorno.senhaTemporaria) {
        throw new Error("Resposta inesperada da função. Tente novamente.");
      }
      setResultado(retorno as ResultadoAcesso);
      setNome("");
      setEmail("");
      setTelefone("");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Algo deu errado. Tente novamente.");
    } finally {
      setCriando(false);
    }
  }

  async function copiarSenha() {
    if (!resultado) return;
    try {
      await navigator.clipboard.writeText(resultado.senhaTemporaria);
      setCopiado("senha");
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      setErro("Não foi possível copiar. Copie manualmente abaixo.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-4 w-4 text-primary" />
            Criar acesso de aluno
          </CardTitle>
          <CardDescription>
            O sistema cria a conta com uma senha temporária. Envie os dados por WhatsApp ou
            e-mail — a senha não aparece de novo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={criar} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                required
                autoComplete="off"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome do aluno"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="aluno@email.com"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="telefone">Telefone (opcional)</Label>
              <Input
                id="telefone"
                autoComplete="off"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>
            {erro && (
              <p className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {erro}
              </p>
            )}
            <Button type="submit" disabled={criando} className="w-fit">
              {criando && <Loader2 className="animate-spin" />}
              Criar acesso
            </Button>
          </form>
        </CardContent>
      </Card>

      {resultado && (
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-primary">
              <KeyRound className="h-4 w-4" />
              Acesso criado — envie agora
            </CardTitle>
            <CardDescription>
              Copie a senha e envie para {resultado.nome} por WhatsApp ou e-mail.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">E-mail de acesso</Label>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-input px-3 py-2">
                <span className="text-sm">{resultado.email}</span>
                <Badge variant="sucesso">Liberado</Badge>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Senha temporária</Label>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-input px-3 py-2">
                <span className="font-mono text-sm tracking-wide">
                  {resultado.senhaTemporaria}
                </span>
                <Button type="button" variant="outline" size="sm" onClick={() => void copiarSenha()}>
                  {copiado === "senha" ? <Check /> : <Copy />}
                  {copiado === "senha" ? "Copiada!" : "Copiar"}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              O aluno troca a senha depois, se quiser, pelo link "Esqueci minha senha" na tela
              de login.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
