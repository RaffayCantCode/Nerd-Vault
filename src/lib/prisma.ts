import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pool?: Pool;
};

function getPool() {
  if (!globalForPrisma.pool) {
    const raw = process.env.DATABASE_URL ?? "";
    if (!raw) {
      throw new Error("DATABASE_URL is required but was not provided. Check your .env.local file.");
    }
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      throw new Error("DATABASE_URL is invalid. Check your .env.local file.");
    }
    const hadSsl = url.searchParams.has("sslmode");
    url.searchParams.delete("sslmode");

    globalForPrisma.pool = new Pool({
      connectionString: url.toString(),
      max: process.env.NODE_ENV === "production" ? 3 : 8,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 15_000,
      allowExitOnIdle: true,
      ssl: hadSsl ? { rejectUnauthorized: false } : undefined,
    });
  }
  return globalForPrisma.pool;
}

function createPrismaClient() {
  const adapter = new PrismaPg(getPool());
  return new PrismaClient({ adapter, log: ["warn", "error"] });
}

function getPrismaClient() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_, prop) {
    return getPrismaClient()[prop as keyof PrismaClient];
  },
});
