import confetti from "canvas-confetti";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Award,
  BarChart3,
  BellRing,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  FileSpreadsheet,
  Flame,
  Gauge,
  Medal,
  PhoneCall,
  Search,
  Sparkles,
  Target,
  Trophy,
  Upload,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import * as XLSX from "xlsx";
import {
  calcMarcos,
  calcNivel,
  calcPontos,
  ehClienteLoja,
  type Nivel,
  type StatusContato,
  type TipoCliente,
} from "./lib/reativacao";

type Cliente = {
  id: string;
  nome: string;
  vendedorCRM: string;
  situacaoCRM: string;
  diasSemComprar: number;
  ticketMedio: number;
  nivel: Nivel;
  tipo: TipoCliente;
  ultimaCompra: string;
  ultimaAcao?: string;
};

type Interacao = {
  id: string;
  clienteId: string;
  clienteNome: string;
  status: StatusContato;
  tipo: TipoCliente;
  valorPedido: number;
  pts: number;
  convPonderada: number;
  criadoEm: string;
};

const clientesIniciais: Cliente[] = [
  {
    id: "cli-001",
    nome: "Bella Dermocosmeticos",
    vendedorCRM: "Fenie PRO Loja",
    situacaoCRM: "Cliente antigo sem recompra",
    diasSemComprar: 142,
    ticketMedio: 620,
    nivel: "perdido",
    tipo: "loja",
    ultimaCompra: "2025-12-28",
    ultimaAcao: "Ligacao pendente",
  },
  {
    id: "cli-002",
    nome: "Clinica Harmonia",
    vendedorCRM: "Comercial externo",
    situacaoCRM: "Cliente recente com queda",
    diasSemComprar: 63,
    ticketMedio: 430,
    nivel: "risco",
    tipo: "externo",
    ultimaCompra: "2026-03-18",
    ultimaAcao: "WhatsApp enviado",
  },
  {
    id: "cli-003",
    nome: "Espaco Renova",
    vendedorCRM: "Laryssa",
    situacaoCRM: "Compra ativa",
    diasSemComprar: 21,
    ticketMedio: 380,
    nivel: "saudavel",
    tipo: "loja",
    ultimaCompra: "2026-05-03",
  },
  {
    id: "cli-004",
    nome: "Studio Pele Viva",
    vendedorCRM: "Ricardo",
    situacaoCRM: "Sem movimento",
    diasSemComprar: 88,
    ticketMedio: 520,
    nivel: "atencao",
    tipo: "loja",
    ultimaCompra: "2026-02-26",
    ultimaAcao: "Visita agendada",
  },
  {
    id: "cli-005",
    nome: "Nova Estetica Prime",
    vendedorCRM: "Lead espontaneo",
    situacaoCRM: "Novo contato",
    diasSemComprar: 0,
    ticketMedio: 0,
    nivel: "saudavel",
    tipo: "espontaneo",
    ultimaCompra: "2026-05-24",
  },
];

const statusOptions: Array<{ value: StatusContato; label: string }> = [
  { value: "contatado", label: "Contatado" },
  { value: "aguardando", label: "Aguardando" },
  { value: "visita", label: "Visita" },
  { value: "convertido", label: "Convertido" },
];

const nivelStyles: Record<Nivel, string> = {
  saudavel: "bg-emerald-50 text-emerald-700 border-emerald-200",
  atencao: "bg-amber-50 text-amber-700 border-amber-200",
  risco: "bg-orange-50 text-orange-700 border-orange-200",
  perdido: "bg-rose-50 text-rose-700 border-rose-200",
};

const statusStyles: Record<StatusContato, string> = {
  contatado: "bg-slate-100 text-slate-700",
  aguardando: "bg-amber-100 text-amber-800",
  visita: "bg-blue-100 text-blue-800",
  convertido: "bg-emerald-100 text-emerald-800",
};

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function getLocalStorage<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function normalizarTexto(value: unknown) {
  return String(value ?? "").trim();
}

