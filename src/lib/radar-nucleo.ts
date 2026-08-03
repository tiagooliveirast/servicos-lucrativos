import { executarRegras, type AlertaRadar, type DadosRadar } from "@/lib/regras-radar";
import { supabase } from "@/lib/supabase";
import type {
  DiagnosticoInicial,
  IndicadorSemana,
  Missao,
  PainelMensal,
  ProgressoSemana,
  RadarEvento,
} from "@/lib/types";

const MS_DIA = 24 * 60 * 60 * 1000;

/**
 * Núcleo do Radar da Empresa (fonte única).
 * Carrega os dados, roda as 8 regras e reconcilia o histórico
 * (radar_eventos) + atualiza ultimo_acesso_at — exatamente o que era
 * feito no useEffect do useRadar, agora reutilizável por qualquer tela.
 * A Regra 7 (usuario_inativo) lê o valor ANTIGO de ultimo_acesso_at,
 * por isso a escrita do acesso acontece depois do cálculo.
 */
export async function carregarRadarEAtualizar(userId: string): Promise<{
  alertas: AlertaRadar[];
  erro: boolean;
}> {
  const agora = new Date();

  const [rPerfil, rDiagnostico, rMissoes, rIndicadores, rSemanas, rPaineis, rEventos] =
    await Promise.all([
      supabase.from("perfis").select("ultimo_acesso_at").eq("id", userId).maybeSingle(),
      supabase
        .from("diagnostico_inicial")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("missoes").select("*").eq("user_id", userId),
      supabase.from("indicadores_semana").select("*").eq("user_id", userId),
      supabase.from("progresso_semanas").select("*").eq("user_id", userId),
      supabase.from("paineis_mensais").select("*").eq("user_id", userId),
      supabase.from("radar_eventos").select("*").eq("user_id", userId),
    ]);

  const falhou =
    rPerfil.error ||
    rDiagnostico.error ||
    rMissoes.error ||
    rIndicadores.error ||
    rSemanas.error ||
    rPaineis.error ||
    rEventos.error;
  if (falhou) return { alertas: [], erro: true };

  const dados: DadosRadar = {
    diagnostico: (rDiagnostico.data as DiagnosticoInicial | null) ?? null,
    semanas: (rSemanas.data ?? []) as ProgressoSemana[],
    missoes: (rMissoes.data ?? []) as Missao[],
    indicadores: (rIndicadores.data ?? []) as IndicadorSemana[],
    paineis: (rPaineis.data ?? []) as PainelMensal[],
    ultimoAcessoAt: (rPerfil.data as { ultimo_acesso_at: string | null } | null)?.ultimo_acesso_at ?? null,
    agora,
  };

  const alertas = executarRegras(dados);
  const eventos = (rEventos.data ?? []) as RadarEvento[];

  // A reconciliação é assíncrona, mas não bloqueia a exibição dos alertas.
  void reconciliar(alertas, eventos, userId, agora);

  return { alertas, erro: false };
}

async function reconciliar(
  alertas: AlertaRadar[],
  eventos: RadarEvento[],
  userId: string,
  agora: Date
) {
  const agoraISO = agora.toISOString();
  const idsParaResolver: string[] = [];
  const idsReutilizados = new Set<string>();
  const paraInserir: {
    user_id: string;
    regra_id: string;
    categoria: AlertaRadar["categoria"];
    mensagem: string;
    missao_sugerida: string | null;
  }[] = [];

  for (const alerta of alertas) {
    const existente = eventos.find((e) => !e.resolvido && e.regra_id === alerta.regraId);
    if (existente && agora.getTime() - new Date(existente.criado_em).getTime() < MS_DIA) {
      idsReutilizados.add(existente.id);
      continue;
    }
    paraInserir.push({
      user_id: userId,
      regra_id: alerta.regraId,
      categoria: alerta.categoria,
      mensagem: alerta.mensagem,
      missao_sugerida: alerta.missaoSugerida,
    });
  }

  for (const evento of eventos) {
    if (evento.resolvido) continue;
    const regraDisparou = alertas.some((a) => a.regraId === evento.regra_id);
    if (regraDisparou && idsReutilizados.has(evento.id)) continue;
    if (!regraDisparou) {
      idsParaResolver.push(evento.id);
    } else if (!idsReutilizados.has(evento.id)) {
      idsParaResolver.push(evento.id);
    }
  }

  const escritas: PromiseLike<unknown>[] = [];
  if (paraInserir.length > 0) {
    escritas.push(
      supabase
        .from("radar_eventos")
        .upsert(paraInserir, {
          onConflict: "user_id,regra_id,((criado_em AT TIME ZONE 'UTC')::date)",
          ignoreDuplicates: true,
        })
        .then(() => undefined)
    );
  }
  if (idsParaResolver.length > 0) {
    escritas.push(
      supabase
        .from("radar_eventos")
        .update({ resolvido: true, resolvido_em: agoraISO })
        .in("id", idsParaResolver)
        .then(() => undefined)
    );
  }
  // Registra o acesso atual — DEPOIS de calcular a Regra 7
  escritas.push(
    supabase
      .from("perfis")
      .update({ ultimo_acesso_at: agoraISO })
      .eq("id", userId)
      .then(() => undefined)
  );

  try {
    await Promise.all(escritas);
  } catch {
    // O radar continua visível mesmo se a gravação do histórico falhar.
  }
}