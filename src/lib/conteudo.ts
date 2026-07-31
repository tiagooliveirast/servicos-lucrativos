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
    dias: "Dias 1-30",
    descricao: "Você descobre seu número real, corrige preços, aumenta o ticket médio e define metas que cabem no dia a dia.",
  },
  {
    numero: 2,
    titulo: "Operação Lucrativa",
    dias: "Dias 31-60",
    descricao: "Você profissionaliza o atendimento, documenta seu processo, organiza sua agenda e cria um pós-venda que gera resultado.",
  },
  {
    numero: 3,
    titulo: "Crescimento e Escala",
    dias: "Dias 61-90",
    descricao: "Você atrai clientes novos com método, melhora a conversão, constrói autoridade e decide o próximo ciclo.",
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
    };

export interface MissaoConteudo {
  tipo: "principal" | "rapida";
  descricao: string;
}

export interface IndicadorConteudo {
  nome: string;
  unidade: string;
  dica: string;
}

export interface ItemDecisao {
  id: string;
  rotulo: string;
}

export interface SemanaConteudo {
  numero: number;
  titulo: string;
  modulo: number;
  objetivo: string;
  explicacao: string[];
  dicas: { titulo: string; texto: string; exemplo?: string }[];
  campos: Campo[];
  missoes: MissaoConteudo[];
  indicador?: IndicadorConteudo;
  checklistFinal: string;
  painelAoTerminar?: number;
  checklistDecisao?: { itens: ItemDecisao[]; sugestao: string };
  camposManual: string[];
}

