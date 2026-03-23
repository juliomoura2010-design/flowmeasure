import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Pencil, Trash2, Plus, RefreshCw, GitBranch } from "lucide-react";
import { toast } from "sonner";
import PedidoModal from "./modals/PedidoModal";

function formatCurrency(value: number | string | null | undefined) {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ativo: "bg-green-100 text-green-700",
    concluido: "bg-blue-100 text-blue-700",
    cancelado: "bg-red-100 text-red-700",
    encerrado: "bg-gray-200 text-gray-600",
  };
  const labels: Record<string, string> = { ativo: "Ativo", concluido: "Concluído", cancelado: "Cancelado", encerrado: "Encerrado" };
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

export default function Pedidos() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filterFornecedor, setFilterFornecedor] = useState<string>("todos");
  const [filterTipo, setFilterTipo] = useState<string>("todos");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [renovacaoModalOpen, setRenovacaoModalOpen] = useState(false);
  const [renovacaoDe, setRenovacaoDe] = useState<any>(null);

  const utils = trpc.useUtils();
  const { data: pedidos = [], isLoading } = trpc.pedidos.listComStats.useQuery({
    fornecedorId: filterFornecedor !== "todos" ? parseInt(filterFornecedor) : undefined,
    tipo: filterTipo !== "todos" ? filterTipo : undefined,
    status: filterStatus !== "todos" ? filterStatus : undefined,
  });
  const { data: fornecedores = [] } = trpc.fornecedores.list.useQuery();

  const deleteMutation = trpc.pedidos.delete.useMutation({
    onSuccess: () => {
      utils.pedidos.listComStats.invalidate();
      utils.dashboard.getData.invalidate();
      toast.success("Pedido excluído com sucesso");
    },
    onError: () => toast.error("Erro ao excluir pedido"),
  });

  const handleEdit = (id: number) => {
    setEditingId(id);
    setModalOpen(true);
  };

  const handleDelete = (id: number, numero: string) => {
    if (confirm(`Deseja excluir o pedido "${numero}"?`)) {
      deleteMutation.mutate({ id });
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingId(null);
    utils.pedidos.listComStats.invalidate();
    utils.dashboard.getData.invalidate();
  };

  const handleRenovar = (p: any) => {
    setRenovacaoDe(p);
    setRenovacaoModalOpen(true);
  };

  const handleCloseRenovacaoModal = () => {
    setRenovacaoModalOpen(false);
    setRenovacaoDe(null);
    utils.pedidos.listComStats.invalidate();
    utils.dashboard.getData.invalidate();
    utils.renovacoes.contratosParaRenovar.invalidate();
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading font-bold text-gray-900">Pedidos</h1>
        <button
          onClick={() => { setEditingId(null); setModalOpen(true); }}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> Novo Pedido
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-5">
        <select
          value={filterFornecedor}
          onChange={e => setFilterFornecedor(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="todos">Todos os fornecedores</option>
          {(fornecedores as any[]).map((f) => (
            <option key={f.id} value={f.id}>{f.nome}</option>
          ))}
        </select>
        <select
          value={filterTipo}
          onChange={e => setFilterTipo(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="todos">Todos os tipos</option>
          <option value="fixo">Fixo (Spot)</option>
          <option value="mensal">Mensal (Contrato)</option>
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="todos">Todos os status</option>
          <option value="ativo">Ativo</option>
          <option value="concluido">Concluído</option>
          <option value="encerrado">Encerrado</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-heading font-semibold text-gray-900">Todos os Pedidos</h2>
          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full">{pedidos.length} pedidos</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : pedidos.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">
            Nenhum pedido encontrado
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-5 py-3 font-medium">Nº Pedido</th>
                  <th className="text-left px-4 py-3 font-medium">Fornecedor</th>
                  <th className="text-left px-4 py-3 font-medium">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium">Elemento PEP</th>
                  <th className="text-left px-4 py-3 font-medium">Responsável</th>
                  <th className="text-left px-4 py-3 font-medium">Medições</th>
                  <th className="text-left px-4 py-3 font-medium">Valor Total</th>
                  <th className="text-left px-4 py-3 font-medium">Consumido</th>
                  <th className="text-left px-4 py-3 font-medium">Pago</th>
                  <th className="text-left px-4 py-3 font-medium">Próx. Medição</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Cadeia</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {(pedidos as any[]).map((p) => (
                  <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3 font-semibold text-gray-900">{p.numero}</td>
                    <td className="px-4 py-3 text-gray-700">{p.fornecedorNome}</td>
                    <td className="px-4 py-3"><TipoBadge tipo={p.tipo} /></td>
                    <td className="px-4 py-3">
                      {p.elementoPep ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-blue-50 text-blue-700 border border-blue-100">
                          {p.elementoPep}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {p.responsavel ? (
                        <span className="inline-flex items-center gap-1 text-sm text-gray-700">
                          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {p.responsavel.charAt(0).toUpperCase()}
                          </span>
                          {p.responsavel}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-medium">
                      {p.totalMedicoesCriadas}/{p.totalMedicoesPrevistas}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{formatCurrency(p.valor)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-orange-600">{formatCurrency(p.totalConsumido)}</span>
                        {parseFloat(p.valor || "0") > 0 && (
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div
                              className="bg-orange-400 h-1.5 rounded-full"
                              style={{ width: `${Math.min(100, (p.totalConsumido / parseFloat(p.valor || "1")) * 100).toFixed(0)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-green-600">{formatCurrency(p.totalPago)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {p.proximaMedicao
                        ? new Date(p.proximaMedicao + "-01").toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
                        : "—"}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3">
                      {p.pedidoOrigemNumero ? (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                          <GitBranch className="h-3 w-3" />
                          <span title={`Renovação de ${p.pedidoOrigemNumero}`}>← {p.pedidoOrigemNumero}</span>
                        </span>
                      ) : p.temSucessor ? (
                        <span className="inline-flex items-center gap-1 text-xs text-blue-400">
                          <RefreshCw className="h-3 w-3" />
                          <span>Renovado</span>
                        </span>
                      ) : (
                        <span className="text-gray-200 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {p.status === "concluido" && p.tipo === "mensal" && !p.temSucessor && (
                          <button
                            onClick={() => handleRenovar(p)}
                            className="flex items-center gap-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 px-2 py-1 rounded-lg font-medium transition-colors"
                            title="Renovar contrato"
                          >
                            <RefreshCw className="h-3 w-3" /> Renovar
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(p.id)}
                          className="text-gray-400 hover:text-gray-700 transition-colors"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id, p.numero)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          title="Excluir"
                        >
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
        <PedidoModal
          open={modalOpen}
          onClose={handleCloseModal}
          editingId={editingId}
          fornecedores={fornecedores as any[]}
        />
      )}

      {renovacaoModalOpen && (
        <PedidoModal
          open={renovacaoModalOpen}
          onClose={handleCloseRenovacaoModal}
          renovacaoDe={renovacaoDe}
        />
      )}
    </DashboardLayout>
  );
}
