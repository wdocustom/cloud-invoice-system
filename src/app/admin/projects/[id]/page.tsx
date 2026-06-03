"use client";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";

export default function ProjectWorkspaceControlHub({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: projectId } = use(params);

  // Core Data States
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Client Profile Editing States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");

  // Line Item Insertion States
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCost, setNewCost] = useState("");

  useEffect(() => {
    fetchComprehensiveProjectData();
  }, [projectId]);

  async function fetchComprehensiveProjectData() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", projectId)
        .single();

      if (error) throw error;
      if (data) {
        setProject(data);
        // Initialize editing fields
        setEditName(data.homeowner_name || "");
        setEditEmail(data.homeowner_email || "");
        setEditAddress(data.job_address || "");
      }
    } catch (err) {
      console.error("Error retrieving database record profiles:", err);
    } finally {
      setLoading(false);
    }
  }

  // Update Client profile properties inside Supabase
  async function saveClientProfileModifications() {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("invoices")
        .update({
          homeowner_name: editName.trim(),
          homeowner_email: editEmail.trim(),
          job_address: editAddress.trim()
        })
        .eq("id", projectId);

      if (error) throw error;
      
      // Update local UI state
      setProject((prev: any) => ({
        ...prev,
        homeowner_name: editName.trim(),
        homeowner_email: editEmail.trim(),
        job_address: editAddress.trim()
      }));
      
      setIsEditModalOpen(false);
      alert("Client profile parameters synchronized successfully across all portals!");
    } catch (err: any) {
      alert("Profile mutation pipeline failure: " + err.message);
    } finally {
      setIsSaving(false);
    }
  }

  // Handle changes to line items (Inline adjustments, deletions, additions)
  async function saveGlobalScopeItemChanges(updatedItems: any[]) {
    const calculatedNewTotal = updatedItems.reduce((sum, item) => sum + (parseFloat(item.mid_cost) || 0), 0);
    
    try {
      const { error } = await supabase
        .from("invoices")
        .update({
          items: updatedItems,
          amount: calculatedNewTotal
        })
        .eq("id", projectId);

      if (error) throw error;
      
      setProject((prev: any) => ({
        ...prev,
        items: updatedItems,
        amount: calculatedNewTotal
      }));
    } catch (err: any) {
      alert("Error synchronizing scope line rows: " + err.message);
    }
  }

  const insertNewLineRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newCost) return alert("Please fill out item title and baseline cost metric.");

    const currentItems = Array.isArray(project.items) ? [...project.items] : [];
    const payloadItem = {
      title: newTitle.trim(),
      mid_description: newDescription.trim(),
      mid_cost: parseFloat(newCost) || 0,
      high_title: `${newTitle.trim()} Luxury Upgrade`,
      high_description: `Premium materials upgrade matching structural configurations for ${newTitle.trim()}.`,
      high_cost: (parseFloat(newCost) || 0) * 1.35
    };

    const nextItemsArray = [...currentItems, payloadItem];
    
    // Clear inputs
    setNewTitle("");
    setNewDescription("");
    setNewCost("");

    saveGlobalScopeItemChanges(nextItemsArray);
  };

  const removeLineRowItem = (indexToRemove: number) => {
    if (!confirm("Are you sure you want to delete this contract scope item row?")) return;
    const currentItems = Array.isArray(project.items) ? [...project.items] : [];
    const nextItemsArray = currentItems.filter((_, idx) => idx !== indexToRemove);
    saveGlobalScopeItemChanges(nextItemsArray);
  };

  const updateInlineItemField = (index: number, field: string, value: any) => {
    const currentItems = Array.isArray(project.items) ? [...project.items] : [];
    currentItems[index] = {
      ...currentItems[index],
      [field]: value
    };
    saveGlobalScopeItemChanges(currentItems);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center font-sans">
      <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans antialiased pb-24 text-left">
      
      {/* Dynamic Navigation Header Banner Block */}
      <div className="bg-slate-900 text-white shadow-sm border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="space-y-0.5">
            <button onClick={() => router.push("/admin/projects")} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-white transition block mb-1">
              ← Back to Project Index Ledger
            </button>
            <h1 className="text-base font-extrabold tracking-tight uppercase text-slate-100">
              {project?.homeowner_name || "Client File"} Workspace Control Hub
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] px-3 py-1.5 rounded-lg font-black uppercase tracking-wider">
              Proposal State: {project?.status || "Pending"}
            </span>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/invoice/${projectId}`);
                alert("Live portal invitation link copied to system clipboard!");
              }}
              className="bg-white hover:bg-slate-50 text-slate-900 font-black text-[10px] px-4 py-2.5 rounded-xl uppercase tracking-wider transition shadow-sm outline-none"
            >
              Copy Live Portal Link
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CLIENT PROFILE DETAILS CARD */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between border-b pb-2">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Project Site Profile</p>
              <h3 className="font-extrabold text-slate-900 text-sm truncate max-w-[180px]">{project?.homeowner_name}</h3>
            </div>
            <button 
              onClick={() => setIsEditModalOpen(true)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[9px] px-3 py-1.5 rounded-lg uppercase tracking-wider transition outline-none"
            >
              ✏️ Edit Profile
            </button>
          </div>
          
          <div className="space-y-3 text-xs">
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase block mb-0.5">Project Address</label>
              <p className="font-bold text-slate-800 leading-relaxed">{project?.job_address || "No address specified."}</p>
            </div>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase block mb-0.5">Client Channel Contact</label>
              <p className="font-mono font-bold text-slate-600 truncate">{project?.homeowner_email || "N/A"}</p>
            </div>
          </div>
        </div>

        {/* PROJECT FISCAL METRICS CARD */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 mb-3">Project Financial Total</p>
            <h2 className="text-3xl font-black text-slate-950 tracking-tight font-sans">
              ${(project?.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h2>
          </div>
          <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border mt-4">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider pl-1">Mark Project Paid</span>
            <div className="w-8 h-4 bg-slate-200 rounded-full p-0.5 cursor-pointer flex justify-start"><div className="w-3 h-3 bg-white rounded-full shadow-sm" /></div>
          </div>
        </div>

        {/* REAL-TIME PORTAL TRACKING ANALYTICS CARD */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex justify-between items-center border-b pb-2">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Portal Analytics Feed</p>
            <span className="bg-blue-50 text-blue-700 font-black text-[9px] px-2 py-0.5 rounded-md border border-blue-100">Hits: {project?.view_count || 0}</span>
          </div>
          <div className="space-y-1.5 max-h-24 overflow-y-auto text-[10px] divide-y divide-slate-50 pr-1">
            {Array.isArray(project?.view_history) && project.view_history.map((hit: any, i: number) => (
              <div key={i} className="flex justify-between items-center pt-1.5 text-slate-600 font-medium">
                <span>#{project.view_history.length - i} • Link Visited</span>
                <span className="font-mono text-slate-400 text-[9px]">{hit.timestamp ? new Date(hit.timestamp).toLocaleDateString() : "Live Hit"}</span>
              </div>
            ))}
            {(!project?.view_history || project.view_history.length === 0) && (
              <p className="text-center italic text-slate-400 pt-4">No consumer activity logs generated yet.</p>
            )}
          </div>
        </div>

      </div>

      {/* GANTT SCHEDULER HORIZON GRID WORKSPACE */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            🗓️ Production Phase Gantt Blueprint Scheduler
          </h3>
          <div className="h-32 border border-dashed rounded-xl bg-slate-50/50 flex items-center justify-center">
            <p className="text-[11px] font-medium text-slate-400 italic">Operational horizon timeline component active</p>
          </div>
        </div>
      </div>

      {/* RENAME TO 'ITEMS' WORKSPACE SECTION */}
      <div className="max-w-7xl mx-auto px-4 pt-6 space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="border-b pb-3">
            <h2 className="text-base font-black text-slate-900 uppercase tracking-wide">
              Items
            </h2>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Modify descriptions, values, or append new line scopes directly into the contract ledger structure.</p>
          </div>

          {/* LIST MATRIX CONTROLS LOOP */}
          <div className="space-y-4">
            {Array.isArray(project?.items) && project.items.map((item: any, idx: number) => (
              <div key={idx} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3 relative group transition-all hover:border-slate-300">
                <button 
                  type="button" 
                  onClick={() => removeLineRowItem(idx)}
                  className="absolute top-4 right-4 bg-red-50 hover:bg-red-100 text-red-600 p-1.5 rounded-lg transition-colors border border-red-100"
                >
                  ✕
                </button>
                <div className="flex gap-4 items-center">
                  <span className="text-[10px] font-black text-slate-300 bg-white border px-2 py-1 rounded-md shadow-sm">#{idx + 1}</span>
                  <input 
                    type="text" 
                    value={item.title || ""} 
                    onChange={(e) => updateInlineItemField(idx, "title", e.target.value)}
                    className="flex-1 bg-white border p-2 rounded-xl text-xs font-extrabold text-slate-900 outline-none focus:border-slate-400 transition shadow-sm" 
                  />
                  <div className="flex items-center bg-white border rounded-xl shadow-sm px-3 gap-1 max-w-[140px]">
                    <span className="text-xs font-bold text-slate-400">$</span>
                    <input 
                      type="number" 
                      value={item.mid_cost || ""} 
                      onChange={(e) => updateInlineItemField(idx, "mid_cost", parseFloat(e.target.value) || 0)}
                      className="w-full bg-transparent p-2 text-xs font-black text-slate-900 outline-none text-right" 
                    />
                  </div>
                </div>
                <textarea 
                  value={item.mid_description || item.description || ""} 
                  onChange={(e) => updateInlineItemField(idx, "mid_description", e.target.value)}
                  className="w-full bg-white border p-3 rounded-xl text-xs font-medium text-slate-600 leading-relaxed outline-none focus:border-slate-400 transition shadow-sm"
                  rows={2}
                />
              </div>
            ))}
          </div>

          {/* RESTORED LINE ITEM INSERTION CONTROLS BOX */}
          <form onSubmit={insertNewLineRow} className="border border-blue-100 bg-blue-50/20 p-5 rounded-2xl space-y-4">
            <div>
              <h4 className="font-black text-slate-900 uppercase tracking-wide text-[10px] text-blue-600">➕ Add Contract Line Item</h4>
              <p className="text-slate-400 font-medium text-[10px] mt-0.5">Append an additional operational transaction row directly into the project portfolio catalog.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input 
                type="text" 
                placeholder="Item Scope Title (e.g., Electrical Core Layout)" 
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="sm:col-span-3 p-2.5 bg-white border rounded-xl outline-none font-bold text-xs text-slate-800 shadow-sm focus:border-blue-300"
              />
              <input 
                type="number" 
                placeholder="Baseline Cost ($)" 
                value={newCost}
                onChange={(e) => setNewCost(e.target.value)}
                className="p-2.5 bg-white border rounded-xl outline-none font-black text-xs text-slate-800 shadow-sm text-right focus:border-blue-300"
              />
            </div>
            <div className="flex flex-col sm:flex-row items-stretch gap-3">
              <input 
                type="text" 
                placeholder="Provide detailed project specification task parameters, materials grade, and installation workflow metrics..." 
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="flex-1 p-2.5 bg-white border rounded-xl outline-none font-semibold text-xs text-slate-800 shadow-sm focus:border-blue-300"
              />
              <button 
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs px-6 py-2.5 rounded-xl uppercase tracking-wider transition shadow-md shrink-0"
              >
                Inject Row Component
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* MODAL WINDOW SYSTEM: CLIENT PROFILE MODIFICATIONS EDITOR */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl text-left">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Modify Client Profile Records</h3>
              <p className="text-[11px] text-slate-400 font-medium">Updates made here instantly sync to the homeowner client portal and downstream data tables.</p>
            </div>
            
            <div className="space-y-4 text-xs">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Homeowner Name</label>
                <input 
                  type="text" 
                  value={editName} 
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-3 bg-slate-50 border rounded-xl font-bold outline-none text-slate-800 focus:bg-white focus:border-slate-400 transition-all"
                />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Email Address Channel</label>
                <input 
                  type="email" 
                  value={editEmail} 
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full p-3 bg-slate-50 border rounded-xl font-mono font-bold outline-none text-slate-700 focus:bg-white focus:border-slate-400 transition-all"
                />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Target Project Site Address</label>
                <input 
                  type="text" 
                  value={editAddress} 
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full p-3 bg-slate-50 border rounded-xl font-bold outline-none text-slate-800 focus:bg-white focus:border-slate-400 transition-all"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button 
                type="button" 
                onClick={() => setIsEditModalOpen(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-[10px] px-4 py-2.5 rounded-xl uppercase tracking-wider transition"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={saveClientProfileModifications}
                disabled={isSaving}
                className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-black text-[10px] px-5 py-2.5 rounded-xl uppercase tracking-wider transition shadow-md"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}