export const SEMANAS: SemanaConteudo[] = [
  {
    numero: 1,
    titulo: "Diagnóstico Financeiro Completo",
    modulo: 1,
    objetivo: "Sair do escuro e saber exatamente o seu número real.",
    explicacao: [
      "Você não consegue melhorar o que não mede. Nesta semana vamos tirar o seu negócio do escuro: somar o que você precisa para viver, o que o negócio custa para rodar e o que você quer lucrar.",
      "O resultado é a sua meta mínima mensal — o número que você jamais pode faturar abaixo. A partir dele, todas as próximas semanas fazem sentido.",
    ],
    dicas: [
      {
        titulo: "Seja honesto com os números",
        texto: "O diagnóstico só funciona com a realidade, não com o que você gostaria que fosse. Use valores reais do seu bolso e da conta do negócio.",
        exemplo: "Custo de vida R$ 4.000 + custos fixos R$ 1.500 + lucro desejado R$ 2.500 = meta mínima de R$ 8.000/mês.",
      },
      {
        titulo: "Fixo x variável",
        texto: "Despesas fixas existem mesmo sem atender ninguém (conta, aluguel, internet). As variáveis dependem do volume de serviço (material, combustível).",
      },
    ],
    campos: [
      { id: "custo_vida", rotulo: "Custo de vida pessoal mensal", tipo: "numero", obrigatorio: true, placeholder: "R$" },
      { id: "custos_fixos_negocio", rotulo: "Custos fixos do negócio por mês", tipo: "numero", obrigatorio: true, placeholder: "R$" },
      { id: "despesas_fixas", rotulo: "Despesas fixas do mês", tipo: "numero", obrigatorio: true, placeholder: "R$" },
      { id: "despesas_variaveis", rotulo: "Despesas variáveis do mês", tipo: "numero", obrigatorio: true, placeholder: "R$" },
      { id: "lucro_desejado", rotulo: "Lucro desejado por mês", tipo: "numero", obrigatorio: true, placeholder: "R$", dica: "Quanto você quer lucrar de verdade por mês? Esse número entra no cálculo da meta mínima." },
      { id: "meta_minima", rotulo: "Meta mínima mensal (custo de vida + custo do negócio + lucro desejado)", tipo: "numero", obrigatorio: true, placeholder: "calculado automaticamente", dica: "Valor calculado automaticamente. É o mínimo que você precisa faturar por mês." },
    ],
    missoes: [
      { tipo: "principal", descricao: "Fazer o diagnóstico financeiro completo." },
      { tipo: "rapida", descricao: "Mandar mensagem para 5 clientes antigos OU aumentar o preço de 1 serviço em 10% ainda hoje." },
    ],
    indicador: {
      nome: "Faturamento do último mês",
      unidade: "R$",
      dica: "Informe o faturamento bruto do último mês — o valor real, da conta ou da agenda.",
    },
    checklistFinal: "Preenchi todos os campos e sei a minha meta mínima mensal.",
    camposManual: ["custo_vida", "custos_fixos_negocio", "despesas_fixas", "despesas_variaveis", "meta_minima"],
  },
  {
    numero: 2,
    titulo: "Precificação Corrigida",
    modulo: 1,
    objetivo: "Parar de cobrar no olho.",
    explicacao: [
      "Quase todo profissional autônomo cobra \"no olho\": compara com a concorrência, arredonda, aceita o que o cliente oferece. O resultado é serviço caro de executar sendo vendido barato.",
      "Nesta semana você calcula o preço certo de cada serviço — o que cobre o material, o seu tempo e ainda gera lucro. Se o preço atual é menor que o custo, você está pagando para trabalhar.",
    ],
    dicas: [
      {
        titulo: "Fórmula do preço correto",
        texto: "Preço correto = custo do material + valor da sua hora × horas gastas + margem de lucro.",
        exemplo: "Material R$ 50 + 3h de trabalho (R$ 60/h) + 30% de margem = R$ 284, o mínimo a cobrar.",
      },
      {
        titulo: "Valorize seu tempo",
        texto: "Divida quanto você quer ganhar por mês pelas horas produtivas do mês — esse é o valor mínimo da sua hora.",
      },
    ],
    campos: [
      {
        id: "tabela_servicos",
        rotulo: "Tabela de serviços (até 3)",
        tipo: "tabela",
        colunas: [
          { id: "nome", rotulo: "Nome do serviço", tipo: "texto" },
          { id: "tempo_gasto", rotulo: "Tempo gasto", tipo: "texto" },
          { id: "preco_atual", rotulo: "Preço atual (R$)", tipo: "numero" },
          { id: "preco_correto", rotulo: "Preço correto (R$)", tipo: "numero" },
        ],
        linhasMin: 1,
        linhasMax: 3,
        obrigatorio: true,
        dica: "Preencha pelo menos 1 serviço (ideal: os 3 principais). No \"preço correto\", aplique a fórmula: material + horas × valor da hora + margem.",
      },
    ],
    missoes: [
      { tipo: "principal", descricao: "Recalcular o preço de pelo menos 3 serviços." },
      { tipo: "rapida", descricao: "Aplicar o novo preço no próximo orçamento real." },
    ],
    indicador: {
      nome: "Preço médio dos 3 principais serviços",
      unidade: "R$",
      dica: "Some os preços corretos dos 3 principais serviços e divida por 3.",
    },
    checklistFinal: "Recalculei o preço de pelo menos 3 serviços.",
    camposManual: ["tabela_servicos"],
  },
  {
    numero: 3,
    titulo: "Ticket Médio",
    modulo: 1,
    objetivo: "Aumentar quanto cada cliente já paga, sem precisar de cliente novo.",
    explicacao: [
      "Seu cliente já confia em você. Mais fácil do que conquistar cliente novo é aumentar o quanto cada cliente paga por atendimento.",
      "Serviços complementares transformam um atendimento em dois ou três — e o ticket médio sobe junto. Escolha os complementos que o cliente já precisa naturalmente depois do seu serviço principal.",
    ],
    dicas: [
      {
        titulo: "Complementos naturais",
        texto: "Pense no que o cliente precisa logo depois do seu serviço principal.",
        exemplo: "Quem troca um chuveiro costuma aceitar a revisão da parte elétrica junto.",
      },
    ],
    campos: [
      { id: "complemento_1", rotulo: "Serviço complementar 1", tipo: "texto", obrigatorio: true },
      { id: "complemento_2", rotulo: "Serviço complementar 2", tipo: "texto", obrigatorio: true },
      { id: "complemento_3", rotulo: "Serviço complementar 3", tipo: "texto", obrigatorio: true },
    ],
    missoes: [
      { tipo: "principal", descricao: "Oferecer o complemento para os próximos 5 clientes atendidos." },
      { tipo: "rapida", descricao: "Anotar quantos aceitaram." },
    ],
    indicador: {
      nome: "Ticket médio",
      unidade: "R$",
      dica: "Ticket médio = faturamento total ÷ número de atendimentos do período.",
    },
    checklistFinal: "Ofereci complementos aos próximos 5 clientes e anotei quantos aceitaram.",
    camposManual: ["complemento_1", "complemento_2", "complemento_3"],
  },
  {
    numero: 4,
    titulo: "Metas e Painel Financeiro",
    modulo: 1,
    objetivo: "Quebrar a meta grande em algo que cabe no dia a dia.",
    explicacao: [
      "Meta grande assusta e trava. Nesta semana você quebra a sua meta mensal em metas semanais e diárias — números que cabem no seu dia a dia e que você consegue atacar de verdade.",
      "Ao concluir, o seu primeiro Painel Mensal é liberado: ele reúne os indicadores do seu Módulo 1.",
    ],
    dicas: [
      {
        titulo: "Como dividir",
        texto: "Meta semanal = meta mensal ÷ 4. Meta diária = meta mensal ÷ dias úteis do mês (aprox. 22).",
        exemplo: "Meta mensal de R$ 10.000 ÷ 4 = R$ 2.500 por semana; ÷ 22 dias = ~R$ 455 por dia.",
      },
    ],
    campos: [
      { id: "meta_mensal", rotulo: "Meta mensal", tipo: "numero", obrigatorio: true, placeholder: "R$" },
      { id: "meta_semanal", rotulo: "Meta semanal (meta mensal ÷ 4)", tipo: "numero", obrigatorio: true, placeholder: "calculado automaticamente" },
      { id: "meta_diaria", rotulo: "Meta diária (meta mensal ÷ dias úteis)", tipo: "numero", obrigatorio: true, placeholder: "calculado automaticamente" },
    ],
    missoes: [
      { tipo: "principal", descricao: "Preencher o primeiro Painel Mensal (libera automaticamente ao concluir esta semana)." },
    ],
    checklistFinal: "Defini minhas metas mensal, semanal e diária.",
    painelAoTerminar: 1,
    camposManual: ["meta_mensal", "meta_semanal", "meta_diaria"],
  },
  {
    numero: 5,
    titulo: "Experiência do Cliente e Tempo Produtivo",
    modulo: 2,
    objetivo: "Melhorar a experiência de quem contrata e descobrir para onde vai o tempo.",
    explicacao: [
      "O cliente sente a diferença entre um atendimento profissional e um improvisado — e paga mais caro pelo primeiro. Como você atende, apresenta e explica o orçamento define o valor percebido do seu serviço.",
      "Ao mesmo tempo, o tempo é o recurso mais escasso do profissional. Nesta semana você cronometra um dia real e descobre exatamente para onde ele está indo.",
    ],
    dicas: [
      {
        titulo: "Cronometre a verdade",
        texto: "Cronometre um dia real de trabalho, sem \"melhorar\" os números. O objetivo é ver a verdade.",
        exemplo: "2h dirigindo + 1h esperando cliente + 1h30 em orçamentos + 1h comprando material = quase 6h improdutivas na semana.",
      },
    ],
    campos: [
      { id: "padrao_atendimento", rotulo: "Padrão de atendimento", tipo: "textarea", obrigatorio: true, dica: "Como você recebe o cliente: pontualidade, apresentação, tom de voz, postura." },
      { id: "apresentacao", rotulo: "Apresentação", tipo: "textarea", dica: "O que você fala sobre você e o seu trabalho nos primeiros minutos." },
      { id: "comunicacao", rotulo: "Comunicação", tipo: "textarea", dica: "Como você mantém o cliente informado durante o serviço." },
      { id: "explica_orcamento", rotulo: "Como você explica o orçamento", tipo: "textarea", dica: "Item a item, mostrando valor antes do preço." },
      { id: "horas_dirigindo", rotulo: "Horas por semana dirigindo", tipo: "numero", obrigatorio: true, placeholder: "horas" },
      { id: "horas_esperando", rotulo: "Horas por semana esperando cliente", tipo: "numero", obrigatorio: true, placeholder: "horas" },
      { id: "horas_orcamento", rotulo: "Horas por semana fazendo orçamento", tipo: "numero", obrigatorio: true, placeholder: "horas" },
      { id: "horas_material", rotulo: "Horas por semana comprando material", tipo: "numero", obrigatorio: true, placeholder: "horas" },
    ],
    missoes: [
      { tipo: "principal", descricao: "Cronometrar um dia real de trabalho." },
      { tipo: "rapida", descricao: "Anotar o que descobriu." },
    ],
    checklistFinal: "Cronometrei um dia de trabalho e anotei as descobertas.",
    camposManual: ["padrao_atendimento", "horas_dirigindo", "horas_esperando", "horas_orcamento", "horas_material"],
  },
  {
    numero: 6,
    titulo: "Processo Completo (POP)",
    modulo: 2,
    objetivo: "Documentar como você atende, do início ao fim.",
    explicacao: [
      "Processo não é burocracia, é previsibilidade. Quando você documenta o passo a passo do seu atendimento, todo serviço fica com a mesma qualidade — e você consegue ensinar alguém a fazer igual a você.",
      "Escreva como se um novo funcionário fosse executar: sem pular passo.",
    ],
    dicas: [
      {
        titulo: "Escreva em ordem",
        texto: "Do primeiro contato até o pós-venda, em sequência.",
        exemplo: "1. Receber contato → 2. Agendar visita → 3. Avaliar serviço → 4. Enviar orçamento → 5. Executar → 6. Pós-venda.",
      },
    ],
    campos: [
      { id: "passo_1", rotulo: "Passo 1", tipo: "texto", obrigatorio: true },
      { id: "passo_2", rotulo: "Passo 2", tipo: "texto", obrigatorio: true },
      { id: "passo_3", rotulo: "Passo 3", tipo: "texto", obrigatorio: true },
      { id: "passo_4", rotulo: "Passo 4", tipo: "texto" },
      { id: "passo_5", rotulo: "Passo 5", tipo: "texto" },
      { id: "passo_6", rotulo: "Passo 6", tipo: "texto" },
    ],
    missoes: [
      { tipo: "principal", descricao: "Usar esse processo, sem pular passo, no próximo atendimento real." },
    ],
    checklistFinal: "Usei o processo no próximo atendimento real, sem pular passo.",
    camposManual: ["passo_1", "passo_2", "passo_3", "passo_4", "passo_5", "passo_6"],
  },
  {
    numero: 7,
    titulo: "Agenda Inteligente",
    modulo: 2,
    objetivo: "Organizar a rota para perder menos tempo e gastar menos combustível.",
    explicacao: [
      "Quem atende em vários lugares perde horas no trânsito e litros de combustível indo e voltando. O \"vai e volta\" é o maior ladrão de produtividade do autônomo.",
      "Planejar a agenda por região, antes de sair de casa, transforma o seu dia de trabalho em uma rota eficiente.",
    ],
    dicas: [
      {
        titulo: "Agrupe por região",
        texto: "Coloque bairros próximos no mesmo dia e evite o vai e volta.",
        exemplo: "Segunda = zona norte inteira, terça = zona sul, e assim por diante.",
      },
    ],
    campos: [
      { id: "agenda_seg", rotulo: "Segunda-feira — região/bairros", tipo: "textarea", obrigatorio: true },
      { id: "agenda_ter", rotulo: "Terça-feira — região/bairros", tipo: "textarea", obrigatorio: true },
      { id: "agenda_qua", rotulo: "Quarta-feira — região/bairros", tipo: "textarea", obrigatorio: true },
      { id: "agenda_qui", rotulo: "Quinta-feira — região/bairros", tipo: "textarea", obrigatorio: true },
      { id: "agenda_sex", rotulo: "Sexta-feira — região/bairros", tipo: "textarea", obrigatorio: true },
    ],
    missoes: [
      { tipo: "principal", descricao: "Montar a agenda da próxima semana por região antes de sair de casa." },
    ],
    indicador: {
      nome: "Tempo estimado de deslocamento por semana",
      unidade: "horas",
      dica: "Estime o total de horas de deslocamento da semana (dirigindo + esperando cliente).",
    },
    checklistFinal: "Montei a agenda da próxima semana por região.",
    camposManual: ["agenda_seg", "agenda_ter", "agenda_qua", "agenda_qui", "agenda_sex"],
  },
  {
    numero: 8,
    titulo: "Pós-venda",
    modulo: 2,
    objetivo: "Continuar gerando resultado depois que o atendimento termina.",
    explicacao: [
      "O atendimento termina, mas o relacionamento não. As mensagens de 24 horas, 7, 30 e 90 dias mantêm você na memória do cliente, geram avaliações e indicações — e trazem o cliente de volta.",
      "Cada mensagem tem um objetivo: resolver problema (24h), medir satisfação (7d), colher indicação (30d), trazer de volta (90d).",
    ],
    dicas: [
      {
        titulo: "As 4 mensagens",
        texto: "Escreva já, salve como modelo e reutilize em todo cliente.",
        exemplo: "24h: \"Olá, tudo certo com o serviço de ontem?\" — 90d: \"Está na hora de uma revisão, posso verificar?\"",
      },
    ],
    campos: [
      { id: "msg_24h", rotulo: "Mensagem de 24 horas depois", tipo: "textarea", obrigatorio: true, dica: "Objetivo: resolver qualquer problema logo após o serviço." },
      { id: "msg_7d", rotulo: "Mensagem de 7 dias depois (pesquisa)", tipo: "textarea", obrigatorio: true, dica: "Objetivo: medir satisfação e pedir avaliação." },
      { id: "msg_30d", rotulo: "Mensagem de 30 dias depois (indicação)", tipo: "textarea", obrigatorio: true, dica: "Objetivo: pedir indicação de forma natural." },
      { id: "msg_90d", rotulo: "Mensagem de 90 dias depois (nova oferta)", tipo: "textarea", obrigatorio: true, dica: "Objetivo: trazer o cliente de volta com uma nova oferta." },
    ],
    missoes: [
      { tipo: "principal", descricao: "Aplicar a sequência completa nos últimos 5 clientes já atendidos." },
    ],
    checklistFinal: "Apliquei a sequência de pós-venda nos últimos 5 clientes.",
    painelAoTerminar: 2,
    camposManual: ["msg_24h", "msg_7d", "msg_30d", "msg_90d"],
  },
  {
    numero: 9,
    titulo: "Captação de Clientes",
    modulo: 3,
    objetivo: "Ter um processo ativo de atrair cliente novo.",
    explicacao: [
      "Cliente novo não cai do céu: é consequência de um processo ativo de captação. Nesta semana você escolhe os canais onde os seus clientes realmente estão — e cria a frase padrão para pedir indicação, o canal mais barato e mais eficaz que existe.",
      "Prefira 1-2 canais bem feitos do que cinco onde ninguém te vê.",
    ],
    dicas: [
      {
        titulo: "Frase de indicação",
        texto: "Tenha uma frase pronta para usar sempre que terminar um bom atendimento.",
        exemplo: "\"Cada vez que eu atendo um cliente novo, peço: se você conhece alguém que precise desse serviço, me indica?\"",
      },
    ],
    campos: [
      { id: "canal_1", rotulo: "Canal de captação 1", tipo: "texto", obrigatorio: true, placeholder: "ex.: Instagram" },
      { id: "canal_2", rotulo: "Canal de captação 2", tipo: "texto", placeholder: "ex.: indicação" },
      { id: "canal_3", rotulo: "Canal de captação 3", tipo: "texto", placeholder: "ex.: Google Meu Negócio" },
      { id: "frase_indicacao", rotulo: "Frase padrão para pedir indicação", tipo: "textarea", obrigatorio: true },
    ],
    missoes: [
      { tipo: "principal", descricao: "Divulgar em pelo menos 3 momentos nos canais escolhidos essa semana." },
      { tipo: "rapida", descricao: "Pedir indicação a pelo menos 10 clientes." },
    ],
    checklistFinal: "Divulguei 3 vezes nos canais escolhidos e pedi indicações a 10 clientes.",
    camposManual: ["canal_1", "canal_2", "canal_3", "frase_indicacao"],
  },
  {
    numero: 10,
    titulo: "Conversão de Orçamento",
    modulo: 3,
    objetivo: "Descobrir quantos orçamentos viram serviço fechado, e melhorar essa taxa.",
    explicacao: [
      "Enviar orçamento não é o fim, é a metade. A maioria dos orçamentos se perde por falta de follow-up — o cliente esquece, encontra outro, adia.",
      "Medindo a taxa de conversão você descobre onde está vazando. E com follow-up de 100% dos orçamentos em aberto, você tapa o buraco.",
    ],
    dicas: [
      {
        titulo: "Follow-up que funciona",
        texto: "Follow-up não é \"encher o saco\": é dar informação nova (prazo, disponibilidade, condição).",
        exemplo: "Taxa de conversão = 8 fechados ÷ 20 enviados = 40%.",
      },
    ],
    campos: [
      { id: "orcamentos_enviados", rotulo: "Orçamentos enviados no mês", tipo: "numero", obrigatorio: true },
      { id: "orcamentos_fechados", rotulo: "Orçamentos fechados no mês", tipo: "numero", obrigatorio: true },
      { id: "taxa_conversao", rotulo: "Taxa de conversão (fechados ÷ enviados)", tipo: "numero", obrigatorio: true, placeholder: "calculado automaticamente", dica: "Valor calculado automaticamente em %." },
      { id: "mensagem_followup", rotulo: "Mensagem padrão de follow-up", tipo: "textarea", obrigatorio: true },
    ],
    missoes: [
      { tipo: "principal", descricao: "Fazer follow-up de 100% dos orçamentos em aberto essa semana." },
    ],
    indicador: {
      nome: "Taxa de conversão de orçamentos",
      unidade: "%",
      dica: "Taxa de conversão = orçamentos fechados ÷ orçamentos enviados × 100.",
    },
    checklistFinal: "Fiz follow-up de 100% dos orçamentos em aberto.",
    camposManual: ["orcamentos_enviados", "orcamentos_fechados", "taxa_conversao", "mensagem_followup"],
  },
  {
    numero: 11,
    titulo: "Indicadores e Autoridade",
    modulo: 3,
    objetivo: "Medir o negócio de verdade e ser mais lembrado na região.",
    explicacao: [
      "O que não é medido não é gerenciado. Os 10 indicadores desta semana mostram a saúde real do negócio — receita, lucro, margem, captação e satisfação.",
      "E autoridade na região — Google Meu Negócio atualizado com avaliações e fotos de antes/depois — é o que faz o cliente te escolher antes da concorrência.",
    ],
    dicas: [
      {
        titulo: "Avaliação no momento certo",
        texto: "Peça a avaliação no momento de maior satisfação, logo após o serviço. E tire foto de antes/depois em todo serviço — é a sua vitrine.",
      },
    ],
    campos: [
      {
        id: "tabela_indicadores",
        rotulo: "Tabela com 10 indicadores",
        tipo: "tabela_fixa",
        linhas: [
          { id: "num_orcamentos", rotulo: "Nº de orçamentos" },
          { id: "num_vendas", rotulo: "Nº de vendas" },
          { id: "ticket_medio", rotulo: "Ticket médio (R$)" },
          { id: "lucro", rotulo: "Lucro (R$)" },
          { id: "margem", rotulo: "Margem (%)" },
          { id: "clientes_novos", rotulo: "Clientes novos" },
          { id: "clientes_antigos", rotulo: "Clientes antigos recuperados" },
          { id: "indicacoes", rotulo: "Indicações" },
          { id: "avaliacoes_google", rotulo: "Avaliações no Google" },
          { id: "tempo_atendimento", rotulo: "Tempo médio por atendimento (horas)" },
        ],
      },
    ],
    missoes: [
      { tipo: "principal", descricao: "Cadastrar/atualizar o Google Meu Negócio." },
      { tipo: "rapida", descricao: "Pedir avaliação a 3 clientes satisfeitos e tirar foto de antes/depois no próximo serviço." },
    ],
    checklistFinal: "Cadastrei o Google Meu Negócio, pedi avaliações e preenchi os 10 indicadores.",
    camposManual: ["tabela_indicadores"],
  },
  {
    numero: 12,
    titulo: "Escala e Fechamento",
    modulo: 3,
    objetivo: "Decidir com clareza o que vem depois dos 90 dias.",
    explicacao: [
      "Os 90 dias terminaram. Agora é hora de olhar para trás, medir o que mudou e decidir com clareza o próximo ciclo.",
      "Responda o checklist de decisão com honestidade: se os três itens estiverem marcados, o seu negócio já tem sinais de escala — e o próximo passo pode ser montar um time.",
    ],
    dicas: [
      {
        titulo: "Objetivo com data e número",
        texto: "O próximo objetivo precisa de data e número: \"em 90 dias, faturar R$ X com N clientes\".",
        exemplo: "Se bate a meta há 2 meses + tem processo documentado + mais demanda do que consegue atender, é hora de contratar.",
      },
    ],
    campos: [
      { id: "conquista_90dias", rotulo: "Maior conquista dos 90 dias", tipo: "textarea", obrigatorio: true },
      { id: "melhorar_proximo", rotulo: "O que ainda precisa melhorar", tipo: "textarea", obrigatorio: true },
      { id: "proximo_objetivo", rotulo: "Próximo objetivo", tipo: "textarea", obrigatorio: true, dica: "Escreva com data e número: \"em 90 dias, faturar R$ X com N clientes\"." },
      { id: "data_objetivo", rotulo: "Data do próximo objetivo", tipo: "data", obrigatorio: true },
    ],
    checklistDecisao: {
      itens: [
        { id: "decisao_meta_minima", rotulo: "Já bato a meta mínima há 2 meses" },
        { id: "decisao_processo", rotulo: "Tenho processo documentado" },
        { id: "decisao_clientes", rotulo: "Tenho mais cliente do que consigo atender sozinho" },
      ],
      sugestao: "Os 3 sinais de escala estão presentes: é hora de considerar a contratação de ajuda para o próximo ciclo.",
    },
    missoes: [
      { tipo: "principal", descricao: "Escrever e assumir o próximo objetivo de 90 dias, com data." },
    ],
    checklistFinal: "Escrevi e assumi meu próximo objetivo de 90 dias, com data.",
    painelAoTerminar: 3,
    camposManual: ["conquista_90dias", "melhorar_proximo", "proximo_objetivo", "data_objetivo"],
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
