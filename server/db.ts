import { eq, desc, and, like, sql, lt, isNull, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, fornecedores, pedidos, medicoes, InsertFornecedor, InsertPedido, InsertMedicao } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ===== FORNECEDORES =====
export async function getFornecedores(search?: string) {
  const db = await getDb();
  if (!db) return [];
  if (search) {
    return db.select().from(fornecedores)
      .where(like(fornecedores.nome, `%${search}%`))
      .orderBy(desc(fornecedores.createdAt));
  }
  return db.select().from(fornecedores).orderBy(desc(fornecedores.createdAt));
}

export async function getFornecedorById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(fornecedores).where(eq(fornecedores.id, id)).limit(1);
  return result[0];
}

export async function createFornecedor(data: InsertFornecedor) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(fornecedores).values(data);
}

export async function updateFornecedor(id: number, data: Partial<InsertFornecedor>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.update(fornecedores).set(data).where(eq(fornecedores.id, id));
}

export async function deleteFornecedor(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.delete(fornecedores).where(eq(fornecedores.id, id));
}

// Fornecedores com contagem de pedidos e total
export async function getFornecedoresComStats() {
  const db = await getDb();
  if (!db) return [];
  const allFornecedores = await db.select().from(fornecedores).orderBy(desc(fornecedores.createdAt));
  const allPedidos = await db.select().from(pedidos);
  return allFornecedores.map(f => {
    const pedidosFornecedor = allPedidos.filter(p => p.fornecedorId === f.id);
    const totalValor = pedidosFornecedor.reduce((sum, p) => sum + parseFloat(p.valor || "0"), 0);
    return { ...f, totalPedidos: pedidosFornecedor.length, totalValor };
  });
}

// ===== PEDIDOS =====
export async function getPedidos(fornecedorId?: number, tipo?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (fornecedorId) conditions.push(eq(pedidos.fornecedorId, fornecedorId));
  if (tipo) conditions.push(eq(pedidos.tipo, tipo as "fixo" | "mensal"));
  const result = conditions.length > 0
    ? await db.select().from(pedidos).where(and(...conditions)).orderBy(desc(pedidos.createdAt))
    : await db.select().from(pedidos).orderBy(desc(pedidos.createdAt));
  return result;
}

export async function getPedidoById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(pedidos).where(eq(pedidos.id, id)).limit(1);
  return result[0];
}

export async function createPedido(data: InsertPedido) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(pedidos).values(data);
}

export async function updatePedido(id: number, data: Partial<InsertPedido>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.update(pedidos).set(data).where(eq(pedidos.id, id));
}

export async function deletePedido(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.delete(pedidos).where(eq(pedidos.id, id));
}

// Pedidos com stats de medições (X/Y, pago, próxima medição)
export async function getPedidosComStats(fornecedorId?: number, tipo?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (fornecedorId) conditions.push(eq(pedidos.fornecedorId, fornecedorId));
  if (tipo) conditions.push(eq(pedidos.tipo, tipo as "fixo" | "mensal"));
  const allPedidos = conditions.length > 0
    ? await db.select().from(pedidos).where(and(...conditions)).orderBy(desc(pedidos.createdAt))
    : await db.select().from(pedidos).orderBy(desc(pedidos.createdAt));
  const allFornecedores = await db.select().from(fornecedores);
  const allMedicoes = await db.select().from(medicoes);

  return allPedidos.map(p => {
    const fornecedor = allFornecedores.find(f => f.id === p.fornecedorId);
    const medicoesPedido = allMedicoes.filter(m => m.pedidoId === p.id);
    const totalPago = medicoesPedido
      .filter(m => m.status === "paga")
      .reduce((sum, m) => sum + parseFloat(m.valor || "0"), 0);
    const totalMedicoesCriadas = medicoesPedido.length;
    const totalMedicoesPrevistas = p.totalMedicoes || 12;

    // Próxima medição: próximo mês sem medição criada
    const mesesComMedicao = new Set(medicoesPedido.map(m => m.mes));
    const hoje = new Date();
    let proximaMedicao: string | null = null;
    for (let i = 0; i < 24; i++) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
      const mesStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!mesesComMedicao.has(mesStr)) {
        proximaMedicao = mesStr;
        break;
      }
    }

    return {
      ...p,
      fornecedorNome: fornecedor?.nome || "—",
      totalMedicoesCriadas,
      totalMedicoesPrevistas,
      totalPago,
      proximaMedicao,
    };
  });
}

// ===== MEDICOES =====
export async function getMedicoes(mes?: string, pedidoId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (mes) conditions.push(eq(medicoes.mes, mes));
  if (pedidoId) conditions.push(eq(medicoes.pedidoId, pedidoId));
  if (conditions.length > 0) {
    return db.select().from(medicoes).where(and(...conditions)).orderBy(desc(medicoes.createdAt));
  }
  return db.select().from(medicoes).orderBy(desc(medicoes.createdAt));
}

export async function getMedicaoById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(medicoes).where(eq(medicoes.id, id)).limit(1);
  return result[0];
}

export async function createMedicao(data: InsertMedicao) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.insert(medicoes).values(data);
}

export async function updateMedicao(id: number, data: Partial<InsertMedicao>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.update(medicoes).set(data).where(eq(medicoes.id, id));
}

export async function deleteMedicao(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.delete(medicoes).where(eq(medicoes.id, id));
}

