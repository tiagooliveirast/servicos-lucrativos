import { Ban, Mail, MessageCircle } from "lucide-react";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CONTATO_SUPORTE } from "@/lib/contato";
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
            fale com o suporte:
          </p>
          {(CONTATO_SUPORTE.whatsapp || CONTATO_SUPORTE.email) && (
            <div className="flex flex-wrap items-center gap-3">
              {CONTATO_SUPORTE.whatsapp && (
                <a href={CONTATO_SUPORTE.whatsappUrl} target="_blank" rel="noreferrer">
                  <Button variant="outline" className="w-full sm:w-auto">
                    <MessageCircle className="h-4 w-4" />
                    Falar no WhatsApp
                  </Button>
                </a>
              )}
              {CONTATO_SUPORTE.email && (
                <a href={`mailto:${CONTATO_SUPORTE.email}`}>
                  <Button variant="outline" className="w-full sm:w-auto">
                    <Mail className="h-4 w-4" />
                    {CONTATO_SUPORTE.email}
                  </Button>
                </a>
              )}
            </div>
          )}
          <Button
            variant="ghost"
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
