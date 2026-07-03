/**
 * Shared IntersectionObserver for catalog cards.
 * A single observer handles all cards instead of one per card.
 */

type ObserverCallback = (isIntersecting: boolean) => void;

const registrations = new Map<Element, ObserverCallback>();
let sharedObserver: IntersectionObserver | null = null;

function getObserver(): IntersectionObserver | null {
  if (typeof window === 'undefined') return null;
  if (sharedObserver) return sharedObserver;

  sharedObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const cb = registrations.get(entry.target);
        if (cb) cb(entry.isIntersecting);
        if (entry.isIntersecting) {
          // Stop observing once visible
          sharedObserver?.unobserve(entry.target);
          registrations.delete(entry.target);
        }
      }
    },
    { rootMargin: '1800px 0px', threshold: 0.01 },
  );

  return sharedObserver;
}

export function observeCard(element: Element, callback: ObserverCallback): () => void {
  const observer = getObserver();
  if (!observer) return () => undefined;
  registrations.set(element, callback);
  observer.observe(element);
  return () => {
    observer.unobserve(element);
    registrations.delete(element);
  };
}
