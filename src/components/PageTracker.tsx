"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, Suspense } from "react";

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let sid = sessionStorage.getItem("wdo_sid");
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem("wdo_sid", sid);
  }
  return sid;
}

function detectDevice(): string {
  const ua = navigator.userAgent;
  if (/iPad|tablet/i.test(ua)) return "Tablet";
  if (/iPhone|iPod/i.test(ua)) return "iOS";
  if (/Android/i.test(ua) && /Mobile/i.test(ua)) return "Android";
  if (/Android/i.test(ua)) return "Android Tablet";
  return "Desktop";
}

function detectBrowser(): string {
  const ua = navigator.userAgent;
  if (/Edg\//i.test(ua)) return "Edge";
  if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) return "Chrome";
  if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return "Safari";
  if (/Firefox/i.test(ua)) return "Firefox";
  return "Other";
}

function TrackerInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTracked = useRef("");

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;

    const key = pathname + (searchParams?.toString() || "");
    if (key === lastTracked.current) return;
    lastTracked.current = key;

    const sid = getSessionId();
    if (!sid) return;

    const payload = {
      session_id: sid,
      page: pathname,
      referrer: document.referrer || null,
      utm_source: searchParams?.get("utm_source") || null,
      utm_medium: searchParams?.get("utm_medium") || null,
      utm_campaign: searchParams?.get("utm_campaign") || null,
      device: detectDevice(),
      browser: detectBrowser(),
      screen: `${window.screen.width}x${window.screen.height}`,
    };

    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track-pageview", JSON.stringify(payload));
    } else {
      fetch("/api/track-pageview", {
        method: "POST",
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    }
  }, [pathname, searchParams]);

  return null;
}

export default function PageTracker() {
  return (
    <Suspense fallback={null}>
      <TrackerInner />
    </Suspense>
  );
}
