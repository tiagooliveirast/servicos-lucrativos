import { useState } from "react";
import { AlertCircle, CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

export function PaginaNovaSenha() {
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [concluida, setConcluida] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (senha.length < 6) {
      setErro("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== confirmacao) {
      setErro("As senhas não conferem.");
      return;
    }
    setSalvando(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: senha });
      if (error) throw new Error(traduzirErro(error.message));
      setConcluida(true);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível trocar a senha. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  if (concluida) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <div className="mb-8">
          <Logo className="scale-110" />
        </div>
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              Senha atualizada!
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
            <p>Sua nova senha já está valendo. Use-a da próxima vez que entrar.</p>
            <Button onClick={() => navigate("/")} className="w-full">
              Ir para minha conta
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mb-8">
        <Logo className="scale-110" />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <KeyRound className="h-5 w-5 text-primary" />
            Criar nova senha
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={enviar} className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Escolha uma senha nova para acessar a plataforma.
            </p>
            <div className="flex flex-col gap-2">
              <Label htmlFor="senha">Nova senha</Label>
              <Input
                id="senha"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="mínimo 6 caracteres"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirmacao">Confirmar nova senha</Label>
              <Input
                id="confirmacao"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                placeholder="repita a senha"
              />
            </div>
            {erro && (
              <p className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {erro}
              </p>
            )}
            <Button type="submit" disabled={salvando} className="w-full">
              {salvando && <Loader2 className="animate-spin" />}
              Salvar nova senha
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function traduzirErro(mensagem: string): string {
  if (mensagem.includes("Password should be at least 6 characters")) {
    return "A senha precisa ter pelo menos 6 caracteres.";
  }
  return mensagem;
}
