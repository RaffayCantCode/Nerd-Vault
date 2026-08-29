"use client";

import dynamic from "next/dynamic";
import { HomeFeed } from "@/lib/home-feed";
import { VaultProfilePayload } from "@/lib/vault-types";
import { VaultSubTab } from "@/components/profile-workspace";

const ProfileWorkspace = dynamic(
  () => import("@/components/profile-workspace").then((m) => m.ProfileWorkspace),
  { ssr: false },
);

type VaultTab = "for-you" | "your-media";

export function VaultWorkspace({
  viewerName,
  viewerId,
  viewerAvatar,
  isDemo,
  feed,
  initialProfilePayload,
  initialTab = "your-media",
}: {
  viewerName: string;
  viewerId: string;
  viewerAvatar?: string;
  isDemo: boolean;
  feed: HomeFeed;
  initialProfilePayload?: VaultProfilePayload;
  initialTab?: VaultTab;
}) {
  const mappedSubTab: VaultSubTab = initialTab === "for-you" ? "for-you" : "overview";

  return (
    <ProfileWorkspace
      userName={viewerName}
      viewerId={viewerId}
      viewerAvatar={viewerAvatar}
      isDemo={isDemo}
      initialPayload={initialProfilePayload}
      initialTab={mappedSubTab}
      feed={feed}
    />
  );
}
