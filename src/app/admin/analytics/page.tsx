"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface ViewHit {
  timestamp: string;
  ip: string;
  device: string;
  browser: string;
  referrer: string | null;
  screen: string | null;
}

interface PageStats {
  path: string;
  label: string;
  views: number;
  uniqueIPs: number;
  hits: ViewHit[];
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [estimates, setEstimates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<"7d" | "30d" | "all">("30d");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const [invRes, estRes] = await Promise.all([
      supabase.from("invoices").select("id, homeowner_name, job_address, project_title, status, view_count, view_history, created_at, amount").is("parent_id", null).order("created_at", { ascending: false }),
      supabase.from("estimates").select("id, name, email, phone, project_type, status, created_at, converted_to_invoice_id, estimate_data").order("created_at", { ascending: false }),
    ]);
    if (invRes.data) setInvoices(invRes.data);
    if (estRes.data) setEstimates(estRes.data);
    setLoading(false);
  }

  const now = Date.now();
  const rangeMs = range === "7d" ? 7 * 86400000 : range === "30d" ? 30 * 86400000 : Infinity;
  const cutoff = range === "all" ? 0 : now - rangeMs;

  const allHits: (ViewHit & { invoiceId: string; label: string })[] = invoices.flatMap((inv) =>
    (inv.view_history || []).map((h: ViewHit) => ({ ...h, invoiceId: inv.id, label: inv.homeowner_name || inv.project_title || "Untitled" }))
  );

  const filteredHits = allHits.filter((h) => new Date(h.timestamp).getTime() >= cutoff);

  const totalViews = filteredHits.length;
  const uniqueIPs = new Set(filteredHits.map((h) => h.ip)).size;

  // Device breakdown
  const deviceCounts: Record<string, number> = {};
  filteredHits.forEach((h) => {
    const d = h.device || "Unknown";
    deviceCounts[d] = (deviceCounts[d] || 0) + 1;
  });
  const deviceEntries = Object.entries(deviceCounts).sort((a, b) => b[1] - a[1]);

  // Browser breakdown
  const browserCounts: Record<string, number> = {};
  filteredHits.forEach((h) => {
    const b = h.browser || "Unknown";
    browserCounts[b] = (browserCounts[b] || 0) + 1;
  });
  const browserEntries = Object.entries(browserCounts).sort((a, b) => b[1] - a[1]);

  // Referrer breakdown
  const referrerCounts: Record<string, number> = {};
  filteredHits.forEach((h) => {
    const r = h.referrer || "Direct";
    referrerCounts[r] = (referrerCounts[r] || 0) + 1;
  });
  const referrerEntries = Object.entries(referrerCounts).sort((a, b) => b[1] - a[1]);

  // Per-proposal breakdown
  const proposalStats: { id: string; label: string; status: string; views: number; uniqueIPs: number }[] = invoices
    .map((inv) => {
      const hits = (inv.view_history || []).filter((h: ViewHit) => new Date(h.timestamp).getTime() >= cutoff);
      return {
        id: inv.id,
        label: inv.homeowner_name || inv.project_title || "Untitled",
        status: inv.status,
        views: hits.length,
        uniqueIPs: new Set(hits.map((h: ViewHit) => h.ip)).size,
      };
    })
    .filter((p) => p.views > 0)
    .sort((a, b) => b.views - a.views);

  // Views over time (daily buckets)
  const dailyBuckets: Record<string, number> = {};
  filteredHits.forEach((h) => {
    const day = new Date(h.timestamp).toISOString().slice(0, 10);
    dailyBuckets[day] = (dailyBuckets[day] || 0) + 1;
  });
  const dailyEntries = Object.entries(dailyBuckets).sort((a, b) => a[0].localeCompare(b[0]));
  const maxDaily = Math.max(...dailyEntries.map(([, v]) => v), 1);

  // Lead / conversion metrics
  const filteredEstimates = estimates.filter((e) => new Date(e.created_at).getTime() >= cutoff);
  const totalLeads = filteredEstimates.length;
  const convertedLeads = filteredEstimates.filter((e) => !!e.converted_to_invoice_id).length;
  const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(0) : "—";
  const statusBreakdown: Record<string, number> = {};
  filteredEstimates.forEach((e) => {
    const s = e.status || "new";
    statusBreakdown[s] = (statusBreakdown[s] || 0) + 1;
  });

  // Estimate value
  const totalEstimateValue = filteredEstimates.reduce((sum, e) => {
    const ed = e.estimate_data || {};
    return sum + ((ed.total_projected_low || 0) + (ed.total_projected_high || 0)) / 2;
  }, 0);

  // Project type breakdown
  const projectTypeCounts: Record<string, number> = {};
  filteredEstimates.forEach((e) => {
    const t = e.project_type || "Other";
    projectTypeCounts[t] = (projectTypeCounts[t] || 0) + 1;
  });
  const projectTypeEntries = Object.entries(projectTypeCounts).sort((a, b) => b[1] - a[1]);

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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button type="button" onClick={() => router.push("/admin/projects")} className="text-brand-muted hover:text-brand-charcoal transition-colors shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </button>
            <div className="min-w-0">
              <h1 className="font-editorial text-lg sm:text-xl font-bold tracking-tight text-brand-charcoal">Site Analytics</h1>
              <p className="text-[11px] font-medium tracking-wide text-brand-muted">wdocustom.com &middot; Proposal views &middot; Lead funnel</p>
            </div>
          </div>

