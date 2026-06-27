"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toNum } from "@/lib/utils";

export default function ProjectsIndexLedger() {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [estimates, setEstimates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"projects" | "leads">("projects");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [projectsRes, estimatesRes] = await Promise.all([
        supabase
          .from("invoices")
          .select("*")
          .is("parent_id", null)
          .order("created_at", { ascending: false }),
        supabase
          .from("estimates")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);

      if (projectsRes.data) setProjects(projectsRes.data);
      if (estimatesRes.data) setEstimates(estimatesRes.data);
    } catch (err) {
      console.error("Data retrieval error:", err);
    } finally {
      setLoading(false);
    }
  }

  const totalValue = projects.reduce((s, p) => s + toNum(p.amount), 0);
  const approvedCount = projects.filter(p => p.status === "approved").length;
  const newLeads = estimates.filter(e => e.status === "new").length;
  const unconvertedEstimates = estimates.filter(e => !e.converted_to_invoice_id);

  if (loading) return (
    <div className="min-h-screen bg-brand-alabaster flex items-center justify-center font-sans">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-brand-charcoal/20 border-t-brand-charcoal rounded-full animate-spin" />
        <p className="text-xs font-medium text-brand-muted tracking-wide">Loading portfolio...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-brand-alabaster text-brand-charcoal font-sans antialiased pb-24 text-left">

      {/* Header */}
      <div className="border-b border-brand-stone/60 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-editorial text-lg sm:text-xl font-bold tracking-tight text-brand-charcoal">Project Portfolio</h1>
            <p className="text-[11px] font-medium tracking-wide text-brand-muted">Active workspaces & proposals</p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="bg-brand-charcoal hover:bg-brand-charcoal/90 text-white font-semibold text-[11px] px-4 sm:px-5 py-2.5 rounded-xl tracking-wide transition-all duration-200 hover:shadow-elevated outline-none shrink-0"
          >
            + New Estimate
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">

        {/* Tabs */}
        <div className="flex gap-1 bg-brand-warm rounded-xl p-1 mb-6">
          <button
            type="button"
            onClick={() => setTab("projects")}
            className={`flex-1 text-center py-2.5 rounded-lg text-xs font-bold tracking-wide uppercase transition-all ${
              tab === "projects"
                ? "bg-white text-brand-charcoal shadow-sm"
                : "text-brand-muted hover:text-brand-charcoal"
            }`}
          >
            Projects ({projects.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("leads")}
            className={`flex-1 text-center py-2.5 rounded-lg text-xs font-bold tracking-wide uppercase transition-all relative ${
              tab === "leads"
                ? "bg-white text-brand-charcoal shadow-sm"
                : "text-brand-muted hover:text-brand-charcoal"
            }`}
          >
            Leads ({estimates.length})
            {newLeads > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                {newLeads}
              </span>
            )}
          </button>
        </div>

        {tab === "projects" && (
          <>
            {/* Stats Row */}
            <div className="bg-white rounded-2xl shadow-soft border border-brand-stone/30 p-4 sm:p-5 mb-6 sm:mb-8">
              <div className="grid grid-cols-3 divide-x divide-brand-stone/30">
                <div className="px-3 sm:px-5 first:pl-0">
                  <p className="text-[9px] sm:text-[10px] font-semibold text-brand-muted uppercase tracking-wider">Projects</p>
                  <p className="text-xl sm:text-2xl font-bold text-brand-charcoal mt-0.5" style={{fontVariantNumeric:"tabular-nums"}}>{projects.length}</p>
                </div>
                <div className="px-3 sm:px-5">
                  <p className="text-[9px] sm:text-[10px] font-semibold text-brand-muted uppercase tracking-wider">Total Value</p>
                  <p className="text-xl sm:text-2xl font-bold text-brand-charcoal mt-0.5 truncate" style={{fontVariantNumeric:"tabular-nums"}}>
                    ${totalValue >= 1000 ? `${(totalValue / 1000).toFixed(1)}k` : totalValue.toLocaleString()}
                  </p>
                </div>
                <div className="px-3 sm:px-5">
                  <p className="text-[9px] sm:text-[10px] font-semibold text-brand-muted uppercase tracking-wider">Approved</p>
                  <p className="text-xl sm:text-2xl font-bold text-sage-600 mt-0.5" style={{fontVariantNumeric:"tabular-nums"}}>{approvedCount}</p>
                </div>
              </div>
            </div>

            {/* Project Cards */}
            <div className="space-y-2.5">
              {projects.map((proj) => {
                const isApproved = proj.status === "approved";
                return (
                  <div
                    key={proj.id}
                    onClick={() => router.push(`/admin/projects/${proj.id}`)}
                    className="group bg-white rounded-2xl border border-brand-stone/30 shadow-soft hover:shadow-elevated cursor-pointer transition-all duration-300 hover:border-brand-stone/60 overflow-hidden"
                  >
                    <div className="p-4 sm:p-5">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-brand-warm flex items-center justify-center shrink-0 border border-brand-stone/40 group-hover:border-luxury-gold/30 transition-colors">
                          <span className="text-base sm:text-lg font-editorial font-bold text-brand-muted group-hover:text-luxury-gold transition-colors">
                            {(proj.homeowner_name || "?")[0].toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-brand-charcoal text-[14px] sm:text-[15px] tracking-tight truncate">
                              {proj.homeowner_name || "Unassigned Client"}
                            </p>
                            <span className={`inline-flex items-center gap-1 font-semibold text-[9px] px-2 py-0.5 rounded-full tracking-wide uppercase shrink-0 ${
                              isApproved
                                ? "bg-sage-50 text-sage-700 border border-sage-200"
                                : "bg-luxury-soft text-luxury-ochre border border-luxury-champagne"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isApproved ? "bg-sage-500" : "bg-luxury-gold"}`} />
                              {isApproved ? "Approved" : "Pending"}
                            </span>
                          </div>
                          <p className="text-[12px] sm:text-[13px] text-brand-muted font-medium truncate mt-0.5">
                            {proj.job_address || "Address pending"}
                          </p>
                        </div>
                        <svg className="w-4 h-4 text-brand-muted/40 group-hover:text-brand-charcoal group-hover:translate-x-0.5 transition-all shrink-0 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-brand-stone/20">
                        <span className="font-semibold text-brand-charcoal text-[15px] sm:text-base tracking-tight" style={{fontVariantNumeric:"tabular-nums"}}>
                          ${toNum(proj.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        <div className="flex items-center gap-3">
                          {toNum(proj.view_count) > 0 && (
                            <div className="flex items-center gap-1.5 text-brand-muted">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              <span className="text-[11px] font-semibold" style={{fontVariantNumeric:"tabular-nums"}}>{proj.view_count} views</span>
                            </div>
                          )}
                          {proj.project_title && (
                            <span className="text-[10px] font-semibold text-luxury-gold truncate max-w-[120px]">{proj.project_title}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {projects.length === 0 && (
                <div className="bg-white rounded-3xl border border-brand-stone/30 shadow-soft p-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-brand-warm mx-auto flex items-center justify-center mb-4">
                    <span className="text-2xl">📋</span>
                  </div>
                  <p className="font-editorial text-lg text-brand-charcoal font-medium">No projects yet</p>
                  <p className="text-sm text-brand-muted mt-1">Create your first estimate to get started.</p>
                </div>
              )}
            </div>
          </>
        )}

        {tab === "leads" && (
          <>
            {/* Leads Stats */}
            <div className="bg-white rounded-2xl shadow-soft border border-brand-stone/30 p-4 sm:p-5 mb-6 sm:mb-8">
              <div className="grid grid-cols-3 divide-x divide-brand-stone/30">
                <div className="px-3 sm:px-5 first:pl-0">
                  <p className="text-[9px] sm:text-[10px] font-semibold text-brand-muted uppercase tracking-wider">Total Leads</p>
                  <p className="text-xl sm:text-2xl font-bold text-brand-charcoal mt-0.5" style={{fontVariantNumeric:"tabular-nums"}}>{estimates.length}</p>
                </div>
                <div className="px-3 sm:px-5">
                  <p className="text-[9px] sm:text-[10px] font-semibold text-brand-muted uppercase tracking-wider">New</p>
                  <p className="text-xl sm:text-2xl font-bold text-luxury-ochre mt-0.5" style={{fontVariantNumeric:"tabular-nums"}}>{newLeads}</p>
                </div>
                <div className="px-3 sm:px-5">
                  <p className="text-[9px] sm:text-[10px] font-semibold text-brand-muted uppercase tracking-wider">Unconverted</p>
                  <p className="text-xl sm:text-2xl font-bold text-brand-charcoal mt-0.5" style={{fontVariantNumeric:"tabular-nums"}}>{unconvertedEstimates.length}</p>
                </div>
              </div>
            </div>

            {/* Lead Cards */}
            <div className="space-y-2.5">
              {estimates.map((est) => {
                const ed = est.estimate_data || {};
                const isConverted = !!est.converted_to_invoice_id;
                const statusColors: Record<string, string> = {
                  new: "bg-blue-50 text-blue-700 border-blue-200",
                  contacted: "bg-luxury-soft text-luxury-ochre border-luxury-champagne",
                  consultation_scheduled: "bg-emerald-50 text-emerald-700 border-emerald-200",
                  converted: "bg-sage-50 text-sage-700 border-sage-200",
                };
                const statusDots: Record<string, string> = {
                  new: "bg-blue-500",
                  contacted: "bg-luxury-gold",
                  consultation_scheduled: "bg-emerald-500",
                  converted: "bg-sage-500",
                };
                const statusLabels: Record<string, string> = {
                  new: "New Lead",
                  contacted: "Contacted",
                  consultation_scheduled: "Consultation Set",
                  converted: "Converted",
                };
                const reminderCount = Array.isArray(est.reminder_emails) ? est.reminder_emails.length : 0;
                const createdAgo = getTimeAgo(est.created_at);

                return (
                  <div
                    key={est.id}
                    onClick={() => router.push(`/admin/estimates/${est.id}`)}
                    className="group bg-white rounded-2xl border border-brand-stone/30 shadow-soft hover:shadow-elevated cursor-pointer transition-all duration-300 hover:border-brand-stone/60 overflow-hidden"
                  >
                    <div className="p-4 sm:p-5">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                          isConverted
                            ? "bg-sage-50 border-sage-200"
                            : "bg-luxury-soft border-luxury-champagne group-hover:border-luxury-gold/50"
                        }`}>
                          <span className={`text-base sm:text-lg font-editorial font-bold transition-colors ${
                            isConverted ? "text-sage-600" : "text-luxury-ochre"
                          }`}>
                            {(est.name || est.project_type || "?")[0].toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-brand-charcoal text-[14px] sm:text-[15px] tracking-tight truncate">
                              {est.name || "Anonymous"}
                            </p>
                            <span className={`inline-flex items-center gap-1 font-semibold text-[9px] px-2 py-0.5 rounded-full tracking-wide uppercase shrink-0 border ${
                              statusColors[est.status] || statusColors.new
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${statusDots[est.status] || statusDots.new}`} />
                              {statusLabels[est.status] || "New Lead"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[12px] sm:text-[13px] text-brand-muted font-medium truncate">
                              {est.project_type}
                            </p>
                            {est.email && (
                              <>
                                <span className="text-brand-stone/40">·</span>
                                <p className="text-[11px] text-brand-muted truncate">{est.email}</p>
                              </>
                            )}
                          </div>
                        </div>
                        <svg className="w-4 h-4 text-brand-muted/40 group-hover:text-brand-charcoal group-hover:translate-x-0.5 transition-all shrink-0 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-brand-stone/20">
                        <span className="font-semibold text-brand-charcoal text-[14px] tracking-tight" style={{fontVariantNumeric:"tabular-nums"}}>
                          ${(ed.total_projected_low || 0).toLocaleString()} — ${(ed.total_projected_high || 0).toLocaleString()}
                        </span>
                        <div className="flex items-center gap-3 text-[11px] text-brand-muted">
                          {reminderCount > 0 && (
                            <span className="font-semibold">{reminderCount} reminder{reminderCount !== 1 ? "s" : ""}</span>
                          )}
                          <span className="font-medium">{createdAgo}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {estimates.length === 0 && (
                <div className="bg-white rounded-3xl border border-brand-stone/30 shadow-soft p-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-luxury-soft mx-auto flex items-center justify-center mb-4">
                    <span className="text-2xl">✦</span>
                  </div>
                  <p className="font-editorial text-lg text-brand-charcoal font-medium">No leads yet</p>
                  <p className="text-sm text-brand-muted mt-1">Leads appear here when homeowners use the instant estimate tool on your website.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
