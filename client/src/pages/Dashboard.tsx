import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, FileText, AlertTriangle, Clock, Plus, Users, ChevronDown, ChevronRight, Filter } from "lucide-react";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import MedicaoModal from "./modals/MedicaoModal";

function formatCurrency(value: number | string | null | undefined) {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
}

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

function getMesAtual() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getMesLabel(mes: string) {
  const [year, month] = mes.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    .replace(/^\w/, c => c.toUpperCase());
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ativo: "bg-green-100 text-green-700",
    pendente: "bg-yellow-100 text-yellow-700",
    paga: "bg-green-100 text-green-700",
    cancelada: "bg-red-100 text-red-700",
    concluido: "bg-blue-100 text-blue-700",
    cancelado: "bg-red-100 text-red-700",
  };
  const labels: Record<string, string> = {
    ativo: "Ativo", pendente: "Pendente", paga: "Pago", cancelada: "Cancelada",
    concluido: "Concluído", cancelado: "Cancelado",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || "bg-gray-100 text-gray-600"}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {labels[status] || status}
    </span>
  );
}

function TipoBadge({ tipo }: { tipo: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${tipo === "fixo" ? "bg-gray-100 text-gray-600" : "bg-blue-50 text-blue-600"}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1" />
      {tipo === "fixo" ? "Fixo" : "Mensal"}
    </span>
  );
}

