"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface PageView {
  id: string;
  session_id: string;
  page: string;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  device: string | null;
  browser: string | null;
  screen: string | null;
  ip: string | null;
  created_at: string;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [views, setViews] = useState<PageView[]>([]);
  const [estimates, setEstimates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<"today" | "7d" | "30d" | "all">("7d");
  const [tab, setTab] = useState<"overview" | "pages" | "flow" | "sources">("overview");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const [viewsRes, estRes] = await Promise.all([
      supabase.from("page_views").select("*").order("created_at", { ascending: false }).limit(10000),
      supabase.from("estimates").select("id, name, project_type, status, created_at, converted_to_invoice_id, estimate_data").order("created_at", { ascending: false }),
    ]);
    if (viewsRes.data) setViews(viewsRes.data);
    if (estRes.data) setEstimates(estRes.data);
    setLoading(false);
  }

  const now = Date.now();
  const rangeMs = range === "today" ? 86400000 : range === "7d" ? 7 * 86400000 : range === "30d" ? 30 * 86400000 : Infinity;
  const cutoff = range === "all" ? 0 : now - rangeMs;
  const filtered = views.filter((v) => new Date(v.created_at).getTime() >= cutoff);

  // Core metrics
  const totalViews = filtered.length;
  const uniqueIPs = new Set(filtered.map((v) => v.ip)).size;
  const uniqueSessions = new Set(filtered.map((v) => v.session_id)).size;
  const avgPagesPerSession = uniqueSessions > 0 ? (totalViews / uniqueSessions).toFixed(1) : "0";

  // Filtered estimates
  const filteredEstimates = estimates.filter((e) => new Date(e.created_at).getTime() >= cutoff);
  const totalLeads = filteredEstimates.length;
  const convertedLeads = filteredEstimates.filter((e) => !!e.converted_to_invoice_id).length;

  // Page breakdown
  const pageCounts: Record<string, { views: number; sessions: Set<string> }> = {};
  filtered.forEach((v) => {
    if (!pageCounts[v.page]) pageCounts[v.page] = { views: 0, sessions: new Set() };
    pageCounts[v.page].views++;
    pageCounts[v.page].sessions.add(v.session_id);
  });
  const pageEntries = Object.entries(pageCounts)
    .map(([page, data]) => ({ page, views: data.views, sessions: data.sessions.size }))
    .sort((a, b) => b.views - a.views);

  // Page labels
  const pageLabels: Record<string, string> = {
    "/": "Home",
    "/kitchens": "Kitchens",
    "/estimate": "Estimator",
    "/consultation": "Consultation",
    "/blog": "Blog Index",
    "/blog/custom-ikea-kitchen-omaha": "Blog: IKEA Kitchen",
    "/blog/budget-whole-home-remodel-omaha": "Blog: Budget Guide",
    "/blog/basement-vs-addition-omaha": "Blog: Basement vs Addition",
  };

  // Device / Browser / Referrer breakdowns
  const deviceCounts: Record<string, number> = {};
  const browserCounts: Record<string, number> = {};
  const referrerCounts: Record<string, number> = {};
  const utmCounts: Record<string, number> = {};
  filtered.forEach((v) => {
    deviceCounts[v.device || "Unknown"] = (deviceCounts[v.device || "Unknown"] || 0) + 1;
    browserCounts[v.browser || "Unknown"] = (browserCounts[v.browser || "Unknown"] || 0) + 1;
    const ref = v.referrer ? new URL(v.referrer, "https://x.com").hostname.replace("www.", "") : "Direct";
    referrerCounts[ref === "x.com" ? "Direct" : ref] = (referrerCounts[ref === "x.com" ? "Direct" : ref] || 0) + 1;
    if (v.utm_source) utmCounts[`${v.utm_source}/${v.utm_medium || "none"}`] = (utmCounts[`${v.utm_source}/${v.utm_medium || "none"}`] || 0) + 1;
  });

  // Daily chart
  const dailyBuckets: Record<string, number> = {};
  filtered.forEach((v) => {
    const day = new Date(v.created_at).toISOString().slice(0, 10);
    dailyBuckets[day] = (dailyBuckets[day] || 0) + 1;
  });
  const dailyEntries = Object.entries(dailyBuckets).sort((a, b) => a[0].localeCompare(b[0]));
  const maxDaily = Math.max(...dailyEntries.map(([, v]) => v), 1);

  // Hourly heatmap (hour of day)
  const hourlyCounts = new Array(24).fill(0);
  filtered.forEach((v) => {
    const h = new Date(v.created_at).getHours();
    hourlyCounts[h]++;
  });
  const maxHourly = Math.max(...hourlyCounts, 1);

  // Navigation flow: session-ordered page sequences
  const sessionPages: Record<string, { page: string; ts: number }[]> = {};
  filtered.forEach((v) => {
    if (!sessionPages[v.session_id]) sessionPages[v.session_id] = [];
    sessionPages[v.session_id].push({ page: v.page, ts: new Date(v.created_at).getTime() });
  });
  const flowCounts: Record<string, number> = {};
  Object.values(sessionPages).forEach((pages) => {
    pages.sort((a, b) => a.ts - b.ts);
    for (let i = 0; i < pages.length - 1; i++) {
      const key = `${pages[i].page} → ${pages[i + 1].page}`;
      flowCounts[key] = (flowCounts[key] || 0) + 1;
    }
  });
  const flowEntries = Object.entries(flowCounts).sort((a, b) => b[1] - a[1]).slice(0, 15);

  // Entry pages (first page of each session)
  const entryPages: Record<string, number> = {};
  Object.values(sessionPages).forEach((pages) => {
    if (pages.length === 0) return;
    pages.sort((a, b) => a.ts - b.ts);
    entryPages[pages[0].page] = (entryPages[pages[0].page] || 0) + 1;
  });
  const entryEntries = Object.entries(entryPages).sort((a, b) => b[1] - a[1]);

  // Bounce rate (sessions with only 1 page view)
  const bounceSessions = Object.values(sessionPages).filter((p) => p.length === 1).length;
  const bounceRate = uniqueSessions > 0 ? ((bounceSessions / uniqueSessions) * 100).toFixed(0) : "0";

  // Estimate conversion funnel
  const estimatePageViews = filtered.filter((v) => v.page === "/estimate").length;
  const consultationPageViews = filtered.filter((v) => v.page === "/consultation").length;

  if (loading)
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-6 w-6 animate-spin rounded-full border border-carbon-700/70 border-t-chalk-50" />
          <p className="font-sans text-[10px] uppercase tracking-architect text-steel-400">Loading analytics</p>
        </div>
      </div>
    );

  return (
    <div className="pb-28 text-left">

      {/* ── Sticky title block ────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 border-b border-carbon-700/70 bg-carbon-950/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-8 sm:py-5">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/admin/projects")}
              className="btn-quiet -ml-2 shrink-0 px-2"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </button>
            <div className="min-w-0">
              <p className="eyebrow">Analytics</p>
              <h1 className="display-md mt-1 truncate">Site Analytics</h1>
            </div>
          </div>
          <div className="grid shrink-0 grid-cols-4 gap-px overflow-hidden rounded-edge bg-carbon-800 shadow-riser ring-1 ring-carbon-700/60 sm:flex">
            {([["today", "Today"], ["7d", "7 Days"], ["30d", "30 Days"], ["all", "All"]] as const).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setRange(val)}
                className={`px-2.5 py-1.5 text-center font-sans text-[9.5px] uppercase tracking-architect transition-colors duration-200 ease-architect ${
                  range === val ? "bg-chalk-50 text-carbon-950" : "bg-carbon-900 text-steel-400 hover:bg-carbon-950 hover:text-chalk-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-14 px-4 pt-7 sm:px-8 sm:pt-9">

        {/* Metric ledger */}
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-panel bg-carbon-800/60 shadow-riser ring-1 ring-carbon-700/50 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Page Views" value={totalViews.toLocaleString()} />
          <StatCard label="Unique Visitors" value={uniqueIPs.toLocaleString()} />
          <StatCard label="Sessions" value={uniqueSessions.toLocaleString()} />
          <StatCard label="Pages / Session" value={avgPagesPerSession} />
          <StatCard label="Bounce Rate" value={`${bounceRate}%`} />
          <StatCard label="Leads" value={totalLeads.toLocaleString()} color="text-ember-500" />
        </div>

        {/* Index tabs */}
        <div className="tabstrip">
          {([["overview", "Overview"], ["pages", "Pages"], ["flow", "User Flow"], ["sources", "Sources"]] as const).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setTab(val)}
              className={`tab ${tab === val ? "tab-active" : ""}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ═══ OVERVIEW ═══ */}
        {tab === "overview" && (
          <>
            {/* Daily series */}
            {dailyEntries.length > 0 && (
              <section className="animate-rise">
                <div className="title-block">
                  <h2 className="display-sm">Page Views Over Time</h2>
                  <span className="eyebrow hidden sm:block">Daily</span>
                </div>
                <div className="panel p-5 sm:p-7">
                  <div className="relative pt-7">
                    <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 top-7 flex flex-col justify-between">
                      <span className="h-px w-full bg-carbon-800/70" />
                      <span className="h-px w-full bg-carbon-800/70" />
                      <span className="h-px w-full bg-carbon-800/70" />
                    </div>
                    <div className="relative flex h-32 items-end gap-px border-b border-carbon-700">
                      {dailyEntries.map(([day, count]) => (
                        <div key={day} className="group relative flex h-full flex-1 flex-col items-center justify-end">
                          <div className="pointer-events-none absolute -top-6 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-edge bg-chalk-50 px-2 py-1 font-sans text-[9px] tracking-architect text-carbon-950 opacity-0 transition-opacity duration-200 ease-architect group-hover:opacity-100">
                            {fmtDay(day)}: {count}
                          </div>
                          <div className="min-h-[2px] w-full bg-chalk-100 transition-colors duration-200 ease-architect group-hover:bg-ember-500" style={{ height: `${(count / maxDaily) * 100}%` }} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-2.5 flex justify-between font-sans text-[9.5px] uppercase tracking-architect text-steel-400">
                    <span>{dailyEntries.length > 0 && fmtDay(dailyEntries[0][0])}</span>
                    <span>{dailyEntries.length > 0 && fmtDay(dailyEntries[dailyEntries.length - 1][0])}</span>
                  </div>
                </div>
              </section>
            )}

            <div className="grid gap-9 lg:grid-cols-2">
              {/* Funnel */}
              <section className="animate-rise">
                <div className="title-block">
                  <h2 className="display-sm">Conversion Funnel</h2>
                  <span className="eyebrow hidden sm:block">Sessions</span>
                </div>
                <div className="space-y-2.5">
                  {[
                    { label: "Site Visitors", count: uniqueSessions, color: "bg-chalk-50" },
                    { label: "Viewed Estimator", count: pageCounts["/estimate"]?.sessions.size || 0, color: "bg-steel-400" },
                    { label: "Viewed Consultation", count: pageCounts["/consultation"]?.sessions.size || 0, color: "bg-steel-600" },
                    { label: "Submitted Lead", count: totalLeads, color: "bg-ember-500" },
                    { label: "Converted", count: convertedLeads, color: "bg-signal-600" },
                  ].map((stage) => (
                    <div key={stage.label} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                      <div className="sm:w-32 sm:shrink-0 sm:text-right">
                        <span className="eyebrow leading-tight">{stage.label}</span>
                      </div>
                      <div className="h-6 flex-1 overflow-hidden border border-carbon-700/60 bg-carbon-900">
                        <div
                          className={`h-full ${stage.color} flex items-center justify-end pr-2 transition-all duration-700 ease-architect`}
                          style={{ width: uniqueSessions > 0 ? `${Math.max((stage.count / uniqueSessions) * 100, stage.count > 0 ? 8 : 0)}%` : "0%" }}
                        >
                          {stage.count > 0 && <span className="font-sans text-[9.5px] tabular-nums text-white">{stage.count}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Hour of day */}
              <section className="animate-rise">
                <div className="title-block">
                  <h2 className="display-sm">Traffic by Hour</h2>
                  <span className="eyebrow hidden sm:block">Local Time</span>
                </div>
                <div className="panel p-5 sm:p-7">
                  <div className="relative pt-7">
                    <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 top-7 flex flex-col justify-between">
                      <span className="h-px w-full bg-carbon-800/70" />
                      <span className="h-px w-full bg-carbon-800/70" />
                      <span className="h-px w-full bg-carbon-800/70" />
                    </div>
                    <div className="relative flex h-28 items-end gap-px border-b border-carbon-700">
                      {hourlyCounts.map((count, h) => (
                        <div key={h} className="group relative flex h-full flex-1 flex-col items-center justify-end">
                          <div className="pointer-events-none absolute -top-6 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-edge bg-chalk-50 px-2 py-1 font-sans text-[9px] tracking-architect text-carbon-950 opacity-0 transition-opacity duration-200 ease-architect group-hover:opacity-100">
                            {h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`}: {count}
                          </div>
                          <div
                            className={`min-h-[2px] w-full transition-colors duration-200 ease-architect ${count > 0 ? "bg-steel-400 group-hover:bg-ember-500" : "bg-carbon-800/80"}`}
                            style={{ height: `${(count / maxHourly) * 100}%` }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-2.5 flex justify-between font-sans text-[9.5px] uppercase tracking-architect text-steel-400">
                    <span>12am</span>
                    <span>6am</span>
                    <span>12pm</span>
                    <span>6pm</span>
                    <span>11pm</span>
                  </div>
                </div>
              </section>
            </div>

            {/* Recent activity */}
            <section className="animate-rise">
              <div className="title-block">
                <h2 className="display-sm">Recent Visitors</h2>
                <span className="eyebrow hidden sm:block">Live Feed</span>
              </div>
              <div className="max-h-80 overflow-y-auto border-t border-carbon-700/70">
                {filtered.slice(0, 40).map((v) => (
                  <div key={v.id} className="flex items-center gap-3 border-b border-carbon-700/55 py-2.5 transition-colors duration-200 ease-architect last:border-0 hover:bg-carbon-900">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-edge border font-sans text-[10px] ${
                      v.device === "iOS" ? "border-chalk-50 bg-chalk-50 text-carbon-950" : v.device === "Android" ? "border-signal-200 bg-signal-50 text-signal-700" : v.device === "Desktop" ? "border-carbon-700 bg-carbon-900 text-steel-300" : "border-carbon-700/60 bg-carbon-900 text-steel-400"
                    }`}>
                      {(v.device || "?")[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] text-chalk-50">
                        <span>{pageLabels[v.page] || v.page}</span>
                      </p>
                      <div className="mt-0.5 flex items-center gap-2 font-sans text-[9.5px] uppercase tracking-architect text-steel-400">
                        <span>{v.browser}</span>
                        {v.referrer && !v.referrer.includes("wdocustom") && (
                          <>
                            <span aria-hidden className="text-steel-500">·</span>
                            <span className="truncate">via {new URL(v.referrer, "https://x.com").hostname.replace("www.", "")}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className="shrink-0 whitespace-nowrap font-sans text-[9.5px] uppercase tracking-architect tabular-nums text-steel-400">{timeAgo(v.created_at)}</span>
                  </div>
                ))}
                {filtered.length === 0 && (
                  <div className="blueprint-grid px-8 py-16 text-center">
                    <p className="display-sm">No page views</p>
                    <p className="mx-auto mt-2 max-w-xs text-[13px] leading-relaxed text-steel-400">Nothing was recorded in this period.</p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {/* ═══ PAGES ═══ */}
        {tab === "pages" && (
          <>
            <section className="animate-rise">
              <div className="title-block">
                <h2 className="display-sm">All Pages</h2>
                <span className="eyebrow hidden sm:block">Index</span>
              </div>
              <div className="panel overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left">
                    <thead>
                      <tr className="border-b border-carbon-700/55 bg-carbon-900/60">
                        <th scope="col" className="eyebrow px-5 py-3 font-medium sm:px-5">Page</th>
                        <th scope="col" className="eyebrow px-5 py-3 text-right font-medium">Views</th>
                        <th scope="col" className="eyebrow px-5 py-3 text-right font-medium">Sessions</th>
                        <th scope="col" className="eyebrow px-5 py-3 text-right font-medium sm:px-5">% of Traffic</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageEntries.map((p) => (
                        <tr key={p.page} className="border-b border-carbon-700/50 transition-colors duration-200 ease-architect last:border-b-0 hover:bg-carbon-950">
                          <td className="px-5 py-4 sm:px-5">
                            <p className="text-[13px] font-medium tracking-[-0.01em] text-chalk-50">{pageLabels[p.page] || p.page}</p>
                            <p className="mt-0.5 font-sans text-[10px] text-steel-400">{p.page}</p>
                          </td>
                          <td className="figure px-5 py-4 text-right text-[13px]">{p.views}</td>
                          <td className="px-5 py-4 text-right text-[13px] tabular-nums text-steel-400">{p.sessions}</td>
                          <td className="px-5 py-4 text-right sm:px-5">
                            <div className="inline-flex items-center gap-2.5">
                              <div className="h-1 w-16 overflow-hidden bg-carbon-850">
                                <div className="h-full bg-chalk-100" style={{ width: `${totalViews > 0 ? (p.views / totalViews) * 100 : 0}%` }} />
                              </div>
                              <span className="w-8 text-right font-sans text-[10px] tabular-nums text-steel-400">
                                {totalViews > 0 ? ((p.views / totalViews) * 100).toFixed(0) : 0}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {pageEntries.length === 0 && (
                  <div className="blueprint-grid px-8 py-16 text-center">
                    <p className="display-sm">No page views</p>
                    <p className="mx-auto mt-2 max-w-xs text-[13px] leading-relaxed text-steel-400">Nothing was recorded in this period.</p>
                  </div>
                )}
              </div>
            </section>

            {/* Landing pages */}
            <section className="animate-rise">
              <div className="title-block">
                <h2 className="display-sm">Landing Pages</h2>
                <span className="eyebrow hidden sm:block">First Page Visited</span>
              </div>
              <div className="border-t border-carbon-700/70">
                {entryEntries.slice(0, 10).map(([page, count]) => (
                  <div key={page} className="flex items-baseline justify-between gap-4 border-b border-carbon-700/55 py-3 transition-colors duration-200 ease-architect hover:bg-carbon-900">
                    <div className="min-w-0">
                      <span className="text-[13px] font-medium tracking-[-0.01em] text-chalk-50">{pageLabels[page] || page}</span>
                      <span className="ml-2 font-sans text-[10px] text-steel-400">{page}</span>
                    </div>
                    <div className="flex shrink-0 items-baseline gap-2">
                      <span className="figure text-[13px]">{count}</span>
                      <span className="eyebrow">Sessions</span>
                    </div>
                  </div>
                ))}
                {entryEntries.length === 0 && (
                  <p className="py-8 text-center font-sans text-[10px] uppercase tracking-architect text-steel-400">No data</p>
                )}
              </div>
            </section>
          </>
        )}

        {/* ═══ USER FLOW ═══ */}
        {tab === "flow" && (
          <>
            <section className="animate-rise">
              <div className="title-block">
                <h2 className="display-sm">Navigation Paths</h2>
                <span className="eyebrow hidden sm:block">Top Transitions</span>
              </div>
              <p className="-mt-1 mb-4 text-[12.5px] leading-relaxed text-steel-400">
                How visitors move between pages — the most common transitions in this period.
              </p>
              <div className="border-t border-carbon-700/70">
                {flowEntries.map(([flow, count]) => {
                  const [from, to] = flow.split(" → ");
                  return (
                    <div key={flow} className="flex flex-col gap-2.5 border-b border-carbon-700/55 py-3 transition-colors duration-200 ease-architect hover:bg-carbon-900 sm:flex-row sm:items-center sm:gap-4">
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <span className="max-w-[45%] truncate rounded-edge border border-carbon-700 bg-carbon-900 px-2.5 py-1 font-sans text-[10px] uppercase tracking-architect text-steel-300 sm:max-w-[160px]">
                          {pageLabels[from] || from}
                        </span>
                        <svg aria-hidden className="h-3.5 w-3.5 shrink-0 text-steel-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                        <span className="max-w-[45%] truncate rounded-edge border border-ember-200 bg-ember-50 px-2.5 py-1 font-sans text-[10px] uppercase tracking-architect text-ember-600 sm:max-w-[160px]">
                          {pageLabels[to] || to}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2.5">
                        <div className="h-1 w-20 overflow-hidden bg-carbon-850 sm:w-16">
                          <div className="h-full bg-chalk-100" style={{ width: `${(count / (flowEntries[0]?.[1] || 1)) * 100}%` }} />
                        </div>
                        <span className="figure w-8 text-right text-[13px]">{count}</span>
                      </div>
                    </div>
                  );
                })}
                {flowEntries.length === 0 && (
                  <div className="blueprint-grid px-8 py-16 text-center">
                    <p className="display-sm">Not enough session data</p>
                    <p className="mx-auto mt-2 max-w-xs text-[13px] leading-relaxed text-steel-400">Multi-page visits are needed to map a path.</p>
                  </div>
                )}
              </div>
            </section>

            {/* Session depth */}
            <section className="animate-rise">
              <div className="title-block">
                <h2 className="display-sm">Session Depth</h2>
                <span className="eyebrow hidden sm:block">Pages per Session</span>
              </div>
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-panel bg-carbon-800/60 shadow-riser ring-1 ring-carbon-700/50 sm:grid-cols-4">
                {[
                  { label: "1 page", count: Object.values(sessionPages).filter((p) => p.length === 1).length },
                  { label: "2 pages", count: Object.values(sessionPages).filter((p) => p.length === 2).length },
                  { label: "3 pages", count: Object.values(sessionPages).filter((p) => p.length === 3).length },
                  { label: "4+ pages", count: Object.values(sessionPages).filter((p) => p.length >= 4).length },
                ].map((d) => (
                  <div key={d.label} className="bg-carbon-900 px-4 py-5 transition-colors duration-300 ease-architect hover:bg-carbon-950 sm:px-5">
                    <p className="eyebrow">{d.label}</p>
                    <p className="figure mt-2 text-[1.75rem] leading-none">{d.count}</p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* ═══ SOURCES ═══ */}
        {tab === "sources" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <BreakdownCard title="Devices" entries={Object.entries(deviceCounts).sort((a, b) => b[1] - a[1])} total={totalViews} colorFn={deviceColor} />
            <BreakdownCard title="Browsers" entries={Object.entries(browserCounts).sort((a, b) => b[1] - a[1])} total={totalViews} />
            <BreakdownCard title="Referrers" entries={Object.entries(referrerCounts).sort((a, b) => b[1] - a[1])} total={totalViews} />
            {Object.keys(utmCounts).length > 0 && (
              <BreakdownCard title="UTM Campaigns" entries={Object.entries(utmCounts).sort((a, b) => b[1] - a[1])} total={totalViews} />
            )}
            <div className="panel p-5 sm:p-7">
              <div className="mb-3 flex items-baseline justify-between gap-4 border-b border-carbon-700/70 pb-2.5">
                <h2 className="display-sm">Screen Sizes</h2>
              </div>
              <div className="divide-hairline">
                {(() => {
                  const screenCounts: Record<string, number> = {};
                  filtered.forEach((v) => { screenCounts[v.screen || "Unknown"] = (screenCounts[v.screen || "Unknown"] || 0) + 1; });
                  return Object.entries(screenCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([s, c]) => (
                    <div key={s} className="flex items-baseline justify-between gap-3 py-2">
                      <span className="min-w-0 truncate font-sans text-[11px] tabular-nums text-steel-300">{s}</span>
                      <span className="figure shrink-0 text-[12.5px]">{c}</span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-carbon-900 px-5 py-5 transition-colors duration-300 ease-architect hover:bg-carbon-950 sm:px-5 sm:py-5">
      <p className="eyebrow">{label}</p>
      <p className={`figure mt-2 truncate text-[1.5rem] leading-none sm:text-[1.875rem] ${color || "text-chalk-50"}`}>{value}</p>
    </div>
  );
}

function BreakdownCard({ title, entries, total, colorFn }: { title: string; entries: [string, number][]; total: number; colorFn?: (k: string) => string }) {
  return (
    <div className="panel p-5 sm:p-7">
      <div className="mb-3 flex items-baseline justify-between gap-4 border-b border-carbon-700/70 pb-2.5">
        <h2 className="display-sm">{title}</h2>
      </div>
      <div className="divide-hairline">
        {entries.slice(0, 8).map(([key, count]) => (
          <div key={key} className="flex items-baseline justify-between gap-3 py-2">
            <div className="flex min-w-0 items-baseline gap-2">
              {colorFn && <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${colorFn(key)}`} />}
              <span className="truncate text-[12.5px] text-chalk-50">{key}</span>
            </div>
            <div className="flex shrink-0 items-baseline gap-2.5">
              <span className="font-sans text-[10px] tabular-nums text-steel-400">
                {total > 0 ? `${((count / total) * 100).toFixed(0)}%` : "—"}
              </span>
              <span className="figure w-6 text-right text-[12.5px]">{count}</span>
            </div>
          </div>
        ))}
        {entries.length === 0 && (
          <p className="py-3 font-sans text-[10px] uppercase tracking-architect text-steel-400">No data</p>
        )}
      </div>
    </div>
  );
}

function deviceColor(d: string): string {
  if (d === "iOS") return "bg-chalk-50";
  if (d === "Android") return "bg-signal-600";
  if (d === "Desktop") return "bg-ember-500";
  if (d === "Tablet") return "bg-steel-500";
  return "bg-steel-700";
}

function fmtDay(d: string): string {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function timeAgo(ts: string): string {
  const ms = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
