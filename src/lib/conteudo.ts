export interface Modulo {
  numero: number;
  titulo: string;
  dias: string;
  descricao: string;
}

export const MODULOS: Modulo[] = [
  {
    numero: 1,
    titulo: "Fundação Financeira",
    dias: "Dias 1 a 30",
    descricao:
      "Objetivo do módulo: sair do escuro financeiro. Ao final destes 30 dias você vai saber exatamente quanto precisa faturar, cobrar o preço certo, saber seu ticket médio e ter um painel pra acompanhar tudo isso mês a mês.",
  },
  {
    numero: 2,
    titulo: "Operação Lucrativa",
    dias: "Dias 31 a 60",
    descricao:
      "Objetivo do módulo: transformar sua operação em algo padronizado, que roda bem mesmo nos dias corridos, sem depender só da sua memória.",
  },
  {
    numero: 3,
    titulo: "Crescimento e Escala",
    dias: "Dias 61 a 90",
    descricao:
      "Objetivo do módulo: crescer com intenção. Captar mais, converter melhor, medir tudo, e decidir com clareza o que vem depois dos 90 dias.",
  },
];

export interface ColunaTabela {
  id: string;
  rotulo: string;
  tipo: "texto" | "numero";
}

export type Campo =
  | {
      id: string;
      rotulo: string;
      tipo: "texto" | "textarea" | "numero" | "data";
      obrigatorio?: boolean;
      dica?: string;
      exemplo?: string;
      placeholder?: string;
      /** Campos com o mesmo `lado` consecutivo são renderizados lado a lado. */
      lado?: string;
      /** Número de colunas da grade quando `lado` estiver definido. */
      grade?: number;
      /** Se definido, o grupo de campos com o mesmo valor renderiza dentro de uma caixa com este título. */
      caixa?: string;
    }
  | {
      id: string;
      rotulo: string;
      tipo: "tabela";
      colunas: ColunaTabela[];
      linhasMin: number;
      linhasMax: number;
      obrigatorio?: boolean;
      dica?: string;
      exemplo?: string;
    }
  | {
      id: string;
      rotulo: string;
      tipo: "tabela_fixa";
      linhas: { id: string; rotulo: string }[];
      dica?: string;
      exemplo?: string;
    }
  | {
      id: string;
      rotulo: string;
      tipo: "lista_itens";
      obrigatorio?: boolean;
      dica?: string;
      exemplo?: string;
      /** Rótulo do campo de descrição de cada linha (ex: "Descrição do gasto"). */
      rotuloItem?: string;
      /** Rótulo do campo de valor de cada linha (ex: "Valor (R$)"). */
      rotuloValor?: string;
      /** Se definido, cada linha ganha um seletor de tipo com estas opções. */
      tiposItem?: TipoItem[];
      /** Rótulo do seletor de tipo de cada linha (ex: "Tipo"). */
      rotuloTipo?: string;
      /** Campos com o mesmo `lado` consecutivo são renderizados lado a lado. */
      lado?: string;
      /** Número de colunas da grade quando `lado` estiver definido. */
      grade?: number;
    };

/** Categoria de um item de gasto da Semana 1 (lista única de gastos). */
export type TipoItem = "pessoal" | "fixa" | "variavel";

export const TIPO_ITEM_ROTULOS: Record<TipoItem, string> = {
  pessoal: "Pessoal",
  fixa: "Fixa",
  variavel: "Variável",
};

/** Item de um campo do tipo `lista_itens` — armazenado como array destes objetos. */
export interface ItemLista {
  descricao: string;
  valor: number;
  /** Categoria do item quando o campo tem `tiposItem` (padrão: "pessoal"). */
  tipo?: TipoItem;
}

export interface MissaoConteudo {
  tipo: "principal" | "rapida";
  descricao: string;
  /** Versão da missão para quem ainda está começando (não tem clientes/atendimentos recorrentes). */
  paraComecando?: string;
}

export interface IndicadorConteudo {
  nome: string;
  unidade: string;
  dica?: string;
}

export interface ItemDecisao {
  id: string;
  rotulo: string;
}

export interface SemanaConteudo {
  numero: number;
  titulo: string;
  tituloCurto: string;
  modulo: number;
  objetivo: string;
  explicacao: string[];
  dicas: { titulo: string; texto: string; exemplo?: string }[];
  rotuloSeccao?: string;
  campos: Campo[];
  camposAposMissoes?: Campo[];
  nota?: string;
  missoes: MissaoConteudo[];
  indicador?: IndicadorConteudo;
  checklistFinal: string;
  painelAoTerminar?: number;
  checklistDecisao?: { itens: ItemDecisao[]; sugestao: string };
  camposManual: string[];
}

// ------------------------------------------------------------------
// Textos fixos (aparecem uma vez, fora das semanas)
// ------------------------------------------------------------------

export const SUBTITULO_PRODUTO =
  "Guia prático para o prestador de serviço autônomo organizar a gestão, aumentar o faturamento e sair do caos financeiro em 90 dias.";

export const PARA_QUEM_E_ESTE_PLANO = [
  "Este material foi feito para o profissional autônomo prestador de serviço — qualquer área: beleza, estética, saúde, reformas, tecnologia, educação, consultoria, manutenção, ou qualquer outro ofício. Se você vive do seu trabalho e sente que trabalha demais e sobra pouco no fim do mês, este plano é para você.",
  "Este plano é o companheiro do curso. Cada semana aqui corresponde a uma aula do curso Serviços Lucrativos — a aula ensina o conceito, esta página é onde você aplica no seu próprio negócio. Não pule para o plano sem assistir a aula da semana primeiro.",
];

