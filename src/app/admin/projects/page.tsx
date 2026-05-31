"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

interface Project {
  id: string;
  created_at: string;
  homeowner_name: string;
  homeowner_email: string;
  job_address: string;
  amount: number;
  status: string;
  deposit_percentage: number;
  estimated_start_date?: string;
  project_length?: string;
  signature_name?: string;
  signed_at?: string;
  deposit_cleared?: boolean;
  selections?: { [key: string]: string };
  current_phase_index?: number;
  payment_phases?: any[];
}

export default function ContractorDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  
  // Selection input states
  const [newSelectionKey, setNewSelectionKey] = useState("");
  const [newSelectionValue, setNewSelectionValue] = useState("");

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    setLoading(true);
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setProjects(data);
      // Keep selected project reference fresh if editing
      if (selectedProject) {
        const fresh = data.find(p => p.id === selectedProject.id);
        if (fresh) setSelectedProject(fresh);
      }
    }
    setLoading(false);
  }

  const toggleDepositClearance = async (project: Project) => {
    const nextState = !project.deposit_cleared;
    const { error } = await supabase
      .from("invoices")
      .update({ deposit_cleared: nextState })
      .eq("id", project.id);

    if (!error) {
      fetchProjects();
    }
  };

  const updatePhaseProgress = async (project: Project, increment: boolean) => {
    const currentIdx = project.current_phase_index || 0;
    const maxIdx = (project.payment_phases?.length || 1) - 1;
    let nextIdx = increment ? currentIdx + 1 : currentIdx - 1;
    
    if (nextIdx < 0) nextIdx = 0;
    if (nextIdx > maxIdx) nextIdx = maxIdx;

    const { error } = await supabase
      .from("invoices")
      .update({ current_phase_index: nextIdx })
      .eq("id", project.id);

    if (!error) {
      fetchProjects();
    }
  };

  const handleAddSelection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !newSelectionKey.trim() || !newSelectionValue.trim()) return;

    const currentSelections = selectedProject.selections || {};
    const updatedSelections = {
      ...currentSelections,
      [newSelectionKey.trim()]: newSelectionValue.trim()
    };

    const { error } = await supabase
      .from("invoices")
      .update({ selections: updatedSelections })
      .eq("id", selectedProject.id);

    if (!error) {
      setNewSelectionKey("");
      setNewSelectionValue("");
      fetchProjects();
    }
  };

  if (loading) return <div className="p-12 text-center text-sm font-sans text-slate-500">Loading operations matrix...</div>;

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 sm:px-6 lg:px-8 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Banner */}
        <div className="bg-slate-900 text-white p-6 rounded-lg shadow-md flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold tracking-tight">WDO CUSTOM operations command</h1>
            <p className="text-xs text-slate-400 mt-0.5">Active Project Scheduling, Draw Progression, & Selection Management</p>
          </div>
          <span className="text-xs bg-slate-800 border border-slate-700 px-3 py-1 rounded text-slate-300 font-mono">
            Lic: LIC-1901422
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Projects Pipeline Ledger */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Project Backlog Pipeline</h2>
            
            <div className="space-y-3">
              {projects.map((project) => {
                const isSelected = selectedProject?.id === project.id;
                const phaseIdx = project.current_phase_index || 0;
                const currentPhaseName = project.payment_phases?.[phaseIdx]?.name || "Mobilization Down";

                return (
                  <div 
                    key={project.id} 
                    onClick={() => setSelectedProject(project)}
                    className={`bg-white border rounded-lg p-5 shadow-sm transition cursor-pointer flex justify-between items-start gap-4 ${
                      isSelected ? 'ring-2 ring-blue-600 border-transparent' : 'hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-2 text-left">
                      <div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          project.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {project.status}
                        </span>
                        <h3 className="font-bold text-slate-900 text-base mt-1.5">{project.homeowner_name}</h3>
                        <p className="text-xs text-slate-500 font-medium">📍 {project.job_address}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-2 border-t text-xs text-slate-600">
                        <p><strong>Timeline:</strong> {project.project_length || "TBD"}</p>
                        <p><strong>Start Date:</strong> {project.estimated_start_date || "Unscheduled"}</p>
                        <p className="col-span-2 mt-1 font-medium text-blue-600">
                          🚧 Step: {currentPhaseName}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex flex-col justify-between h-full items-end shrink-0">
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contract</p>
                        <p className="text-base font-mono font-bold text-slate-900">${project.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                      </div>

                      <div className="mt-6">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border ${
                          project.deposit_cleared ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {project.deposit_cleared ? "💰 Deposit Cleared" : "🛑 Deposit Missing"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {projects.length === 0 && (
                <div className="bg-white border rounded-lg p-8 text-center text-sm text-slate-400 font-medium">
                  No contracts deployed yet. Create a proposal via the admin workbench to seed the operations ledge.
                </div>
              )}
            </div>
          </div>

          {/* Interactive Operational Control Sidebar Panel */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">Operational Workbench</h2>
            
            {selectedProject ? (
              <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-6 text-left">
                
                {/* Header Information */}
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{selectedProject.homeowner_name} Remodel</h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {selectedProject.id.slice(0, 8)}...</p>
                </div>

                {/* Action: Deposit Toggles */}
                <div className="border-t pt-4 space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Financial Status Controls</h4>
                  <button
                    type="button"
                    onClick={() => toggleDepositClearance(selectedProject)}
                    className={`w-full py-2 px-4 rounded text-xs font-bold transition tracking-wide shadow-sm uppercase ${
                      selectedProject.deposit_cleared 
                        ? 'bg-amber-500 text-white hover:bg-amber-600' 
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    {selectedProject.deposit_cleared ? "Mark Deposit As Pending Check" : "Mark Deposit As Cleared / Paid"}
                  </button>
                </div>

                {/* Action: Stage Draws Toggles */}
                <div className="border-t pt-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Draw Milestones Progress</h4>
                  <div className="p-3 bg-slate-50 border rounded-md text-xs font-medium text-slate-700 space-y-1">
                    <p className="font-bold text-slate-900">Active Stage Level: {selectedProject.current_phase_index || 0}</p>
                    <p className="text-blue-600 font-bold">{selectedProject.payment_phases?.[selectedProject.current_phase_index || 0]?.name || "Initial Mobilization Down"}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => updatePhaseProgress(selectedProject, false)}
                      disabled={(selectedProject.current_phase_index || 0) === 0}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-xs py-2 rounded font-bold tracking-wide uppercase transition border"
                    >
                      ◀ Back Stage
                    </button>
                    <button
                      type="button"
                      onClick={() => updatePhaseProgress(selectedProject, true)}
                      disabled={(selectedProject.current_phase_index || 0) === (selectedProject.payment_phases?.length || 1) - 1}
                      className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-xs py-2 rounded font-bold tracking-wide uppercase transition"
                    >
                      Advance Draw ▶
                    </button>
                  </div>
                </div>

                {/* Action: Selections Sheet Manifest */}
                <div className="border-t pt-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Client Selection Tracking Log</h4>
                  
                  <div className="divide-y border rounded bg-slate-50/50 max-h-40 overflow-y-auto">
                    {Object.entries(selectedProject.selections || {}).map(([key, value]) => (
                      <div key={key} className="p-2.5 text-xs flex justify-between gap-2 bg-white">
                        <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wide pt-0.5">{key}:</span>
                        <span className="font-semibold text-slate-800 text-right">{value}</span>
                      </div>
                    ))}
                    {Object.keys(selectedProject.selections || {}).length === 0 && (
                      <div className="p-4 text-center text-slate-400 text-xs italic">No design catalog choices logged yet. Add matching criteria below.</div>
                    )}
                  </div>

                  <form onSubmit={handleAddSelection} className="flex gap-1">
                    <input 
                      type="text" 
                      placeholder="e.g., Tile Color" 
                      required 
                      value={newSelectionKey} 
                      onChange={(e) => setNewSelectionKey(e.target.value)} 
                      className="flex-1 p-2 border rounded text-xs bg-white" 
                    />
                    <input 
                      type="text" 
                      placeholder="e.g., Matte Black" 
                      required 
                      value={newSelectionValue} 
                      onChange={(e) => setNewSelectionValue(e.target.value)} 
                      className="flex-1 p-2 border rounded text-xs bg-white" 
                    />
                    <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 rounded transition">
                      Log Choice
                    </button>
                  </form>
                </div>

              </div>
            ) : (
              <div className="bg-white border border-dashed border-slate-300 rounded-lg p-8 text-center text-xs text-slate-400 font-medium italic">
                Select an active row ledger item on the left panel to manipulate operational targets, design updates, or billing progress tracks.
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}