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
        .is("parent_id", null) // Exclude child change order entries from index loop
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
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center font-sans">
      <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans antialiased pb-24 text-left">
      
      {/* Top Professional Control Hub Banner */}
      <div className="bg-slate-900 text-white shadow-md border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="space-y-0.5">
            <h1 className="text-base font-extrabold tracking-tight uppercase text-slate-100">Project Master Index Ledger</h1>
            <p className="text-[10px] font-sans font-bold tracking-widest text-slate-400 uppercase">Operational Workspaces</p>
          </div>
          
          {/* Fixed Navigation Trigger Routing Back to /admin */}
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-black text-[10px] px-4 py-2.5 rounded-xl border border-slate-700 uppercase tracking-wider transition-all duration-200 hover:shadow-md shadow-sm outline-none"
          >
            ← Estimator
          </button>
        </div>
      </div>

      {/* Main List Body Section */}
      <div className="max-w-5xl mx-auto px-4 pt-6">
        <div className="bg-white border border-slate-200/60 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] overflow-hidden">
          <div className="divide-y divide-slate-100">
            {projects.map((proj) => (
              <div 
                key={proj.id} 
                onClick={() => router.push(`/admin/projects/${proj.id}`)}
                className="p-5 flex justify-between items-center hover:bg-slate-50 cursor-pointer transition-all duration-150 text-xs"
              >
                <div className="space-y-0.5 text-left">
                  <p className="font-extrabold text-slate-900 text-[15px]">{proj.homeowner_name || "Unassigned Client Record"}</p>
                  <p className="text-[13px] text-slate-500 font-medium">{proj.job_address || "No target address specified."}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-sans font-black text-slate-950 text-sm tabular-nums">
                    ${toNum(proj.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  {toNum(proj.view_count) > 0 && (
                    <span className="bg-blue-50 text-blue-600 border border-blue-100 font-black text-[8px] px-2 py-0.5 rounded-full tracking-wider">
                      👁 {proj.view_count}
                    </span>
                  )}
                  <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-black tracking-wide border ${
                    proj.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                  }`}>
                    {proj.status || "pending"}
                  </span>
                </div>
              </div>
            ))}

            {projects.length === 0 && (
              <p className="p-16 text-center text-slate-400 italic font-medium text-sm">No active projects in the ledger yet. Create your first project to get started.</p>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}