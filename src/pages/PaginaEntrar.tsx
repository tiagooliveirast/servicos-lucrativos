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

type Modo = "entrar" | "cadastrar";

export function PaginaEntrar() {
  const [modo, setModo] = useState<Modo>("entrar");
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
      if (modo === "entrar") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: senha,
        });
        if (error) throw new Error(traduzirErro(error.message));
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password: senha,
        });
        if (error) throw new Error(traduzirErro(error.message));
        setAvisos(
          "Conta criada! Enviamos um link de confirmação para o seu e-mail. Confirme antes de entrar."
        );
      }
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
          <CardTitle className="text-xl">
            {modo === "entrar" ? "Entrar na plataforma" : "Criar sua conta"}
          </CardTitle>
          <CardDescription>
            {modo === "entrar"
              ? "Acesse o seu Plano de 90 Dias."
              : "Cadastre-se para começar o seu Plano de 90 Dias."}
          </CardDescription>
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
                autoComplete={modo === "entrar" ? "current-password" : "new-password"}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="mínimo 6 caracteres"
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
              {modo === "entrar" ? "Entrar" : "Criar conta"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            {modo === "entrar" ? (
              <>
                Ainda não tem conta?{" "}
                <button
                  className="text-primary underline-offset-4 hover:underline"
                  onClick={() => {
                    setModo("cadastrar");
                    setErro(null);
                    setAvisos(null);
                  }}
                >
                  Cadastre-se
                </button>
              </>
            ) : (
              <>
                Já tem conta?{" "}
                <button
                  className="text-primary underline-offset-4 hover:underline"
                  onClick={() => {
                    setModo("entrar");
                    setErro(null);
                    setAvisos(null);
                  }}
                >
                  Entre agora
                </button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
      <p className="mt-6 max-w-sm text-center text-xs text-muted-foreground">
        O acesso é liberado após a confirmação da sua compra. Se acabou de se cadastrar,
        aguarde o e-mail de confirmação.
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
