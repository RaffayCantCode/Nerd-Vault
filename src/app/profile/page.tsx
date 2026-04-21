import Link from "next/link";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopBar } from "@/components/app-topbar";
import { ProfileWorkspace } from "@/components/profile-workspace";
import { VaultClientPrimer } from "@/components/vault-client-primer";
import { auth } from "@/lib/auth";
import { ensureCurrentUserRecord, getVaultProfilePayload, getViewerShellData } from "@/lib/vault-server";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  const userName = session?.user?.name || "Guest vault";
  const viewerId = session?.user?.id || "guest-vault";
  const viewerAvatar = session?.user?.image || undefined;
  const isDemo = !session?.user;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const requestedUser =
    typeof resolvedSearchParams?.user === "string" ? resolvedSearchParams.user : undefined;

  if (isDemo && !requestedUser) {
    return (
      <div className="page-shell">
        <div className="app-shell-layout">
          <AppSidebar active="profile" />
          <main className="workspace">
            <AppTopBar
              viewerId={viewerId}
              viewerName={userName}
              viewerAvatar={viewerAvatar}
            />
            <section className="feature-block glass">
              <p className="eyebrow">Profile</p>
              <h1 className="headline">Log in to view your own profile.</h1>
              <p className="copy">
                Guest mode stays browse-first. Sign in if you want your real profile,
                folders, saved library, and social activity to show here.
              </p>
              <div className="button-row" style={{ marginTop: 18 }}>
                <Link href="/sign-in" className="button button-primary">
                  Log in
                </Link>
                <Link href="/browse" className="button button-secondary">
                  Back to browse
                </Link>
              </div>
            </section>
          </main>
        </div>
      </div>
    );
  }

  const currentUser = session?.user?.id ? await ensureCurrentUserRecord() : null;
  const shellData = currentUser?.id ? await getViewerShellData(currentUser.id) : null;
  const initialPayload = currentUser?.id
    ? await getVaultProfilePayload(currentUser.id, requestedUser ?? currentUser.id)
    : undefined;

  return (
    <div className="page-shell">
      <div className="app-shell-layout">
        <AppSidebar active="profile" initialFolders={shellData?.folders ?? []} />
        <main className="workspace">
          <VaultClientPrimer
            library={initialPayload && initialPayload.viewingOwnProfile ? { watched: initialPayload.watched, wishlist: initialPayload.wishlist, folders: initialPayload.folders } : null}
            profile={initialPayload ?? null}
            profileUserId={requestedUser}
          />
          <AppTopBar
            viewerId={viewerId}
            viewerName={userName}
            viewerAvatar={viewerAvatar}
            initialProfile={shellData?.viewerProfile ?? null}
            initialFriends={shellData?.friends ?? []}
          />
          <ProfileWorkspace
            userName={userName}
            viewerId={viewerId}
            viewerAvatar={viewerAvatar}
            isDemo={isDemo}
            initialPayload={initialPayload}
          />
        </main>
      </div>
    </div>
  );
}