function normalizarNumero(value: unknown) {
  const parsed = Number(String(value ?? "0").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function criarClienteDaLinha(row: Record<string, unknown>, index: number): Cliente {
  const nome =
    normalizarTexto(row.nome) ||
    normalizarTexto(row.cliente) ||
    normalizarTexto(row.Cliente) ||
    `Cliente ${index + 1}`;
  const vendedorCRM =
    normalizarTexto(row.vendedorCRM) ||
    normalizarTexto(row.vendedor) ||
    normalizarTexto(row.Vendedor);
  const situacaoCRM =
    normalizarTexto(row.situacaoCRM) ||
    normalizarTexto(row.situacao) ||
    normalizarTexto(row.Situacao);
  const diasSemComprar =
    normalizarNumero(row.diasSemComprar) ||
    normalizarNumero(row.dias_sem_comprar) ||
    normalizarNumero(row.Dias);
  const ticketMedio =
    normalizarNumero(row.ticketMedio) ||
    normalizarNumero(row.ticket_medio) ||
    normalizarNumero(row.Ticket);
  const tipo = ehClienteLoja(vendedorCRM) ? "loja" : "externo";

  return {
    id: `imp-${Date.now()}-${index}`,
    nome,
    vendedorCRM: vendedorCRM || "Sem vendedor",
    situacaoCRM: situacaoCRM || "Sem situacao",
    diasSemComprar,
    ticketMedio,
    nivel: calcNivel(situacaoCRM, diasSemComprar),
    tipo,
    ultimaCompra: new Date(
      Date.now() - diasSemComprar * 24 * 60 * 60 * 1000,
    )
      .toISOString()
      .slice(0, 10),
  };
}

function App() {
  const [clientes, setClientes] = useState<Cliente[]>(() =>
    getLocalStorage("fenie-clientes", clientesIniciais),
  );
  const [interacoes, setInteracoes] = useState<Interacao[]>(() =>
    getLocalStorage("fenie-interacoes", []),
  );
  const [busca, setBusca] = useState("");
  const [filtroNivel, setFiltroNivel] = useState<Nivel | "todos">("todos");
  const [clienteId, setClienteId] = useState(clientes[0]?.id ?? "");
  const [status, setStatus] = useState<StatusContato>("contatado");
  const [valorPedido, setValorPedido] = useState("");

  const clienteSelecionado =
    clientes.find((cliente) => cliente.id === clienteId) ?? clientes[0];

  useEffect(() => {
    localStorage.setItem("fenie-clientes", JSON.stringify(clientes));
  }, [clientes]);

  useEffect(() => {
    localStorage.setItem("fenie-interacoes", JSON.stringify(interacoes));
  }, [interacoes]);

  const resumo = useMemo(() => {
    const xp = interacoes.reduce((total, item) => total + item.pts, 0);
    const convPonderada = interacoes.reduce(
      (total, item) => total + item.convPonderada,
      0,
    );
    const receita = interacoes.reduce(
      (total, item) => total + item.valorPedido,
      0,
    );
    const emRisco = clientes.filter((cliente) =>
      ["risco", "perdido"].includes(cliente.nivel),
    ).length;
    const ticketMedio =
      clientes.reduce((total, cliente) => total + cliente.ticketMedio, 0) /
      Math.max(clientes.length, 1);

    return {
      xp,
      convPonderada,
      receita,
      emRisco,
      ticketMedio: Math.round(ticketMedio || 400),
    };
  }, [clientes, interacoes]);

  const marcos = useMemo(
    () => calcMarcos(28000, resumo.ticketMedio || 400),
    [resumo.ticketMedio],
  );

  const marcoAtual =
    [...marcos]
      .reverse()
      .find(
        (marco) =>
          resumo.xp >= marco.xpExigido &&
          resumo.convPonderada >= marco.convPonderadaExigida,
      ) ?? marcos[0];
  const proximoMarco =
    marcos.find(
      (marco) =>
        resumo.xp < marco.xpExigido ||
        resumo.convPonderada < marco.convPonderadaExigida,
    ) ?? marcos[marcos.length - 1];
  const progresso = Math.min(
    100,
    Math.round((resumo.xp / Math.max(proximoMarco.xpExigido, 1)) * 100),
  );

  const clientesFiltrados = useMemo(() => {
    return clientes
      .filter((cliente) => filtroNivel === "todos" || cliente.nivel === filtroNivel)
      .filter((cliente) =>
        [cliente.nome, cliente.vendedorCRM, cliente.situacaoCRM]
          .join(" ")
          .toLowerCase()
          .includes(busca.toLowerCase()),
      )
      .sort((a, b) => b.diasSemComprar - a.diasSemComprar);
  }, [busca, clientes, filtroNivel]);

  const registrarInteracao = () => {
    if (!clienteSelecionado) {
      toast.error("Selecione um cliente");
      return;
    }

    const valor = normalizarNumero(valorPedido);
    const resultado = calcPontos({
      status,
      tipo: clienteSelecionado.tipo,
      valorPedido: valor,
      nivelAtualCliente: clienteSelecionado.nivel,
    });
    const novaInteracao: Interacao = {
      id: crypto.randomUUID(),
      clienteId: clienteSelecionado.id,
      clienteNome: clienteSelecionado.nome,
      status,
      tipo: clienteSelecionado.tipo,
      valorPedido: valor,
      pts: resultado.pts,
      convPonderada: resultado.convPonderada,
      criadoEm: new Date().toISOString(),
    };

    setInteracoes((atuais) => [novaInteracao, ...atuais]);
    setClientes((atuais) =>
      atuais.map((cliente) =>
        cliente.id === clienteSelecionado.id
          ? {
              ...cliente,
              nivel: status === "convertido" ? "saudavel" : cliente.nivel,
              diasSemComprar: status === "convertido" ? 0 : cliente.diasSemComprar,
              ultimaAcao: statusOptions.find((item) => item.value === status)?.label,
            }
          : cliente,
      ),
    );
    setValorPedido("");
    toast.success(`+${resultado.pts} XP registrado`);

    if (status === "convertido") {
      confetti({
        particleCount: 110,
        spread: 70,
        origin: { y: 0.72 },
        colors: ["#C8932E", "#1A1F36", "#34D399"],
      });
    }
  };

  const importarPlanilha = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
    const novosClientes = rows.map(criarClienteDaLinha);

    setClientes((atuais) => [...novosClientes, ...atuais]);
    toast.success(`${novosClientes.length} clientes importados`);
  };

  const limparDemo = () => {
    setClientes(clientesIniciais);
    setInteracoes([]);
    setClienteId(clientesIniciais[0].id);
    setBusca("");
    setFiltroNivel("todos");
    toast.success("Base restaurada");
  };

  return (
    <div className="min-h-screen bg-background text-slate-900">
      <Toaster position="top-right" />
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 bg-sidebar text-white lg:flex lg:flex-col">
          <div className="border-b border-white/10 p-6">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-md bg-primary text-lg font-black text-sidebar">
                FP
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-white/50">
                  Fenie PRO
                </p>
                <h1 className="font-display text-2xl font-semibold">
                  Reativacao
                </h1>
              </div>
            </div>
          </div>

          <nav className="space-y-1 p-4">
            {[
              { icon: BarChart3, label: "Painel" },
              { icon: Users, label: "Clientes" },
              { icon: PhoneCall, label: "Contato" },
              { icon: Trophy, label: "Premios" },
            ].map((item) => (
              <button
                className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm font-semibold text-white/75 transition hover:bg-white/10 hover:text-white"
                key={item.label}
                type="button"
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-auto p-4">
            <div className="rounded-md border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="h-5 w-5" />
                <span className="text-sm font-semibold">Meta ativa</span>
              </div>
              <p className="mt-2 text-2xl font-black">{resumo.xp} XP</p>
              <p className="text-sm text-white/60">
                Marco atual: {marcoAtual.nome}
              </p>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-primary">
                  <BellRing className="h-4 w-4" />
                  Campanha de reativacao
                </p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  Central de carteira e conversoes
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-primary hover:text-sidebar">
                  <Upload className="h-4 w-4" />
                  Importar
                  <input
                    accept=".csv,.xlsx,.xls"
                    className="sr-only"
                    type="file"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void importarPlanilha(file);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
                <button
                  className="inline-flex items-center gap-2 rounded-md bg-sidebar px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                  type="button"
                  onClick={limparDemo}
                >
                  <ClipboardList className="h-4 w-4" />
                  Resetar base
                </button>
              </div>
            </div>
          </header>

          <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  icon: Flame,
                  label: "XP da campanha",
                  value: `${resumo.xp}`,
                  detail: `${progresso}% ate ${proximoMarco.nome}`,
                },
                {
                  icon: Target,
                  label: "Conversao ponderada",
                  value: resumo.convPonderada.toFixed(1),
                  detail: `${proximoMarco.convPonderadaExigida} exigidas no proximo marco`,
                },
                {
                  icon: Gauge,
                  label: "Clientes em risco",
                  value: `${resumo.emRisco}`,
                  detail: `${clientes.length} clientes na carteira`,
                },
                {
                  icon: CircleDollarSign,
                  label: "Receita recuperada",
                  value: moeda.format(resumo.receita),
                  detail: `Ticket medio ${moeda.format(resumo.ticketMedio)}`,
                },
              ].map((kpi) => (
                <article
                  className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"
                  key={kpi.label}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-500">
                      {kpi.label}
                    </span>
                    <kpi.icon className="h-5 w-5 text-primary" />
                  </div>
                  <p className="mt-3 font-kpi text-3xl font-black text-slate-950">
                    {kpi.value}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">{kpi.detail}</p>
                </article>
              ))}
            </section>

            <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.85fr)]">
              <div className="min-w-0 space-y-6">
                <section className="min-w-0 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h3 className="text-lg font-black text-slate-950">
                        Carteira priorizada
                      </h3>
                      <p className="text-sm text-slate-500">
                        Clientes ordenados pelo tempo sem compra.
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 sm:w-64"
                          placeholder="Buscar cliente"
                          value={busca}
                          onChange={(event) => setBusca(event.target.value)}
                        />
                      </div>
                      <select
                        className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                        value={filtroNivel}
                        onChange={(event) =>
                          setFiltroNivel(event.target.value as Nivel | "todos")
                        }
                      >
                        <option value="todos">Todos os niveis</option>
                        <option value="perdido">Perdido</option>
                        <option value="risco">Risco</option>
                        <option value="atencao">Atencao</option>
                        <option value="saudavel">Saudavel</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-5 max-w-full overflow-x-auto">
                    <table className="min-w-[640px] divide-y divide-slate-200 text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-3 py-3 font-bold">Cliente</th>
                          <th className="px-3 py-3 font-bold">Nivel</th>
                          <th className="px-3 py-3 font-bold">Dias</th>
                          <th className="px-3 py-3 font-bold">Ticket</th>
                          <th className="px-3 py-3 font-bold">Ultima acao</th>
                          <th className="px-3 py-3 font-bold"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {clientesFiltrados.map((cliente) => (
                          <tr
                            className="transition hover:bg-slate-50"
                            key={cliente.id}
                          >
                            <td className="px-3 py-4">
                              <p className="font-bold text-slate-950">
                                {cliente.nome}
                              </p>
                              <p className="text-xs text-slate-500">
                                {cliente.vendedorCRM} • {cliente.tipo}
                              </p>
                            </td>
                            <td className="px-3 py-4">
                              <span
                                className={`inline-flex rounded-md border px-2 py-1 text-xs font-bold capitalize ${nivelStyles[cliente.nivel]}`}
                              >
                                {cliente.nivel}
                              </span>
                            </td>
                            <td className="px-3 py-4 font-kpi text-lg font-black text-slate-950">
                              {cliente.diasSemComprar}
                            </td>
                            <td className="px-3 py-4 text-slate-700">
                              {moeda.format(cliente.ticketMedio)}
                            </td>
                            <td className="px-3 py-4 text-slate-500">
                              {cliente.ultimaAcao ?? "Sem acao"}
                            </td>
                            <td className="px-3 py-4 text-right">
                              <button
                                className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-bold text-slate-700 transition hover:border-primary hover:text-sidebar"
                                type="button"
                                onClick={() => setClienteId(cliente.id)}
                              >
                                Usar
                                <ChevronRight className="h-3 w-3" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="min-w-0 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-black text-slate-950">
                        Trilha de premios
                      </h3>
                      <p className="text-sm text-slate-500">
                        XP e conversoes ponderadas destravam cada marco.
                      </p>
                    </div>
                    <Medal className="h-7 w-7 text-primary" />
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-5">
                    {marcos.map((marco) => {
                      const completo =
                        resumo.xp >= marco.xpExigido &&
                        resumo.convPonderada >= marco.convPonderadaExigida;
                      return (
                        <article
                          className={`rounded-md border p-3 ${
                            completo
                              ? "border-primary bg-primary/10"
                              : "border-slate-200 bg-slate-50"
                          }`}
                          key={marco.nome}
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-black text-slate-950">
                              {marco.nome}
                            </p>
                            {completo ? (
                              <CheckCircle2 className="h-4 w-4 text-primary" />
                            ) : (
                              <Award className="h-4 w-4 text-slate-400" />
                            )}
                          </div>
                          <p className="mt-2 text-xs text-slate-500">
                            {marco.xpExigido} XP •{" "}
                            {marco.convPonderadaExigida} conv.
                          </p>
                          <p className="mt-2 text-sm font-semibold text-slate-700">
                            {marco.premio}
                          </p>
                        </article>
                      );
                    })}
                  </div>
                </section>
              </div>

              <aside className="min-w-0 space-y-6">
                <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-black text-slate-950">
                        Registrar acao
                      </h3>
                      <p className="text-sm text-slate-500">
                        Cada registro atualiza XP, status e ranking.
                      </p>
                    </div>
                    <PhoneCall className="h-7 w-7 text-primary" />
                  </div>

                  <div className="mt-5 space-y-4">
                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Cliente
                      </span>
                      <select
                        className="mt-1 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                        value={clienteSelecionado?.id ?? ""}
                        onChange={(event) => setClienteId(event.target.value)}
                      >
                        {clientes.map((cliente) => (
                          <option key={cliente.id} value={cliente.id}>
                            {cliente.nome}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      {statusOptions.map((item) => (
                        <button
                          className={`rounded-md border px-3 py-2 text-sm font-bold transition ${
                            status === item.value
                              ? "border-primary bg-primary text-sidebar"
                              : "border-slate-200 bg-white text-slate-700 hover:border-primary"
                          }`}
                          key={item.value}
                          type="button"
                          onClick={() => setStatus(item.value)}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Valor do pedido
                      </span>
                      <input
                        className="mt-1 h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={valorPedido}
                        onChange={(event) => setValorPedido(event.target.value)}
                      />
                    </label>

                    {clienteSelecionado ? (
                      <div className="rounded-md bg-slate-50 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <span
                            className={`rounded-md px-2 py-1 text-xs font-bold capitalize ${statusStyles[status]}`}
                          >
                            {status}
                          </span>
                          <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
                            {clienteSelecionado.tipo}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">
                          Nivel atual:{" "}
                          <strong className="capitalize text-slate-950">
                            {clienteSelecionado.nivel}
                          </strong>
                        </p>
                      </div>
                    ) : null}

                    <button
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-black text-sidebar shadow-sm transition hover:brightness-95"
                      type="button"
                      onClick={registrarInteracao}
                    >
                      <Sparkles className="h-4 w-4" />
                      Salvar pontuacao
                    </button>
                  </div>
                </section>

                <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-black text-slate-950">
                        Atividade recente
                      </h3>
                      <p className="text-sm text-slate-500">
                        Ultimos registros da campanha.
                      </p>
                    </div>
                    <FileSpreadsheet className="h-7 w-7 text-primary" />
                  </div>

                  <div className="mt-5 space-y-3">
                    {interacoes.slice(0, 6).map((interacao) => (
                      <article
                        className="rounded-md border border-slate-200 p-3"
                        key={interacao.id}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-bold text-slate-950">
                              {interacao.clienteNome}
                            </p>
                            <p className="text-xs text-slate-500">
                              {formatDistanceToNow(new Date(interacao.criadoEm), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </p>
                          </div>
                          <span
                            className={`rounded-md px-2 py-1 text-xs font-bold ${statusStyles[interacao.status]}`}
                          >
                            +{interacao.pts}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">
                          {moeda.format(interacao.valorPedido)} •{" "}
                          {interacao.convPonderada.toFixed(1)} conv.
                        </p>
                      </article>
                    ))}

                    {interacoes.length === 0 ? (
                      <div className="rounded-md border border-dashed border-slate-300 p-5 text-center">
                        <p className="text-sm font-semibold text-slate-600">
                          Nenhuma acao registrada ainda.
                        </p>
                      </div>
                    ) : null}
                  </div>
                </section>
              </aside>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
