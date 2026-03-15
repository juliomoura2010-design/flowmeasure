import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onClose: () => void;
  medicaoId: number;
};

function formatCurrency(value: string | number | null | undefined) {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
}

function getMesLabel(mes: string) {
  const [year, month] = mes.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    .replace(/^\w/, c => c.toUpperCase());
}

export default function PagarMedicaoModal({ open, onClose, medicaoId }: Props) {
  const [form, setForm] = useState({
    numeroPagamento: "",
    dataPagamento: new Date().toISOString().split("T")[0],
    observacoes: "",
  });

  const utils = trpc.useUtils();
  const { data: medicao } = trpc.medicoes.getById.useQuery(
    { id: medicaoId },
    { enabled: !!medicaoId }
  );

  useEffect(() => {
    if (open) {
      setForm({
        numeroPagamento: "",
        dataPagamento: new Date().toISOString().split("T")[0],
        observacoes: "",
      });
    }
  }, [open]);

  const pagarMutation = trpc.medicoes.pagar.useMutation({
    onSuccess: () => {
      toast.success("Pagamento registrado com sucesso!");
      utils.medicoes.listComDados.invalidate();
      utils.medicoes.controleMes.invalidate();
      utils.dashboard.getData.invalidate();
      onClose();
    },
    onError: (e) => toast.error("Erro ao registrar pagamento: " + e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.numeroPagamento.trim()) {
      toast.error("Número do documento é obrigatório");
      return;
    }
    pagarMutation.mutate({
      id: medicaoId,
      numeroPagamento: form.numeroPagamento,
      dataPagamento: form.dataPagamento || undefined,
      observacoes: form.observacoes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Registrar Pagamento
          </DialogTitle>
        </DialogHeader>

        {medicao && (
          <div className="bg-gray-50 rounded-lg p-3 mb-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Medição:</span>
              <span className="font-mono font-medium text-gray-900">{medicao.numero}</span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-gray-500">Período:</span>
              <span className="text-gray-700">{getMesLabel(medicao.mes)}</span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-gray-500">Valor:</span>
              <span className="font-semibold text-green-700">{formatCurrency(medicao.valor)}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nº do Documento <span className="text-destructive">*</span></Label>
            <Input
              value={form.numeroPagamento}
              onChange={e => setForm(p => ({ ...p, numeroPagamento: e.target.value }))}
              placeholder="Ex: NF-2025-001"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Data de Pagamento</Label>
            <Input
              type="date"
              value={form.dataPagamento}
              onChange={e => setForm(p => ({ ...p, dataPagamento: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea
              value={form.observacoes}
              onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))}
              placeholder="Observações sobre o pagamento"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button
              type="submit"
              disabled={pagarMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {pagarMutation.isPending ? "Registrando..." : "Confirmar Pagamento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
