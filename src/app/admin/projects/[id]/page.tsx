"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function ProjectDetailPanel() {
  const { id } = useParams();
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [changeOrders, setChangeOrders] = useState<any[]>([]);
  const [scheduleTasks, setScheduleTasks] = useState<any[]>([]);
  const [dailyLogs, setDailyLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Editable main invoice items state copy
  const [editableItems, setEditableItems] = useState<any[]>([]);
  const [isUpdatingItems, setIsUpdatingItems] = useState(false);

  // Daily Log state variables
  const [logText, setLogText] = useState("");
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [isSubmittingLog, setIsSubmittingLog] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Advanced Sophisticated Gantt Scheduler Workspace State Variables
  const [taskName, setTaskName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedParentId, setSelectedParentId] = useState<string>("master");
  const [selectedColor, setSelectedColor] = useState("bg-amber-400/20 text-amber-800 border-amber-300");
  const [isPublishingTask, setIsPublishingTask] = useState(false);

  // Material selection state variables
  const [category, setCategory] = useState("");
  const [choicesText, setChoicesText] = useState("");

  // AI Change Order generator variables
  const [coPrompt, setCoPrompt] = useState("");
  const [isGeneratingCO, setIsGeneratingCO] = useState(false);
  const [coLineItems, setCoLineItems] = useState<any[]>([]);
  const [coTitle, setCoTitle] = useState("Change Order Supplement");

  useEffect(() => {
    if (id) {
      fetchProjectDetail();
    }
  }, [id]);

  async function fetchProjectDetail() {
    setLoading(true);
    try {
      const { data: mainProject, error: projectError } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", id)
        .single();

      if (projectError) throw projectError;

      if (mainProject) {
        setProject(mainProject);
        setEditableItems(Array.isArray(mainProject.items) ? mainProject.items : []);
        
        const { data: children } = await supabase
          .from("invoices")
          .select("*")
          .eq("parent_id", id)
          .order("created_at", { ascending: true });
        if (children) setChangeOrders(children);

        const { data: schedule } = await supabase
          .from("project_schedules")
          .select("*")
          .eq("project_id", id)
          .order("sort_order", { ascending: true })
          .order("target_start_date", { ascending: true });
        if (schedule) setScheduleTasks(schedule);

        const { data: logs } = await supabase
          .from("project_logs")
          .select("*")
          .eq("project_id", id)
          .order("created_at", { ascending: false });
        if (logs) setDailyLogs(logs);
      }
    } catch (err) {
      console.error("Supabase ledger retrieval exception:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleItemFieldChange = (index: number, field: string, value: any) => {
    const updated = [...editableItems];
    updated[index] = { ...updated[index], [field]: value };
    setEditableItems(updated);
  };

  const saveProjectScopeModifications = async () => {
    if (!project) return;
    setIsUpdatingItems(true);

    const strictRecalculatedTotal = editableItems.reduce((sum, item) => {
      const activeCostField = parseFloat(item.mid_cost) || parseFloat(item.cost) || 0;
      return sum + activeCostField;
    }, 0);

    const { error } = await supabase
      .from("invoices")
      .update({ 
        items: editableItems,
        amount: strictRecalculatedTotal 
      })
      .eq("id", id);

    if (error) {
      alert("Error processing save operational updates: " + error.message);
    } else {
      alert("Project contract parameters synchronized successfully!");
      fetchProjectDetail();
    }
    setIsUpdatingItems(false);
  };

  const removeScopeItemRow = async (index: number) => {
    if (!confirm("Are you sure you want to permanently delete this line item phase?")) return;
    const filteredItems = editableItems.filter((_, i) => i !== index);
    
    const newRecalculatedTotal = filteredItems.reduce((sum, item) => {
      const activeCostField = parseFloat(item.mid_cost) || parseFloat(item.cost) || 0;
      return sum + activeCostField;
    }, 0);

    const { error } = await supabase
      .from("invoices")
      .update({ 
        items: filteredItems,
        amount: newRecalculatedTotal 
      })
      .eq("id", id);

    if (!error) {
      alert("Phase item removed.");
      fetchProjectDetail();
    }
  };

  const handleDevicePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      const fileExtension = file.name.split(".").pop();
      const uniqueFileName = `${id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;

      const { error: uploadError } = await supabase.storage
        .from("project_photos")
        .upload(uniqueFileName, file, {
          cacheControl: "3600",
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("project_photos")
        .getPublicUrl(uniqueFileName);

      if (publicUrlData && publicUrlData.publicUrl) {
        setUploadedPhotos((prev) => [...prev, publicUrlData.publicUrl]);
      }
    } catch (err: any) {
      alert("Photo asset upload error: " + err.message);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handlePublishDailyLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logText.trim()) return;
    setIsSubmittingLog(true);

    const { error } = await supabase
      .from("project_logs")
      .insert([
        {
          project_id: id,
          log_text: logText.trim(),
          photo_urls: uploadedPhotos
        }
      ]);

    if (error) {
      alert("Error publishing site update logs: " + error.message);
    } else {
      setLogText("");
      setUploadedPhotos([]);
      fetchProjectDetail();
    }
    setIsSubmittingLog(false);
  };

  const handlePublishGanttTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim() || !startDate || !endDate) return;
    setIsPublishingTask(true);

    const isSubTask = selectedParentId !== "master";
    const nextSortOrder = scheduleTasks.length * 10;

    const { error } = await supabase
      .from("project_schedules")
      .insert([
        {
          project_id: id,
          task_name: taskName.trim(),
          target_start_date: startDate,
          target_end_date: endDate,
          parent_id: isSubTask ? selectedParentId : null,
          color_theme: selectedColor,
          progress_percent: 0,
          status: "scheduled",
          sort_order: nextSortOrder
        }
      ]);

    if (error) {
      alert("Scheduler insertion exception: " + error.message);
    } else {
      setTaskName("");
      setStartDate("");
      setEndDate("");
      setSelectedParentId("master");
      fetchProjectDetail();
    }
    setIsPublishingTask(false);
  };

  const handleUpdateTaskSlider = async (taskId: string, percentVal: number) => {
    let nextStatus = "scheduled";
    if (percentVal > 0 && percentVal < 100) nextStatus = "in_progress";
    if (percentVal === 100) nextStatus = "completed";

    await supabase
      .from("project_schedules")
      .update({ progress_percent: percentVal, status: nextStatus })
      .eq("id", taskId);

    const { data: refreshed } = await supabase
      .from("project_schedules")
      .select("*")
      .eq("project_id", id)
      .order("sort_order", { ascending: true })
      .order("target_start_date", { ascending: true });
    if (refreshed) setScheduleTasks(refreshed);
  };

  const handleDropScheduleTask = async (taskId: string) => {
    if (!confirm("Permanently strip this timeline row block from the project calendar?")) return;
    await supabase.from("project_schedules").delete().eq("id", taskId);
    fetchProjectDetail();
  };

  const handleClearPhotos = () => {
    setUploadedPhotos([]);
  };

  const toggleDeposit = async () => {
    if (!project) return;
    const { error } = await supabase
      .from("invoices")
      .update({ deposit_cleared: !project.deposit_cleared })
      .eq("id", id);
    if (!error) fetchProjectDetail();
  };

  const toggleChangeOrderPaymentStatus = async (co: any) => {
    const nextState = !co.deposit_cleared;
    const { error } = await supabase
      .from("invoices")
      .update({ deposit_cleared: nextState })
      .eq("id", co.id);
    if (!error) fetchProjectDetail();
  };

  const shiftPhase = async (increment: boolean) => {
    if (!project) return;
    const curr = project.current_phase_index || 0;
    const nextIdx = increment ? curr + 1 : curr - 1;
    const { error } = await supabase
      .from("invoices")
      .update({ current_phase_index: nextIdx })
      .eq("id", id);
    if (!error) fetchProjectDetail();
  };

  const handlePushOptionGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !category.trim() || !choicesText.trim()) return;

    const choicesArray = choicesText.split(",").map(c => c.trim()).filter(Boolean);
    const currentOptions = project.homeowner_options || [];
    const updatedOptions = [...currentOptions, { category: category.trim(), choices: choicesArray }];

    const { error } = await supabase
      .from("invoices")
      .update({ homeowner_options: updatedOptions })
      .eq("id", id);

    if (!error) {
      setCategory("");
      setChoicesText("");
      fetchProjectDetail();
    }
  };

  const handleClearAllOptions = async () => {
    if (!confirm("Wipe planned options parameters?")) return;
    const { error } = await supabase
      .from("invoices")
      .update({ homeowner_options: [] })
      .eq("id", id);
    if (!error) fetchProjectDetail();
  };

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}/invoice/${id}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const runAiChangeOrderEstimator = async () => {
    if (!coPrompt.trim()) return alert("Please specify the additional trade scope for the AI assistant.");
    setIsGeneratingCO(true);
    try {
      const res = await fetch("/api/generate-scope", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt: `Change Order modification: ${coPrompt}`, 
          address: project.job_address || "Project Address", 
          zipcode: "Omaha" 
        }),
      });
      const data = await res.json();
      if (data.items && Array.isArray(data.items)) {
        setCoLineItems(data.items);
      }
    } catch (err) {
      alert("AI compiler failure mapping scope components.");
    }
    setIsGeneratingCO(false);
  };

  const handleUpdateCoField = (idx: number, field: string, value: any) => {
    const updated = [...coLineItems];
    updated[idx] = { ...updated[idx], [field]: value };
    setCoLineItems(updated);
  };

  const handleDeleteCoLineItem = (idx: number) => {
    setCoLineItems(coLineItems.filter((_, i) => i !== idx));
  };

  const deployChangeOrderToPortal = async () => {
    if (!project || coLineItems.length === 0) return alert("Generate or customize scope items before broadcasting.");
    
    const coTotalCost = coLineItems.reduce((sum, item) => sum + (parseFloat(item.mid_cost) || 0), 0);
    const flattenedItems = coLineItems.map(item => ({
      title: item.title || "Change Order Item",
      description: item.mid_description || item.description || "",
      cost: parseFloat(item.mid_cost) || 0
    }));

    const { error } = await supabase
      .from("invoices")
      .insert([
        {
          parent_id: id,
          homeowner_name: project.homeowner_name,
          homeowner_email: project.homeowner_email,
          job_address: project.job_address || "Project Address",
          amount: coTotalCost,
          description: coTitle.trim(),
          items: flattenedItems,
          status: "pending",
          deposit_percentage: 0,
          current_phase_index: 0,
          deposit_cleared: false
        }
      ]);

    if (error) {
      alert("Deployment error: " + error.message);
    } else {
      alert("Change Order published directly to client view!");
      setCoPrompt("");
      setCoLineItems([]);
      setCoTitle("Change Order Supplement");
      fetchProjectDetail();
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center font-sans">
      <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!project) return <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center text-slate-700 font-bold">Workspace ledger file not found.</div>;

  const baseContractAmount = typeof project.amount === "number" ? project.amount : 0;
  const rawViewHistory = Array.isArray(project.view_history) ? project.view_history : [];

  const masterMilestones = scheduleTasks.filter(t => !t.parent_id);
  const getSubTasksForMilestone = (parentId: string) => scheduleTasks.filter(t => t.parent_id === parentId);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans antialiased pb-24 text-left selection:bg-slate-900/10 tracking-normal">
      
      {/* Premium Sticky Control Banner */}
      <div className="bg-slate-900 text-white border-b border-slate-800 shadow-sm sticky top-0 z-50 backdrop-blur-md bg-slate-900/95">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div className="space-y-0.5">
            <button type="button" onClick={() => router.push("/admin/projects")} className="text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-white transition-colors">
              ← Back to Project Index Ledger
            </button>
            <h1 className="text-base font-extrabold tracking-tight uppercase text-slate-100 mt-1">{project.homeowner_name || "Unknown Client"} Workspace</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded border shadow-sm ${
              project.status === 'approved' ? 'bg-emerald-600 border-transparent text-white' : 'bg-amber-50 border-transparent text-white'
            }`}>
              • Proposal State: {project.status || "pending"}
            </span>
            <button
              type="button"
              onClick={handleCopyLink}
              className={`text-[10px] font-black px-4 py-2 rounded-lg shadow-sm uppercase tracking-wider transition-all border ${
                copied ? 'bg-emerald-600 text-white border-transparent' : 'bg-white text-slate-900 hover:bg-slate-50 border-slate-200'
              }`}
            >
              {copied ? "✓ Portal URL Copied" : "Copy Live Portal Link"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-6 space-y-6">
        
        {/* CONDENSED & BALANCED ANALYTICS METRICS ROW */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.01)] text-xs flex flex-col justify-between">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b pb-1 border-slate-100 mb-2">Project Address</p>
              <p className="font-extrabold text-slate-800 text-sm leading-snug">{project.job_address && project.job_address.trim() !== "" ? project.job_address : "No Address Listed"}</p>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-2">Client: {project.homeowner_email || "No Email Mapped"}</p>
          </div>
          
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.01)] text-xs flex flex-col justify-between">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b pb-1 border-slate-100 mb-2">Project Cost</p>
            <div className="flex items-center justify-between mt-1">
              <span className="font-sans font-black text-slate-900 text-2xl tracking-tight">
                ${baseContractAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              
              <div className="flex items-center gap-1.5 bg-slate-50 border px-2 py-1 rounded-lg">
                <span className="text-[8px] font-black uppercase text-slate-400">Paid</span>
                <button
                  type="button"
                  onClick={toggleDeposit}
                  className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    project.deposit_cleared ? 'bg-slate-900' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                      project.deposit_cleared ? 'translate-x-3' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.01)] text-xs flex flex-col justify-between">
            <div className="flex justify-between items-center border-b pb-1 border-slate-100 mb-1.5">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Portal Analytics Feed</p>
              <span className="font-sans font-bold text-[10px] text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                Hits: {project.view_count || 0}
              </span>
            </div>
            
            <div className="divide-y divide-slate-100 max-h-16 overflow-y-auto pr-0.5 text-[10px] font-medium text-slate-500 space-y-1">
              {rawViewHistory.length > 0 ? (
                rawViewHistory.map((session: any, tIdx: number) => {
                  const isLegacyFormat = typeof session === "string";
                  const rawTimeString = isLegacyFormat ? session : (session.timestamp || "");
                  const deviceLabel = isLegacyFormat ? "Link Hit" : (session.device || "Device Unknown");
                  const loggedIp = isLegacyFormat ? "No Trace" : (session.ip_address || "0.0.0.0");

                  return (
                    <div key={tIdx} className="py-0.5 text-left flex justify-between items-center text-[9px]">
                      <span className="font-bold text-slate-700 truncate max-w-[110px]">#{tIdx + 1} • {deviceLabel}</span>
                      <span className="font-mono text-slate-400 scale-90">({loggedIp})</span>
                      <span className="font-sans font-medium text-slate-500">
                        {isNaN(Date.parse(rawTimeString)) ? "Invalid" : new Date(rawTimeString).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                      </span>
                    </div>
                  );
                }).reverse()
              ) : (
                <p className="text-center italic text-slate-300 py-1">No telemetry recorded yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* HIGH-END INTERACTIVE NESTED GANTT CHARTS SYSTEM MODULE */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="border-b pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">📅 Production Phase Gantt Blueprint Scheduler</h3>
              <p className="text-[11px] text-slate-400 font-medium">Construct sub-tasks, nest trade rows, and update operational progress margins directly into live streams charts grids.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <form onSubmit={handlePublishGanttTask} className="space-y-3 border p-4 rounded-xl bg-slate-50/50 shadow-inner text-xs h-fit">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Publish Timeline Row Component:</p>
              
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase block">Task Name Label:</label>
                <input type="text" placeholder="Title (e.g. Electrical Layout)" required value={taskName} onChange={(e) => setTaskName(e.target.value)} className="w-full p-2 bg-white border rounded-lg outline-none text-slate-800 font-semibold shadow-sm" />
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase block">Parent Nest Layer Architecture:</label>
                <select value={selectedParentId} onChange={(e) => setSelectedParentId(e.target.value)} className="w-full p-2 bg-white border rounded-lg outline-none font-semibold text-slate-700 shadow-sm">
                  <option value="master">✦ Create Main Group Heading (Parent)</option>
                  {masterMilestones.map(m => (
                    <option key={m.id} value={m.id}>↳ Nest Inside: {m.task_name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[8px] font-black text-slate-400 uppercase block">Start Day:</label>
                  <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-1.5 bg-white border rounded-lg outline-none text-slate-800 font-bold" />
                </div>
                <div>
                  <label className="text-[8px] font-black text-slate-400 uppercase block">End Day:</label>
                  <input type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-1.5 bg-white border rounded-lg outline-none text-slate-800 font-bold" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase block">Gantt Visual Color Profile Marker:</label>
                <select value={selectedColor} onChange={(e) => setSelectedColor(e.target.value)} className="w-full p-2 bg-white border rounded-lg outline-none font-semibold text-slate-700 shadow-sm">
                  <option value="bg-amber-400/20 text-amber-800 border-amber-300">🟡 Amber Finish Theme Accent</option>
                  <option value="bg-blue-400/20 text-blue-800 border-blue-300">🔵 Blue Utility Utilities Accent</option>
                  <option value="bg-rose-400/20 text-rose-800 border-rose-300">🔴 Rose Structural Framing Accent</option>
                  <option value="bg-emerald-400/20 text-emerald-800 border-emerald-300">🟢 Emerald Trim Turnover Accent</option>
                </select>
              </div>

              <button type="submit" disabled={isPublishingTask} className="w-full bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black py-2.5 rounded-xl uppercase tracking-wider transition shadow-sm mt-1">
                Inject Production Row Block
              </button>
            </form>

            <div className="lg:col-span-3 border rounded-xl bg-white overflow-hidden shadow-sm flex flex-col text-xs">
              <div className="bg-slate-50 border-b p-3 flex justify-between items-center font-black text-[10px] text-slate-400 uppercase tracking-widest select-none">
                <span>Phase Workspace Management Track</span>
                <span className="font-sans font-bold text-slate-800">Operational Horizon Calendar Grid View</span>
              </div>

              <div className="divide-y divide-slate-100 overflow-y-auto max-h-[340px] pr-0.5">
                {masterMilestones.map((milestone) => {
                  const subTasks = getSubTasksForMilestone(milestone.id);
                  return (
                    <div key={milestone.id} className="bg-white">
                      
                      <div className="p-3 bg-slate-50/40 flex justify-between items-center gap-4 group/master">
                        <div className="flex items-center gap-2 text-left flex-1 min-w-0">
                          <span className="text-slate-400 text-sm">🔼</span>
                          <span className="font-black text-slate-900 text-sm tracking-tight truncate">{milestone.task_name}</span>
                          <span className="text-[9px] font-bold text-slate-400 bg-white border px-1.5 py-0.2 rounded-md shrink-0">
                            {new Date(milestone.target_start_date + 'T00:00:00').toLocaleDateString(undefined, {month:'short', day:'numeric'})} - {new Date(milestone.target_end_date + 'T00:00:00').toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="flex items-center gap-2">
                            <input 
                              type="range" min="0" max="100" step="25"
                              value={milestone.progress_percent}
                              onChange={(e) => handleUpdateTaskSlider(milestone.id, parseInt(e.target.value))}
                              className="w-16 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900 shadow-inner"
                            />
                            <span className="font-sans font-black text-slate-900 text-[10px] text-right min-w-[28px]">{milestone.progress_percent}%</span>
                          </div>
                          <button type="button" onClick={() => handleDropScheduleTask(milestone.id)} className="text-slate-300 hover:text-red-500 font-bold px-1 transition-colors outline-none text-xs">✕</button>
                        </div>
                      </div>

                      <div className="bg-white divide-y divide-slate-50 pl-7">
                        {subTasks.map((task) => (
                          <div key={task.id} className="p-2.5 flex justify-between items-center gap-4 group/sub hover:bg-slate-50/30 transition-colors">
                            <div className="flex items-center gap-2.5 text-left min-w-0 flex-1">
                              <span className="text-slate-300 font-bold">↳</span>
                              <span className="font-bold text-slate-800 truncate text-xs">{task.task_name}</span>
                              <div className={`px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-wider shrink-0 ${task.color_theme}`}>
                                {new Date(task.target_start_date + 'T00:00:00').toLocaleDateString(undefined, {month:'short', day:'numeric'})} – {new Date(task.target_end_date + 'T00:00:00').toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                              </div>
                            </div>

                            <div className="flex items-center gap-4 shrink-0">
                              <div className="flex items-center gap-2">
                                <input 
                                  type="range" min="0" max="100" step="25"
                                  value={task.progress_percent}
                                  onChange={(e) => handleUpdateTaskSlider(task.id, parseInt(e.target.value))}
                                  className="w-16 h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600 shadow-inner"
                                />
                                <span className="font-sans font-bold text-slate-600 text-[10px] text-right min-w-[28px]">{task.progress_percent}%</span>
                              </div>
                              <button type="button" onClick={() => handleDropScheduleTask(task.id)} className="text-slate-300 hover:text-red-500 font-bold px-1 transition-colors outline-none text-xs">✕</button>
                            </div>
                          </div>
                        ))}
                        {subTasks.length === 0 && (
                          <p className="py-2 text-left italic text-slate-300 text-[10px] font-medium pl-6">No child specs nested inside this milestone layer block.</p>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* LIVE EDITABLE CONTRACT SCOPE EDITOR */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 border-slate-100">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">📋 Live Contract Scope Editor</h3>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">Modify text descriptions, update phase prices inline, or delete milestones from the live project.</p>
            </div>
            <button
              type="button"
              disabled={isUpdatingItems || editableItems.length === 0}
              onClick={saveProjectScopeModifications}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-black text-[10px] px-4 py-2 rounded-lg tracking-wider uppercase transition shadow-sm outline-none"
            >
              {isUpdatingItems ? "Saving..." : "Save Project Changes"}
            </button>
          </div>

          <div className="space-y-4 max-h-[440px] overflow-y-auto pr-1">
            {editableItems.map((item: any, idx: number) => {
              const currentCostValue = item.mid_cost !== undefined ? item.mid_cost : (item.cost !== undefined ? item.cost : "");
              const currentDescValue = item.mid_description !== undefined ? item.mid_description : (item.description !== undefined ? item.description : "");
              const isMidKeyUsed = item.mid_cost !== undefined;

              return (
                <div key={idx} className="p-4 border border-slate-200 bg-slate-50/40 rounded-xl text-xs space-y-2 relative group hover:border-slate-300 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="font-mono font-bold text-slate-300 text-[10px] bg-white border px-1.5 py-0.5 rounded">#{idx + 1}</span>
                      <input 
                        type="text"
                        value={item.title || ""}
                        onChange={(e) => handleItemFieldChange(idx, "title", e.target.value)}
                        placeholder="Phase Title"
                        className="font-extrabold text-slate-900 text-sm bg-white border border-slate-200 focus:border-slate-400 outline-none rounded-lg px-2.5 py-1 flex-1 shadow-sm"
                      />
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-400">$</span>
                      <input 
                        type="text"
                        value={currentCostValue}
                        onChange={(e) => handleItemFieldChange(idx, isMidKeyUsed ? "mid_cost" : "cost", e.target.value)}
                        placeholder="0.00"
                        className="font-sans font-bold text-slate-800 bg-white border border-slate-200 focus:border-slate-400 outline-none rounded-lg px-2 py-1 w-24 text-right shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeScopeItemRow(idx)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg border border-red-100 bg-red-50 hover:bg-red-500 text-red-500 hover:text-white transition-all font-sans font-bold text-xs shadow-sm outline-none"
                        title="Delete Phase"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <textarea 
                    rows={2}
                    value={currentDescValue}
                    onChange={(e) => handleItemFieldChange(idx, isMidKeyUsed ? "mid_description" : "description", e.target.value)}
                    placeholder="Provide exact project specifications..."
                    className="w-full font-medium text-slate-600 bg-white border border-slate-200 focus:border-slate-400 outline-none rounded-lg p-2.5 shadow-sm resize-none leading-relaxed"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* FIELD OPERATIONS DAILY LOG WORKBENCH */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="border-b pb-2 border-slate-100">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">📸 Field Operations Daily Log</h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Record construction notes, site progress logs, and snap layout photos straight from your device camera into the client portal.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
            <form onSubmit={handlePublishDailyLog} className="space-y-3 border p-4 rounded-xl bg-slate-50/50 shadow-inner h-fit">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Log Site Progress Notes:</label>
                <textarea
                  required
                  rows={3}
                  value={logText}
                  onChange={(e) => setLogText(e.target.value)}
                  placeholder="Describe trade workflow status..."
                  className="w-full p-2.5 bg-white border border-slate-200 focus:border-slate-400 outline-none rounded-lg shadow-sm font-semibold text-slate-800 resize-none leading-relaxed"
                />
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Upload Progress Photo:</label>
                <div className="relative flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-white hover:bg-slate-50 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-3 pb-3">
                      <p className="mb-0.5 text-xs font-bold text-slate-600">
                        {isUploadingPhoto ? "⚡ Syncing File..." : "📷 Tap to Camera / Files"}
                      </p>
                      <p className="text-[9px] text-slate-400 font-medium">JPEG, PNG up to 10MB</p>
                    </div>
                    <input type="file" accept="image/*" disabled={isUploadingPhoto} onChange={handleDevicePhotoUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {uploadedPhotos.length > 0 && (
                <div className="bg-white border border-slate-200 p-2.5 rounded-lg space-y-1.5 shadow-sm">
                  <div className="flex justify-between items-center text-[9px] font-black uppercase text-slate-400 border-b pb-1">
                    <span>Queue: {uploadedPhotos.length} Images</span>
                    <button type="button" onClick={handleClearPhotos} className="text-red-500 hover:underline">Clear</button>
                  </div>
                  <div className="grid grid-cols-4 gap-1 max-h-14 overflow-y-auto">
                    {uploadedPhotos.map((url, uIdx) => (
                      <div key={uIdx} className="aspect-square rounded border overflow-hidden bg-slate-100 relative">
                        <img src={url} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button type="submit" disabled={isSubmittingLog || isUploadingPhoto || !logText.trim()} className="w-full bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black py-2.5 rounded-xl uppercase tracking-wider transition shadow-sm">
                Publish Daily Operations Log
              </button>
            </form>

            <div className="md:col-span-2 divide-y divide-slate-100 border bg-white rounded-xl max-h-[290px] overflow-y-auto shadow-sm p-1">
              {dailyLogs.map((log) => (
                <div key={log.id} className="p-4 space-y-2.5 bg-white">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 border-b pb-1.5 border-slate-100">
                    <span className="font-extrabold uppercase tracking-wide text-slate-700">Locker Update Deployed</span>
                    <span className="font-sans font-bold text-slate-500">{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-slate-700 font-medium leading-relaxed text-left text-xs whitespace-pre-line">{log.log_text}</p>
                  {log.photo_urls && log.photo_urls.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                      {log.photo_urls.map((photoUrl: string, pIdx: number) => (
                        <a key={pIdx} href={photoUrl} target="_blank" rel="noopener noreferrer" className="block relative aspect-video border rounded-lg overflow-hidden bg-slate-50 shadow-sm hover:scale-102 transition-transform">
                          <img src={photoUrl} className="object-cover w-full h-full" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* BOTTOM METRICS CHECKOUT DRAW WORKBENCH PANELS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div className="space-y-4">
            <div className="p-5 bg-white border border-slate-200/60 rounded-xl space-y-4 shadow-sm">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 border-slate-100">Draw Tracker</h3>
              <div className="space-y-0.5 text-left">
                <p className="text-sm font-extrabold text-slate-800">🚧 Target Draw Milestone: {project.payment_phases?.[project.current_phase_index || 0]?.name || "Mobilization Setup"}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => shiftPhase(false)} disabled={(project.current_phase_index || 0) === 0} className="flex-1 bg-white hover:bg-slate-100 disabled:opacity-30 border border-slate-200 p-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-600 transition-all outline-none shadow-sm">◀ Reverse Draw Step</button>
                <button type="button" onClick={() => shiftPhase(true)} disabled={(project.current_phase_index || 0) === (project.payment_phases?.length || 1) - 1} className="flex-1 bg-slate-900 hover:bg-slate-800 text-white p-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-center transition-all outline-none shadow-sm">Advance Draw ▶</button>
              </div>
            </div>

            <div className="p-5 bg-white border border-slate-200/60 rounded-xl space-y-3 shadow-sm">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 border-slate-100">Project Change Orders Log</h3>
              <div className="divide-y divide-slate-100 border bg-slate-50 rounded-xl max-h-48 overflow-y-auto shadow-inner text-xs">
                {changeOrders.map((co) => {
                  const coAmount = typeof co.amount === "number" ? co.amount : 0;
                  return (
                    <div key={co.id} className="p-3 space-y-2 bg-white/40">
                      <div className="flex justify-between items-start">
                        <div className="text-left space-y-0.5">
                          <p className="font-extrabold text-slate-900">{co.description || "Modification Row"}</p>
                          <p className="text-[9px] text-slate-400 font-bold">Reference hash: #{co.id ? co.id.slice(0,6) : "xxxxxx"}</p>
                        </div>
                        <span className="font-sans font-extrabold text-slate-900 text-base tracking-tight">${coAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                      </div>
                      <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-1">
                          <span className={`text-[8px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded ${co.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700'}`}>{co.status || "pending"}</span>
                          <span className={`text-[8px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded ${co.deposit_cleared ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-red-50 text-red-700'}`}>{co.deposit_cleared ? "Paid" : "Unpaid"}</span>
                        </div>
                        {co.status === "approved" && (
                          <div className="flex items-center gap-1.5 scale-90 origin-right">
                            <button
                              type="button"
                              onClick={() => toggleChangeOrderPaymentStatus(co)}
                              className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none shadow-inner ${co.deposit_cleared ? 'bg-slate-900' : 'bg-slate-200'}`}
                            >
                              <span className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${co.deposit_cleared ? 'translate-x-3' : 'translate-x-0'}`} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-4 text-left shadow-inner">
            <div className="border-b border-slate-200 pb-2">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">⚡ AI Change Order Worksheet Builder</h3>
            </div>
            <div className="space-y-2">
              <input type="text" placeholder="Change Order Supplement Title Label..." value={coTitle} onChange={(e) => setCoTitle(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-900 rounded-xl text-xs outline-none shadow-sm font-bold text-slate-800" />
              <div className="flex gap-1.5">
                <input type="text" placeholder="Describe modification parameter extensions..." value={coPrompt} onChange={(e) => setCoPrompt(e.target.value)} className="flex-1 p-2.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-900 rounded-xl text-xs outline-none shadow-sm text-slate-800 font-semibold" />
                <button type="button" onClick={runAiChangeOrderEstimator} className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[10px] px-3.5 rounded-xl uppercase tracking-wider transition outline-none shadow-sm">{isGeneratingCO ? "..." : "AI"}</button>
              </div>
            </div>

            {coLineItems.length > 0 && (
              <div className="space-y-2 animate-fadeIn text-xs">
                <div className="border border-slate-200 rounded-xl bg-white divide-y max-h-40 overflow-y-auto shadow-sm">
                  {coLineItems.map((item, idx) => (
                    <div key={idx} className="p-2.5 flex justify-between gap-3 items-start bg-white hover:bg-slate-50/20 transition-colors">
                      <div className="space-y-0.5 text-left flex-1">
                        <input type="text" value={item.title || ""} onChange={(e) => handleUpdateCoField(idx, "title", e.target.value)} className="font-bold text-slate-900 w-full bg-transparent border-b border-transparent focus:border-slate-300 outline-none" />
                        <textarea rows={1} value={item.mid_description || ""} onChange={(e) => handleUpdateCoField(idx, "mid_description", e.target.value)} className="text-[11px] text-slate-500 w-full bg-transparent outline-none resize-none font-medium" />
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <input type="text" value={item.mid_cost || ""} onChange={(e) => handleUpdateCoField(idx, "mid_cost", e.target.value)} className="font-sans font-bold text-right text-slate-800 w-16 bg-transparent border-b border-transparent focus:border-slate-300 outline-none tracking-tight" />
                        <button type="button" onClick={() => handleDeleteCoLineItem(idx)} className="text-red-400 hover:text-red-600 font-bold px-1 transition-colors">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={deployChangeOrderToPortal} className="w-full bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black py-2.5 rounded-xl uppercase tracking-widest transition shadow-md shadow-slate-950/20">Broadcast Change Order Supplement</button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}