import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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

type Pedido = { id: number; numero: string; fornecedorId: number };

type Props = {
  open: boolean;
  onClose: () => void;
  medicao: Medicao | null;
  pedidos: Pedido[];
  defaultMes: string;
  onSuccess: () => void;
};

function toDateInput(d: Date | null | undefined) {
  if (!d) return "";
  return new Date(d).toISOString().split("T")[0];
}

export default function MedicaoModal({ open, onClose, medicao, pedidos, defaultMes, onSuccess }: Props) {
  const [form, setForm] = useState({
    numero: "",
    pedidoId: "",
    mes: defaultMes,
    valor: "",
    dataEmissao: "",
    dataPagamento: "",
    status: "pendente",
    numeroPagamento: "",
    observacoes: "",
  });

  useEffect(() => {
    if (medicao) {
      setForm({
        numero: medicao.numero,
        pedidoId: String(medicao.pedidoId),
        mes: medicao.mes,
        valor: medicao.valor,
        dataEmissao: toDateInput(medicao.dataEmissao),
        dataPagamento: toDateInput(medicao.dataPagamento),
        status: medicao.status,
        numeroPagamento: medicao.numeroPagamento ?? "",
        observacoes: medicao.observacoes ?? "",
      });
    } else {
      setForm({ numero: "", pedidoId: "", mes: defaultMes, valor: "", dataEmissao: "", dataPagamento: "", status: "pendente", numeroPagamento: "", observacoes: "" });
    }
  }, [medicao, open, defaultMes]);

  const createMutation = trpc.medicoes.create.useMutation({
    onSuccess: () => { toast.success("Medição criada com sucesso"); onSuccess(); },
    onError: (e) => toast.error("Erro ao criar medição: " + e.message),
  });

  const updateMutation = trpc.medicoes.update.useMutation({
    onSuccess: () => { toast.success("Medição atualizada com sucesso"); onSuccess(); },
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
      dataPagamento: form.dataPagamento || null,
      status: form.status as "pendente" | "paga" | "cancelada",
      numeroPagamento: form.numeroPagamento || null,
      observacoes: form.observacoes || null,
    };

    if (medicao) {
      updateMutation.mutate({ id: medicao.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">{medicao ? "Editar Medição" : "Nova Medição"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nº da Medição <span className="text-destructive">*</span></Label>
              <Input value={form.numero} onChange={e => setForm(p => ({ ...p, numero: e.target.value }))} placeholder="Ex: MED-2025-001" required />
            </div>
            <div className="space-y-1.5">
              <Label>Pedido <span className="text-destructive">*</span></Label>
              <Select value={form.pedidoId} onValueChange={v => setForm(p => ({ ...p, pedidoId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o pedido" />
                </SelectTrigger>
                <SelectContent>
                  {pedidos.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.numero}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Label>Data de Pagamento</Label>
              <Input type="date" value={form.dataPagamento} onChange={e => setForm(p => ({ ...p, dataPagamento: e.target.value }))} />
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
              <Label>Nº do Pagamento</Label>
              <Input value={form.numeroPagamento} onChange={e => setForm(p => ({ ...p, numeroPagamento: e.target.value }))} placeholder="Número do documento" />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} placeholder="Observações adicionais" rows={3} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isLoading} className="bg-primary text-primary-foreground">
              {isLoading ? "Salvando..." : medicao ? "Salvar Alterações" : "Criar Medição"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
