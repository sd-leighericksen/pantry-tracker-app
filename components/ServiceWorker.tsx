"use client";

import { useEffect } from "react";

/* Registers the PWA service worker once on the client. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return; // avoid dev caching headaches
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* registration failures are non-fatal */
    });
  }, []);
  return null;
}
