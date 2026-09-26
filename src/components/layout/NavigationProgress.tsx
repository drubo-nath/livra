"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const activeUrlRef = useRef<string>("");

  // Complete progress on route change
  useEffect(() => {
    if (loading) {
      setProgress(100);
      const timer = setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [pathname, searchParams]);

  // Global click listener to start progress immediately on internal link clicks
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      // Find closest anchor tag
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("a") as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // Ignore external links, new tabs, modifier keys, hash links, mailto/tel
      if (
        anchor.target === "_blank" ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        e.altKey ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      ) {
        return;
      }

      // Check if it's an internal route that actually changes the page
      try {
        const url = new URL(anchor.href, window.location.origin);
        if (url.origin !== window.location.origin) return;

        // If clicking on same exact page with same search params, skip
        const currentUrl = window.location.pathname + window.location.search;
        const targetUrl = url.pathname + url.search;
        if (currentUrl === targetUrl) return;

        // Start progress immediately
        activeUrlRef.current = targetUrl;
        setLoading(true);
        setProgress(25);

        if (timerRef.current) clearInterval(timerRef.current);

        timerRef.current = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 88) {
              if (timerRef.current) clearInterval(timerRef.current);
              return 88;
            }
            // Smooth natural deceleration
            const step = Math.max(1, (90 - prev) * 0.15);
            return Math.min(88, prev + step);
          });
        }, 120);
      } catch {
        // Ignore URL parsing errors
      }
    };

    document.addEventListener("click", handleDocumentClick, { capture: true });

    return () => {
      document.removeEventListener("click", handleDocumentClick, { capture: true });
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!loading && progress === 0) return null;

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress)}
      className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none h-[2.5px] bg-transparent"
    >
      <div
        className="h-full bg-gradient-to-r from-clay via-amber-400 to-clay transition-all ease-out shadow-[0_0_10px_rgba(166,113,92,0.85)]"
        style={{
          width: `${progress}%`,
          transitionDuration: progress === 100 ? "150ms" : "250ms",
          opacity: progress === 100 ? 0 : 1,
        }}
      />
    </div>
  );
}