          {/* Range Picker */}
          <div className="flex gap-1 bg-brand-warm rounded-lg p-0.5 shrink-0">
            {([["7d", "7 Days"], ["30d", "30 Days"], ["all", "All Time"]] as const).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setRange(val)}
                className={`px-3 py-1.5 rounded-md text-[10px] font-bold tracking-wide uppercase transition-all ${
                  range === val ? "bg-white text-brand-charcoal shadow-sm" : "text-brand-muted hover:text-brand-charcoal"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6">

        {/* ─── TOP STATS ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Proposal Views" value={totalViews.toLocaleString()} color="text-brand-charcoal" />
          <StatCard label="Unique Visitors" value={uniqueIPs.toLocaleString()} color="text-brand-charcoal" />
          <StatCard label="New Leads" value={totalLeads.toLocaleString()} color="text-luxury-ochre" />
          <StatCard label="Conversion Rate" value={conversionRate === "—" ? "—" : `${conversionRate}%`} color="text-sage-600" />
        </div>

        {/* ─── VIEWS OVER TIME ─── */}
        {dailyEntries.length > 0 && (
          <div className="bg-white rounded-2xl border border-brand-stone/30 shadow-soft p-5 sm:p-6">
            <h2 className="text-xs font-black text-brand-charcoal uppercase tracking-widest mb-4">Proposal Views Over Time</h2>
            <div className="flex items-end gap-[2px] h-32">
              {dailyEntries.map(([day, count]) => (
                <div key={day} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-brand-charcoal text-white text-[9px] font-bold px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                    {new Date(day + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}: {count} view{count !== 1 ? "s" : ""}
                  </div>
                  <div
                    className="w-full bg-luxury-gold/70 hover:bg-luxury-gold rounded-t transition-colors min-h-[2px]"
                    style={{ height: `${(count / maxDaily) * 100}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-[9px] text-brand-muted font-medium">
                {dailyEntries.length > 0 && new Date(dailyEntries[0][0] + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
              <span className="text-[9px] text-brand-muted font-medium">
                {dailyEntries.length > 0 && new Date(dailyEntries[dailyEntries.length - 1][0] + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </div>
          </div>
        )}

        {/* ─── LEAD FUNNEL ─── */}
        <div className="grid lg:grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-brand-stone/30 shadow-soft p-5 sm:p-6">
            <h2 className="text-xs font-black text-brand-charcoal uppercase tracking-widest mb-4">Lead Funnel</h2>
            <div className="space-y-3">
              {[
                { label: "New Leads", count: statusBreakdown.new || 0, color: "bg-blue-500" },
                { label: "Contacted", count: statusBreakdown.contacted || 0, color: "bg-luxury-gold" },
                { label: "Consultation Set", count: statusBreakdown.consultation_scheduled || 0, color: "bg-emerald-500" },
                { label: "Converted", count: convertedLeads, color: "bg-sage-500" },
              ].map((stage) => (
                <div key={stage.label} className="flex items-center gap-3">
                  <div className="w-24 text-right">
                    <span className="text-[11px] font-bold text-brand-muted">{stage.label}</span>
                  </div>
                  <div className="flex-1 bg-brand-warm rounded-full h-6 overflow-hidden">
                    <div
                      className={`h-full ${stage.color} rounded-full flex items-center justify-end pr-2 transition-all duration-700`}
                      style={{ width: totalLeads > 0 ? `${Math.max((stage.count / totalLeads) * 100, stage.count > 0 ? 8 : 0)}%` : "0%" }}
                    >
                      {stage.count > 0 && <span className="text-[10px] font-black text-white">{stage.count}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {totalLeads > 0 && (
              <div className="mt-4 pt-4 border-t border-brand-stone/20 flex items-center justify-between">
                <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">Est. Pipeline Value</span>
                <span className="text-lg font-black text-brand-charcoal" style={{ fontVariantNumeric: "tabular-nums" }}>
                  ${totalEstimateValue >= 1000 ? `${(totalEstimateValue / 1000).toFixed(0)}k` : totalEstimateValue.toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-brand-stone/30 shadow-soft p-5 sm:p-6">
            <h2 className="text-xs font-black text-brand-charcoal uppercase tracking-widest mb-4">Leads by Project Type</h2>
            {projectTypeEntries.length > 0 ? (
              <div className="space-y-2">
                {projectTypeEntries.map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between py-2 border-b border-brand-stone/10 last:border-0">
                    <span className="text-sm font-semibold text-brand-charcoal">{type}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-brand-warm rounded-full h-2 overflow-hidden">
                        <div className="h-full bg-luxury-gold rounded-full" style={{ width: `${(count / totalLeads) * 100}%` }} />
                      </div>
                      <span className="text-xs font-bold text-brand-muted w-6 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-brand-muted">No leads in this period</p>
            )}
          </div>
        </div>

        {/* ─── BREAKDOWNS: DEVICE / BROWSER / REFERRER ─── */}
        <div className="grid sm:grid-cols-3 gap-3">
          <BreakdownCard title="Devices" entries={deviceEntries} total={totalViews} colorFn={deviceColor} />
          <BreakdownCard title="Browsers" entries={browserEntries} total={totalViews} />
          <BreakdownCard title="Traffic Sources" entries={referrerEntries} total={totalViews} />
        </div>

        {/* ─── PER-PROPOSAL TABLE ─── */}
        <div className="bg-white rounded-2xl border border-brand-stone/30 shadow-soft overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-brand-stone/20">
            <h2 className="text-xs font-black text-brand-charcoal uppercase tracking-widest">Proposal Page Views</h2>
          </div>
          {proposalStats.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-brand-stone/15 bg-brand-warm/30">
                    <th className="px-5 py-3 text-[10px] font-black text-brand-muted uppercase tracking-widest">Proposal</th>
                    <th className="px-4 py-3 text-[10px] font-black text-brand-muted uppercase tracking-widest text-right">Views</th>
                    <th className="px-4 py-3 text-[10px] font-black text-brand-muted uppercase tracking-widest text-right">Unique</th>
                    <th className="px-5 py-3 text-[10px] font-black text-brand-muted uppercase tracking-widest text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {proposalStats.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => router.push(`/admin/projects/${p.id}`)}
                      className="border-b border-brand-stone/10 hover:bg-brand-alabaster/60 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3 text-sm font-semibold text-brand-charcoal">{p.label}</td>
                      <td className="px-4 py-3 text-sm font-bold text-brand-charcoal text-right" style={{ fontVariantNumeric: "tabular-nums" }}>{p.views}</td>
                      <td className="px-4 py-3 text-sm font-medium text-brand-muted text-right" style={{ fontVariantNumeric: "tabular-nums" }}>{p.uniqueIPs}</td>
                      <td className="px-5 py-3 text-right">
                        <span
                          className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border ${
                            p.status === "approved"
                              ? "bg-sage-50 text-sage-700 border-sage-200"
                              : "bg-luxury-soft text-luxury-ochre border-luxury-champagne"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${p.status === "approved" ? "bg-sage-500" : "bg-luxury-gold"}`} />
                          {p.status === "approved" ? "Approved" : "Pending"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-brand-muted">No proposal views in this period</p>
            </div>
          )}
        </div>

        {/* ─── RECENT ACTIVITY FEED ─── */}
        <div className="bg-white rounded-2xl border border-brand-stone/30 shadow-soft p-5 sm:p-6">
          <h2 className="text-xs font-black text-brand-charcoal uppercase tracking-widest mb-4">Recent Activity</h2>
          <div className="space-y-0 max-h-80 overflow-y-auto">
            {filteredHits
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .slice(0, 50)
              .map((hit, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5 border-b border-brand-stone/10 last:border-0">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-[9px] font-black shrink-0 ${
                    hit.device === "iOS" ? "bg-blue-500" : hit.device === "Android" ? "bg-green-500" : "bg-slate-600"
                  }`}>
                    {hit.device?.[0] || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-brand-charcoal truncate">
                      Viewed <span className="text-luxury-ochre">{hit.label}</span>
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-brand-muted">{hit.browser}</span>
                      {hit.referrer && hit.referrer !== "Direct" && (
                        <>
                          <span className="text-brand-stone/30">&middot;</span>
                          <span className="text-[10px] text-brand-muted truncate">{hit.referrer}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] font-medium text-brand-muted shrink-0 whitespace-nowrap">
                    {formatTimestamp(hit.timestamp)}
                  </span>
                </div>
              ))}
            {filteredHits.length === 0 && (
              <p className="text-sm text-brand-muted py-6 text-center">No activity in this period</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-brand-stone/30 shadow-soft p-4 sm:p-5">
      <p className="text-[9px] sm:text-[10px] font-semibold text-brand-muted uppercase tracking-wider">{label}</p>
      <p className={`text-2xl sm:text-3xl font-black mt-1 ${color}`} style={{ fontVariantNumeric: "tabular-nums" }}>{value}</p>
    </div>
  );
}

function BreakdownCard({ title, entries, total, colorFn }: { title: string; entries: [string, number][]; total: number; colorFn?: (key: string) => string }) {
  return (
    <div className="bg-white rounded-2xl border border-brand-stone/30 shadow-soft p-5">
      <h2 className="text-xs font-black text-brand-charcoal uppercase tracking-widest mb-3">{title}</h2>
      <div className="space-y-2">
        {entries.slice(0, 6).map(([key, count]) => (
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

function deviceColor(device: string): string {
  if (device === "iOS") return "bg-blue-500";
  if (device === "Android") return "bg-green-500";
  if (device === "Desktop") return "bg-slate-600";
  return "bg-brand-muted";
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  const now = Date.now();
  const ms = now - d.getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
