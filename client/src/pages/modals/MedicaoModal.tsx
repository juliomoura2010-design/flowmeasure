import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onClose: () => void;
  editingId?: number | null;
  defaultMes?: string;
  defaultPedidoId?: number | null;  // pré-preenche o pedido ao abrir
  defaultValor?: string | null;     // pré-preenche o valor previsto
};

function toDateInput(d: Date | string | null | undefined) {
  if (!d) return "";
  return new Date(d).toISOString().split("T")[0];
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const defaultForm = {
  numero: "",
  pedidoId: "",
  mes: getCurrentMonth(),
  valor: "",
  dataEmissao: "",
  dataVencimento: "",
  dataPagamento: "",
  status: "pendente",
  numeroPagamento: "",
  observacoes: "",
};

function formatCurrency(value: number | string | null | undefined) {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
}

export default function MedicaoModal({ open, onClose, editingId, defaultMes, defaultPedidoId, defaultValor }: Props) {
  const [form, setForm] = useState({
    ...defaultForm,
    mes: defaultMes || getCurrentMonth(),
    pedidoId: defaultPedidoId ? String(defaultPedidoId) : "",
    valor: defaultValor || "",
  });

  const utils = trpc.useUtils();
  const { data: pedidos = [] } = trpc.pedidos.listComStats.useQuery({});
  const { data: medicaoData } = trpc.medicoes.getById.useQuery(
    { id: editingId! },
    { enabled: !!editingId }
  );

  useEffect(() => {
    if (editingId && medicaoData) {
      setForm({
        numero: medicaoData.numero,
        pedidoId: String(medicaoData.pedidoId),
        mes: medicaoData.mes,
        valor: medicaoData.valor,
        dataEmissao: toDateInput(medicaoData.dataEmissao),
        dataVencimento: toDateInput((medicaoData as any).dataVencimento),
        dataPagamento: toDateInput(medicaoData.dataPagamento),
        status: medicaoData.status,
        numeroPagamento: medicaoData.numeroPagamento ?? "",
        observacoes: medicaoData.observacoes ?? "",
      });
    } else if (!editingId) {
      setForm({
        ...defaultForm,
        mes: defaultMes || getCurrentMonth(),
        pedidoId: defaultPedidoId ? String(defaultPedidoId) : "",
        valor: defaultValor || "",
      });
    }
  }, [editingId, medicaoData, open, defaultMes]);

  const createMutation = trpc.medicoes.create.useMutation({
    onSuccess: () => {
      toast.success("Medição criada com sucesso");
      utils.medicoes.listComDados.invalidate();
      utils.medicoes.controleMes.invalidate();
      utils.dashboard.getData.invalidate();
      onClose();
    },
    onError: (e) => toast.error("Erro ao criar medição: " + e.message),
  });

  const updateMutation = trpc.medicoes.update.useMutation({
    onSuccess: () => {
      toast.success("Medição atualizada com sucesso");
      utils.medicoes.listComDados.invalidate();
      utils.medicoes.controleMes.invalidate();
      utils.dashboard.getData.invalidate();
      onClose();
    },
    onError: (e) => toast.error("Erro ao atualizar medição: " + e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.numero.trim()) { toast.error("Número é obrigatório"); return; }
    if (!form.pedidoId) { toast.error("Pedido é obrigatório"); return; }
    if (!form.mes) { toast.error("Mês é obrigatório"); return; }
    if (!form.valor) { toast.error("Valor é obrigatório"); return; }

    const data = {
      numero: form.numero,
      pedidoId: parseInt(form.pedidoId),
      mes: form.mes,
      valor: form.valor,
      dataEmissao: form.dataEmissao || null,
      dataVencimento: form.dataVencimento || null,
      dataPagamento: form.dataPagamento || null,
      status: form.status as "pendente" | "paga" | "cancelada",
      numeroPagamento: form.numeroPagamento || null,
      observacoes: form.observacoes || null,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">{editingId ? "Editar Medição" : "Nova Medição"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nº Documento <span className="text-destructive">*</span></Label>
              <Input value={form.numero} onChange={e => setForm(p => ({ ...p, numero: e.target.value }))} placeholder="Ex: MED-2025-001" required />
            </div>
            <div className="space-y-1.5">
              <Label>Pedido <span className="text-destructive">*</span></Label>
              <Select value={form.pedidoId} onValueChange={v => setForm(p => ({ ...p, pedidoId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o pedido" />
                </SelectTrigger>
                <SelectContent>
                  {(pedidos as any[]).map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      <span className="font-medium">{p.numero}</span>
                      <span className="text-gray-400 ml-1">· {p.fornecedorNome}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Prévia do pedido selecionado */}
              {form.pedidoId && (() => {
                const pedidoSelecionado = (pedidos as any[]).find(p => String(p.id) === form.pedidoId);
                if (!pedidoSelecionado) return null;
                const valorPrevisto = pedidoSelecionado.totalMedicoesPrevistas > 0
                  ? parseFloat(pedidoSelecionado.valor || "0") / pedidoSelecionado.totalMedicoesPrevistas
                  : parseFloat(pedidoSelecionado.valor || "0");
                return (
                  <div className="mt-2 p-3 bg-green-50 border border-green-100 rounded-lg text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <span className="text-gray-500 text-xs">Fornecedor</span>
                        <p className="font-medium text-gray-800">{pedidoSelecionado.fornecedorNome}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs">Valor Previsto / Medição</span>
                        <p className="font-semibold text-green-700">{formatCurrency(valorPrevisto)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs">Medições</span>
                        <p className="font-medium text-gray-800">{pedidoSelecionado.totalMedicoesCriadas}/{pedidoSelecionado.totalMedicoesPrevistas}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="space-y-1.5">
              <Label>Mês de Referência <span className="text-destructive">*</span></Label>
              <Input type="month" value={form.mes} onChange={e => setForm(p => ({ ...p, mes: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Valor (R$) <span className="text-destructive">*</span></Label>
              <Input type="number" step="0.01" min="0" value={form.valor} onChange={e => setForm(p => ({ ...p, valor: e.target.value }))} placeholder="0,00" required />
            </div>
            <div className="space-y-1.5">
              <Label>Data de Emissão</Label>
              <Input type="date" value={form.dataEmissao} onChange={e => setForm(p => ({ ...p, dataEmissao: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Data de Vencimento</Label>
              <Input type="date" value={form.dataVencimento} onChange={e => setForm(p => ({ ...p, dataVencimento: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="paga">Paga</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Nº Pagamento</Label>
              <Input value={form.numeroPagamento} onChange={e => setForm(p => ({ ...p, numeroPagamento: e.target.value }))} placeholder="Número do documento de pagamento" />
            </div>
            {form.status === "paga" && (
              <div className="space-y-1.5">
                <Label>Data de Pagamento</Label>
                <Input type="date" value={form.dataPagamento} onChange={e => setForm(p => ({ ...p, dataPagamento: e.target.value }))} />
              </div>
            )}
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} placeholder="Observações adicionais" rows={3} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isLoading} className="bg-primary text-primary-foreground">
              {isLoading ? "Salvando..." : editingId ? "Salvar Alterações" : "Criar Medição"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
