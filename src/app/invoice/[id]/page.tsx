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
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [typedSignature, setTypedSignature] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "check">("stripe");
  const [expandedCoId, setExpandedCoId] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoiceData();
  }, [id]);

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
    if (!confirm("Authorize and append this trade modification adjustment to your active project framework?")) return;
    
    const { error } = await supabase
      .from("invoices")
      .update({ status: "approved" })
      .eq("id", coId);

    if (error) alert("Approval exception mapping validation token.");
    else fetchInvoiceData();
  };

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedSignature.trim()) return alert("Please type your name to authorize signature.");
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans text-slate-400">
      <div className="flex flex-col items-center gap-2">
        <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
        <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Syncing Portal View...</p>
      </div>
    </div>
  );

  if (!invoice) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans text-slate-700 font-bold">Proposal data missing.</div>;

  const clientLastName = invoice.homeowner_name ? invoice.homeowner_name.trim().split(" ").pop() : "Client";
  const projectHeaderTitle = `${clientLastName} Residence Project`;
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
    { title: "Proposal", subtitle: "Contract Locked" },
    { title: "Deposit", subtitle: "Project Initiated" },
    { title: "Rough-In", subtitle: "Framing & Utilities" },
    { title: "Finishes", subtitle: "Drywall & Trim" },
    { title: "Hand-off", subtitle: "Final Walkthrough" }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased pb-16 text-left">
      <div className="max-w-4xl mx-auto px-4 pt-6 space-y-4">
        
        {/* Compact Navigation Banner */}
        <div className="bg-slate-900 text-white rounded-xl p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-3 shadow-sm">
          <div className="space-y-0.5">
            <h1 className="text-lg font-black tracking-tight uppercase">{projectHeaderTitle}</h1>
            <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wide">ID Token: {invoice.id.slice(0,8)}</p>
          </div>
          <span className={`self-start sm:self-center px-3 py-1 rounded text-[10px] font-extrabold uppercase tracking-wider ${isLocked ? 'bg-emerald-600 text-white' : 'bg-amber-50 text-white'}`}>
            {invoice.status}
          </span>
        </div>

        {/* Streamlined Confirmation Banner */}
        {isLocked && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 shadow-sm text-xs text-slate-700">
            <strong>✓ Proposal Framework Approved & Project Contract Live.</strong> Skyler Camacho is delighted to begin production on your home! Use the material tools below to log style choices as the schedule advances.
          </div>
        )}

        {/* Grade Option Selection Strip */}
        {!isLocked && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Project Specification Grade</p>
            <div className="bg-slate-100 p-0.5 rounded-lg flex w-full sm:w-auto border border-slate-200/40">
              <button type="button" onClick={() => setTier("mid")} className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-bold rounded-md transition-all ${tier === 'mid' ? 'bg-white text-slate-900 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'}`}>Standard Mid</button>
              <button type="button" onClick={() => setTier("high")} className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${tier === 'high' ? 'bg-blue-600 text-white shadow-sm font-black' : 'text-blue-600'}`}>💎 Luxury High</button>
            </div>
          </div>
        )}

        {/* HORIZONTAL PROFILE CARDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 p-4 rounded-xl space-y-1.5 shadow-sm text-xs">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contractor Details</p>
            <p className="font-black text-slate-900 uppercase">WDO Custom</p>
            <p className="text-slate-500">Skyler Camacho • <span className="font-mono text-[10px]">LIC-1901422</span></p>
          </div>
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm text-xs flex flex-col justify-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Jobsite Location</p>
            <p className="font-bold text-slate-700">📍 {invoice.job_address}</p>
          </div>
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm text-xs flex flex-col justify-center relative">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Living Combined Project Valuation</p>
            <p className="text-xl font-black font-mono text-slate-900 mt-0.5">${combinedProjectTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <p className="text-[9px] text-slate-400 mt-1 border-t pt-1 border-slate-100">
              Base Contract: <span className="font-mono font-bold">${baseTotal.toLocaleString()}</span> {approvedCoTotal > 0 && `| CO Adjustments: +$${approvedCoTotal.toLocaleString()}`}
            </p>
          </div>
        </div>

        {/* Timeline Logistics Strip Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="group relative border border-slate-200 bg-white hover:border-blue-500/40 rounded-xl p-4 flex justify-between items-center transition-all cursor-help shadow-sm text-xs">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">Start Date Target <span className="text-[9px] text-blue-500 bg-blue-50 px-1 py-0.2 rounded font-normal font-sans">ⓘ info</span></p>
              <p className="font-bold text-slate-800 mt-0.5">{invoice.estimated_start_date ? new Date(invoice.estimated_start_date + 'T00:00:00').toLocaleDateString(undefined, { dateStyle: 'long' }) : "Unassigned"}</p>
            </div>
            <span className="text-lg opacity-30 group-hover:opacity-100">📅</span>
            <div className="pointer-events-none absolute left-1/2 -top-14 -translate-x-1/2 w-64 bg-slate-950 text-white text-[10px] rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-all shadow-xl z-30 text-center leading-normal">
              💡 Please coordinate directly with your manager to modify this targeted start date timeline.
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-950" />
            </div>
          </div>
          <div className="border border-slate-200 bg-white rounded-xl p-4 flex justify-between items-center text-xs shadow-sm">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estimated Project Duration</p>
              <p className="font-bold text-slate-800 mt-0.5">{invoice.project_length || "TBD"}</p>
            </div>
            <span className="text-lg opacity-30">⏳</span>
          </div>
        </div>

        {/* SYNCHRONIZED PROGRESS TIMELINE TRACK RIBBON */}
        {isLocked && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="text-left border-b border-slate-100 pb-2 flex justify-between items-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Construction Stage Progress Tracker</p>
              <span className={`text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded ${invoice.deposit_cleared ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700'}`}>
                {invoice.deposit_cleared 
                  ? `Active Status: ${invoice.payment_phases?.[invoice.current_phase_index || 0]?.name || "Staging"}`
                  : "Staging: Awaiting Financial Clearance"
                }
              </span>
            </div>
            <div className="relative flex items-center justify-between w-full pt-2 pb-1 overflow-x-auto scrollbar-none">
              <div className="absolute left-4 right-4 top-[18px] h-0.5 bg-slate-100 z-0">
                <div 
                  className="h-full bg-slate-900 transition-all duration-500 rounded-full" 
                  style={{ width: `${(dynamicTimelineIndex / (standardMilestones.length - 1)) * 100}%` }} 
                />
              </div>
              {standardMilestones.map((step: any, idx: number) => {
                const isCompleted = idx < dynamicTimelineIndex;
                const isActive = idx === dynamicTimelineIndex;
                return (
                  <div key={idx} className="flex flex-col items-center relative z-10 text-center shrink-0 w-16 sm:w-20">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] border transition-all ${
                      isCompleted ? 'bg-slate-900 border-slate-900 text-white' : 
                      isActive ? 'bg-white border-blue-600 text-blue-600 scale-110 ring-4 ring-blue-50 font-black' : 
                      'bg-white border-slate-200 text-slate-300'
                    }`}>{isCompleted ? "✓" : idx + 1}</div>
                    <p className={`text-[9px] font-bold mt-2 uppercase tracking-wide ${isActive ? 'text-blue-600 font-extrabold' : isCompleted ? 'text-slate-800' : 'text-slate-400'}`}>{step.title}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CLIENT-FACING ACTIVE LIVE Gantt MAP SCHEDULE */}
        {isLocked && scheduleTasks.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3 text-left">
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">🗓️ Project Production Schedule Roadmap</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Track live progress targets and completed field milestones across on-site remodeling operations.</p>
            </div>

            <div className="border rounded-xl bg-slate-50 p-4 space-y-3 shadow-inner">
              {scheduleTasks.map((task) => (
                <div key={task.id} className="bg-white border p-3 rounded-lg shadow-sm space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-extrabold text-slate-900">{task.task_name}</p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Target window: {new Date(task.target_start_date + 'T00:00:00').toLocaleDateString(undefined, {month:'short', day:'numeric'})} – {new Date(task.target_end_date + 'T00:00:00').toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'})}
                      </p>
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                      task.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                      task.status === 'in_progress' ? 'bg-blue-50 text-blue-700 border-blue-100 animate-pulse' :
                      'bg-slate-100 text-slate-500'
                    }`}>{task.status.replace('_', ' ')}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden border">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        task.status === 'completed' ? 'bg-emerald-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${task.progress_percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CLIENT CHANGE ORDERS SYSTEM WORKBENCH */}
        {isLocked && changeOrders.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3 text-left">
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">📋 Project Scope Modifications (Change Orders)</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Review and approve site variations. **Note:** Approved Change Orders require separate fulfillment independent of core construction phases.</p>
            </div>

            <div className="border rounded-xl divide-y overflow-hidden shadow-inner">
              {changeOrders.map((co: any) => {
                const isCoApproved = co.status === "approved";
                const isCoPaid = co.deposit_cleared;
                const isExpanded = expandedCoId === co.id;

                return (
                  <div key={co.id} className="bg-white transition-all">
                    <div 
                      onClick={() => setExpandedCoId(isExpanded ? null : co.id)}
                      className="p-4 flex justify-between items-center cursor-pointer hover:bg-slate-50/60 font-sans"
                    >
                      <div className="text-left space-y-1">
                        <p className="text-sm font-extrabold text-slate-900">{co.description}</p>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[8px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded ${
                            isCoApproved ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {isCoApproved ? "APPROVED" : "PENDING REVIEW"}
                          </span>
                          
                          {isCoApproved && (
                            <span className={`text-[8px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded ${
                              isCoPaid ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-red-50 text-red-700 border-red-100'
                            }`}>
                              {isCoPaid ? "💰 PAID" : "🛑 UNPAID"}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <span className="font-mono font-bold text-sm text-slate-900">${co.amount.toLocaleString(undefined,{minimumFractionDigits:2})}</span>
                        <span className="text-xs text-slate-400">{isExpanded ? "▲" : "▼"}</span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-4 bg-slate-50/50 border-t space-y-4 animate-fadeIn">
                        <div className="divide-y border bg-white rounded-xl text-xs shadow-sm">
                          {co.items?.map((item: any, iIdx: number) => (
                            <div key={iIdx} className="p-3 flex justify-between gap-4 items-center bg-white">
                              <div className="text-left">
                                <p className="font-bold text-slate-900">{item.title}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{item.description}</p>
                              </div>
                              <span className="font-mono font-bold text-slate-800">${item.cost.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>

                        <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium">
                          📌 <strong>Change Order Payment Status:</strong> This modification requires processing in full immediately upon approval, billed independently from your standard milestone draw parameters.
                        </div>

                        {!isCoApproved && (
                          <button
                            type="button"
                            onClick={() => executeOneClickCoApproval(co.id)}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-black py-3 rounded-xl tracking-wider uppercase transition-all shadow-md outline-none"
                          >
                            🔒 Authorize & Execute Change Order Supplement
                          </button>
                        )}
                        {isCoApproved && (
                          <div className={`p-3 text-center font-bold text-xs rounded-xl border ${
                            isCoPaid ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          }`}>
                            {isCoPaid 
                              ? "✓ Payment draft fully processed and recorded. This supplement is finalized." 
                              : "✓ Supplement authorized. Awaiting check or card funding clearance matching the unpaid token parameters above."
                            }
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Dynamic Materials Choices Section Dashboard */}
        {isLocked && (
          <div className="border border-slate-200 bg-white rounded-xl p-5 text-left space-y-4 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-slate-900" />
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">🎨 Project Materials Selection Board</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Click your preferred options. Items are pre-vetted to align perfectly with allowance values.</p>
            </div>
            <div className="space-y-3 pr-1 divide-y divide-slate-100">
              {invoice.homeowner_options?.map((group: any, gIdx: number) => {
                const chosen = invoice.homeowner_selections?.[group.category];
                return (
                  <div key={gIdx} className="space-y-2 pt-3 first:pt-0">
                    <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">🔧 Specify {group.category}:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {group.choices.map((choice: string, cIdx: number) => {
                        const isChosen = chosen === choice;
                        return (
                          <button type="button" key={cIdx} onClick={() => handleSelectMaterialChoice(group.category, choice)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${isChosen ? 'bg-slate-900 border-transparent text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'}`}>{choice} {isChosen && "✓"}</button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {(!invoice.homeowner_options || invoice.homeowner_options.length === 0) && (
                <p className="text-xs text-slate-400 italic text-center py-2 bg-slate-50 border border-slate-100 rounded-lg">Option specification sheets are being finalized. Materials items will render here shortly.</p>
              )}
            </div>
          </div>
        )}

        {/* Invoice Itemized Breakdown Accordion */}
        <div className="border border-slate-200 bg-white rounded-xl overflow-hidden shadow-sm">
          <button type="button" onClick={() => setShowInvoiceDetails(!showInvoiceDetails)} className="w-full bg-slate-50/60 p-4 font-bold text-xs uppercase tracking-wider flex justify-between items-center text-slate-500 hover:bg-slate-100 transition-all outline-none" >
            <span>📋 {isLocked ? "View Closed Contract Trade Scope Paperwork" : "Review Planned Operations Specifications Grid"}</span>
            <span className="text-[10px] bg-white px-2 py-0.5 rounded border text-slate-500 font-bold shadow-sm">{showInvoiceDetails ? "Hide ▲" : "Expand Scope ▼"}</span>
          </button>
          {(!isLocked || showInvoiceDetails) && (
            <div className="divide-y divide-slate-100 bg-white text-left text-xs">
              {!isLocked && (
                <div className="bg-slate-50 px-4 py-2.5 flex items-center justify-between gap-4 border-b">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Scope Multiplier Switch</p>
                  <div className="bg-white border rounded p-0.5 flex">
                    <button type="button" onClick={() => setTier("mid")} className={`px-2.5 py-1 text-[10px] font-bold rounded ${tier === 'mid' ? 'bg-slate-900 text-white':''}`}>Mid Tier</button>
                    <button type="button" onClick={() => setTier("high")} className={`px-2.5 py-1 text-[10px] font-bold rounded ${tier === 'high' ? 'bg-slate-900 text-white':''}`}>💎 High Upgrade</button>
                  </div>
                </div>
              )}
              {masterItems.map((item: any, idx: number) => {
                const isActive = activeIndices.includes(idx);
                if (isLocked && !isActive) return null;
                return (
                  <div key={idx} className={`p-4 flex justify-between items-center gap-4 ${!isActive ? 'bg-slate-50/50 opacity-30':''}`}>
                    <div className="text-left space-y-0.5">
                      <h4 className="font-bold text-slate-900">{isLocked ? item.title : (tier === 'mid' ? item.title : item.high_title)}</h4>
                      <p className="text-slate-500 text-[11px] leading-relaxed max-w-2xl">{isLocked ? item.description : (tier === 'mid' ? item.mid_description : item.high_description)}</p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2 shrink-0">
                      <span className="font-mono font-bold text-slate-800">${(isLocked ? item.cost : (tier === 'mid' ? item.mid_cost : item.high_cost)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      {!isLocked && (
                        isActive ? (
                          <button 
                            type="button" 
                            onClick={() => handleRemoveIndex(idx)} 
                            className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-extrabold text-[10px] px-3 py-1.5 rounded-lg uppercase shadow-sm transition-all"
                          >
                            Remove
                          </button>
                        ) : (
                          <button 
                            type="button" 
                            onClick={() => handleReinstateIndex(idx)} 
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-extrabold text-[10px] px-3 py-1.5 rounded-lg uppercase shadow-sm transition-all"
                          >
                            Reinstate
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CONTRACT PAYMENTS MATRIX SPLITS */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 text-left space-y-3 shadow-sm">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider tracking-widest">Contract Payments</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {invoice.payment_phases?.map((phase: any, idx: number) => {
              const phaseVal = baseTotal * (phase.percentage / 100);
              const activePhaseIdx = invoice.current_phase_index || 0;
              
              const isPaid = invoice.deposit_cleared && idx < activePhaseIdx;
              const isFirstPhaseDepositPaid = invoice.deposit_cleared && idx === 0;
              const isPhaseActive = isLocked && (idx === activePhaseIdx || (idx === 0 && !invoice.deposit_cleared));

              return (
                <div key={idx} className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex justify-between items-center shadow-inner text-xs">
                  <div className="text-left space-y-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-slate-800 leading-tight">{phase.name}</p>
                      {(isPaid || isFirstPhaseDepositPaid) ? (
                        <span className="text-[8px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                          PAID
                        </span>
                      ) : isPhaseActive ? (
                        <span className="text-[8px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200 animate-pulse">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="text-[8px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded bg-slate-200 text-slate-500">
                          PENDING
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Draw Allocation Split: {phase.percentage}%</p>
                  </div>
                  <span className="font-mono font-bold text-slate-900">${phaseVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* REWORKED CONDITIONAL REMITTANCE (ONLY RENDERS POST-APPROVAL) */}
        {isLocked && !invoice.deposit_cleared && (
          <div className="border border-slate-200 bg-white rounded-xl p-5 text-left space-y-3 shadow-sm animate-fadeIn">
            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Deposit Remittance Channel</h3>
              <p className="text-xs text-slate-500">Please route your project mobilization deposit of <span className="font-mono font-bold text-slate-900">${depositAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> to initiate on-site framing operations.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" onClick={() => setPaymentMethod("stripe")} className={`p-3 border rounded-xl text-xs font-bold text-left transition-all ${paymentMethod === 'stripe' ? 'border-slate-950 bg-slate-50' : 'border-slate-200'}`}>Card / ACH Wire</button>
              <button type="button" onClick={() => setPaymentMethod("check")} className={`p-3 border rounded-xl text-xs font-bold text-left transition-all ${paymentMethod === 'check' ? 'border-slate-950 bg-slate-50' : 'border-slate-200'}`}>Physical Check</button>
            </div>
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 leading-relaxed">
              {paymentMethod === 'stripe' ? "🔒 Stripe Processing Activated." : <div>💵 Check payable exactly to: <span className="underline font-bold text-slate-950">WDO Custom</span>. Manager will clear balance logging details upon arrival staging.</div>}
            </div>
          </div>
        )}

        {/* Legal Accordion Box */}
        <div className="border border-slate-200 bg-white rounded-xl overflow-hidden shadow-sm text-left">
          <button type="button" onClick={() => setShowTerms(!showTerms)} className="w-full bg-slate-50 p-3 font-bold text-xs uppercase tracking-wider flex justify-between items-center text-slate-400 hover:text-slate-900 transition-all outline-none"  >
            <span>⚖️ Review Binding Terms & Conditions (Omaha Construction Law Standard)</span>
            <span className="text-[10px] text-slate-400 font-mono">{showTerms ? "Hide ▲" : "View ▼"}</span>
          </button>
          {showTerms && (
            <div className="p-5 text-xs text-slate-500 space-y-3 max-h-56 overflow-y-scroll leading-relaxed border-t border-slate-100 bg-white">
              <p>This agreement is configured specifically under the building framework of the City of Omaha, Douglas County, Nebraska. All modifications, materials, structural deviations, and framing updates shall be performed in accordance with the International Residential Code (IRC) as amended by local Omaha ordinances.</p>
            </div>
          )}
        </div>

        {/* Project Approval Signature */}
        <div className="pt-4 border-t border-slate-200">
          {isLocked ? (
            <div className="bg-slate-900 text-white rounded-xl p-5 text-center shadow-sm text-xs font-medium">
              <p className="text-emerald-400 font-bold uppercase tracking-wider">✓ Contract Legally Signed & Bound</p>
              <p className="text-slate-400 mt-1.5">Executed digital token authorized by client name: <span className="font-serif italic font-black text-white underline">{invoice.signature_name}</span></p>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">Timestamp: {new Date(invoice.signed_at || "").toLocaleString()}</p>
            </div>
          ) : (
            <form onSubmit={handleApprove} className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-3 shadow-sm">
              <div className="text-left space-y-0.5">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Project Approval Signature</h3>
                <p className="text-xs text-slate-400 font-medium">Type name to authorize digital contract execution and lock construction bounds.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <input type="text" required placeholder="Type legal signature..." value={typedSignature} onChange={(e) => setTypedSignature(e.target.value)} className="flex-1 px-4 py-2.5 rounded-xl outline-none text-xs text-slate-900 bg-slate-50 border border-slate-200 focus:border-slate-900 font-bold transition-all" />
                <button type="submit" disabled={isSubmitting || activeIndices.length === 0} className="bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-white font-bold text-xs px-6 py-2.5 rounded-xl uppercase tracking-wider transition-all shadow-sm">
                  Accept Proposal
                </button>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}