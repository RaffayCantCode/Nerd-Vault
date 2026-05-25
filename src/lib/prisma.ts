import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pool?: Pool;
};

function getPool() {
  if (!globalForPrisma.pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL is not configured. Copy .env.example to .env.local in the project root, add your Supabase URL, then restart npm run dev.",
      );
    }

    const requiresSsl =
      /sslmode=require/i.test(connectionString) ||
      /neon\.tech|supabase\.co|render\.com|railway\.app/i.test(connectionString);

    globalForPrisma.pool = new Pool({
      connectionString,
      max: process.env.NODE_ENV === "production" ? 1 : 8,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 15_000,
      ssl: requiresSsl ? { rejectUnauthorized: false } : undefined,
    });
  }
  return globalForPrisma.pool;
}

function createPrismaClient() {
  const adapter = new PrismaPg(getPool());
  return new PrismaClient({ adapter, log: ["warn", "error"] });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