export const COMO_USAR_ESTE_PLANO = [
  "Assista a aula da semana primeiro. Depois, abra esta página e preencha.",
  "Cada semana termina com uma Missão prática — não é opcional, é o que gera a mudança real.",
  "Sempre que houver um Indicador da semana, registre o número antes de começar e depois de aplicar.",
  "A cada 30 dias, você para para preencher o Painel Mensal — isso mostra sua evolução em números.",
  "Não existe resposta errada. O objetivo é registrar sua realidade, não uma realidade ideal.",
  "Reserve sempre o mesmo dia da semana para isso. 20 a 30 minutos já bastam.",
];

export const TEXTO_FECHAMENTO =
  "Este plano funciona para qualquer profissional autônomo prestador de serviço, independente da área de atuação. O que muda de um profissional para outro são os detalhes técnicos do ofício — o processo de organizar, precificar, converter e crescer é o mesmo.";

// ------------------------------------------------------------------
// As 12 semanas
// ------------------------------------------------------------------

const SERVICO_1 = "Serviço 1";
const SERVICO_2 = "Serviço 2";
const SERVICO_3 = "Serviço 3";

export const SEMANAS: SemanaConteudo[] = [
  {
    numero: 1,
    titulo: "Diagnóstico Financeiro Completo",
    tituloCurto: "Diagnóstico financeiro",
    modulo: 1,
    objetivo: "sair do escuro e saber exatamente seu número real",
    explicacao: [
      "Antes de organizar qualquer coisa, você precisa saber onde está pisando. Vamos juntar, numa única semana, tudo que forma o seu diagnóstico financeiro completo.",
    ],
    dicas: [
      {
        titulo: "Dica de preenchimento 1",
        texto: "Liste cada gasto uma única vez e escolha o tipo de cada um: Pessoal (sua vida), Fixa ou Variável (do negócio). Nada se repete.",
        exemplo:
          "Aluguel de casa R$ 900 (Pessoal) + mercado R$ 600 (Pessoal) + aluguel da oficina R$ 500 (Fixa) + combustível R$ 300 (Variável)",
      },
      {
        titulo: "Dica de preenchimento 2",
        texto: "Os gastos do negócio são só o que você gasta por causa do trabalho: ferramentas, combustível, materiais, manutenção, aluguel de sala, se tiver. Eles entram na mesma lista, marcados como Fixa ou Variável.",
      },
      {
        titulo: "Dica de preenchimento 3",
        texto: "Despesa fixa é o que você paga todo mês sem variar. Despesa variável muda conforme o volume de trabalho (combustível, material usado por serviço).",
      },
      {
        titulo: "Dica de preenchimento 4",
        texto: "Some tudo acima e adicione a margem de lucro que você quer. Esse é seu Número de Sobrevivência — sua meta mínima todo mês.",
        exemplo: "R$ 2.150 + R$ 850 + R$ 1.000 de lucro desejado = R$ 4.000 de meta mínima mensal",
      },
    ],
    campos: [
      {
        id: "gastos_itens",
        rotulo: "Meus gastos do mês",
        tipo: "lista_itens",
        obrigatorio: true,
        tiposItem: ["pessoal", "fixa", "variavel"],
        rotuloTipo: "Tipo",
        dica: "Cada gasto entra uma única vez — nada se repete. Escolha o tipo de cada item: Pessoal (sua vida), Fixa (do negócio, igual todo mês) ou Variável (do negócio, muda conforme o trabalho).",
        exemplo:
          "Aluguel de casa — R$ 900 (Pessoal) · Aluguel da oficina — R$ 500 (Fixa) · Combustível — R$ 300 (Variável)",
        rotuloItem: "O que é o gasto",
        rotuloValor: "Valor mensal",
      },
      {
        id: "f1_custo_vida",
        rotulo: "Custo de vida",
        tipo: "numero",
        obrigatorio: true,
        placeholder: "R$",
        lado: "meta",
        grade: 4,
        dica: "Soma automática dos seus gastos Pessoais — não precisa digitar.",
      },
      {
        id: "f1_custo_negocio",
        rotulo: "Custo do negócio",
        tipo: "numero",
        obrigatorio: true,
        placeholder: "R$",
        lado: "meta",
        dica: "Soma automática dos gastos Fixos + Variáveis do negócio — não precisa digitar.",
      },
      {
        id: "f1_lucro_desejado",
        rotulo: "Lucro desejado",
        tipo: "numero",
        obrigatorio: true,
        placeholder: "R$",
        lado: "meta",
        dica: "Quanto você quer ganhar de lucro por mês, além de cobrir seus custos.",
        exemplo: "Custos de R$ 2.150 + lucro desejado de R$ 1.000 = digite 1000",
      },
      {
        id: "f1_meta_minima",
        rotulo: "= Meta mínima",
        tipo: "numero",
        placeholder: "calculado automaticamente",
        lado: "meta",
        dica: "Soma automática: custo de vida + custo do negócio + lucro desejado.",
      },
    ],
    missoes: [
      { tipo: "principal", descricao: "Vitória rápida, ainda hoje: mande mensagem pra 5 clientes antigos perguntando se está tudo bem — ou aumente o preço de 1 serviço em 10% no seu próximo orçamento.", paraComecando: "Começando agora: escreva uma mensagem curta apresentando seu serviço e envie pra 5 pessoas conhecidas (vagas, grupos de WhatsApp, parentes) — seu primeiro passo de captação pode começar sem nenhum cliente ainda." },
      { tipo: "rapida", descricao: "Anote o resultado dessa ação abaixo, mesmo que pareça pequeno." },
    ],
    camposAposMissoes: [
      { id: "vitoria_rapida_resultado", rotulo: "O que aconteceu com minha vitória rápida:", tipo: "textarea", dica: "Escreva o que aconteceu, mesmo que pareça pequeno." },
    ],
    indicador: {
      nome: "Faturamento do último mês",
      unidade: "R$",
    },
    checklistFinal: "Preenchi meu diagnóstico com números reais, não estimativas no chute",
    camposManual: [
      "gastos_itens",
      "f1_custo_vida",
      "f1_custo_negocio",
      "f1_lucro_desejado",
      "f1_meta_minima",
    ],
  },
  {
    numero: 2,
    titulo: "Precificação Corrigida",
    tituloCurto: "Precificação",
    modulo: 1,
    objetivo: "parar de cobrar no olho e saber seu preço real",
    explicacao: [
      "Cobrar por instinto é o erro mais comum de quem trabalha sozinho. O preço precisa cobrir seu custo, seu tempo, e ainda deixar lucro.",
    ],
    dicas: [
      {
        titulo: "Dica de preenchimento",
        texto: "Some: tempo gasto (valor da sua hora) + material usado + deslocamento + margem de lucro.",
        exemplo: "1h30 de trabalho (R$40/hora = R$60) + material R$30 + deslocamento R$20 + 30% de lucro (R$33) = preço final R$143",
      },
    ],
    rotuloSeccao: "Preencha para até 3 dos seus principais serviços:",
    campos: [
      { id: "p2_servico_1_nome", rotulo: "Serviço", tipo: "texto", obrigatorio: true, lado: "s1", grade: 4, caixa: SERVICO_1, dica: "Qual serviço é este? (ex.: instalação de ar-condicionado)" },
      { id: "p2_servico_1_tempo", rotulo: "Tempo gasto", tipo: "texto", obrigatorio: true, lado: "s1", caixa: SERVICO_1, dica: "Quanto tempo você leva nesse serviço, do início ao fim.", exemplo: "1h30" },
      { id: "p2_servico_1_preco_atual", rotulo: "Preço atual", tipo: "numero", obrigatorio: true, placeholder: "R$", lado: "s1", caixa: SERVICO_1, dica: "Quanto você cobra hoje por esse serviço." },
      { id: "p2_servico_1_preco_correto", rotulo: "Preço correto", tipo: "numero", obrigatorio: true, placeholder: "R$", lado: "s1", caixa: SERVICO_1, dica: "Preço que cobre tempo + material + deslocamento + margem de lucro.", exemplo: "1h30 (R$ 60) + material R$ 30 + deslocamento R$ 20 + 30% de lucro = R$ 143" },
      { id: "p2_servico_2_nome", rotulo: "Serviço", tipo: "texto", lado: "s2", grade: 4, caixa: SERVICO_2, dica: "Qual serviço é este? (ex.: instalação de ar-condicionado)" },
      { id: "p2_servico_2_tempo", rotulo: "Tempo gasto", tipo: "texto", lado: "s2", caixa: SERVICO_2, dica: "Quanto tempo você leva nesse serviço, do início ao fim.", exemplo: "1h30" },
      { id: "p2_servico_2_preco_atual", rotulo: "Preço atual", tipo: "numero", placeholder: "R$", lado: "s2", caixa: SERVICO_2, dica: "Quanto você cobra hoje por esse serviço." },
      { id: "p2_servico_2_preco_correto", rotulo: "Preço correto", tipo: "numero", placeholder: "R$", lado: "s2", caixa: SERVICO_2, dica: "Preço que cobre tempo + material + deslocamento + margem de lucro.", exemplo: "1h30 (R$ 60) + material R$ 30 + deslocamento R$ 20 + 30% de lucro = R$ 143" },
      { id: "p2_servico_3_nome", rotulo: "Serviço", tipo: "texto", lado: "s3", grade: 4, caixa: SERVICO_3, dica: "Qual serviço é este? (ex.: instalação de ar-condicionado)" },
      { id: "p2_servico_3_tempo", rotulo: "Tempo gasto", tipo: "texto", lado: "s3", caixa: SERVICO_3, dica: "Quanto tempo você leva nesse serviço, do início ao fim.", exemplo: "1h30" },
      { id: "p2_servico_3_preco_atual", rotulo: "Preço atual", tipo: "numero", placeholder: "R$", lado: "s3", caixa: SERVICO_3, dica: "Quanto você cobra hoje por esse serviço." },
      { id: "p2_servico_3_preco_correto", rotulo: "Preço correto", tipo: "numero", placeholder: "R$", lado: "s3", caixa: SERVICO_3, dica: "Preço que cobre tempo + material + deslocamento + margem de lucro.", exemplo: "1h30 (R$ 60) + material R$ 30 + deslocamento R$ 20 + 30% de lucro = R$ 143" },
    ],
missoes: [
      { tipo: "principal", descricao: "Recalcule o preço de pelo menos 3 serviços dessa semana." },
      { tipo: "rapida", descricao: "Aplique o novo preço já no seu próximo orçamento — não espere o mês virar.", paraComecando: "Começando agora: ainda sem orçamento? Monte sua lista de preços já com os valores recalculados e guarde num lugar fácil de acessar — seu primeiro orçamento já vai sair com o preço certo." },
    ],
    indicador: {
      nome: "Preço médio dos meus 3 principais serviços",
      unidade: "R$",
    },
    checklistFinal: "Já apliquei o preço novo em pelo menos 1 orçamento real",
    camposManual: [
      "p2_servico_1_nome",
      "p2_servico_1_tempo",
      "p2_servico_1_preco_atual",
      "p2_servico_1_preco_correto",
      "p2_servico_2_nome",
      "p2_servico_2_tempo",
      "p2_servico_2_preco_atual",
      "p2_servico_2_preco_correto",
      "p2_servico_3_nome",
      "p2_servico_3_tempo",
      "p2_servico_3_preco_atual",
      "p2_servico_3_preco_correto",
    ],
  },
  {
    numero: 3,
    titulo: "Ticket Médio",
    tituloCurto: "Ticket médio",
    modulo: 1,
    objetivo: "aumentar o quanto cada cliente já paga, sem precisar de cliente novo",
    explicacao: [
      "Ticket médio é quanto, em média, cada cliente paga por atendimento. Aumentar seu ticket médio é quase sempre mais fácil do que buscar cliente novo — e muda muito seu resultado no fim do mês.",
    ],
    dicas: [
      {
        titulo: "Dica de preenchimento",
        texto: "Pense em serviços complementares que você já sabe fazer e pode oferecer junto do serviço principal.",
        exemplo: "quem instala ar-condicionado pode oferecer limpeza, PMOC, parte elétrica, dreno, manutenção preventiva; quem conserta geladeira pode oferecer limpeza de condensador, estabilizador, troca de filtro, contrato preventivo; quem corta cabelo pode oferecer barba, hidratação, pomada",
      },
    ],
    rotuloSeccao: "Liste 3 serviços complementares que você pode passar a oferecer:",
    campos: [
      { id: "p3_complemento_1", rotulo: "Complemento 1:", tipo: "textarea", obrigatorio: true, dica: "Um serviço que você já sabe fazer e pode oferecer junto do serviço principal.", exemplo: "quem conserta geladeira pode oferecer limpeza de condensador e troca de filtro" },
      { id: "p3_complemento_2", rotulo: "Complemento 2:", tipo: "textarea", obrigatorio: true, dica: "Outro serviço complementar que aumenta o valor do atendimento.", exemplo: "quem corta cabelo pode oferecer barba, hidratação ou pomada" },
      { id: "p3_complemento_3", rotulo: "Complemento 3:", tipo: "textarea", obrigatorio: true, dica: "Mais um serviço que você pode oferecer junto ou depois do principal.", exemplo: "quem instala ar-condicionado pode oferecer limpeza, PMOC ou manutenção preventiva" },
    ],
    missoes: [
      { tipo: "principal", descricao: "Ofereça o complemento pros próximos 5 clientes que você atender essa semana.", paraComecando: "Começando agora: ainda sem clientes? Treine a oferta do complemento com quem você atender primeiro (amigos, vizinhos, um serviço-teste) — ou simule em voz alta até ficar natural." },
      { tipo: "rapida", descricao: "Anote quantos aceitaram." },
    ],
    camposAposMissoes: [
      { id: "p3_aceitaram_complemento", rotulo: "De 5 clientes que recebi essa semana, quantos aceitaram o complemento:", tipo: "numero", placeholder: "0 a 5", dica: "Conte quantos clientes toparam o complemento — um número de 0 a 5." },
    ],
    indicador: {
      nome: "Meu ticket médio",
      unidade: "R$",
      dica: "Ticket médio = faturamento total dividido pelo número de atendimentos. Exemplo: R$ 4.000 de faturamento ÷ 20 atendimentos = ticket médio de R$ 200",
    },
    checklistFinal: "Ofereci o complemento pra pelo menos 5 clientes de verdade",
    camposManual: ["p3_complemento_1", "p3_complemento_2", "p3_complemento_3"],
  },
  {
    numero: 4,
    titulo: "Metas e Painel Financeiro",
    tituloCurto: "Metas e painel",
    modulo: 1,
    objetivo: "quebrar sua meta grande em algo que cabe no dia a dia",
    explicacao: [
      "Meta mensal é importante, mas o cérebro trabalha melhor com metas menores e mais próximas. Vamos quebrar sua meta em semana e em dia — e montar o painel que você vai atualizar todo mês.",
    ],
    dicas: [
      {
        titulo: "Dica de preenchimento",
        texto: "Pegue sua meta mínima mensal (Semana 1) e divida por 4 semanas, depois por dias úteis.",
        exemplo: "meta de R$ 12.000 por mês ÷ 4 semanas = R$ 3.000 por semana ÷ 5 dias úteis = R$ 600 por dia",
      },
    ],
    campos: [
      { id: "p4_meta_mensal", rotulo: "Minha meta mensal", tipo: "numero", obrigatorio: true, placeholder: "R$", lado: "metas", grade: 3, dica: "Sua meta mínima mensal (o número que você achou na Semana 1).", exemplo: "meta de R$ 12.000 por mês → digite 12000" },
      { id: "p4_meta_semanal", rotulo: "÷ Por semana", tipo: "numero", placeholder: "calculado automaticamente", lado: "metas", dica: "Calculado automaticamente: meta mensal ÷ 4 semanas." },
      { id: "p4_meta_diaria", rotulo: "÷ Por dia", tipo: "numero", placeholder: "calculado automaticamente", lado: "metas", dica: "Calculado automaticamente: meta semanal ÷ 5 dias úteis." },
    ],
    missoes: [
      { tipo: "principal", descricao: "Vire a página e preencha seu primeiro Painel Mensal." },
      { tipo: "rapida", descricao: "Marque na agenda o mesmo dia, daqui a 30 dias, pra preencher o próximo." },
    ],
    checklistFinal: "Minha meta semanal e diária estão anotadas em lugar visível",
    painelAoTerminar: 1,
    camposManual: ["p4_meta_mensal", "p4_meta_semanal", "p4_meta_diaria"],
  },
  {
    numero: 5,
    titulo: "Experiência do Cliente e Tempo Produtivo",
    tituloCurto: "Experiência e tempo",
    modulo: 2,
    objetivo: "melhorar a experiência de quem te contrata e descobrir pra onde seu tempo está indo",
    explicacao: [
      "Primeiro, como o cliente te percebe do início ao fim do atendimento. Segundo, quanto do seu tempo de trabalho é realmente produtivo.",
    ],
    dicas: [
      {
        titulo: "Dica de preenchimento 1",
        texto: "Pense em cada ponto de contato com o cliente e como você quer que ele aconteça.",
        exemplo: "atendimento: educado e pontual | apresentação: uniforme ou roupa limpa e identificação | comunicação: linguagem clara, sem termo técnico difícil | orçamento: explicado, não só o número",
      },
      {
        titulo: "Dica de preenchimento 2",
        texto: "Pense numa semana comum e estime quanto tempo você gasta em cada coisa. Não precisa ser exato.",
      },
    ],
    campos: [
      { id: "p5_padrao_atendimento", rotulo: "Meu padrão de atendimento", tipo: "textarea", obrigatorio: true, lado: "padroes", grade: 2, dica: "Como você quer que o atendimento aconteça, do primeiro contato à despedida.", exemplo: "atendimento: educado e pontual | orçamento: explicado, não só o número" },
      { id: "p5_apresentacao", rotulo: "Minha apresentação", tipo: "textarea", lado: "padroes", dica: "Como você se apresenta ao cliente: uniforme, roupa limpa, identificação.", exemplo: "uniformes ou roupa limpa e identificação" },
      { id: "p5_comunicacao", rotulo: "Minha comunicação", tipo: "textarea", lado: "padroes", dica: "Como você fala com o cliente: linguagem clara, sem termo técnico difícil." },
      { id: "p5_explicacao_orcamento", rotulo: "Como explico o orçamento", tipo: "textarea", lado: "padroes", dica: "Como você apresenta o valor: explicado em partes, não só o número." },
      { id: "p5_horas_dirigindo", rotulo: "Dirigindo (h/semana)", tipo: "numero", obrigatorio: true, placeholder: "horas", lado: "horas", grade: 2, dica: "Horas por semana nessa atividade. Não precisa ser exato." },
      { id: "p5_horas_esperando", rotulo: "Esperando cliente (h)", tipo: "numero", obrigatorio: true, placeholder: "horas", lado: "horas", dica: "Horas por semana nessa atividade. Não precisa ser exato." },
      { id: "p5_horas_orcamento", rotulo: "Fazendo orçamento (h)", tipo: "numero", obrigatorio: true, placeholder: "horas", lado: "horas", dica: "Horas por semana nessa atividade. Não precisa ser exato." },
      { id: "p5_horas_comprando", rotulo: "Comprando peça/material (h)", tipo: "numero", obrigatorio: true, placeholder: "horas", lado: "horas", dica: "Horas por semana nessa atividade. Não precisa ser exato." },
    ],
    missoes: [
      { tipo: "principal", descricao: "Escolha 1 dia essa semana e cronometre de verdade: quanto tempo foi execução, quanto foi deslocamento/espera." },
    ],
    camposAposMissoes: [
      { id: "p5_descoberta_cronometragem", rotulo: "O que descobri cronometrando meu dia:", tipo: "textarea", dica: "Escreva o que chamou sua atenção: onde o tempo foi embora, o que vale a pena mudar." },
    ],
    checklistFinal: "Sei hoje, de verdade, quantas horas por semana são produtivas",
    camposManual: [
      "p5_padrao_atendimento",
      "p5_apresentacao",
      "p5_comunicacao",
      "p5_explicacao_orcamento",
      "p5_horas_dirigindo",
      "p5_horas_esperando",
      "p5_horas_orcamento",
      "p5_horas_comprando",
    ],
  },
  {
    numero: 6,
    titulo: "Processo Completo (POP)",
    tituloCurto: "Processo (POP)",
    modulo: 2,
    objetivo: "documentar do seu jeito como você atende, do início ao pós-atendimento",
    explicacao: [
      "POP significa Procedimento Operacional Padrão. Agora que você já ajustou a experiência do cliente (Semana 5), documente o processo completo: atendimento, execução e cobrança.",
    ],
    dicas: [
      {
        titulo: "Dica de preenchimento",
        texto: "Escreva na ordem em que realmente acontece, do primeiro contato até o pagamento.",
        exemplo: "cliente chama -> confirmo horário -> chego e me apresento -> diagnóstico -> explico problema e preço -> executo -> confiro tudo -> cobro e agradeço",
      },
    ],
    campos: [
      { id: "p6_passo_1", rotulo: "Passo 1:", tipo: "textarea", obrigatorio: true, dica: "Escreva na ordem em que realmente acontece, do primeiro contato até o pagamento.", exemplo: "cliente chama → confirmo horário → chego e me apresento → diagnóstico → explico problema e preço → executo → confiro tudo → cobro e agradeço" },
      { id: "p6_passo_2", rotulo: "Passo 2:", tipo: "textarea", obrigatorio: true, dica: "O próximo passo do seu processo, na ordem real." },
      { id: "p6_passo_3", rotulo: "Passo 3:", tipo: "textarea", obrigatorio: true, dica: "Continue seguindo a sequência real do atendimento." },
      { id: "p6_passo_4", rotulo: "Passo 4:", tipo: "textarea", dica: "Continue seguindo a sequência real do atendimento." },
      { id: "p6_passo_5", rotulo: "Passo 5:", tipo: "textarea", dica: "Continue seguindo a sequência real do atendimento." },
      { id: "p6_passo_6", rotulo: "Passo 6:", tipo: "textarea", dica: "Continue seguindo a sequência real do atendimento." },
    ],
    nota: "Use também o Template de POP separado (documento próprio) se quiser um espaço maior pra detalhar cada passo com calma.",
    missoes: [
      { tipo: "principal", descricao: "Use esse processo, na íntegra, no seu próximo atendimento — sem pular nenhum passo.", paraComecando: "Começando agora: ainda sem atendimento marcado? Ensaie o processo do começo ao fim com um amigo (ou um atendimento-teste real), seguindo cada passo que você escreveu." },
    ],
    checklistFinal: "Apliquei o processo completo em pelo menos 1 atendimento real",
    camposManual: ["p6_passo_1", "p6_passo_2", "p6_passo_3", "p6_passo_4", "p6_passo_5", "p6_passo_6"],
  },
  {
    numero: 7,
    titulo: "Agenda Inteligente",
    tituloCurto: "Agenda inteligente",
    modulo: 2,
    objetivo: "organizar sua rota pra perder menos tempo e gastar menos combustível",
    explicacao: [
      "Muita gente perde dinheiro sem perceber, cruzando a cidade inteira no mesmo dia. Uma agenda organizada por região economiza tempo, combustível, e cabe mais atendimento no seu dia.",
    ],
    dicas: [
      {
        titulo: "Dica de preenchimento",
        texto: "Agrupe atendimentos da mesma região no mesmo dia, sempre que possível.",
        exemplo: "segunda: bairros do lado norte | quarta: bairros do lado sul | evita ida e volta no mesmo dia",
      },
    ],
    rotuloSeccao: "Organize sua próxima semana por região:",
    campos: [
      { id: "p7_segunda", rotulo: "Segunda", tipo: "textarea", dica: "Região/bairro planejado", exemplo: "ex.: bairros do lado norte", obrigatorio: true, lado: "dias", grade: 2 },
      { id: "p7_terca", rotulo: "Terça", tipo: "textarea", dica: "Região/bairro planejado", exemplo: "ex.: bairros do lado sul", obrigatorio: true, lado: "dias" },
      { id: "p7_quarta", rotulo: "Quarta", tipo: "textarea", dica: "Região/bairro planejado", exemplo: "ex.: bairros do lado norte", obrigatorio: true, lado: "dias" },
      { id: "p7_quinta", rotulo: "Quinta", tipo: "textarea", dica: "Região/bairro planejado", exemplo: "ex.: bairros do lado sul", obrigatorio: true, lado: "dias" },
      { id: "p7_sexta", rotulo: "Sexta", tipo: "textarea", dica: "Região/bairro planejado", exemplo: "ex.: bairros do lado norte", obrigatorio: true, lado: "dias" },
    ],
    missoes: [
      { tipo: "principal", descricao: "Monte sua agenda da próxima semana por região antes de sair de casa na segunda-feira." },
    ],
    indicador: {
      nome: "Tempo estimado de deslocamento por semana",
      unidade: "horas",
    },
    checklistFinal: "Minha agenda da próxima semana já está organizada por região",
    camposManual: ["p7_segunda", "p7_terca", "p7_quarta", "p7_quinta", "p7_sexta"],
  },
  {
    numero: 8,
    titulo: "Pós-venda",
    tituloCurto: "Pós-venda",
    modulo: 2,
    objetivo: "continuar gerando resultado depois que o atendimento termina",
    explicacao: [
      "A maioria para no momento do pagamento. Mas é o pós-venda que traz recomendação, avaliação positiva e cliente que volta. Vamos montar sua sequência.",
    ],
    dicas: [
      {
        titulo: "Dica de preenchimento",
        texto: "Defina uma mensagem curta pra cada momento da sequência de pós-venda.",
        exemplo: "24h depois: \"Oi, tudo certo com o serviço?\" | 7 dias: pesquisa rápida de satisfação | 30 dias: pedido de indicação | 90 dias: nova oferta ou lembrete de manutenção",
      },
    ],
    campos: [
      { id: "p8_mensagem_24h", rotulo: "Minha mensagem de 24 horas depois:", tipo: "textarea", obrigatorio: true, dica: "Mensagem curta e natural pra saber se o serviço ficou bem feito.", exemplo: "\"Oi, tudo certo com o serviço?\"" },
      { id: "p8_mensagem_7dias", rotulo: "Minha mensagem de 7 dias depois (pesquisa de satisfação):", tipo: "textarea", obrigatorio: true, dica: "Pesquisa rápida de satisfação, do seu jeito.", exemplo: "\"Oi! Como foi sua experiência? Ficou satisfeito com o serviço?\"" },
      { id: "p8_mensagem_30dias", rotulo: "Minha mensagem de 30 dias depois (pedido de indicação):", tipo: "textarea", obrigatorio: true, dica: "Pedido de indicação direto e sem rodeio.", exemplo: "\"Se você conhecer alguém que precise do meu trabalho, me indica?\"" },
      { id: "p8_mensagem_90dias", rotulo: "Minha mensagem de 90 dias depois (nova oferta):", tipo: "textarea", obrigatorio: true, dica: "Nova oferta ou lembrete de manutenção.", exemplo: "\"Olá! Está na hora de revisar a manutenção do seu aparelho.\"" },
    ],
    missoes: [
      { tipo: "principal", descricao: "Aplique a sequência completa nos últimos 5 clientes que você já atendeu.", paraComecando: "Começando agora: ainda sem clientes atendidos? Programe o lembrete automático (ou anote no papel) para acionar cada mensagem nos prazos certos depois do seu primeiro atendimento — assim a sequência já nasce funcionando." },
    ],
    checklistFinal: "Apliquei a sequência de pós-venda em pelo menos 5 clientes reais",
    painelAoTerminar: 2,
    camposManual: ["p8_mensagem_24h", "p8_mensagem_7dias", "p8_mensagem_30dias", "p8_mensagem_90dias"],
  },
  {
    numero: 9,
    titulo: "Captação de Clientes",
    tituloCurto: "Captação",
    modulo: 3,
    objetivo: "ter um processo ativo de atrair cliente novo, não depender só de sorte",
    explicacao: [
      "Defina de onde vêm, ou deveriam vir, seus próximos clientes. Não é sobre fazer de tudo, é escolher 2 ou 3 canais e trabalhar bem neles.",
    ],
    dicas: [
      {
        titulo: "Dica de preenchimento",
        texto: "Canal é o caminho que o cliente usa pra te encontrar. Escolha no máximo 3.",
        exemplo: "indicação de cliente satisfeito, grupo de WhatsApp de bairro, Instagram com fotos do antes/depois",
      },
    ],
    campos: [
      { id: "p9_canal_1", rotulo: "Canal 1", tipo: "texto", obrigatorio: true, placeholder: "ex.: indicação", lado: "canais", grade: 3, dica: "O caminho que o cliente usa pra te encontrar. Escolha no máximo 3." },
      { id: "p9_canal_2", rotulo: "Canal 2", tipo: "texto", placeholder: "ex.: WhatsApp", lado: "canais", dica: "O caminho que o cliente usa pra te encontrar." },
      { id: "p9_canal_3", rotulo: "Canal 3", tipo: "texto", placeholder: "ex.: Instagram", lado: "canais", dica: "O caminho que o cliente usa pra te encontrar." },
      { id: "p9_frase_indicacao", rotulo: "Minha frase pra pedir indicação a um cliente satisfeito:", tipo: "textarea", obrigatorio: true, dica: "Frase curta e natural pra pedir indicação com segurança.", exemplo: "\"Você conhece alguém que precise do meu trabalho? Fico muito agradecido se você me indicar.\"" },
    ],
    missoes: [
      { tipo: "principal", descricao: "Publique ou divulgue seu trabalho pelo menos 3 vezes essa semana nos canais escolhidos." },
      { tipo: "rapida", descricao: "Peça indicação, de forma direta, a pelo menos 10 clientes.", paraComecando: "Começando agora: ainda sem 10 clientes? Peça indicação de forma direta a 10 pessoas conhecidas (quem conhece seu trabalho, família, colegas) e às poucas pessoas que você já atendeu." },
    ],
    checklistFinal: "Divulguei nos canais escolhidos e pedi indicação de verdade",
    camposManual: ["p9_canal_1", "p9_canal_2", "p9_canal_3", "p9_frase_indicacao"],
  },
  {
    numero: 10,
    titulo: "Conversão de Orçamento",
    tituloCurto: "Conversão",
    modulo: 3,
    objetivo: "descobrir quantos orçamentos viram serviço fechado, e melhorar essa taxa",
    explicacao: [
      "De cada 10 orçamentos que você envia, quantos fecham? A maioria nunca calculou isso — e é um dos números que mais muda o faturamento quando você presta atenção nele.",
    ],
    dicas: [
      {
        titulo: "Dica de preenchimento 1",
        texto: "Liste os últimos orçamentos que você enviou e marque quais fecharam.",
        exemplo: "enviei 10 orçamentos no mês, 4 fecharam = taxa de conversão de 40%",
      },
      {
        titulo: "Dica de preenchimento 2",
        texto: "Formas simples de aumentar conversão: responder rápido (primeiras horas), explicar o valor do serviço e não só o preço, e fazer um follow-up educado depois de 2-3 dias sem resposta.",
      },
    ],
    campos: [
      { id: "p10_orcamentos_enviados", rotulo: "Orçamentos enviados (mês)", tipo: "numero", obrigatorio: true, lado: "conv", grade: 3, dica: "Quantos orçamentos você enviou no último mês.", exemplo: "enviei 10 orçamentos no mês" },
      { id: "p10_orcamentos_fechados", rotulo: "Fechados", tipo: "numero", obrigatorio: true, lado: "conv", dica: "Quantos desses orçamentos viraram serviço fechado.", exemplo: "4 fecharam" },
      { id: "p10_taxa_conversao", rotulo: "Taxa de conversão (%)", tipo: "numero", placeholder: "calculado automaticamente", lado: "conv", dica: "Calculado automaticamente: fechados ÷ enviados." },
      { id: "p10_followup_padrao", rotulo: "Meu follow-up padrão pra orçamento sem resposta:", tipo: "textarea", obrigatorio: true, dica: "Sua mensagem padrão pra retomar contato depois de 2-3 dias sem resposta.", exemplo: "\"Oi, vi que você ainda não respondeu o orçamento. Posso esclarecer alguma dúvida?\"" },
    ],
    missoes: [
      { tipo: "principal", descricao: "Faça o follow-up de todos os orçamentos em aberto essa semana, sem exceção.", paraComecando: "Começando agora: ainda sem orçamentos em aberto? Escreva seu follow-up padrão, salve pronto para usar e envie para qualquer pessoa que você já mandou preço ou orçamento — mesmo sem resposta ainda." },
    ],
    indicador: {
      nome: "Minha taxa de conversão de orçamentos",
      unidade: "%",
    },
    checklistFinal: "Fiz follow-up de 100% dos orçamentos em aberto",
    camposManual: ["p10_orcamentos_enviados", "p10_orcamentos_fechados", "p10_taxa_conversao", "p10_followup_padrao"],
  },
  {
    numero: 11,
    titulo: "Indicadores e Autoridade",
    tituloCurto: "Indicadores e autoridade",
    modulo: 3,
    objetivo: "medir seu negócio de verdade e ser mais lembrado na sua região",
    explicacao: [
      "Você já mede faturamento e ticket médio. Agora vamos olhar o quadro completo de indicadores — e dar os primeiros passos pra ser mais reconhecido no seu bairro/cidade.",
      "Preencha o que você tem hoje pra cada indicador:",
    ],
    dicas: [
      {
        titulo: "Dica de preenchimento",
        texto: "Autoridade não precisa virar um curso de marketing. Três passos simples já ajudam bastante.",
        exemplo: "cadastrar/atualizar seu Google Meu Negócio, tirar foto antes/depois dos serviços, pedir avaliação pros últimos clientes satisfeitos",
      },
    ],
    campos: [
      { id: "p11_orcamentos_mes", rotulo: "Nº de orçamentos no mês", tipo: "numero", obrigatorio: true, lado: "indicadores", grade: 2, dica: "Orçamentos enviados no mês." },
      { id: "p11_vendas_fechadas", rotulo: "Nº de vendas fechadas", tipo: "numero", obrigatorio: true, lado: "indicadores", dica: "Orçamentos que fecharam no mês." },
      { id: "p11_ticket_medio", rotulo: "Ticket médio (R$)", tipo: "numero", obrigatorio: true, lado: "indicadores", dica: "Quanto cada cliente paga em média: faturamento ÷ atendimentos.", exemplo: "R$ 4.000 ÷ 20 atendimentos = R$ 200" },
      { id: "p11_lucro_mes", rotulo: "Lucro do mês (R$)", tipo: "numero", obrigatorio: true, lado: "indicadores", dica: "O que sobrou depois de pagar os custos do mês." },
      { id: "p11_margem_lucro", rotulo: "Margem de lucro (%)", tipo: "numero", obrigatorio: true, lado: "indicadores", dica: "Percentual do faturamento que é lucro: lucro ÷ faturamento × 100.", exemplo: "R$ 1.000 de lucro ÷ R$ 4.000 de faturamento = 25%" },
      { id: "p11_clientes_novos", rotulo: "Clientes novos no mês", tipo: "numero", obrigatorio: true, lado: "indicadores", dica: "Clientes que nunca te contrataram antes." },
      { id: "p11_clientes_recuperados", rotulo: "Clientes antigos recuperados", tipo: "numero", obrigatorio: true, lado: "indicadores", dica: "Clientes antigos que voltaram a contratar no mês." },
      { id: "p11_indicacoes", rotulo: "Indicações recebidas", tipo: "numero", obrigatorio: true, lado: "indicadores", dica: "Quantas indicações você recebeu de clientes satisfeitos." },
      { id: "p11_avaliacoes_google", rotulo: "Avaliações no Google", tipo: "numero", obrigatorio: true, lado: "indicadores", dica: "Total de avaliações no seu perfil do Google." },
      { id: "p11_tempo_medio_atendimento", rotulo: "Tempo médio por atendimento", tipo: "numero", obrigatorio: true, lado: "indicadores", dica: "Tempo médio de um atendimento, do início ao fim.", exemplo: "2 horas" },
    ],
    missoes: [
      { tipo: "principal", descricao: "Cadastre ou atualize seu perfil no Google Meu Negócio." },
      { tipo: "rapida", descricao: "Peça avaliação a pelo menos 3 clientes satisfeitos recentes.", paraComecando: "Começando agora: ainda sem clientes recentes? Peça avaliação para as pessoas que você já atendeu — mesmo sendo poucas — e para quem conhece seu trabalho e confia nele." },
      { tipo: "rapida", descricao: "Tire foto de antes/depois no seu próximo serviço." },
    ],
    checklistFinal: "Completei as 3 missões de autoridade dessa semana",
    camposManual: [
      "p11_orcamentos_mes",
      "p11_vendas_fechadas",
      "p11_ticket_medio",
      "p11_lucro_mes",
      "p11_margem_lucro",
      "p11_clientes_novos",
      "p11_clientes_recuperados",
      "p11_indicacoes",
      "p11_avaliacoes_google",
      "p11_tempo_medio_atendimento",
    ],
  },
  {
    numero: 12,
    titulo: "Escala e Fechamento",
    tituloCurto: "Escala e fechamento",
    modulo: 3,
    objetivo: "decidir com clareza o que vem depois dos 90 dias",
    explicacao: [
      "Revise tudo que você preencheu nas 11 semanas anteriores. Você tem hoje: diagnóstico financeiro, precificação corrigida, ticket médio, processo documentado, agenda organizada, pós-venda ativo, captação, conversão e indicadores completos.",
    ],
    dicas: [],
    campos: [
      { id: "p12_conquista", rotulo: "Minha maior conquista nesses 90 dias (com números, se possível):", tipo: "textarea", obrigatorio: true, dica: "Escreva com números, se tiver: faturamento, ticket médio, clientes atendidos." },
      { id: "p12_melhorar", rotulo: "O que ainda preciso melhorar:", tipo: "textarea", obrigatorio: true, dica: "O que ainda falta pra consolidar no seu negócio." },
      { id: "p12_proximo_objetivo", rotulo: "Meu próximo objetivo para os próximos 90 dias:", tipo: "textarea", obrigatorio: true, dica: "Objetivo realista e com data para os próximos 90 dias." },
    ],
    checklistDecisao: {
      itens: [
        { id: "decisao_meta_minima", rotulo: "Já bati minha meta mínima de forma consistente nos últimos 2 meses" },
        { id: "decisao_processo", rotulo: "Tenho processo documentado (POP) pronto para ser ensinado a outra pessoa" },
        { id: "decisao_clientes", rotulo: "Tenho fluxo de clientes maior do que consigo atender sozinho" },
      ],
      sugestao:
        "Se você marcou os três itens acima, provavelmente está pronto pra considerar formar equipe: contratar um ajudante, que aprende seu processo documentado e, quando estiver pronto, vira profissional pleno — liberando espaço pra você contratar um novo ajudante. Se não marcou, o foco continua sendo consolidar o que já está rodando.",
    },
    missoes: [
      { tipo: "principal", descricao: "Escreva e assuma, com data, seu próximo objetivo de 90 dias — mesmo que seja só consolidar." },
    ],
    checklistFinal: "Tenho clareza do meu próximo passo e já marquei na agenda",
    painelAoTerminar: 3,
    camposManual: ["p12_conquista", "p12_melhorar", "p12_proximo_objetivo"],
  },
];

export const SEMANA_POR_NUMERO = new Map(SEMANAS.map((s) => [s.numero, s]));

export const ESTADOS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO",
];

export const TEMPO_MERCADO_OPCOES = [
  "Menos de 1 ano",
  "1 a 3 anos",
  "3 a 5 anos",
  "5 a 10 anos",
  "Mais de 10 anos",
];
