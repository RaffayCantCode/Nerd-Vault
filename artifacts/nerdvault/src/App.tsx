import React, { useEffect, type ReactNode } from "react";
import { Route, Switch, useLocation, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";

import { ErrorBoundary } from "./components/error-boundary";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";

import { AuthProvider } from "./context/AuthContext";
import { VaultProvider, useVault } from "./context/VaultContext";

import { AppShell } from "./components/layout/AppShell";
import { AuthModal } from "./components/auth/AuthModal";

import HomePage from "./pages/HomePage";
import VaultPage from "./pages/VaultPage";
import DiscoverPage from "./pages/DiscoverPage";
import MediaDetailPage from "./pages/MediaDetailPage";
import FriendsPage from "./pages/FriendsPage";
import ProfilePage from "./pages/ProfilePage";
import ShelfDetailPage from "./pages/ShelfDetailPage";
import NotFound from "./pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/vault" component={VaultPage} />
      <Route path="/discover" component={DiscoverPage} />
      <Route path="/shelf/:id" component={ShelfDetailPage} />
      <Route path="/shelves/:id" component={ShelfDetailPage} />
      <Route path="/media/:slug" component={MediaDetailPage} />
      <Route path="/friends" component={FriendsPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function ScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.documentElement.scrollTo({ top: 0, left: 0, behavior: "instant" });
    if (document.body) {
      document.body.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, [location]);

  return null;
}

function AppContent() {
  const { feedback } = useVault();

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <>
      <ScrollToTop />
      <AppShell>
        <Router />
      </AppShell>

      {/* Global Toast Feedback */}
      {feedback && (
        <div
          role="status"
          data-testid="status-feedback"
          className="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-[rgba(55,218,178,.25)] bg-[#17211f]/95 px-4 py-3 text-[12px] font-semibold text-slate-200 shadow-2xl backdrop-blur-xl lg:bottom-6 transition-all duration-300"
        >
          <CheckCircle2 size={15} className="text-[hsl(var(--primary))]" />
          {feedback}
        </div>
      )}

      <AuthModal />
      <Toaster />
    </>
  );
}

export default function App() {
  const baseUrl = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <VaultProvider>
            <WouterRouter base={baseUrl}>
              <RoutedErrorBoundary>
                <AppContent />
              </RoutedErrorBoundary>
            </WouterRouter>
          </VaultProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}