import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 1) {
    return NextResponse.json({ ok: true, results: [] });
  }

  const users = await prisma.user.findMany({
    where: {
      id: { not: session.user.id },
      name: { contains: q, mode: "insensitive" },
    },
    select: { id: true, name: true, image: true },
    take: 20,
  });

  return NextResponse.json({
    ok: true,
    results: users.map((u) => ({
      id: u.id,
      name: u.name ?? "Unknown",
      handle: u.name ?? "",
      avatarUrl: u.image ?? undefined,
    })),
  });
}
