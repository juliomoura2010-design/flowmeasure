import DashboardLayout from "@/components/DashboardLayout";
import { BarChart3, Clock, Wrench } from "lucide-react";

export default function Relatorios() {
  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-heading font-bold text-gray-900">Relatórios</h1>
        </div>

        {/* Em Construção */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-6 py-16">
            <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-[#2d3b2d]/10 mb-6">
              <BarChart3 className="w-10 h-10 text-[#2d3b2d]" />
              <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-amber-100 border-2 border-white flex items-center justify-center">
                <Wrench className="w-4 h-4 text-amber-600" />
              </div>
            </div>

            <h2 className="text-xl font-heading font-bold text-gray-900 mb-3">
              Em Construção
            </h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              A área de Relatórios está sendo desenvolvida e em breve estará disponível com análises financeiras completas, taxa de adimplência por fornecedor e comparativo Capex vs Opex.
            </p>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium">
              <Clock className="w-4 h-4" />
              Em breve
            </div>

            {/* Funcionalidades previstas */}
            <div className="mt-10 grid grid-cols-1 gap-3 text-left">
              {[
                "Análise financeira por período",
                "Taxa de adimplência por fornecedor",
                "Comparativo Capex vs Opex",
                "Evolução de pagamentos mensais",
                "Exportação para Excel e PDF",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#c8e6a0] flex-shrink-0" />
                  <span className="text-sm text-gray-600">{item}</span>
                  <span className="ml-auto text-xs text-gray-300 font-medium">Em breve</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
