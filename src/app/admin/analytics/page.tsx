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
      <div className="min-h-screen bg-brand-alabaster flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-brand-charcoal/20 border-t-brand-charcoal rounded-full animate-spin" />
          <p className="text-xs font-medium text-brand-muted tracking-wide">Loading analytics...</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-brand-alabaster text-brand-charcoal font-sans antialiased pb-24">
      {/* Header */}
      <div className="border-b border-brand-stone/60 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button type="button" onClick={() => router.push("/admin/projects")} className="text-brand-muted hover:text-brand-charcoal transition-colors shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </button>
            <div className="min-w-0">
              <h1 className="font-editorial text-lg sm:text-xl font-bold tracking-tight text-brand-charcoal">Site Analytics</h1>
              <p className="text-[11px] font-medium tracking-wide text-brand-muted">wdocustom.com &middot; All pages &middot; Live tracking</p>
            </div>
          </div>
          <div className="flex gap-1 bg-brand-warm rounded-lg p-0.5 shrink-0">
            {([["today", "Today"], ["7d", "7 Days"], ["30d", "30 Days"], ["all", "All"]] as const).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setRange(val)}
                className={`px-2.5 py-1.5 rounded-md text-[10px] font-bold tracking-wide uppercase transition-all ${
                  range === val ? "bg-white text-brand-charcoal shadow-sm" : "text-brand-muted hover:text-brand-charcoal"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-5 space-y-5">

        {/* Top Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Page Views" value={totalViews.toLocaleString()} />
          <StatCard label="Unique Visitors" value={uniqueIPs.toLocaleString()} />
          <StatCard label="Sessions" value={uniqueSessions.toLocaleString()} />
          <StatCard label="Pages / Session" value={avgPagesPerSession} />
          <StatCard label="Bounce Rate" value={`${bounceRate}%`} />
          <StatCard label="Leads" value={totalLeads.toLocaleString()} color="text-luxury-ochre" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-brand-warm rounded-xl p-1">
          {([["overview", "Overview"], ["pages", "Pages"], ["flow", "User Flow"], ["sources", "Sources"]] as const).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setTab(val)}
              className={`flex-1 text-center py-2 rounded-lg text-[11px] font-bold tracking-wide uppercase transition-all ${
                tab === val ? "bg-white text-brand-charcoal shadow-sm" : "text-brand-muted hover:text-brand-charcoal"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ═══ OVERVIEW TAB ═══ */}
        {tab === "overview" && (
          <>
            {/* Daily Chart */}
            {dailyEntries.length > 0 && (
              <div className="bg-white rounded-2xl border border-brand-stone/30 shadow-soft p-5">
                <h2 className="text-xs font-black text-brand-charcoal uppercase tracking-widest mb-4">Page Views Over Time</h2>
                <div className="flex items-end gap-[2px] h-32">
                  {dailyEntries.map(([day, count]) => (
                    <div key={day} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-brand-charcoal text-white text-[9px] font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                        {fmtDay(day)}: {count}
                      </div>
                      <div className="w-full bg-luxury-gold/70 hover:bg-luxury-gold rounded-t transition-colors min-h-[2px]" style={{ height: `${(count / maxDaily) * 100}%` }} />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-[9px] text-brand-muted font-medium">{dailyEntries.length > 0 && fmtDay(dailyEntries[0][0])}</span>
                  <span className="text-[9px] text-brand-muted font-medium">{dailyEntries.length > 0 && fmtDay(dailyEntries[dailyEntries.length - 1][0])}</span>
                </div>
              </div>
            )}

            {/* Conversion Funnel + Hourly Heatmap */}
            <div className="grid lg:grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl border border-brand-stone/30 shadow-soft p-5">
                <h2 className="text-xs font-black text-brand-charcoal uppercase tracking-widest mb-4">Conversion Funnel</h2>
                <div className="space-y-3">
                  {[
                    { label: "Site Visitors", count: uniqueSessions, color: "bg-brand-charcoal" },
                    { label: "Viewed Estimator", count: pageCounts["/estimate"]?.sessions.size || 0, color: "bg-luxury-gold" },
                    { label: "Viewed Consultation", count: pageCounts["/consultation"]?.sessions.size || 0, color: "bg-emerald-500" },
                    { label: "Submitted Lead", count: totalLeads, color: "bg-sage-500" },
                    { label: "Converted", count: convertedLeads, color: "bg-blue-500" },
                  ].map((stage) => (
                    <div key={stage.label} className="flex items-center gap-3">
                      <div className="w-28 text-right shrink-0">
                        <span className="text-[11px] font-bold text-brand-muted">{stage.label}</span>
                      </div>
                      <div className="flex-1 bg-brand-warm rounded-full h-7 overflow-hidden">
                        <div
                          className={`h-full ${stage.color} rounded-full flex items-center justify-end pr-2.5 transition-all duration-700`}
                          style={{ width: uniqueSessions > 0 ? `${Math.max((stage.count / uniqueSessions) * 100, stage.count > 0 ? 8 : 0)}%` : "0%" }}
                        >
                          {stage.count > 0 && <span className="text-[10px] font-black text-white">{stage.count}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-brand-stone/30 shadow-soft p-5">
                <h2 className="text-xs font-black text-brand-charcoal uppercase tracking-widest mb-4">Traffic by Hour of Day</h2>
                <div className="flex items-end gap-[3px] h-28">
                  {hourlyCounts.map((count, h) => (
                    <div key={h} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-brand-charcoal text-white text-[9px] font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                        {h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`}: {count}
                      </div>
                      <div
                        className={`w-full rounded-t transition-colors min-h-[2px] ${count > 0 ? "bg-sage-400 hover:bg-sage-500" : "bg-brand-stone/10"}`}
                        style={{ height: `${(count / maxHourly) * 100}%` }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-[9px] text-brand-muted font-medium">12am</span>
                  <span className="text-[9px] text-brand-muted font-medium">6am</span>
                  <span className="text-[9px] text-brand-muted font-medium">12pm</span>
                  <span className="text-[9px] text-brand-muted font-medium">6pm</span>
                  <span className="text-[9px] text-brand-muted font-medium">11pm</span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl border border-brand-stone/30 shadow-soft p-5">
              <h2 className="text-xs font-black text-brand-charcoal uppercase tracking-widest mb-4">Recent Visitors</h2>
              <div className="space-y-0 max-h-72 overflow-y-auto">
                {filtered.slice(0, 40).map((v) => (
                  <div key={v.id} className="flex items-center gap-3 py-2 border-b border-brand-stone/10 last:border-0">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-[9px] font-black shrink-0 ${
                      v.device === "iOS" ? "bg-blue-500" : v.device === "Android" ? "bg-green-500" : v.device === "Desktop" ? "bg-slate-600" : "bg-brand-muted"
                    }`}>
                      {(v.device || "?")[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-brand-charcoal truncate">
                        <span className="text-luxury-ochre">{pageLabels[v.page] || v.page}</span>
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-brand-muted">{v.browser}</span>
                        {v.referrer && !v.referrer.includes("wdocustom") && (
                          <>
                            <span className="text-brand-stone/30">&middot;</span>
                            <span className="text-[10px] text-brand-muted truncate">via {new URL(v.referrer, "https://x.com").hostname.replace("www.", "")}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] font-medium text-brand-muted shrink-0 whitespace-nowrap">{timeAgo(v.created_at)}</span>
                  </div>
                ))}
                {filtered.length === 0 && <p className="text-sm text-brand-muted py-6 text-center">No page views in this period</p>}
              </div>
            </div>
          </>
        )}

        {/* ═══ PAGES TAB ═══ */}
        {tab === "pages" && (
          <>
            <div className="bg-white rounded-2xl border border-brand-stone/30 shadow-soft overflow-hidden">
              <div className="px-5 py-4 border-b border-brand-stone/20">
                <h2 className="text-xs font-black text-brand-charcoal uppercase tracking-widest">All Pages</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-brand-stone/15 bg-brand-warm/30">
                      <th className="px-5 py-3 text-[10px] font-black text-brand-muted uppercase tracking-widest">Page</th>
                      <th className="px-4 py-3 text-[10px] font-black text-brand-muted uppercase tracking-widest text-right">Views</th>
                      <th className="px-4 py-3 text-[10px] font-black text-brand-muted uppercase tracking-widest text-right">Sessions</th>
                      <th className="px-5 py-3 text-[10px] font-black text-brand-muted uppercase tracking-widest text-right">% of Traffic</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageEntries.map((p) => (
                      <tr key={p.page} className="border-b border-brand-stone/10 hover:bg-brand-alabaster/60 transition-colors">
                        <td className="px-5 py-3">
                          <p className="text-sm font-semibold text-brand-charcoal">{pageLabels[p.page] || p.page}</p>
                          <p className="text-[10px] text-brand-muted">{p.page}</p>
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-brand-charcoal text-right" style={{ fontVariantNumeric: "tabular-nums" }}>{p.views}</td>
                        <td className="px-4 py-3 text-sm font-medium text-brand-muted text-right" style={{ fontVariantNumeric: "tabular-nums" }}>{p.sessions}</td>
                        <td className="px-5 py-3 text-right">
                          <div className="inline-flex items-center gap-2">
                            <div className="w-16 bg-brand-warm rounded-full h-1.5 overflow-hidden">
                              <div className="h-full bg-luxury-gold rounded-full" style={{ width: `${totalViews > 0 ? (p.views / totalViews) * 100 : 0}%` }} />
                            </div>
                            <span className="text-[11px] font-bold text-brand-muted" style={{ fontVariantNumeric: "tabular-nums" }}>
                              {totalViews > 0 ? ((p.views / totalViews) * 100).toFixed(0) : 0}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {pageEntries.length === 0 && <p className="px-5 py-12 text-center text-sm text-brand-muted">No page views in this period</p>}
            </div>

            {/* Entry Pages */}
            <div className="bg-white rounded-2xl border border-brand-stone/30 shadow-soft p-5">
              <h2 className="text-xs font-black text-brand-charcoal uppercase tracking-widest mb-4">Landing Pages (First Page Visited)</h2>
              <div className="space-y-2">
                {entryEntries.slice(0, 10).map(([page, count]) => (
                  <div key={page} className="flex items-center justify-between py-2 border-b border-brand-stone/10 last:border-0">
                    <div>
                      <span className="text-sm font-semibold text-brand-charcoal">{pageLabels[page] || page}</span>
                      <span className="text-[10px] text-brand-muted ml-2">{page}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-brand-charcoal" style={{ fontVariantNumeric: "tabular-nums" }}>{count}</span>
                      <span className="text-[10px] text-brand-muted">sessions</span>
                    </div>
                  </div>
                ))}
                {entryEntries.length === 0 && <p className="text-sm text-brand-muted">No data</p>}
              </div>
            </div>
          </>
        )}

        {/* ═══ USER FLOW TAB ═══ */}
        {tab === "flow" && (
          <>
            <div className="bg-white rounded-2xl border border-brand-stone/30 shadow-soft p-5">
              <h2 className="text-xs font-black text-brand-charcoal uppercase tracking-widest mb-1">Navigation Paths</h2>
              <p className="text-[11px] text-brand-muted mb-4">How visitors move between pages — most common transitions</p>
              <div className="space-y-2">
                {flowEntries.map(([flow, count]) => {
                  const [from, to] = flow.split(" → ");
                  return (
                    <div key={flow} className="flex items-center gap-3 py-2.5 border-b border-brand-stone/10 last:border-0">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="inline-block bg-brand-warm text-brand-charcoal text-[10px] font-bold px-2.5 py-1 rounded-lg truncate max-w-[140px]">
                          {pageLabels[from] || from}
                        </span>
                        <svg className="w-4 h-4 text-luxury-gold shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                        <span className="inline-block bg-luxury-soft text-luxury-ochre text-[10px] font-bold px-2.5 py-1 rounded-lg truncate max-w-[140px]">
                          {pageLabels[to] || to}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-16 bg-brand-warm rounded-full h-2 overflow-hidden">
                          <div className="h-full bg-luxury-gold rounded-full" style={{ width: `${(count / (flowEntries[0]?.[1] || 1)) * 100}%` }} />
                        </div>
                        <span className="text-xs font-black text-brand-charcoal w-8 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>{count}</span>
                      </div>
                    </div>
                  );
                })}
                {flowEntries.length === 0 && <p className="text-sm text-brand-muted text-center py-6">Not enough session data yet — need multi-page visits</p>}
              </div>
            </div>

            {/* Session depth */}
            <div className="bg-white rounded-2xl border border-brand-stone/30 shadow-soft p-5">
              <h2 className="text-xs font-black text-brand-charcoal uppercase tracking-widest mb-4">Session Depth</h2>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "1 page", count: Object.values(sessionPages).filter((p) => p.length === 1).length },
                  { label: "2 pages", count: Object.values(sessionPages).filter((p) => p.length === 2).length },
                  { label: "3 pages", count: Object.values(sessionPages).filter((p) => p.length === 3).length },
                  { label: "4+ pages", count: Object.values(sessionPages).filter((p) => p.length >= 4).length },
                ].map((d) => (
                  <div key={d.label} className="text-center bg-brand-alabaster rounded-xl p-3 border border-brand-stone/15">
                    <p className="text-xl font-black text-brand-charcoal" style={{ fontVariantNumeric: "tabular-nums" }}>{d.count}</p>
                    <p className="text-[10px] font-bold text-brand-muted uppercase tracking-wider mt-0.5">{d.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ═══ SOURCES TAB ═══ */}
        {tab === "sources" && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <BreakdownCard title="Devices" entries={Object.entries(deviceCounts).sort((a, b) => b[1] - a[1])} total={totalViews} colorFn={deviceColor} />
            <BreakdownCard title="Browsers" entries={Object.entries(browserCounts).sort((a, b) => b[1] - a[1])} total={totalViews} />
            <BreakdownCard title="Referrers" entries={Object.entries(referrerCounts).sort((a, b) => b[1] - a[1])} total={totalViews} />
            {Object.keys(utmCounts).length > 0 && (
              <BreakdownCard title="UTM Campaigns" entries={Object.entries(utmCounts).sort((a, b) => b[1] - a[1])} total={totalViews} />
            )}
            <div className="bg-white rounded-2xl border border-brand-stone/30 shadow-soft p-5">
              <h2 className="text-xs font-black text-brand-charcoal uppercase tracking-widest mb-3">Screen Sizes</h2>
              <div className="space-y-2">
                {(() => {
                  const screenCounts: Record<string, number> = {};
                  filtered.forEach((v) => { screenCounts[v.screen || "Unknown"] = (screenCounts[v.screen || "Unknown"] || 0) + 1; });
                  return Object.entries(screenCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([s, c]) => (
                    <div key={s} className="flex items-center justify-between">
                      <span className="text-xs font-medium text-brand-charcoal">{s}</span>
                      <span className="text-xs font-bold text-brand-muted" style={{ fontVariantNumeric: "tabular-nums" }}>{c}</span>
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
    <div className="bg-white rounded-2xl border border-brand-stone/30 shadow-soft p-4">
      <p className="text-[9px] font-semibold text-brand-muted uppercase tracking-wider">{label}</p>
      <p className={`text-xl sm:text-2xl font-black mt-0.5 ${color || "text-brand-charcoal"}`} style={{ fontVariantNumeric: "tabular-nums" }}>{value}</p>
    </div>
  );
}

function BreakdownCard({ title, entries, total, colorFn }: { title: string; entries: [string, number][]; total: number; colorFn?: (k: string) => string }) {
  return (
    <div className="bg-white rounded-2xl border border-brand-stone/30 shadow-soft p-5">
      <h2 className="text-xs font-black text-brand-charcoal uppercase tracking-widest mb-3">{title}</h2>
      <div className="space-y-2">
        {entries.slice(0, 8).map(([key, count]) => (
          <div key={key} className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              {colorFn && <span className={`w-2 h-2 rounded-full shrink-0 ${colorFn(key)}`} />}
              <span className="text-xs font-medium text-brand-charcoal truncate">{key}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-bold text-brand-muted" style={{ fontVariantNumeric: "tabular-nums" }}>
                {total > 0 ? `${((count / total) * 100).toFixed(0)}%` : "—"}
              </span>
              <span className="text-xs font-bold text-brand-charcoal w-6 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>{count}</span>
            </div>
          </div>
        ))}
        {entries.length === 0 && <p className="text-xs text-brand-muted">No data</p>}
      </div>
    </div>
  );
}

function deviceColor(d: string): string {
  if (d === "iOS") return "bg-blue-500";
  if (d === "Android") return "bg-green-500";
  if (d === "Desktop") return "bg-slate-600";
  if (d === "Tablet") return "bg-purple-500";
  return "bg-brand-muted";
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
