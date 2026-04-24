export const DETAIL_RETURN_KEY = "nerdvault-detail-return";
export const BROWSE_RETURN_CONTEXT_KEY = "nerdvault-browse-return-context";

export type DetailReturnTarget = {
  href: string;
  label: string;
};

export type BrowseReturnContext = {
  href: string;
  scrollY: number;
  cardId?: string;
  cardTop?: number;
};

export function readDetailReturnTarget(): DetailReturnTarget | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(DETAIL_RETURN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DetailReturnTarget;
    if (!parsed?.href || !parsed?.label) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeDetailReturnTarget(target?: Partial<DetailReturnTarget>) {
  if (typeof window === "undefined") {
    return;
  }

  const href = target?.href ?? `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const label =
    target?.label ??
    (href.startsWith("/home")
      ? "Back to home"
      : href.startsWith("/browse")
        ? "Back to browse"
        : "Back");

  window.sessionStorage.setItem(
    DETAIL_RETURN_KEY,
    JSON.stringify({
      href,
      label,
    } satisfies DetailReturnTarget),
  );
}

export function readBrowseReturnContext(): BrowseReturnContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(BROWSE_RETURN_CONTEXT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BrowseReturnContext;
    if (!parsed?.href) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeBrowseReturnContext(context: BrowseReturnContext) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(BROWSE_RETURN_CONTEXT_KEY, JSON.stringify(context));
}

export function clearBrowseReturnContext() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(BROWSE_RETURN_CONTEXT_KEY);
}
