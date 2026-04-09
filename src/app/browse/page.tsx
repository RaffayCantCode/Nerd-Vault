import { unstable_noStore as noStore } from "next/cache";
import { auth } from "@/lib/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopBar } from "@/components/app-topbar";
import { BrowseWorkspace } from "@/components/browse-workspace";
import { browseMixedCatalog } from "@/lib/mixed-catalog";
import { getVaultProfilePayload } from "@/lib/vault-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BrowsePage() {
  noStore();
  const discoverySeed = Date.now() + Math.floor(Math.random() * 10_000);
  const [session, initialBrowse] = await Promise.all([
    auth(),
    browseMixedCatalog({
      page: 1,
      query: "",
      genre: "",
      sort: "discovery",
      seed: discoverySeed,
    }).catch(() => ({
      page: 1,
      totalPages: 30,
      totalResults: 0,
      items: [],
    })),
  ]);
  const viewerName = session?.user?.name || "Guest vault";
  const viewerId = session?.user?.id || "guest-vault";
  const viewerAvatar = session?.user?.image || undefined;
  const initialSocial = session?.user?.id
    ? await getVaultProfilePayload(session.user.id, session.user.id).catch(() => null)
    : null;

  return (
    <div className="page-shell">
      <div className="app-shell-layout">
        <AppSidebar active="browse" />
        <main className="workspace">
          <AppTopBar
            viewerId={viewerId}
            viewerName={viewerName}
            viewerAvatar={viewerAvatar}
            initialProfile={initialSocial?.viewerProfile ?? null}
            initialFriends={initialSocial?.friends ?? []}
          />
          <BrowseWorkspace
            catalog={initialBrowse.items}
            discoverySeed={discoverySeed}
            initialTotalPages={initialBrowse.totalPages}
          />
        </main>
      </div>
    </div>
  );
}
