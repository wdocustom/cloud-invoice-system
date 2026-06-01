"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

interface MultiTierItem {
  title: string;
  mid_description: string;
  mid_cost: number;
  high_title: string;
  high_description: string;
  high_cost: number;
}

interface PaymentPhase {
  name: string;
  percentage: number;
}

interface Invoice {
  id: string;
  homeowner_name: string;
  homeowner_email: string;
  job_address: string;
  amount: number;
  items: MultiTierItem[];
  deposit_percentage: number;
  payment_phases: PaymentPhase[];
  estimated_start_date?: string;
  project_length?: string;
  status: string;
  signature_name?: string;
  signed_at?: string;
  current_phase_index?: number;
  deposit_cleared?: boolean;
  homeowner_options?: any[];
  homeowner_selections?: any;
}

export default function HomeownerPortal() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [changeOrders, setChangeOrders] = useState<any[]>([]);
  const [scheduleTasks, setScheduleTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [tier, setTier] = useState<"mid" | "high">("mid");
  const [activeIndices, setActiveIndices] = useState<number[]>([]);
  const [expandedIndices, setExpandedIndices] = useState<number[]>([]);
  const [showTerms, setShowTerms] = useState(false);
  const [typedSignature, setTypedSignature] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "check">("stripe");
  const [expandedCoId, setExpandedCoId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      logStealthTelemetryView();
      fetchInvoiceData();
    }
  }, [id]);

  async function logStealthTelemetryView() {
    const timestamp = new Date().toISOString();
    try {
      const { error } = await supabase.rpc("increment_invoice_views", { 
        target_id: id, 
        current_time: timestamp 
      });
      if (error) throw error;
    } catch (err) {
      const { data } = await supabase.from("invoices").select("view_count, view_history").eq("id", id).single();
      if (data) {
        const updatedHistory = [...(data.view_history || []), timestamp];
        await supabase.from("invoices").update({ view_count: (data.view_count || 0) + 1, view_history: updatedHistory }).eq("id", id);
      }
    }
  }

  async function fetchInvoiceData() {
    const { data: mainProject } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", id)
      .single();

    if (mainProject) {
      setInvoice(mainProject);
      if (mainProject.items && activeIndices.length === 0) {
        setActiveIndices(mainProject.items.map((_: any, idx: number) => idx));
      }

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

  const isLocked = invoice?.status === "approved";
  const masterItems = invoice?.items || [];
  
  const baseTotal = isLocked ? invoice.amount : masterItems.reduce((sum: number, item: any, idx: number) => activeIndices.includes(idx) ? sum + (tier === "mid" ? item.mid_cost : item.high_cost) : sum, 0);
  const approvedCoTotal = changeOrders.filter((co: any) => co.status === "approved").reduce((sum: number, co: any) => sum + co.amount, 0);
  const combinedProjectTotal = baseTotal + approvedCoTotal;
  const depositAmount = baseTotal * ((invoice?.deposit_percentage || 20) / 100);

  const handleRemoveIndex = (idx: number) => {
    if (isLocked) return;
    setActiveIndices(activeIndices.filter((i: number) => i !== idx));
  };

  const handleReinstateIndex = (idx: number) => {
    if (isLocked) return;
    setActiveIndices([...activeIndices, idx].sort((a: number, b: number) => a - b));
  };

  const toggleExpandDescription = (idx: number) => {
    if (expandedIndices.includes(idx)) {
      setExpandedIndices(expandedIndices.filter((i) => i !== idx));
    } else {
      setExpandedIndices([...expandedIndices, idx]);
    }
  };

  const handleSelectMaterialChoice = async (category: string, value: string) => {
    if (!invoice) return;
    const currentSelections = invoice.homeowner_selections || {};
    const updatedSelections = { ...currentSelections, [category]: value };

    const { error } = await supabase
      .from("invoices")
      .update({ homeowner_selections: updatedSelections })
      .eq("id", id);

    if (!error) fetchInvoiceData();
  };

  const executeOneClickCoApproval = async (coId: string) => {
    if (!confirm("Authorize and append this change order supplement to your project contract?")) return;
    const { error } = await supabase.from("invoices").update({ status: "approved" }).eq("id", coId);
    if (error) alert("Approval exception processing validation token.");
    else fetchInvoiceData();
  };

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedSignature.trim()) return alert("Please sign with your name to authorize approval.");
    setIsSubmitting(true);
    const timestamp = new Date().toISOString();
    
    const finalizedItems = masterItems.filter((_: any, idx: number) => activeIndices.includes(idx)).map((item: any) => ({
      title: tier === "mid" ? item.title : (item.high_title || `${item.title} Upgrade`),
      description: tier === "mid" ? item.mid_description : item.high_description,
      cost: tier === "mid" ? item.mid_cost : item.high_cost
    }));

    const { error } = await supabase
      .from("invoices")
      .update({ status: "approved", amount: baseTotal, items: finalizedItems, signature_name: typedSignature, signed_at: timestamp })
      .eq("id", id);

    if (!error) {
      fetchInvoiceData();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    setIsSubmitting(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Synchronizing Premium Workspace...</p>
      </div>
    </div>
  );

  if (!invoice) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans text-slate-700 font-bold">Proposal data missing.</div>;

  const activePhaseIndex = invoice.current_phase_index || 0;
  
  let dynamicTimelineIndex = 0;
  if (isLocked) {
    if (invoice.deposit_cleared) {
      dynamicTimelineIndex = 1 + (invoice.current_phase_index || 0);
    } else {
      dynamicTimelineIndex = 1;
    }
  }

  const standardMilestones = [
    { title: "Proposal", subtitle: "Locked" },
    { title: "Deposit", subtitle: "Initiated" },
    { title: "Rough-In", subtitle: "Utilities" },
    { title: "Finishes", subtitle: "Trim Out" },
    { title: "Hand-off", subtitle: "Turnover" }
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans antialiased pb-24 text-left selection:bg-slate-900/10 tracking-normal">
      
      {/* Top Professional Accent Header Bar */}
      <div className="bg-slate-900 text-white shadow-sm border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="space-y-0.5">
            <h1 className="text-sm font-black tracking-wider uppercase text-slate-200">WDO Custom Client Hub</h1>
            <p className="text-[10px] font-sans font-bold tracking-widest text-slate-400 uppercase">Project Address</p>
          </div>
          <span className={`px-3 py-1 rounded-md text-[9px] font-black tracking-widest uppercase border ${
            isLocked ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}>
            • {invoice.status}
          </span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-6">
        
        {/* Dynamic Responsive Split Layout Blueprint Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* LEFT CONTAINER COMPONENT FRAME */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Global Tier Option Selector Card */}
            {!isLocked && (
              <div className="bg-white border border-slate-200/60 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.01)] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-0.5 text-left">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">Project Specification Grade</h4>
                  <p className="text-[11px] text-slate-400 font-medium">Toggle configuration tiers to view alternative finish options and live project cost updates instantly.</p>
                </div>
                <div className="bg-slate-100 p-0.5 rounded-lg flex w-full sm:w-auto border border-slate-200/40 shadow-inner shrink-0">
                  <button type="button" onClick={() => setTier("mid")} className={`px-4 py-2 text-xs font-bold rounded-md transition-all duration-150 ${tier === 'mid' ? 'bg-white text-slate-900 shadow-sm font-black border' : 'text-slate-500 hover:text-slate-900'}`}>
                    Standard Mid-Tier
                  </button>
                  <button type="button" onClick={() => setTier("high")} className={`px-4 py-2 text-xs font-bold rounded-md transition-all duration-150 flex items-center justify-center gap-1.5 ${tier === 'high' ? 'bg-slate-900 text-white shadow-sm font-black' : 'text-slate-600 hover:text-slate-900'}`}>
                    💎 Luxury High-Tier
                  </button>
                </div>
              </div>
            )}

            {isLocked && (
              <div className="bg-emerald-50/60 border border-emerald-200/60 rounded-xl p-4 text-xs text-slate-700 leading-relaxed">
                <strong>✓ Contract Bounds Signed & Live.</strong> Skyler Camacho is delighted to bring production frameworks onto your home! Monitor active milestones on site targets via the tracker sub-ledgers below.
              </div>
            )}

            {/* HIGH-DENSITY INTERACTIVE SCHEDULE PROGRESS TRACKER */}
            {isLocked && (
              <div className="bg-white border border-slate-200/60 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.01)] space-y-4">
                <div className="text-left border-b pb-2.5 border-slate-100 flex justify-between items-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Construction Stage Progress Tracker</p>
                  <span className={`text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-md border ${invoice.deposit_cleared ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                    {invoice.deposit_cleared ? `Active: ${invoice.payment_phases?.[invoice.current_phase_index || 0]?.name || "Staging"}` : "Staging: Awaiting Clearance"}
                  </span>
                </div>
                <div className="relative flex items-center justify-between w-full pt-2 pb-1 overflow-x-auto scrollbar-none">
                  <div className="absolute left-4 right-4 top-[18px] h-0.5 bg-slate-100 z-0">
                    <div className="h-full bg-slate-900 transition-all duration-500 rounded-full shadow-sm" style={{ width: `${(dynamicTimelineIndex / (standardMilestones.length - 1)) * 100}%` }} />
                  </div>
                  {standardMilestones.map((step, idx) => {
                    const isCompleted = idx < dynamicTimelineIndex;
                    const isActive = idx === dynamicTimelineIndex;
                    return (
                      <div key={idx} className="flex flex-col items-center relative z-10 text-center shrink-0 w-16 sm:w-20">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] border transition-all duration-300 ${
                          isCompleted ? 'bg-slate-900 border-slate-900 text-white' : 
                          isActive ? 'bg-white border-blue-600 text-blue-600 scale-110 ring-4 ring-blue-50 font-black' : 
                          'bg-white border-slate-200 text-slate-300'
                        }`}>{isCompleted ? "✓" : idx + 1}</div>
                        <p className={`text-[9px] font-black mt-2 uppercase tracking-wide ${isActive ? 'text-blue-600 font-extrabold' : isCompleted ? 'text-slate-800' : 'text-slate-400'}`}>{step.title}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TIMELINE SCHEDULE ROADMAP */}
            {isLocked && scheduleTasks.length > 0 && (
              <div className="bg-white border border-slate-200/60 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-3">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-2 border-slate-100">🗓️ Project Production Schedule Roadmap</h3>
                <div className="border rounded-xl bg-slate-50 p-3 space-y-2.5 shadow-inner">
                  {scheduleTasks.map((task) => (
                    <div key={task.id} className="bg-white border border-slate-200/60 p-3 rounded-lg shadow-sm space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-extrabold text-slate-900">{task.task_name}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5 tracking-wide">
                            Window: {new Date(task.target_start_date + 'T00:00:00').toLocaleDateString(undefined, {month:'short', day:'numeric'})} – {new Date(task.target_end_date + 'T00:00:00').toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'})}
                          </p>
                        </div>
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                          task.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          task.status === 'in_progress' ? 'bg-blue-50 text-blue-700 border-blue-100 animate-pulse' :
                          'bg-slate-50 text-slate-400'
                        }`}>{task.status.replace('_', ' ')}</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200/40 shadow-inner">
                        <div className="h-full bg-slate-900 transition-all duration-500 rounded-full" style={{ width: `${task.progress_percent}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ONBOARDING GUIDANCE INSTRUCTION BLOCK */}
            <div className="bg-slate-100/70 border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-[0_1px_2px_rgba(0,0,0,0.01)] select-none">
              <span className="text-blue-500 text-sm">💡</span>
              <p>Click the <span className="font-black text-slate-800 bg-white border border-slate-200 px-1 py-0.2 rounded">+</span> icon next to any milestone row item below to expand detailed scopes and technical criteria logs.</p>
            </div>

            {/* CONDENSED AND CLEAN COMPACT LINE ITEMS FEED ROW PANELS */}
            <div className="space-y-2 bg-transparent">
              {masterItems.map((item: any, idx: number) => {
                const isActive = activeIndices.includes(idx);
                const isExpanded = expandedIndices.includes(idx);
                if (isLocked && !isActive) return null;
                return (
                  <div 
                    key={idx} 
                    className={`px-5 py-3 rounded-xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.01)] transition-all duration-150 text-xs ${
                      !isActive ? 'opacity-30 select-none border-dashed bg-slate-50/50' : 'hover:border-slate-300'
                    }`}
                  >
                    {/* Synchronized layout grid mapping everything inside a tight, clean baseline */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => toggleExpandDescription(idx)}
                          className="flex items-center justify-center w-5 h-5 rounded border border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300 transition-all font-sans font-black text-xs bg-slate-50/60 shrink-0 outline-none"
                        >
                          {isExpanded ? "−" : "+"}
                        </button>
                        <h4 className="font-extrabold text-slate-900 text-sm tracking-tight truncate">
                          {isLocked ? item.title : (tier === 'mid' ? item.title : item.high_title)}
                        </h4>
                      </div>
                      
                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 sm:pt-0">
                        <span className="font-sans font-extrabold text-slate-950 text-sm tracking-tight">
                          ${(isLocked ? item.cost : (tier === 'mid' ? item.mid_cost : item.high_cost)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        {!isLocked && (
                          isActive ? (
                            <button 
                              type="button" 
                              onClick={() => handleRemoveIndex(idx)} 
                              title="remove item"
                              className="w-5 h-5 flex items-center justify-center rounded bg-red-50 hover:bg-red-500 text-red-500 hover:text-white border border-red-100 transition-all duration-150 outline-none font-sans font-black text-[10px]"
                            >
                              ✕
                            </button>
                          ) : (
                            <button 
                              type="button" 
                              onClick={() => handleReinstateIndex(idx)} 
                              className="bg-blue-50 border border-blue-100 text-blue-700 font-bold text-[9px] px-2 py-1 rounded uppercase tracking-wider shadow-sm transition-all outline-none"
                            >
                              Include
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-2.5 pt-2.5 border-t border-slate-100 pl-7 max-w-3xl text-left animate-fadeIn">
                        <p className="text-slate-500 font-medium leading-relaxed">
                          {isLocked ? item.description : (tier === 'mid' ? item.mid_description : item.high_description)}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* DYNAMIC DESIGN CHOICE BOARD MODULE */}
            {isLocked && invoice.homeowner_options && invoice.homeowner_options.length > 0 && (
              <div className="border border-slate-200/60 bg-white rounded-xl p-5 text-left space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.01)] relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-slate-900" />
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">🎨 Project Materials Selection Board</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Finalize your property finishes below. Tap an entry variant to register allowances logs directly onto the build schedule.</p>
                </div>
                <div className="space-y-3 divide-y divide-slate-100">
                  {invoice.homeowner_options.map((group: any, gIdx: number) => {
                    const chosen = invoice.homeowner_selections?.[group.category];
                    return (
                      <div key={gIdx} className="space-y-2 pt-3 first:pt-0">
                        <p className="text-[11px] font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-900" /> Design Component: Specify {group.category}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {group.choices.map((choice: string, cIdx: number) => {
                            const isChosen = chosen === choice;
                            return (
                              <button type="button" key={cIdx} onClick={() => handleSelectMaterialChoice(group.category, choice)} className={`px-4 py-2 rounded-xl text-xs font-bold border shadow-sm transition-all duration-150 ${isChosen ? 'bg-slate-900 border-transparent text-white font-black' : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}>{choice} {isChosen && "✓"}</button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

          {/* RIGHT SIDEBAR COMPONENT PANEL: FIXED CHECKOUT VALUE HUB */}
          <div className="space-y-4 sticky top-20">
            
            {/* LIVING COMPACT SIDEBAR HUB */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-[0_4px_12px_rgba(15,23,42,0.02)] space-y-5 text-left relative overflow-hidden">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Project Total</p>
                <h2 className="text-3xl font-black text-slate-950 mt-1 tracking-tight">
                  ${combinedProjectTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h2>
                <div className="mt-3 flex flex-wrap gap-1.5 pt-3 border-t border-slate-100">
                  <span className="text-[9px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-md">
                    Contract Base: ${baseTotal.toLocaleString(undefined, {minimumFractionDigits:2})}
                  </span>
                  {approvedCoTotal > 0 && (
                    <span className="text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-md shadow-sm">
                      Appended Variations: +${approvedCoTotal.toLocaleString(undefined, {minimumFractionDigits:2})}
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl border border-slate-200/60 p-4 text-xs text-slate-600 space-y-2.5 font-semibold">
                <div className="flex justify-between items-center border-b border-slate-200/40 pb-2">
                  <span className="text-slate-500 font-medium">Construction Deposit ({invoice.deposit_percentage}%):</span>
                  <span className="font-sans font-black text-slate-950 text-sm">${depositAmount.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-500">
                  <span className="text-slate-500 font-medium">Estimated Build Timeline:</span>
                  <span className="font-extrabold text-slate-800 uppercase tracking-wide">{invoice.project_length || "9 Weeks"}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-500">
                  <span className="text-slate-500 font-medium">Start Date*:</span>
                  <span className="font-extrabold text-slate-800">
                    {invoice.estimated_start_date ? new Date(invoice.estimated_start_date + 'T00:00:00').toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' }) : "Jun 15, 2026"}
                  </span>
                </div>
              </div>
              
              <p className="text-[9px] text-slate-400 font-semibold italic leading-normal px-0.5">* Timelines and milestone sequencing execute immediately following initial deposit clearance log signatures.</p>
            </div>

            {/* DRAW PHASES MATRIX */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm text-left space-y-3">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1.5 border-slate-100">Payment Schedule</h3>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
                {invoice.payment_phases?.map((phase: any, idx: number) => {
                  const phaseVal = baseTotal * (phase.percentage / 100);
                  const activePhaseIdx = invoice.current_phase_index || 0;
                  
                  const isPaid = invoice.deposit_cleared && idx < activePhaseIdx;
                  const isFirstPhaseDepositPaid = invoice.deposit_cleared && idx === 0;
                  const isPhaseActive = isLocked && (idx === activePhaseIdx || (idx === 0 && !invoice.deposit_cleared));

                  return (
                    <div key={idx} className="bg-slate-50/50 border border-slate-200/60 p-2.5 rounded-lg flex justify-between items-center text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <p className="font-extrabold text-slate-800 tracking-tight">{phase.name}</p>
                          {(isPaid || isFirstPhaseDepositPaid) ? (
                            <span className="text-[8px] font-black tracking-widest uppercase px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200/60">PAID</span>
                          ) : isPhaseActive ? (
                            <span className="text-[8px] font-black tracking-widest uppercase px-1 py-0.2 rounded bg-blue-100 text-blue-800 border border-blue-200/60 animate-pulse">ACTIVE</span>
                          ) : (
                            <span className="text-[8px] font-black tracking-widest uppercase px-1 py-0.2 rounded bg-slate-200 text-slate-400">PEND</span>
                          )}
                        </div>
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wide">Draw Allocation: {phase.percentage}%</p>
                      </div>
                      <span className="font-sans font-extrabold text-slate-900">${phaseVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PENDING CHANGE ORDERS MODULE */}
            {isLocked && changeOrders.length > 0 && (
              <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-2.5 text-left">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1.5 border-slate-100">Scope Modifications</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {changeOrders.map((co: any) => {
                    const isCoApproved = co.status === "approved";
                    const isCoPaid = co.deposit_cleared;
                    const isExpanded = expandedCoId === co.id;

                    return (
                      <div key={co.id} className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm text-xs">
                        <div onClick={() => setExpandedCoId(isExpanded ? null : co.id)} className="p-3 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors">
                          <div className="text-left space-y-0.5">
                            <p className="font-bold text-slate-900 tracking-tight truncate w-36 sm:w-44">{co.description}</p>
                            <div className="flex gap-1">
                              <span className={`text-[7px] font-black uppercase px-1 rounded ${isCoApproved ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{isCoApproved ? "APP" : "PEND"}</span>
                              {isCoApproved && <span className={`text-[7px] font-black uppercase px-1 rounded ${isCoPaid ? 'bg-blue-50 text-blue-700':'bg-red-50 text-red-700'}`}>{isCoPaid ? "PAID":"UNPD"}</span>}
                            </div>
                          </div>
                          <span className="font-sans font-extrabold text-slate-900">${co.amount.toLocaleString(undefined, {minimumFractionDigits:2})}</span>
                        </div>
                        {isExpanded && (
                          <div className="p-2.5 bg-slate-50 border-t space-y-2.5 animate-fadeIn">
                            <div className="divide-y border bg-white rounded-lg overflow-hidden text-[11px] font-medium text-slate-600">
                              {co.items?.map((item: any, iIdx: number) => (
                                <div key={iIdx} className="p-2 flex justify-between bg-white">
                                  <span className="font-bold text-slate-800 truncate w-32">{item.title}</span>
                                  <span className="font-sans font-bold text-slate-700">${item.cost.toLocaleString(undefined, {minimumFractionDigits:2})}</span>
                                </div>
                              ))}
                            </div>
                            {!isCoApproved && (
                              <button type="button" onClick={() => executeOneClickCoApproval(co.id)} className="w-full bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black py-2.5 rounded-xl tracking-wider uppercase transition shadow-sm outline-none">
                                🔒 Execute Change Order Supplement
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* REMITTANCE DOCK */}
            {isLocked && !invoice.deposit_cleared && (
              <div className="border border-slate-200 rounded-xl bg-white p-5 text-left space-y-3 shadow-sm animate-fadeIn">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1.5 border-slate-100">Deposit Remittance Channel</h3>
                <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                  <button type="button" onClick={() => setPaymentMethod("stripe")} className={`p-2.5 border rounded-lg text-center transition-all ${paymentMethod === 'stripe' ? 'border-slate-950 bg-slate-50' : 'border-slate-200'}`}>ACH Bank Transfer</button>
                  <button type="button" onClick={() => setPaymentMethod("check")} className={`p-2.5 border rounded-lg text-center transition-all ${paymentMethod === 'check' ? 'border-slate-950 bg-slate-50' : 'border-slate-200'}`}>Physical Check</button>
                </div>
                <p className="text-[11px] text-slate-500 leading-normal font-medium bg-slate-50 border border-slate-200/60 p-2.5 rounded-lg shadow-inner">
                  {paymentMethod === 'stripe' ? "🔒 Stripe gateway frameworks loaded. Balances match verification sub-ledgers upon transit triggers initialization." : "💵 Make checking check draft payable exactly to: WDO Custom. Field coordinators will clear layout lines on physical site staging arrival."}
                </p>
              </div>
            )}

            {/* CLEAN, REAL-WORLD BINDING SIGNATURE PANEL */}
            <div className="border-t pt-2 border-slate-200/40">
              {isLocked ? (
                <div className="bg-slate-900 text-white rounded-xl p-4 text-center shadow-md relative overflow-hidden border border-slate-800">
                  <p className="text-emerald-400 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5">✓ Contract Execution Bound & Sealed</p>
                  <p className="text-[11px] text-slate-400 mt-1 font-medium">Digital signature verification matching: <span className="font-sans font-extrabold text-white underline tracking-tight">{invoice.signature_name}</span></p>
                  <p className="text-[9px] text-slate-500 font-semibold tracking-wide mt-0.5">Timestamp: {new Date(invoice.signed_at || "").toLocaleString()}</p>
                </div>
              ) : (
                <form onSubmit={handleApprove} className="bg-white border border-slate-200/80 rounded-xl p-5 space-y-3 shadow-md">
                  <div className="text-left space-y-1">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Project Approval Signature</h3>
                    <p className="text-[11px] text-slate-400 font-medium leading-relaxed">Please type your full name below to accept this proposal and authorize the project scope and payment schedule.</p>
                  </div>
                  <div className="space-y-2 pt-1">
                    <input type="text" required placeholder="Type your name to sign..." value={typedSignature} onChange={(e) => setTypedSignature(e.target.value)} className="w-full px-4 py-2.5 rounded-xl outline-none text-xs text-slate-900 bg-slate-50 border border-slate-200 focus:border-slate-900 font-bold transition-all shadow-inner placeholder:text-slate-400" />
                    <button type="submit" disabled={isSubmitting || activeIndices.length === 0} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-xs py-3 rounded-xl tracking-widest uppercase transition-all shadow-md shadow-blue-900/10 outline-none">
                      Accept Proposal
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* LEGAL TERMS ACCORDION */}
            <div className="border border-slate-200 bg-white rounded-xl overflow-hidden shadow-sm text-left">
              <button type="button" onClick={() => setShowTerms(!showTerms)} className="w-full bg-slate-50 px-4 py-2.5 font-bold text-[10px] uppercase tracking-wider flex justify-between items-center text-slate-400 hover:text-slate-700 transition-all outline-none border-0"  >
                <span>⚖️ Binding Terms (Omaha Law Standard)</span>
                <span className="text-[10px] text-slate-400 font-semibold">{showTerms ? "Hide ▲" : "View ▼"}</span>
              </button>
              {showTerms && (
                <div className="p-4 text-[11px] text-slate-400 space-y-2 max-h-40 overflow-y-scroll border-t bg-white leading-relaxed font-medium shadow-inner">
                  <p>This agreement is configured specifically under the building framework of the City of Omaha, Douglas County, Nebraska. All modifications, materials, structural deviations, and framing updates shall be performed in accordance with the International Residential Code (IRC) as amended by local Omaha ordinances.</p>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}