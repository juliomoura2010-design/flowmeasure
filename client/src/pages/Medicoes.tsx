import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Pencil, Trash2, Plus, Filter } from "lucide-react";
import { toast } from "sonner";
import MedicaoModal from "./modals/MedicaoModal";
import PagarMedicaoModal from "./modals/PagarMedicaoModal";

function formatCurrency(value: number | string | null | undefined) {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
}

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

function getMesLabel(mes: string) {
  const [year, month] = mes.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    .replace(/^\w/, c => c.toUpperCase());
}

function getMesAtual() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getMesAnterior() {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pendente: "bg-yellow-100 text-yellow-700",
    paga: "bg-green-100 text-green-700",
    cancelada: "bg-red-100 text-red-700",
  };
  const labels: Record<string, string> = { pendente: "Pendente", paga: "Pago", cancelada: "Cancelada" };
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
    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${colors[idx]}`}>
      {initial}
    </span>
  );
}

export default function Medicoes() {
  const mesAtual = getMesAtual();
  const mesAnterior = getMesAnterior();

  const [selectedPeriod, setSelectedPeriod] = useState<"atual" | "anterior" | "custom">("atual");
  const [customMes, setCustomMes] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [filtroResponsavel, setFiltroResponsavel] = useState<string>("todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pagarId, setPagarId] = useState<number | null>(null);
  const [defaultPedidoId, setDefaultPedidoId] = useState<number | null>(null);
  const [defaultValor, setDefaultValor] = useState<string | null>(null);

  const mesSelecionado = selectedPeriod === "atual" ? mesAtual
    : selectedPeriod === "anterior" ? mesAnterior
    : customMes;

  const utils = trpc.useUtils();

  const { data: controleRaw = [] } = trpc.medicoes.controleMes.useQuery(
    { mes: mesSelecionado },
    { enabled: !!mesSelecionado }
  );

  const { data: todasMedicoesRaw = [], isLoading: loadingMedicoes } = trpc.medicoes.listComDados.useQuery({});

  const controle = controleRaw as any[];
  const todasMedicoes = todasMedicoesRaw as any[];

  const deleteMutation = trpc.medicoes.delete.useMutation({
    onSuccess: () => {
      utils.medicoes.listComDados.invalidate();
      utils.medicoes.controleMes.invalidate();
      utils.dashboard.getData.invalidate();
      utils.pedidos.listComStats.invalidate();
      toast.success("Medição excluída com sucesso");
    },
    onError: () => toast.error("Erro ao excluir medição"),
  });

  // ── Lista de responsáveis únicos (união das duas fontes) ──────────────────
  const responsaveisUnicos = useMemo(() => {
    const set = new Set<string>();
    controle.forEach((c: any) => { if (c.responsavel) set.add(c.responsavel); });
    todasMedicoes.forEach((m: any) => { if (m.responsavel) set.add(m.responsavel); });
    return Array.from(set).sort();
  }, [controle, todasMedicoes]);

  // ── Controle mensal filtrado ──────────────────────────────────────────────
  const controleFiltrado = useMemo(() => {
    if (filtroResponsavel === "todos") return controle;
    return controle.filter((c: any) => (c.responsavel || "Sem responsável") === filtroResponsavel);
  }, [controle, filtroResponsavel]);

  // KPIs calculados sobre o controle filtrado
  const esperadas = controleFiltrado.length;
  const criadas = controleFiltrado.filter((c: any) => c.criada).length;
  const faltam = esperadas - criadas;
  const progresso = esperadas > 0 ? Math.round((criadas / esperadas) * 100) : 100;

  // ── Listagem geral filtrada ───────────────────────────────────────────────
  const medicoesFiltradas = useMemo(() => {
    let list = todasMedicoes;
    if (filterStatus !== "todos") list = list.filter((m: any) => m.status === filterStatus);
    if (filtroResponsavel !== "todos") list = list.filter((m: any) => (m.responsavel || "Sem responsável") === filtroResponsavel);
    return list;
  }, [todasMedicoes, filterStatus, filtroResponsavel]);

  const filtrado = filtroResponsavel !== "todos";

  const handleEdit = (id: number) => {
    setEditingId(id);
    setModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Deseja excluir esta medição?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleCriarPendente = (pedidoId: number, valorPrevisto: string) => {
    setEditingId(null);
    setDefaultPedidoId(pedidoId);
    setDefaultValor(valorPrevisto);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setDefaultPedidoId(null);
    setDefaultValor(null);
    utils.medicoes.listComDados.invalidate();
    utils.medicoes.controleMes.invalidate();
    utils.dashboard.getData.invalidate();
  };

  const handleClosePagar = () => {
    setPagarId(null);
    utils.medicoes.listComDados.invalidate();
    utils.medicoes.controleMes.invalidate();
    utils.dashboard.getData.invalidate();
  };

  return (
    <DashboardLayout>
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-heading font-bold text-gray-900">Medições</h1>
          {filtrado && (
            <span className="inline-flex items-center gap-1.5 bg-violet-100 text-violet-700 text-xs font-semibold px-3 py-1 rounded-full">
              <Filter className="h-3 w-3" />
              {filtroResponsavel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Filtro por responsável */}
          <select
            value={filtroResponsavel}
            onChange={e => setFiltroResponsavel(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="todos">Todos os responsáveis</option>
            {responsaveisUnicos.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <button
            onClick={() => { setEditingId(null); setModalOpen(true); }}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> Nova Medição
          </button>
        </div>
      </div>

      {/* KPIs do mês — calculados sobre o filtro */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="text-xs text-gray-400 uppercase font-medium mb-2">Esperadas no Mês</div>
          <div className="text-3xl font-bold text-gray-900">{esperadas}</div>
          <div className="text-xs text-gray-500 mt-1">
            {filtrado ? `pedidos de ${filtroResponsavel}` : `pedidos ativos em ${getMesLabel(mesSelecionado || mesAtual)}`}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="text-xs text-gray-400 uppercase font-medium mb-2">Criadas</div>
          <div className="text-3xl font-bold text-green-600">{criadas}</div>
          <div className="text-xs text-gray-500 mt-1">medições já lançadas</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="text-xs text-gray-400 uppercase font-medium mb-2">Faltam Criar</div>
          <div className={`text-3xl font-bold ${faltam > 0 ? "text-red-500" : "text-green-600"}`}>{faltam}</div>
          <div className="text-xs text-gray-500 mt-1">
            {faltam === 0 ? "✓ Mês completo!" : `${faltam} medição(ões) pendente(s)`}
          </div>
        </div>
      </div>

      {/* Seletor de período */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <button
          onClick={() => setSelectedPeriod("atual")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedPeriod === "atual" ? "bg-primary text-primary-foreground" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
        >
          Mês Atual · {getMesLabel(mesAtual)}
        </button>
        <button
          onClick={() => setSelectedPeriod("anterior")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedPeriod === "anterior" ? "bg-primary text-primary-foreground" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
        >
          Mês Anterior · {getMesLabel(mesAnterior)}
        </button>
        <input
          type="month"
          value={customMes}
          onChange={e => { setCustomMes(e.target.value); setSelectedPeriod("custom"); }}
          className={`px-3 py-2 rounded-lg text-sm border transition-colors ${selectedPeriod === "custom" ? "border-primary ring-2 ring-primary/20" : "border-gray-200"} bg-white text-gray-600 focus:outline-none`}
        />
      </div>

      {/* Controle de Medições do Mês */}
      {mesSelecionado && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-semibold text-gray-900">
              Controle de Medições — {getMesLabel(mesSelecionado)}
              {filtrado && <span className="text-xs text-violet-600 font-normal ml-2">· {filtroResponsavel}</span>}
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">{progresso}% concluído</span>
              <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${progresso === 100 ? "bg-green-500" : "bg-primary"}`}
                  style={{ width: `${progresso}%` }}
                />
              </div>
            </div>
          </div>

          {controleFiltrado.length === 0 ? (
            <div className="py-6 text-center text-gray-400 text-sm">
              {filtrado
                ? `Nenhum pedido ativo para ${filtroResponsavel} neste mês`
                : "Nenhum pedido ativo encontrado para este mês"}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                  <th className="text-left pb-2 font-medium">Pedido / Fornecedor</th>
                  {!filtrado && <th className="text-left pb-2 font-medium">Responsável</th>}
                  <th className="text-left pb-2 font-medium">Valor Previsto</th>
                  <th className="text-left pb-2 font-medium">Tipo</th>
                  <th className="text-left pb-2 font-medium">Ref.</th>
                  <th className="text-left pb-2 font-medium">Doc. Medição</th>
                  <th className="text-left pb-2 font-medium">Situação</th>
                </tr>
              </thead>
              <tbody>
                {controleFiltrado.map((item: any) => (
                  <tr key={item.pedidoId} className="border-b border-gray-50 last:border-0">
                    <td className="py-3">
                      <div className="font-medium text-gray-900">{item.pedidoNumero}</div>
                      <div className="text-xs text-gray-400">{item.fornecedorNome}</div>
                    </td>
                    {!filtrado && (
                      <td className="py-3">
                        {item.responsavel ? (
                          <span className="inline-flex items-center gap-1.5 text-sm text-gray-700">
                            <AvatarInitial nome={item.responsavel} />
                            <span className="truncate max-w-24">{item.responsavel}</span>
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    )}
                    <td className="py-3 text-gray-700">{formatCurrency(item.valorPrevisto)}</td>
                    <td className="py-3"><TipoBadge tipo={item.tipo} /></td>
                    <td className="py-3 text-gray-500 text-xs">
                      {item.criada
                        ? `Medição ${item.ordemProxima - 1}/${item.totalMedicoes}`
                        : `Medição ${item.ordemProxima}/${item.totalMedicoes}`}
                    </td>
                    <td className="py-3">
                      {item.medicaoMesNumero ? (
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono">{item.medicaoMesNumero}</span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-3">
                      {item.criada ? (
                        <StatusBadge status={item.medicaoMesStatus || "pendente"} />
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-medium">Pendente</span>
                          <button
                            onClick={() => handleCriarPendente(item.pedidoId, item.valorPrevisto)}
                            className="flex items-center gap-1 text-xs bg-primary text-primary-foreground px-2.5 py-1 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                          >
                            <Plus className="h-3 w-3" /> Criar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Todas as Medições Registradas */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <h2 className="font-heading font-semibold text-gray-900">
            Todas as Medições Registradas
            {filtrado && <span className="text-xs text-violet-600 font-normal ml-2">· {filtroResponsavel}</span>}
          </h2>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="todos">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="paga">Paga</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </div>

        {loadingMedicoes ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : medicoesFiltradas.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">
            {filtrado
              ? `Nenhuma medição encontrada para ${filtroResponsavel}`
              : "Nenhuma medição encontrada"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-5 py-3 font-medium">Nº Documento</th>
                  <th className="text-left px-4 py-3 font-medium">Pedido</th>
                  <th className="text-left px-4 py-3 font-medium">Fornecedor</th>
                  {!filtrado && <th className="text-left px-4 py-3 font-medium">Responsável</th>}
                  <th className="text-left px-4 py-3 font-medium">Período Ref.</th>
                  <th className="text-left px-4 py-3 font-medium">Vencimento</th>
                  <th className="text-left px-4 py-3 font-medium">Valor</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {medicoesFiltradas.map((m: any) => (
                  <tr key={m.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs font-medium text-gray-900">{m.numero}</td>
                    <td className="px-4 py-3 text-gray-700">{m.pedidoNumero}</td>
                    <td className="px-4 py-3 text-gray-600">{m.fornecedorNome}</td>
                    {!filtrado && (
                      <td className="px-4 py-3">
                        {m.responsavel ? (
                          <span className="inline-flex items-center gap-1.5 text-sm text-gray-700">
                            <AvatarInitial nome={m.responsavel} />
                            <span className="truncate max-w-24">{m.responsavel}</span>
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3 text-gray-600 text-xs">{getMesLabel(m.mes)}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{formatDate(m.dataVencimento)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{formatCurrency(m.valor)}</td>
                    <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        {m.status === "pendente" && (
                          <button
                            onClick={() => setPagarId(m.id)}
                            className="text-xs bg-green-50 text-green-700 hover:bg-green-100 px-2 py-1 rounded font-medium transition-colors"
                          >
                            Pagar
                          </button>
                        )}
                        <button onClick={() => handleEdit(m.id)} className="text-gray-400 hover:text-gray-700 transition-colors">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(m.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <MedicaoModal
          open={modalOpen}
          onClose={handleCloseModal}
          editingId={editingId}
          defaultMes={mesSelecionado}
          defaultPedidoId={defaultPedidoId}
          defaultValor={defaultValor}
        />
      )}

      {pagarId !== null && (
        <PagarMedicaoModal
          open={true}
          onClose={handleClosePagar}
          medicaoId={pagarId}
        />
      )}
    </DashboardLayout>
  );
}
