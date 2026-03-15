import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { CalendarDays, Pencil, Plus, Ruler, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import MedicaoModal from "./modals/MedicaoModal";
import PagarMedicaoModal from "./modals/PagarMedicaoModal";

type Medicao = {
  id: number;
  numero: string;
  pedidoId: number;
  mes: string;
  valor: string;
  dataEmissao: Date | null;
  dataPagamento: Date | null;
  status: "pendente" | "paga" | "cancelada";
  numeroPagamento: string | null;
  observacoes: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  paga: "Paga",
  cancelada: "Cancelada",
};

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    pendente: "bg-yellow-100 text-yellow-800 border-yellow-200",
    paga: "bg-green-100 text-green-800 border-green-200",
    cancelada: "bg-red-100 text-red-800 border-red-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${variants[status] ?? "bg-gray-100 text-gray-800"}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function formatCurrency(value: string | number | null | undefined) {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
}

function formatDate(date: Date | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("pt-BR");
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getPreviousMonth() {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(mes: string) {
  const [year, month] = mes.split("-");
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${months[parseInt(month) - 1]}/${year}`;
}

type PeriodMode = "atual" | "anterior" | "custom";

export default function Medicoes() {
  const [periodMode, setPeriodMode] = useState<PeriodMode>("atual");
  const [customMonth, setCustomMonth] = useState(getCurrentMonth());
  const [modalOpen, setModalOpen] = useState(false);
  const [pagarModalOpen, setPagarModalOpen] = useState(false);
  const [editingMedicao, setEditingMedicao] = useState<Medicao | null>(null);
  const [pagarMedicao, setPagarMedicao] = useState<Medicao | null>(null);

  const utils = trpc.useUtils();

  const selectedMes = periodMode === "atual"
    ? getCurrentMonth()
    : periodMode === "anterior"
    ? getPreviousMonth()
    : customMonth;

  const { data: medicoes = [], isLoading } = trpc.medicoes.list.useQuery({ mes: selectedMes });
  const { data: pedidos = [] } = trpc.pedidos.list.useQuery();
  const { data: fornecedores = [] } = trpc.fornecedores.list.useQuery();

  const deleteMutation = trpc.medicoes.delete.useMutation({
    onSuccess: () => {
      utils.medicoes.list.invalidate();
      toast.success("Medição excluída com sucesso");
    },
    onError: () => toast.error("Erro ao excluir medição"),
  });

  const pedidoMap = new Map(pedidos.map(p => [p.id, p]));
  const fornecedorMap = new Map(fornecedores.map(f => [f.id, f.nome]));

  const handleEdit = (m: Medicao) => {
    setEditingMedicao(m);
    setModalOpen(true);
  };

  const handleNew = () => {
    setEditingMedicao(null);
    setModalOpen(true);
  };

  const handlePagar = (m: Medicao) => {
    setPagarMedicao(m);
    setPagarModalOpen(true);
  };

  const handleDelete = (id: number, numero: string) => {
    if (confirm(`Deseja excluir a medição "${numero}"?`)) {
      deleteMutation.mutate({ id });
    }
  };

  const totalPendente = medicoes.filter(m => m.status === "pendente").reduce((a, m) => a + parseFloat(m.valor as string || "0"), 0);
  const totalPago = medicoes.filter(m => m.status === "paga").reduce((a, m) => a + parseFloat(m.valor as string || "0"), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-heading text-foreground">Medições</h1>
            <p className="text-sm text-muted-foreground mt-1">Controle de medições por período</p>
          </div>
          <Button onClick={handleNew} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
            <Plus className="h-4 w-4" />
            Nova Medição
          </Button>
        </div>

        {/* Seletor de Período - 3 seções */}
        <Card className="border-border shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <span className="text-sm font-medium text-foreground whitespace-nowrap flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                Período:
              </span>
              <div className="flex flex-wrap gap-2">
                {/* Seção 1: Mês Atual */}
                <button
                  onClick={() => setPeriodMode("atual")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                    periodMode === "atual"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-muted/50"
                  }`}
                >
                  Mês Atual
                  <span className="ml-2 text-xs opacity-70">{formatMonthLabel(getCurrentMonth())}</span>
                </button>

                {/* Seção 2: Mês Anterior */}
                <button
                  onClick={() => setPeriodMode("anterior")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                    periodMode === "anterior"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-muted/50"
                  }`}
                >
                  Mês Anterior
                  <span className="ml-2 text-xs opacity-70">{formatMonthLabel(getPreviousMonth())}</span>
                </button>

                {/* Seção 3: Seletor Customizado */}
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                  periodMode === "custom"
                    ? "bg-primary/10 border-primary"
                    : "bg-background border-border"
                }`}>
                  <button
                    onClick={() => setPeriodMode("custom")}
                    className={`text-sm font-medium transition-colors ${
                      periodMode === "custom" ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Personalizado:
                  </button>
                  <input
                    type="month"
                    value={customMonth}
                    onChange={e => { setCustomMonth(e.target.value); setPeriodMode("custom"); }}
                    className="text-sm bg-transparent border-0 outline-none text-foreground cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPIs do período */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-border shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium">Total de Medições</p>
              <p className="text-2xl font-bold font-heading text-foreground mt-1">{medicoes.length}</p>
              <p className="text-xs text-muted-foreground mt-1">{formatMonthLabel(selectedMes)}</p>
            </CardContent>
          </Card>
          <Card className="border-border shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium">Valor Pendente</p>
              <p className="text-2xl font-bold font-heading text-yellow-600 mt-1">{formatCurrency(totalPendente)}</p>
              <p className="text-xs text-muted-foreground mt-1">{medicoes.filter(m => m.status === "pendente").length} medições</p>
            </CardContent>
          </Card>
          <Card className="border-border shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium">Valor Pago</p>
              <p className="text-2xl font-bold font-heading text-green-600 mt-1">{formatCurrency(totalPago)}</p>
              <p className="text-xs text-muted-foreground mt-1">{medicoes.filter(m => m.status === "paga").length} medições</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabela */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-0 px-6 pt-5">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <Ruler className="h-4 w-4 text-muted-foreground" />
              Medições de {formatMonthLabel(selectedMes)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : medicoes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
                <Ruler className="h-8 w-8 opacity-30" />
                <p className="text-sm">Nenhuma medição em {formatMonthLabel(selectedMes)}</p>
                <Button variant="outline" size="sm" onClick={handleNew}>Registrar medição</Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left py-3 px-6 text-muted-foreground font-medium">Nº Medição</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Pedido</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Fornecedor</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Valor</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Emissão</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Pagamento</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Status</th>
                      <th className="text-right py-3 px-6 text-muted-foreground font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {medicoes.map(m => {
                      const pedido = pedidoMap.get(m.pedidoId);
                      const fornecedorNome = pedido ? fornecedorMap.get(pedido.fornecedorId) : null;
                      return (
                        <tr key={m.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-6">
                            <div className="font-medium text-foreground">{m.numero}</div>
                            {m.numeroPagamento && <div className="text-xs text-muted-foreground">Doc: {m.numeroPagamento}</div>}
                          </td>
                          <td className="py-3 px-4 text-foreground">{pedido?.numero ?? "—"}</td>
                          <td className="py-3 px-4 text-muted-foreground">{fornecedorNome ?? "—"}</td>
                          <td className="py-3 px-4 font-medium text-foreground">{formatCurrency(m.valor)}</td>
                          <td className="py-3 px-4 text-muted-foreground">{formatDate(m.dataEmissao)}</td>
                          <td className="py-3 px-4 text-muted-foreground">{formatDate(m.dataPagamento)}</td>
                          <td className="py-3 px-4"><StatusBadge status={m.status} /></td>
                          <td className="py-3 px-6">
                            <div className="flex items-center justify-end gap-1">
                              {m.status === "pendente" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs border-green-300 text-green-700 hover:bg-green-50"
                                  onClick={() => handlePagar(m as Medicao)}
                                >
                                  Pagar
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={() => handleEdit(m as Medicao)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => handleDelete(m.id, m.numero)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <MedicaoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        medicao={editingMedicao}
        pedidos={pedidos as any}
        defaultMes={selectedMes}
        onSuccess={() => {
          utils.medicoes.list.invalidate();
          setModalOpen(false);
        }}
      />

      <PagarMedicaoModal
        open={pagarModalOpen}
        onClose={() => setPagarModalOpen(false)}
        medicao={pagarMedicao}
        onSuccess={() => {
          utils.medicoes.list.invalidate();
          setPagarModalOpen(false);
        }}
      />
    </DashboardLayout>
  );
}
