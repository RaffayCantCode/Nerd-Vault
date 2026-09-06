import React, { createContext, useContext, useEffect, useState } from "react";
import { api, UnifiedMedia, VaultStats, Shelf } from "../lib/api";

type VaultContextType = {
  vaultItems: UnifiedMedia[];
  stats: VaultStats | null;
  shelves: Shelf[];
  isLoading: boolean;
  loading: boolean;
  trackMedia: (item: UnifiedMedia, status: string, rating?: number, notes?: string) => Promise<void>;
  removeMedia: (mediaId: string) => Promise<void>;
  isInVault: (mediaId: string) => boolean;
  getItemStatus: (mediaId: string) => string | undefined;
  feedback: string | null;
  notify: (message: string) => void;
  refreshVault: () => Promise<void>;
  refreshShelves: () => Promise<void>;
};

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export function VaultProvider({ children }: { children: React.ReactNode }) {
  // Hydrate instantly from cache so zero flicker occurs
  const [vaultItems, setVaultItems] = useState<UnifiedMedia[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("nv_cached_vault_items");
        return cached ? JSON.parse(cached) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [stats, setStats] = useState<VaultStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  const notify = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => {
      setFeedback((current) => (current === msg ? null : current));
    }, 2800);
  };

  const refreshShelves = async () => {
    try {
      const res = await api.getShelves();
      if (res?.shelves && Array.isArray(res.shelves)) {
        setShelves(res.shelves);
      }
    } catch (err) {
      console.warn("Could not load shelves:", err);
    }
  };

  const refreshVault = async () => {
    try {
      const res = await api.getVault();
      if (res?.items && Array.isArray(res.items)) {
        setVaultItems(res.items);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("nv_cached_vault_items", JSON.stringify(res.items));
          } catch {}
        }
      }
      if (res?.stats) setStats(res.stats);
    } catch (err) {
      console.warn("Could not load initial vault:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshVault();
    refreshShelves();
  }, []);

  const trackMedia = async (item: UnifiedMedia, status: string, rating?: number, notes?: string) => {
    const updatedItem = { ...item, status: status as any, userRating: rating ?? (status === "Favorite" ? 5 : item.userRating), notes: notes ?? item.notes };

    // Optimistic UI update with persistence
    setVaultItems((prev) => {
      const existing = prev.find((i) => i.id === item.id || i.slug === item.slug);
      let updated: UnifiedMedia[];
      if (existing) {
        updated = prev.map((i) => (i.id === item.id ? { ...i, ...updatedItem } : i));
      } else {
        updated = [updatedItem, ...prev];
      }
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("nv_cached_vault_items", JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });

    notify(`${item.title} ${status === "Wishlist" ? "added to Wishlist" : status === "Favorite" ? "added to Favorites" : `marked as ${status}`}`);

    try {
      const res = await api.trackMedia({
        mediaId: item.id,
        status,
        rating: rating ?? (status === "Favorite" ? 5 : undefined),
        notes: notes ?? (status === "Favorite" ? "#favorite" : undefined),
        media: item,
      });
      if (res?.items && Array.isArray(res.items) && res.items.length > 0) {
        setVaultItems(res.items);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("nv_cached_vault_items", JSON.stringify(res.items));
          } catch {}
        }
      }
      if (res?.stats) setStats(res.stats);
    } catch (err) {
      console.error("Failed to persist media tracking:", err);
    }
  };

  const removeMedia = async (mediaId: string) => {
    setVaultItems((prev) => {
      const updated = prev.filter((i) => i.id !== mediaId);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("nv_cached_vault_items", JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });
    notify("Removed from your vault");
    try {
      await api.removeMedia(mediaId);
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
        shelves,
        isLoading,
        loading: isLoading,
        trackMedia,
        removeMedia,
        isInVault,
        getItemStatus,
        feedback,
        notify,
        refreshVault,
        refreshShelves,
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
