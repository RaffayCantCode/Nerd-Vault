import { NextResponse } from "next/server";
import { getBrowseBootstrapCatalog, getBrowseDiscoverySeed } from "@/lib/browse-bootstrap";

const BOOTSTRAP_CACHE_TTL_MS = 1000 * 60 * 10;

let bootstrapCache:
  | {
      expiresAt: number;
      items: Awaited<ReturnType<typeof getBrowseBootstrapCatalog>>;
    }
  | undefined;

export async function GET() {
  try {
    if (bootstrapCache && bootstrapCache.expiresAt > Date.now()) {
      return NextResponse.json({
        ok: true,
        items: bootstrapCache.items.catalog,
        surfacing: bootstrapCache.items.surfacing,
      });
    }

    const items = await getBrowseBootstrapCatalog(getBrowseDiscoverySeed());
    bootstrapCache = {
      expiresAt: Date.now() + BOOTSTRAP_CACHE_TTL_MS,
      items,
    };

    return NextResponse.json({
      ok: true,
      items: items.catalog,
      surfacing: items.surfacing,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unknown bootstrap failure",
      },
      { status: 500 },
    );
  }
}
