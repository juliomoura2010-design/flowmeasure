import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

// Mock the db module
vi.mock("./db", () => ({
  getFornecedores: vi.fn().mockResolvedValue([
    { id: 1, nome: "Fornecedor Teste", cnpj: "00.000.000/0001-00", status: "ativo", email: null, telefone: null, endereco: null, cidade: null, estado: null, cep: null, contato: null, createdAt: new Date(), updatedAt: new Date() }
  ]),
  getFornecedorById: vi.fn().mockResolvedValue({ id: 1, nome: "Fornecedor Teste", status: "ativo" }),
  createFornecedor: vi.fn().mockResolvedValue({ insertId: 1 }),
  updateFornecedor: vi.fn().mockResolvedValue({ affectedRows: 1 }),
  deleteFornecedor: vi.fn().mockResolvedValue({ affectedRows: 1 }),
  getPedidos: vi.fn().mockResolvedValue([
    { id: 1, numero: "PED-001", fornecedorId: 1, valor: "1000.00", tipoGasto: "opex", frequencia: "mensal", status: "ativo", descricao: null, dataInicio: null, dataFim: null, observacoes: null, createdAt: new Date(), updatedAt: new Date() }
  ]),
  getPedidoById: vi.fn().mockResolvedValue({ id: 1, numero: "PED-001" }),
  createPedido: vi.fn().mockResolvedValue({ insertId: 1 }),
  updatePedido: vi.fn().mockResolvedValue({ affectedRows: 1 }),
  deletePedido: vi.fn().mockResolvedValue({ affectedRows: 1 }),
  getMedicoes: vi.fn().mockResolvedValue([
    { id: 1, numero: "MED-001", pedidoId: 1, mes: "2025-03", valor: "1000.00", status: "pendente", dataEmissao: null, dataPagamento: null, numeroPagamento: null, observacoes: null, createdAt: new Date(), updatedAt: new Date() }
  ]),
  getMedicaoById: vi.fn().mockResolvedValue({ id: 1, numero: "MED-001" }),
  createMedicao: vi.fn().mockResolvedValue({ insertId: 1 }),
  updateMedicao: vi.fn().mockResolvedValue({ affectedRows: 1 }),
  deleteMedicao: vi.fn().mockResolvedValue({ affectedRows: 1 }),
  getDashboardData: vi.fn().mockResolvedValue({
    pedidos: [],
    medicoes: [],
    fornecedores: [],
    recentMedicoes: [],
  }),
  getRelatoriosData: vi.fn().mockResolvedValue({
    pedidos: [],
    medicoes: [],
    fornecedores: [],
  }),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("FlowMeasure - Fornecedores", () => {
  it("deve listar fornecedores", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.fornecedores.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(0);
  });

  it("deve criar um fornecedor", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.fornecedores.create({
      nome: "Novo Fornecedor",
      status: "ativo",
    });
    expect(result).toBeDefined();
  });

  it("deve atualizar um fornecedor", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.fornecedores.update({
      id: 1,
      data: { nome: "Fornecedor Atualizado" },
    });
    expect(result).toBeDefined();
  });

  it("deve deletar um fornecedor", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.fornecedores.delete({ id: 1 });
    expect(result).toBeDefined();
  });
});

describe("FlowMeasure - Pedidos", () => {
  it("deve listar pedidos", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.pedidos.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("deve criar um pedido", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.pedidos.create({
      numero: "PED-TEST-001",
      fornecedorId: 1,
      valor: "5000.00",
      tipoGasto: "opex",
      frequencia: "mensal",
      status: "ativo",
    });
    expect(result).toBeDefined();
  });

  it("deve deletar um pedido", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.pedidos.delete({ id: 1 });
    expect(result).toBeDefined();
  });
});

describe("FlowMeasure - Medições", () => {
  it("deve listar medições", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.medicoes.list({ mes: "2025-03" });
    expect(Array.isArray(result)).toBe(true);
  });

  it("deve criar uma medição", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.medicoes.create({
      numero: "MED-TEST-001",
      pedidoId: 1,
      mes: "2025-03",
      valor: "1000.00",
      status: "pendente",
    });
    expect(result).toBeDefined();
  });

  it("deve registrar pagamento de medição", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.medicoes.pagar({
      id: 1,
      numeroPagamento: "NF-12345",
      dataPagamento: "2025-03-15",
      observacoes: "Pagamento realizado",
    });
    expect(result).toBeDefined();
  });

  it("deve deletar uma medição", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.medicoes.delete({ id: 1 });
    expect(result).toBeDefined();
  });
});

describe("FlowMeasure - Dashboard", () => {
  it("deve retornar dados do dashboard", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.dashboard.getData();
    expect(result).toBeDefined();
    if (result) {
      expect(result).toHaveProperty("pedidos");
      expect(result).toHaveProperty("medicoes");
      expect(result).toHaveProperty("fornecedores");
    }
  });
});

describe("auth.logout", () => {
  it("deve limpar o cookie de sessão e retornar sucesso", async () => {
    const clearedCookies: { name: string; options: Record<string, unknown> }[] = [];
    const ctx: TrpcContext = {
      user: {
        id: 1, openId: "test", email: "test@test.com", name: "Test", loginMethod: "manus",
        role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
      },
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {
        clearCookie: (name: string, options: Record<string, unknown>) => {
          clearedCookies.push({ name, options });
        },
      } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
  });
});
