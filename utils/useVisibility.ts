import { useEffect, useMemo, useRef, useState } from 'react';

type UseVisibilityOptions = {
  rootMargin?: string;
  /** Keep entry visible for one extra frame after leaving viewport to avoid flicker */
  retainOnExitMs?: number;
};

/**
 * Minimal IntersectionObserver helper to gate heavy renders (images, streams).
 * Keeps API tiny to avoid bloat while still preventing offscreen work.
 */
export function useVisibility(options?: UseVisibilityOptions) {
  const targetRef = useRef<HTMLElement | null>(null);
  const supportsObserver = useMemo(
    () => typeof window !== 'undefined' && typeof (window as any).IntersectionObserver !== 'undefined',
    []
  );
  const [isVisible, setIsVisible] = useState(() => !supportsObserver);
  const retainTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!supportsObserver) {
      setIsVisible(true);
      return;
    }
    const node = targetRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (retainTimer.current) {
            window.clearTimeout(retainTimer.current);
            retainTimer.current = null;
          }
          setIsVisible(true);
        } else {
          const delay = options?.retainOnExitMs ?? 120;
          retainTimer.current = window.setTimeout(() => setIsVisible(false), delay);
        }
      },
      {
        root: null,
        rootMargin: options?.rootMargin ?? '240px',
        threshold: 0,
      }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
      if (retainTimer.current) {
        window.clearTimeout(retainTimer.current);
        retainTimer.current = null;
      }
    };
  }, [options?.rootMargin, options?.retainOnExitMs, supportsObserver]);

  return { targetRef, isVisible, supportsObserver };
}
