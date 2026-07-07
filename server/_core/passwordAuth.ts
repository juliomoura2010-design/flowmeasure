// Gate de acesso simples por senha compartilhada.
// Independente do fluxo OAuth do Manus (server/_core/oauth.ts + sdk.ts),
// para permitir proteger o app mesmo sem OAuth configurado.
import { timingSafeEqual } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import type { Request } from "express";
import { parse as parseCookieHeader } from "cookie";
import { ACCESS_COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ENV } from "./env";

const ACCESS_CLAIM = "flowmeasure_access";

function getSecretKey() {
  // Reaproveita o mesmo segredo usado para assinar a sessão OAuth (JWT_SECRET).
  const secret = ENV.cookieSecret || "insecure-dev-secret-change-me";
  return new TextEncoder().encode(secret);
}

/**
 * Comparação em tempo constante para evitar timing attacks na checagem de senha.
 */
export function passwordMatches(candidate: string): boolean {
  const expected = ENV.accessPassword;
  if (!expected) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    // Ainda compara contra algo do mesmo tamanho para não vazar timing pelo length.
    timingSafeEqual(Buffer.from(expected), Buffer.from(expected));
    return false;
  }
  return timingSafeEqual(a, b);
}

export async function createAccessToken(): Promise<string> {
  const issuedAt = Date.now();
  const expirationSeconds = Math.floor((issuedAt + ONE_YEAR_MS) / 1000);
  return new SignJWT({ [ACCESS_CLAIM]: true })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(getSecretKey());
}

export async function verifyAccessToken(
  cookieValue: string | undefined | null
): Promise<boolean> {
  if (!cookieValue) return false;
  try {
    const { payload } = await jwtVerify(cookieValue, getSecretKey(), {
      algorithms: ["HS256"],
    });
    return payload[ACCESS_CLAIM] === true;
  } catch {
    return false;
  }
}

export function getAccessCookieFromRequest(req: Request): string | undefined {
  if (!req.headers.cookie) return undefined;
  const parsed = parseCookieHeader(req.headers.cookie);
  return parsed[ACCESS_COOKIE_NAME];
}

export function isPasswordGateConfigured(): boolean {
  return Boolean(ENV.accessPassword);
}
