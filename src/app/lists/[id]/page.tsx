import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { ListDetailWorkspace } from "@/components/list-detail-workspace";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { queryOne } from "@/lib/d1";
import { getListById } from "@/lib/vault-server";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const session = await auth().catch(() => null);
  const { id } = await params;
  try {
    const list = await getListById(id, session?.user?.id ?? "");
    if (!list) return { title: "List not found" };
    return {
      title: list.name,
      description: list.description || `A curated list of ${list.items.length} titles on NerdVault.`,
    };
  } catch {
    return { title: "List" };
  }
}

async function getListOwner(listId: string): Promise<string> {
  const row = await queryOne<{ user_id: string }>(`SELECT user_id FROM folders WHERE id = ? LIMIT 1`, [listId]);
  return row?.user_id ?? "";
}

export default async function ListDetailPage({ params }: Props) {
  const session = await auth().catch(() => null);
  const viewerId = session?.user?.id ?? "";
  const { id } = await params;

  const [list, ownerId] = await Promise.all([
    getListById(id, viewerId),
    getListOwner(id),
  ]);

  if (!list) notFound();

  const isOwner = Boolean(viewerId && viewerId === ownerId);

  return (
    <div className="app-shell">
      <AppSidebar
        active="vault"
        userName={session?.user?.name || null}
        isSignedIn={Boolean(session?.user?.id)}
      />
      <div className="content-area">
        <ListDetailWorkspace initialList={list} viewerId={viewerId} isOwner={isOwner} />
      </div>
      <MobileBottomNav />
    </div>
  );
}
