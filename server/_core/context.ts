import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import {
  getAccessCookieFromRequest,
  isPasswordGateConfigured,
  verifyAccessToken,
} from "./passwordAuth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  // true se autenticado via OAuth (user != null) OU via senha de acesso.
  hasAccess: boolean;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  // Gate por senha: se não houver usuário OAuth, checa o cookie de acesso por senha.
  let hasAccess = user !== null;
  if (!hasAccess) {
    const accessCookie = getAccessCookieFromRequest(opts.req);
    hasAccess = await verifyAccessToken(accessCookie);
  }

  // Se a senha de acesso não foi configurada no ambiente, não bloqueia (evita
  // trancar o próprio dono para fora caso ACCESS_PASSWORD não esteja definida).
  if (!isPasswordGateConfigured() && !user) {
    hasAccess = true;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    hasAccess,
  };
}
