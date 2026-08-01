import { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

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
import { supabase } from "@/lib/supabase";

export function PaginaEntrar() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [avisos, setAvisos] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setAvisos(null);
    setCarregando(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });
      if (error) throw new Error(traduzirErro(error.message));
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Algo deu errado. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  async function esqueciSenha() {
    if (!email) {
      setErro("Digite seu e-mail acima para receber o link de redefinição.");
      return;
    }
    setErro(null);
    setAvisos(null);
    setCarregando(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });
      if (error) throw new Error(traduzirErro(error.message));
      setAvisos(
        "Enviamos um link de redefinição de senha para o seu e-mail. Confira a caixa de entrada (e o spam)."
      );
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Algo deu errado. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mb-8">
        <Logo className="scale-110" />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Entrar na plataforma</CardTitle>
          <CardDescription>Acesse o seu Plano de 90 Dias.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={enviar} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                required
                minLength={6}
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="sua senha"
              />
            </div>
            {erro && (
              <p className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {erro}
              </p>
            )}
            {avisos && (
              <p className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary">
                {avisos}
              </p>
            )}
            <Button type="submit" disabled={carregando} className="w-full">
              {carregando && <Loader2 className="animate-spin" />}
              Entrar
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            <button
              className="text-primary underline-offset-4 hover:underline"
              onClick={() => void esqueciSenha()}
            >
              Esqueci minha senha
            </button>
          </div>
        </CardContent>
      </Card>
      <p className="mt-6 max-w-sm text-center text-xs text-muted-foreground">
        O acesso é liberado pelo time da Gestão Lucrativa após a confirmação da sua compra.
        Se ainda não recebeu suas credenciais, fale com quem te atendeu.
      </p>
    </div>
  );
}

function traduzirErro(mensagem: string): string {
  if (mensagem.includes("Invalid login credentials")) {
    return "E-mail ou senha incorretos.";
  }
  if (mensagem.includes("Email not confirmed")) {
    return "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada (e o spam).";
  }
  if (mensagem.includes("already registered")) {
    return "Este e-mail já está cadastrado. Tente entrar.";
  }
  if (mensagem.includes("Password should be at least 6 characters")) {
    return "A senha precisa ter pelo menos 6 caracteres.";
  }
  if (mensagem.includes("Unable to validate email address")) {
    return "E-mail inválido. Verifique e tente novamente.";
  }
  return mensagem;
}
