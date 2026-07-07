import { describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock do módulo db (não usado por estes testes, mas routers.ts importa de lá)
vi.mock("./db", () => ({
  getFornecedores: vi.fn().mockResolvedValue([]),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
}));

// ENV é lido uma vez na importação do módulo (server/_core/env.ts), então
// mockamos diretamente em vez de mexer em process.env em runtime.
vi.mock("./_core/env", () => ({
  ENV: {
    appId: "",
    cookieSecret: "test-secret",
    databaseUrl: "",
    oAuthServerUrl: "",
    ownerOpenId: "",
    isProduction: false,
    forgeApiUrl: "",
    forgeApiKey: "",
    accessPassword: "senha-super-secreta",
  },
}));

function buildCtx(overrides: Partial<TrpcContext>): TrpcContext {
  return {
    user: null,
    hasAccess: false,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
    ...overrides,
  };
}

describe("Gate de acesso por senha", () => {
  it("bloqueia endpoints protegidos quando hasAccess é false", async () => {
    const ctx = buildCtx({ hasAccess: false });
    const caller = appRouter.createCaller(ctx);

    await expect(caller.fornecedores.list()).rejects.toThrow(TRPCError);
  });

  it("permite endpoints protegidos quando hasAccess é true", async () => {
    const ctx = buildCtx({ hasAccess: true });
    const caller = appRouter.createCaller(ctx);

    await expect(caller.fornecedores.list()).resolves.toEqual([]);
  });

  it("checkAccess reflete hasAccess do contexto", async () => {
    const ctxSemAcesso = buildCtx({ hasAccess: false });
    const callerSemAcesso = appRouter.createCaller(ctxSemAcesso);
    await expect(callerSemAcesso.auth.checkAccess()).resolves.toMatchObject({
      hasAccess: false,
      passwordGateConfigured: true,
    });

    const ctxComAcesso = buildCtx({ hasAccess: true });
    const callerComAcesso = appRouter.createCaller(ctxComAcesso);
    await expect(callerComAcesso.auth.checkAccess()).resolves.toMatchObject({
      hasAccess: true,
    });
  });

  it("loginWithPassword rejeita senha incorreta", async () => {
    const ctx = buildCtx({ hasAccess: false });
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.loginWithPassword({ password: "senha-errada" })
    ).rejects.toThrow(TRPCError);
    expect(ctx.res.cookie).not.toHaveBeenCalled();
  });

  it("loginWithPassword aceita senha correta e seta o cookie de acesso", async () => {
    const ctx = buildCtx({ hasAccess: false });
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.loginWithPassword({
      password: "senha-super-secreta",
    });

    expect(result).toEqual({ success: true });
    expect(ctx.res.cookie).toHaveBeenCalledTimes(1);
    const [cookieName] = (ctx.res.cookie as any).mock.calls[0];
    expect(cookieName).toBe("app_access_token");
  });

  it("logout limpa tanto o cookie de sessão quanto o de acesso por senha", async () => {
    const ctx = buildCtx({ hasAccess: true });
    const caller = appRouter.createCaller(ctx);

    await caller.auth.logout();

    expect(ctx.res.clearCookie).toHaveBeenCalledTimes(2);
    const clearedNames = (ctx.res.clearCookie as any).mock.calls.map(
      (c: unknown[]) => c[0]
    );
    expect(clearedNames).toContain("app_session_id");
    expect(clearedNames).toContain("app_access_token");
  });
});
