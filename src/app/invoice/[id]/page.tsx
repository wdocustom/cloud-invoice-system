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
    if (!typedSignature.trim()) return alert("Please sign with your name.");
    setIsSubmitting(true);
    const timestamp = new Date().toISOString();
    
    const finalizedItems = masterItems.filter((_: any, idx: number) => activeIndices.includes(idx)).map((item: any) => ({
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
    <div className="min-h-screen bg-slate-900 flex items-center justify-center font-sans text-slate-400">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Establishing Secure Sync...</p>
      </div>
    </div>
  );

  if (!invoice) return <div className="min-h-screen bg-slate-950 flex items-center justify-center font-sans text-red-400 font-bold">Proposal Link Corrupted or Removed.</div>;

  const clientLastName = invoice.homeowner_name ? invoice.homeowner_name.trim().split(" ").pop() : "Client";
  const projectHeaderTitle = `${clientLastName} Residence Project`;
  const activePhaseIndex = invoice.current_phase_index || 0;
  
  const standardMilestones = [
    { title: "Proposal", subtitle: "Contract Locked" },
    { title: "Deposit", subtitle: "Project Mobilized" },
    { title: "Rough-In", subtitle: "Framing & Utilities" },
    { title: "Finishes", subtitle: "Drywall & Paint" },
    { title: "Hand-off", subtitle: "Final Walkthrough" }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-blue-500/30 selection:text-white pb-24 text-left">
      
      {/* Top Ambient Light Flare */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[350px] bg-gradient-to-b from-blue-500/10 via-teal-500/5 to-transparent pointer-events-none blur-3xl z-0" />

      <div className="max-w-4xl mx-auto px-4 pt-12 relative z-10 space-y-8">
        
        {/* Dynamic Navigation Banner */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
              {projectHeaderTitle}
            </h1>
            <p className="text-[10px] font-mono text-slate-500 tracking-wider uppercase">Portal Reference Keys: {invoice.id.slice(0,18)}...</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
              isLocked ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}>
              • {invoice.status}
            </span>
          </div>
        </div>

        {/* Post-Approval Celebration Header Panel */}
        {isLocked && (
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/20 rounded-2xl p-6 relative overflow-hidden shadow-xl shadow-emerald-950/20">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
            <h2 className="text-base font-black text-emerald-400 flex items-center gap-2 tracking-wide uppercase">
              🎉 Congratulations! Your Project Framework is Approved & Locked.
            </h2>
            <p className="text-xs text-slate-400 mt-2 max-w-3xl leading-relaxed font-medium">
              Skyler is absolutely delighted to get started on your remodeling project! He will be in touch with you shortly to work through your specific material selections, coordinate your target start date logistics, and provide guidance on how to prepare your home for your upcoming project.
            </p>
          </div>
        )}

        {/* Master Finishes Tier Matrix Selector */}
        {!isLocked && (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-200 uppercase tracking-wide">Finish Options System Matrix</p>
              <p className="text-[11px] text-slate-500">Toggle alternative specification grades to view live architectural cost impacts.</p>
            </div>
            <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex w-full sm:w-auto shadow-inner">
              <button type="button" onClick={() => setTier("mid")} className={`flex-1 sm:flex-initial px-5 py-2 text-xs font-extrabold rounded-lg tracking-wide uppercase transition-all ${tier === 'mid' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>
                Standard Mid-Tier
              </button>
              <button type="button" onClick={() => setTier("high")} className={`flex-1 sm:flex-initial px-5 py-2 text-xs font-extrabold rounded-lg tracking-wide uppercase transition-all flex items-center justify-center gap-2 ${tier === 'high' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-blue-500 hover:bg-blue-500/5'}`}>
                💎 High-Tier Luxury Upgrade
              </button>
            </div>
          </div>
        )}

        {/* Global Financial Metrics Core Card Deck */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/50 border border-slate-800/80 p-6 rounded-2xl space-y-4">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Project Contractor</p>
              <h4 className="text-lg font-black text-slate-200 mt-1 uppercase">WDO Custom</h4>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Skyler Camacho</p>
            </div>
            <p className="text-[10px] font-mono text-slate-500 bg-slate-950 px-2.5 py-1 rounded border border-slate-800 inline-block">LIC-1901422</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800/80 p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Jobsite Location</p>
              <h4 className="text-sm font-bold text-slate-300 mt-2 leading-relaxed">{invoice.job_address}</h4>
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800/80 p-6 rounded-2xl flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none text-slate-500" />
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Valuation ({isLocked ? 'Bound' : (tier === 'mid' ? 'Mid Spec' : 'Luxury Spec')})
              </p>
              <h4 className="text-3xl font-black font-mono text-white tracking-tight mt-1">
                ${computedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h4>
            </div>
            <p className="text-[10px] text-slate-400 mt-4">
              Required Upfront Deposit: <span className="font-mono font-bold text-white">${depositAmount.toLocaleString(undefined,{minimumFractionDigits:2})}</span> ({invoice.deposit_percentage}%)
            </p>
          </div>
        </div>

        {/* PIZZA-STYLE PRODUCTION TRACKER PIPELINE */}
        {isLocked && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
            <div className="text-left border-b border-slate-800 pb-4 flex justify-between items-center">
              <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Dynamic Construction Progress Ribbon</h3>
                <p className="text-sm font-bold text-emerald-400 mt-1">Current Milestone Draw Target: {invoice.payment_phases?.[invoice.current_phase_index || 0]?.name || "Mobilization Staging"}</p>
              </div>
              <span className="text-xs bg-slate-950 px-3 py-1 rounded-md text-slate-500 font-mono">Index Level {activePhaseIndex}</span>
            </div>

            {/* Horizontal Line Ribbon Visualizer Container */}
            <div className="relative flex items-center justify-between w-full pt-4 pb-2 overflow-x-auto sm:overflow-x-visible scrollbar-none">
              
              {/* Core Connected Tracking Line Element */}
              <div className="absolute left-4 right-4 top-[30px] h-1 bg-slate-950 z-0 rounded-full">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 via-blue-500 to-teal-400 transition-all duration-700 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                  style={{ width: `${(activePhaseIndex / (standardMilestones.length - 1)) * 100}%` }}
                />
              </div>

              {standardMilestones.map((step, idx) => {
                const isCompleted = idx < activePhaseIndex;
                const isActive = idx === activePhaseIndex;

                return (
                  <div key={idx} className="flex flex-col items-center relative z-10 text-center shrink-0 w-20 sm:w-24">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-lg border-2 transition-all duration-500 ${
                      isCompleted ? 'bg-emerald-500 border-emerald-400 text-white shadow-emerald-500/20' :
                      isActive ? 'bg-blue-600 border-blue-400 text-white scale-110 ring-4 ring-blue-500/20 shadow-blue-500/30' :
                      'bg-slate-950 border-slate-800 text-slate-600'
                    }`}>
                      {isCompleted ? "✓" : idx + 1}
                    </div>
                    <p className={`text-[10px] font-black mt-3 transition-colors ${isActive ? 'text-blue-400' : isCompleted ? 'text-emerald-400' : 'text-slate-500'} uppercase tracking-wide`}>
                      {step.title}
                    </p>
                    <p className="text-[8px] text-slate-500 font-medium scale-90 w-24 hidden sm:block truncate mt-0.5">
                      {step.subtitle}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Logistics Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="group relative border border-slate-800 bg-slate-900/30 hover:border-blue-500/30 hover:bg-blue-500/5 rounded-2xl p-5 flex justify-between items-center transition-all duration-300 cursor-help">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                Target Start Date <span className="text-[8px] tracking-normal bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded uppercase font-bold font-sans">ⓘ Details</span>
              </p>
              <p className="text-sm font-bold text-slate-200 mt-1">
                {invoice.estimated_start_date ? new Date(invoice.estimated_start_date + 'T00:00:00').toLocaleDateString(undefined, { dateStyle: 'long' }) : "Awaiting Schedule Clearance"}
              </p>
            </div>
            <span className="text-xl opacity-40 group-hover:opacity-100 transition-opacity">📅</span>

            {/* Hover Tooltip Popup Element */}
            <div className="pointer-events-none absolute left-1/2 -top-16 -translate-x-1/2 w-72 bg-slate-950 border border-slate-800 text-white text-[11px] rounded-xl p-3 opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-2xl z-30 text-center leading-relaxed">
              💡 Please coordinate details with your manager directly if you would like to request modifications to this targeted start date timeline.
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-950" />
            </div>
          </div>
          <div className="border border-slate-800 bg-slate-900/30 rounded-2xl p-5 flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Project Construction Length</p>
              <p className="text-sm font-bold text-slate-200 mt-1">{invoice.project_length || "TBD Upon Permitting Signoff"}</p>
            </div>
            <span className="text-xl opacity-40">⏳</span>
          </div>
        </div>

        {/* Homeowner Design Choices Worksheet Board Grid */}
        {isLocked && (
          <div className="border border-slate-800 bg-slate-900/40 rounded-2xl p-6 sm:p-8 text-left space-y-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-blue-500 via-teal-500 to-transparent pointer-events-none" />
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest">🎨 Project Materials Selection Board</h3>
              <p className="text-xs text-slate-500 mt-1">Select your preferred options below. All design items are pre-vetted by Skyler to align perfectly with your budget configuration limits.</p>
            </div>
            
            <div className="space-y-4 max-h-80 overflow-y-auto pr-1 divide-y divide-slate-800/60">
              {invoice.homeowner_options?.map((group: any, gIdx: number) => {
                const chosen = invoice.homeowner_selections?.[group.category];
                return (
                  <div key={gIdx} className="space-y-3 pt-4 first:pt-0 border-slate-800/60">
                    <p className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Choose {group.category}:
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
                                ? 'bg-blue-600 border-transparent text-white ring-4 ring-blue-500/10' 
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
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
                <div className="p-8 text-center text-xs text-slate-500 italic bg-slate-950/40 border border-slate-800/50 rounded-xl">
                  Skyler is preparing your option matrix profile arrays. Your material choices board will expand here shortly.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Accordion Contract Paperwork */}
        <div className="border border-slate-800 bg-slate-900/40 rounded-2xl overflow-hidden shadow-lg">
          <button 
            type="button" 
            onClick={() => setShowInvoiceDetails(!showInvoiceDetails)} 
            className="w-full bg-slate-900/60 p-5 font-black text-xs uppercase tracking-widest flex justify-between items-center text-slate-400 hover:text-white hover:bg-slate-900/90 border-b border-slate-800/50 transition-all outline-none"
          >
            <span>📋 {isLocked ? "View Enclosed Contract Paperwork Sheets" : "Review Planned Operations Specifications Grid"}</span>
            <span className="text-[10px] bg-slate-950 px-2.5 py-1 rounded border border-slate-800 tracking-normal font-mono text-slate-500">
              {showInvoiceDetails ? "Hide ▲" : "Expand Scope ▼"}
            </span>
          </button>
          
          {(!isLocked || showInvoiceDetails) && (
            <div className="divide-y divide-slate-800/60 bg-slate-950 animate-fadeIn text-left">
              {!isLocked && (
                <div className="bg-slate-900/30 px-6 py-4 flex items-center justify-between gap-4 border-b border-slate-800">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Scope Variance Level Selector</p>
                  <div className="bg-slate-950 border border-slate-800 p-0.5 rounded-xl flex shadow-inner">
                    <button type="button" onClick={() => setTier("mid")} className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${tier === 'mid' ? 'bg-slate-800 text-white':'text-slate-500 hover:text-slate-300'}`}>Standard Mid</button>
                    <button type="button" onClick={() => setTier("high")} className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${tier === 'high' ? 'bg-blue-600 text-white':'text-blue-500 hover:bg-blue-500/10'}`}>💎 Luxury High</button>
                  </div>
                </div>
              )}
              {masterItems.map((item: any, idx: number) => {
                const isActive = activeIndices.includes(idx);
                if (isLocked && !isActive) return null;
                return (
                  <div key={idx} className={`p-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-all ${!isActive ? 'bg-slate-900/10 opacity-30':''}`}>
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-200 text-sm tracking-wide">{isLocked ? item.title : (tier === 'mid' ? item.title : item.high_title)}</h4>
                      <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-2xl">{isLocked ? item.description : (tier === 'mid' ? item.mid_description : item.high_description)}</p>
                    </div>
                    <div className="text-right flex sm:flex-col justify-between sm:justify-center items-center sm:items-end gap-3 shrink-0 pt-3 sm:pt-0 border-t sm:border-transparent border-slate-900">
                      <span className="font-mono font-bold text-white text-sm">${(isLocked ? item.cost : (tier === 'mid' ? item.mid_cost : item.high_cost)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      {!isLocked && (
                        isActive ? (
                          <button type="button" onClick={() => handleRemoveIndex(idx)} className="text-red-400 hover:text-red-300 text-[10px] font-bold border border-red-950/40 px-2.5 py-1 rounded-md bg-red-950/20 uppercase tracking-wider hover:border-red-900 transition-all">Omit Trade</button>
                        ) : (
                          <button type="button" onClick={() => handleReinstateIndex(idx)} className="text-emerald-400 hover:text-emerald-300 text-[10px] font-bold border border-emerald-950/40 px-2.5 py-1 rounded-md bg-emerald-950/20 uppercase tracking-wider hover:border-emerald-900 transition-all">Reinstate</button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Milestone Draws Allocation Blueprint */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Milestone Contract Draw Percentages Matrix</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {invoice.payment_phases?.map((phase, idx) => {
              const phaseVal = computedTotal * (phase.percentage / 100);
              return (
                <div key={idx} className="bg-slate-950 border border-slate-800/80 p-4 rounded-xl flex justify-between items-center shadow-sm">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-200 tracking-wide">{phase.name}</p>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Share Portion: {phase.percentage}%</p>
                  </div>
                  <span className="font-mono text-sm font-bold text-emerald-400">${phaseVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Deposit Controls: Hidden if Approved */}
        {!isLocked && (
          <div className="border border-slate-800 bg-slate-900/40 rounded-2xl p-6 sm:p-8 space-y-4">
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Deposit Remittance Channels</h3>
              <p className="text-xs text-slate-500 mt-1">Select a gateway preference to route your commitment mobilization draw of <span className="font-mono font-bold text-white">${depositAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button type="button" onClick={() => setPaymentMethod("stripe")} className={`p-4 border rounded-xl flex items-center justify-between transition-all duration-200 ${paymentMethod === 'stripe' ? 'border-blue-500 bg-blue-500/5 ring-4 ring-blue-500/10' : 'border-slate-800 bg-slate-950/40 hover:bg-slate-900/30'}`}>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-200">Card / ACH Secure Wire</p>
                  <p className="text-[9px] text-slate-500">Instant digital account clearance routing framework</p>
                </div>
                <span className="text-lg shrink-0">💳</span>
              </button>
              <button type="button" onClick={() => setPaymentMethod("check")} className={`p-4 border rounded-xl flex items-center justify-between transition-all duration-200 ${paymentMethod === 'check' ? 'border-slate-200 bg-slate-800/20 ring-4 ring-slate-200/10' : 'border-slate-800 bg-slate-950/40 hover:bg-slate-900/30'}`}>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-200">Traditional Bank Check</p>
                  <p className="text-[9px] text-slate-500">Hand-deliver check tracking parameters on layout arrival</p>
                </div>
                <span className="text-lg shrink-0">📝</span>
              </button>
            </div>
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-slate-400 leading-relaxed">
              {paymentMethod === 'stripe' ? "🔒 Secure infrastructure engine loaded. Processing pipeline triggers are wired straight to confirmation sub-ledgers upon execution signature signoff." : <div>💵 Please make check draft payable exactly to: <span className="underline font-bold text-white">WDO Custom</span>. Skyler Camacho will clear receipt entries on-site upon tool staging deployment layout.</div>}
            </div>
          </div>
        )}

        {/* Legal Accordion Box */}
        <div className="border border-slate-800 bg-slate-900/40 rounded-2xl overflow-hidden shadow-lg">
          <button type="button" onClick={() => setShowTerms(!showTerms)} className="w-full bg-slate-900/60 p-4 font-black text-xs uppercase tracking-widest flex justify-between items-center text-slate-400 hover:text-white transition-all outline-none"  >
            <span>⚖️ Review Binding Terms & Conditions (Omaha Construction Law Standard)</span>
            <span className="text-[10px] text-slate-500 font-mono">{showTerms ? "Hide ▲" : "View ▼"}</span>
          </button>
          
          {showTerms && (
            <div className="p-6 text-xs text-slate-400 space-y-4 max-h-72 overflow-y-scroll leading-relaxed font-sans border-t border-slate-800 bg-slate-950">
              <p className="font-bold text-slate-300">Section 1. Agreement Framework & Omaha Jurisdictional Compliance</p>
              <p>This agreement is configured specifically under the building framework of the City of Omaha, Douglas County, Nebraska. All modifications, materials, structural deviations, and framing updates shall be performed in accordance with the International Residential Code (IRC) as amended by local Omaha ordinances.</p>
              
              <p className="font-bold text-slate-300">Section 2. Dynamic Financial Alterations & Omission Provisions</p>
              <p>The Homeowner has executed selective omissions resulting in a final bound project consideration total of <span className="font-bold text-slate-200">${computedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> under the selected finish specification tier profile matrix. A mobilization deposit of <span className="font-bold text-slate-200">${depositAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> is required strictly prior to staging.</p>
              
              <p className="font-bold text-slate-300">Section 3. Delays, Change Orders, & Subsurface Conditions</p>
              <p>Any subsurface concrete anomaly, hidden framing rot, non-compliant utility layouts bypassed by historical builders, or structural variations discovered inside the jobsite located at <span className="font-bold text-slate-200">{invoice.job_address}</span> will require an independent written Change Order form.</p>
            </div>
          )}
        </div>

        {/* Approval Signoff Panel Footer */}
        <div className="pt-4 border-t border-slate-900">
          {isLocked ? (
            <div className="bg-slate-900/80 border border-emerald-500/20 rounded-2xl p-6 text-center shadow-lg relative overflow-hidden">
              <p className="text-emerald-400 font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2">✓ Contract Legally Executed & Sealed</p>
              <p className="text-xs text-slate-400 mt-2 font-medium">Validated via secure digital signature mapping by client: <span className="font-serif italic font-black text-white text-sm underline">{invoice.signature_name}</span></p>
              <p className="text-[9px] text-slate-500 font-mono mt-1.5 uppercase">Atomic System verification token timestamp: {new Date(invoice.signed_at || "").toLocaleString()}</p>
            </div>
          ) : (
            <form onSubmit={handleApprove} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xl">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Dynamic Client Signature Authorization Panel</h3>
                <p className="text-xs text-slate-400 leading-relaxed font-medium">By typing your legal name below, you execute this agreement. This seals the customized trade scope configurations, locks in final project valuations, maps milestone phase targets, and activates your operational schedule pipeline.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <input 
                  type="text" 
                  required 
                  placeholder="Type legal name to execute agreement..." 
                  value={typedSignature} 
                  onChange={(e) => setTypedSignature(e.target.value)} 
                  className="flex-1 px-4 py-3 rounded-xl outline-none text-xs text-white bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-blue-500 font-bold transition-all placeholder:text-slate-600" 
                />
                <button type="submit" disabled={isSubmitting || activeIndices.length === 0} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-black text-xs px-8 py-3 rounded-xl tracking-widest uppercase transition-all shadow-lg shadow-emerald-950/40 shrink-0">
                  {isSubmitting ? "Locking Bounds..." : "Lock & Execute Proposal"}
                </button>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}