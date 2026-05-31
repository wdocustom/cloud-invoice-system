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
      
      // Fetch Child Change Orders
      const { data: children } = await supabase
        .from("invoices")
        .select("*")
        .eq("parent_id", id)
        .order("created_at", { ascending: true });
      if (children) setChangeOrders(children);

      // Fetch Dynamic Project Schedule Milestones
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

  // SCHEDULER: Insert new production timeline block
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

  // SCHEDULER: Update progress scale percentage or status flags inline
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
          address: project.job_address, 
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
          job_address: project.job_address,
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans text-slate-400">
      <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!project) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-700 font-bold">Workspace ledger file not found.</div>;

  const homeownerLink = `${window.location.origin}/invoice/${id}`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased pb-24 text-left">
      <div className="max-w-5xl mx-auto px-4 pt-8 space-y-4">
        
        <div className="flex justify-between items-center">
          <button type="button" onClick={() => router.push("/admin/projects")} className="text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-wider outline-none">
            ← Back to operational line ledger
          </button>
          <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border shadow-sm ${
            project.status === 'approved' ? 'bg-emerald-600 text-white border-transparent' : 'bg-amber-50 text-white border-transparent'
          }`}>
            Proposal Status: {project.status}
          </span>
        </div>

        {/* Homeowner Shared Portal Access URL */}
        <div className="bg-slate-900 text-white rounded-xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left shadow-md">
          <div className="space-y-1 max-w-xl truncate w-full">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Homeowner Shared Access Portal URL</h4>
            <p className="text-xs font-mono bg-slate-950 px-3 py-2 rounded-xl text-slate-300 tracking-wide select-all truncate mt-1 border border-slate-800">
              {homeownerLink}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopyLink}
            className={`w-full sm:w-auto text-xs font-bold px-5 py-3 rounded-xl shadow-sm uppercase tracking-wider transition-all duration-200 whitespace-nowrap shrink-0 border ${
              copied ? 'bg-emerald-600 text-white text-white border-transparent shadow-md' : 'bg-white text-slate-900 hover:bg-slate-100 border-transparent'
            }`}
          >
            {copied ? "✓ Copied Link" : "Copy Shared URL"}
          </button>
        </div>

        {/* Main Workframe Control Command Sheet Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 text-left space-y-6 shadow-sm">
          
          <div className="border-b border-slate-100 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-0.5 text-left">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase">{project.homeowner_name} Production Desk</h1>
              <p className="text-xs text-slate-500 font-medium">📍 Structural Jobsite: {project.job_address}</p>
            </div>
            
            <div className="flex items-center gap-6 border-t sm:border-transparent border-slate-100 pt-3 sm:pt-0 shrink-0">
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Deposit Paid</span>
                <button
                  type="button"
                  onClick={toggleDeposit}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    project.deposit_cleared ? 'bg-slate-900' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      project.deposit_cleared ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Locked Value</p>
                <p className="text-base font-mono font-bold text-slate-900 tracking-tight">${project.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>

          {/* DYNAMIC CALENDAR OPERATIONS MANAGER PANEL (GANTT ROW BUILDER) */}
          <div className="bg-slate-50 border rounded-xl p-5 shadow-inner space-y-4">
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-2">📅 Master Construction Production Scheduler</h3>
              <p className="text-[11px] text-slate-500 mt-1">Plot specific field tasks, assign dates, and tap completion tracks. **Note:** This block unlocks on the client portal only after contract signoff.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Form Input Row Column */}
              <form onSubmit={handlePublishScheduleTask} className="space-y-2 bg-white border p-4 rounded-xl shadow-sm h-fit">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Publish Schedule Item:</p>
                <input type="text" placeholder="Task Title (e.g., Basement Framing Framework)" required value={taskName} onChange={(e) => setTaskName(e.target.value)} className="w-full p-2 bg-slate-50 border rounded-lg text-xs outline-none focus:border-slate-900" />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[8px] font-bold text-slate-400 uppercase block mb-0.5">Start Target:</label>
                    <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-1.5 bg-slate-50 border rounded-lg text-xs outline-none" />
                  </div>
                  <div>
                    <label className="text-[8px] font-bold text-slate-400 uppercase block mb-0.5">End Target:</label>
                    <input type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-1.5 bg-slate-50 border rounded-lg text-xs outline-none" />
                  </div>
                </div>
                <button type="submit" disabled={isPublishingTask} className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-[10px] font-black py-2 rounded-xl uppercase tracking-wider shadow-sm transition mt-1">
                  Inject Schedule Milestone
                </button>
              </form>

              {/* Live Status Ledger Tracker Rows */}
              <div className="md:col-span-2 divide-y divide-slate-200 border bg-white rounded-xl max-h-60 overflow-y-auto shadow-sm">
                {scheduleTasks.map((task) => (
                  <div key={task.id} className="p-3 text-xs flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-white hover:bg-slate-50/50">
                    <div className="text-left space-y-0.5">
                      <p className="font-extrabold text-slate-900">{task.task_name}</p>
                      <p className="text-[10px] text-slate-500 font-medium">
                        ⏱ Window Range: {new Date(task.target_start_date + 'T00:00:00').toLocaleDateString(undefined, {month:'short', day:'numeric'})} – {new Date(task.target_end_date + 'T00:00:00').toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'})}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-transparent pt-2 sm:pt-0 border-slate-100">
                      {/* Inline percentage control track wrapper */}
                      <button
                        type="button"
                        onClick={() => handleUpdateTaskProgress(task.id, task.progress_percent)}
                        className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border p-1.5 rounded-lg text-[10px] transition font-bold"
                      >
                        <span className={`w-2 h-2 rounded-full ${task.status === 'completed' ? 'bg-emerald-500' : task.status === 'in_progress' ? 'bg-blue-500' : 'bg-slate-300'}`} />
                        Progress Track: <span className="font-mono">{task.progress_percent}%</span>
                      </button>
                      <button type="button" onClick={() => handleDropScheduleTask(task.id)} className="text-red-400 hover:text-red-600 font-bold px-1 text-sm outline-none">✕</button>
                    </div>
                  </div>
                ))}
                {scheduleTasks.length === 0 && (
                  <p className="p-8 text-center text-slate-400 italic">No task targets published on schedule maps yet.</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Draw Controls & Active Change Orders Ledger */}
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4 shadow-inner">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-200/60 pb-2">Active Draw Target</h3>
                <div>
                  <p className="text-sm font-bold text-slate-800">🚧 Phase: {project.payment_phases?.[project.current_phase_index || 0]?.name || "Mobilization Setup"}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => shiftPhase(false)} disabled={(project.current_phase_index || 0) === 0} className="flex-1 bg-white hover:bg-slate-100 disabled:opacity-30 border border-slate-200 p-2 rounded-xl text-[10px] font-bold uppercase tracking-wider text-slate-600 transition-all">◀ Reverse Step</button>
                  <button type="button" onClick={() => shiftPhase(true)} disabled={(project.current_phase_index || 0) === (project.payment_phases?.length || 1) - 1} className="flex-1 bg-slate-900 hover:bg-slate-800 text-white p-2 rounded-xl text-[10px] font-bold uppercase tracking-wider text-center transition-all">Advance Draw ▶</button>
                </div>
              </div>

              {/* Change Orders History Ledger */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 shadow-inner">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-200/60 pb-2">Active Change Orders Ledger</h3>
                <div className="divide-y divide-slate-200 border bg-white rounded-xl max-h-48 overflow-y-auto">
                  {changeOrders.map((co) => (
                    <div key={co.id} className="p-3 text-xs space-y-2 bg-white">
                      <div className="flex justify-between items-start">
                        <div className="text-left">
                          <p className="font-extrabold text-slate-900">{co.description}</p>
                          <p className="text-[10px] text-slate-400 font-mono">ID: #{co.id.slice(0,6)}</p>
                        </div>
                        <span className="font-mono font-bold text-slate-900 text-sm">${co.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                      </div>
                      
                      <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border">
                        <span className={`text-[8px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded ${co.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700'}`}>{co.status}</span>
                        {co.status === "approved" && (
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold uppercase text-slate-400">{co.deposit_cleared ? "Paid" : "Unpaid"}</span>
                            <button
                              type="button"
                              onClick={() => toggleChangeOrderPaymentStatus(co)}
                              className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
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
                    <p className="p-4 text-center text-slate-400 text-xs italic">No project modifications executed yet.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: AI Assistant Sheet Builder */}
            <div className="p-4 bg-blue-50/40 border border-blue-200 rounded-xl space-y-4 text-left shadow-inner">
              <div className="border-b border-blue-200 pb-2">
                <h3 className="text-xs font-black text-blue-900 uppercase tracking-widest">⚡ AI Change Order Worksheet Builder</h3>
                <p className="text-[11px] text-slate-500 mt-1">Describe variations dynamically to execute automatic market pricing structures on additions.</p>
              </div>

              <div className="space-y-2">
                <input type="text" placeholder="Change Order Title..." value={coTitle} onChange={(e) => setCoTitle(e.target.value)} className="w-full p-2.5 bg-white border rounded-xl text-xs outline-none focus:border-blue-600 shadow-sm font-bold" />
                <div className="flex gap-1">
                  <input type="text" placeholder="Describe addition..." value={coPrompt} onChange={(e) => setCoPrompt(e.target.value)} className="flex-1 p-2.5 bg-white border rounded-xl text-xs outline-none focus:border-blue-600 shadow-sm" />
                  <button type="button" onClick={runAiChangeOrderEstimator} disabled={isGeneratingCO} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 rounded-xl transition outline-none" >
                    {isGeneratingCO ? "Pricing..." : "Run AI"}
                  </button>
                </div>
              </div>

              {coLineItems.length > 0 && (
                <div className="space-y-2 animate-fadeIn">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Review Generated Variance Additions:</p>
                  <div className="border rounded-xl bg-white divide-y max-h-40 overflow-y-auto text-xs shadow-sm">
                    {coLineItems.map((item, idx) => (
                      <div key={idx} className="p-2.5 flex justify-between gap-3 items-start bg-white hover:bg-slate-50/40 transition-colors">
                        <div className="space-y-0.5 text-left flex-1">
                          <input type="text" value={item.title} onChange={(e) => handleUpdateCoField(idx, "title", e.target.value)} className="font-bold text-slate-900 w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-slate-900 outline-none" />
                          <textarea rows={1} value={item.mid_description} onChange={(e) => handleUpdateCoField(idx, "mid_description", e.target.value)} className="text-[11px] text-slate-500 w-full bg-transparent outline-none resize-none" />
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <input type="text" value={item.mid_cost} onChange={(e) => handleUpdateCoField(idx, "mid_cost", e.target.value)} className="font-mono font-bold text-right text-slate-800 w-16 bg-transparent border-b border-transparent focus:border-slate-900 outline-none" />
                          <button type="button" onClick={() => handleDeleteCoLineItem(idx)} className="text-red-500 hover:text-red-700 text-[10px] font-bold uppercase px-1" >✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={deployChangeOrderToPortal} className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-black py-2.5 rounded-xl uppercase tracking-wider transition shadow-md" >Deploy Change Order</button>
                </div>
              )}

              {/* Selections Builder */}
              <div className="border-t border-blue-200/60 pt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Material Selections Log</h4>
                  {project.homeowner_options?.length > 0 && <button type="button" onClick={handleClearAllOptions} className="text-[10px] text-red-500 hover:underline">Wipe Matrix</button>}
                </div>
                <div className="divide-y border bg-white rounded-xl max-h-32 overflow-y-auto text-xs shadow-sm">
                  {project.homeowner_options?.map((group: any, idx: number) => (
                    <div key={idx} className="p-2 flex flex-col text-left bg-white">
                      <p className="font-bold text-slate-400 text-[9px] uppercase tracking-wide">📦 {group.category}:</p>
                      <p className="text-slate-700 font-semibold">{group.choices.join("  |  ")}</p>
                      {project.homeowner_selections?.[group.category] && (
                        <p className="text-[9px] text-emerald-700 font-bold mt-0.5 bg-emerald-50 px-1.5 py-0.5 rounded inline-block self-start">✓ Selected: {project.homeowner_selections[group.category]}</p>
                      )}
                    </div>
                  ))}
                </div>
                <form onSubmit={handlePushOptionGroup} className="space-y-1">
                  <input type="text" placeholder="Selection Key Name..." required value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-2 bg-white border rounded-xl text-xs outline-none" />
                  <input type="text" placeholder="Options choices..." required value={choicesText} onChange={(e) => setChoicesText(e.target.value)} className="w-full p-2 bg-white border rounded-xl text-xs outline-none" />
                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded-xl uppercase tracking-wider transition">Inject Options</button>
                </form>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}