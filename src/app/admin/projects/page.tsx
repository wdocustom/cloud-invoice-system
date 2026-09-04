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
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function deleteLead(id: string) {
    if (!confirm("Delete this lead permanently? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res = await fetch("/api/delete-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      setEstimates((prev) => prev.filter((e) => e.id !== id));
    } catch {
      alert("Failed to delete lead. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

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
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-6 w-6 animate-spin rounded-full border border-taupe-300/70 border-t-espresso-900" />
        <p className="font-sans text-[10px] uppercase tracking-architect text-taupe-400">Loading portfolio</p>
      </div>
    </div>
  );

  return (
    <div className="pb-28 text-left">

      {/* Sticky title block */}
      <div className="sticky top-0 z-20 border-b border-taupe-200/70 bg-alabaster-50/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8 sm:py-5">
          <div className="min-w-0">
            <p className="eyebrow">Portfolio</p>
            <h1 className="display-md mt-1 truncate">Project Portfolio</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/admin/analytics")}
              className="btn-outline px-3 sm:px-5"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
              <span className="hidden sm:inline">Analytics</span>
            </button>
            <button
              type="button"
              onClick={() => router.push("/admin")}
              className="btn-ink px-3 sm:px-5"
            >
              <span className="sm:hidden">+</span>
              <span className="hidden sm:inline">New Estimate</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-7 sm:px-8 sm:pt-9">

        {/* Index tabs */}
        <div className="tabstrip mb-8">
          <button
            type="button"
            onClick={() => setTab("projects")}
            className={`tab ${tab === "projects" ? "tab-active" : ""}`}
          >
            Projects
            <span className="ml-2 font-normal tabular-nums text-taupe-300">{projects.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setTab("leads")}
            className={`tab ${tab === "leads" ? "tab-active" : ""}`}
          >
            Leads
            <span className="ml-2 font-normal tabular-nums text-taupe-300">{estimates.length}</span>
            {newLeads > 0 && (
              <span className="ml-1.5 inline-flex h-[15px] min-w-[15px] items-center justify-center rounded-edge bg-brass-500 px-1 text-[9px] font-medium tabular-nums text-white">
                {newLeads}
              </span>
            )}
          </button>
        </div>

        {tab === "projects" && (
          <>
            {/* Metrics ledger */}
            <div className="mb-9 grid grid-cols-2 gap-px overflow-hidden rounded-panel bg-taupe-200/60 shadow-riser ring-1 ring-taupe-200/50 sm:grid-cols-3">
              <div className="bg-white px-6 py-7 transition-colors duration-300 ease-architect hover:bg-alabaster-50">
                <p className="eyebrow">Projects</p>
                <p className="figure mt-2 text-[1.75rem] leading-none sm:text-[2rem]">{projects.length}</p>
              </div>
              <div className="bg-white px-6 py-7 transition-colors duration-300 ease-architect hover:bg-alabaster-50">
                <p className="eyebrow">Total Value</p>
                <p className="figure mt-2 truncate text-[1.75rem] leading-none sm:text-[2rem]">
                  <span className="text-taupe-300">$</span>{totalValue >= 1000 ? `${(totalValue / 1000).toFixed(1)}k` : totalValue.toLocaleString()}
                </p>
              </div>
              <div className="col-span-2 bg-white px-6 py-7 transition-colors duration-300 ease-architect hover:bg-alabaster-50 sm:col-span-1">
                <p className="eyebrow">Approved</p>
                <p className="figure mt-2 text-[1.75rem] leading-none text-patina-600 sm:text-[2rem]">{approvedCount}</p>
              </div>
            </div>

            {/* Project ledger */}
            <div className="border-t border-taupe-200/70">
              {projects.map((proj) => {
                const isApproved = proj.status === "approved";
                return (
                  <div
                    key={proj.id}
                    onClick={() => router.push(`/admin/projects/${proj.id}`)}
                    className="group relative cursor-pointer border-b border-taupe-200/55 bg-transparent px-2 py-5 transition-colors duration-300 ease-architect hover:bg-white sm:px-5 sm:py-7"
                  >
                    <span aria-hidden className="absolute bottom-0 left-0 top-0 w-px origin-top scale-y-0 bg-brass-400 opacity-0 transition-all duration-300 ease-architect group-hover:scale-y-100 group-hover:opacity-100" />

                    <div className="flex items-start gap-4">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center border border-taupe-200 bg-alabaster-100 font-display text-[15px] text-taupe-500 transition-colors duration-300 ease-architect group-hover:border-brass-300 group-hover:bg-brass-50 group-hover:text-brass-600">
                        {(proj.homeowner_name || "?")[0].toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                          {proj.proposal_number && (
                            <span className="font-sans text-[10px] tracking-architect text-taupe-300">{proj.proposal_number}</span>
                          )}
                          <span className={`badge ${isApproved ? "badge-approved" : proj.status === "declined" ? "badge-declined" : "badge-pending"}`}>
                            <span className={`badge-dot ${isApproved ? "bg-patina-500" : proj.status === "declined" ? "bg-clay-500" : "bg-brass-400"}`} />
                            {isApproved ? "Approved" : proj.status === "declined" ? "Declined" : "Pending"}
                          </span>
                        </div>
                        <p className="mt-1 truncate font-display text-[1.0625rem] leading-snug tracking-[-0.01em] text-espresso-900 sm:text-[1.1875rem]">
                          {proj.homeowner_name || "Unassigned Client"}
                        </p>
                        <p className="mt-0.5 truncate text-[12.5px] text-taupe-500">
                          {proj.job_address || "Address pending"}
                        </p>

                        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 sm:hidden">
                          <span className="figure text-[15px]">
                            ${toNum(proj.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                          {toNum(proj.view_count) > 0 && (
                            <span className="font-sans text-[10px] uppercase tracking-architect text-taupe-400 tabular-nums">
                              {proj.view_count} views
                            </span>
                          )}
                          {proj.project_title && (
                            <span className="truncate font-sans text-[10px] uppercase tracking-architect text-brass-500">{proj.project_title}</span>
                          )}
                        </div>
                      </div>

                      <div className="hidden shrink-0 flex-col items-end gap-1.5 sm:flex">
                        <span className="figure text-[16px]">
                          ${toNum(proj.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        <div className="flex items-center gap-3">
                          {toNum(proj.view_count) > 0 && (
                            <span className="font-sans text-[10px] uppercase tracking-architect text-taupe-400 tabular-nums">
                              {proj.view_count} views
                            </span>
                          )}
                          {proj.project_title && (
                            <span className="max-w-[140px] truncate font-sans text-[10px] uppercase tracking-architect text-brass-500">{proj.project_title}</span>
                          )}
                        </div>
                      </div>

                      <svg className="mt-1 hidden h-3.5 w-3.5 shrink-0 text-taupe-300 transition-all duration-300 ease-architect group-hover:translate-x-0.5 group-hover:text-espresso-900 sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                );
              })}

              {projects.length === 0 && (
                <div className="blueprint-grid border-b border-taupe-200/55 px-8 py-20 text-center">
                  <p className="display-sm">No projects yet</p>
                  <p className="mx-auto mt-2 max-w-xs text-[13px] leading-relaxed text-taupe-500">
                    Create your first estimate to open a project record.
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {tab === "leads" && (
          <>
            {/* Lead metrics */}
            <div className="mb-9 grid grid-cols-2 gap-px overflow-hidden rounded-panel bg-taupe-200/60 shadow-riser ring-1 ring-taupe-200/50 sm:grid-cols-3">
              <div className="bg-white px-6 py-7 transition-colors duration-300 ease-architect hover:bg-alabaster-50">
                <p className="eyebrow">Total Leads</p>
                <p className="figure mt-2 text-[1.75rem] leading-none sm:text-[2rem]">{estimates.length}</p>
              </div>
              <div className="bg-white px-6 py-7 transition-colors duration-300 ease-architect hover:bg-alabaster-50">
                <p className="eyebrow">New</p>
                <p className="figure mt-2 text-[1.75rem] leading-none text-brass-500 sm:text-[2rem]">{newLeads}</p>
              </div>
              <div className="col-span-2 bg-white px-6 py-7 transition-colors duration-300 ease-architect hover:bg-alabaster-50 sm:col-span-1">
                <p className="eyebrow">Unconverted</p>
                <p className="figure mt-2 text-[1.75rem] leading-none sm:text-[2rem]">{unconvertedEstimates.length}</p>
              </div>
            </div>

            {/* Lead ledger */}
            <div className="border-t border-taupe-200/70">
              {estimates.map((est) => {
                const ed = est.estimate_data || {};
                const isConverted = !!est.converted_to_invoice_id;
                const statusClasses: Record<string, string> = {
                  new: "badge-ink",
                  contacted: "badge-pending",
                  consultation_scheduled: "badge-neutral",
                  converted: "badge-approved",
                };
                const statusDots: Record<string, string> = {
                  new: "bg-alabaster-100",
                  contacted: "bg-brass-400",
                  consultation_scheduled: "bg-taupe-400",
                  converted: "bg-patina-500",
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
                    className="group relative cursor-pointer border-b border-taupe-200/55 px-2 py-5 transition-colors duration-300 ease-architect hover:bg-white sm:px-5 sm:py-7"
                  >
                    <span aria-hidden className="absolute bottom-0 left-0 top-0 w-px origin-top scale-y-0 bg-brass-400 opacity-0 transition-all duration-300 ease-architect group-hover:scale-y-100 group-hover:opacity-100" />

                    <div className="flex items-start gap-4">
                      <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center border font-display text-[15px] transition-colors duration-300 ease-architect ${
                        isConverted
                          ? "border-patina-200 bg-patina-50 text-patina-600"
                          : "border-taupe-200 bg-alabaster-100 text-taupe-500 group-hover:border-brass-300 group-hover:bg-brass-50 group-hover:text-brass-600"
                      }`}>
                        {(est.name || est.project_type || "?")[0].toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                          {est.estimate_number && (
                            <span className="font-sans text-[10px] tracking-architect text-taupe-300">{est.estimate_number}</span>
                          )}
                          <span className={`badge ${statusClasses[est.status] || statusClasses.new}`}>
                            <span className={`badge-dot ${statusDots[est.status] || statusDots.new}`} />
                            {statusLabels[est.status] || "New Lead"}
                          </span>
                        </div>
                        <p className="mt-1 truncate font-display text-[1.0625rem] leading-snug tracking-[-0.01em] text-espresso-900 sm:text-[1.1875rem]">
                          {est.name || "Anonymous"}
                        </p>
                        <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 text-[12.5px] text-taupe-500">
                          <span className="truncate">{est.project_type}</span>
                          {est.email && (
                            <>
                              <span aria-hidden className="text-taupe-300">·</span>
                              <span className="truncate text-[12px] text-taupe-400">{est.email}</span>
                            </>
                          )}
                        </div>

                        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 sm:hidden">
                          <span className="figure text-[14px]">
                            ${(ed.total_projected_low || 0).toLocaleString()} — ${(ed.total_projected_high || 0).toLocaleString()}
                          </span>
                          <span className="font-sans text-[10px] uppercase tracking-architect text-taupe-400">{createdAgo}</span>
                        </div>
                      </div>

                      <div className="hidden shrink-0 flex-col items-end gap-1.5 sm:flex">
                        <span className="figure text-[14.5px]">
                          ${(ed.total_projected_low || 0).toLocaleString()} — ${(ed.total_projected_high || 0).toLocaleString()}
                        </span>
                        <div className="flex items-center gap-3 font-sans text-[10px] uppercase tracking-architect text-taupe-400">
                          {reminderCount > 0 && (
                            <span>{reminderCount} reminder{reminderCount !== 1 ? "s" : ""}</span>
                          )}
                          <span>{createdAgo}</span>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); deleteLead(est.id); }}
                          disabled={deletingId === est.id}
                          className="flex h-7 w-7 items-center justify-center rounded-edge text-taupe-300 transition-all duration-200 ease-architect hover:bg-clay-50 hover:text-clay-600 focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                          title="Delete lead"
                        >
                          {deletingId === est.id ? (
                            <div className="h-3.5 w-3.5 animate-spin rounded-full border border-clay-200 border-t-clay-500" />
                          ) : (
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          )}
                        </button>
                        <svg className="mt-0.5 hidden h-3.5 w-3.5 text-taupe-300 transition-all duration-300 ease-architect group-hover:translate-x-0.5 group-hover:text-espresso-900 sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                );
              })}

              {estimates.length === 0 && (
                <div className="blueprint-grid border-b border-taupe-200/55 px-8 py-20 text-center">
                  <p className="display-sm">No leads yet</p>
                  <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-taupe-500">
                    Leads appear here when homeowners use the instant estimate tool on your website.
                  </p>
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
