import { PrismaClient } from "@prisma/client";

/**
 * The Prisma client, as a single shared instance.
 *
 * Held on globalThis so `tsx watch` reloading a module does not open a new
 * connection pool on every save and eventually exhaust SQLite's handles.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["error"] : ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export type Db = typeof prisma;
