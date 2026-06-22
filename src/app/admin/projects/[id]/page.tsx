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

  // Document Upload States
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  // Email States
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Payment Reminder States
  const [sendingReminderIdx, setSendingReminderIdx] = useState<number | null>(null);

  // Selections Manager States
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingChoiceIdx, setAddingChoiceIdx] = useState<number | null>(null);
  const [newChoiceText, setNewChoiceText] = useState("");
  const [editingCategoryIdx, setEditingCategoryIdx] = useState<number | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");

  // Change Order States
  const [coDescription, setCoDescription] = useState("");
  const [coItems, setCoItems] = useState<any[]>([]);
  const [isGeneratingCo, setIsGeneratingCo] = useState(false);
  const [isDeployingCo, setIsDeployingCo] = useState(false);
  const [changeOrders, setChangeOrders] = useState<any[]>([]);

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

      const { data: cos } = await supabase
        .from("invoices")
        .select("*")
        .eq("parent_id", projectId)
        .order("created_at", { ascending: true });
      if (cos) setChangeOrders(cos);
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

  async function sendProposalEmail() {
    if (!project?.homeowner_email) return toast("No email on file — add one in the client profile.", "error");
    if (!confirm(`Send proposal to ${project.homeowner_email}?`)) return;
    setIsSendingEmail(true);
    try {
      const res = await fetch("/api/send-proposal-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_id: projectId,
          base_url: window.location.origin,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      toast(`Proposal sent to ${data.sent_to}`, "success");
      fetchComprehensiveProjectData();
    } catch (err: any) {
      toast("Email failed: " + err.message, "error");
    } finally {
      setIsSendingEmail(false);
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
    const isApproved = project?.status === "approved";
    const calculatedNewTotal = isApproved
      ? updatedItems.reduce((sum, item) => sum + toNum(item.actual_cost ?? item.cost ?? item.mid_cost), 0)
      : updatedItems.reduce((sum, item) => sum + toNum(item.mid_cost), 0);

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

  async function saveSelectionOptions(updatedOptions: any[]) {
    setProject((prev: any) => ({ ...prev, homeowner_options: updatedOptions }));
    const { error } = await supabase
      .from("invoices")
      .update({ homeowner_options: updatedOptions })
      .eq("id", projectId);
    if (error) {
      toast("Failed to save selections: " + error.message, "error");
      fetchComprehensiveProjectData();
    }
  }

  const updateInlineItemField = (index: number, field: string, value: any) => {
    const currentItems = Array.isArray(project.items) ? [...project.items] : [];
    currentItems[index] = {
      ...currentItems[index],
      [field]: value
    };
    const isApproved = project?.status === "approved";
    const newTotal = isApproved
      ? currentItems.reduce((sum: number, item: any) => sum + toNum(item.actual_cost ?? item.cost ?? item.mid_cost), 0)
      : currentItems.reduce((sum: number, item: any) => sum + toNum(item.mid_cost), 0);
    setProject((prev: any) => ({
      ...prev,
      items: currentItems,
      amount: newTotal
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
            <button
              onClick={sendProposalEmail}
              disabled={isSendingEmail}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-[10px] px-4 py-2.5 rounded-xl uppercase tracking-wider transition-all duration-200 hover:shadow-md shadow-sm outline-none flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              {isSendingEmail ? "Sending..." : "Send Proposal"}
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
            {(() => {
              const items = Array.isArray(project?.items) ? project.items : [];
              const hasActuals = project?.status === "approved" && items.some((i: any) => i.actual_cost != null);
              const bidTotal = items.reduce((s: number, i: any) => s + toNum(i.cost || i.mid_cost), 0);
              const actualTotal = items.reduce((s: number, i: any) => s + toNum(i.actual_cost ?? i.cost ?? i.mid_cost), 0);
              if (hasActuals) {
                return (
                  <div className="space-y-1.5">
                    <h2 className="text-3xl font-black text-slate-950 tracking-tight font-sans" style={{fontVariantNumeric:'tabular-nums'}}>
                      ${actualTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </h2>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="text-slate-400 font-bold">Bid: <span className="text-slate-600 font-black">${bidTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></span>
                      <span className={`font-black ${actualTotal > bidTotal ? 'text-red-500' : 'text-emerald-600'}`}>
                        {actualTotal > bidTotal ? '▲' : '▼'} ${Math.abs(actualTotal - bidTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                );
              }
              return (
                <h2 className="text-3xl font-black text-slate-950 tracking-tight font-sans" style={{fontVariantNumeric:'tabular-nums'}}>
                  ${toNum(project?.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h2>
              );
            })()}
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

      {/* PROJECT DETAILS — start date & timeline */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="bg-white border border-slate-200/60 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] p-5">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="flex-1 space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Estimated Start Date</label>
              <input
                type="date"
                value={project?.estimated_start_date || ""}
                onChange={(e) => {
                  setProject((prev: any) => ({ ...prev, estimated_start_date: e.target.value || null }));
                }}
                onBlur={async () => {
                  const { error } = await supabase
                    .from("invoices")
                    .update({ estimated_start_date: project?.estimated_start_date || null })
                    .eq("id", projectId);
                  if (error) toast("Failed to save start date: " + error.message, "error");
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Project Timeline</label>
              <input
                type="text"
                placeholder="e.g. 8–10 Weeks"
                value={project?.project_length || ""}
                onChange={(e) => {
                  setProject((prev: any) => ({ ...prev, project_length: e.target.value }));
                }}
                onBlur={async () => {
                  const { error } = await supabase
                    .from("invoices")
                    .update({ project_length: project?.project_length || null })
                    .eq("id", projectId);
                  if (error) toast("Failed to save timeline: " + error.message, "error");
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* CLIENT ANNOUNCEMENT / PRIORITY BANNER */}
      {project?.status === "approved" && (
        <div className="max-w-7xl mx-auto px-4 pt-6">
          <div className="bg-white border border-slate-200/60 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                  Client Announcement
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">This message appears as a priority banner at the top of the homeowner portal. Leave blank to show the default status message.</p>
              </div>
              {project?.announcement && (
                <button
                  type="button"
                  onClick={async () => {
                    setProject((prev: any) => ({ ...prev, announcement: null }));
                    const { error } = await supabase
                      .from("invoices")
                      .update({ announcement: null })
                      .eq("id", projectId);
                    if (error) toast("Failed to clear: " + error.message, "error");
                    else toast("Announcement cleared", "success");
                  }}
                  className="text-red-400 hover:text-red-600 text-xs font-black transition p-2 rounded-lg hover:bg-red-50 shrink-0"
                >
                  Clear
                </button>
              )}
            </div>
            <textarea
              value={project?.announcement || ""}
              onChange={(e) => {
                setProject((prev: any) => ({ ...prev, announcement: e.target.value }));
              }}
              onBlur={async () => {
                const val = project?.announcement?.trim() || null;
                const { error } = await supabase
                  .from("invoices")
                  .update({ announcement: val })
                  .eq("id", projectId);
                if (error) toast("Failed to save announcement: " + error.message, "error");
                else if (val) toast("Announcement published", "success");
              }}
              placeholder="e.g. Tile selections are due by Friday — please visit the Selections tab and make your choices so we can stay on schedule."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all min-h-[60px]"
              rows={2}
            />
            {project?.announcement && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <span className="text-amber-600 text-sm shrink-0 mt-0.5">📢</span>
                <p className="text-[11px] font-medium text-amber-800 leading-relaxed">Live on portal: "{project.announcement}"</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PROPOSAL EXPIRATION TIMER — only pre-approval */}
      {project?.status !== "approved" && (
        <div className="max-w-7xl mx-auto px-4 pt-6">
          <div className="bg-white border border-slate-200/60 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Proposal Expiration
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">Set a deadline to hold pricing and a schedule slot. A live countdown appears on the client portal.</p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="datetime-local"
                  value={project?.proposal_expires_at ? new Date(new Date(project.proposal_expires_at).getTime() - new Date(project.proposal_expires_at).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""}
                  onChange={(e) => {
                    const val = e.target.value ? new Date(e.target.value).toISOString() : null;
                    setProject((prev: any) => ({ ...prev, proposal_expires_at: val }));
                  }}
                  onBlur={async () => {
                    const { error } = await supabase
                      .from("invoices")
                      .update({ proposal_expires_at: project?.proposal_expires_at || null })
                      .eq("id", projectId);
                    if (error) toast("Failed to save expiration: " + error.message, "error");
                    else toast("Expiration updated", "success");
                  }}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                />
                {project?.proposal_expires_at && (
                  <button
                    type="button"
                    onClick={async () => {
                      setProject((prev: any) => ({ ...prev, proposal_expires_at: null }));
                      const { error } = await supabase
                        .from("invoices")
                        .update({ proposal_expires_at: null })
                        .eq("id", projectId);
                      if (error) toast("Failed to clear expiration: " + error.message, "error");
                      else toast("Expiration removed", "success");
                    }}
                    className="text-red-400 hover:text-red-600 text-xs font-black transition p-2 rounded-lg hover:bg-red-50"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
            {project?.proposal_expires_at && (
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
                {new Date(project.proposal_expires_at) > new Date() ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <p className="text-[11px] font-bold text-slate-600">
                      Expires {new Date(project.proposal_expires_at).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      {' · '}
                      <span className="text-amber-600">
                        {(() => {
                          const diff = new Date(project.proposal_expires_at).getTime() - Date.now();
                          const days = Math.floor(diff / 86400000);
                          const hours = Math.floor((diff % 86400000) / 3600000);
                          if (days > 0) return `${days}d ${hours}h remaining`;
                          const mins = Math.floor((diff % 3600000) / 60000);
                          return `${hours}h ${mins}m remaining`;
                        })()}
                      </span>
                    </p>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <p className="text-[11px] font-bold text-red-600">Proposal expired — client can no longer accept</p>
                  </>
                )}
              </div>
            )}
          </div>
          {Array.isArray(project?.proposal_emails) && project.proposal_emails.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">Email History</p>
              <div className="flex flex-wrap gap-2">
                {project.proposal_emails.map((log: any, i: number) => (
                  <span key={i} className={`text-[9px] font-bold px-2.5 py-1 rounded-lg border ${
                    log.type === 'reminder' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-blue-50 text-blue-700 border-blue-100'
                  }`}>
                    {log.type === 'reminder' ? `Reminder (${log.tier})` : 'Proposal sent'} · {new Date(log.sent_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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
              const isApprovedProject = project?.status === "approved";
              const activePhaseIdx = project?.current_phase_index || 0;
              const isPhasePaid = isApprovedProject && project?.deposit_cleared && (idx === 0 || idx < activePhaseIdx);
              const isPhaseActive = isApprovedProject && (idx === activePhaseIdx || (idx === 0 && !project?.deposit_cleared));
              const canRemind = isApprovedProject && isPhaseActive && !isPhasePaid;
              return (
                <div key={idx} className="bg-slate-50/50 border border-slate-200/60 rounded-xl p-2.5 group space-y-2">
                  <div className="flex items-center gap-2">
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
                    {isApprovedProject && isPhasePaid && (
                      <span className="text-[8px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0">Paid</span>
                    )}
                    {isApprovedProject && isPhaseActive && !isPhasePaid && (
                      <span className="text-[8px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 animate-pulse shrink-0">Due</span>
                    )}
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
                  {canRemind && (
                    <button
                      type="button"
                      disabled={sendingReminderIdx === idx}
                      onClick={async () => {
                        if (!project?.homeowner_email) return toast("No email on file.", "error");
                        setSendingReminderIdx(idx);
                        try {
                          const totalPaid = (project.payment_history || []).reduce((s: number, p: any) => s + toNum(p.amount), 0);
                          const totalRemaining = toNum(project.amount) - totalPaid;
                          const res = await fetch("/api/send-payment-reminder", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              invoice_id: projectId,
                              phase_name: phase.name,
                              phase_amount: phaseAmount,
                              total_remaining: totalRemaining,
                              base_url: window.location.origin,
                            }),
                          });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error || "Failed");
                          toast(`Reminder sent to ${data.sent_to}`, "success");
                        } catch (err: any) {
                          toast("Reminder failed: " + err.message, "error");
                        } finally {
                          setSendingReminderIdx(null);
                        }
                      }}
                      className="w-full flex items-center justify-center gap-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-black text-[9px] py-1.5 rounded-lg uppercase tracking-wider transition-all duration-200 outline-none"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      {sendingReminderIdx === idx ? "Sending..." : "Send Payment Reminder"}
                    </button>
                  )}
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

                {/* Cost+ Bid vs Actual (post-approval) */}
                {project?.status === "approved" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Bid Amount</span>
                      <p className="text-sm font-black text-slate-800" style={{fontVariantNumeric:'tabular-nums'}}>
                        ${toNum(item.cost || item.mid_cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className={`p-3 rounded-xl border ${item.actual_cost != null ? 'bg-emerald-50/50 border-emerald-200' : 'bg-amber-50/50 border-amber-200'}`}>
                      <span className={`text-[9px] font-black uppercase tracking-wider block mb-1.5 ${item.actual_cost != null ? 'text-emerald-600' : 'text-amber-600'}`}>
                        Actual Cost
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-bold text-slate-400">$</span>
                        <input
                          type="number"
                          value={item.actual_cost ?? ""}
                          onChange={(e) => {
                            const val = e.target.value === "" ? null : toNum(e.target.value);
                            updateInlineItemField(idx, "actual_cost", val);
                          }}
                          placeholder="Enter actual"
                          className="w-full bg-transparent text-sm font-black text-slate-900 outline-none"
                          style={{fontVariantNumeric:'tabular-nums'}}
                        />
                      </div>
                      {item.actual_cost != null && (
                        <p className={`text-[9px] font-bold mt-1 ${toNum(item.actual_cost) > toNum(item.cost || item.mid_cost) ? 'text-red-500' : 'text-emerald-600'}`}>
                          {toNum(item.actual_cost) > toNum(item.cost || item.mid_cost) ? '▲' : '▼'} ${Math.abs(toNum(item.actual_cost) - toNum(item.cost || item.mid_cost)).toLocaleString(undefined, {minimumFractionDigits:2})} ({toNum(item.cost || item.mid_cost) > 0 ? ((toNum(item.actual_cost) - toNum(item.cost || item.mid_cost)) / toNum(item.cost || item.mid_cost) * 100).toFixed(1) : '0'}%)
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Dual Column Layout Matrix Split Tier (pre-approval editing) */}
                {project?.status !== "approved" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Standard Mid Tier Configuration Box */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2 shadow-sm">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Standard Mid-Tier Spec</span>
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
                      <span className="text-[9px] font-black text-indigo-600 uppercase tracking-wider">Luxury High-Tier Upgrade</span>
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
                )}

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

      {/* HOMEOWNER SELECTIONS MANAGER — post-approval */}
      {project?.status === "approved" && (
        <div className="max-w-7xl mx-auto px-4 pt-6">
          <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] space-y-5">
            <div className="border-b pb-3 border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
                Homeowner Selections
              </h3>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">Create selection categories for your client (tile, hardware, countertops, etc.). Each category can have multiple options for the homeowner to choose from in their Selections tab.</p>
            </div>

            {/* Existing Categories */}
            {Array.isArray(project?.homeowner_options) && project.homeowner_options.length > 0 && (
              <div className="space-y-3">
                {project.homeowner_options.map((group: any, gIdx: number) => {
                  const chosen = project?.homeowner_selections?.[group.category];
                  return (
                    <div key={gIdx} className="border border-slate-200 rounded-2xl bg-slate-50/30 overflow-hidden">
                      {/* Category Header */}
                      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200/60">
                        {editingCategoryIdx === gIdx ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="text"
                              value={editingCategoryName}
                              onChange={(e) => setEditingCategoryName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && editingCategoryName.trim()) {
                                  const updated = [...project.homeowner_options];
                                  updated[gIdx] = { ...updated[gIdx], category: editingCategoryName.trim() };
                                  saveSelectionOptions(updated);
                                  setEditingCategoryIdx(null);
                                }
                              }}
                              autoFocus
                              className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (!editingCategoryName.trim()) return;
                                const updated = [...project.homeowner_options];
                                updated[gIdx] = { ...updated[gIdx], category: editingCategoryName.trim() };
                                saveSelectionOptions(updated);
                                setEditingCategoryIdx(null);
                              }}
                              className="text-[9px] font-black text-emerald-600 hover:text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg transition"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCategoryIdx(null)}
                              className="text-[9px] font-black text-slate-400 hover:text-slate-600 px-2 py-1.5 transition"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide truncate">{group.category}</span>
                            {chosen && (
                              <span className="text-[8px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0">
                                Selected: {chosen}
                              </span>
                            )}
                            {!chosen && (
                              <span className="text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0">
                                Awaiting Selection
                              </span>
                            )}
                          </div>
                        )}
                        {editingCategoryIdx !== gIdx && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => { setEditingCategoryIdx(gIdx); setEditingCategoryName(group.category); }}
                              className="text-[9px] font-black text-slate-400 hover:text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-100 transition"
                            >
                              Rename
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (!confirm(`Delete "${group.category}" and all its options?`)) return;
                                const updated = project.homeowner_options.filter((_: any, i: number) => i !== gIdx);
                                const updatedSelections = { ...(project.homeowner_selections || {}) };
                                delete updatedSelections[group.category];
                                setProject((prev: any) => ({ ...prev, homeowner_options: updated, homeowner_selections: updatedSelections }));
                                supabase.from("invoices").update({ homeowner_options: updated, homeowner_selections: updatedSelections }).eq("id", projectId);
                              }}
                              className="text-[9px] font-black text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Choices Grid */}
                      <div className="px-4 py-3 space-y-2">
                        <div className="flex flex-wrap gap-1.5">
                          {group.choices.map((choice: string, cIdx: number) => {
                            const isChosen = chosen === choice;
                            return (
                              <div
                                key={cIdx}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all group/choice ${
                                  isChosen
                                    ? 'bg-slate-900 border-slate-900 text-white'
                                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                                }`}
                              >
                                {isChosen && <span className="text-emerald-400 text-[10px]">✓</span>}
                                <span>{choice}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!confirm(`Remove "${choice}" from ${group.category}?`)) return;
                                    const updated = [...project.homeowner_options];
                                    updated[gIdx] = {
                                      ...updated[gIdx],
                                      choices: updated[gIdx].choices.filter((_: string, ci: number) => ci !== cIdx)
                                    };
                                    if (isChosen) {
                                      const updatedSelections = { ...(project.homeowner_selections || {}) };
                                      delete updatedSelections[group.category];
                                      setProject((prev: any) => ({ ...prev, homeowner_selections: updatedSelections }));
                                      supabase.from("invoices").update({ homeowner_selections: updatedSelections }).eq("id", projectId);
                                    }
                                    saveSelectionOptions(updated);
                                  }}
                                  className={`ml-0.5 text-[10px] font-black transition opacity-0 group-hover/choice:opacity-100 ${
                                    isChosen ? 'text-white/50 hover:text-white' : 'text-slate-300 hover:text-red-500'
                                  }`}
                                >
                                  ✕
                                </button>
                              </div>
                            );
                          })}
                        </div>

                        {/* Add Choice Input */}
                        {addingChoiceIdx === gIdx ? (
                          <div className="flex items-center gap-2 pt-1">
                            <input
                              type="text"
                              value={newChoiceText}
                              onChange={(e) => setNewChoiceText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && newChoiceText.trim()) {
                                  const updated = [...project.homeowner_options];
                                  updated[gIdx] = {
                                    ...updated[gIdx],
                                    choices: [...updated[gIdx].choices, newChoiceText.trim()]
                                  };
                                  saveSelectionOptions(updated);
                                  setNewChoiceText("");
                                }
                                if (e.key === "Escape") {
                                  setAddingChoiceIdx(null);
                                  setNewChoiceText("");
                                }
                              }}
                              autoFocus
                              placeholder="Type option name and press Enter"
                              className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (!newChoiceText.trim()) return;
                                const updated = [...project.homeowner_options];
                                updated[gIdx] = {
                                  ...updated[gIdx],
                                  choices: [...updated[gIdx].choices, newChoiceText.trim()]
                                };
                                saveSelectionOptions(updated);
                                setNewChoiceText("");
                              }}
                              className="bg-slate-900 text-white font-black text-[9px] px-3 py-2 rounded-lg uppercase tracking-wider transition hover:bg-slate-800 shrink-0"
                            >
                              Add
                            </button>
                            <button
                              type="button"
                              onClick={() => { setAddingChoiceIdx(null); setNewChoiceText(""); }}
                              className="text-slate-400 hover:text-slate-600 font-black text-xs p-1 transition"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => { setAddingChoiceIdx(gIdx); setNewChoiceText(""); }}
                            className="text-[9px] font-black text-blue-500 hover:text-blue-700 uppercase tracking-wider transition flex items-center gap-1 pt-1"
                          >
                            <span className="text-[11px]">+</span> Add Option
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Empty State */}
            {(!project?.homeowner_options || project.homeowner_options.length === 0) && (
              <div className="text-center py-8 space-y-2">
                <div className="w-12 h-12 rounded-full bg-slate-100 mx-auto flex items-center justify-center border border-slate-200">
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
                </div>
                <p className="text-xs font-bold text-slate-500">No selection categories yet</p>
                <p className="text-[10px] text-slate-400">Add categories below for your client to choose finishes, materials, hardware, etc.</p>
              </div>
            )}

            {/* Add New Category */}
            <div className="border-t border-slate-100 pt-4">
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">New Selection Category</label>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newCategoryName.trim()) {
                        const current = Array.isArray(project?.homeowner_options) ? [...project.homeowner_options] : [];
                        const duplicate = current.some((g: any) => g.category.toLowerCase() === newCategoryName.trim().toLowerCase());
                        if (duplicate) return toast("Category already exists.", "info");
                        const updated = [...current, { category: newCategoryName.trim(), choices: [] }];
                        saveSelectionOptions(updated);
                        setNewCategoryName("");
                        toast(`"${newCategoryName.trim()}" added — now add options for the homeowner to choose from.`, "success");
                      }
                    }}
                    placeholder="e.g. Backsplash Tile, Cabinet Hardware, Countertop Material, Paint Color"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                  />
                </div>
                <button
                  type="button"
                  disabled={!newCategoryName.trim()}
                  onClick={() => {
                    if (!newCategoryName.trim()) return;
                    const current = Array.isArray(project?.homeowner_options) ? [...project.homeowner_options] : [];
                    const duplicate = current.some((g: any) => g.category.toLowerCase() === newCategoryName.trim().toLowerCase());
                    if (duplicate) return toast("Category already exists.", "info");
                    const updated = [...current, { category: newCategoryName.trim(), choices: [] }];
                    saveSelectionOptions(updated);
                    setNewCategoryName("");
                    toast(`"${newCategoryName.trim()}" added — now add options for the homeowner to choose from.`, "success");
                  }}
                  className="bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-white font-black text-[10px] px-5 py-2.5 rounded-xl uppercase tracking-wider transition-all duration-200 hover:shadow-md shadow-sm shrink-0"
                >
                  + Add Category
                </button>
              </div>
            </div>

            {/* Summary row */}
            {Array.isArray(project?.homeowner_options) && project.homeowner_options.length > 0 && (
              <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500">
                  <span>{project.homeowner_options.length} {project.homeowner_options.length === 1 ? 'category' : 'categories'}</span>
                  <span className="text-slate-300">|</span>
                  <span>{project.homeowner_options.reduce((s: number, g: any) => s + (g.choices?.length || 0), 0)} total options</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-bold">
                  <span className="text-emerald-600">
                    {Object.keys(project?.homeowner_selections || {}).length} selected
                  </span>
                  <span className="text-amber-600">
                    {project.homeowner_options.length - Object.keys(project?.homeowner_selections || {}).length} pending
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
                // Notify homeowner via email (fire-and-forget)
                if (project?.homeowner_email) {
                  fetch("/api/send-message-notification", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      homeowner_name: project.homeowner_name,
                      homeowner_email: project.homeowner_email,
                      project_title: project.project_title,
                      job_address: project.job_address,
                      message_text: newMsg.text,
                      portal_url: `${window.location.origin}/invoice/${projectId}`,
                    }),
                  }).catch(() => {});
                }
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

      {/* PROJECT DOCUMENTS UPLOAD */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] space-y-5">
          <div className="border-b pb-3 border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Documents</h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Upload contracts, permits, plans, and other project documents. These appear in the homeowner's Docs tab.</p>
          </div>

          <label className={`flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-xl py-4 cursor-pointer transition-all ${isUploadingDoc ? 'opacity-50 pointer-events-none' : ''}`}>
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-8m0 0l-3 3m3-3l3 3M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /></svg>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{isUploadingDoc ? "Uploading..." : "Upload Document"}</span>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.heic"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setIsUploadingDoc(true);
                try {
                  const filePath = `project-docs/${projectId}/${Date.now()}-${file.name}`;
                  const { error: uploadError } = await supabase.storage
                    .from("project-photos")
                    .upload(filePath, file);
                  if (uploadError) throw uploadError;
                  const { data: urlData } = supabase.storage
                    .from("project-photos")
                    .getPublicUrl(filePath);
                  const docEntry = {
                    name: file.name,
                    url: urlData.publicUrl,
                    uploaded_at: new Date().toISOString(),
                    size: file.size
                  };
                  const currentDocs = Array.isArray(project?.documents) ? [...project.documents] : [];
                  const updatedDocs = [...currentDocs, docEntry];
                  const { error } = await supabase.from("invoices").update({ documents: updatedDocs }).eq("id", projectId);
                  if (error) throw error;
                  setProject((prev: any) => ({ ...prev, documents: updatedDocs }));
                  toast("Document uploaded", "success");
                } catch (err: any) {
                  toast("Upload failed: " + err.message, "error");
                } finally {
                  setIsUploadingDoc(false);
                  e.target.value = "";
                }
              }}
            />
          </label>

          {Array.isArray(project?.documents) && project.documents.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {project.documents.map((doc: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2.5 group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center shrink-0">
                      <span className="text-[9px] font-black text-slate-500 uppercase">{doc.name?.split('.').pop()?.slice(0, 4)}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{doc.name}</p>
                      <p className="text-[9px] text-slate-400 font-medium">
                        {new Date(doc.uploaded_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        {doc.size && ` · ${(doc.size / 1024).toFixed(0)} KB`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-[9px] px-2.5 py-1 rounded-lg uppercase tracking-wider transition outline-none"
                    >
                      View
                    </a>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm(`Remove "${doc.name}"?`)) return;
                        const updatedDocs = project.documents.filter((_: any, idx: number) => idx !== i);
                        setProject((prev: any) => ({ ...prev, documents: updatedDocs }));
                        const { error } = await supabase.from("invoices").update({ documents: updatedDocs }).eq("id", projectId);
                        if (error) toast("Failed to remove: " + error.message, "error");
                      }}
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-xs font-black transition-all p-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center italic text-slate-400 text-xs py-4">No documents uploaded yet.</p>
          )}
        </div>
      </div>

      {/* CHANGE ORDERS — only post-approval */}
      {project?.status === "approved" && (
        <div className="max-w-7xl mx-auto px-4 pt-6">
          <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] space-y-5">
            <div className="border-b pb-3 border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Change Orders</h3>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">Create scope modifications with AI-generated line items. Deployed change orders appear on the homeowner portal for approval.</p>
            </div>

            {/* Existing Change Orders */}
            {changeOrders.length > 0 && (
              <div className="space-y-2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Deployed Change Orders</p>
                {changeOrders.map((co: any) => (
                  <div key={co.id} className="flex items-center justify-between bg-slate-50/50 border border-slate-200/60 rounded-xl p-3 text-xs">
                    <div className="space-y-0.5 min-w-0">
                      <p className="font-bold text-slate-800 truncate">{co.description || co.project_title || "Change Order"}</p>
                      <div className="flex gap-1.5">
                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md border ${co.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                          {co.status === 'approved' ? 'Approved' : 'Pending'}
                        </span>
                        {co.status === 'approved' && (
                          <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md border ${co.deposit_cleared ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                            {co.deposit_cleared ? 'Paid' : 'Unpaid'}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="font-mono font-black text-slate-900 shrink-0" style={{fontVariantNumeric:'tabular-nums'}}>
                      ${toNum(co.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Create New Change Order */}
            <div className="border border-blue-100 bg-blue-50/20 rounded-2xl p-5 space-y-4">
              <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-wider">+ Create Change Order</h4>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Describe the additional scope</label>
                <textarea
                  value={coDescription}
                  onChange={(e) => setCoDescription(e.target.value)}
                  placeholder="e.g. Add recessed lighting to living room, 6 cans on dimmers, patch and paint ceiling..."
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all shadow-sm min-h-[80px]"
                  rows={3}
                />
              </div>
              <button
                type="button"
                disabled={isGeneratingCo || !coDescription.trim()}
                onClick={async () => {
                  setIsGeneratingCo(true);
                  setCoItems([]);
                  try {
                    const res = await fetch("/api/generate-scope", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        prompt: coDescription,
                        address: project?.job_address || "",
                        zipcode: "Omaha",
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || "Generation failed");
                    setCoItems(data.items || []);
                  } catch (err: any) {
                    toast("AI generation failed: " + err.message, "error");
                  } finally {
                    setIsGeneratingCo(false);
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-black text-[10px] px-5 py-2.5 rounded-xl uppercase tracking-wider transition-all duration-200 hover:shadow-md shadow-sm outline-none flex items-center gap-1.5"
              >
                {isGeneratingCo ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
                    Generate Line Items with AI
                  </>
                )}
              </button>

              {/* Generated Items Preview */}
              {coItems.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-blue-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Generated Items — edit costs before deploying</p>
                  {coItems.map((item: any, idx: number) => (
                    <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={item.title || ""}
                          onChange={(e) => {
                            const updated = [...coItems];
                            updated[idx] = { ...updated[idx], title: e.target.value };
                            setCoItems(updated);
                          }}
                          className="flex-1 text-xs font-bold text-slate-900 bg-transparent outline-none"
                        />
                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 gap-1 shrink-0">
                          <span className="text-[10px] font-bold text-slate-400">$</span>
                          <input
                            type="number"
                            value={item.mid_cost || ""}
                            onChange={(e) => {
                              const updated = [...coItems];
                              updated[idx] = { ...updated[idx], mid_cost: toNum(e.target.value) };
                              setCoItems(updated);
                            }}
                            className="w-20 bg-transparent py-1.5 text-xs font-black text-slate-900 outline-none text-right"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setCoItems(coItems.filter((_, i) => i !== idx))}
                          className="text-red-400 hover:text-red-600 text-xs font-black transition p-1"
                        >
                          ✕
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{item.mid_description}</p>
                    </div>
                  ))}

                  <div className="flex items-center justify-between pt-2">
                    <div className="text-xs font-bold text-slate-600">
                      Total: <span className="font-black text-slate-900" style={{fontVariantNumeric:'tabular-nums'}}>
                        ${coItems.reduce((s, i) => s + toNum(i.mid_cost), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={isDeployingCo || coItems.length === 0}
                      onClick={async () => {
                        if (!confirm("Deploy this change order to the homeowner portal?")) return;
                        setIsDeployingCo(true);
                        try {
                          const finalItems = coItems.map((item) => ({
                            title: item.title,
                            description: item.mid_description,
                            cost: toNum(item.mid_cost),
                          }));
                          const totalAmount = finalItems.reduce((s, i) => s + i.cost, 0);
                          const { error } = await supabase.from("invoices").insert({
                            parent_id: projectId,
                            homeowner_name: project?.homeowner_name,
                            homeowner_email: project?.homeowner_email,
                            job_address: project?.job_address,
                            project_title: project?.project_title,
                            description: coDescription,
                            items: finalItems,
                            amount: totalAmount,
                            status: "pending",
                            deposit_percentage: 0,
                            payment_phases: [{ name: "Full Payment", percentage: 100 }],
                          });
                          if (error) throw error;
                          toast("Change order deployed", "success");
                          setCoDescription("");
                          setCoItems([]);
                          fetchComprehensiveProjectData();
                        } catch (err: any) {
                          toast("Failed to deploy: " + err.message, "error");
                        } finally {
                          setIsDeployingCo(false);
                        }
                      }}
                      className="bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-black text-[10px] px-6 py-2.5 rounded-xl uppercase tracking-wider transition-all duration-200 hover:shadow-md shadow-sm outline-none flex items-center gap-1.5"
                    >
                      {isDeployingCo ? "Deploying..." : "Deploy Change Order"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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