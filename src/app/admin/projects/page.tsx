"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toNum } from "@/lib/utils";

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
      <div className="bg-slate-900 text-white shadow-sm border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="space-y-0.5">
            <h1 className="text-base font-extrabold tracking-tight uppercase text-slate-100">Project Master Index Ledger</h1>
            <p className="text-[10px] font-sans font-bold tracking-widest text-slate-400 uppercase">Operational Workspaces</p>
          </div>
          
          {/* Fixed Navigation Trigger Routing Back to /admin */}
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-black text-[10px] px-4 py-2.5 rounded-xl border border-slate-700 uppercase tracking-wider transition shadow-sm outline-none"
          >
            ← Estimator
          </button>
        </div>
      </div>

      {/* Main List Body Section */}
      <div className="max-w-5xl mx-auto px-4 pt-6">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100">
            {projects.map((proj) => (
              <div 
                key={proj.id} 
                onClick={() => router.push(`/admin/projects/${proj.id}`)}
                className="p-4 flex justify-between items-center hover:bg-slate-50/50 cursor-pointer transition-colors text-xs"
              >
                <div className="space-y-0.5 text-left">
                  <p className="font-extrabold text-slate-900 text-sm">{proj.homeowner_name || "Unassigned Client Record"}</p>
                  <p className="text-slate-500 font-medium">{proj.job_address || "No target address specified."}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="font-sans font-black text-slate-950 text-sm">
                    ${toNum(proj.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                    proj.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                  }`}>
                    {proj.status || "pending"}
                  </span>
                </div>
              </div>
            ))}

            {projects.length === 0 && (
              <p className="p-12 text-center text-slate-400 italic font-medium">No project files found inside database ledger loops.</p>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}