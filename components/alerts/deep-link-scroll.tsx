"use client";

import { useEffect } from "react";

// On initial load only, scrolls to and briefly glows the alert card targeted by
// ?alert=<id> (the deep link in availability emails). Reads the URL once on mount so
// later expand-driven ?alert updates don't re-trigger a scroll. No-op if that card
// isn't on the page (e.g. opening already dismissed).
export function DeepLinkScroll() {
  useEffect(() => {
    const alertId = new URLSearchParams(window.location.search).get("alert");
    if (!alertId) return;
    const el = document.getElementById(`alert-${alertId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("deep-link-flash");
    const timer = setTimeout(() => el.classList.remove("deep-link-flash"), 2500);
    return () => clearTimeout(timer);
  }, []);

  return null;
}
