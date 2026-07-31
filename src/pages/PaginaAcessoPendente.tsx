import { Clock } from "lucide-react";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

export function PaginaAcessoPendente() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mb-8">
        <Logo className="scale-110" />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Clock className="h-5 w-5 text-primary" />
            Acesso em análise
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
          <p>
            Sua conta está criada, mas o acesso à plataforma ainda não foi liberado.
            Ele é liberado manualmente após a confirmação da sua compra.
          </p>
          <p>
            Se você já efetuou a compra, aguarde um pouco e tente novamente em instantes
            ou entre em contato com o suporte.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              void supabase.auth.signOut();
              window.location.reload();
            }}
          >
            Sair e tentar de novo depois
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
