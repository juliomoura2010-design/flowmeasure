import { eq, desc, and, like } from "drizzle-orm";
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
  const result = await db.insert(fornecedores).values(data);
  return result;
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

// ===== PEDIDOS =====
export async function getPedidos(fornecedorId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (fornecedorId) {
    return db.select().from(pedidos).where(eq(pedidos.fornecedorId, fornecedorId)).orderBy(desc(pedidos.createdAt));
  }
  return db.select().from(pedidos).orderBy(desc(pedidos.createdAt));
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

// ===== DASHBOARD =====
export async function getDashboardData() {
  const db = await getDb();
  if (!db) return null;
  const allPedidos = await db.select().from(pedidos);
  const allMedicoes = await db.select().from(medicoes);
  const allFornecedores = await db.select().from(fornecedores);
  const recentMedicoes = await db.select().from(medicoes).orderBy(desc(medicoes.createdAt)).limit(10);
  return { pedidos: allPedidos, medicoes: allMedicoes, fornecedores: allFornecedores, recentMedicoes };
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
