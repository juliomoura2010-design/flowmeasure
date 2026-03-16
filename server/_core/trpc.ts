import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

// Acesso público total: protectedProcedure e adminProcedure são alias de publicProcedure
// para permitir acesso sem login. Quando a gestão de usuários for implementada, restaurar a proteção.
export const protectedProcedure = t.procedure;
export const adminProcedure = t.procedure;
