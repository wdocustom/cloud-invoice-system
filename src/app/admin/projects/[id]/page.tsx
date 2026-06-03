"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toNum } from "@/lib/utils";

export default function ProjectWorkspaceControlHub() {
  const router = useRouter();
  const params = useParams();
  
  // Cleanly extract the dynamic route ID parameter using next/navigation's native client hook
  const projectId = params?.id as string;

  // Core Data States
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Client Profile Editing States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editProjectTitle, setEditProjectTitle] = useState("");

  // Line Item Insertion States
  const [newTitle, setNewTitle] = useState("");
  const [newMidDescription, setNewMidDescription] = useState("");
  const [newMidCost, setNewMidCost] = useState("");
  const [newHighTitle, setNewHighTitle] = useState("");
  const [newHighDescription, setNewHighDescription] = useState("");
  const [newHighCost, setNewHighCost] = useState("");

  // Field Operations Log States
  const [dailyNotes, setDailyNotes] = useState("");
  const [attachedPhotoBase64, setAttachedPhotoBase64] = useState("");
  const [attachedPhotoName, setAttachedPhotoName] = useState("");
  const [isLogging, setIsLogging] = useState(false);
  const [attachedPhotoFile, setAttachedPhotoFile] = useState<File | null>(null);

  useEffect(() => {
    if (projectId) {
      fetchComprehensiveProjectData();
    }
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
        setEditName(data.homeowner_name || "");
        setEditEmail(data.homeowner_email || "");
        setEditAddress(data.job_address || "");
        setEditProjectTitle(data.project_title || "");
      }
    } catch (err) {
      console.error("Error retrieving database record profiles:", err);
    } finally {
      setLoading(false);
    }
  }

  async function saveClientProfileModifications() {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("invoices")
        .update({
          homeowner_name: editName.trim(),
          homeowner_email: editEmail.trim(),
          job_address: editAddress.trim(),
          project_title: editProjectTitle.trim()
        })
        .eq("id", projectId);

      if (error) throw error;

      setProject((prev: any) => ({
        ...prev,
        homeowner_name: editName.trim(),
        homeowner_email: editEmail.trim(),
        job_address: editAddress.trim(),
        project_title: editProjectTitle.trim()
      }));
      
      setIsEditModalOpen(false);
      alert("Client profile parameters synchronized successfully across all portals!");
    } catch (err: any) {
      alert("Profile mutation pipeline failure: " + err.message);
    } finally {
      setIsSaving(false);
    }
  }

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function flushPendingDebounce() {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
  }

  async function saveGlobalScopeItemChanges(updatedItems: any[]) {
    const calculatedNewTotal = updatedItems.reduce((sum, item) => sum + toNum(item.mid_cost), 0);

    setProject((prev: any) => ({
      ...prev,
      items: updatedItems,
      amount: calculatedNewTotal
    }));

    try {
      const { data, error } = await supabase
        .from("invoices")
        .update({
          items: updatedItems,
          amount: calculatedNewTotal
        })
        .eq("id", projectId)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error("Update affected 0 rows — RLS may be blocking writes. Check Supabase RLS policies on the invoices table.");
      }

      setProject((prev: any) => ({
        ...prev,
        items: data[0].items,
        amount: data[0].amount
      }));
    } catch (err: any) {
      alert("Error saving: " + err.message);
      fetchComprehensiveProjectData();
    }
  }

  const insertNewLineRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newMidCost) return alert("Please fill out item title and standard mid-cost parameters.");

    flushPendingDebounce();

    const fallbackHighTitle = newHighTitle.trim() || `${newTitle.trim()} Luxury Upgrade`;
    const fallbackHighDescription = newHighDescription.trim() || newMidDescription.trim() || `Premium luxury grade installation upgrade tier parameters for ${newTitle.trim()}.`;
    const fallbackHighCost = newHighCost ? toNum(newHighCost) : toNum(newMidCost) * 1.35;

    const payloadItem = {
      title: newTitle.trim(),
      mid_description: newMidDescription.trim(),
      mid_cost: toNum(newMidCost),
      high_title: fallbackHighTitle,
      high_description: fallbackHighDescription,
      high_cost: fallbackHighCost || 0
    };

    const currentItems = Array.isArray(project.items) ? [...project.items] : [];
    const nextItemsArray = [...currentItems, payloadItem];

    setNewTitle("");
    setNewMidDescription("");
    setNewMidCost("");
    setNewHighTitle("");
    setNewHighDescription("");
    setNewHighCost("");

    saveGlobalScopeItemChanges(nextItemsArray);
  };

  const removeLineRowItem = (indexToRemove: number) => {
    if (!confirm("Are you sure you want to delete this contract scope item row?")) return;
    flushPendingDebounce();
    const currentItems = Array.isArray(project.items) ? [...project.items] : [];
    const nextItemsArray = currentItems.filter((_, idx) => idx !== indexToRemove);
    saveGlobalScopeItemChanges(nextItemsArray);
  };

  const debouncedSave = useCallback((items: any[]) => {
    flushPendingDebounce();
    saveTimerRef.current = setTimeout(() => saveGlobalScopeItemChanges(items), 600);
  }, [projectId]);

  const updateInlineItemField = (index: number, field: string, value: any) => {
    const currentItems = Array.isArray(project.items) ? [...project.items] : [];
    currentItems[index] = {
      ...currentItems[index],
      [field]: value
    };
    setProject((prev: any) => ({
      ...prev,
      items: currentItems,
      amount: currentItems.reduce((sum: number, item: any) => sum + toNum(item.mid_cost), 0)
    }));
    debouncedSave(currentItems);
  };

  // Convert image upload to base64 format right inside the log stream state
  const handleDailyLogPhotoLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAttachedPhotoName(file.name);
    setAttachedPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachedPhotoBase64(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const submitDailyOperationsLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dailyNotes.trim() && !attachedPhotoBase64) return;
    setIsLogging(true);

    let photoUrl: string | null = null;
    if (attachedPhotoFile) {
      const filePath = `daily-logs/${projectId}/${Date.now()}-${attachedPhotoFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("project-photos")
        .upload(filePath, attachedPhotoFile);
      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from("project-photos")
          .getPublicUrl(filePath);
        photoUrl = urlData.publicUrl;
      }
    }

    const newLogEntry = {
      timestamp: new Date().toISOString(),
      notes: dailyNotes.trim(),
      photo: photoUrl,
      author: "Contractor Workspace"
    };

    const currentLogs = Array.isArray(project.daily_logs) ? [...project.daily_logs] : [];
    const updatedLogs = [newLogEntry, ...currentLogs];

    try {
      const { error } = await supabase
        .from("invoices")
        .update({ daily_logs: updatedLogs })
        .eq("id", projectId);

      if (error) throw error;
      setProject((prev: any) => ({ ...prev, daily_logs: updatedLogs }));
      setDailyNotes("");
      setAttachedPhotoBase64("");
      setAttachedPhotoName("");
      setAttachedPhotoFile(null);
      alert("Daily operations log with image snapshot filed successfully!");
    } catch (err: any) {
      alert("Failed to submit field log entry: " + err.message);
    } finally {
      setIsLogging(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center font-sans">
      <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans antialiased pb-24 text-left">
      
      {/* Navigation Header Banner */}
      <div className="bg-slate-900 text-white shadow-sm border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="space-y-0.5">
            <button onClick={() => router.push("/admin/projects")} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-white transition block mb-1">
              ← BACK TO PROJECT INDEX LEDGER
            </button>
            <h1 className="text-base font-extrabold tracking-tight uppercase text-slate-100">
              {project?.homeowner_name || "CLIENT"} WORKSPACE
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] px-3 py-1.5 rounded-lg font-black uppercase tracking-wider">
              PROPOSAL STATE: {project?.status || "PENDING"}
            </span>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/invoice/${projectId}`);
                alert("Live portal invitation link copied to system clipboard!");
              }}
              className="bg-white hover:bg-slate-50 text-slate-900 font-black text-[10px] px-4 py-2.5 rounded-xl uppercase tracking-wider transition shadow-sm outline-none"
            >
              COPY LIVE PORTAL LINK
            </button>
          </div>
        </div>
      </div>

      {/* METRICS ROW CARDS AREA */}
      <div className="max-w-7xl mx-auto px-4 pt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* PROJECT ADDRESS CARD */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b pb-2 mb-2">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">PROJECT ADDRESS</p>
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[9px] px-2.5 py-1 rounded-lg uppercase tracking-wider transition outline-none"
              >
                ✏️ EDIT PROFILE
              </button>
            </div>
            <h3 className="font-extrabold text-slate-900 text-sm leading-relaxed mb-1">{project?.job_address || "No address specified."}</h3>
            {project?.project_title && (
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">{project.project_title}</p>
            )}
          </div>
          <div className="space-y-1">
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase block mb-0.5">CLIENT</label>
              <p className="font-bold text-xs text-slate-800">{project?.homeowner_name || "N/A"}</p>
            </div>
            <p className="font-mono font-bold text-[11px] text-slate-500 truncate">{project?.homeowner_email || "N/A"}</p>
          </div>
        </div>

        {/* PROJECT COST METRIC CARD */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 mb-3">PROJECT COST</p>
            <h2 className="text-3xl font-black text-slate-950 tracking-tight font-sans">
              ${toNum(project?.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h2>
          </div>
          <button
            type="button"
            onClick={async () => {
              const newVal = !project?.deposit_cleared;
              setProject((prev: any) => ({ ...prev, deposit_cleared: newVal }));
              const { error } = await supabase
                .from("invoices")
                .update({ deposit_cleared: newVal })
                .eq("id", projectId);
              if (error) {
                setProject((prev: any) => ({ ...prev, deposit_cleared: !newVal }));
                alert("Failed to update deposit status: " + error.message);
              }
            }}
            className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border mt-4 cursor-pointer hover:bg-slate-100 transition outline-none"
          >
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider pl-1">DEPOSIT PAID</span>
            <div className={`w-8 h-4 rounded-full p-0.5 flex transition-all duration-200 ${project?.deposit_cleared ? 'bg-emerald-500 justify-end' : 'bg-slate-200 justify-start'}`}>
              <div className="w-3 h-3 bg-white rounded-full shadow-sm" />
            </div>
          </button>
        </div>

        {/* PORTAL ANALYTICS FEED CARD */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex justify-between items-center border-b pb-2">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">PORTAL ANALYTICS FEED</p>
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

      {/* GANTT BLUEPRINT SCHEDULER HORIZON TRACK */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            🗓️ PRODUCTION PHASE GANTT BLUEPRINT SCHEDULER
          </h3>
          <p className="text-[11px] text-slate-400 font-medium -mt-2">Construct sub-tasks, nest trade rows, and update operational progress margins directly into live streams charts grids.</p>
          <div className="h-32 border border-slate-200 rounded-xl bg-slate-50/50 flex flex-col items-center justify-between p-4">
            <div className="w-full flex justify-between text-[10px] font-black text-slate-400 border-b pb-2 uppercase tracking-wider">
              <span>PHASE WORKSPACE MANAGEMENT TRACK</span>
              <span>OPERATIONAL HORIZON CALENDAR GRID VIEW</span>
            </div>
            <p className="text-[11px] font-medium text-slate-400 italic mb-4">Operational horizon timeline component active</p>
          </div>
        </div>
      </div>

      {/* ITEMS MANAGER LEDGER CARD CONTAINER */}
      <div className="max-w-7xl mx-auto px-4 pt-6 space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="border-b pb-3 flex items-start justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900 uppercase tracking-wide">
                ITEMS
              </h2>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">Modify descriptions, values, or append new line scopes directly into the contract ledger structure.</p>
            </div>
            <button
              type="button"
              onClick={async () => {
                const newVal = !project?.show_luxury_tier;
                setProject((prev: any) => ({ ...prev, show_luxury_tier: newVal }));
                const { error } = await supabase
                  .from("invoices")
                  .update({ show_luxury_tier: newVal })
                  .eq("id", projectId);
                if (error) {
                  setProject((prev: any) => ({ ...prev, show_luxury_tier: !newVal }));
                  alert("Failed to update luxury tier visibility: " + error.message);
                }
              }}
              className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl transition outline-none shrink-0"
            >
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Luxury Tier</span>
              <div className={`w-8 h-4 rounded-full p-0.5 flex transition-all duration-200 ${project?.show_luxury_tier ? 'bg-blue-500 justify-end' : 'bg-slate-200 justify-start'}`}>
                <div className="w-3 h-3 bg-white rounded-full shadow-sm" />
              </div>
            </button>
          </div>

          {/* DUAL-TIER WORKSPACE INPUT ROW LOOPS */}
          <div className="space-y-6">
            {Array.isArray(project?.items) && project.items.map((item: any, idx: number) => (
              <div key={idx} className="border border-slate-200 rounded-2xl p-5 bg-slate-50/30 space-y-4 relative group transition-all hover:border-slate-300">
                <button 
                  type="button" 
                  onClick={() => removeLineRowItem(idx)}
                  className="absolute top-5 right-5 bg-red-50 hover:bg-red-100 text-red-600 p-1.5 rounded-lg transition-colors border border-red-100 z-10"
                >
                  ✕
                </button>

                {/* Primary Row Header Component */}
                <div className="flex gap-4 items-center border-b pb-3">
                  <span className="text-[10px] font-black text-slate-400 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-sm">LINE #{idx + 1}</span>
                  <input 
                    type="text" 
                    value={item.title || ""} 
                    onChange={(e) => updateInlineItemField(idx, "title", e.target.value)}
                    placeholder="Core Specification Group Title"
                    className="flex-1 bg-white border p-2 rounded-xl text-xs font-black text-slate-900 outline-none focus:border-slate-400 transition shadow-sm" 
                  />
                </div>

                {/* Dual Column Layout Matrix Split Tier */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Standard Mid Tier Configuration Box */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2 shadow-sm">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">🛠️ Standard Mid-Tier Spec</span>
                      <div className="flex items-center bg-slate-50 border rounded-lg px-2 gap-1 max-w-[120px]">
                        <span className="text-[10px] font-bold text-slate-400">$</span>
                        <input 
                          type="number" 
                          value={item.mid_cost || ""} 
                          onChange={(e) => updateInlineItemField(idx, "mid_cost", toNum(e.target.value))}
                          className="w-full bg-transparent py-1.5 text-xs font-black text-slate-900 outline-none text-right" 
                        />
                      </div>
                    </div>
                    <textarea 
                      value={item.mid_description || item.description || ""} 
                      onChange={(e) => updateInlineItemField(idx, "mid_description", e.target.value)}
                      placeholder="Mid-tier grade specification materials context..."
                      className="w-full bg-slate-50/50 border p-2.5 rounded-lg text-[11px] font-medium text-slate-600 leading-relaxed outline-none focus:border-slate-300 transition"
                      rows={2}
                    />
                  </div>

                  {/* Luxury High Tier Configuration Box */}
                  <div className="bg-white p-4 rounded-xl border border-blue-100 space-y-2 shadow-sm">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[9px] font-black text-blue-500 uppercase tracking-wider">💎 Luxury High-Tier Upgrade</span>
                      <div className="flex items-center bg-blue-50/30 border border-blue-100 rounded-lg px-2 gap-1 max-w-[120px]">
                        <span className="text-[10px] font-bold text-blue-400">$</span>
                        <input 
                          type="number" 
                          value={item.high_cost || ""} 
                          onChange={(e) => updateInlineItemField(idx, "high_cost", toNum(e.target.value))}
                          className="w-full bg-transparent py-1.5 text-xs font-black text-blue-900 outline-none text-right" 
                        />
                      </div>
                    </div>
                    <textarea 
                      value={item.high_description || ""} 
                      onChange={(e) => updateInlineItemField(idx, "high_description", e.target.value)}
                      placeholder="High-tier luxury grade premium specification upgrade options..."
                      className="w-full bg-blue-50/10 border border-blue-50 p-2.5 rounded-lg text-[11px] font-medium text-slate-600 leading-relaxed outline-none focus:border-blue-200 transition"
                      rows={2}
                    />
                  </div>
                </div>

              </div>
            ))}
          </div>

          {/* DUAL LAYER INTEGRATED ENTRY ROW INJECTOR COMPONENT FORM */}
          <form onSubmit={insertNewLineRow} className="border border-blue-100 bg-blue-50/20 p-5 rounded-2xl space-y-4">
            <div>
              <h4 className="font-black text-slate-900 uppercase tracking-wide text-[10px] text-blue-600">➕ Add Contract Line Item</h4>
              <p className="text-slate-400 font-medium text-[10px] mt-0.5">Append an additional operational transaction row containing both tier matrix options directly into the system catalog.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input 
                type="text" 
                placeholder="Core Specification Group Name (e.g., Backsplash Tile Install)" 
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="sm:col-span-3 p-2.5 bg-white border rounded-xl outline-none font-bold text-xs text-slate-800 shadow-sm focus:border-blue-300"
              />
              <input 
                type="number" 
                placeholder="Standard Cost ($)" 
                value={newMidCost}
                onChange={(e) => setNewMidCost(e.target.value)}
                className="p-2.5 bg-white border rounded-xl outline-none font-black text-xs text-slate-800 shadow-sm text-right focus:border-blue-300"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
              <div className="space-y-1.5">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide pl-1">Standard Mid-Tier Description</span>
                <input 
                  type="text"
                  placeholder="Standard grade materials specifications descriptions details..."
                  value={newMidDescription}
                  onChange={(e) => setNewMidDescription(e.target.value)}
                  className="w-full p-2.5 bg-white border rounded-xl outline-none font-semibold text-slate-700 shadow-sm focus:border-slate-300"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[9px] font-black text-blue-500 uppercase tracking-wide">Luxury High-Tier Upgrade Description</span>
                  <span className="text-[8px] text-slate-400 font-bold italic">Leave blank to auto-calculate luxury cost tier (+35%)</span>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    placeholder="Premium luxury upgrade options data metrics description..."
                    value={newHighDescription}
                    onChange={(e) => setNewHighDescription(e.target.value)}
                    className="flex-1 p-2.5 bg-white border rounded-xl outline-none font-semibold text-slate-700 shadow-sm focus:border-blue-200"
                  />
                  <input 
                    type="number"
                    placeholder="Luxury ($)"
                    value={newHighCost}
                    onChange={(e) => setNewHighCost(e.target.value)}
                    className="w-24 p-2.5 bg-white border rounded-xl outline-none font-black text-right text-slate-800 shadow-sm focus:border-blue-200"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
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

      {/* FIELD OPERATIONS DAILY LOG WORKBENCH WITH CAMERA ATTACHMENTS RESTORED */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="border-b pb-3 border-slate-100">
            <h3 className="text-base font-black text-slate-900 uppercase tracking-wide">📸 FIELD OPERATIONS DAILY LOG</h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Record construction notes, site progress logs, and snap layout photos straight from your device camera into the client portal.</p>
          </div>

          <form onSubmit={submitDailyOperationsLog} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-slate-50 border p-4 rounded-2xl flex flex-col gap-4">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">LOG SITE PROGRESS NOTES:</label>
                <textarea 
                  value={dailyNotes}
                  onChange={(e) => setDailyNotes(e.target.value)}
                  placeholder="Describe trade workflow status..." 
                  className="w-full bg-white border p-3 rounded-xl text-xs font-semibold outline-none focus:border-slate-300 min-h-[90px] shadow-sm mb-2"
                />

                {/* IMAGE DROPZONE FIELD INPUT SYSTEM */}
                <label className="w-full block bg-white border border-slate-200 hover:border-slate-400 px-3 py-2.5 rounded-xl shadow-sm text-center font-bold text-[11px] text-slate-600 cursor-pointer transition-colors whitespace-nowrap overflow-hidden text-ellipsis">
                  {attachedPhotoName ? `📷 ${attachedPhotoName.slice(0, 20)}...` : "📸 Capture Site Progress Photo"}
                  <input type="file" accept="image/*" capture="environment" onChange={handleDailyLogPhotoLoad} className="hidden" />
                </label>
              </div>
              <button 
                type="submit"
                disabled={isLogging || (!dailyNotes.trim() && !attachedPhotoBase64)}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-black text-xs py-3 rounded-xl uppercase tracking-widest transition shadow-sm"
              >
                {isLogging ? "SAVING LOG..." : "SUBMIT FIELD LOG"}
              </button>
            </div>
            
            <div className="lg:col-span-2 border border-slate-100 rounded-2xl p-4 max-h-[250px] overflow-y-auto space-y-4 bg-white divide-y divide-slate-100">
              {Array.isArray(project?.daily_logs) && project.daily_logs.map((log: any, i: number) => (
                <div key={i} className="text-xs pt-3 first:pt-0">
                  <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                    <span>👷‍♂️ {log.author || "Site Superintendent"}</span>
                    <span>{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 space-y-3">
                    {log.notes && <p className="text-slate-700 font-medium leading-relaxed">{log.notes}</p>}
                    {log.photo && (
                      <div className="max-w-xs border rounded-lg overflow-hidden bg-white shadow-sm">
                        <img src={log.photo} alt="Site Progress attachment data stream" className="w-full h-auto object-cover max-h-40" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {(!project?.daily_logs || project.daily_logs.length === 0) && (
                <p className="text-center italic text-slate-400 text-xs pt-16">No field records submitted to the ledger index timeline yet.</p>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* CLIENT SPEC PROFILE INTERACTION MODAL */}
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
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Project Title</label>
                <input
                  type="text"
                  value={editProjectTitle}
                  onChange={(e) => setEditProjectTitle(e.target.value)}
                  placeholder="e.g. Bath Remodel, Basement Finish, Kitchen Remodel"
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