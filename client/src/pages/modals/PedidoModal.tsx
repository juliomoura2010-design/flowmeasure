import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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

type Fornecedor = { id: number; nome: string };

type Props = {
  open: boolean;
  onClose: () => void;
  pedido: Pedido | null;
  fornecedores: Fornecedor[];
  onSuccess: () => void;
};

function toDateInput(d: Date | null | undefined) {
  if (!d) return "";
  return new Date(d).toISOString().split("T")[0];
}

export default function PedidoModal({ open, onClose, pedido, fornecedores, onSuccess }: Props) {
  const [form, setForm] = useState({
    numero: "",
    fornecedorId: "",
    descricao: "",
    valor: "",
    dataInicio: "",
    dataFim: "",
    tipoGasto: "opex",
    frequencia: "mensal",
    status: "ativo",
    observacoes: "",
  });

  useEffect(() => {
    if (pedido) {
      setForm({
        numero: pedido.numero,
        fornecedorId: String(pedido.fornecedorId),
        descricao: pedido.descricao ?? "",
        valor: pedido.valor,
        dataInicio: toDateInput(pedido.dataInicio),
        dataFim: toDateInput(pedido.dataFim),
        tipoGasto: pedido.tipoGasto,
        frequencia: pedido.frequencia,
        status: pedido.status,
        observacoes: pedido.observacoes ?? "",
      });
    } else {
      setForm({ numero: "", fornecedorId: "", descricao: "", valor: "", dataInicio: "", dataFim: "", tipoGasto: "opex", frequencia: "mensal", status: "ativo", observacoes: "" });
    }
  }, [pedido, open]);

  const createMutation = trpc.pedidos.create.useMutation({
    onSuccess: () => { toast.success("Pedido criado com sucesso"); onSuccess(); },
    onError: (e) => toast.error("Erro ao criar pedido: " + e.message),
  });

  const updateMutation = trpc.pedidos.update.useMutation({
    onSuccess: () => { toast.success("Pedido atualizado com sucesso"); onSuccess(); },
    onError: (e) => toast.error("Erro ao atualizar pedido: " + e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.numero.trim()) { toast.error("Número é obrigatório"); return; }
    if (!form.fornecedorId) { toast.error("Fornecedor é obrigatório"); return; }
    if (!form.valor) { toast.error("Valor é obrigatório"); return; }

    const data = {
      numero: form.numero,
      fornecedorId: parseInt(form.fornecedorId),
      descricao: form.descricao || null,
      valor: form.valor,
      dataInicio: form.dataInicio || null,
      dataFim: form.dataFim || null,
      tipoGasto: form.tipoGasto as "capex" | "opex",
      frequencia: form.frequencia as "mensal" | "trimestral" | "semestral" | "anual",
      status: form.status as "ativo" | "concluido" | "cancelado",
      observacoes: form.observacoes || null,
    };

    if (pedido) {
      updateMutation.mutate({ id: pedido.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">{pedido ? "Editar Pedido" : "Novo Pedido"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Número <span className="text-destructive">*</span></Label>
              <Input value={form.numero} onChange={e => setForm(p => ({ ...p, numero: e.target.value }))} placeholder="Ex: PED-2025-001" required />
            </div>
            <div className="space-y-1.5">
              <Label>Fornecedor <span className="text-destructive">*</span></Label>
              <Select value={form.fornecedorId} onValueChange={v => setForm(p => ({ ...p, fornecedorId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  {fornecedores.map(f => (
                    <SelectItem key={f.id} value={String(f.id)}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Descrição</Label>
              <Input value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Descrição do pedido" />
            </div>
            <div className="space-y-1.5">
              <Label>Valor (R$) <span className="text-destructive">*</span></Label>
              <Input type="number" step="0.01" min="0" value={form.valor} onChange={e => setForm(p => ({ ...p, valor: e.target.value }))} placeholder="0,00" required />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de Gasto</Label>
              <Select value={form.tipoGasto} onValueChange={v => setForm(p => ({ ...p, tipoGasto: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="capex">Capex</SelectItem>
                  <SelectItem value="opex">Opex</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Data Início</Label>
              <Input type="date" value={form.dataInicio} onChange={e => setForm(p => ({ ...p, dataInicio: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Data Fim</Label>
              <Input type="date" value={form.dataFim} onChange={e => setForm(p => ({ ...p, dataFim: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Frequência</Label>
              <Select value={form.frequencia} onValueChange={v => setForm(p => ({ ...p, frequencia: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="trimestral">Trimestral</SelectItem>
                  <SelectItem value="semestral">Semestral</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} placeholder="Observações adicionais" rows={3} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isLoading} className="bg-primary text-primary-foreground">
              {isLoading ? "Salvando..." : pedido ? "Salvar Alterações" : "Criar Pedido"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
