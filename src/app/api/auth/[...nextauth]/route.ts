import { handlers } from "@/lib/auth";

// Prisma + OAuth account linking must run in Node, not Edge.
export const runtime = "nodejs";

export const { GET, POST } = handlers;
