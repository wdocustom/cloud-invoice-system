"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

interface Project {
  id: string;
  created_at: string;
  homeowner_name: string;
  homeowner_email: string;
  job_address: string;
  amount: number;
  status: string;
  estimated_start_date?: string;
  project_length?: string;
  deposit_cleared?: boolean;
  payment_phases?: any[];
  current_phase_index?: number;
}

export default function ContractorDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    setLoading(true);
    const { data } = await supabase
      .from("invoices")
      .select("id, created_at, homeowner_name, homeowner_email, job_address, amount, status, estimated_start_date, project_length, deposit_cleared, payment_phases, current_phase_index")
      .is("parent_id", null)
      .order("created_at", { ascending: false });

    if (data) setProjects(data);
    setLoading(false);
  }

  const handleDeleteProject = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Permanently delete the construction project file framework for ${name}?`)) return;

    const { error } = await supabase
      .from("invoices")
      .delete()
      .eq("id", id);

    if (error) alert("Deletion error: " + error.message);
    else fetchProjects();
  };

  if (loading) return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center font-sans">
      <div className="flex flex-col items-center gap-3">
        <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">Querying System Matrix...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans antialiased pb-24 text-left selection:bg-slate-900/10">
      
      {/* Premium Dark Slate Top Banner */}
      <div className="bg-slate-900 text-white border-b border-slate-800 shadow-sm sticky top-0 z-50 backdrop-blur-md bg-slate-900/95">
        <div className="max-w-4xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="space-y-0.5">
            <h1 className="text-sm font-black tracking-wider uppercase text-slate-100">WDO Custom</h1>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Operations Central Command Pipeline</p>
          </div>
          <span className="text-[9px] font-mono bg-slate-950 border border-slate-800/80 px-2.5 py-1 rounded-md text-slate-400 tracking-widest uppercase">
            REG-1901422
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-8 space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Backlog Pipelines Ledger</h2>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded-full">{projects.length} files</span>
        </div>
        
        {/* Dynamic Project Streamlined Feed rows */}
        <div className="space-y-2.5">
          {projects.map((project) => {
            const phaseIdx = project.current_phase_index || 0;
            const activePhaseName = project.payment_phases?.[phaseIdx]?.name || "Mobilization Down Frame";

            return (
              <div 
                key={project.id} 
                onClick={() => router.push(`/admin/projects/${project.id}`)}
                className="bg-white border border-slate-200/60 rounded-xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-md hover:border-slate-300 transition-all duration-200 ease-in-out cursor-pointer flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 group"
              >
                <div className="space-y-2 text-left flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${
                      project.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                    }`}>
                      • {project.status}
                    </span>
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${
                      project.deposit_cleared ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-red-50 text-red-700 border-red-100'
                    }`}>
                      {project.deposit_cleared ? "Paid Deposit" : "Unpaid Deposit"}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base tracking-tight group-hover:text-blue-600 transition-colors">{project.homeowner_name}</h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">📍 Jobsite Framework: {project.job_address}</p>
                    <p className="text-[11px] text-slate-400 font-medium mt-2 flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg w-fit">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /> Live Target Phase: <span className="font-bold text-slate-700">{activePhaseName}</span>
                    </p>
                  </div>
                </div>

                {/* Tabular data mapping alignment layout */}
                <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-transparent border-slate-100 pt-3 sm:pt-0 shrink-0">
                  <div className="text-left sm:text-right space-y-0.5">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Contract Valuation</p>
                    <p className="text-base font-mono font-bold text-slate-900 tracking-tight">${project.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={(e) => handleDeleteProject(project.id, project.homeowner_name, e)}
                    className="text-[10px] font-bold uppercase tracking-wider text-red-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100/50 p-2 rounded-xl transition duration-150 ease-in-out outline-none min-h-[38px]"
                  >
                    Delete File
                  </button>
                </div>
              </div>
            );
          })}

          {projects.length === 0 && (
            <div className="bg-white border border-slate-200/80 p-12 text-center text-xs text-slate-400 font-medium rounded-xl shadow-sm">
              No active pipeline workflow profiles configured. Seed a template matrix to populate the backlog.
              <div className="mt-1 font-mono text-[10px] text-slate-300">TABLE_STATE_EMPTY</div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}