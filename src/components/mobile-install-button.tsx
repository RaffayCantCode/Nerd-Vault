"use client";

import { useEffect, useMemo, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)").matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function MobileInstallButton() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
      setOpen(false);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const isIos = useMemo(() => isIosDevice(), []);
  const canShow = !installed && (Boolean(installEvent) || isIos);

  if (!canShow) {
    return null;
  }

  async function handleInstall() {
    if (installEvent) {
      await installEvent.prompt();
      await installEvent.userChoice.catch(() => undefined);
      setInstallEvent(null);
      return;
    }

    if (isIos) {
      setShowIosHelp(true);
      setOpen(true);
    }
  }

  return (
    <div className="mobile-install-shell">
      <button type="button" className="topbar-chip mobile-install-chip" onClick={() => void handleInstall()}>
        Install App
      </button>

      {open && showIosHelp ? (
        <div className="topbar-panel glass mobile-install-panel">
          <div className="topbar-panel-header">
            <strong>Install on iPhone</strong>
            <button type="button" className="topbar-panel-close" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
          <p className="copy">Tap Share in Safari, then choose Add to Home Screen for the standalone app version.</p>
        </div>
      ) : null}
    </div>
  );
}
