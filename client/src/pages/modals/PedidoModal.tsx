import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

type Fornecedor = { id: number; nome: string };

type Props = {
  open: boolean;
  onClose: () => void;
  editingId?: number | null;
  fornecedores?: Fornecedor[];
  // Modo renovação: pré-preenche com dados do pedido de origem
  renovacaoDe?: {
    pedidoId: number;
    pedidoNumero: string;
    fornecedorId: number;
    fornecedorNome: string;
    descricao: string;
    valor: string;
    totalMedicoes: number;
    frequencia: string;
    tipoGasto: string;
    elementoPep: string | null;
    responsavel: string | null;
    tipo: string;
  } | null;
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
  responsavel: "",
  frequencia: "mensal",
  status: "ativo",
  observacoes: "",
};

export default function PedidoModal({ open, onClose, editingId, fornecedores: fornecedoresProp, renovacaoDe }: Props) {
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
        responsavel: (pedidoData as any).responsavel ?? "",
        frequencia: pedidoData.frequencia,
        status: pedidoData.status,
        observacoes: pedidoData.observacoes ?? "",
      });
    } else if (renovacaoDe && !editingId) {
      // Modo renovação: pré-preenche com dados do pedido de origem
      setForm({
        numero: "",
        fornecedorId: String(renovacaoDe.fornecedorId),
        descricao: renovacaoDe.descricao || "",
        valor: renovacaoDe.valor,
        dataInicio: "",
        dataFim: "",
        tipo: renovacaoDe.tipo,
        totalMedicoes: String(renovacaoDe.totalMedicoes),
        elementoPep: renovacaoDe.elementoPep || "",
        tipoGasto: renovacaoDe.tipoGasto,
        responsavel: renovacaoDe.responsavel || "",
        frequencia: renovacaoDe.frequencia,
        status: "ativo",
        observacoes: "",
      });
    } else if (!editingId) {
      setForm(defaultForm);
    }
  }, [editingId, pedidoData, open, renovacaoDe]);

  const createMutation = trpc.pedidos.create.useMutation({
    onSuccess: () => {
      toast.success(renovacaoDe ? "Contrato renovado com sucesso!" : "Pedido criado com sucesso");
      utils.pedidos.listComStats.invalidate();
      utils.dashboard.getData.invalidate();
      utils.dashboard.getGerencial.invalidate();
      utils.renovacoes.contratosParaRenovar.invalidate();
      onClose();
    },
    onError: (e) => toast.error("Erro ao criar pedido: " + e.message),
  });

  const updateMutation = trpc.pedidos.update.useMutation({
    onSuccess: () => {
      toast.success("Pedido atualizado com sucesso");
      utils.pedidos.listComStats.invalidate();
      utils.dashboard.getData.invalidate();
      utils.dashboard.getGerencial.invalidate();
      utils.renovacoes.contratosParaRenovar.invalidate();
      onClose();
    },
    onError: (e) => toast.error("Erro ao atualizar pedido: " + e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.numero.trim()) { toast.error("Número é obrigatório"); return; }
    if (!form.fornecedorId) { toast.error("Fornecedor é obrigatório"); return; }
    if (!form.valor) { toast.error("Valor é obrigatório"); return; }

    if (form.tipoGasto === "capex" && !form.elementoPep.trim()) {
      toast.error("Elemento PEP é obrigatório para pedidos do tipo Capex");
      return;
    }
    if (form.elementoPep.trim() && !PEP_REGEX.test(form.elementoPep.trim())) {
      toast.error("Formato inválido. Use o padrão: CBF.26.001");
      return;
    }

    const data: any = {
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
      responsavel: form.responsavel.trim() || null,
      frequencia: form.frequencia as "mensal" | "trimestral" | "semestral" | "anual",
      status: form.status as "ativo" | "concluido" | "cancelado" | "encerrado",
      observacoes: form.observacoes || null,
    };

    // Em modo renovação, vincular ao pedido de origem
    if (renovacaoDe && !editingId) {
      data.pedidoOrigemId = renovacaoDe.pedidoId;
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const isCapex = form.tipoGasto === "capex";
  const isRenovacao = !!renovacaoDe && !editingId;

  const PEP_REGEX = /^[A-Za-z]{3}\.[0-9]{2}\.[0-9]{3}$/;
  const pepValido = !form.elementoPep.trim() || PEP_REGEX.test(form.elementoPep.trim());

  const handlePepChange = (raw: string) => {
    const cleaned = raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    const limited = cleaned.slice(0, 8);
    const p1 = limited.slice(0, 3);
    const p2 = limited.slice(3, 5);
    const p3 = limited.slice(5, 8);
    let result = p1;
    if (p2) result += "." + p2;
    if (p3) result += "." + p3;
    setForm(p => ({ ...p, elementoPep: result }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            {isRenovacao && <RefreshCw className="h-4 w-4 text-blue-500" />}
            {editingId ? "Editar Pedido" : isRenovacao ? "Renovar Contrato" : "Novo Pedido"}
          </DialogTitle>
        </DialogHeader>

        {/* Banner de renovação */}
        {isRenovacao && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <div className="flex items-center gap-2 font-medium mb-1">
              <RefreshCw className="h-3.5 w-3.5" />
              Renovação do pedido <span className="font-bold">{renovacaoDe.pedidoNumero}</span>
            </div>
            <p className="text-blue-600 text-xs">Os dados foram pré-preenchidos com base no contrato anterior. Ajuste o número do novo pedido e as datas.</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Número <span className="text-destructive">*</span></Label>
              <Input value={form.numero} onChange={e => setForm(p => ({ ...p, numero: e.target.value }))} placeholder={isRenovacao ? "Número do novo pedido" : "Ex: PED-2025-001"} required />
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
              <Label>Responsável pelas Medições</Label>
              <Input
                value={form.responsavel}
                onChange={e => setForm(p => ({ ...p, responsavel: e.target.value }))}
                placeholder="Nome do responsável"
              />
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

            <div className={`space-y-1.5 transition-all ${isCapex ? "opacity-100" : "opacity-0 pointer-events-none h-0 overflow-hidden"}`}>
              <Label>
                Elemento PEP {isCapex && <span className="text-destructive">*</span>}
              </Label>
              <Input
                value={form.elementoPep}
                onChange={e => handlePepChange(e.target.value)}
                placeholder="Ex: CBF.26.001"
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
                  <SelectItem value="fixo">Spot (nº fixo de parcelas)</SelectItem>
                  <SelectItem value="mensal">Contrato (recorrente)</SelectItem>
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
                  <SelectItem value="encerrado">
                    <span className="flex items-center gap-2">
                      Encerrado
                      <Badge variant="outline" className="text-xs border-gray-400 text-gray-500">Sem renovação</Badge>
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              {form.status === "encerrado" && (
                <p className="text-xs text-muted-foreground">Este contrato não será renovado. A cadeia de renovações será encerrada.</p>
              )}
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} placeholder="Observações adicionais" rows={3} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isLoading} className={isRenovacao ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-primary text-primary-foreground"}>
              {isLoading ? "Salvando..." : isRenovacao ? "Confirmar Renovação" : editingId ? "Salvar Alterações" : "Criar Pedido"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
