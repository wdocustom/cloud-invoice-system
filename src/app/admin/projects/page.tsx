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
    e.stopPropagation(); // Stop click from triggering card redirect
    if (!confirm(`Are you absolutely sure you want to permanently delete the project file for ${name}? This cannot be undone.`)) return;

    const { error } = await supabase
      .from("invoices")
      .delete()
      .eq("id", id);

    if (error) alert("Deletion block: " + error.message);
    else fetchProjects();
  };

  if (loading) return <div className="p-12 text-center text-sm font-sans text-slate-500">Loading pipeline matrix...</div>;

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 font-sans text-slate-900">
      <div className="max-w-5xl mx-auto space-y-6">
        
        <div className="bg-slate-900 text-white p-6 rounded-lg shadow-md flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold tracking-tight">WDO CUSTOM PRODUCTION PIPELINE</h1>
            <p className="text-xs text-slate-400 mt-0.5">Click a project layout card to open its dedicated operational suite.</p>
          </div>
          <span className="text-xs bg-slate-800 border border-slate-700 px-3 py-1 rounded text-slate-300 font-mono">LIC-1901422</span>
        </div>

        <div className="space-y-4">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Active Projects Management Backlog</h2>
          
          <div className="space-y-3">
            {projects.map((project) => (
              <div 
                key={project.id} 
                onClick={() => router.push(`/admin/projects/${project.id}`)}
                className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:border-slate-400 transition cursor-pointer flex justify-between items-center gap-4"
              >
                <div className="space-y-1.5 text-left">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      project.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {project.status}
                    </span>
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                      project.deposit_cleared ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {project.deposit_cleared ? "💰 Paid" : "🛑 Unpaid"}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">{project.homeowner_name}</h3>
                  <p className="text-xs text-slate-500">📍 {project.job_address}</p>
                </div>

                <div className="text-right flex items-center gap-6 shrink-0">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contract</p>
                    <p className="text-sm font-mono font-bold text-slate-900">${project.amount.toLocaleString()}</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={(e) => handleDeleteProject(project.id, project.homeowner_name, e)}
                    className="text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded transition border border-transparent hover:border-red-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}

            {projects.length === 0 && (
              <div className="bg-white border rounded-lg p-8 text-center text-sm text-slate-400">No active projects loaded. Deploy a workbook form template to instantiate data.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}