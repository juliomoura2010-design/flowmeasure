import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function formatCurrency(value: string | number | null | undefined) {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
}

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const STATUS_COLORS: Record<string, string> = {
  ativo: "#4ade80",
  concluido: "#60a5fa",
  cancelado: "#f87171",
  pendente: "#fbbf24",
  paga: "#4ade80",
};

const STATUS_LABELS: Record<string, string> = {
  ativo: "Ativo",
  concluido: "Concluído",
  cancelado: "Cancelado",
  pendente: "Pendente",
  paga: "Paga",
};

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    ativo: "bg-green-100 text-green-800 border-green-200",
    concluido: "bg-blue-100 text-blue-800 border-blue-200",
    cancelado: "bg-red-100 text-red-800 border-red-200",
    pendente: "bg-yellow-100 text-yellow-800 border-yellow-200",
    paga: "bg-green-100 text-green-800 border-green-200",
    inativo: "bg-gray-100 text-gray-800 border-gray-200",
    suspenso: "bg-orange-100 text-orange-800 border-orange-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${variants[status] ?? "bg-gray-100 text-gray-800"}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export default function Dashboard() {
  const { data, isLoading } = trpc.dashboard.getData.useQuery();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const pedidos = data?.pedidos ?? [];
  const medicoes = data?.medicoes ?? [];
  const fornecedores = data?.fornecedores ?? [];
  const recentMedicoes = data?.recentMedicoes ?? [];

  const totalPedidos = pedidos.length;
  const pedidosAtivos = pedidos.filter(p => p.status === "ativo").length;
  const valorTotal = pedidos.reduce((acc, p) => acc + parseFloat(p.valor as string || "0"), 0);
  const medicoesPendentes = medicoes.filter(m => m.status === "pendente").length;

  // Dados para gráfico de status dos pedidos
  const statusPedidosData = ["ativo", "concluido", "cancelado"].map(s => ({
    name: STATUS_LABELS[s],
    value: pedidos.filter(p => p.status === s).length,
    color: STATUS_COLORS[s],
  })).filter(d => d.value > 0);

  // Dados para gráfico Capex vs Opex
  const capexTotal = pedidos.filter(p => p.tipoGasto === "capex").reduce((a, p) => a + parseFloat(p.valor as string || "0"), 0);
  const opexTotal = pedidos.filter(p => p.tipoGasto === "opex").reduce((a, p) => a + parseFloat(p.valor as string || "0"), 0);
  const tipoGastoData = [
    { name: "Capex", value: capexTotal, color: "#34d399" },
    { name: "Opex", value: opexTotal, color: "#60a5fa" },
  ].filter(d => d.value > 0);

  // Top fornecedores por valor
  const fornecedorMap = new Map(fornecedores.map(f => [f.id, f.nome]));
  const topFornecedores = fornecedores.map(f => {
    const total = pedidos.filter(p => p.fornecedorId === f.id).reduce((a, p) => a + parseFloat(p.valor as string || "0"), 0);
    return { nome: f.nome.length > 20 ? f.nome.slice(0, 20) + "..." : f.nome, total };
  }).sort((a, b) => b.total - a.total).slice(0, 5);

  const currentMonth = getCurrentMonthKey();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Visão geral do sistema de pagamentos</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total de Pedidos</p>
                  <p className="text-3xl font-bold font-heading text-foreground mt-1">{totalPedidos}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <ClipboardList className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Pedidos Ativos</p>
                  <p className="text-3xl font-bold font-heading text-foreground mt-1">{pedidosAtivos}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Valor Total</p>
                  <p className="text-2xl font-bold font-heading text-foreground mt-1">{formatCurrency(valorTotal)}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-accent-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Medições Pendentes</p>
                  <p className="text-3xl font-bold font-heading text-foreground mt-1">{medicoesPendentes}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Status dos Pedidos */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-heading">Status dos Pedidos</CardTitle>
            </CardHeader>
            <CardContent>
              {statusPedidosData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={statusPedidosData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                      {statusPedidosData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => [v, "Pedidos"]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                  Nenhum pedido cadastrado
                </div>
              )}
            </CardContent>
          </Card>

          {/* Capex vs Opex */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-heading">Capex vs Opex</CardTitle>
            </CardHeader>
            <CardContent>
              {tipoGastoData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={tipoGastoData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                      {tipoGastoData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => [formatCurrency(v), "Valor"]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                  Nenhum pedido cadastrado
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Fornecedores */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-heading">Top Fornecedores</CardTitle>
            </CardHeader>
            <CardContent>
              {topFornecedores.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={topFornecedores} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="nome" width={80} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: any) => [formatCurrency(v), "Valor"]} />
                    <Bar dataKey="total" fill="oklch(0.30 0.06 150)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                  Nenhum fornecedor cadastrado
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Medições Recentes */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-heading">Medições Recentes</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {recentMedicoes.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Nº</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Mês</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Valor</th>
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentMedicoes.map(m => (
                      <tr key={m.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-2 px-3 font-medium">{m.numero}</td>
                        <td className="py-2 px-3 text-muted-foreground">{m.mes}</td>
                        <td className="py-2 px-3 font-medium">{formatCurrency(m.valor)}</td>
                        <td className="py-2 px-3"><StatusBadge status={m.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground text-sm">
                Nenhuma medição registrada ainda
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
