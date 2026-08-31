import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { MobileNav } from "./MobileNav";
import { CreateShelfModal } from "../shelves/CreateShelfModal";
import { useAuth } from "../../context/AuthContext";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [shelfModalOpen, setShelfModalOpen] = useState(false);
  const { user, openAuthModal } = useAuth();

  const handleCreateCollection = () => {
    if (!user) {
      openAuthModal();
      return;
    }
    setShelfModalOpen(true);
  };

  return (
    <div className="nv-shell nv-noise min-h-[100dvh] text-slate-100">
      <Sidebar onCreateShelf={handleCreateCollection} />
      <div className="lg:pl-[236px]">
        <Topbar />
        <main className="mx-auto max-w-[1440px] px-5 pt-7 sm:px-8 lg:px-10 lg:pt-9">
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
