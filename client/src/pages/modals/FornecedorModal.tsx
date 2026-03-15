import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Fornecedor = {
  id: number;
  nome: string;
  cnpj: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  contato: string | null;
  status: "ativo" | "inativo" | "suspenso";
};

type Props = {
  open: boolean;
  onClose: () => void;
  fornecedor: Fornecedor | null;
  onSuccess: () => void;
};

type StatusType = "ativo" | "inativo" | "suspenso";

const emptyForm = {
  nome: "",
  cnpj: "",
  email: "",
  telefone: "",
  endereco: "",
  cidade: "",
  estado: "",
  cep: "",
  contato: "",
  status: "ativo" as StatusType,
};

export default function FornecedorModal({ open, onClose, fornecedor, onSuccess }: Props) {
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);

  useEffect(() => {
    if (fornecedor) {
      setForm({
        nome: fornecedor.nome,
        cnpj: fornecedor.cnpj ?? "",
        email: fornecedor.email ?? "",
        telefone: fornecedor.telefone ?? "",
        endereco: fornecedor.endereco ?? "",
        cidade: fornecedor.cidade ?? "",
        estado: fornecedor.estado ?? "",
        cep: fornecedor.cep ?? "",
        contato: fornecedor.contato ?? "",
        status: fornecedor.status as StatusType,
      });
    } else {
      setForm(emptyForm);
    }
  }, [fornecedor, open]);

  const createMutation = trpc.fornecedores.create.useMutation({
    onSuccess: () => { toast.success("Fornecedor criado com sucesso"); onSuccess(); },
    onError: (e) => toast.error("Erro ao criar fornecedor: " + e.message),
  });

  const updateMutation = trpc.fornecedores.update.useMutation({
    onSuccess: () => { toast.success("Fornecedor atualizado com sucesso"); onSuccess(); },
    onError: (e) => toast.error("Erro ao atualizar fornecedor: " + e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    const data = {
      nome: form.nome,
      cnpj: form.cnpj || null,
      email: form.email || null,
      telefone: form.telefone || null,
      endereco: form.endereco || null,
      cidade: form.cidade || null,
      estado: form.estado || null,
      cep: form.cep || null,
      contato: form.contato || null,
      status: form.status,
    };
    if (fornecedor) {
      updateMutation.mutate({ id: fornecedor.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const set = (field: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">{fornecedor ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="nome">Nome <span className="text-destructive">*</span></Label>
              <Input id="nome" value={form.nome} onChange={set("nome")} placeholder="Razão social do fornecedor" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input id="cnpj" value={form.cnpj} onChange={set("cnpj")} placeholder="00.000.000/0000-00" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={form.email} onChange={set("email")} placeholder="contato@empresa.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" value={form.telefone} onChange={set("telefone")} placeholder="(00) 00000-0000" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contato">Contato</Label>
              <Input id="contato" value={form.contato} onChange={set("contato")} placeholder="Nome do responsável" />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="endereco">Endereço</Label>
              <Input id="endereco" value={form.endereco} onChange={set("endereco")} placeholder="Rua, número, bairro" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cidade">Cidade</Label>
              <Input id="cidade" value={form.cidade} onChange={set("cidade")} placeholder="Cidade" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="estado">UF</Label>
                <Input id="estado" value={form.estado} onChange={set("estado")} placeholder="SP" maxLength={2} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cep">CEP</Label>
                <Input id="cep" value={form.cep} onChange={set("cep")} placeholder="00000-000" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(prev => ({ ...prev, status: v as any }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="suspenso">Suspenso</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isLoading} className="bg-primary text-primary-foreground">
              {isLoading ? "Salvando..." : fornecedor ? "Salvar Alterações" : "Criar Fornecedor"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
