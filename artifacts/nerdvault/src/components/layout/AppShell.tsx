import React, { useState } from "react";
import { useLocation } from "wouter";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { MobileNav } from "./MobileNav";
import { CreateShelfModal } from "../shelves/CreateShelfModal";
import { useAuth } from "../../context/AuthContext";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [shelfModalOpen, setShelfModalOpen] = useState(false);
  const { user, openAuthModal } = useAuth();

  const handleCreateCollection = () => {
    if (!user) {
      openAuthModal();
      return;
    }
    setShelfModalOpen(true);
  };

  const isFullWidthHome = location === "/";

  return (
    <div className={`nv-shell nv-noise min-h-[100dvh] text-slate-100 overflow-x-hidden ${isFullWidthHome ? "!bg-transparent !bg-none" : ""}`}>
      <Sidebar onCreateShelf={handleCreateCollection} />
      <div className="lg:pl-[236px] flex flex-col min-h-screen relative z-10">
        <Topbar />
        <main className={`flex-1 w-full ${isFullWidthHome ? "" : "mx-auto max-w-[1560px] px-5 pt-7 sm:px-8 lg:px-10 lg:pt-9"}`}>
          {children}
        </main>
      </div>
      <MobileNav />
      {user && (
        <CreateShelfModal isOpen={shelfModalOpen} onClose={() => setShelfModalOpen(false)} />
      )}
    </div>
  );
}
