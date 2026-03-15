import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, FileText, AlertTriangle, Clock } from "lucide-react";
import { Link } from "wouter";

function formatCurrency(value: number | string | null | undefined) {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
}

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ativo: "bg-green-100 text-green-700",
    pendente: "bg-yellow-100 text-yellow-700",
    paga: "bg-green-100 text-green-700",
    cancelada: "bg-red-100 text-red-700",
    concluido: "bg-blue-100 text-blue-700",
    cancelado: "bg-red-100 text-red-700",
  };
  const labels: Record<string, string> = {
    ativo: "Ativo", pendente: "Pendente", paga: "Pago", cancelada: "Cancelada",
    concluido: "Concluído", cancelado: "Cancelado",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || "bg-gray-100 text-gray-600"}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {labels[status] || status}
    </span>
  );
}

function TipoBadge({ tipo }: { tipo: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${tipo === "fixo" ? "bg-gray-100 text-gray-600" : "bg-blue-50 text-blue-600"}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1" />
      {tipo === "fixo" ? "Fixo" : "Mensal"}
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

  const medicoesCriarLista = (data?.medicoesCriarMesLista ?? []) as Array<{ pedidoId: number; pedidoNumero: string; fornecedorNome: string; valorPrevisto: string; tipo: string }>;
  const medicoesAtraso = (data?.medicoesAtraso ?? []) as Array<{ id: number; numero: string; pedidoNumero: string; dataVencimento: Date | null }>;
  const pedidosEmAndamento = (data?.pedidosEmAndamento ?? []) as Array<{
    id: number; numero: string; fornecedorNome: string; tipo: string; valor: string;
    totalMedicoesCriadas: number; totalMedicoesPrevistas: number; proximaMedicao: string | null; status: string;
  }>;

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading font-bold text-gray-900">Visão Geral</h1>
        <Link href="/pedidos">
          <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            + Novo Pedido
          </button>
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center mb-3">
            <FileText className="h-5 w-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{data?.pedidosAtivos ?? 0}</div>
          <div className="text-sm text-gray-500 mt-1">Pedidos Ativos</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center mb-3">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(data?.totalMedicoesPagas ?? 0)}</div>
          <div className="text-sm text-gray-500 mt-1">Medições Pagas (total)</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 relative">
          {(data?.medicoesCriarMes ?? 0) > 0 && (
            <span className="absolute top-3 right-3 bg-red-100 text-red-600 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {data?.medicoesCriarMes}
            </span>
          )}
          <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center mb-3">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{data?.medicoesCriarMes ?? 0}</div>
          <div className="text-sm text-gray-500 mt-1">Medições p/ Criar (mês)</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 relative">
          {(medicoesAtraso.length) > 0 && (
            <span className="absolute top-3 right-3 bg-red-100 text-red-600 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {medicoesAtraso.length}
            </span>
          )}
          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center mb-3">
            <Clock className="h-5 w-5 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(data?.valorEmAtraso ?? 0)}</div>
          <div className="text-sm text-gray-500 mt-1">Em Atraso</div>
        </div>
      </div>

      {/* Tabelas lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Medições a Criar Este Mês */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-semibold text-gray-900">Medições a Criar Este Mês</h2>
            <Link href="/medicoes">
              <button className="text-sm text-primary hover:underline border border-gray-200 px-3 py-1 rounded-lg">Ver controle</button>
            </Link>
          </div>
          {medicoesCriarLista.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-400" />
              ✓ Todas as medições do mês criadas
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                  <th className="text-left pb-2 font-medium">Pedido</th>
                  <th className="text-left pb-2 font-medium">Fornecedor</th>
                  <th className="text-left pb-2 font-medium">Valor Previsto</th>
                  <th className="text-left pb-2 font-medium">Situação</th>
                </tr>
              </thead>
              <tbody>
                {medicoesCriarLista.map((item) => (
                  <tr key={item.pedidoId} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 font-medium text-gray-900">{item.pedidoNumero}</td>
                    <td className="py-2.5 text-gray-600">{item.fornecedorNome}</td>
                    <td className="py-2.5 text-gray-700">{formatCurrency(item.valorPrevisto)}</td>
                    <td className="py-2.5">
                      <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-medium">Pendente</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Medições em Atraso */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="font-heading font-semibold text-gray-900 mb-4">Medições em Atraso</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                <th className="text-left pb-2 font-medium">Documento</th>
                <th className="text-left pb-2 font-medium">Pedido</th>
                <th className="text-left pb-2 font-medium">Venc.</th>
              </tr>
            </thead>
            <tbody>
              {medicoesAtraso.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-gray-400 text-sm">Nenhum atraso</td>
                </tr>
              ) : (
                medicoesAtraso.map((m) => (
                  <tr key={m.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 font-medium text-gray-900">{m.numero}</td>
                    <td className="py-2.5 text-gray-600">{m.pedidoNumero}</td>
                    <td className="py-2.5 text-red-600 font-medium">{formatDate(m.dataVencimento)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pedidos em Andamento */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h2 className="font-heading font-semibold text-gray-900 mb-4">Pedidos em Andamento</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                <th className="text-left pb-2 font-medium">Pedido</th>
                <th className="text-left pb-2 font-medium">Fornecedor</th>
                <th className="text-left pb-2 font-medium">Tipo</th>
                <th className="text-left pb-2 font-medium">Total</th>
                <th className="text-left pb-2 font-medium">Progresso</th>
                <th className="text-left pb-2 font-medium">Próx. Medição</th>
                <th className="text-left pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {pedidosEmAndamento.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400 text-sm">Nenhum pedido em andamento</td>
                </tr>
              ) : (
                pedidosEmAndamento.map((p) => {
                  const progresso = p.totalMedicoesPrevistas > 0
                    ? Math.round((p.totalMedicoesCriadas / p.totalMedicoesPrevistas) * 100)
                    : 0;
                  return (
                    <tr key={p.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-2.5 font-medium text-gray-900">{p.numero}</td>
                      <td className="py-2.5 text-gray-600">{p.fornecedorNome}</td>
                      <td className="py-2.5"><TipoBadge tipo={p.tipo} /></td>
                      <td className="py-2.5 text-gray-700">{formatCurrency(p.valor)}</td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{p.totalMedicoesCriadas}/{p.totalMedicoesPrevistas}</span>
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${progresso}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 text-gray-600 text-xs">{p.proximaMedicao || "—"}</td>
                      <td className="py-2.5"><StatusBadge status={p.status} /></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
