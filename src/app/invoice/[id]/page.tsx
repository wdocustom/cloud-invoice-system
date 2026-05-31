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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans text-slate-500">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Loading Client Dashboard...</p>
      </div>
    </div>
  );

  if (!invoice) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans text-slate-700 font-bold">Proposal project data not found.</div>;

  const clientLastName = invoice.homeowner_name ? invoice.homeowner_name.trim().split(" ").pop() : "Client";
  const projectHeaderTitle = `${clientLastName} Residence Project`;
  const activePhaseIndex = invoice.current_phase_index || 0;
  
  const standardMilestones = [
    { title: "Proposal", subtitle: "Contract Locked" },
    { title: "Deposit Authorized", subtitle: "Project Initiated" },
    { title: "Rough-In Phase", subtitle: "Framing & Utilities" },
    { title: "Finishes Installs", subtitle: "Drywall & Trim" },
    { title: "Final Turnover", subtitle: "Walkthrough Closeout" }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased pb-24 text-left">
      <div className="max-w-4xl mx-auto px-4 pt-8 space-y-6">
        
        {/* Navy Premium Header Banner */}
        <div className="bg-slate-900 text-white rounded-xl p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-md">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase">
              {projectHeaderTitle}
            </h1>
            <p className="text-[10px] font-mono text-slate-400 tracking-wider uppercase">System Token Trace: {invoice.id.slice(0,8)}...</p>
          </div>
          <div>
            <span className={`px-4 py-1.5 rounded-md text-[10px] font-extrabold uppercase tracking-widest border border-transparent shadow-sm ${
              isLocked ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
            }`}>
              {invoice.status}
            </span>
          </div>
        </div>

        {/* Dynamic Post-Approval Congratulations Panel */}
        {isLocked && (
          <div className="bg-emerald-50 border-l-4 border-emerald-500 rounded-r-xl p-5 shadow-sm">
            <h2 className="text-sm font-bold text-emerald-900 flex items-center gap-2 uppercase tracking-wide">
              🎉 Framework Confirmed & Project Contract Live
            </h2>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-medium">
              Skyler Camacho is absolutely delighted to begin production on your home! Use the interactive timeline track and material selection worksheet board below to monitor construction parameters as our milestone schedules advance.
            </p>
          </div>
        )}

        {/* Rich Contrast Finishes Upgrade Selector */}
        {!isLocked && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-800 uppercase tracking-wide">Project Specification Grade Options</p>
              <p className="text-[11px] text-slate-500">Toggle luxury finishes to view dynamic pricing updates across your contract blueprint.</p>
            </div>
            <div className="bg-slate-100 border border-slate-200/60 p-1 rounded-xl flex w-full sm:w-auto shadow-inner">
              <button type="button" onClick={() => setTier("mid")} className={`flex-1 sm:flex-initial px-5 py-2 text-xs font-bold rounded-lg tracking-wide uppercase transition-all ${tier === 'mid' ? 'bg-white text-slate-900 border border-slate-200 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'}`}>
                Standard Mid-Tier
              </button>
              <button type="button" onClick={() => setTier("high")} className={`flex-1 sm:flex-initial px-5 py-2 text-xs font-bold rounded-lg tracking-wide uppercase transition-all flex items-center justify-center gap-2 ${tier === 'high' ? 'bg-blue-600 text-white border border-blue-700 shadow-sm font-black' : 'text-blue-600 hover:bg-blue-50'}`}>
                💎 Luxury High Upgrade
              </button>
            </div>
          </div>
        )}

        {/* High Contrast Profile Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200/80 p-5 rounded-xl space-y-3 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider border-b pb-1.5 border-slate-100">Project Contractor</p>
            <div>
              <h4 className="text-base font-black text-slate-900 uppercase">WDO Custom</h4>
              <p className="text-xs text-slate-600 font-medium">Skyler Camacho</p>
            </div>
            <p className="text-[9px] font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 inline-block">LIC-1901422</p>
          </div>
          <div className="bg-white border border-slate-200/80 p-5 rounded-xl flex flex-col shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider border-b pb-1.5 border-slate-100 mb-3">Jobsite Location</p>
            <h4 className="text-xs font-bold text-slate-700 leading-relaxed uppercase">📍 {invoice.job_address}</h4>
          </div>
          <div className="bg-white border border-slate-200/80 p-5 rounded-xl flex flex-col justify-between shadow-sm relative overflow-hidden group">
            <div className="absolute right-0 bottom-0 w-16 h-16 bg-slate-50 border-tl border-slate-100 rounded-tl-xl flex items-center justify-center font-mono text-lg font-bold text-slate-300 pointer-events-none select-none">$$</div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider border-b pb-1.5 border-slate-100">
                Project Value ({isLocked ? 'Locked' : (tier === 'mid' ? 'Mid Spec' : 'High Spec')})
              </p>
              <h4 className="text-2xl font-black font-mono text-slate-900 mt-2 tracking-tight">
                ${computedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h4>
            </div>
            <p className="text-[10px] text-slate-500 mt-4 font-medium">
              Mobilization Setup Deposit: <span className="font-mono font-bold text-slate-900">${depositAmount.toLocaleString(undefined,{minimumFractionDigits:2})}</span> ({invoice.deposit_percentage}%)
            </p>
          </div>
        </div>

        {/* HOUZZ PRO STYLE MILESTONE LINEAR PIPELINE */}
        {isLocked && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="text-left border-b border-slate-100 pb-3">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Real-Time Schedule Pipeline tracking</h3>
              <p className="text-sm font-bold text-blue-600 mt-1">Active Step: {invoice.payment_phases?.[invoice.current_phase_index || 0]?.name || "Mobilization Setup"}</p>
            </div>

            {/* Ribbon Pipeline Track */}
            <div className="relative flex items-center justify-between w-full pt-4 pb-2 overflow-x-auto sm:overflow-x-visible scrollbar-none">
              
              {/* Connected Background Track Strip Line */}
              <div className="absolute left-4 right-4 top-[30px] h-1 bg-slate-100 z-0 rounded-full border border-slate-200/40">
                <div 
                  className="h-full bg-slate-900 transition-all duration-700 rounded-full shadow-sm shadow-slate-400"
                  style={{ width: `${(activePhaseIndex / (standardMilestones.length - 1)) * 100}%` }}
                />
              </div>

              {standardMilestones.map((step, idx) => {
                const isCompleted = idx < activePhaseIndex;
                const isActive = idx === activePhaseIndex;

                return (
                  <div key={idx} className="flex flex-col items-center relative z-10 text-center shrink-0 w-20 sm:w-24">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shadow-sm border transition-all duration-500 ${
                      isCompleted ? 'bg-slate-900 border-slate-900 text-white' :
                      isActive ? 'bg-white border-blue-600 text-blue-600 font-black scale-110 ring-4 ring-blue-50' :
                      'bg-white border-slate-200 text-slate-400'
                    }`}>
                      {isCompleted ? "✓" : idx + 1}
                    </div>
                    <p className={`text-[10px] font-black mt-3 uppercase tracking-wide transition-colors ${isActive ? 'text-blue-600 font-extrabold' : isCompleted ? 'text-slate-800' : 'text-slate-400'}`}>
                      {step.title}
                    </p>
                    <p className="text-[8px] text-slate-400 font-bold scale-90 w-24 hidden sm:block truncate mt-0.5">
                      {step.subtitle}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Logistics Breakdown Grid cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="group relative border border-slate-200 bg-white hover:border-blue-500/40 rounded-xl p-5 flex justify-between items-center transition-all duration-200 cursor-help shadow-sm">
            <div className="text-left">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                Start Date Target <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded uppercase">ⓘ View Info</span>
              </p>
              <p className="text-sm font-bold text-slate-800 mt-1">
                {invoice.estimated_start_date ? new Date(invoice.estimated_start_date + 'T00:00:00').toLocaleDateString(undefined, { dateStyle: 'long' }) : "Awaiting Schedule Clearance"}
              </p>
            </div>
            <span className="text-xl opacity-30 group-hover:opacity-100 transition-opacity">📅</span>

            {/* Hover Tooltip Popup Element */}
            <div className="pointer-events-none absolute left-1/2 -top-16 -translate-x-1/2 w-72 bg-slate-950 text-white text-[11px] rounded-xl p-3 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-xl z-30 text-center leading-relaxed">
              💡 Please coordinate directly with your contractor manager if you would like to request modifications to this targeted start date timeline.
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-950" />
            </div>
          </div>
          <div className="border border-slate-200 bg-white rounded-xl p-5 flex justify-between items-center text-left shadow-sm">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Estimated Construction Duration</p>
              <p className="text-sm font-bold text-slate-800 mt-1">{invoice.project_length || "TBD Upon City Permit Issuance"}</p>
            </div>
            <span className="text-xl opacity-30">⏳</span>
          </div>
        </div>

        {/* Dynamic Project Finishes Selection Deck */}
        {isLocked && (
          <div className="border border-slate-200 bg-white rounded-xl p-6 sm:p-8 text-left space-y-5 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-slate-900" />
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">🎨 Project Materials Selection Board</h3>
              <p className="text-xs text-slate-400 mt-1">Review the selection groups below. Select your preferred style specs to finalize options within your designated allowance margins.</p>
            </div>
            
            <div className="space-y-4 max-h-80 overflow-y-auto pr-1 divide-y divide-slate-100">
              {invoice.homeowner_options?.map((group: any, gIdx: number) => {
                const chosen = invoice.homeowner_selections?.[group.category];
                return (
                  <div key={gIdx} className="space-y-3 pt-4 first:pt-0 text-left">
                    <p className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600" /> Component: Specify {group.category}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {group.choices.map((choice: string, cIdx: number) => {
                        const isChosen = chosen === choice;
                        return (
                          <button
                            type="button"
                            key={cIdx}
                            onClick={() => handleSelectMaterialChoice(group.category, choice)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all border ${
                              isChosen 
                                ? 'bg-slate-900 border-transparent text-white shadow-sm font-black' 
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 shadow-sm'
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
              {(!invoice.homeowner_options || invoice.homeowner_options.length === 0) && (
                <div className="p-6 text-center text-xs text-slate-400 italic bg-slate-50 border border-slate-200 rounded-xl">
                  Skyler is packing your pre-vetted options lists. The design selections board layout will populate here shortly.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Closed Contract Document Accordion Framework */}
        <div className="border border-slate-200 bg-white rounded-xl overflow-hidden shadow-sm">
          <button 
            type="button" 
            onClick={() => setShowInvoiceDetails(!showInvoiceDetails)} 
            className="w-full bg-slate-50/60 p-5 font-bold text-xs uppercase tracking-widest flex justify-between items-center text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 border-b border-slate-200/60 transition-all outline-none"
          >
            <span>📋 {isLocked ? "View Closed Contract Paperwork Sheets" : "Review Planned Operations Specifications Grid"}</span>
            <span className="text-[10px] bg-white px-2.5 py-1 rounded border border-slate-200 font-mono text-slate-600 font-bold shadow-sm">
              {showInvoiceDetails ? "Hide Scope ▲" : "View Scope ▼"}
            </span>
          </button>
          
          {(!isLocked || showInvoiceDetails) && (
            <div className="divide-y divide-slate-100 bg-white text-left">
              {!isLocked && (
                <div className="bg-slate-50 px-6 py-4 flex items-center justify-between gap-4 border-b border-slate-200">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Pricing Variance Multiplier Switch</p>
                  <div className="bg-slate-100 border border-slate-200 p-0.5 rounded-xl flex shadow-inner">
                    <button type="button" onClick={() => setTier("mid")} className={`px-4 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all ${tier === 'mid' ? 'bg-white text-slate-900 border border-slate-200 shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}>Standard Mid</button>
                    <button type="button" onClick={() => setTier("high")} className={`px-4 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all ${tier === 'high' ? 'bg-slate-900 text-white shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}>💎 Luxury High</button>
                  </div>
                </div>
              )}
              {masterItems.map((item: any, idx: number) => {
                const isActive = activeIndices.includes(idx);
                if (isLocked && !isActive) return null;
                return (
                  <div key={idx} className={`p-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-all ${!isActive ? 'bg-slate-50/50 opacity-30':''}`}>
                    <div className="text-left space-y-0.5">
                      <h4 className="font-bold text-slate-900 text-sm tracking-wide">{isLocked ? item.title : (tier === 'mid' ? item.title : item.high_title)}</h4>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-2xl">{isLocked ? item.description : (tier === 'mid' ? item.mid_description : item.high_description)}</p>
                    </div>
                    <div className="text-right flex sm:flex-col justify-between sm:justify-center items-center sm:items-end gap-3 shrink-0 pt-3 sm:pt-0 border-t sm:border-transparent border-slate-100">
                      <span className="font-mono font-bold text-slate-900 text-sm">${(isLocked ? item.cost : (tier === 'mid' ? item.mid_cost : item.high_cost)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      {!isLocked && (
                        isActive ? (
                          <button type="button" onClick={() => handleRemoveIndex(idx)} className="text-red-500 hover:text-red-700 text-[10px] font-black border border-red-200 px-2.5 py-1 rounded-md bg-red-50 uppercase tracking-wider shadow-sm transition-all">Omit Trade</button>
                        ) : (
                          <button type="button" onClick={() => handleReinstateIndex(idx)} className="text-emerald-600 hover:text-emerald-700 text-[10px] font-black border border-emerald-200 px-2.5 py-1 rounded-md bg-emerald-50 uppercase tracking-wider shadow-sm transition-all">Reinstate</button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Milestone Payment Draws schedule Matrix */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 text-left space-y-4 shadow-sm">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Milestone Progress Contract Draw schedule</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {invoice.payment_phases?.map((phase, idx) => {
              const phaseVal = computedTotal * (phase.percentage / 100);
              return (
                <div key={idx} className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex justify-between items-center shadow-inner">
                  <div className="text-left space-y-0.5">
                    <p className="text-xs font-bold text-slate-800 tracking-wide">{phase.name}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Allocation portion: {phase.percentage}%</p>
                  </div>
                  <span className="font-mono text-sm font-bold text-slate-900">${phaseVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Deposit Remittance routing panel channels */}
        {!isLocked && (
          <div className="border border-slate-200 bg-white rounded-xl p-6 sm:p-8 text-left space-y-4 shadow-sm">
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Deposit Information to start your project</h3>
              <p className="text-xs text-slate-500 mt-1">Select a gateway configuration pathway to dispatch your mobilization upfront draw of <span className="font-mono font-bold text-slate-900">${depositAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button type="button" onClick={() => setPaymentMethod("stripe")} className={`p-4 border rounded-xl flex text-left items-center justify-between transition-all duration-200 ${paymentMethod === 'stripe' ? 'border-blue-600 bg-blue-50/20 ring-2 ring-blue-500/10' : 'border-slate-200 hover:bg-slate-50'}`}>
                <div className="space-y-0.5 text-left">
                  <p className="text-xs font-bold text-slate-900">Credit / Debit Card / ACH Bank Transfer</p>
                  <p className="text-[10px] text-slate-500">Secure digital account balance transaction infrastructure</p>
                </div>
                <span className="text-lg shrink-0">💳</span>
              </button>
              <button type="button" onClick={() => setPaymentMethod("check")} className={`p-4 border rounded-xl flex text-left items-center justify-between transition-all duration-200 ${paymentMethod === 'check' ? 'border-slate-900 bg-slate-50 ring-2 ring-slate-900/5' : 'border-slate-200 hover:bg-slate-50'}`}>
                <div className="space-y-0.5 text-left">
                  <p className="text-xs font-bold text-slate-900">Physical Check</p>
                  <p className="text-[10px] text-slate-500">Remit standard banking check drafts directly on-site</p>
                </div>
                <span className="text-lg shrink-0">📝</span>
              </button>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-500 text-left leading-relaxed shadow-inner">
              {paymentMethod === 'stripe' ? "🔒 Stripe Processing Ready. Secure account data validations will lock execution details straight to sub-ledgers upon signature signoff." : <div>💵 Please make checking check draft payable exactly to: <span className="underline font-bold text-slate-950">WDO Custom</span>. Skyler Camacho will coordinate picking up receipts on site arrival.</div>}
            </div>
          </div>
        )}

        {/* Legal Text Accordion */}
        <div className="border border-slate-200 bg-white rounded-xl overflow-hidden shadow-sm text-left">
          <button type="button" onClick={() => setShowTerms(!showTerms)} className="w-full bg-slate-50 p-4 font-bold text-xs uppercase tracking-wider flex justify-between items-center text-slate-500 hover:text-slate-900 transition-all outline-none"  >
            <span>⚖️ Review Binding Terms & Conditions (Omaha Construction Law Standard)</span>
            <span className="text-[10px] text-slate-400 font-mono">{showTerms ? "Hide ▲" : "View ▼"}</span>
          </button>
          
          {showTerms && (
            <div className="p-6 text-xs text-slate-600 space-y-4 max-h-72 overflow-y-scroll leading-relaxed font-sans border-t border-slate-100 bg-white">
              <p className="font-bold text-slate-800">Section 1. Agreement Framework & Omaha Jurisdictional Compliance</p>
              <p>This agreement is configured specifically under the building framework of the City of Omaha, Douglas County, Nebraska. All modifications, materials, structural deviations, and framing updates shall be performed in accordance with the International Residential Code (IRC) as amended by local Omaha ordinances.</p>
              
              <p className="font-bold text-slate-800">Section 2. Dynamic Financial Alterations & Omission Provisions</p>
              <p>The Homeowner has executed selective omissions resulting in a final bound project consideration total of <span className="font-bold text-slate-900">${computedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> under the selected finish specification tier profile matrix. A mobilization deposit of <span className="font-bold text-slate-900">${depositAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> is required strictly prior to staging.</p>
              
              <p className="font-bold text-slate-800">Section 3. Delays, Change Orders, & Subsurface Conditions</p>
              <p>Any subsurface concrete anomaly, hidden framing rot, non-compliant utility layouts bypassed by historical builders, or structural variations discovered inside the jobsite located at <span className="font-bold text-slate-900">{invoice.job_address}</span> will require an independent written Change Order form.</p>
            </div>
          )}
        </div>

        {/* Signature Box Section */}
        <div className="pt-4 border-t border-slate-200">
          {isLocked ? (
            <div className="bg-slate-900 text-white rounded-xl p-6 text-center shadow-md relative overflow-hidden">
              <p className="text-emerald-400 font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2">✓ Contract Legally Executed & Bound</p>
              <p className="text-xs text-slate-400 mt-2 font-medium">Validated via secure digital signature mapping verification token by client: <span className="font-serif italic font-black text-white text-sm underline">{invoice.signature_name}</span></p>
              <p className="text-[10px] text-slate-500 font-mono mt-1.5 uppercase tracking-wide">System Logging Validation: {new Date(invoice.signed_at || "").toLocaleString()}</p>
            </div>
          ) : (
            <form onSubmit={handleApprove} className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-4 shadow-sm">
              <div className="text-left space-y-1">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Dynamic Client Signature Authorization Panel</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">By typing your legal name below, you execute this digital sign-off. This will immediately freeze your chosen component options, lock project values, generate milestone draws, and assign construction target schedules.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <input 
                  type="text" 
                  required 
                  placeholder="Type legal name to execute agreement..." 
                  value={typedSignature} 
                  onChange={(e) => setTypedSignature(e.target.value)} 
                  className="flex-1 px-4 py-3 rounded-xl outline-none text-xs text-slate-900 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-slate-900 font-bold transition-all placeholder:text-slate-400" 
                />
                <button type="submit" disabled={isSubmitting || activeIndices.length === 0} className="bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold text-xs px-8 py-3 rounded-xl tracking-widest uppercase transition-all shadow-sm shrink-0">
                  {isSubmitting ? "Locking Bounds..." : "Execute & Approve Contract"}
                </button>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}