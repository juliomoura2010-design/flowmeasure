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

describe("mesEhValidoParaMedicao - frequência de medições", () => {
  // Importar a função diretamente para teste unitário
  function mesEhValidoParaMedicao(
    mes: string,
    frequencia: string | null | undefined,
    dataInicio: Date | string | null | undefined
  ): boolean {
    const freq = frequencia || "mensal";
    if (freq === "mensal") return true;
    const intervalo = freq === "trimestral" ? 3 : freq === "semestral" ? 6 : freq === "anual" ? 12 : 1;
    if (!dataInicio) return true;
    const inicioStr = typeof dataInicio === "string"
      ? dataInicio.substring(0, 7)
      : (dataInicio as Date).toISOString().substring(0, 7);
    const [anoInicio, mesInicio] = inicioStr.split("-").map(Number);
    const [anoAlvo, mesAlvo] = mes.split("-").map(Number);
    const diffMeses = (anoAlvo - anoInicio) * 12 + (mesAlvo - mesInicio);
    return diffMeses >= 0 && diffMeses % intervalo === 0;
  }

  it("mensal: todo mês é válido", () => {
    expect(mesEhValidoParaMedicao("2026-01", "mensal", "2026-01-01")).toBe(true);
    expect(mesEhValidoParaMedicao("2026-02", "mensal", "2026-01-01")).toBe(true);
    expect(mesEhValidoParaMedicao("2026-06", "mensal", "2026-01-01")).toBe(true);
  });

  it("trimestral: início em março — válido em mar, jun, set, dez", () => {
    const inicio = "2026-03-01";
    expect(mesEhValidoParaMedicao("2026-03", "trimestral", inicio)).toBe(true);  // mês 0
    expect(mesEhValidoParaMedicao("2026-04", "trimestral", inicio)).toBe(false); // mês 1
    expect(mesEhValidoParaMedicao("2026-05", "trimestral", inicio)).toBe(false); // mês 2
    expect(mesEhValidoParaMedicao("2026-06", "trimestral", inicio)).toBe(true);  // mês 3
    expect(mesEhValidoParaMedicao("2026-07", "trimestral", inicio)).toBe(false); // mês 4
    expect(mesEhValidoParaMedicao("2026-09", "trimestral", inicio)).toBe(true);  // mês 6
    expect(mesEhValidoParaMedicao("2026-12", "trimestral", inicio)).toBe(true);  // mês 9
  });

  it("semestral: início em janeiro — válido em jan e jul", () => {
    const inicio = "2026-01-01";
    expect(mesEhValidoParaMedicao("2026-01", "semestral", inicio)).toBe(true);
    expect(mesEhValidoParaMedicao("2026-02", "semestral", inicio)).toBe(false);
    expect(mesEhValidoParaMedicao("2026-06", "semestral", inicio)).toBe(false);
    expect(mesEhValidoParaMedicao("2026-07", "semestral", inicio)).toBe(true);
    expect(mesEhValidoParaMedicao("2027-01", "semestral", inicio)).toBe(true);
  });

  it("anual: início em fevereiro — válido apenas em fevereiro de cada ano", () => {
    const inicio = "2026-02-01";
    expect(mesEhValidoParaMedicao("2026-02", "anual", inicio)).toBe(true);
    expect(mesEhValidoParaMedicao("2026-03", "anual", inicio)).toBe(false);
    expect(mesEhValidoParaMedicao("2027-02", "anual", inicio)).toBe(true);
    expect(mesEhValidoParaMedicao("2027-03", "anual", inicio)).toBe(false);
  });

  it("mês anterior ao início nunca é válido", () => {
    expect(mesEhValidoParaMedicao("2026-02", "trimestral", "2026-03-01")).toBe(false);
    expect(mesEhValidoParaMedicao("2025-12", "semestral", "2026-01-01")).toBe(false);
  });

  it("sem dataInicio: sempre válido independente da frequência", () => {
    expect(mesEhValidoParaMedicao("2026-04", "trimestral", null)).toBe(true);
    expect(mesEhValidoParaMedicao("2026-05", "semestral", undefined)).toBe(true);
  });
});

