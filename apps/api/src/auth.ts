import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { MiddlewareHandler } from "hono";
import { config } from "./config.js";
import { prisma } from "./db.js";

/**
 * Authentication.
 *
 * Password hashing uses scrypt from node:crypto and tokens are HS256 JWTs
 * signed by hand — both are small, standard, and avoid adding native
 * dependencies for what amounts to sixty lines of well-understood code.
 *
 * The same token authenticates the web app, the mobile app and (indirectly)
 * the Telegram bot, which is what makes one account work across all three.
 */

const SCRYPT_KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return `scrypt:${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, expected] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !expected) return false;
  const derived = scryptSync(password, salt, SCRYPT_KEYLEN);
  const expectedBuffer = Buffer.from(expected, "hex");
  if (expectedBuffer.length !== derived.length) return false;
  return timingSafeEqual(derived, expectedBuffer);
}

interface TokenPayload {
  sub: string;
  iat: number;
  exp: number;
}

const base64url = (input: Buffer | string): string =>
  Buffer.from(input).toString("base64url");

export function signToken(userId: string, ttlSeconds = 60 * 60 * 24 * 30): string {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64url(
    JSON.stringify({ sub: userId, iat: now, exp: now + ttlSeconds } satisfies TokenPayload),
  );
  const signature = createHmac("sha256", config.jwtSecret)
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${signature}`;
}

export function verifyToken(token: string): TokenPayload | null {
  const [header, payload, signature] = token.split(".");
  if (!header || !payload || !signature) return null;

  const expected = createHmac("sha256", config.jwtSecret)
    .update(`${header}.${payload}`)
    .digest("base64url");

  // Constant-time comparison — a fast reject leaks signature information.
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString()) as TokenPayload;
    if (decoded.exp * 1000 < Date.now()) return null;
    return decoded;
  } catch {
    return null;
  }
}

export interface AuthedUser {
  id: string;
  displayName: string;
  email: string | null;
  dialectPreference: string;
  dailyTimeBudget: number;
  timezone: string;
}

declare module "hono" {
  interface ContextVariableMap {
    user: AuthedUser;
  }
}

/** Require a valid token; 401 otherwise. */
export const requireAuth: MiddlewareHandler = async (c, next) => {
  const header = c.req.header("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const payload = token ? verifyToken(token) : null;

  if (!payload) {
    return c.json({ error: "unauthorized", message: "Sign in to continue." }, 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      displayName: true,
      email: true,
      dialectPreference: true,
      dailyTimeBudget: true,
      timezone: true,
    },
  });

  if (!user) {
    return c.json({ error: "unauthorized", message: "Account not found." }, 401);
  }

  c.set("user", user);

  // Cheap liveness tracking; failure here must never break the request.
  void prisma.user
    .update({ where: { id: user.id }, data: { lastActiveAt: new Date() } })
    .catch(() => undefined);

  await next();
};

/** Six-character link code used to attach a Telegram chat to a web account. */
export function generateLinkCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no look-alikes
  return Array.from(randomBytes(6))
    .map((byte) => alphabet[byte % alphabet.length])
    .join("");
}
