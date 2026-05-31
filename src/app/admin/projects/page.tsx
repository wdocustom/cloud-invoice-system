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
      .is("parent_id", null) // Excludes individual change orders from duplicating onto the master project index
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans text-slate-400">
      <div className="flex flex-col items-center gap-2">
        <div className="w-6 h-6 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Syncing Production Backlog...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased pb-24 text-left">
      <div className="max-w-4xl mx-auto px-4 pt-8 space-y-6">
        
        {/* Command Header Banner */}
        <div className="bg-slate-900 text-white rounded-xl p-6 sm:p-8 flex flex-col sm:flex-row justify-between sm:items-center gap-4 shadow-md">
          <div className="space-y-1">
            <h1 className="text-xl font-black tracking-tight uppercase">WDO Custom Operations Command</h1>
            <p className="text-xs text-slate-400 font-medium">Select a project matrix file index below to update build phases, manage design specifications, or copy links.</p>
          </div>
          <span className="text-[10px] bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-400 font-mono tracking-widest uppercase shrink-0">
            MGR: LIC-1901422
          </span>
        </div>

        {/* Project Backlog List */}
        <div className="space-y-3">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Active Construction Pipeline Backlog</h2>
          
          <div className="space-y-3">
            {projects.map((project) => {
              const phaseIdx = project.current_phase_index || 0;
              const activePhaseName = project.payment_phases?.[phaseIdx]?.name || "Initial Mobilization Down";

              return (
                <div 
                  key={project.id} 
                  onClick={() => router.push(`/admin/projects/${project.id}`)}
                  className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-slate-400 transition-all duration-150 cursor-pointer flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4"
                >
                  <div className="space-y-2 text-left">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded border ${
                        project.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                      }`}>
                        {project.status}
                      </span>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded border ${
                        project.deposit_cleared ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-red-50 text-red-700 border-red-100'
                      }`}>
                        {project.deposit_cleared ? "💰 Deposit Paid" : "🛑 Unpaid Deposit"}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base tracking-wide">{project.homeowner_name}</h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">📍 Location: {project.job_address}</p>
                      <p className="text-[11px] text-blue-600 font-bold mt-1.5 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /> Live Step: {activePhaseName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-8 border-t sm:border-transparent border-slate-100 pt-3 sm:pt-0 shrink-0">
                    <div className="text-left sm:text-right">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Locked Contract Value</p>
                      <p className="text-sm font-mono font-bold text-slate-900 mt-0.5">${project.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                    <button 
                      type="button" 
                      onClick={(e) => handleDeleteProject(project.id, project.homeowner_name, e)}
                      className="text-[10px] font-black uppercase tracking-wider text-red-500 hover:text-red-700 border border-transparent hover:border-red-100 px-3.5 py-2 rounded-xl bg-red-50/50 transition-all outline-none"
                    >
                      Delete File
                    </button>
                  </div>
                </div>
              );
            })}

            {projects.length === 0 && (
              <div className="bg-white border border-slate-200 p-12 text-center text-xs text-slate-400 font-medium rounded-xl shadow-sm">
                No pipeline project files loaded. Seed a template workbook to instantiate the backlog.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}