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
      .select("id, created_at, homeowner_name, homeowner_email, job_address, amount, status, estimated_start_date, project_length, deposit_cleared")
      .order("created_at", { ascending: false });

    if (data) setProjects(data);
    setLoading(false);
  }

  const handleDeleteProject = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Permanently wipe out construction proposal file for ${name}?`)) return;

    const { error } = await supabase
      .from("invoices")
      .delete()
      .eq("id", id);

    if (error) alert("Deletion error: " + error.message);
    else fetchProjects();
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center font-sans text-slate-500">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Querying Active Pipelines...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased pb-24">
      <div className="max-w-5xl mx-auto px-4 pt-12 space-y-8">
        
        {/* Banner Section */}
        <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-4 text-left shadow-lg">
          <div className="space-y-1">
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-white uppercase">WDO Custom Production Pipeline</h1>
            <p className="text-xs text-slate-400 font-medium">Click a project file index ledger row to execute parameter modifications or build design sheets.</p>
          </div>
          <span className="text-[10px] bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-400 font-mono tracking-widest uppercase align-middle self-start sm:self-center">
            MGR Suite: LIC-1901422
          </span>
        </div>

        {/* Project List */}
        <div className="space-y-4">
          <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest px-1 text-left">Active Operational Backlog Ledger</h2>
          
          <div className="space-y-3">
            {projects.map((project) => (
              <div 
                key={project.id} 
                onClick={() => router.push(`/admin/projects/${project.id}`)}
                className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 shadow-sm hover:border-slate-700 hover:bg-slate-900/60 transition-all duration-200 cursor-pointer flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4"
              >
                <div className="space-y-2 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md border ${
                      project.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {project.status}
                    </span>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md border ${
                      project.deposit_cleared ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                      {project.deposit_cleared ? "💰 Paid" : "🛑 Unpaid"}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-200 text-base tracking-wide">{project.homeowner_name}</h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">📍 {project.job_address}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-8 border-t sm:border-transparent border-slate-900 pt-3 sm:pt-0 shrink-0">
                  <div className="text-left sm:text-right">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Locked Contract Value</p>
                    <p className="text-sm font-mono font-bold text-white mt-0.5">${project.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={(e) => handleDeleteProject(project.id, project.homeowner_name, e)}
                    className="text-[10px] font-black uppercase tracking-wider text-red-400 hover:text-red-300 border border-red-950/40 hover:border-red-900/60 px-3.5 py-2 rounded-xl bg-red-950/10 transition-all"
                  >
                    Delete File
                  </button>
                </div>
              </div>
            ))}

            {projects.length === 0 && (
              <div className="bg-slate-900/20 border border-dashed border-slate-800 p-12 text-center text-xs text-slate-500 font-medium italic rounded-2xl">
                No active projects deployed. Seed a proposal workbook template to populate data.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}