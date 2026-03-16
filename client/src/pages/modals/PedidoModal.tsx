import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Fornecedor = { id: number; nome: string };

type Props = {
  open: boolean;
  onClose: () => void;
  editingId?: number | null;
  fornecedores?: Fornecedor[];
};

function toDateInput(d: Date | string | null | undefined) {
  if (!d) return "";
  return new Date(d).toISOString().split("T")[0];
}

const defaultForm = {
  numero: "",
  fornecedorId: "",
  descricao: "",
  valor: "",
  dataInicio: "",
  dataFim: "",
  tipo: "mensal",
  totalMedicoes: "12",
  elementoPep: "",
  tipoGasto: "opex",
  frequencia: "mensal",
  status: "ativo",
  observacoes: "",
};

export default function PedidoModal({ open, onClose, editingId, fornecedores: fornecedoresProp }: Props) {
  const [form, setForm] = useState(defaultForm);

  const utils = trpc.useUtils();
  const { data: fornecedoresList = [] } = trpc.fornecedores.list.useQuery(undefined, { enabled: !fornecedoresProp });
  const fornecedores = fornecedoresProp ?? (fornecedoresList as Fornecedor[]);

  const { data: pedidoData } = trpc.pedidos.getById.useQuery(
    { id: editingId! },
    { enabled: !!editingId }
  );

  useEffect(() => {
    if (editingId && pedidoData) {
      setForm({
        numero: pedidoData.numero,
        fornecedorId: String(pedidoData.fornecedorId),
        descricao: pedidoData.descricao ?? "",
        valor: pedidoData.valor,
        dataInicio: toDateInput(pedidoData.dataInicio),
        dataFim: toDateInput(pedidoData.dataFim),
        tipo: pedidoData.tipo ?? "mensal",
        totalMedicoes: String(pedidoData.totalMedicoes ?? 12),
        elementoPep: (pedidoData as any).elementoPep ?? "",
        tipoGasto: pedidoData.tipoGasto,
        frequencia: pedidoData.frequencia,
        status: pedidoData.status,
        observacoes: pedidoData.observacoes ?? "",
      });
    } else if (!editingId) {
      setForm(defaultForm);
    }
  }, [editingId, pedidoData, open]);

  const createMutation = trpc.pedidos.create.useMutation({
    onSuccess: () => {
      toast.success("Pedido criado com sucesso");
      utils.pedidos.listComStats.invalidate();
      utils.dashboard.getData.invalidate();
      onClose();
    },
    onError: (e) => toast.error("Erro ao criar pedido: " + e.message),
  });

  const updateMutation = trpc.pedidos.update.useMutation({
    onSuccess: () => {
      toast.success("Pedido atualizado com sucesso");
      utils.pedidos.listComStats.invalidate();
      utils.dashboard.getData.invalidate();
      onClose();
    },
    onError: (e) => toast.error("Erro ao atualizar pedido: " + e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.numero.trim()) { toast.error("Número é obrigatório"); return; }
    if (!form.fornecedorId) { toast.error("Fornecedor é obrigatório"); return; }
    if (!form.valor) { toast.error("Valor é obrigatório"); return; }

    // Validação: PEP obrigatório quando Capex
    if (form.tipoGasto === "capex" && !form.elementoPep.trim()) {
      toast.error("Elemento PEP é obrigatório para pedidos do tipo Capex");
      return;
    }
    // Validação: formato do PEP
    if (form.elementoPep.trim() && !PEP_REGEX.test(form.elementoPep.trim())) {
      toast.error("Formato inválido. Use o padrão: CBF.26.001");
      return;
    }

    const data = {
      numero: form.numero,
      fornecedorId: parseInt(form.fornecedorId),
      descricao: form.descricao || null,
      valor: form.valor,
      dataInicio: form.dataInicio || null,
      dataFim: form.dataFim || null,
      tipo: form.tipo as "fixo" | "mensal",
      totalMedicoes: parseInt(form.totalMedicoes) || 12,
      elementoPep: form.elementoPep.trim() || null,
      tipoGasto: form.tipoGasto as "capex" | "opex",
      frequencia: form.frequencia as "mensal" | "trimestral" | "semestral" | "anual",
      status: form.status as "ativo" | "concluido" | "cancelado",
      observacoes: form.observacoes || null,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const isCapex = form.tipoGasto === "capex";

  // Formato PEP: CBF.26.001 (3 letras + ponto + 2 dígitos + ponto + 3 dígitos)
  const PEP_REGEX = /^[A-Za-z]{3}\.[0-9]{2}\.[0-9]{3}$/;
  const pepValido = !form.elementoPep.trim() || PEP_REGEX.test(form.elementoPep.trim());

  // Máscara automática ao digitar
  // Formato final: CBF.26.015 = 3 letras + '.' + 2 dígitos + '.' + 3 dígitos = 9 chars
  // cleaned pode ter no máximo 8 chars (3+2+3 sem pontos)
  const handlePepChange = (raw: string) => {
    const cleaned = raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 8);
    let masked = "";
    for (let i = 0; i < cleaned.length; i++) {
      if (i === 3 || i === 5) masked += ".";
      masked += cleaned[i];
    }
    setForm(p => ({ ...p, elementoPep: masked }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">{editingId ? "Editar Pedido" : "Novo Pedido"}</DialogTitle>
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
              <Select value={form.tipoGasto} onValueChange={v => setForm(p => ({ ...p, tipoGasto: v, elementoPep: v === "opex" ? "" : p.elementoPep }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="capex">Capex</SelectItem>
                  <SelectItem value="opex">Opex</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Campo PEP — aparece e é obrigatório apenas quando Capex */}
            <div className={`sm:col-span-2 space-y-1.5 transition-all ${isCapex ? "opacity-100" : "opacity-0 pointer-events-none h-0 overflow-hidden"}`}>
              <Label>
                Elemento PEP {isCapex && <span className="text-destructive">*</span>}
              </Label>
              <Input
                value={form.elementoPep}
                onChange={e => handlePepChange(e.target.value)}
                placeholder="Ex: CBF.26.001"
                maxLength={9}
                className={
                  isCapex && !form.elementoPep.trim()
                    ? "border-orange-300 focus-visible:ring-orange-400"
                    : form.elementoPep.trim() && !pepValido
                    ? "border-red-400 focus-visible:ring-red-400"
                    : form.elementoPep.trim() && pepValido
                    ? "border-green-400 focus-visible:ring-green-400"
                    : ""
                }
              />
              {isCapex && !form.elementoPep.trim() && (
                <p className="text-xs text-orange-500">Obrigatório para pedidos Capex</p>
              )}
              {form.elementoPep.trim() && !pepValido && (
                <p className="text-xs text-red-500">Formato inválido — use o padrão: CBF.26.001</p>
              )}
              {form.elementoPep.trim() && pepValido && (
                <p className="text-xs text-green-600">✓ Formato válido</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Tipo de Medição</Label>
              <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixo">Fixo (nº fixo de medições)</SelectItem>
                  <SelectItem value="mensal">Mensal (recorrente)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Total de Medições Previstas</Label>
              <Input type="number" min="1" value={form.totalMedicoes} onChange={e => setForm(p => ({ ...p, totalMedicoes: e.target.value }))} placeholder="12" />
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
              {isLoading ? "Salvando..." : editingId ? "Salvar Alterações" : "Criar Pedido"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
