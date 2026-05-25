export type Nivel = "saudavel" | "atencao" | "risco" | "perdido";
export type StatusContato = "contatado" | "aguardando" | "visita" | "convertido";
export type TipoCliente = "loja" | "externo" | "novo" | "espontaneo";

export interface InteractionInput {
  status: StatusContato;
  tipo: TipoCliente;
  valorPedido?: number;
  nivelAtualCliente: Nivel;
}

export const calcNivel = (
  situacaoCRM: string,
  diasSemComprar: number,
): Nivel => {
  const sit = situacaoCRM.toLowerCase();

  if (sit.includes("antigo")) return "perdido";
  if (sit.includes("recente")) return "risco";
  if (diasSemComprar < 30) return "saudavel";

  return "atencao";
};

export const calcPontos = (input: InteractionInput) => {
  let convPonderada = 0;
  const valor = input.valorPedido ?? 0;

  const deparaPontosBase: Record<StatusContato, number> = {
    contatado: 5,
    aguardando: 10,
    visita: 30,
    convertido: 50,
  };

  let pts = deparaPontosBase[input.status];

  if (input.status === "convertido") {
    if (input.tipo === "novo") pts = 80;
    else if (input.tipo === "espontaneo") pts = 20;

    if (input.tipo === "novo") convPonderada = 1.5;
    else if (input.tipo === "espontaneo") convPonderada = 0.5;
    else {
      if (valor < 150) convPonderada = 0;
      else if (valor <= 300) convPonderada = 0.5;
      else if (valor <= 800) convPonderada = 1;
      else convPonderada = 2;
    }

    if (valor > 800 && input.tipo === "loja") pts += 20;
    if (input.tipo === "loja" && input.nivelAtualCliente === "perdido") {
      pts += 30;
    }
  }

  return { pts, convPonderada };
};

export const calcMarcos = (meta: number, ticketMedio = 400) => {
  const ptsMeta = Math.round(meta / (ticketMedio || 400)) * 50;
  const config = [
    { perc: 0.14, conv: 0, premio: "Sa\u00edda 1h mais cedo", nome: "Bronze" },
    { perc: 0.3, conv: 2, premio: "Almo\u00e7o por conta", nome: "Prata" },
    { perc: 0.5, conv: 5, premio: "Cinema (1 ingresso)", nome: "Ouro" },
    { perc: 0.76, conv: 10, premio: "Noite da pizza", nome: "Diamante" },
    { perc: 1.1, conv: 17, premio: "Folga remunerada", nome: "Black" },
  ];

  return config.map((c) => ({
    nome: c.nome,
    xpExigido: Math.round(ptsMeta * c.perc),
    convPonderadaExigida: c.conv,
    premio: c.premio,
  }));
};

export const ehClienteLoja = (vendedorCRM: string): boolean => {
  const vendedoresLoja = [
    "fenie pro",
    "loja",
    "comercial interno",
    "financeiro",
    "laryssa",
    "ricardo",
  ];
  const v = vendedorCRM.toLowerCase();

  return vendedoresLoja.some((item) => v.includes(item));
};
