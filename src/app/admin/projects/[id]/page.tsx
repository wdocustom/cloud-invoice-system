"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toNum } from "@/lib/utils";
import { toast } from "@/lib/toast";

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

  // Q&A Messaging States
  const [qaMessage, setQaMessage] = useState("");
  const [isSendingQa, setIsSendingQa] = useState(false);
  const [editingQaIndex, setEditingQaIndex] = useState<number | null>(null);
  const [editingQaText, setEditingQaText] = useState("");

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
      toast("Client profile updated successfully", "success");
    } catch (err: any) {
      toast("Profile update failed: " + err.message, "error");
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
      toast("Error saving: " + err.message, "error");
      fetchComprehensiveProjectData();
    }
  }

  const insertNewLineRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newMidCost) return toast("Please fill out item title and standard cost", "info");

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
      toast("Daily log saved", "success");
    } catch (err: any) {
      toast("Failed to submit field log: " + err.message, "error");
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
      <div className="bg-slate-900 text-white shadow-md border-b border-slate-800">
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
            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] rounded-full px-3 py-1 font-black uppercase tracking-wider">
              PROPOSAL STATE: {project?.status || "PENDING"}
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/invoice/${projectId}`);
                toast("Portal link copied", "success");
              }}
              className="bg-white hover:bg-slate-50 text-slate-900 font-black text-[10px] px-4 py-2.5 rounded-xl uppercase tracking-wider transition-all duration-200 hover:shadow-md shadow-sm outline-none"
            >
              Copy Link
            </button>
          </div>
        </div>
      </div>

      {/* METRICS ROW CARDS AREA */}
      <div className="max-w-7xl mx-auto px-4 pt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* PROJECT ADDRESS CARD */}
        <div className="bg-white border border-slate-200/60 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] p-6 space-y-4 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b pb-2 mb-2">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">PROJECT ADDRESS</p>
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[9px] px-2.5 py-1 rounded-lg uppercase tracking-wider transition outline-none"
              >
                Edit
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
        <div className="bg-white border border-slate-200/60 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] p-6 flex flex-col justify-between">
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 mb-3">PROJECT COST</p>
            <h2 className="text-3xl font-black text-slate-950 tracking-tight font-sans" style={{fontVariantNumeric:'tabular-nums'}}>
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
                toast("Failed to update deposit status: " + error.message, "error");
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
        <div className="bg-white border border-slate-200/60 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] p-6 space-y-3">
          <div className="flex justify-between items-center border-b pb-2">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">PORTAL ANALYTICS</p>
            <span className="bg-blue-50 text-blue-700 font-black text-[9px] px-2 py-0.5 rounded-md border border-blue-100">Views: {project?.view_count || 0}</span>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {Array.isArray(project?.view_history) && [...project.view_history].reverse().map((hit: any, i: number) => (
              <div key={i} className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-[10px] space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-black text-slate-700">#{project.view_history.length - i}</span>
                  <span className="font-mono text-slate-500 text-[9px]">
                    {hit.timestamp ? new Date(hit.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : "—"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {hit.ip && (
                    <span className="bg-white border border-slate-200 text-slate-600 font-mono font-bold text-[8px] px-1.5 py-0.5 rounded">{hit.ip}</span>
                  )}
                  {hit.device && (
                    <span className={`font-bold text-[8px] px-1.5 py-0.5 rounded border ${
                      hit.device.includes("iOS") ? "bg-blue-50 text-blue-700 border-blue-100" :
                      hit.device.includes("Android") ? "bg-green-50 text-green-700 border-green-100" :
                      "bg-slate-100 text-slate-600 border-slate-200"
                    }`}>{hit.device}</span>
                  )}
                  {hit.browser && (
                    <span className="bg-amber-50 text-amber-700 border border-amber-100 font-bold text-[8px] px-1.5 py-0.5 rounded">{hit.browser}</span>
                  )}
                  {hit.screen && (
                    <span className="bg-purple-50 text-purple-700 border border-purple-100 font-bold text-[8px] px-1.5 py-0.5 rounded">{hit.screen}</span>
                  )}
                </div>
                {hit.referrer && (
                  <p className="text-[8px] text-slate-400 font-medium truncate">via: {hit.referrer}</p>
                )}
              </div>
            ))}
            {(!project?.view_history || project.view_history.length === 0) && (
              <p className="text-center italic text-slate-400 text-xs pt-4">No portal views yet.</p>
            )}
          </div>
        </div>

      </div>

      {/* GANTT BLUEPRINT SCHEDULER HORIZON TRACK */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="bg-white border border-slate-200/60 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
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

      {/* PAYMENT SCHEDULE & DEPOSIT MANAGER */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="bg-white border border-slate-200/60 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] p-6 space-y-5">
          <div className="border-b pb-3 border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">💰 PAYMENT SCHEDULE & DEPOSIT</h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Configure deposit percentage and payment draw phases. Changes sync instantly to the homeowner portal.</p>
          </div>

          {/* Deposit Percentage */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">Deposit %</label>
              <input
                type="number"
                min="0"
                max="100"
                value={project?.deposit_percentage ?? 20}
                onChange={(e) => {
                  const val = Math.min(100, Math.max(0, toNum(e.target.value)));
                  setProject((prev: any) => ({ ...prev, deposit_percentage: val }));
                }}
                onBlur={async () => {
                  const { error } = await supabase
                    .from("invoices")
                    .update({ deposit_percentage: project?.deposit_percentage ?? 20 })
                    .eq("id", projectId);
                  if (error) toast("Failed to save deposit %: " + error.message, "error");
                }}
                className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-black text-slate-900 text-center outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              />
            </div>
            <div className="text-xs text-slate-500 font-medium" style={{fontVariantNumeric:'tabular-nums'}}>
              <span className="font-black text-slate-800">${(toNum(project?.amount) * (toNum(project?.deposit_percentage ?? 20) / 100)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> of ${toNum(project?.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} total
            </div>
          </div>

          {/* Phase Rows */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Draw Phases</p>
              <p className="text-[9px] font-bold text-slate-400">
                Total: <span className={`font-black ${
                  (project?.payment_phases || []).reduce((s: number, p: any) => s + toNum(p.percentage), 0) === 100
                    ? "text-emerald-600" : "text-red-500"
                }`}>
                  {(project?.payment_phases || []).reduce((s: number, p: any) => s + toNum(p.percentage), 0)}%
                </span>
              </p>
            </div>

            {Array.isArray(project?.payment_phases) && project.payment_phases.map((phase: any, idx: number) => {
              const phaseAmount = toNum(project?.amount) * (toNum(phase.percentage) / 100);
              return (
                <div key={idx} className="flex items-center gap-2 bg-slate-50/50 border border-slate-200/60 rounded-xl p-2.5 group">
                  <span className="text-[9px] font-black text-slate-400 bg-white border border-slate-200 px-2 py-1 rounded-lg shadow-sm shrink-0">#{idx + 1}</span>
                  <input
                    type="text"
                    value={phase.name}
                    onChange={(e) => {
                      const updated = [...project.payment_phases];
                      updated[idx] = { ...updated[idx], name: e.target.value };
                      setProject((prev: any) => ({ ...prev, payment_phases: updated }));
                    }}
                    onBlur={async () => {
                      const { error } = await supabase.from("invoices").update({ payment_phases: project.payment_phases }).eq("id", projectId);
                      if (error) toast("Failed to save phase name: " + error.message, "error");
                    }}
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                  />
                  <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2 gap-1 shrink-0">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={phase.percentage}
                      onChange={(e) => {
                        const updated = [...project.payment_phases];
                        updated[idx] = { ...updated[idx], percentage: toNum(e.target.value) };
                        setProject((prev: any) => ({ ...prev, payment_phases: updated }));
                      }}
                      onBlur={async () => {
                        const { error } = await supabase.from("invoices").update({ payment_phases: project.payment_phases }).eq("id", projectId);
                        if (error) toast("Failed to save phase %: " + error.message, "error");
                      }}
                      className="w-12 py-1.5 text-xs font-black text-slate-900 text-center outline-none bg-transparent"
                    />
                    <span className="text-[10px] font-bold text-slate-400">%</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-500 shrink-0 w-20 text-right" style={{fontVariantNumeric:'tabular-nums'}}>
                    ${phaseAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      if (project.payment_phases.length <= 1) return toast("Must have at least one phase.", "info");
                      if (!confirm(`Remove "${phase.name}"?`)) return;
                      const updated = project.payment_phases.filter((_: any, i: number) => i !== idx);
                      setProject((prev: any) => ({ ...prev, payment_phases: updated }));
                      const { error } = await supabase.from("invoices").update({ payment_phases: updated }).eq("id", projectId);
                      if (error) toast("Failed to remove phase: " + error.message, "error");
                    }}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-xs font-black transition-all duration-200 shrink-0 p-1"
                  >
                    ✕
                  </button>
                </div>
              );
            })}

            {/* Add Phase Button */}
            <button
              type="button"
              onClick={async () => {
                const currentPhases = Array.isArray(project?.payment_phases) ? [...project.payment_phases] : [];
                const usedPercent = currentPhases.reduce((s: number, p: any) => s + toNum(p.percentage), 0);
                const remaining = Math.max(0, 100 - usedPercent);
                const updated = [...currentPhases, { name: "New Phase", percentage: remaining }];
                setProject((prev: any) => ({ ...prev, payment_phases: updated }));
                const { error } = await supabase.from("invoices").update({ payment_phases: updated }).eq("id", projectId);
                if (error) toast("Failed to add phase: " + error.message, "error");
              }}
              className="w-full border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-xl py-2.5 text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-wider transition-all duration-200 outline-none"
            >
              + Add Draw Phase
            </button>
          </div>
        </div>
      </div>

      {/* ITEMS MANAGER LEDGER CARD CONTAINER */}
      <div className="max-w-7xl mx-auto px-4 pt-6 space-y-6">
        <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] space-y-6">
          <div className="border-b pb-3 flex items-start justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
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
                  toast("Failed to update luxury tier visibility: " + error.message, "error");
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
                    className="flex-1 bg-white border py-3 px-4 rounded-xl text-xs font-black text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all shadow-sm" 
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
                      className="w-full bg-slate-50/50 border p-2.5 rounded-lg text-[11px] font-medium text-slate-600 leading-relaxed outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                      rows={2}
                    />
                  </div>

                  {/* Luxury High Tier Configuration Box */}
                  <div className="bg-gradient-to-br from-indigo-50/30 to-white p-4 rounded-xl border border-indigo-200/60 space-y-2 shadow-sm">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[9px] font-black text-indigo-600 uppercase tracking-wider">💎 Luxury High-Tier Upgrade</span>
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
                      className="w-full bg-blue-50/10 border border-blue-50 p-2.5 rounded-lg text-[11px] font-medium text-slate-600 leading-relaxed outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
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
                className="sm:col-span-3 py-3 px-4 bg-white border rounded-xl outline-none font-bold text-xs text-slate-800 shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              />
              <input 
                type="number" 
                placeholder="Standard Cost ($)" 
                value={newMidCost}
                onChange={(e) => setNewMidCost(e.target.value)}
                className="py-3 px-4 bg-white border rounded-xl outline-none font-black text-xs text-slate-800 shadow-sm text-right focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
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
                  className="w-full py-3 px-4 bg-white border rounded-xl outline-none font-semibold text-slate-700 shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
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
                    className="flex-1 py-3 px-4 bg-white border rounded-xl outline-none font-semibold text-slate-700 shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                  />
                  <input 
                    type="number"
                    placeholder="Luxury ($)"
                    value={newHighCost}
                    onChange={(e) => setNewHighCost(e.target.value)}
                    className="w-24 py-3 px-4 bg-white border rounded-xl outline-none font-black text-right text-slate-800 shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button 
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs px-6 py-2.5 rounded-xl uppercase tracking-wider transition-all duration-200 hover:shadow-md shadow-sm shrink-0"
              >
                + Add Line Item
              </button>
            </div>
          </form>

        </div>
      </div>

      {/* FIELD OPERATIONS DAILY LOG WORKBENCH WITH CAMERA ATTACHMENTS RESTORED */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] space-y-6">
          <div className="border-b pb-3 border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Daily Log</h3>
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
                  className="w-full bg-white border py-3 px-4 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all min-h-[90px] shadow-sm mb-2"
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
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-black text-xs py-3 rounded-xl uppercase tracking-widest transition-all duration-200 hover:shadow-md shadow-sm"
              >
                {isLogging ? "SAVING LOG..." : "Save Log"}
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

      {/* Q&A COMMUNICATION THREAD */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] space-y-5">
          <div className="border-b pb-3 border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Messages</h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Messages sent here appear on the homeowner portal. Use this to answer questions and drive toward proposal approval.</p>
          </div>

          <div className="border border-slate-100 rounded-2xl max-h-[320px] overflow-y-auto p-4 space-y-3 bg-slate-50/30">
            {Array.isArray(project?.questions) && project.questions.length > 0 ? (
              project.questions.map((msg: any, i: number) => (
                <div key={i} className={`flex ${msg.author === "contractor" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${
                    msg.author === "contractor"
                      ? "bg-slate-900 text-white rounded-br-md"
                      : "bg-white border border-slate-200 text-slate-800 rounded-bl-md"
                  }`}>
                    {editingQaIndex === i ? (
                      <div className="px-4 py-2.5 space-y-2">
                        <textarea
                          value={editingQaText}
                          onChange={(e) => setEditingQaText(e.target.value)}
                          className="w-full bg-slate-800 text-white border border-slate-700 p-2 rounded-lg text-xs font-bold outline-none focus:border-slate-500 min-h-[48px]"
                          rows={2}
                        />
                        <div className="flex gap-1.5 justify-end">
                          <button
                            type="button"
                            onClick={() => setEditingQaIndex(null)}
                            className="text-[9px] font-black text-slate-400 hover:text-slate-300 px-2 py-1 rounded transition"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!editingQaText.trim()) return;
                              const currentMessages = [...(project?.questions || [])];
                              currentMessages[i] = { ...currentMessages[i], text: editingQaText.trim(), edited: true };
                              try {
                                const { error } = await supabase.from("invoices").update({ questions: currentMessages }).eq("id", projectId);
                                if (error) throw error;
                                setProject((prev: any) => ({ ...prev, questions: currentMessages }));
                                setEditingQaIndex(null);
                              } catch (err: any) {
                                toast("Failed to update message: " + err.message, "error");
                              }
                            }}
                            className="text-[9px] font-black text-emerald-400 hover:text-emerald-300 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-lg transition"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="px-4 py-2.5">
                        <p>{msg.text}{msg.edited && <span className="text-[8px] ml-1 opacity-50">(edited)</span>}</p>
                        <div className="flex items-center justify-between mt-1.5">
                          <p className={`text-[9px] font-bold ${msg.author === "contractor" ? "text-slate-400" : "text-slate-400"}`}>
                            {msg.author === "contractor" ? "You" : project?.homeowner_name || "Homeowner"} · {new Date(msg.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </p>
                          {msg.author === "contractor" && (
                            <div className="flex gap-1.5 ml-3">
                              <button
                                type="button"
                                onClick={() => { setEditingQaIndex(i); setEditingQaText(msg.text); }}
                                className="text-[9px] font-bold text-slate-500 hover:text-white transition"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!confirm("Delete this message?")) return;
                                  const currentMessages = [...(project?.questions || [])];
                                  currentMessages.splice(i, 1);
                                  try {
                                    const { error } = await supabase.from("invoices").update({ questions: currentMessages }).eq("id", projectId);
                                    if (error) throw error;
                                    setProject((prev: any) => ({ ...prev, questions: currentMessages }));
                                  } catch (err: any) {
                                    toast("Failed to delete message: " + err.message, "error");
                                  }
                                }}
                                className="text-[9px] font-bold text-red-400/60 hover:text-red-400 transition"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center italic text-slate-400 text-xs py-8">No messages yet. Start the conversation to guide your client toward approval.</p>
            )}
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!qaMessage.trim()) return;
              setIsSendingQa(true);
              const newMsg = { text: qaMessage.trim(), author: "contractor", timestamp: new Date().toISOString() };
              const currentMessages = Array.isArray(project?.questions) ? [...project.questions] : [];
              const updated = [...currentMessages, newMsg];
              try {
                const { error } = await supabase.from("invoices").update({ questions: updated }).eq("id", projectId);
                if (error) throw error;
                setProject((prev: any) => ({ ...prev, questions: updated }));
                setQaMessage("");
              } catch (err: any) {
                toast("Failed to send message: " + err.message, "error");
              } finally {
                setIsSendingQa(false);
              }
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={qaMessage}
              onChange={(e) => setQaMessage(e.target.value)}
              placeholder="Type a reply to your client..."
              className="flex-1 py-3 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white transition-all shadow-sm"
            />
            <button
              type="submit"
              disabled={isSendingQa || !qaMessage.trim()}
              className="bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-black text-[10px] px-5 py-3 rounded-xl uppercase tracking-wider transition-all duration-200 hover:shadow-md shadow-sm shrink-0"
            >
              {isSendingQa ? "Sending..." : "Send"}
            </button>
          </form>
        </div>
      </div>

      {/* CLIENT SPEC PROFILE INTERACTION MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl text-left">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Edit Client Profile</h3>
              <p className="text-[11px] text-slate-400 font-medium">Updates made here instantly sync to the homeowner client portal and downstream data tables.</p>
            </div>
            
            <div className="space-y-4 text-xs">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Homeowner Name</label>
                <input 
                  type="text" 
                  value={editName} 
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full py-3 px-4 bg-slate-50 border rounded-xl font-bold outline-none text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Email Address Channel</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full py-3 px-4 bg-slate-50 border rounded-xl font-mono font-bold outline-none text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Target Project Site Address</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full py-3 px-4 bg-slate-50 border rounded-xl font-bold outline-none text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Project Title</label>
                <input
                  type="text"
                  value={editProjectTitle}
                  onChange={(e) => setEditProjectTitle(e.target.value)}
                  placeholder="e.g. Bath Remodel, Basement Finish, Kitchen Remodel"
                  className="w-full py-3 px-4 bg-slate-50 border rounded-xl font-bold outline-none text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
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
                className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-black text-[10px] px-5 py-2.5 rounded-xl uppercase tracking-wider transition-all duration-200 hover:shadow-md shadow-md"
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