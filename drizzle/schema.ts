import { decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar, date } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Fornecedores
export const fornecedores = mysqlTable("fornecedores", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  cnpj: varchar("cnpj", { length: 20 }),
  email: varchar("email", { length: 320 }),
  telefone: varchar("telefone", { length: 30 }),
  endereco: text("endereco"),
  cidade: varchar("cidade", { length: 100 }),
  estado: varchar("estado", { length: 2 }),
  cep: varchar("cep", { length: 10 }),
  contato: varchar("contato", { length: 255 }),
  categoria: varchar("categoria", { length: 100 }), // ex: Tecnologia, Logística, Construção Civil
  status: mysqlEnum("status", ["ativo", "inativo", "suspenso"]).default("ativo").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Fornecedor = typeof fornecedores.$inferSelect;
export type InsertFornecedor = typeof fornecedores.$inferInsert;

// Pedidos
export const pedidos = mysqlTable("pedidos", {
  id: int("id").autoincrement().primaryKey(),
  numero: varchar("numero", { length: 50 }).notNull(),
  fornecedorId: int("fornecedorId").notNull(),
  descricao: text("descricao"),
  valor: decimal("valor", { precision: 15, scale: 2 }).notNull(),
  dataInicio: date("dataInicio"),
  dataFim: date("dataFim"),
  // tipo: "fixo" = número fixo de medições (totalMedicoes), "mensal" = recorrente mensal
  tipo: mysqlEnum("tipo", ["fixo", "mensal"]).default("mensal").notNull(),
  totalMedicoes: int("totalMedicoes").default(12), // total de medições previstas
  elementoPep: varchar("elementoPep", { length: 100 }), // obrigatório quando tipoGasto = capex
  tipoGasto: mysqlEnum("tipoGasto", ["capex", "opex"]).default("opex").notNull(),
  responsavel: varchar("responsavel", { length: 255 }), // nome do responsável por criar as medições
  frequencia: mysqlEnum("frequencia", ["mensal", "trimestral", "semestral", "anual"]).default("mensal").notNull(),
  status: mysqlEnum("status", ["ativo", "concluido", "cancelado"]).default("ativo").notNull(),
  observacoes: text("observacoes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Pedido = typeof pedidos.$inferSelect;
export type InsertPedido = typeof pedidos.$inferInsert;

// Medições
export const medicoes = mysqlTable("medicoes", {
  id: int("id").autoincrement().primaryKey(),
  numero: varchar("numero", { length: 50 }).notNull(),
  pedidoId: int("pedidoId").notNull(),
  mes: varchar("mes", { length: 7 }).notNull(), // formato: YYYY-MM
  valor: decimal("valor", { precision: 15, scale: 2 }).notNull(),
  dataEmissao: date("dataEmissao"),
  dataVencimento: date("dataVencimento"), // data de vencimento para controle de atraso
  dataPagamento: date("dataPagamento"),
  status: mysqlEnum("status", ["pendente", "paga", "cancelada"]).default("pendente").notNull(),
  numeroPagamento: varchar("numeroPagamento", { length: 100 }),
  observacoes: text("observacoes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Medicao = typeof medicoes.$inferSelect;
export type InsertMedicao = typeof medicoes.$inferInsert;
