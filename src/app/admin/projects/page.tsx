"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toNum } from "@/lib/utils";
import { toast } from "@/lib/toast";

export default function ProjectsIndexLedger() {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveProjectsList();
  }, []);

  async function fetchActiveProjectsList() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .is("parent_id", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setProjects(data);
    } catch (err) {
      console.error("Index ledger retrieval exception:", err);
    } finally {
      setLoading(false);
    }
  }

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

      {/* Premium Header */}
      <div className="border-b border-brand-stone/60 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="space-y-0.5">
            <h1 className="font-editorial text-xl font-bold tracking-tight text-brand-charcoal">Project Portfolio</h1>
            <p className="text-[11px] font-medium tracking-wide text-brand-muted">Active workspaces & proposals</p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="bg-brand-charcoal hover:bg-brand-charcoal/90 text-white font-semibold text-[11px] px-5 py-2.5 rounded-xl tracking-wide transition-all duration-200 hover:shadow-elevated outline-none"
          >
            ← New Estimate
          </button>
        </div>
      </div>

      {/* Portfolio Grid */}
      <div className="max-w-5xl mx-auto px-6 pt-8">

        {/* Stats Summary Row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 shadow-soft border border-brand-stone/30">
            <p className="text-[10px] font-semibold text-brand-muted uppercase tracking-wider">Total Projects</p>
            <p className="text-2xl font-bold text-brand-charcoal mt-1" style={{fontVariantNumeric:'tabular-nums'}}>{projects.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-soft border border-brand-stone/30">
            <p className="text-[10px] font-semibold text-brand-muted uppercase tracking-wider">Active Value</p>
            <p className="text-2xl font-bold text-brand-charcoal mt-1" style={{fontVariantNumeric:'tabular-nums'}}>
              ${projects.reduce((s, p) => s + toNum(p.amount), 0).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-soft border border-brand-stone/30">
            <p className="text-[10px] font-semibold text-brand-muted uppercase tracking-wider">Approved</p>
            <p className="text-2xl font-bold text-sage-600 mt-1" style={{fontVariantNumeric:'tabular-nums'}}>
              {projects.filter(p => p.status === 'approved').length}
            </p>
          </div>
        </div>

        {/* Project Cards */}
        <div className="space-y-3">
          {projects.map((proj) => (
            <div
              key={proj.id}
              onClick={() => router.push(`/admin/projects/${proj.id}`)}
              className="group bg-white rounded-2xl border border-brand-stone/30 shadow-soft hover:shadow-elevated p-5 cursor-pointer transition-all duration-300 hover:border-brand-stone/60 relative overflow-hidden"
            >
              <div className="flex items-center gap-5">
                {/* Thumbnail Avatar */}
                <div className="w-12 h-12 rounded-xl bg-brand-warm flex items-center justify-center shrink-0 border border-brand-stone/40 group-hover:border-luxury-gold/30 transition-colors">
                  <span className="text-lg font-editorial font-bold text-brand-muted group-hover:text-luxury-gold transition-colors">
                    {(proj.homeowner_name || "?")[0].toUpperCase()}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2.5">
                    <p className="font-semibold text-brand-charcoal text-[15px] tracking-tight truncate">{proj.homeowner_name || "Unassigned Client"}</p>
                    {proj.status === 'approved' ? (
                      <span className="inline-flex items-center gap-1 bg-sage-50 text-sage-700 border border-sage-200 font-semibold text-[9px] px-2 py-0.5 rounded-full tracking-wide uppercase">
                        <span className="w-1.5 h-1.5 rounded-full bg-sage-500" />
                        Approved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-luxury-soft text-luxury-ochre border border-luxury-champagne font-semibold text-[9px] px-2 py-0.5 rounded-full tracking-wide uppercase">
                        <span className="w-1.5 h-1.5 rounded-full bg-luxury-gold" />
                        Pending
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] text-brand-muted font-medium truncate">{proj.job_address || "Address pending"}</p>
                </div>

                {/* Right Side */}
                <div className="flex items-center gap-4 shrink-0">
                  {toNum(proj.view_count) > 0 && (
                    <div className="flex items-center gap-1.5 bg-brand-warm border border-brand-stone/40 px-2.5 py-1 rounded-lg">
                      <svg className="w-3 h-3 text-brand-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span className="text-[10px] font-bold text-brand-muted" style={{fontVariantNumeric:'tabular-nums'}}>{proj.view_count}</span>
                    </div>
                  )}
                  <span className="font-semibold text-brand-charcoal text-base tracking-tight" style={{fontVariantNumeric:'tabular-nums'}}>
                    ${toNum(proj.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <svg className="w-4 h-4 text-brand-muted/50 group-hover:text-brand-charcoal group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          ))}

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
      </div>
    </div>
  );
}
