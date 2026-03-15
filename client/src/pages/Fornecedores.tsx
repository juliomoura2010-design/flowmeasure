import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Building2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import FornecedorModal from "./modals/FornecedorModal";

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

const STATUS_LABELS: Record<string, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
  suspenso: "Suspenso",
};

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    ativo: "bg-green-100 text-green-800 border-green-200",
    inativo: "bg-gray-100 text-gray-700 border-gray-200",
    suspenso: "bg-orange-100 text-orange-800 border-orange-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${variants[status] ?? "bg-gray-100 text-gray-800"}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export default function Fornecedores() {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | null>(null);

  const utils = trpc.useUtils();
  const { data: fornecedores = [], isLoading } = trpc.fornecedores.list.useQuery({ search: search || undefined });

  const deleteMutation = trpc.fornecedores.delete.useMutation({
    onSuccess: () => {
      utils.fornecedores.list.invalidate();
      toast.success("Fornecedor excluído com sucesso");
    },
    onError: () => toast.error("Erro ao excluir fornecedor"),
  });

  const handleEdit = (f: Fornecedor) => {
    setEditingFornecedor(f);
    setModalOpen(true);
  };

  const handleNew = () => {
    setEditingFornecedor(null);
    setModalOpen(true);
  };

  const handleDelete = (id: number, nome: string) => {
    if (confirm(`Deseja excluir o fornecedor "${nome}"?`)) {
      deleteMutation.mutate({ id });
    }
  };

  const filtered = fornecedores.filter(f =>
    f.nome.toLowerCase().includes(search.toLowerCase()) ||
    (f.cnpj ?? "").includes(search) ||
    (f.cidade ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-heading text-foreground">Fornecedores</h1>
            <p className="text-sm text-muted-foreground mt-1">Gerencie os fornecedores cadastrados</p>
          </div>
          <Button onClick={handleNew} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
            <Plus className="h-4 w-4" />
            Novo Fornecedor
          </Button>
        </div>

        {/* Filtros */}
        <Card className="border-border shadow-sm">
          <CardContent className="p-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CNPJ ou cidade..."
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
              <Building2 className="h-4 w-4 text-muted-foreground" />
              {filtered.length} fornecedor{filtered.length !== 1 ? "es" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
                <Building2 className="h-8 w-8 opacity-30" />
                <p className="text-sm">Nenhum fornecedor encontrado</p>
                <Button variant="outline" size="sm" onClick={handleNew}>Cadastrar primeiro fornecedor</Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left py-3 px-6 text-muted-foreground font-medium">Nome</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">CNPJ</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Contato</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Cidade/UF</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Status</th>
                      <th className="text-right py-3 px-6 text-muted-foreground font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(f => (
                      <tr key={f.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-6">
                          <div className="font-medium text-foreground">{f.nome}</div>
                          {f.email && <div className="text-xs text-muted-foreground">{f.email}</div>}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">{f.cnpj || "—"}</td>
                        <td className="py-3 px-4">
                          <div className="text-foreground">{f.contato || "—"}</div>
                          {f.telefone && <div className="text-xs text-muted-foreground">{f.telefone}</div>}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {f.cidade && f.estado ? `${f.cidade}/${f.estado}` : f.cidade || f.estado || "—"}
                        </td>
                        <td className="py-3 px-4"><StatusBadge status={f.status} /></td>
                        <td className="py-3 px-6">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => handleEdit(f as Fornecedor)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDelete(f.id, f.nome)}
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

      <FornecedorModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        fornecedor={editingFornecedor}
        onSuccess={() => {
          utils.fornecedores.list.invalidate();
          setModalOpen(false);
        }}
      />
    </DashboardLayout>
  );
}
