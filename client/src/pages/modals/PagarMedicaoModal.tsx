import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Medicao = {
  id: number;
  numero: string;
  valor: string;
  mes: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  medicao: Medicao | null;
  onSuccess: () => void;
};

function formatCurrency(value: string | number | null | undefined) {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
}

export default function PagarMedicaoModal({ open, onClose, medicao, onSuccess }: Props) {
  const [form, setForm] = useState({
    numeroPagamento: "",
    dataPagamento: new Date().toISOString().split("T")[0],
    observacoes: "",
  });

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
      toast.success("Pagamento registrado com sucesso");
      onSuccess();
    },
    onError: (e) => toast.error("Erro ao registrar pagamento: " + e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.numeroPagamento.trim()) {
      toast.error("Número do documento é obrigatório");
      return;
    }
    if (!medicao) return;

    pagarMutation.mutate({
      id: medicao.id,
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
            Confirmar Pagamento
          </DialogTitle>
        </DialogHeader>

        {medicao && (
          <div className="bg-muted/50 rounded-lg p-3 mb-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Medição:</span>
              <span className="font-medium">{medicao.numero}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-muted-foreground">Mês:</span>
              <span className="font-medium">{medicao.mes}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-muted-foreground">Valor:</span>
              <span className="font-bold text-green-700">{formatCurrency(medicao.valor)}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="numeroPagamento">
              Nº do Documento <span className="text-destructive">*</span>
            </Label>
            <Input
              id="numeroPagamento"
              value={form.numeroPagamento}
              onChange={e => setForm(p => ({ ...p, numeroPagamento: e.target.value }))}
              placeholder="Número da nota fiscal ou documento"
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dataPagamento">Data do Pagamento</Label>
            <Input
              id="dataPagamento"
              type="date"
              value={form.dataPagamento}
              onChange={e => setForm(p => ({ ...p, dataPagamento: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
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
              className="bg-green-600 text-white hover:bg-green-700"
            >
              {pagarMutation.isPending ? "Registrando..." : "Confirmar Pagamento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