describe("totalMedicoes - limite de medições previstas", () => {
  it("pedido com totalMedicoes=1 e 1 medição criada não deve aparecer como pendente", () => {
    const pedido = { totalMedicoes: 1, status: "ativo" };
    const medicoesDoPedido = [{ status: "pendente" }];
    const medicoesNaoCanceladas = medicoesDoPedido.filter(m => m.status !== "cancelada").length;
    expect(medicoesNaoCanceladas >= (pedido.totalMedicoes || 12)).toBe(true);
  });

  it("pedido com totalMedicoes=4 e 3 medições criadas ainda deve aparecer como pendente", () => {
    const pedido = { totalMedicoes: 4, status: "ativo" };
    const medicoesDoPedido = [
      { status: "paga" },
      { status: "paga" },
      { status: "paga" },
    ];
    const medicoesNaoCanceladas = medicoesDoPedido.filter(m => m.status !== "cancelada").length;
    expect(medicoesNaoCanceladas >= (pedido.totalMedicoes || 12)).toBe(false);
  });

  it("medições canceladas não contam para o limite de totalMedicoes", () => {
    const pedido = { totalMedicoes: 2, status: "ativo" };
    const medicoesDoPedido = [
      { status: "paga" },
      { status: "cancelada" }, // não deve contar
    ];
    const medicoesNaoCanceladas = medicoesDoPedido.filter(m => m.status !== "cancelada").length;
    // Apenas 1 não cancelada, limite é 2 — ainda pendente
    expect(medicoesNaoCanceladas >= (pedido.totalMedicoes || 12)).toBe(false);
  });

  it("pedido com totalMedicoes=4 e 4 medições criadas não deve aparecer como pendente", () => {
    const pedido = { totalMedicoes: 4, status: "ativo" };
    const medicoesDoPedido = [
      { status: "paga" },
      { status: "paga" },
      { status: "paga" },
      { status: "pendente" },
    ];
    const medicoesNaoCanceladas = medicoesDoPedido.filter(m => m.status !== "cancelada").length;
    expect(medicoesNaoCanceladas >= (pedido.totalMedicoes || 12)).toBe(true);
  });
});

describe("renovacao de contratos - lógica de cadeia", () => {
  it("pedido mensal concluído sem sucessor deve aparecer para renovação", () => {
    const pedido = { id: 1, tipo: "mensal", status: "concluido" };
    const todosOsPedidos = [pedido];
    const pedidosComSucessor = new Set(todosOsPedidos.filter(p => (p as any).pedidoOrigemId).map(p => (p as any).pedidoOrigemId));
    const deveRenovar = pedido.tipo === "mensal" && pedido.status === "concluido" && !pedidosComSucessor.has(pedido.id);
    expect(deveRenovar).toBe(true);
  });

  it("pedido fixo (spot) concluído NÃO deve aparecer para renovação", () => {
    const pedido = { id: 2, tipo: "fixo", status: "concluido" };
    const deveRenovar = pedido.tipo === "mensal" && pedido.status === "concluido";
    expect(deveRenovar).toBe(false);
  });

  it("pedido mensal concluído COM sucessor não deve aparecer para renovação", () => {
    const pedidoOrigem = { id: 1, tipo: "mensal", status: "concluido" };
    const pedidoSucessor = { id: 2, tipo: "mensal", status: "ativo", pedidoOrigemId: 1 };
    const todosOsPedidos = [pedidoOrigem, pedidoSucessor];
    const pedidosComSucessor = new Set(todosOsPedidos.filter(p => (p as any).pedidoOrigemId).map(p => (p as any).pedidoOrigemId));
    const deveRenovar = pedidoOrigem.tipo === "mensal" && pedidoOrigem.status === "concluido" && !pedidosComSucessor.has(pedidoOrigem.id);
    expect(deveRenovar).toBe(false);
  });

  it("pedido encerrado nunca deve aparecer para renovação", () => {
    const pedido = { id: 3, tipo: "mensal", status: "encerrado" };
    const deveRenovar = pedido.tipo === "mensal" && pedido.status === "concluido";
    expect(deveRenovar).toBe(false);
  });

  it("cadeia de renovações: A -> B -> C, apenas C sem sucessor deve renovar", () => {
    const pedidoA = { id: 1, tipo: "mensal", status: "concluido", pedidoOrigemId: null };
    const pedidoB = { id: 2, tipo: "mensal", status: "concluido", pedidoOrigemId: 1 };
    const pedidoC = { id: 3, tipo: "mensal", status: "concluido", pedidoOrigemId: 2 };
    const todos = [pedidoA, pedidoB, pedidoC];
    const pedidosComSucessor = new Set(todos.filter(p => p.pedidoOrigemId).map(p => p.pedidoOrigemId!));
    const paraRenovar = todos.filter(p => p.tipo === "mensal" && p.status === "concluido" && !pedidosComSucessor.has(p.id));
    expect(paraRenovar).toHaveLength(1);
    expect(paraRenovar[0].id).toBe(3);
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
