import { Ban } from "lucide-react";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

export function PaginaAcessoInativo() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mb-8">
        <Logo className="scale-110" />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Ban className="h-5 w-5 text-destructive" />
            Seu acesso está inativo
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
          <p>
            Não foi possível continuar usando a plataforma. Se você acha que isso é um erro,
            fale com o suporte.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              void supabase.auth.signOut();
              window.location.reload();
            }}
          >
            Sair
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