// Medições com dados enriquecidos (pedido, fornecedor)
export async function getMedicoesComDados(mes?: string) {
  const db = await getDb();
  if (!db) return [];
  const allMedicoes = mes
    ? await db.select().from(medicoes).where(eq(medicoes.mes, mes)).orderBy(desc(medicoes.createdAt))
    : await db.select().from(medicoes).orderBy(desc(medicoes.createdAt));
  const allPedidos = await db.select().from(pedidos);
  const allFornecedores = await db.select().from(fornecedores);

  return allMedicoes.map(m => {
    const pedido = allPedidos.find(p => p.id === m.pedidoId);
    const fornecedor = pedido ? allFornecedores.find(f => f.id === pedido.fornecedorId) : null;
    const medicoesDoPedido = allMedicoes.filter(x => x.pedidoId === m.pedidoId);
    const ordemMedicao = medicoesDoPedido
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .findIndex(x => x.id === m.id) + 1;
    return {
      ...m,
      pedidoNumero: pedido?.numero || "—",
      pedidoTipo: pedido?.tipo || "mensal",
      pedidoTotalMedicoes: pedido?.totalMedicoes || 12,
      fornecedorNome: fornecedor?.nome || "—",
      ordemMedicao,
    };
  });
}

// Controle de medições do mês: pedidos ativos e suas medições
export async function getControleMedicoesMes(mes: string) {
  const db = await getDb();
  if (!db) return [];
  const pedidosAtivos = await db.select().from(pedidos).where(eq(pedidos.status, "ativo"));
  const allFornecedores = await db.select().from(fornecedores);
  const medicoesMes = await db.select().from(medicoes).where(eq(medicoes.mes, mes));
  const todasMedicoes = await db.select().from(medicoes);

  return pedidosAtivos.map(p => {
    const fornecedor = allFornecedores.find(f => f.id === p.fornecedorId);
    const medicaoMes = medicoesMes.find(m => m.pedidoId === p.id);
    const medicoesDoPedido = todasMedicoes.filter(m => m.pedidoId === p.id);
    const ordemProxima = medicoesDoPedido.length + 1;
    const totalMed = p.totalMedicoes || 12;
    const valorTotal = parseFloat(p.valor || "0");
    const valorPorMedicao = totalMed > 0 ? valorTotal / totalMed : valorTotal;
    return {
      pedidoId: p.id,
      pedidoNumero: p.numero,
      fornecedorNome: fornecedor?.nome || "—",
      valorPrevisto: valorPorMedicao.toFixed(2),
      tipo: p.tipo,
      totalMedicoes: totalMed,
      medicaoMesId: medicaoMes?.id || null,
      medicaoMesNumero: medicaoMes?.numero || null,
      medicaoMesStatus: medicaoMes?.status || null,
      ordemProxima,
      criada: !!medicaoMes,
    };
  });
}

// ===== DASHBOARD (Visão Geral) =====
export async function getDashboardData() {
  const db = await getDb();
  if (!db) return null;

  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;

  const allPedidos = await db.select().from(pedidos);
  const allMedicoes = await db.select().from(medicoes);
  const allFornecedores = await db.select().from(fornecedores);

  const pedidosAtivos = allPedidos.filter(p => p.status === "ativo");
  const medicoesPagas = allMedicoes.filter(m => m.status === "paga");
  const totalMedicoesPagas = medicoesPagas.reduce((sum, m) => sum + parseFloat(m.valor || "0"), 0);

  // Medições a criar no mês atual (pedidos ativos sem medição no mês)
  const medicoesMesAtual = allMedicoes.filter(m => m.mes === mesAtual);
  const pedidosSemMedicaoMes = pedidosAtivos.filter(p =>
    !medicoesMesAtual.find(m => m.pedidoId === p.id)
  );

  // Medições em atraso (pendentes com vencimento passado)
  const medicoesEmAtraso = allMedicoes.filter(m => {
    if (m.status !== "pendente") return false;
    if (!m.dataVencimento) return false;
    return new Date(m.dataVencimento) < hoje;
  });
  const valorEmAtraso = medicoesEmAtraso.reduce((sum, m) => sum + parseFloat(m.valor || "0"), 0);

  // Pedidos em andamento com stats
  const pedidosComStats = await getPedidosComStats();
  const pedidosEmAndamento = pedidosComStats.filter(p => p.status === "ativo");

  // Medições a criar este mês (com dados do pedido e fornecedor)
  const medicoesCriarMes = pedidosSemMedicaoMes.map(p => {
    const fornecedor = allFornecedores.find(f => f.id === p.fornecedorId);
    const totalMed = p.totalMedicoes || 12;
    const valorTotal = parseFloat(p.valor || "0");
    const valorPorMedicao = totalMed > 0 ? valorTotal / totalMed : valorTotal;
    return {
      pedidoId: p.id,
      pedidoNumero: p.numero,
      fornecedorNome: fornecedor?.nome || "—",
      valorPrevisto: valorPorMedicao.toFixed(2),
      tipo: p.tipo,
    };
  });

  // Medições em atraso com dados
  const medicoesAtrasoComDados = medicoesEmAtraso.map(m => {
    const pedido = allPedidos.find(p => p.id === m.pedidoId);
    return {
      ...m,
      pedidoNumero: pedido?.numero || "—",
    };
  });

  return {
    pedidosAtivos: pedidosAtivos.length,
    totalMedicoesPagas,
    medicoesCriarMes: medicoesCriarMes.length,
    valorEmAtraso,
    medicoesCriarMesLista: medicoesCriarMes,
    medicoesAtraso: medicoesAtrasoComDados,
    pedidosEmAndamento,
  };
}

// ===== RELATORIOS =====
export async function getRelatoriosData() {
  const db = await getDb();
  if (!db) return null;
  const allPedidos = await db.select().from(pedidos);
  const allMedicoes = await db.select().from(medicoes);
  const allFornecedores = await db.select().from(fornecedores);
  return { pedidos: allPedidos, medicoes: allMedicoes, fornecedores: allFornecedores };
}
