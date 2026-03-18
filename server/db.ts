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
    const totalConsumido = medicoesPedido
      .filter(m => m.status !== "cancelada")
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
      totalConsumido,
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
  const result = await db.insert(medicoes).values(data);
  // Após criar medição, verificar se o pedido deve ser concluído automaticamente
  await verificarConclusaoPedido(data.pedidoId);
  return result;
}

export async function updateMedicao(id: number, data: Partial<InsertMedicao>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.update(medicoes).set(data).where(eq(medicoes.id, id));
  // Após atualizar medição (ex: pagamento), verificar se o pedido deve ser concluído
  const medicao = await db.select().from(medicoes).where(eq(medicoes.id, id)).limit(1);
  if (medicao[0]?.pedidoId) {
    await verificarConclusaoPedido(medicao[0].pedidoId);
  }
  return result;
}

/**
 * Verifica se o pedido atingiu 100% do valor consumido e atualiza o status para "concluido".
 * Um pedido é considerado concluído quando a soma de todas as medições não canceladas
 * é igual ou maior que o valor total do pedido.
 */
export async function verificarConclusaoPedido(pedidoId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    const pedidoResult = await db.select().from(pedidos).where(eq(pedidos.id, pedidoId)).limit(1);
    const pedido = pedidoResult[0];
    if (!pedido || pedido.status !== "ativo") return; // só verifica pedidos ativos

    const medicoesDoPedido = await db.select().from(medicoes)
      .where(and(eq(medicoes.pedidoId, pedidoId), ne(medicoes.status, "cancelada")));

    const valorTotal = parseFloat(pedido.valor || "0");
    const valorConsumido = medicoesDoPedido.reduce((sum, m) => sum + parseFloat(m.valor || "0"), 0);

    if (valorTotal > 0 && valorConsumido >= valorTotal) {
      await db.update(pedidos)
        .set({ status: "concluido" })
        .where(eq(pedidos.id, pedidoId));
      console.log(`[Automação] Pedido #${pedido.numero} concluído automaticamente (consumido: R$${valorConsumido.toFixed(2)} / total: R$${valorTotal.toFixed(2)})`);
    }
  } catch (error) {
    console.error("[Automação] Erro ao verificar conclusão do pedido:", error);
  }
}

export async function deleteMedicao(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Guardar pedidoId antes de deletar para verificar reversão de status
  const medicao = await db.select().from(medicoes).where(eq(medicoes.id, id)).limit(1);
  const pedidoId = medicao[0]?.pedidoId;
  const result = await db.delete(medicoes).where(eq(medicoes.id, id));
  // Após deletar medição, verificar se o pedido deve ser reativado ou concluído
  if (pedidoId) {
    await verificarStatusPedidoAposDelecao(pedidoId);
  }
  return result;
}

/**
 * Após deletar uma medição, verifica se o pedido concluído deve voltar para ativo
 * (caso o consumo caia abaixo de 100%).
 */
