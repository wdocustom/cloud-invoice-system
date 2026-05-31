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
  const [loading, setLoading] = useState(true);
  
  const [tier, setTier] = useState<"mid" | "high">("mid");
  const [activeIndices, setActiveIndices] = useState<number[]>([]);
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [typedSignature, setTypedSignature] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "check">("stripe");

  useEffect(() => {
    fetchInvoiceData();
  }, [id]);

  async function fetchInvoiceData() {
    const { data } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", id)
      .single();

    if (data) {
      setInvoice(data);
      if (data.items && activeIndices.length === 0) {
        setActiveIndices(data.items.map((_: any, idx: number) => idx));
      }
    }
    setLoading(false);
  }

  const isLocked = invoice?.status === "approved";
  const masterItems = invoice?.items || [];
  const computedTotal = isLocked ? invoice.amount : masterItems.reduce((sum, item, idx) => activeIndices.includes(idx) ? sum + (tier === "mid" ? item.mid_cost : item.high_cost) : sum, 0);
  const depositAmount = computedTotal * ((invoice?.deposit_percentage || 20) / 100);

  const handleRemoveIndex = (idx: number) => {
    if (isLocked) return;
    setActiveIndices(activeIndices.filter((i) => i !== idx));
  };

  const handleReinstateIndex = (idx: number) => {
    if (isLocked) return;
    setActiveIndices([...activeIndices, idx].sort((a, b) => a - b));
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

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedSignature.trim()) return alert("Please sign with your name to approve.");
    setIsSubmitting(true);
    const timestamp = new Date().toISOString();
    
    const finalizedItems = masterItems.filter((_, idx) => activeIndices.includes(idx)).map((item: any) => ({
      title: tier === "mid" ? item.title : (item.high_title || `${item.title} Upgrade`),
      description: tier === "mid" ? item.mid_description : item.high_description,
      cost: tier === "mid" ? item.mid_cost : item.high_cost
    }));

    const { error } = await supabase
      .from("invoices")
      .update({ status: "approved", amount: computedTotal, items: finalizedItems, signature_name: typedSignature, signed_at: timestamp })
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
        <div className="w-6 h-6 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-[11px] font-bold tracking-widest text-slate-500 uppercase">Syncing Dashboard...</p>
      </div>
    </div>
  );

  if (!invoice) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans text-slate-700 font-bold">Proposal data missing.</div>;

  const clientLastName = invoice.homeowner_name ? invoice.homeowner_name.trim().split(" ").pop() : "Client";
  const projectHeaderTitle = `${clientLastName} Residence Project`;
  const activePhaseIndex = invoice.current_phase_index || 0;
  
  const standardMilestones = [
    { title: "Proposal", subtitle: "Locked" },
    { title: "Deposit", subtitle: "Mobilized" },
    { title: "Rough-In", subtitle: "Utilities" },
    { title: "Finishes", subtitle: "Drywall" },
    { title: "Hand-off", subtitle: "Complete" }
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
          <span className={`self-start sm:self-center px-3 py-1 rounded text-[10px] font-extrabold uppercase tracking-wider ${isLocked ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'}`}>
            {invoice.status}
          </span>
        </div>

        {/* Streamlined Confirmation Banner */}
        {isLocked && (
          <div className="bg-emerald-50 border-l-4 border-emerald-500 rounded-r-xl p-4 shadow-sm text-xs text-slate-700">
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

        {/* FIXED HORIZONTAL METRICS BLOCK GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 p-4 rounded-xl space-y-1.5 shadow-sm text-xs">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contractor</p>
            <p className="font-black text-slate-900 uppercase">WDO Custom</p>
            <p className="text-slate-500">Skyler Camacho • <span className="font-mono text-[10px]">LIC-1901422</span></p>
          </div>
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm text-xs flex flex-col justify-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Jobsite Location</p>
            <p className="font-bold text-slate-700">📍 {invoice.job_address}</p>
          </div>
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm text-xs flex flex-col justify-center relative">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Project Value ({isLocked ? 'Locked' : tier === 'mid' ? 'Mid' : 'High'})</p>
            <p className="text-xl font-black font-mono text-slate-900 mt-0.5">${computedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <p className="text-[9px] text-slate-400 mt-1 border-t pt-1 border-slate-100">Deposit down: <span className="font-bold text-slate-700 font-mono">${depositAmount.toLocaleString()}</span> ({invoice.deposit_percentage}%)</p>
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

        {/* PROGRESS PROGRESS PROGRESS RIBBON TRAIL */}
        {isLocked && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="text-left border-b border-slate-100 pb-2 flex justify-between items-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Construction Stage Progress Tracker</p>
              <p className="text-xs font-bold text-blue-600">{invoice.payment_phases?.[invoice.current_phase_index || 0]?.name || "Mobilization Setup"}</p>
            </div>
            <div className="relative flex items-center justify-between w-full pt-2 pb-1 overflow-x-auto scrollbar-none">
              <div className="absolute left-4 right-4 top-[18px] h-0.5 bg-slate-100 z-0">
                <div className="h-full bg-slate-900 transition-all duration-500 rounded-full" style={{ width: `${(activePhaseIndex / (standardMilestones.length - 1)) * 100}%` }} />
              </div>
              {standardMilestones.map((step, idx) => {
                const isCompleted = idx < activePhaseIndex;
                const isActive = idx === activePhaseIndex;
                return (
                  <div key={idx} className="flex flex-col items-center relative z-10 text-center shrink-0 w-16 sm:w-20">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] border transition-all ${isCompleted ? 'bg-slate-900 border-slate-900 text-white' : isActive ? 'bg-white border-blue-600 text-blue-600 scale-110 ring-4 ring-blue-50 font-black' : 'bg-white border-slate-200 text-slate-300'}`}>{isCompleted ? "✓" : idx + 1}</div>
                    <p className={`text-[9px] font-bold mt-2 uppercase tracking-wide ${isActive ? 'text-blue-600 font-extrabold' : isCompleted ? 'text-slate-800' : 'text-slate-400'}`}>{step.title}</p>
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

        {/* Closed Document Accordion Box View */}
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
                    <div className="text-right flex flex-col items-end gap-1 shrink-0">
                      <span className="font-mono font-bold text-slate-800">${(isLocked ? item.cost : (tier === 'mid' ? item.mid_cost : item.high_cost)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      {!isLocked && (
                        isActive ? (
                          <button type="button" onClick={() => handleRemoveIndex(idx)} className="text-red-500 font-bold text-[10px] hover:underline uppercase">Omit</button>
                        ) : (
                          <button type="button" onClick={() => handleReinstateIndex(idx)} className="text-emerald-600 font-bold text-[10px] hover:underline uppercase">Reinstate</button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Milestone payment matrix splits */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 text-left space-y-3 shadow-sm">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contract Progress Milestone Payment Draws</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {invoice.payment_phases?.map((phase, idx) => {
              const phaseVal = computedTotal * (phase.percentage / 100);
              return (
                <div key={idx} className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex justify-between items-center shadow-inner text-xs">
                  <div className="text-left">
                    <p className="font-bold text-slate-800 leading-tight">{phase.name}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Portion Split: {phase.percentage}%</p>
                  </div>
                  <span className="font-mono font-bold text-slate-900">${phaseVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Deposit Remittance Section Panel */}
        {!isLocked && (
          <div className="border border-slate-200 bg-white rounded-xl p-5 text-left space-y-3 shadow-sm">
            <div>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Deposit Information to start your project</h3>
              <p className="text-xs text-slate-500">Remit mobilization funds total of <span className="font-mono font-bold text-slate-900">${depositAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>.</p>
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
              <p>The Homeowner has executed selective omissions resulting in a final bound project consideration total of <span className="font-bold text-slate-900">${computedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> under the selected finish specification tier profile matrix.</p>
            </div>
          )}
        </div>

        {/* Dynamic Approval Box Signature Form Layout */}
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
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Dynamic Client Signature Authorization Panel</h3>
                <p className="text-xs text-slate-400 font-medium">Type name to authorize digital contract execution and lock construction bounds.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <input type="text" required placeholder="Type legal signature..." value={typedSignature} onChange={(e) => setTypedSignature(e.target.value)} className="flex-1 px-4 py-2.5 rounded-xl outline-none text-xs text-slate-900 bg-slate-50 border border-slate-200 focus:border-slate-900 font-bold transition-all" />
                <button type="submit" disabled={isSubmitting || activeIndices.length === 0} className="bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-white font-bold text-xs px-6 py-2.5 rounded-xl uppercase tracking-wider transition-all shadow-sm">Lock & Execute Proposal</button>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}