import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import FornecedorModal from "./modals/FornecedorModal";

function formatCurrency(value: number | string | null | undefined) {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ativo: "bg-green-100 text-green-700",
    inativo: "bg-gray-100 text-gray-500",
    suspenso: "bg-red-100 text-red-600",
  };
  const labels: Record<string, string> = { ativo: "Ativo", inativo: "Inativo", suspenso: "Suspenso" };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status] || "bg-gray-100 text-gray-600"}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {labels[status] || status}
    </span>
  );
}

export default function Fornecedores() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const { data: fornecedores = [], isLoading } = trpc.fornecedores.listComStats.useQuery();

  const deleteMutation = trpc.fornecedores.delete.useMutation({
    onSuccess: () => {
      utils.fornecedores.listComStats.invalidate();
      utils.fornecedores.list.invalidate();
      toast.success("Fornecedor excluído com sucesso");
    },
    onError: () => toast.error("Erro ao excluir fornecedor"),
  });

  const handleEdit = (id: number) => {
    setEditingId(id);
    setModalOpen(true);
  };

  const handleDelete = (id: number, nome: string) => {
    if (confirm(`Deseja excluir o fornecedor "${nome}"?`)) {
      deleteMutation.mutate({ id });
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingId(null);
    utils.fornecedores.listComStats.invalidate();
    utils.fornecedores.list.invalidate();
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading font-bold text-gray-900">Fornecedores</h1>
        <button
          onClick={() => { setEditingId(null); setModalOpen(true); }}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> Novo Fornecedor
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-heading font-semibold text-gray-900">Fornecedores</h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : (fornecedores as any[]).length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">
            Nenhum fornecedor cadastrado
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 uppercase border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-5 py-3 font-medium">Fornecedor</th>
                <th className="text-left px-4 py-3 font-medium">CNPJ</th>
                <th className="text-left px-4 py-3 font-medium">Contato</th>
                <th className="text-left px-4 py-3 font-medium">Pedidos</th>
                <th className="text-left px-4 py-3 font-medium">Total</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {(fornecedores as any[]).map((f) => (
                <tr key={f.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="font-semibold text-gray-900">{f.nome}</div>
                    {f.categoria && <div className="text-xs text-gray-400">{f.categoria}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{f.cnpj || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{f.email || "—"}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">
                      {f.totalPedidos ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{formatCurrency(f.totalValor ?? 0)}</td>
                  <td className="px-4 py-3"><StatusBadge status={f.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleEdit(f.id)} className="text-gray-400 hover:text-gray-700 transition-colors" title="Editar">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(f.id, f.nome)} className="text-gray-400 hover:text-red-500 transition-colors" title="Excluir">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <FornecedorModal
          open={modalOpen}
          onClose={handleCloseModal}
          editingId={editingId}
        />
      )}
    </DashboardLayout>
  );
}