function AvatarInitial({ nome }: { nome: string }) {
  const initial = nome.charAt(0).toUpperCase();
  const colors = [
    "bg-violet-100 text-violet-700",
    "bg-blue-100 text-blue-700",
    "bg-emerald-100 text-emerald-700",
    "bg-orange-100 text-orange-700",
    "bg-pink-100 text-pink-700",
    "bg-teal-100 text-teal-700",
  ];
  const idx = nome.charCodeAt(0) % colors.length;
  return (
    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${colors[idx]}`}>
      {initial}
    </span>
  );
}

export default function Dashboard() {
  const mesAtual = getMesAtual();
  const [mesGerencial, setMesGerencial] = useState(mesAtual);
  const [filtroResponsavel, setFiltroResponsavel] = useState<string>("todos");
  const [expandedResponsavel, setExpandedResponsavel] = useState<string | null>(null);

  const { data, isLoading } = trpc.dashboard.getData.useQuery();
  const { data: gerencial = [], isLoading: loadingGerencial } = trpc.dashboard.getGerencial.useQuery(
    { mes: mesGerencial },
    { enabled: !!mesGerencial }
  );
  const utils = trpc.useUtils();
  const [modalOpen, setModalOpen] = useState(false);
  const [defaultPedidoId, setDefaultPedidoId] = useState<number | null>(null);
  const [defaultValor, setDefaultValor] = useState<string | null>(null);

  const handleCriarPendente = (pedidoId: number, valorPrevisto: string) => {
    setDefaultPedidoId(pedidoId);
    setDefaultValor(valorPrevisto);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setDefaultPedidoId(null);
    setDefaultValor(null);
    utils.dashboard.getData.invalidate();
    utils.dashboard.getGerencial.invalidate();
  };

  type MedicaoCriar = {
    pedidoId: number; pedidoNumero: string; fornecedorNome: string;
    valorPrevisto: string; tipo: string; responsavel?: string | null;
  };
  type MedicaoAtraso = {
    pedidoId: number;
    pedidoNumero: string;
    fornecedorNome: string;
    mes: string;
    valorPrevisto: string;
    responsavel?: string | null;
    tipoAtraso: "mes_anterior" | "mes_atual_apos_dia10";
  };
  type PedidoAndamento = {
    id: number; numero: string; fornecedorNome: string; tipo: string; valor: string;
    totalMedicoesCriadas: number; totalMedicoesPrevistas: number; totalConsumido: number;
    totalPago: number; proximaMedicao: string | null; status: string; responsavel?: string | null;
  };
  type GerencialItem = {
    responsavel: string;
    totalPedidos: number;
    valorTotal: number;
    medicoesCriadas: number;
    medicoesPendentes: number;
    pedidosPendentes: Array<{ pedidoId: number; pedidoNumero: string; fornecedorNome: string; valorPrevisto: string }>;
  };

  const medicoesCriarListaAll = (data?.medicoesCriarMesLista ?? []) as MedicaoCriar[];
  const medicoesAtrasoAll = (data?.medicoesAtraso ?? []) as MedicaoAtraso[];
  const pedidosEmAndamentoAll = (data?.pedidosEmAndamento ?? []) as PedidoAndamento[];
  const gerencialData = gerencial as GerencialItem[];

  // Mapas de KPIs por responsável vindos do backend
  const pedidosAtivosPorResp = (data?.pedidosAtivosPorResponsavel ?? {}) as Record<string, number>;
  const medicoesPagasPorResp = (data?.medicoesPagasPorResponsavel ?? {}) as Record<string, number>;
  const valorEmAtrasoPorResp = (data?.valorEmAtrasoPorResponsavel ?? {}) as Record<string, number>;

  // Lista de responsáveis únicos (union de todas as fontes de dados)
  const responsaveisUnicos = useMemo(() => {
    const set = new Set<string>();
    gerencialData.forEach(g => set.add(g.responsavel));
    medicoesCriarListaAll.forEach(m => { if (m.responsavel) set.add(m.responsavel); });
    medicoesAtrasoAll.forEach(m => { if (m.responsavel) set.add(m.responsavel); });
    pedidosEmAndamentoAll.forEach(p => { if (p.responsavel) set.add(p.responsavel); });
    Object.keys(pedidosAtivosPorResp).forEach(r => set.add(r));
    return Array.from(set).sort();
  }, [gerencialData, medicoesCriarListaAll, medicoesAtrasoAll, pedidosEmAndamentoAll, pedidosAtivosPorResp]);

  const filtrado = filtroResponsavel !== "todos";

  // ── Filtros aplicados em cada seção ──────────────────────────────────────
  const medicoesCriarLista = useMemo(() => {
    if (!filtrado) return medicoesCriarListaAll;
    return medicoesCriarListaAll.filter(m => (m.responsavel || "Sem responsável") === filtroResponsavel);
  }, [medicoesCriarListaAll, filtroResponsavel, filtrado]);

  const medicoesAtraso = useMemo(() => {
    if (!filtrado) return medicoesAtrasoAll;
    return medicoesAtrasoAll.filter(m => (m.responsavel || "Sem responsável") === filtroResponsavel);
  }, [medicoesAtrasoAll, filtroResponsavel, filtrado]);

  const pedidosFiltrados = useMemo(() => {
    if (!filtrado) return pedidosEmAndamentoAll;
    return pedidosEmAndamentoAll.filter(p => (p.responsavel || "Sem responsável") === filtroResponsavel);
  }, [pedidosEmAndamentoAll, filtroResponsavel, filtrado]);

  const gerencialFiltrado = useMemo(() => {
    if (!filtrado) return gerencialData;
    return gerencialData.filter(g => g.responsavel === filtroResponsavel);
  }, [gerencialData, filtroResponsavel, filtrado]);

  // ── KPIs filtrados ────────────────────────────────────────────────────────
  const kpiPedidosAtivos = filtrado
    ? (pedidosAtivosPorResp[filtroResponsavel] ?? 0)
    : (data?.pedidosAtivos ?? 0);

  const kpiMedicoesPagas = filtrado
    ? (medicoesPagasPorResp[filtroResponsavel] ?? 0)
    : (data?.totalMedicoesPagas ?? 0);

  const kpiMedicoesCriar = medicoesCriarLista.length;

  const kpiValorAtraso = filtrado
    ? (valorEmAtrasoPorResp[filtroResponsavel] ?? 0)
    : (data?.valorEmAtraso ?? 0);

  const kpiAtrasoCount = medicoesAtraso.length;

  // ── Totalizadores do painel gerencial ────────────────────────────────────
  const totaisGerenciais = useMemo(() => {
    return gerencialFiltrado.reduce((acc, g) => ({
      totalPedidos: acc.totalPedidos + g.totalPedidos,
      valorTotal: acc.valorTotal + g.valorTotal,
      medicoesCriadas: acc.medicoesCriadas + g.medicoesCriadas,
      medicoesPendentes: acc.medicoesPendentes + g.medicoesPendentes,
    }), { totalPedidos: 0, valorTotal: 0, medicoesCriadas: 0, medicoesPendentes: 0 });
  }, [gerencialFiltrado]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Cabeçalho com filtro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-heading font-bold text-gray-900">Visão Geral</h1>
          {filtrado && (
            <span className="inline-flex items-center gap-1.5 bg-violet-100 text-violet-700 text-xs font-semibold px-3 py-1 rounded-full">
              <Filter className="h-3 w-3" />
              {filtroResponsavel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filtroResponsavel}
            onChange={e => { setFiltroResponsavel(e.target.value); setExpandedResponsavel(null); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="todos">Todos os responsáveis</option>
            {responsaveisUnicos.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <Link href="/pedidos">
            <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              + Novo Pedido
            </button>
          </Link>
        </div>
      </div>

      {/* KPIs — todos filtrados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center mb-3">
            <FileText className="h-5 w-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{kpiPedidosAtivos}</div>
          <div className="text-sm text-gray-500 mt-1">Pedidos Ativos</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center mb-3">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(kpiMedicoesPagas)}</div>
          <div className="text-sm text-gray-500 mt-1">Medições Pagas (total)</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 relative">
          {kpiMedicoesCriar > 0 && (
            <span className="absolute top-3 right-3 bg-red-100 text-red-600 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {kpiMedicoesCriar}
            </span>
          )}
          <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center mb-3">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{kpiMedicoesCriar}</div>
          <div className="text-sm text-gray-500 mt-1">Medições p/ Criar (mês)</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 relative">
          {kpiAtrasoCount > 0 && (
            <span className="absolute top-3 right-3 bg-red-100 text-red-600 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {kpiAtrasoCount}
            </span>
          )}
          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center mb-3">
            <Clock className="h-5 w-5 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(kpiValorAtraso)}</div>
          <div className="text-sm text-gray-500 mt-1">Em Atraso</div>
        </div>
      </div>

      {/* Medições a Criar + Medições em Atraso */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Medições a Criar Este Mês */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-semibold text-gray-900">
              Medições a Criar Este Mês
              {filtrado && <span className="text-xs text-violet-600 font-normal ml-2">· {filtroResponsavel}</span>}
            </h2>
            <Link href="/medicoes">
              <button className="text-sm text-primary hover:underline border border-gray-200 px-3 py-1 rounded-lg">Ver controle</button>
            </Link>
          </div>
          {medicoesCriarLista.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-400" />
              {filtrado
                ? `✓ Nenhuma medição pendente para ${filtroResponsavel}`
                : "✓ Todas as medições do mês criadas"}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                  <th className="text-left pb-2 font-medium">Pedido</th>
                  <th className="text-left pb-2 font-medium">Fornecedor</th>
                  {!filtrado && <th className="text-left pb-2 font-medium">Responsável</th>}
                  <th className="text-left pb-2 font-medium">Valor Previsto</th>
                  <th className="text-left pb-2 font-medium">Situação</th>
                </tr>
              </thead>
              <tbody>
                {medicoesCriarLista.map((item) => (
                  <tr key={item.pedidoId} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 font-medium text-gray-900">{item.pedidoNumero}</td>
                    <td className="py-2.5 text-gray-600">{item.fornecedorNome}</td>
                    {!filtrado && (
                      <td className="py-2.5">
                        {item.responsavel ? (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                            <AvatarInitial nome={item.responsavel} />
                            <span className="truncate max-w-20">{item.responsavel}</span>
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    )}
                    <td className="py-2.5 text-gray-700">{formatCurrency(item.valorPrevisto)}</td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-medium">Pendente</span>
                        <button
                          onClick={() => handleCriarPendente(item.pedidoId, item.valorPrevisto)}
                          className="flex items-center gap-1 text-xs bg-primary text-primary-foreground px-2.5 py-1 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                        >
                          <Plus className="h-3 w-3" /> Criar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Medições em Atraso */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="font-heading font-semibold text-gray-900 mb-4">
            Medições em Atraso
            {filtrado && <span className="text-xs text-violet-600 font-normal ml-2">· {filtroResponsavel}</span>}
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                <th className="text-left pb-2 font-medium">Pedido</th>
                <th className="text-left pb-2 font-medium">Mês</th>
                <th className="text-left pb-2 font-medium">Valor Prev.</th>
                <th className="text-left pb-2 font-medium">Tipo</th>
              </tr>
            </thead>
            <tbody>
              {medicoesAtraso.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-400 text-sm">
                    {filtrado ? `Nenhum atraso para ${filtroResponsavel}` : "Nenhum atraso"}
                  </td>
                </tr>
              ) : (
                medicoesAtraso.map((m, idx) => (
                  <tr key={`${m.pedidoId}-${m.mes}-${idx}`} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 font-medium text-gray-900">{m.pedidoNumero}</td>
                    <td className="py-2.5 text-gray-600">{getMesLabel(m.mes)}</td>
                    <td className="py-2.5 text-red-600 font-medium">{formatCurrency(m.valorPrevisto)}</td>
                    <td className="py-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        m.tipoAtraso === "mes_anterior"
                          ? "bg-red-100 text-red-700"
                          : "bg-orange-100 text-orange-700"
                      }`}>
                        {m.tipoAtraso === "mes_anterior" ? "Mês anterior" : "Após dia 10"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== PAINEL GERENCIAL POR RESPONSÁVEL ===== */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
              <Users className="h-4 w-4 text-violet-600" />
            </div>
            <h2 className="font-heading font-semibold text-gray-900">Controle por Responsável</h2>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs text-gray-500 font-medium">Mês de referência:</label>
            <input
              type="month"
              value={mesGerencial}
              onChange={e => setMesGerencial(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* Totalizadores */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-400 uppercase font-medium mb-1">Responsáveis</div>
            <div className="text-xl font-bold text-gray-900">{gerencialFiltrado.length}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-xs text-gray-400 uppercase font-medium mb-1">Total Pedidos</div>
            <div className="text-xl font-bold text-gray-900">{totaisGerenciais.totalPedidos}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="text-xs text-green-600 uppercase font-medium mb-1">Criadas</div>
            <div className="text-xl font-bold text-green-700">{totaisGerenciais.medicoesCriadas}</div>
          </div>
          <div className={`rounded-lg p-3 text-center ${totaisGerenciais.medicoesPendentes > 0 ? "bg-orange-50" : "bg-gray-50"}`}>
            <div className={`text-xs uppercase font-medium mb-1 ${totaisGerenciais.medicoesPendentes > 0 ? "text-orange-500" : "text-gray-400"}`}>Pendentes</div>
            <div className={`text-xl font-bold ${totaisGerenciais.medicoesPendentes > 0 ? "text-orange-600" : "text-gray-900"}`}>{totaisGerenciais.medicoesPendentes}</div>
          </div>
        </div>

        {/* Lista por responsável */}
        {loadingGerencial ? (
          <div className="flex items-center justify-center h-24">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : gerencialFiltrado.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
            {filtrado
              ? `Nenhum dado para ${filtroResponsavel} em ${getMesLabel(mesGerencial)}`
              : `Nenhum responsável encontrado para ${getMesLabel(mesGerencial)}`}
          </div>
        ) : (
          <div className="space-y-2">
            {gerencialFiltrado.map((item) => {
              const isExpanded = expandedResponsavel === item.responsavel;
              const percentual = item.totalPedidos > 0
                ? Math.round((item.medicoesCriadas / item.totalPedidos) * 100)
                : 100;
              const tudo_ok = item.medicoesPendentes === 0;

              return (
                <div key={item.responsavel} className={`border rounded-lg overflow-hidden transition-all ${tudo_ok ? "border-green-100" : "border-orange-100"}`}>
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50/70 transition-colors"
                    onClick={() => setExpandedResponsavel(isExpanded ? null : item.responsavel)}
                  >
                    <AvatarInitial nome={item.responsavel} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900 text-sm">{item.responsavel}</span>
                        {tudo_ok ? (
                          <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                            <CheckCircle2 className="h-3 w-3" /> Em dia
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                            <AlertTriangle className="h-3 w-3" /> {item.medicoesPendentes} pendente{item.medicoesPendentes > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex-1 max-w-32 bg-gray-100 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all ${tudo_ok ? "bg-green-500" : "bg-orange-400"}`}
                            style={{ width: `${percentual}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{item.medicoesCriadas}/{item.totalPedidos} criadas</span>
                      </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-6 text-right flex-shrink-0">
                      <div>
                        <div className="text-xs text-gray-400">Pedidos</div>
                        <div className="text-sm font-semibold text-gray-700">{item.totalPedidos}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Valor Total</div>
                        <div className="text-sm font-semibold text-gray-700">{formatCurrency(item.valorTotal)}</div>
                      </div>
                    </div>
                    {item.medicoesPendentes > 0 && (
                      <div className="ml-2 text-gray-400">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </div>
                    )}
                  </button>

                  {isExpanded && item.pedidosPendentes.length > 0 && (
                    <div className="border-t border-orange-100 bg-orange-50/40 px-4 py-3">
                      <p className="text-xs text-orange-600 font-medium mb-2 uppercase tracking-wide">Pedidos sem medição em {getMesLabel(mesGerencial)}:</p>
                      <div className="space-y-1.5">
                        {item.pedidosPendentes.map(pp => (
                          <div key={pp.pedidoId} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-orange-100">
                            <div>
                              <span className="text-sm font-semibold text-gray-900">{pp.pedidoNumero}</span>
                              <span className="text-xs text-gray-500 ml-2">{pp.fornecedorNome}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-gray-700">{formatCurrency(pp.valorPrevisto)}</span>
                              <button
                                onClick={() => handleCriarPendente(pp.pedidoId, pp.valorPrevisto)}
                                className="flex items-center gap-1 text-xs bg-primary text-primary-foreground px-2.5 py-1 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                              >
                                <Plus className="h-3 w-3" /> Criar
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pedidos em Andamento */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-semibold text-gray-900">
            Pedidos em Andamento
            {filtrado && <span className="text-xs text-violet-600 font-normal ml-2">· {filtroResponsavel}</span>}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                <th className="text-left pb-2 font-medium">Pedido</th>
                <th className="text-left pb-2 font-medium">Fornecedor</th>
                {!filtrado && <th className="text-left pb-2 font-medium">Responsável</th>}
                <th className="text-left pb-2 font-medium">Tipo</th>
                <th className="text-left pb-2 font-medium">Total</th>
                <th className="text-left pb-2 font-medium">Consumido</th>
                <th className="text-left pb-2 font-medium">Progresso</th>
                <th className="text-left pb-2 font-medium">Próx. Medição</th>
                <th className="text-left pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {pedidosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={filtrado ? 8 : 9} className="py-8 text-center text-gray-400 text-sm">
                    {filtrado ? `Nenhum pedido em andamento para ${filtroResponsavel}` : "Nenhum pedido em andamento"}
                  </td>
                </tr>
              ) : (
                pedidosFiltrados.map((p) => {
                  const progresso = p.totalMedicoesPrevistas > 0
                    ? Math.round((p.totalMedicoesCriadas / p.totalMedicoesPrevistas) * 100)
                    : 0;
                  return (
                    <tr key={p.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-2.5 font-medium text-gray-900">{p.numero}</td>
                      <td className="py-2.5 text-gray-600">{p.fornecedorNome}</td>
                      {!filtrado && (
                        <td className="py-2.5">
                          {p.responsavel ? (
                            <span className="inline-flex items-center gap-1.5 text-sm text-gray-700">
                              <AvatarInitial nome={p.responsavel} />
                              <span className="truncate max-w-24">{p.responsavel}</span>
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                      )}
                      <td className="py-2.5"><TipoBadge tipo={p.tipo} /></td>
                      <td className="py-2.5 text-gray-700">{formatCurrency(p.valor)}</td>
                      <td className="py-2.5">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-orange-600">{formatCurrency(p.totalConsumido)}</span>
                          {parseFloat(p.valor || "0") > 0 && (
                            <div className="w-20 bg-gray-100 rounded-full h-1.5">
                              <div
                                className="bg-orange-400 h-1.5 rounded-full"
                                style={{ width: `${Math.min(100, (p.totalConsumido / parseFloat(p.valor || "1")) * 100).toFixed(0)}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{p.totalMedicoesCriadas}/{p.totalMedicoesPrevistas}</span>
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${progresso}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 text-gray-600 text-xs">{p.proximaMedicao || "—"}</td>
                      <td className="py-2.5"><StatusBadge status={p.status} /></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <MedicaoModal
          open={modalOpen}
          onClose={handleCloseModal}
          defaultPedidoId={defaultPedidoId}
          defaultValor={defaultValor}
        />
      )}
    </DashboardLayout>
  );
}
