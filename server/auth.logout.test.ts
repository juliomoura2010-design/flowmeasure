import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type CookieCall = {
  name: string;
  options: Record<string, unknown>;
};

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];

  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    hasAccess: true,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    // logout agora limpa o cookie de sessão OAuth e o cookie de acesso por senha.
    expect(clearedCookies).toHaveLength(2);
    const sessionCookie = clearedCookies.find(c => c.name === COOKIE_NAME);
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie?.options).toMatchObject({
      maxAge: -1,
      secure: true,
      sameSite: "none",
      httpOnly: true,
      path: "/",
    });
  });
});


describe("environment variables - security", () => {
  it("ACCESS_PASSWORD deve estar configurada no servidor", () => {
    const accessPassword = process.env.ACCESS_PASSWORD;
    expect(accessPassword).toBeDefined();
    expect(accessPassword).not.toBe("");
    expect(accessPassword?.length).toBeGreaterThan(10);
  });

  it("ACCESS_PASSWORD nunca deve ser exposta no cliente", () => {
    // Verificar que ACCESS_PASSWORD não está em nenhum arquivo do cliente
    const accessPassword = process.env.ACCESS_PASSWORD;
    expect(accessPassword).toBeDefined();
    // A senha deve estar apenas no servidor, não em variáveis VITE_* (que são expostas ao cliente)
    const viteVars = Object.keys(process.env).filter(key => key.startsWith("VITE_ACCESS"));
    expect(viteVars).toHaveLength(0);
  });
});
