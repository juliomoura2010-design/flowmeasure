import { TRPCError, initTRPC } from "@trpc/server";
import superjson from "superjson";
import { UNAUTHED_ERR_MSG } from "@shared/const";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

// Exige hasAccess (usuário OAuth autenticado OU senha de acesso válida — ver
// server/_core/passwordAuth.ts). Gestão de papéis (admin) fica para quando a
// tela de usuários for implementada; por ora adminProcedure usa a mesma checagem.
const requireAccess = t.middleware(({ ctx, next }) => {
  if (!ctx.hasAccess) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({ ctx });
});

export const protectedProcedure = t.procedure.use(requireAccess);
export const adminProcedure = t.procedure.use(requireAccess);
