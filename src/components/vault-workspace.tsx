"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { HomeWorkspace } from "@/components/home-workspace";
import dynamic from "next/dynamic";

const ProfileWorkspace = dynamic(() => import("@/components/profile-workspace").then(m => m.ProfileWorkspace), { ssr: false });
import { HomeFeed } from "@/lib/home-feed";
import { VaultProfilePayload } from "@/lib/vault-types";

type VaultTab = "for-you" | "your-media";

export function VaultWorkspace({
  viewerName,
  viewerId,
  viewerAvatar,
  isDemo,
  feed,
  initialProfilePayload,
  initialTab = "for-you",
}: {
  viewerName: string;
  viewerId: string;
  viewerAvatar?: string;
  isDemo: boolean;
  feed: HomeFeed;
  initialProfilePayload?: VaultProfilePayload;
  initialTab?: VaultTab;
}) {
  const [tab, setTab] = useState<VaultTab>(initialTab);
  const [animating, setAnimating] = useState(false);
  const forYouRef = useRef<HTMLDivElement | null>(null);
  const yourMediaRef = useRef<HTMLDivElement | null>(null);
  const scrollMemory = useRef<Record<VaultTab, number>>({ "for-you": 0, "your-media": 0 });
  const activeProfile = initialProfilePayload?.viewedProfile ?? initialProfilePayload?.viewerProfile;

  useEffect(() => {
    const current = tab === "for-you" ? forYouRef.current : yourMediaRef.current;
    if (current) {
      current.scrollTop = scrollMemory.current[tab] || 0;
    }
  }, [tab]);

  function switchTab(next: VaultTab) {
    if (next === tab) return;
    const current = tab === "for-you" ? forYouRef.current : yourMediaRef.current;
    if (current) {
      scrollMemory.current[tab] = current.scrollTop;
    }
    setAnimating(true);
    setTab(next);
    window.setTimeout(() => setAnimating(false), 260);
  }

  const avatarFallback = useMemo(
    () => (activeProfile?.name || viewerName || "V").charAt(0).toUpperCase(),
    [activeProfile?.name, viewerName],
  );

  return (
    <section className="vault-unified-shell">
      <section className="glass vault-profile-bar">
        <div className="vault-profile-bar-main">
          {activeProfile?.avatarUrl ? (
            <img src={activeProfile.avatarUrl} alt={activeProfile.name} className="vault-profile-avatar" />
          ) : (
            <span className="vault-profile-avatar vault-profile-avatar-fallback">{avatarFallback}</span>
          )}
          <div className="vault-profile-copy">
            <p className="eyebrow">Your vault</p>
            <h1 className="headline">{activeProfile?.name || viewerName}</h1>
            <p className="copy">{activeProfile?.handle || "@vault"}</p>
          </div>
        </div>
        <div className="vault-profile-actions">
          <button type="button" className="button button-secondary" onClick={() => switchTab("your-media")}>Edit profile</button>
          <button type="button" className="button button-secondary" onClick={() => switchTab("your-media")}>Settings</button>
        </div>
      </section>

      <div className="vault-tab-row glass">
        <button type="button" className={`vault-tab ${tab === "for-you" ? "is-active" : ""}`} onClick={() => switchTab("for-you")}>
          For You
        </button>
        <button type="button" className={`vault-tab ${tab === "your-media" ? "is-active" : ""}`} onClick={() => switchTab("your-media")}>
          Your Media
        </button>
      </div>

      <div className="vault-shortcuts-container">
        {tab === "for-you" ? (
          <div className="profile-section-nav glass vault-shortcuts">
            <button type="button" className="profile-section-nav-link" onClick={() => document.getElementById("home-upcoming")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Coming soon</button>
            <button type="button" className="profile-section-nav-link" onClick={() => document.getElementById("home-tv-shows")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Series</button>
            <button type="button" className="profile-section-nav-link" onClick={() => document.getElementById("home-movie")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Movies</button>
            <button type="button" className="profile-section-nav-link" onClick={() => document.getElementById("home-anime")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Anime</button>
            <button type="button" className="profile-section-nav-link" onClick={() => document.getElementById("home-game")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Games</button>
          </div>
        ) : (
          <div className="profile-section-nav glass vault-shortcuts">
            <button type="button" className="profile-section-nav-link" onClick={() => document.getElementById("profile-watched")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Watched</button>
            <button type="button" className="profile-section-nav-link" onClick={() => document.getElementById("profile-wishlist")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Wishlist</button>
            <button type="button" className="profile-section-nav-link" onClick={() => document.getElementById("profile-folders")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Folders</button>
            <button type="button" className="profile-section-nav-link" onClick={() => document.getElementById("profile-friends")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Network</button>
          </div>
        )}
      </div>

      <div className="vault-tab-panels">
        <div ref={forYouRef} className={`vault-tab-panel ${tab === "for-you" ? "is-active" : ""} ${animating ? "is-animating" : ""}`}>
          <HomeWorkspace viewerName={viewerName} feed={feed} />
        </div>
        <div ref={yourMediaRef} className={`vault-tab-panel ${tab === "your-media" ? "is-active" : ""} ${animating ? "is-animating" : ""}`}>
          <ProfileWorkspace userName={viewerName} viewerId={viewerId} viewerAvatar={viewerAvatar} isDemo={isDemo} initialPayload={initialProfilePayload} />
        </div>
      </div>
    </section>
  );
}
