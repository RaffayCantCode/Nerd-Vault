import React, { createContext, useContext, useEffect, useState } from "react";
import { api, UserProfile } from "../lib/api";

type AuthContextType = {
  user: UserProfile | null;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (data: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  updateUser: (updated: UserProfile) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("nv_user");
        return cached ? JSON.parse(cached) : null;
      } catch {
        return null;
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    api.getMe()
      .then((res) => {
        if (res?.user) {
          setUser(res.user);
          if (typeof window !== "undefined") {
            localStorage.setItem("nv_user_id", res.user.id);
            localStorage.setItem("nv_user", JSON.stringify(res.user));
          }
        } else {
          // If server confirmed not logged in, clear storage
          if (typeof window !== "undefined") {
            localStorage.removeItem("nv_user_id");
            localStorage.removeItem("nv_user");
          }
          setUser(null);
        }
      })
      .catch((err) => {
        console.warn("Auth initialization note:", err);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    const res = await api.login(credentials);
    setUser(res.user);
    if (res.user?.id && typeof window !== "undefined") {
      localStorage.setItem("nv_user_id", res.user.id);
      localStorage.setItem("nv_user", JSON.stringify(res.user));
    }
    setIsAuthModalOpen(false);
  };

  const register = async (data: { name: string; email: string; password: string }) => {
    const res = await api.register(data);
    setUser(res.user);
    if (res.user?.id && typeof window !== "undefined") {
      localStorage.setItem("nv_user_id", res.user.id);
      localStorage.setItem("nv_user", JSON.stringify(res.user));
    }
    setIsAuthModalOpen(false);
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {}
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("nv_user_id");
      localStorage.removeItem("nv_user");
    }
  };

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);
  const updateUser = (updated: UserProfile) => {
    setUser(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("nv_user", JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
