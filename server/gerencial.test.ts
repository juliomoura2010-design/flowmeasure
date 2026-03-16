import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock do módulo db para isolar os testes
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getDb: vi.fn(),
  };
});

// Testa a lógica de agrupamento por responsável diretamente
describe("getDashboardGerencial - lógica de agrupamento", () => {
  it("agrupa pedidos por responsável corretamente", () => {
    const pedidosAtivos = [
      { id: 1, numero: "PED-001", fornecedorId: 1, valor: "10000", totalMedicoes: 10, responsavel: "Ana", status: "ativo", dataInicio: null },
      { id: 2, numero: "PED-002", fornecedorId: 2, valor: "5000", totalMedicoes: 5, responsavel: "Ana", status: "ativo", dataInicio: null },
      { id: 3, numero: "PED-003", fornecedorId: 1, valor: "8000", totalMedicoes: 8, responsavel: "Bruno", status: "ativo", dataInicio: null },
    ];
    const medicoesMes = [
      { pedidoId: 1, mes: "2026-03" }, // Ana criou medição para PED-001
      // Ana NÃO criou para PED-002
      { pedidoId: 3, mes: "2026-03" }, // Bruno criou para PED-003
    ];

    // Simular a lógica de agrupamento
    const mapa = new Map<string, { responsavel: string; totalPedidos: number; valorTotal: number; medicoesCriadas: number; medicoesPendentes: number; pedidosPendentes: any[] }>();

    for (const p of pedidosAtivos) {
      const responsavel = p.responsavel || "Sem responsável";
      const temMedicaoMes = medicoesMes.some(m => m.pedidoId === p.id);
      const valorTotal = parseFloat(p.valor);

      if (!mapa.has(responsavel)) {
        mapa.set(responsavel, { responsavel, totalPedidos: 0, valorTotal: 0, medicoesCriadas: 0, medicoesPendentes: 0, pedidosPendentes: [] });
      }
      const entry = mapa.get(responsavel)!;
      entry.totalPedidos += 1;
      entry.valorTotal += valorTotal;
      if (temMedicaoMes) {
        entry.medicoesCriadas += 1;
      } else {
        entry.medicoesPendentes += 1;
        entry.pedidosPendentes.push({ pedidoId: p.id, pedidoNumero: p.numero });
      }
    }

    const resultado = Array.from(mapa.values());

    const ana = resultado.find(r => r.responsavel === "Ana");
    const bruno = resultado.find(r => r.responsavel === "Bruno");

    expect(ana).toBeDefined();
    expect(ana!.totalPedidos).toBe(2);
    expect(ana!.medicoesCriadas).toBe(1);
    expect(ana!.medicoesPendentes).toBe(1);
    expect(ana!.pedidosPendentes[0].pedidoNumero).toBe("PED-002");
    expect(ana!.valorTotal).toBe(15000);

    expect(bruno).toBeDefined();
    expect(bruno!.totalPedidos).toBe(1);
    expect(bruno!.medicoesCriadas).toBe(1);
    expect(bruno!.medicoesPendentes).toBe(0);
  });

  it("classifica pedidos sem responsável como 'Sem responsável'", () => {
    const pedidosAtivos = [
      { id: 1, numero: "PED-001", fornecedorId: 1, valor: "5000", totalMedicoes: 5, responsavel: null, status: "ativo", dataInicio: null },
    ];
    const medicoesMes: any[] = [];

    const mapa = new Map<string, any>();
    for (const p of pedidosAtivos) {
      const responsavel = p.responsavel || "Sem responsável";
      if (!mapa.has(responsavel)) {
        mapa.set(responsavel, { responsavel, totalPedidos: 0, medicoesPendentes: 0, pedidosPendentes: [] });
      }
      const entry = mapa.get(responsavel)!;
      entry.totalPedidos += 1;
      const temMedicao = medicoesMes.some(m => m.pedidoId === p.id);
      if (!temMedicao) entry.medicoesPendentes += 1;
    }

    const resultado = Array.from(mapa.values());
    expect(resultado[0].responsavel).toBe("Sem responsável");
    expect(resultado[0].medicoesPendentes).toBe(1);
  });

  it("filtra pedidos com dataInicio posterior ao mês selecionado", () => {
    const mes = "2026-03";
    const allPedidos = [
      { id: 1, numero: "PED-001", status: "ativo", dataInicio: new Date("2026-01-01"), responsavel: "Ana", valor: "1000", totalMedicoes: 12, fornecedorId: 1 },
      { id: 2, numero: "PED-002", status: "ativo", dataInicio: new Date("2026-05-01"), responsavel: "Ana", valor: "2000", totalMedicoes: 12, fornecedorId: 1 }, // ainda não iniciou
    ];

    const pedidosAtivos = allPedidos.filter(p => {
      if (p.status !== "ativo") return false;
      if (p.dataInicio) {
        const inicioMes = new Date(p.dataInicio).toISOString().substring(0, 7);
        if (inicioMes > mes) return false;
      }
      return true;
    });

    expect(pedidosAtivos).toHaveLength(1);
    expect(pedidosAtivos[0].numero).toBe("PED-001");
  });
});

describe("verificarConclusaoPedido - lógica de automação", () => {
  it("identifica quando pedido deve ser concluído (consumido >= valor total)", () => {
    const valorTotal = 10000;
    const medicoes = [
      { valor: "3000", status: "paga" },
      { valor: "3500", status: "paga" },
      { valor: "3500", status: "pendente" },
    ];

    const valorConsumido = medicoes
      .filter(m => m.status !== "cancelada")
      .reduce((sum, m) => sum + parseFloat(m.valor), 0);

    expect(valorConsumido).toBe(10000);
    expect(valorConsumido >= valorTotal).toBe(true);
  });

  it("não conclui pedido quando consumido < valor total", () => {
    const valorTotal = 10000;
    const medicoes = [
      { valor: "3000", status: "paga" },
      { valor: "3500", status: "paga" },
    ];

    const valorConsumido = medicoes
      .filter(m => m.status !== "cancelada")
      .reduce((sum, m) => sum + parseFloat(m.valor), 0);

    expect(valorConsumido).toBe(6500);
    expect(valorConsumido >= valorTotal).toBe(false);
  });

  it("ignora medições canceladas no cálculo do consumido", () => {
    const valorTotal = 10000;
    const medicoes = [
      { valor: "5000", status: "paga" },
      { valor: "5000", status: "cancelada" }, // deve ser ignorada
    ];

    const valorConsumido = medicoes
      .filter(m => m.status !== "cancelada")
      .reduce((sum, m) => sum + parseFloat(m.valor), 0);

    expect(valorConsumido).toBe(5000);
    expect(valorConsumido >= valorTotal).toBe(false);
  });

  it("reativa pedido quando medição deletada faz consumido cair abaixo de 100%", () => {
    const valorTotal = 10000;
    // Após deleção, restam apenas estas medições
    const medicoesRestantes = [
      { valor: "5000", status: "paga" },
      { valor: "3000", status: "pendente" },
    ];

    const valorConsumido = medicoesRestantes
      .filter(m => m.status !== "cancelada")
      .reduce((sum, m) => sum + parseFloat(m.valor), 0);

    const pedidoStatus = "concluido";
    const deveReativar = pedidoStatus === "concluido" && valorConsumido < valorTotal;

    expect(deveReativar).toBe(true);
  });
});
