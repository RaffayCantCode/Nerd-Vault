import React, { createContext, useContext, useEffect, useState } from "react";
import { api, UnifiedMedia, VaultStats } from "../lib/api";

type VaultContextType = {
  vaultItems: UnifiedMedia[];
  stats: VaultStats | null;
  isLoading: boolean;
  trackMedia: (item: UnifiedMedia, status: string, rating?: number, notes?: string) => Promise<void>;
  removeMedia: (mediaId: string) => Promise<void>;
  isInVault: (mediaId: string) => boolean;
  getItemStatus: (mediaId: string) => string | undefined;
  feedback: string | null;
  notify: (message: string) => void;
  refreshVault: () => Promise<void>;
};

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [vaultItems, setVaultItems] = useState<UnifiedMedia[]>([]);
  const [stats, setStats] = useState<VaultStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  const notify = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => {
      setFeedback((current) => (current === msg ? null : current));
    }, 2800);
  };

  const refreshVault = async () => {
    try {
      const res = await api.getVault();
      if (res?.items) setVaultItems(res.items);
      if (res?.stats) setStats(res.stats);
    } catch (err) {
      console.warn("Could not load initial vault:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshVault();
  }, []);

  const trackMedia = async (item: UnifiedMedia, status: string, rating?: number, notes?: string) => {
    // Optimistic UI update
    setVaultItems((prev) => {
      const existing = prev.find((i) => i.id === item.id || i.slug === item.slug);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, status: status as any, userRating: rating ?? i.userRating, notes: notes ?? i.notes } : i));
      }
      return [{ ...item, status: status as any, userRating: rating, notes }, ...prev];
    });

    notify(`${item.title} ${status === "Wishlist" ? "added to Wishlist" : status === "Favorite" ? "added to Favorites" : `marked as ${status}`}`);

    try {
      const res = await api.trackMedia({
        mediaId: item.id,
        status,
        rating,
        notes,
        mediaData: item,
      });
      if (res?.items) setVaultItems(res.items);
      if (res?.stats) setStats(res.stats);
    } catch (err) {
      console.error("Failed to persist media tracking:", err);
    }
  };

  const removeMedia = async (mediaId: string) => {
    setVaultItems((prev) => prev.filter((i) => i.id !== mediaId));
    notify("Removed from your vault");
    try {
      await api.removeMedia(mediaId);
      refreshVault();
    } catch (err) {
      console.error("Failed to remove media:", err);
    }
  };

  const isInVault = (mediaId: string) => {
    return vaultItems.some((i) => i.id === mediaId || i.sourceId === mediaId || i.slug === mediaId);
  };

  const getItemStatus = (mediaId: string) => {
    const found = vaultItems.find((i) => i.id === mediaId || i.sourceId === mediaId || i.slug === mediaId);
    return found?.status;
  };

  return (
    <VaultContext.Provider
      value={{
        vaultItems,
        stats,
        isLoading,
        trackMedia,
        removeMedia,
        isInVault,
        getItemStatus,
        feedback,
        notify,
        refreshVault,
      }}
    >
      {children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error("useVault must be used within a VaultProvider");
  }
  return context;
}
