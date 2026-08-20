import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Loader2, PlayCircle, Video } from "lucide-react";

import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { extrairVideoId } from "@/lib/utils";
import {
  VIDEO_BOAS_VINDAS,
  VIDEO_COMO_FUNCIONA,
} from "@/lib/videos-institucionais";

// Tela exibida automaticamente uma única vez (após concluir o onboarding,
// antes da primeira visita à Sala de Guerra) e acessível a qualquer momento
// pelo link "Como funciona a plataforma" no rodapé.
export function PaginaBoasVindas({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const { atualizarPerfil } = useAuth();
  const [indo, setIndo] = useState(false);

  function irParaSalaDeGuerra() {
    setIndo(true);
    // Atualiza o perfil em memória ANTES de navegar: a rota "/" decide se
    // mostra a Sala de Guerra com base no perfil do contexto — se ficar
    // desatualizado, o usuário volta pra cá num loop.
    atualizarPerfil({ boas_vindas_vista: true });
    navigate("/");
    // Best-effort: persiste no banco pra nunca mais exibir automaticamente.
    // Se falhar, o aluno ainda é levado à Sala de Guerra.
    void supabase
      .from("perfis")
      .update({ boas_vindas_vista: true })
      .eq("id", userId);
  }

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            Boas-vindas ao Serviços Lucrativos
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Antes de entrar na Sala de Guerra, veja os dois vídeos abaixo: um é a sua
            apresentação pessoal, o outro mostra como a plataforma funciona. Quando
            terminar, é só seguir para a sua rotina dos 90 dias.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PlayCircle className="h-4 w-4 text-primary" />
              Vídeo de boas-vindas
            </CardTitle>
            <CardDescription>
              Sua apresentação e o que esperar do plano nos próximos 90 dias.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VideoInstitucional url={VIDEO_BOAS_VINDAS} titulo="Vídeo de boas-vindas" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PlayCircle className="h-4 w-4 text-primary" />
              Como funciona a plataforma
            </CardTitle>
            <CardDescription>
              Um tour rápido: Sala de Guerra, painel de semanas, check-in, relatórios e
              evolução — onde encontrar cada coisa.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VideoInstitucional url={VIDEO_COMO_FUNCIONA} titulo="Como funciona a plataforma" />
          </CardContent>
        </Card>

        <div className="flex flex-col items-center gap-2 rounded-2xl border border-primary/40 bg-gradient-to-r from-primary/15 via-card to-card p-6 text-center">
          <p className="text-sm font-semibold text-primary">
            Tudo pronto? Sua missão da Semana 1 já está esperando.
          </p>
          <Button onClick={irParaSalaDeGuerra} disabled={indo} className="h-11">
            {indo && <Loader2 className="animate-spin" />}
            Ir para a Sala de Guerra
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Layout>
  );
}

function VideoInstitucional({ url, titulo }: { url: string; titulo: string }) {
  const videoId = url ? extrairVideoId(url) : null;

  if (!videoId) {
    return (
      <div className="flex flex-col items-center gap-1.5 rounded-lg border border-dashed border-muted-foreground/40 px-4 py-10 text-center">
        <Video className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground/90">Vídeo em breve</p>
        <p className="text-xs text-muted-foreground">Este vídeo ainda não foi publicado.</p>
      </div>
    );
  }

  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg border border-input">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        title={titulo}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        className="h-full w-full"
      />
    </div>
  );
}
