"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

interface OptionGroup {
  category: string;
  choices: string[];
}

export default function ProjectDetailPanel() {
  const { id } = useParams();
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [changeOrders, setChangeOrders] = useState<any[]>([]);
  const [scheduleTasks, setScheduleTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Material selection state variables
  const [category, setCategory] = useState("");
  const [choicesText, setChoicesText] = useState("");

  // AI Change Order generator variables
  const [coPrompt, setCoPrompt] = useState("");
  const [isGeneratingCO, setIsGeneratingCO] = useState(false);
  const [coLineItems, setCoLineItems] = useState<any[]>([]);
  const [coTitle, setCoTitle] = useState("Change Order Supplement");

  // Scheduling engine state variables
  const [taskName, setTaskName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isPublishingTask, setIsPublishingTask] = useState(false);

  useEffect(() => {
    fetchProjectDetail();
  }, [id]);

  async function fetchProjectDetail() {
    setLoading(true);
    const { data: mainProject } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", id)
      .single();

    if (mainProject) {
      setProject(mainProject);
      
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
        .order("target_start_date", { ascending: true });
      if (schedule) setScheduleTasks(schedule);
    }
    setLoading(false);
  }

  const toggleDeposit = async () => {
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
    const curr = project.current_phase_index || 0;
    const nextIdx = increment ? curr + 1 : curr - 1;
    const { error } = await supabase
      .from("invoices")
      .update({ current_phase_index: nextIdx })
      .eq("id", id);
    if (!error) fetchProjectDetail();
  };

  const handlePublishScheduleTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim() || !startDate || !endDate) return;
    setIsPublishingTask(true);

    const { error } = await supabase
      .from("project_schedules")
      .insert([
        {
          project_id: id,
          task_name: taskName.trim(),
          target_start_date: startDate,
          target_end_date: endDate,
          progress_percent: 0,
          status: "scheduled"
        }
      ]);

    if (!error) {
      setTaskName("");
      setStartDate("");
      setEndDate("");
      fetchProjectDetail();
    }
    setIsPublishingTask(false);
  };

  const handleUpdateTaskProgress = async (taskId: string, currentPercent: number) => {
    let nextPercent = currentPercent + 25;
    if (nextPercent > 100) nextPercent = 0;

    let nextStatus = "scheduled";
    if (nextPercent > 0 && nextPercent < 100) nextStatus = "in_progress";
    if (nextPercent === 100) nextStatus = "completed";

    await supabase
      .from("project_schedules")
      .update({ progress_percent: nextPercent, status: nextStatus })
      .eq("id", taskId);

    fetchProjectDetail();
  };

  const handleDropScheduleTask = async (taskId: string) => {
    if (!confirm("Remove this target schedule task block?")) return;
    await supabase.from("project_schedules").delete().eq("id", taskId);
    fetchProjectDetail();
  };

  const handlePushOptionGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category.trim() || !choicesText.trim()) return;

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
          address: "Project Address", 
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
    if (coLineItems.length === 0) return alert("Generate or customize scope items before broadcasting.");
    
    const coTotalCost = coLineItems.reduce((sum, item) => sum + (parseFloat(item.mid_cost) || 0), 0);
    const flattenedItems = coLineItems.map(item => ({
      title: item.title,
      description: item.mid_description,
      cost: parseFloat(item.mid_cost) || 0
    }));

    const { error } = await supabase
      .from("invoices")
      .insert([
        {
          parent_id: id,
          homeowner_name: project.homeowner_name,
          homeowner_email: project.homeowner_email,
          job_address: "Project Address",
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

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans antialiased pb-24 text-left selection:bg-slate-900/10 tracking-normal">
      
      {/* Premium Sticky Control Banner */}
      <div className="bg-slate-900 text-white border-b border-slate-800 shadow-sm sticky top-0 z-50 backdrop-blur-md bg-slate-900/95">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div className="space-y-0.5">
            <button type="button" onClick={() => router.push("/admin/projects")} className="text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-white transition-colors">
              ← Back to Project Index Ledger
            </button>
            <h1 className="text-base font-extrabold tracking-tight uppercase text-slate-100 mt-1">{project.homeowner_name} Operational Workspace</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded border shadow-sm ${
              project.status === 'approved' ? 'bg-emerald-600 border-transparent text-white' : 'bg-amber-500 border-transparent text-white'
            }`}>
              • Proposal State: {project.status}
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

      <div className="max-w-5xl mx-auto px-4 pt-6 space-y-6">
        
        {/* TOP COMPACT METRICS GRID ROWS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200/60 p-4 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.01)] text-xs">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b pb-1 border-slate-100 mb-2">Jobsite Framework Address</p>
            <p className="font-bold text-slate-800 text-sm leading-normal">Project Address</p>
          </div>
          
          <div className="bg-white border border-slate-200/60 p-4 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.01)] text-xs flex flex-col justify-between">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b pb-1 border-slate-100 mb-2">Base Contract Valuation</p>
            <div className="flex items-center justify-between">
              <span className="font-sans font-extrabold text-slate-900 text-xl tracking-tight">${project.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              
              {/* Integrated Micro Pill Switch for Mobilization Deposits */}
              <div className="flex items-center gap-1.5 bg-slate-50 border px-2 py-1 rounded-lg">
                <span className="text-[8px] font-black uppercase text-slate-400">Deposit Paid</span>
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

          {/* TELEMETRY READ TRACKER LOG PANEL */}
          <div className="bg-white border border-slate-200/60 p-4 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.01)] text-xs flex flex-col justify-between">
            <div className="flex justify-between items-center border-b pb-1 border-slate-100 mb-1.5">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Client Engagement Views</p>
              <span className="font-sans font-bold text-[11px] text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                Total hits: {project.view_count || 0}
              </span>
            </div>
            <div className="divide-y divide-slate-100 max-h-12 overflow-y-auto pr-0.5 text-[10px] font-medium text-slate-500">
              {project.view_history && project.view_history.length > 0 ? (
                project.view_history.map((timeStr: string, tIdx: number) => (
                  <div key={tIdx} className="py-0.5 flex justify-between items-center">
                    <span>Session #{tIdx + 1}</span>
                    <span className="font-sans text-[9px] font-bold text-slate-700">{new Date(timeStr).toLocaleString(undefined, {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</span>
                  </div>
                )).reverse()
              ) : (
                <p className="text-center italic text-slate-300 py-1">Dispatched link, awaiting client first-open log...</p>
              )}
            </div>
          </div>
        </div>

        {/* MASTER GANTT CALENDAR OPERATION COMPONENT WORKSPACE */}
        <div className="bg-white border border-slate-200/60 rounded-xl p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 border-slate-100">📅 Master Construction Production Scheduler</h3>
            <p className="text-[11px] text-slate-500 mt-1">Plot field milestones and update tasks. This Gantt framework unlocks automatically on the homeowner's screen after signoff.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <form onSubmit={handlePublishScheduleTask} className="space-y-2 border p-4 rounded-xl bg-slate-50/50 shadow-inner h-fit text-xs">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Publish Schedule Milestone:</p>
              <input type="text" placeholder="Task Title (e.g., Framing Framework)" required value={taskName} onChange={(e) => setTaskName(e.target.value)} className="w-full p-2.5 bg-white border rounded-lg outline-none focus:border-slate-500 shadow-sm font-semibold text-slate-800" />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[8px] font-black text-slate-400 uppercase block mb-0.5">Start window:</label>
                  <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-1.5 bg-white border rounded-lg outline-none text-slate-800 font-semibold" />
                </div>
                <div>
                  <label className="text-[8px] font-black text-slate-400 uppercase block mb-0.5">End window:</label>
                  <input type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-1.5 bg-white border rounded-lg outline-none text-slate-800 font-semibold" />
                </div>
              </div>
              <button type="submit" disabled={isPublishingTask} className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-[10px] font-black py-2.5 rounded-xl uppercase tracking-wider transition shadow-sm mt-1">
                Deploy Schedule Target Row
              </button>
            </form>

            <div className="md:col-span-2 divide-y divide-slate-100 border bg-white rounded-xl max-h-48 overflow-y-auto shadow-sm text-xs">
              {scheduleTasks.map((task) => (
                <div key={task.id} className="p-3 flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-white hover:bg-slate-50/40 transition-colors">
                  <div className="text-left space-y-0.5">
                    <p className="font-extrabold text-slate-900">{task.task_name}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">
                      ⏱ Window: {new Date(task.target_start_date + 'T00:00:00').toLocaleDateString(undefined, {month:'short', day:'numeric'})} – {new Date(task.target_end_date + 'T00:00:00').toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'})}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-transparent pt-2 sm:pt-0 border-slate-100 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleUpdateTaskProgress(task.id, task.progress_percent)}
                      className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border p-1.5 rounded-lg text-[10px] transition font-black tracking-wide uppercase text-slate-600 outline-none shadow-sm"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${task.status === 'completed' ? 'bg-emerald-500' : task.status === 'in_progress' ? 'bg-blue-500 animate-pulse' : 'bg-slate-300'}`} />
                      Metric: <span className="font-sans font-bold text-slate-900">{task.progress_percent}%</span>
                    </button>
                    <button type="button" onClick={() => handleDropScheduleTask(task.id)} className="text-slate-300 hover:text-red-500 font-extrabold px-1 text-sm outline-none transition-colors">✕</button>
                  </div>
                </div>
              ))}
              {scheduleTasks.length === 0 && (
                <p className="p-8 text-center text-slate-400 italic font-medium">No schedule tracks deployed inside calendar sub-systems yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* SPLIT WORKBENCH CONTAINER GRID BLOCK */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          
          <div className="space-y-4">
            {/* Draw Matrix Staging Component Box */}
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

            {/* Active Change Orders History ledger log */}
            <div className="p-5 bg-white border border-slate-200/60 rounded-xl space-y-3 shadow-sm">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 border-slate-100">Project Change Orders Log</h3>
              <div className="divide-y divide-slate-100 border bg-slate-50 rounded-xl max-h-48 overflow-y-auto shadow-inner text-xs">
                {changeOrders.map((co) => (
                  <div key={co.id} className="p-3 space-y-2 bg-white/40">
                    <div className="flex justify-between items-start">
                      <div className="text-left space-y-0.5">
                        <p className="font-extrabold text-slate-900">{co.description}</p>
                        <p className="text-[9px] text-slate-400 font-bold">Reference hash: #{co.id.slice(0,6)}</p>
                      </div>
                      <span className="font-sans font-extrabold text-slate-900 text-base tracking-tight">${co.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                    
                    <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-1">
                        <span className={`text-[8px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded ${co.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700'}`}>{co.status}</span>
                        <span className={`text-[8px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded ${co.deposit_cleared ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-red-50 text-red-700'}`}>{co.deposit_cleared ? "Paid" : "Unpaid"}</span>
                      </div>
                      
                      {/* Sub-Pill Toggle for Child records */}
                      {co.status === "approved" && (
                        <div className="flex items-center gap-1.5 scale-90 origin-right">
                          <button
                            type="button"
                            onClick={() => toggleChangeOrderPaymentStatus(co)}
                            className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none shadow-inner ${
                              co.deposit_cleared ? 'bg-slate-900' : 'bg-slate-200'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                co.deposit_cleared ? 'translate-x-3' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {changeOrders.length === 0 && (
                  <p className="p-6 text-center text-slate-400 text-xs italic font-medium">No modifications appended to project parameters yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column Pane container: AI Worksheet Estimator Drawer Panel */}
          <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-4 text-left shadow-inner">
            <div className="border-b border-slate-200 pb-2">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">⚡ AI Change Order Worksheet Builder</h3>
              <p className="text-[11px] text-slate-400 mt-1">Describe variations dynamically to generate instant localized target estimates.</p>
            </div>

            <div className="space-y-2">
              <input type="text" placeholder="Change Order Supplement Title Label..." value={coTitle} onChange={(e) => setCoTitle(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-900 rounded-xl text-xs outline-none shadow-sm font-bold text-slate-800" />
              <div className="flex gap-1.5">
                <input type="text" placeholder="Describe modification parameter extensions..." value={coPrompt} onChange={(e) => setCoPrompt(e.target.value)} className="flex-1 p-2.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-900 rounded-xl text-xs outline-none shadow-sm text-slate-800 font-semibold" />
                <button type="button" onClick={runAiChangeOrderEstimator} disabled={isGeneratingCO} className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[10px] px-3.5 rounded-xl uppercase tracking-wider transition outline-none shadow-sm" >
                  {isGeneratingCO ? "..." : "AI"}
                </button>
              </div>
            </div>

            {coLineItems.length > 0 && (
              <div className="space-y-2 animate-fadeIn text-xs">
                <div className="border border-slate-200 rounded-xl bg-white divide-y max-h-40 overflow-y-auto shadow-sm">
                  {coLineItems.map((item, idx) => (
                    <div key={idx} className="p-2.5 flex justify-between gap-3 items-start bg-white hover:bg-slate-50/20 transition-colors">
                      <div className="space-y-0.5 text-left flex-1">
                        <input type="text" value={item.title} onChange={(e) => handleUpdateCoField(idx, "title", e.target.value)} className="font-bold text-slate-900 w-full bg-transparent border-b border-transparent focus:border-slate-300 outline-none" />
                        <textarea rows={1} value={item.mid_description} onChange={(e) => handleUpdateCoField(idx, "mid_description", e.target.value)} className="text-[11px] text-slate-500 w-full bg-transparent outline-none resize-none font-medium" />
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <input type="text" value={item.mid_cost} onChange={(e) => handleUpdateCoField(idx, "mid_cost", e.target.value)} className="font-sans font-bold text-right text-slate-800 w-16 bg-transparent border-b border-transparent focus:border-slate-300 outline-none tracking-tight" />
                        <button type="button" onClick={() => handleDeleteCoLineItem(idx)} className="text-red-400 hover:text-red-600 font-bold px-1 transition-colors" >✕</button>
                      </div>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={deployChangeOrderToPortal} className="w-full bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black py-2.5 rounded-xl uppercase tracking-widest transition shadow-md shadow-slate-950/20" >Broadcast Change Order Supplement</button>
              </div>
            )}

            {/* Materials Selections Log Section */}
            <div className="border-t border-slate-200/60 pt-4 space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Material Choice Boards</h4>
                {project.homeowner_options?.length > 0 && <button type="button" onClick={handleClearAllOptions} className="text-[10px] text-red-500 hover:underline font-bold uppercase tracking-wide">Wipe Sheet</button>}
              </div>
              <div className="divide-y border border-slate-200/80 bg-white rounded-xl max-h-28 overflow-y-auto text-xs shadow-sm">
                {project.homeowner_options?.map((group: any, idx: number) => (
                  <div key={idx} className="p-2.5 flex flex-col text-left bg-white font-medium text-slate-600">
                    <p className="font-black text-slate-400 text-[8px] uppercase tracking-wider mb-0.5">📦 {group.category}:</p>
                    <p className="text-slate-800 font-semibold text-[11px] leading-tight">{group.choices.join("  |  ")}</p>
                    {project.homeowner_selections?.[group.category] && (
                      <p className="text-[9px] text-blue-700 font-extrabold mt-1 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md inline-block self-start uppercase tracking-wider">✓ Choice: {project.homeowner_selections[group.category]}</p>
                    )}
                  </div>
                ))}
              </div>
              <form onSubmit={handlePushOptionGroup} className="space-y-1">
                <input type="text" placeholder="Selection Name Category..." required value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-2 bg-white border rounded-xl text-xs outline-none font-semibold text-slate-800" />
                <input type="text" placeholder="Choices (separated by comma)..." required value={choicesText} onChange={(e) => setChoicesText(e.target.value)} className="w-full p-2 bg-white border rounded-xl text-xs outline-none font-semibold text-slate-800" />
                <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black py-2 rounded-xl uppercase tracking-wider transition shadow-sm">Inject Option Matrix Row</button>
              </form>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}