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
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Synchronizing Client Hub...</p>
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
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans antialiased pb-24 text-left selection:bg-blue-600/10 tracking-normal">
      
      {/* Premium Re-engineered Header Architecture */}
      <div className="bg-slate-900 text-white shadow-xl border-b border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500" />
        <div className="max-w-6xl mx-auto px-6 py-7 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black tracking-widest text-blue-400 uppercase bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">Client Interactive Portal</span>
            </div>
            <h1 className="text-xl font-black tracking-tight uppercase text-slate-100">WDO Custom Client Hub</h1>
            <p className="text-xs font-semibold tracking-wide text-slate-400">Project Address</p>
          </div>
          
          <div className="flex items-center gap-3 self-start md:self-center shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Proposal Milestone Status</p>
              <p className="text-xs font-extrabold text-slate-300 uppercase tracking-wide mt-0.5">{invoice.status}</p>
            </div>
            <span className={`h-3 w-3 rounded-full ${isLocked ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]' : 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.5)] animate-pulse'}`} />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* LEFT INTERACTIVE CONFIGURATION PANEL */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Project Specification Grade - Completely Transformed */}
            {!isLocked && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-[0_4px_20px_rgba(15,23,42,0.02)] relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-600" />
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
                  <div className="space-y-1 text-left">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                      🛠️ Custom Specification Tier Matrix
                    </h3>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      Toggle build tiers below to instantly compare material grade packages and live cost variance updates.
                    </p>
                  </div>
                  
                  <div className="bg-slate-100 p-1 rounded-xl flex w-full sm:w-auto border border-slate-200/60 shadow-inner shrink-0 self-center">
                    <button 
                      type="button" 
                      onClick={() => setTier("mid")} 
                      className={`flex-1 sm:flex-none px-5 py-2.5 text-xs font-bold rounded-lg transition-all duration-200 ${
                        tier === 'mid' 
                          ? 'bg-white text-slate-900 shadow-md font-black border border-slate-200/50' 
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Standard Mid-Tier
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setTier("high")} 
                      className={`flex-1 sm:flex-none px-5 py-2.5 text-xs font-bold rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5 ${
                        tier === 'high' 
                          ? 'bg-slate-900 text-white shadow-lg font-black' 
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      💎 Luxury High-Tier
                    </button>
                  </div>
                </div>
              </div>
            )}

            {isLocked && (
              <div className="bg-gradient-to-r from-emerald-500/5 to-teal-500/5 border border-emerald-500/20 rounded-2xl p-5 text-xs text-slate-700 leading-relaxed shadow-sm flex items-start gap-3">
                <span className="text-lg shrink-0 mt-0.5">🛡️</span>
                <p className="font-semibold text-slate-600">
                  <strong className="text-slate-900 font-black">Contract Terms Finalized & Executed.</strong> Production schedules have been synchronized into the Master Staging Queue. You can follow live trade deployment paths via the milestones sub-ledger dashboard directly below.
                </p>
              </div>
            )}

            {/* PROGRESS TRACKER */}
            {isLocked && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-[0_4px_20px_rgba(15,23,42,0.02)] space-y-4">
                <div className="text-left border-b pb-3 border-slate-100 flex justify-between items-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Construction Stage Progress Tracker</p>
                  <span className={`text-[9px] font-black tracking-widest uppercase px-2.5 py-1 rounded-md border ${invoice.deposit_cleared ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                    {invoice.deposit_cleared ? `Active Draw: ${invoice.payment_phases?.[invoice.current_phase_index || 0]?.name || "Staging"}` : "Staging: Awaiting Deposit Clearance"}
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

            {/* TIMELINE ROADMAP */}
            {isLocked && scheduleTasks.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-[0_4px_20px_rgba(15,23,42,0.02)] space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-2.5 border-slate-100">🗓️ Active Field Task Targets Log</h3>
                <div className="border border-slate-200/60 rounded-xl bg-slate-50/50 p-4 space-y-3 shadow-inner">
                  {scheduleTasks.map((task) => (
                    <div key={task.id} className="bg-white border border-slate-200/60 p-4 rounded-xl shadow-sm space-y-3 text-xs">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-extrabold text-slate-900 text-sm">{task.task_name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 tracking-wide">
                            Window: {new Date(task.target_start_date + 'T00:00:00').toLocaleDateString(undefined, {month:'short', day:'numeric'})} – {new Date(task.target_end_date + 'T00:00:00').toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric' })}
                          </p>
                        </div>
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${
                          task.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          task.status === 'in_progress' ? 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse' :
                          'bg-slate-50 text-slate-400'
                        }`}>{task.status.replace('_', ' ')}</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/40 shadow-inner">
                        <div className="h-full bg-slate-900 transition-all duration-500 rounded-full" style={{ width: `${task.progress_percent}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SCOPE ITEMS LEDGER CONTAINER */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-[0_4px_25px_rgba(15,23,42,0.02)] overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200/60 px-6 py-4 flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Planned Scope Milestones Ledger</h3>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-full">{masterItems.length} Trade Phases</span>
              </div>

              <div className="divide-y divide-slate-100 bg-white">
                {masterItems.map((item: any, idx: number) => {
                  const isActive = activeIndices.includes(idx);
                  if (isLocked && !isActive) return null;
                  return (
                    <div key={idx} className={`p-6 flex flex-col sm:flex-row justify-between sm:items-start gap-4 transition-all duration-200 group/item ${!isActive ? 'bg-slate-50/50 opacity-30': 'hover:bg-slate-50/30'}`}>
                      <div className="text-left space-y-1.5 flex-1">
                        <h4 className="font-extrabold text-slate-900 text-sm tracking-tight group-hover/item:text-blue-600 transition-colors">
                          {isLocked ? item.title : (tier === 'mid' ? item.title : item.high_title)}
                        </h4>
                        <p className="text-slate-500 text-xs leading-relaxed max-w-2xl font-medium">
                          {isLocked ? item.description : (tier === 'mid' ? item.mid_description : item.high_description)}
                        </p>
                      </div>
                      
                      <div className="text-right flex sm:flex-col items-center sm:items-end justify-between gap-3 shrink-0 pt-3 sm:pt-0 border-t sm:border-transparent border-slate-100">
                        <span className="font-sans font-extrabold text-slate-950 text-sm tracking-tight bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                          ${(isLocked ? item.cost : (tier === 'mid' ? item.mid_cost : item.high_cost)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        
                        {!isLocked && (
                          isActive ? (
                            <button type="button" onClick={() => handleRemoveIndex(idx)} className="bg-white border border-slate-200 hover:border-red-200 hover:bg-red-50 hover:text-red-700 text-slate-400 font-bold text-[10px] px-3 py-1.5 rounded-xl uppercase tracking-wide shadow-sm transition-all outline-none">
                              Omit Item
                            </button>
                          ) : (
                            <button type="button" onClick={() => handleReinstateIndex(idx)} className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-[10px] px-3 py-1.5 rounded-xl uppercase tracking-wide shadow-sm transition-all outline-none">
                              Include Row
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* MATERIALS SELECTION BOARD */}
            {isLocked && invoice.homeowner_options && invoice.homeowner_options.length > 0 && (
              <div className="border border-slate-200 bg-white rounded-2xl p-6 text-left space-y-4 shadow-[0_4px_20px_rgba(15,23,42,0.02)] relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-slate-900" />
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">🎨 Project Materials Selection Board</h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium leading-relaxed">Finalize your property finishes below. Tap an entry variant to register selections directly onto the active schedule.</p>
                </div>
                <div className="space-y-4 divide-y divide-slate-100">
                  {invoice.homeowner_options.map((group: any, gIdx: number) => {
                    const chosen = invoice.homeowner_selections?.[group.category];
                    return (
                      <div key={gIdx} className="space-y-2.5 pt-4 first:pt-0">
                        <p className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Specify {group.category} Component:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {group.choices.map((choice: string, cIdx: number) => {
                            const isChosen = chosen === choice;
                            return (
                              <button 
                                type="button" 
                                key={cIdx} 
                                onClick={() => handleSelectMaterialChoice(group.category, choice)} 
                                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all duration-150 ${
                                  isChosen 
                                    ? 'bg-slate-900 border-transparent text-white font-black shadow-md scale-102' 
                                    : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                              >
                                {choice} {isChosen && "✓"}
                              </button>
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

          {/* RIGHT SIDEBAR COMPONENT PANEL: PREMIUM COST & SIGN-OFF WORKBENCH */}
          <div className="space-y-5 lg:sticky lg:top-8">
            
            {/* TRANSACTION CARD OVERHAUL */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-[0_10px_30px_rgba(15,23,42,0.04)] space-y-5 text-left relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/10 to-indigo-500/0 rounded-full blur-xl pointer-events-none" />
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Project Investment Valuation</p>
                <h2 className="text-3xl font-black text-slate-950 mt-1 tracking-tight">
                  ${combinedProjectTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h2>
                <div className="mt-3 flex flex-wrap gap-1.5 pt-3 border-t border-slate-100">
                  <span className="text-[9px] font-bold text-slate-500 bg-slate-50 border border-slate-200/60 px-2 py-0.5 rounded-md">
                    Base Contract: ${baseTotal.toLocaleString(undefined, {minimumFractionDigits:2})}
                  </span>
                  {approvedCoTotal > 0 && (
                    <span className="text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md shadow-sm">
                      CO Updates: +${approvedCoTotal.toLocaleString(undefined, {minimumFractionDigits:2})}
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl border border-slate-200/60 p-4 text-xs text-slate-600 space-y-2.5 font-semibold shadow-inner">
                <div className="flex justify-between items-center border-b border-slate-200/50 pb-2">
                  <span className="text-slate-500 font-medium">Staging Authorization Deposit ({invoice.deposit_percentage}%):</span>
                  <span className="font-sans font-black text-slate-950 text-sm">${depositAmount.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-500">
                  <span className="font-medium">Estimated Build Timeline:</span>
                  <span className="font-extrabold text-slate-800 uppercase tracking-wide">{invoice.project_length || "9 Weeks"}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-500">
                  <span className="font-medium">Target Groundbreak Date*:</span>
                  <span className="font-extrabold text-slate-800">
                    {invoice.estimated_start_date ? new Date(invoice.estimated_start_date + 'T00:00:00').toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' }) : "Jun 15, 2026"}
                  </span>
                </div>
              </div>
              
              <p className="text-[9px] text-slate-400 font-semibold italic leading-normal px-0.5">* Timelines and groundbreak schedules instantiate immediately following deposit validation clearance log thresholds.</p>
            </div>

            {/* PAYMENT SCHEDULE INTERFACE */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-[0_4px_20px_rgba(15,23,42,0.02)] text-left space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 border-slate-100">Contract Draw Allotment Schedule</h3>
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-0.5">
                {invoice.payment_phases?.map((phase: any, idx: number) => {
                  const phaseVal = baseTotal * (phase.percentage / 100);
                  const activePhaseIdx = invoice.current_phase_index || 0;
                  
                  const isPaid = invoice.deposit_cleared && idx < activePhaseIdx;
                  const isFirstPhaseDepositPaid = invoice.deposit_cleared && idx === 0;
                  const isPhaseActive = isLocked && (idx === activePhaseIdx || (idx === 0 && !invoice.deposit_cleared));

                  return (
                    <div key={idx} className={`border p-3 rounded-xl flex justify-between items-center text-xs transition-colors duration-200 ${
                      isPhaseActive 
                        ? 'border-blue-200 bg-blue-50/20' 
                        : (isPaid || isFirstPhaseDepositPaid)
                        ? 'border-slate-100 bg-slate-50/30'
                        : 'border-slate-200/60 bg-white'
                    }`}>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-extrabold text-slate-900 tracking-tight">{phase.name}</p>
                          {(isPaid || isFirstPhaseDepositPaid) ? (
                            <span className="text-[7px] font-black tracking-widest uppercase px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200/50">PAID</span>
                          ) : isPhaseActive ? (
                            <span className="text-[7px] font-black tracking-widest uppercase px-1.5 py-0.2 rounded bg-blue-600 text-white shadow-sm animate-pulse">ACTIVE</span>
                          ) : (
                            <span className="text-[7px] font-black tracking-widest uppercase px-1.5 py-0.2 rounded bg-slate-100 text-slate-400 border border-slate-200/40">PEND</span>
                          )}
                        </div>
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wide">Allocation Weight: {phase.percentage}%</p>
                      </div>
                      <span className="font-sans font-extrabold text-slate-900 bg-slate-100/50 px-2 py-1 border border-slate-200/40 rounded-lg">${phaseVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* DYNAMIC SCOPE CHANGES CONTAINER */}
            {isLocked && changeOrders.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-[0_4px_20px_rgba(15,23,42,0.02)] space-y-3 text-left">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 border-slate-100">Project Scope Modifications Log</h3>
                <div className="space-y-2.5 max-h-48 overflow-y-auto">
                  {changeOrders.map((co: any) => {
                    const isCoApproved = co.status === "approved";
                    const isCoPaid = co.deposit_cleared;
                    const isExpanded = expandedCoId === co.id;

                    return (
                      <div key={co.id} className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm text-xs transition-all duration-150">
                        <div onClick={() => setExpandedCoId(isExpanded ? null : co.id)} className="p-3 flex justify-between items-center cursor-pointer hover:bg-slate-50/60 transition-colors">
                          <div className="text-left space-y-1">
                            <p className="font-extrabold text-slate-900 tracking-tight truncate w-36 sm:w-44">{co.description}</p>
                            <div className="flex gap-1.5">
                              <span className={`text-[7px] font-black uppercase px-1.5 py-0.2 rounded ${isCoApproved ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700'}`}>{isCoApproved ? "APPROVED" : "PENDING"}</span>
                              {isCoApproved && <span className={`text-[7px] font-black uppercase px-1.5 py-0.2 rounded ${isCoPaid ? 'bg-blue-50 text-blue-700 border border-blue-100':'bg-red-50 text-red-700'}`}>{isCoPaid ? "SETTLED":"UNPAID"}</span>}
                            </div>
                          </div>
                          <span className="font-sans font-extrabold text-slate-950 bg-slate-50 px-2 py-0.5 border rounded-md">${co.amount.toLocaleString(undefined, {minimumFractionDigits:2})}</span>
                        </div>
                        {isExpanded && (
                          <div className="p-3 bg-slate-50 border-t space-y-3 animate-fadeIn">
                            <div className="divide-y border bg-white rounded-xl overflow-hidden text-[11px] font-medium text-slate-600 shadow-inner">
                              {co.items?.map((item: any, iIdx: number) => (
                                <div key={iIdx} className="p-2.5 flex justify-between bg-white">
                                  <span className="font-bold text-slate-800 truncate w-32">{item.title}</span>
                                  <span className="font-sans font-bold text-slate-700">${item.cost.toLocaleString(undefined, {minimumFractionDigits:2})}</span>
                                </div>
                              ))}
                            </div>
                            {!isCoApproved && (
                              <button type="button" onClick={() => executeOneClickCoApproval(co.id)} className="w-full bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black py-2.5 rounded-xl tracking-wider uppercase transition shadow-md outline-none">
                                🔒 Authorize Variation Scope
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

            {/* REMITTANCE CHANNELS RE-ARCHITECTED */}
            {isLocked && !invoice.deposit_cleared && (
              <div className="border border-slate-200 rounded-2xl bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.02)] text-left space-y-4 animate-fadeIn">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 border-slate-100">Secure Remittance Channels</h3>
                <div className="grid grid-cols-2 gap-2 text-xs font-bold bg-slate-100/60 p-1 rounded-xl border">
                  <button type="button" onClick={() => setPaymentMethod("stripe")} className={`p-2.5 rounded-lg text-center transition-all ${paymentMethod === 'stripe' ? 'bg-white text-slate-950 shadow-sm border border-slate-200/40 font-black' : 'text-slate-500'}`}>ACH Transfer</button>
                  <button type="button" onClick={() => setPaymentMethod("check")} className={`p-2.5 rounded-lg text-center transition-all ${paymentMethod === 'check' ? 'bg-white text-slate-950 shadow-sm border border-slate-200/40 font-black' : 'text-slate-500'}`}>Physical Check</button>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed font-medium bg-slate-50 border border-slate-200 p-3 rounded-xl shadow-inner">
                  {paymentMethod === 'stripe' ? "🔒 Secure banking channel integrated. Remittance validations map ledger thresholds instantly upon confirmation transit signals." : "💵 Remittance checks must be drawn to: WDO Custom. Field construction managers will verify site plans directly at layout lines groundbreak."}
                </p>
              </div>
            )}

            {/* SIGN-OFF WORKBENCH ACTION MATRIX */}
            <div className="border-t pt-2 border-slate-200/20">
              {isLocked ? (
                <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl p-5 text-center shadow-xl relative overflow-hidden border border-slate-800">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
                  <p className="text-emerald-400 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Contract Bounds Bound & Executed
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1.5 font-medium leading-relaxed">
                    Digital identity verification log matches authorization matrix: <span className="font-sans font-black text-white underline decoration-blue-500 underline-offset-4 tracking-wide block mt-1 text-sm">{invoice.signature_name}</span>
                  </p>
                  <p className="text-[9px] text-slate-500 font-semibold tracking-wide mt-3 uppercase border-t border-slate-800/80 pt-2">Timestamp: {new Date(invoice.signed_at || "").toLocaleString()}</p>
                </div>
              ) : (
                <form onSubmit={handleApprove} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)] relative">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
                  <div className="text-left space-y-1">
                    <h3 className="text-xs font-black text-slate-950 uppercase tracking-wide">Project Contract Sign-Off</h3>
                    <p className="text-[11px] text-slate-400 font-medium leading-relaxed">Type your full legal name below to execute contract bounds, lock trade specifications, and authorize production schedules.</p>
                  </div>
                  <div className="space-y-3 pt-1">
                    <input type="text" required placeholder="Type your full name to sign digitally..." value={typedSignature} onChange={(e) => setTypedSignature(e.target.value)} className="w-full px-4 py-3 rounded-xl outline-none text-xs text-slate-900 bg-slate-50 border border-slate-200 focus:border-slate-950 focus:bg-white font-bold transition-all shadow-inner placeholder:text-slate-400" />
                    <button type="submit" disabled={isSubmitting || activeIndices.length === 0} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-98 text-white font-black text-xs py-3.5 rounded-xl tracking-widest uppercase transition-all shadow-lg shadow-blue-600/10 outline-none">
                      Authorize & Execute Proposal
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* LEGAL TERMS ACCORDION */}
            <div className="border border-slate-200 bg-white rounded-2xl overflow-hidden shadow-sm text-left">
              <button type="button" onClick={() => setShowTerms(!showTerms)} className="w-full bg-slate-50 px-5 py-3 font-bold text-[10px] uppercase tracking-wider flex justify-between items-center text-slate-400 hover:text-slate-700 transition-all outline-none border-0"  >
                <span>⚖️ Binding Terms (Omaha Law Standard)</span>
                <span className="text-[10px] text-slate-400 font-semibold">{showTerms ? "Hide ▲" : "View ▼"}</span>
              </button>
              {showTerms && (
                <div className="p-5 text-[11px] text-slate-400 space-y-2 max-h-40 overflow-y-scroll border-t bg-white leading-relaxed font-medium shadow-inner">
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