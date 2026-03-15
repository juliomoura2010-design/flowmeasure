import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  getFornecedores, getFornecedorById, createFornecedor, updateFornecedor, deleteFornecedor,
  getFornecedoresComStats,
  getPedidos, getPedidoById, createPedido, updatePedido, deletePedido, getPedidosComStats,
  getMedicoes, getMedicaoById, createMedicao, updateMedicao, deleteMedicao,
  getMedicoesComDados, getControleMedicoesMes,
  getDashboardData, getRelatoriosData,
} from "./db";

const fornecedorSchema = z.object({
  nome: z.string().min(1),
  cnpj: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  telefone: z.string().optional().nullable(),
  endereco: z.string().optional().nullable(),
  cidade: z.string().optional().nullable(),
  estado: z.string().max(2).optional().nullable(),
  cep: z.string().optional().nullable(),
  contato: z.string().optional().nullable(),
  categoria: z.string().optional().nullable(),
  status: z.enum(["ativo", "inativo", "suspenso"]).default("ativo"),
});

const pedidoSchema = z.object({
  numero: z.string().min(1),
  fornecedorId: z.number().int().positive(),
  descricao: z.string().optional().nullable(),
  valor: z.string().min(1),
  dataInicio: z.string().optional().nullable(),
  dataFim: z.string().optional().nullable(),
  tipo: z.enum(["fixo", "mensal"]).default("mensal"),
  totalMedicoes: z.number().int().min(1).default(12),
  tipoGasto: z.enum(["capex", "opex"]).default("opex"),
  frequencia: z.enum(["mensal", "trimestral", "semestral", "anual"]).default("mensal"),
  status: z.enum(["ativo", "concluido", "cancelado"]).default("ativo"),
  observacoes: z.string().optional().nullable(),
});

const medicaoSchema = z.object({
  numero: z.string().min(1),
  pedidoId: z.number().int().positive(),
  mes: z.string().regex(/^\d{4}-\d{2}$/),
  valor: z.string().min(1),
  dataEmissao: z.string().optional().nullable(),
  dataVencimento: z.string().optional().nullable(),
  dataPagamento: z.string().optional().nullable(),
  status: z.enum(["pendente", "paga", "cancelada"]).default("pendente"),
  numeroPagamento: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  fornecedores: router({
    list: protectedProcedure
      .input(z.object({ search: z.string().optional() }).optional())
      .query(({ input }) => getFornecedores(input?.search)),

    listComStats: protectedProcedure
      .query(() => getFornecedoresComStats()),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getFornecedorById(input.id)),

    create: protectedProcedure
      .input(fornecedorSchema)
      .mutation(({ input }) => createFornecedor(input)),

    update: protectedProcedure
      .input(z.object({ id: z.number(), data: fornecedorSchema.partial() }))
      .mutation(({ input }) => updateFornecedor(input.id, input.data)),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteFornecedor(input.id)),
  }),

  pedidos: router({
    list: protectedProcedure
      .input(z.object({ fornecedorId: z.number().optional(), tipo: z.string().optional() }).optional())
      .query(({ input }) => getPedidos(input?.fornecedorId, input?.tipo)),

    listComStats: protectedProcedure
      .input(z.object({ fornecedorId: z.number().optional(), tipo: z.string().optional() }).optional())
      .query(({ input }) => getPedidosComStats(input?.fornecedorId, input?.tipo)),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getPedidoById(input.id)),

    create: protectedProcedure
      .input(pedidoSchema)
      .mutation(({ input }) => {
        const data = {
          ...input,
          dataInicio: input.dataInicio ? new Date(input.dataInicio) : null,
          dataFim: input.dataFim ? new Date(input.dataFim) : null,
        };
        return createPedido(data as any);
      }),

    update: protectedProcedure
      .input(z.object({ id: z.number(), data: pedidoSchema.partial() }))
      .mutation(({ input }) => {
        const data: any = { ...input.data };
        if (data.dataInicio) data.dataInicio = new Date(data.dataInicio);
        if (data.dataFim) data.dataFim = new Date(data.dataFim);
        return updatePedido(input.id, data);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deletePedido(input.id)),
  }),

  medicoes: router({
    list: protectedProcedure
      .input(z.object({ mes: z.string().optional(), pedidoId: z.number().optional() }).optional())
      .query(({ input }) => getMedicoes(input?.mes, input?.pedidoId)),

    listComDados: protectedProcedure
      .input(z.object({ mes: z.string().optional() }).optional())
      .query(({ input }) => getMedicoesComDados(input?.mes)),

    controleMes: protectedProcedure
      .input(z.object({ mes: z.string().regex(/^\d{4}-\d{2}$/) }))
      .query(({ input }) => getControleMedicoesMes(input.mes)),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getMedicaoById(input.id)),

    create: protectedProcedure
      .input(medicaoSchema)
      .mutation(({ input }) => {
        const data = {
          ...input,
          dataEmissao: input.dataEmissao ? new Date(input.dataEmissao) : null,
          dataVencimento: input.dataVencimento ? new Date(input.dataVencimento) : null,
          dataPagamento: input.dataPagamento ? new Date(input.dataPagamento) : null,
        };
        return createMedicao(data as any);
      }),

    update: protectedProcedure
      .input(z.object({ id: z.number(), data: medicaoSchema.partial() }))
      .mutation(({ input }) => {
        const data: any = { ...input.data };
        if (data.dataEmissao) data.dataEmissao = new Date(data.dataEmissao);
        if (data.dataVencimento) data.dataVencimento = new Date(data.dataVencimento);
        if (data.dataPagamento) data.dataPagamento = new Date(data.dataPagamento);
        return updateMedicao(input.id, data);
      }),

    pagar: protectedProcedure
      .input(z.object({
        id: z.number(),
        numeroPagamento: z.string().min(1),
        dataPagamento: z.string().optional(),
        observacoes: z.string().optional(),
      }))
      .mutation(({ input }) => {
        return updateMedicao(input.id, {
          status: "paga",
          numeroPagamento: input.numeroPagamento,
          dataPagamento: input.dataPagamento ? new Date(input.dataPagamento) : new Date(),
          observacoes: input.observacoes,
        } as any);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteMedicao(input.id)),
  }),

  dashboard: router({
    getData: protectedProcedure.query(() => getDashboardData()),
  }),

  relatorios: router({
    getData: protectedProcedure.query(() => getRelatoriosData()),
  }),
});

export type AppRouter = typeof appRouter;
