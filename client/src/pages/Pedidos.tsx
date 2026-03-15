import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { ClipboardList, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import PedidoModal from "./modals/PedidoModal";

type Pedido = {
  id: number;
  numero: string;
  fornecedorId: number;
  descricao: string | null;
  valor: string;
  dataInicio: Date | null;
  dataFim: Date | null;
  tipoGasto: "capex" | "opex";
  frequencia: "mensal" | "trimestral" | "semestral" | "anual";
  status: "ativo" | "concluido" | "cancelado";
  observacoes: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  ativo: "Ativo",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const FREQUENCIA_LABELS: Record<string, string> = {
  mensal: "Mensal",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
};

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    ativo: "bg-green-100 text-green-800 border-green-200",
    concluido: "bg-blue-100 text-blue-800 border-blue-200",
    cancelado: "bg-red-100 text-red-800 border-red-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${variants[status] ?? "bg-gray-100 text-gray-800"}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function TipoGastoBadge({ tipo }: { tipo: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${tipo === "capex" ? "bg-purple-100 text-purple-800 border-purple-200" : "bg-blue-100 text-blue-800 border-blue-200"}`}>
      {tipo.toUpperCase()}
    </span>
  );
}

function formatCurrency(value: string | number | null | undefined) {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
}

export default function Pedidos() {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPedido, setEditingPedido] = useState<Pedido | null>(null);

  const utils = trpc.useUtils();
  const { data: pedidos = [], isLoading } = trpc.pedidos.list.useQuery();
  const { data: fornecedores = [] } = trpc.fornecedores.list.useQuery();

  const deleteMutation = trpc.pedidos.delete.useMutation({
    onSuccess: () => {
      utils.pedidos.list.invalidate();
      toast.success("Pedido excluído com sucesso");
    },
    onError: () => toast.error("Erro ao excluir pedido"),
  });

  const fornecedorMap = new Map(fornecedores.map(f => [f.id, f.nome]));

  const filtered = pedidos.filter(p =>
    p.numero.toLowerCase().includes(search.toLowerCase()) ||
    (p.descricao ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (fornecedorMap.get(p.fornecedorId) ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (p: Pedido) => {
    setEditingPedido(p);
    setModalOpen(true);
  };

  const handleNew = () => {
    setEditingPedido(null);
    setModalOpen(true);
  };

  const handleDelete = (id: number, numero: string) => {
    if (confirm(`Deseja excluir o pedido "${numero}"?`)) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-heading text-foreground">Pedidos</h1>
            <p className="text-sm text-muted-foreground mt-1">Gerencie os pedidos vinculados a fornecedores</p>
          </div>
          <Button onClick={handleNew} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
            <Plus className="h-4 w-4" />
            Novo Pedido
          </Button>
        </div>

        {/* Filtros */}
        <Card className="border-border shadow-sm">
          <CardContent className="p-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número, fornecedor ou descrição..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-0 px-6 pt-5">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              {filtered.length} pedido{filtered.length !== 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
                <ClipboardList className="h-8 w-8 opacity-30" />
                <p className="text-sm">Nenhum pedido encontrado</p>
                <Button variant="outline" size="sm" onClick={handleNew}>Criar primeiro pedido</Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left py-3 px-6 text-muted-foreground font-medium">Número</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Fornecedor</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Valor</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Tipo</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Frequência</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Status</th>
                      <th className="text-right py-3 px-6 text-muted-foreground font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(p => (
                      <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-6">
                          <div className="font-medium text-foreground">{p.numero}</div>
                          {p.descricao && <div className="text-xs text-muted-foreground truncate max-w-[200px]">{p.descricao}</div>}
                        </td>
                        <td className="py-3 px-4 text-foreground">{fornecedorMap.get(p.fornecedorId) ?? "—"}</td>
                        <td className="py-3 px-4 font-medium text-foreground">{formatCurrency(p.valor)}</td>
                        <td className="py-3 px-4"><TipoGastoBadge tipo={p.tipoGasto} /></td>
                        <td className="py-3 px-4 text-muted-foreground">{FREQUENCIA_LABELS[p.frequencia]}</td>
                        <td className="py-3 px-4"><StatusBadge status={p.status} /></td>
                        <td className="py-3 px-6">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => handleEdit(p as Pedido)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDelete(p.id, p.numero)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <PedidoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        pedido={editingPedido}
        fornecedores={fornecedores as any}
        onSuccess={() => {
          utils.pedidos.list.invalidate();
          setModalOpen(false);
        }}
      />
    </DashboardLayout>
  );
}