export async function verificarStatusPedidoAposDelecao(pedidoId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    const pedidoResult = await db.select().from(pedidos).where(eq(pedidos.id, pedidoId)).limit(1);
    const pedido = pedidoResult[0];
    if (!pedido) return;

    const medicoesDoPedido = await db.select().from(medicoes)
      .where(and(eq(medicoes.pedidoId, pedidoId), ne(medicoes.status, "cancelada")));

    const valorTotal = parseFloat(pedido.valor || "0");
    const valorConsumido = medicoesDoPedido.reduce((sum, m) => sum + parseFloat(m.valor || "0"), 0);

    if (pedido.status === "concluido" && valorConsumido < valorTotal) {
      // Reativar pedido pois o consumo caiu abaixo de 100%
      await db.update(pedidos)
        .set({ status: "ativo" })
        .where(eq(pedidos.id, pedidoId));
      console.log(`[Automação] Pedido #${pedido.numero} reativado após deleção de medição (consumido: R$${valorConsumido.toFixed(2)} / total: R$${valorTotal.toFixed(2)})`);
    } else if (pedido.status === "ativo" && valorTotal > 0 && valorConsumido >= valorTotal) {
      // Concluir pedido (caso raro, mas garante consistência)
      await verificarConclusaoPedido(pedidoId);
    }
  } catch (error) {
    console.error("[Automação] Erro ao verificar status após deleção:", error);
  }
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
      responsavel: pedido?.responsavel || null,
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

  // Filtrar apenas pedidos que já iniciaram no mês selecionado
  // mes formato: YYYY-MM, dataInicio formato: Date (YYYY-MM-DD)
  const pedidosDoMes = pedidosAtivos.filter(p => {
    if (!p.dataInicio) return true; // sem data de início, sempre inclui
    const inicioMes = p.dataInicio.toISOString().substring(0, 7); // YYYY-MM
    return inicioMes <= mes; // pedido iniciou antes ou no mês selecionado
  });

  return pedidosDoMes.map(p => {
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
      responsavel: p.responsavel || null,
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
  // Apenas pedidos que já iniciaram no mês atual
  const medicoesMesAtual = allMedicoes.filter(m => m.mes === mesAtual);
  const pedidosSemMedicaoMes = pedidosAtivos.filter(p => {
    // Verificar se o pedido já iniciou no mês atual
    if (p.dataInicio) {
      const inicioMes = new Date(p.dataInicio).toISOString().substring(0, 7); // YYYY-MM
      if (inicioMes > mesAtual) return false; // pedido ainda não iniciou
    }
    return !medicoesMesAtual.find(m => m.pedidoId === p.id);
  });

  // Nova regra de atraso:
  // 1. Pedidos ativos que não têm medição criada em meses ANTERIORES ao mês atual
  // 2. Pedidos ativos sem medição criada no mês atual E hoje já passou do dia 10
  const diaHoje = hoje.getDate();
  const pedidosEmAtraso: Array<{
    pedidoId: number;
    pedidoNumero: string;
    fornecedorNome: string;
    mes: string; // mês em atraso
    valorPrevisto: string;
    responsavel: string | null;
    tipoAtraso: "mes_anterior" | "mes_atual_apos_dia10";
  }> = [];

  for (const p of pedidosAtivos) {
    // Determinar mês de início do pedido
    const inicioMes = p.dataInicio
      ? new Date(p.dataInicio).toISOString().substring(0, 7)
      : null;

    const fornecedor = allFornecedores.find(f => f.id === p.fornecedorId);
    const totalMed = p.totalMedicoes || 12;
    const valorTotal = parseFloat(p.valor || "0");
    const valorPorMedicao = totalMed > 0 ? valorTotal / totalMed : valorTotal;
    const medicoesDoPedido = allMedicoes.filter(m => m.pedidoId === p.id);
    const mesesComMedicao = new Set(medicoesDoPedido.map(m => m.mes));

    // Calcular meses desde o início até o mês anterior ao atual
    const anoAtual = hoje.getFullYear();
    const mesNumAtual = hoje.getMonth(); // 0-indexed

    // Definir mês de início da verificação
    let anoVerif: number;
    let mesVerif: number; // 0-indexed
    if (inicioMes) {
      const [anoI, mesI] = inicioMes.split("-").map(Number);
      anoVerif = anoI;
      mesVerif = mesI - 1; // converter para 0-indexed
    } else {
      // Sem data de início: verificar apenas os últimos 12 meses
      const limite = new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1);
      anoVerif = limite.getFullYear();
      mesVerif = limite.getMonth();
    }

    // Verificar meses anteriores ao atual
    let a = anoVerif;
    let m = mesVerif;
    while (a < anoAtual || (a === anoAtual && m < mesNumAtual)) {
      const mesStr = `${a}-${String(m + 1).padStart(2, "0")}`;
      if (!mesesComMedicao.has(mesStr)) {
        pedidosEmAtraso.push({
          pedidoId: p.id,
          pedidoNumero: p.numero,
          fornecedorNome: fornecedor?.nome || "—",
          mes: mesStr,
          valorPrevisto: valorPorMedicao.toFixed(2),
          responsavel: p.responsavel || null,
          tipoAtraso: "mes_anterior",
        });
      }
      m++;
      if (m > 11) { m = 0; a++; }
    }

    // Verificar mês atual: em atraso se hoje > dia 10 e não tem medição
    if (diaHoje > 10 && !mesesComMedicao.has(mesAtual)) {
      // Verificar se o pedido já iniciou no mês atual
      if (!inicioMes || inicioMes <= mesAtual) {
        pedidosEmAtraso.push({
          pedidoId: p.id,
          pedidoNumero: p.numero,
          fornecedorNome: fornecedor?.nome || "—",
          mes: mesAtual,
          valorPrevisto: valorPorMedicao.toFixed(2),
          responsavel: p.responsavel || null,
          tipoAtraso: "mes_atual_apos_dia10",
        });
      }
    }
  }

  const valorEmAtraso = pedidosEmAtraso.reduce((sum, item) => sum + parseFloat(item.valorPrevisto || "0"), 0);

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
      responsavel: p.responsavel || null,
    };
  });

  // pedidosEmAtraso já contém todos os dados necessários (substituí medicoesAtrasoComDados)

  // KPIs por responsável (para filtrar os cards quando filtro ativo)
  const pedidosAtivosPorResponsavel = pedidosAtivos.reduce((acc, p) => {
    const r = p.responsavel || "Sem responsável";
    acc[r] = (acc[r] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const medicoesPagasPorResponsavel = medicoesPagas.reduce((acc, m) => {
    const pedido = allPedidos.find(p => p.id === m.pedidoId);
    const r = pedido?.responsavel || "Sem responsável";
    acc[r] = (acc[r] || 0) + parseFloat(m.valor || "0");
    return acc;
  }, {} as Record<string, number>);

  const valorEmAtrasoPorResponsavel = pedidosEmAtraso.reduce((acc: Record<string, number>, item) => {
    const r = item.responsavel || "Sem responsável";
    acc[r] = (acc[r] || 0) + parseFloat(item.valorPrevisto || "0");
    return acc;
  }, {} as Record<string, number>);

  return {
    pedidosAtivos: pedidosAtivos.length,
    totalMedicoesPagas,
    medicoesCriarMes: medicoesCriarMes.length,
    valorEmAtraso,
    medicoesCriarMesLista: medicoesCriarMes,
    medicoesAtraso: pedidosEmAtraso,
    pedidosEmAndamento,
    // dados por responsável para filtro nos KPIs
    pedidosAtivosPorResponsavel,
    medicoesPagasPorResponsavel,
    valorEmAtrasoPorResponsavel,
  };
}

// ===== DASHBOARD GERENCIAL (visão por responsável) =====
export async function getDashboardGerencial(mes: string) {
  const db = await getDb();
  if (!db) return [];

  const allPedidos = await db.select().from(pedidos);
  const allMedicoes = await db.select().from(medicoes);
  const allFornecedores = await db.select().from(fornecedores);

  // Pedidos ativos que já iniciaram no mês selecionado
  const pedidosAtivos = allPedidos.filter(p => {
    if (p.status !== "ativo") return false;
    if (p.dataInicio) {
      const inicioMes = new Date(p.dataInicio).toISOString().substring(0, 7);
      if (inicioMes > mes) return false;
    }
    return true;
  });

  const medicoesMes = allMedicoes.filter(m => m.mes === mes);

  // Agrupar por responsável
  const mapaResponsaveis = new Map<string, {
    responsavel: string;
    totalPedidos: number;
    valorTotal: number;
    medicoesCriadas: number;
    medicoesPendentes: number;
    pedidosPendentes: Array<{ pedidoId: number; pedidoNumero: string; fornecedorNome: string; valorPrevisto: string }>;
  }>();

  for (const p of pedidosAtivos) {
    const responsavel = p.responsavel || "Sem responsável";
    const fornecedor = allFornecedores.find(f => f.id === p.fornecedorId);
    const temMedicaoMes = medicoesMes.some(m => m.pedidoId === p.id);
    const valorTotal = parseFloat(p.valor || "0");
    const totalMed = p.totalMedicoes || 12;
    const valorPorMedicao = totalMed > 0 ? valorTotal / totalMed : valorTotal;

    if (!mapaResponsaveis.has(responsavel)) {
      mapaResponsaveis.set(responsavel, {
        responsavel,
        totalPedidos: 0,
        valorTotal: 0,
        medicoesCriadas: 0,
        medicoesPendentes: 0,
        pedidosPendentes: [],
      });
    }

    const entry = mapaResponsaveis.get(responsavel)!;
    entry.totalPedidos += 1;
    entry.valorTotal += valorTotal;

    if (temMedicaoMes) {
      entry.medicoesCriadas += 1;
    } else {
      entry.medicoesPendentes += 1;
      entry.pedidosPendentes.push({
        pedidoId: p.id,
        pedidoNumero: p.numero,
        fornecedorNome: fornecedor?.nome || "—",
        valorPrevisto: valorPorMedicao.toFixed(2),
      });
    }
  }

  return Array.from(mapaResponsaveis.values()).sort((a, b) =>
    b.medicoesPendentes - a.medicoesPendentes
  );
}

// ===== BUSCA GLOBAL =====
export async function buscaGlobal(query: string) {
  const db = await getDb();
  if (!db || !query || query.trim().length < 2) return { pedidos: [], medicoes: [], fornecedores: [] };

  const q = `%${query.trim()}%`;

  const [allPedidos, allMedicoes, allFornecedores] = await Promise.all([
    db.select().from(pedidos).where(
      sql`(${pedidos.numero} LIKE ${q} OR ${pedidos.descricao} LIKE ${q} OR ${pedidos.responsavel} LIKE ${q} OR ${pedidos.elementoPep} LIKE ${q})`
    ).limit(10),
    db.select().from(medicoes).where(
      sql`(${medicoes.numero} LIKE ${q} OR ${medicoes.numeroPagamento} LIKE ${q})`
    ).limit(10),
    db.select().from(fornecedores).where(
      sql`(${fornecedores.nome} LIKE ${q} OR ${fornecedores.cnpj} LIKE ${q} OR ${fornecedores.email} LIKE ${q})`
    ).limit(10),
  ]);

  // Enriquecer pedidos com nome do fornecedor
  const allFornecedoresList = await db.select().from(fornecedores);
  const pedidosEnriquecidos = allPedidos.map(p => ({
    ...p,
    fornecedorNome: allFornecedoresList.find(f => f.id === p.fornecedorId)?.nome || "—",
  }));

  // Enriquecer medições com número do pedido
  const allPedidosList = await db.select().from(pedidos);
  const medicoesEnriquecidas = allMedicoes.map(m => ({
    ...m,
    pedidoNumero: allPedidosList.find(p => p.id === m.pedidoId)?.numero || "—",
  }));

  return {
    pedidos: pedidosEnriquecidos,
    medicoes: medicoesEnriquecidas,
    fornecedores: allFornecedores,
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
