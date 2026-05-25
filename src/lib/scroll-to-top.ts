/** Force the document to the top — used after route changes that pass scroll: false. */
export function scrollPageToTop() {
  if (typeof window === "undefined") {
    return;
  }

  const scrollTargets: Array<Element | Window> = [window, document.documentElement, document.body];

  for (const target of scrollTargets) {
    if (target === window) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      continue;
    }

    if (target instanceof HTMLElement) {
      target.scrollTop = 0;
      target.scrollLeft = 0;
    }
  }
}

/** Repeat scroll reset across paint/layout so late content cannot preserve an old offset. */
export function scrollPageToTopSoon() {
  scrollPageToTop();

  if (typeof window === "undefined") {
    return;
  }

  window.requestAnimationFrame(() => {
    scrollPageToTop();
    window.requestAnimationFrame(scrollPageToTop);
  });

  window.setTimeout(scrollPageToTop, 0);
  window.setTimeout(scrollPageToTop, 80);
}

export function isMediaDetailPath(pathname: string) {
  return pathname.startsWith("/media/");
}
