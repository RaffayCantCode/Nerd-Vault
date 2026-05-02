import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type PersistedBookProgress = {
  bookId: number;
  title: string;
  author?: string;
  coverUrl?: string;
  currentPage: number;
  totalPages: number;
  percent: number;
  updatedAt: string;
};

const globalForBookProgress = globalThis as typeof globalThis & {
  __nerdVaultBookProgressInit?: Promise<void>;
};

function ensureBookProgressTable() {
  if (!globalForBookProgress.__nerdVaultBookProgressInit) {
    globalForBookProgress.__nerdVaultBookProgressInit = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "BookProgress" (
          "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
          "bookId" INTEGER NOT NULL,
          "title" TEXT NOT NULL,
          "author" TEXT,
          "coverUrl" TEXT,
          "currentPage" INTEGER NOT NULL DEFAULT 1,
          "totalPages" INTEGER NOT NULL DEFAULT 1,
          "percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY ("userId", "bookId")
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "BookProgress_userId_updatedAt_idx"
        ON "BookProgress" ("userId", "updatedAt" DESC);
      `);
    })();
  }

  return globalForBookProgress.__nerdVaultBookProgressInit;
}

function mapProgressRow(row: Record<string, unknown>): PersistedBookProgress {
  return {
    bookId: Number(row.bookId),
    title: String(row.title),
    author: row.author ? String(row.author) : undefined,
    coverUrl: row.coverUrl ? String(row.coverUrl) : undefined,
    currentPage: Number(row.currentPage),
    totalPages: Number(row.totalPages),
    percent: Number(row.percent),
    updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
  };
}

export async function getSessionUserId() {
  const session = await auth();
  return session?.user?.id || null;
}

export async function getBookProgress(userId: string, bookId: number) {
  await ensureBookProgressTable();

  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    SELECT "bookId", "title", "author", "coverUrl", "currentPage", "totalPages", "percent", "updatedAt"
    FROM "BookProgress"
    WHERE "userId" = ${userId} AND "bookId" = ${bookId}
    LIMIT 1
  `;

  return rows[0] ? mapProgressRow(rows[0]) : null;
}

export async function getContinueReading(userId: string) {
  await ensureBookProgressTable();

  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    SELECT "bookId", "title", "author", "coverUrl", "currentPage", "totalPages", "percent", "updatedAt"
    FROM "BookProgress"
    WHERE "userId" = ${userId}
    ORDER BY "updatedAt" DESC
    LIMIT 10
  `;

  return rows.map(mapProgressRow);
}

export async function saveBookProgressForUser(
  userId: string,
  input: {
    bookId: number;
    title: string;
    author?: string;
    coverUrl?: string;
    currentPage: number;
    totalPages: number;
    percent: number;
  },
) {
  await ensureBookProgressTable();

  await prisma.$executeRaw`
    INSERT INTO "BookProgress" (
      "userId",
      "bookId",
      "title",
      "author",
      "coverUrl",
      "currentPage",
      "totalPages",
      "percent",
      "updatedAt"
    )
    VALUES (
      ${userId},
      ${input.bookId},
      ${input.title},
      ${input.author ?? null},
      ${input.coverUrl ?? null},
      ${Math.max(1, input.currentPage)},
      ${Math.max(1, input.totalPages)},
      ${Math.max(0, Math.min(1, input.percent))},
      CURRENT_TIMESTAMP
    )
    ON CONFLICT ("userId", "bookId")
    DO UPDATE SET
      "title" = EXCLUDED."title",
      "author" = EXCLUDED."author",
      "coverUrl" = EXCLUDED."coverUrl",
      "currentPage" = EXCLUDED."currentPage",
      "totalPages" = EXCLUDED."totalPages",
      "percent" = EXCLUDED."percent",
      "updatedAt" = CURRENT_TIMESTAMP
  `;
}

export async function deleteBookProgressForUser(userId: string, bookId: number) {
  await ensureBookProgressTable();

  await prisma.$executeRaw`
    DELETE FROM "BookProgress"
    WHERE "userId" = ${userId} AND "bookId" = ${bookId}
  `;
}
