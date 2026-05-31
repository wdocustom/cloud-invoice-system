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
    <div className="min-h-screen bg-stone-50 flex items-center justify-center font-sans text-stone-500">
      <div className="flex flex-col items-center gap-2">
        <div className="w-6 h-6 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-[11px] font-semibold tracking-wider text-stone-400 uppercase">Loading Client Portal...</p>
      </div>
    </div>
  );

  if (!invoice) return <div className="min-h-screen bg-stone-50 flex items-center justify-center font-sans text-stone-700 font-bold">Proposal project data not found.</div>;

  const clientLastName = invoice.homeowner_name ? invoice.homeowner_name.trim().split(" ").pop() : "Client";
  const projectHeaderTitle = `${clientLastName} Residence Project`;
  const activePhaseIndex = invoice.current_phase_index || 0;
  
  const standardMilestones = [
    { title: "Proposal", subtitle: "Contract Locked" },
    { title: "Deposit", subtitle: "Project Initiated" },
    { title: "Rough-In", subtitle: "Framing & Utilities" },
    { title: "Finishes", subtitle: "Drywall & Trim" },
    { title: "Hand-off", subtitle: "Final Walkthrough" }
  ];

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans antialiased pb-24 text-left">
      <div className="max-w-4xl mx-auto px-4 pt-12 space-y-6">
        
        {/* Crisp White Header Banner */}
        <div className="bg-white border border-stone-200/80 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-stone-900 uppercase">
              {projectHeaderTitle}
            </h1>
            <p className="text-[10px] font-mono text-stone-400 tracking-wider uppercase">Project ID: {invoice.id.slice(0,8)}...</p>
          </div>
          <div>
            <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
              isLocked ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              {invoice.status}
            </span>
          </div>
        </div>

        {/* Clean Onboarding/Congratulations Banner */}
        {isLocked && (
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-6 text-left">
            <h2 className="text-sm font-bold text-emerald-800 flex items-center gap-2 uppercase tracking-wide">
              ✓ Framework Approved & Contract Locked
            </h2>
            <p className="text-xs text-stone-600 mt-2 max-w-3xl leading-relaxed">
              Skyler is delighted to get started on your custom project! He will be in touch soon to work through your design selections, coordinate your target schedule variables, and outline how to prepare your home for construction.
            </p>
          </div>
        )}

        {/* Premium Bright Finishes Tier Option Switch */}
        {!isLocked && (
          <div className="bg-white border border-stone-200 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-stone-800 uppercase tracking-wide">Project Specification Grade</p>
              <p className="text-[11px] text-stone-400">Toggle alternative scopes to update material finishes and budgets instantly.</p>
            </div>
            <div className="bg-stone-100 p-1 rounded-xl border border-stone-200/60 flex w-full sm:w-auto">
              <button type="button" onClick={() => setTier("mid")} className={`flex-1 sm:flex-initial px-5 py-2 text-xs font-bold rounded-lg tracking-wide uppercase transition-all ${tier === 'mid' ? 'bg-white text-stone-900 shadow-sm border border-stone-200/40 font-extrabold' : 'text-stone-500 hover:text-stone-800'}`}>
                Standard Mid-Tier
              </button>
              <button type="button" onClick={() => setTier("high")} className={`flex-1 sm:flex-initial px-5 py-2 text-xs font-bold rounded-lg tracking-wide uppercase transition-all flex items-center justify-center gap-2 ${tier === 'high' ? 'bg-stone-900 text-white shadow-sm' : 'text-stone-600 hover:text-stone-900'}`}>
                💎 Luxury High-Tier
              </button>
            </div>
          </div>
        )}

        {/* Minimal Project Details Info Blocks */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-stone-200 p-6 rounded-2xl text-left space-y-2 shadow-sm">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Contractor Details</p>
            <div>
              <h4 className="text-base font-bold text-stone-900 uppercase">WDO Custom</h4>
              <p className="text-xs text-stone-600">Skyler Camacho</p>
            </div>
            <p className="text-[9px] font-mono text-stone-400 bg-stone-100 px-2 py-0.5 rounded border inline-block mt-1">LIC-1901422</p>
          </div>
          <div className="bg-white border border-stone-200 p-6 rounded-2xl text-left flex flex-col justify-between shadow-sm">
            <div>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Jobsite Location</p>
              <h4 className="text-xs font-semibold text-stone-700 mt-2 leading-relaxed">{invoice.job_address}</h4>
            </div>
          </div>
          <div className="bg-white border border-stone-200 p-6 rounded-2xl text-left flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                Project Valuation ({isLocked ? 'Locked Contract' : (tier === 'mid' ? 'Mid Tier' : 'High Tier')})
              </p>
              <h4 className="text-2xl font-black font-mono text-stone-900 mt-1 tracking-tight">
                ${computedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h4>
            </div>
            <p className="text-[10px] text-stone-500 mt-3 border-t pt-2 border-stone-100">
              Upfront Setup Draw: <span className="font-mono font-bold text-stone-900">${depositAmount.toLocaleString(undefined,{minimumFractionDigits:2})}</span> ({invoice.deposit_percentage}%)
            </p>
          </div>
        </div>

        {/* CLEAN MINIMAL PROGRESS WORKFLOW PIPELINE */}
        {isLocked && (
          <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="text-left border-b border-stone-100 pb-4 flex justify-between items-center">
              <div>
                <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">Construction Project Status Timeline</h3>
                <p className="text-sm font-bold text-stone-800 mt-0.5">Current Stage: {invoice.payment_phases?.[invoice.current_phase_index || 0]?.name || "Mobilization Setup"}</p>
              </div>
            </div>

            {/* Horizontal Line ribbon visualizer */}
            <div className="relative flex items-center justify-between w-full pt-4 pb-2 overflow-x-auto sm:overflow-x-visible scrollbar-none">
              
              {/* Connector tracking bar line */}
              <div className="absolute left-4 right-4 top-[30px] h-0.5 bg-stone-200 z-0 rounded-full">
                <div 
                  className="h-full bg-stone-900 transition-all duration-700 rounded-full shadow-sm"
                  style={{ width: `${(activePhaseIndex / (standardMilestones.length - 1)) * 100}%` }}
                />
              </div>

              {standardMilestones.map((step, idx) => {
                const isCompleted = idx < activePhaseIndex;
                const isActive = idx === activePhaseIndex;

                return (
                  <div key={idx} className="flex flex-col items-center relative z-10 text-center shrink-0 w-20 sm:w-24">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-sm border transition-all duration-500 ${
                      isCompleted ? 'bg-stone-900 border-stone-900 text-white' :
                      isActive ? 'bg-white border-stone-900 text-stone-900 font-black scale-110 ring-4 ring-stone-100' :
                      'bg-white border-stone-200 text-stone-400'
                    }`}>
                      {isCompleted ? "✓" : idx + 1}
                    </div>
                    <p className={`text-[10px] font-bold mt-3 uppercase tracking-wide transition-colors ${isActive ? 'text-stone-900 font-extrabold' : isCompleted ? 'text-stone-600' : 'text-stone-400'}`}>
                      {step.title}
                    </p>
                    <p className="text-[8px] text-stone-400 font-medium scale-90 w-24 hidden sm:block truncate mt-0.5">
                      {step.subtitle}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Logistics Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="group relative border border-stone-200 bg-white hover:border-stone-400 rounded-2xl p-5 flex justify-between items-center transition-all duration-200 cursor-help shadow-sm">
            <div className="text-left">
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1">
                Start Date <span className="text-[9px] font-normal tracking-tight text-blue-600 bg-blue-50 px-1 py-0.2 rounded lowercase">ⓘ info</span>
              </p>
              <p className="text-sm font-bold text-stone-800 mt-1">
                {invoice.estimated_start_date ? new Date(invoice.estimated_start_date + 'T00:00:00').toLocaleDateString(undefined, { dateStyle: 'long' }) : "Awaiting Coordination"}
              </p>
            </div>
            <span className="text-xl opacity-30 group-hover:opacity-100 transition-opacity">📅</span>

            {/* Tooltip Hover Box */}
            <div className="pointer-events-none absolute left-1/2 -top-16 -translate-x-1/2 w-72 bg-stone-900 border border-stone-800 text-stone-200 text-[11px] rounded-xl p-3 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-xl z-30 text-center leading-relaxed">
              💡 Please coordinate directly with your manager if you would like to request modifications to this project start date timeline.
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-stone-900" />
            </div>
          </div>
          <div className="border border-stone-200 bg-white rounded-2xl p-5 flex justify-between items-center text-left shadow-sm">
            <div>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Estimated Project Duration</p>
              <p className="text-sm font-bold text-stone-800 mt-1">{invoice.project_length || "TBD Upon Engineering Clearance"}</p>
            </div>
            <span className="text-xl opacity-30">⏳</span>
          </div>
        </div>

        {/* Custom Material Selections Option Deck Workspace */}
        {isLocked && (
          <div className="border border-stone-200 bg-white rounded-2xl p-6 sm:p-8 text-left space-y-5 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">🎨 Project Materials Selection Board</h3>
              <p className="text-xs text-stone-400 mt-1">Select your selections below. All options are pre-vetted by WDO Custom to align with project parameters.</p>
            </div>
            
            <div className="space-y-4 max-h-80 overflow-y-auto pr-1 divide-y divide-stone-100 text-left">
              {invoice.homeowner_options?.map((group: any, gIdx: number) => {
                const chosen = invoice.homeowner_selections?.[group.category];
                return (
                  <div key={gIdx} className="space-y-3 pt-4 first:pt-0 text-left">
                    <p className="text-xs font-bold text-stone-800 uppercase tracking-wide flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-stone-900" /> Material Choice for {group.category}:
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
                                ? 'bg-stone-900 border-transparent text-white shadow-sm' 
                                : 'bg-stone-50 border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-100'
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
                <div className="p-6 text-center text-xs text-stone-400 italic bg-stone-50 border border-stone-200/60 rounded-xl">
                  Material choice profiles are being finalized. Options lists will automatically populate here shortly.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Invoice Itemized Breakdown Accordion Dropdown Component */}
        <div className="border border-stone-200 bg-white rounded-2xl overflow-hidden shadow-sm">
          <button 
            type="button" 
            onClick={() => setShowInvoiceDetails(!showInvoiceDetails)} 
            className="w-full bg-stone-50/80 p-5 font-bold text-xs uppercase tracking-wider flex justify-between items-center text-stone-500 hover:text-stone-900 hover:bg-stone-100 border-b border-stone-200/50 transition-all outline-none"
          >
            <span>📋 {isLocked ? "View Enclosed Contract Scope Breakdowns" : "Review Planned Operations Specifications Grid"}</span>
            <span className="text-[10px] bg-white px-2.5 py-1 rounded border border-stone-200 font-mono text-stone-500 font-bold">
              {showInvoiceDetails ? "Hide Scope ▲" : "View Scope ▼"}
            </span>
          </button>
          
          {(!isLocked || showInvoiceDetails) && (
            <div className="divide-y divide-stone-100 bg-white text-left">
              {!isLocked && (
                <div className="bg-stone-50/50 px-6 py-4 flex items-center justify-between gap-4 border-b border-stone-200">
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Pricing Variance Review Toggle</p>
                  <div className="bg-stone-100 border border-stone-200 p-0.5 rounded-xl flex shadow-inner">
                    <button type="button" onClick={() => setTier("mid")} className={`px-4 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${tier === 'mid' ? 'bg-white text-stone-900 shadow-sm font-extrabold':'text-stone-500 hover:text-stone-800'}`}>Standard Mid</button>
                    <button type="button" onClick={() => setTier("high")} className={`px-4 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${tier === 'high' ? 'bg-stone-900 text-white shadow-sm font-extrabold':'text-stone-500 hover:text-stone-800'}`}>💎 Luxury High</button>
                  </div>
                </div>
              )}
              {masterItems.map((item: any, idx: number) => {
                const isActive = activeIndices.includes(idx);
                if (isLocked && !isActive) return null;
                return (
                  <div key={idx} className={`p-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-all ${!isActive ? 'bg-stone-50/60 opacity-30':''}`}>
                    <div className="text-left space-y-0.5">
                      <h4 className="font-bold text-stone-900 text-sm tracking-wide">{isLocked ? item.title : (tier === 'mid' ? item.title : item.high_title)}</h4>
                      <p className="text-xs text-stone-500 font-medium leading-relaxed max-w-2xl">{isLocked ? item.description : (tier === 'mid' ? item.mid_description : item.high_description)}</p>
                    </div>
                    <div className="text-right flex sm:flex-col justify-between sm:justify-center items-center sm:items-end gap-3 shrink-0 pt-3 sm:pt-0 border-t sm:border-transparent border-stone-100">
                      <span className="font-mono font-bold text-stone-900 text-sm">${(isLocked ? item.cost : (tier === 'mid' ? item.mid_cost : item.high_cost)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      {!isLocked && (
                        isActive ? (
                          <button type="button" onClick={() => handleRemoveIndex(idx)} className="text-red-600 hover:text-red-700 text-[10px] font-bold border border-red-200 px-2.5 py-1 rounded-md bg-red-50 hover:bg-red-100 uppercase tracking-wider transition-all">Omit Component</button>
                        ) : (
                          <button type="button" onClick={() => handleReinstateIndex(idx)} className="text-emerald-700 hover:text-emerald-800 text-[10px] font-bold border border-emerald-200 px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 uppercase tracking-wider transition-all">Reinstate</button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Milestone Payment Draws Table Matrix */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 text-left space-y-4 shadow-sm">
          <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">Project Milestone Payment Draws Draw Schedule</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {invoice.payment_phases?.map((phase, idx) => {
              const phaseVal = computedTotal * (phase.percentage / 100);
              return (
                <div key={idx} className="bg-stone-50 border border-stone-200/80 p-4 rounded-xl flex justify-between items-center shadow-inner">
                  <div className="text-left">
                    <p className="text-xs font-bold text-stone-800 tracking-wide">{phase.name}</p>
                    <p className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">Draw Allocation: {phase.percentage}%</p>
                  </div>
                  <span className="font-mono text-sm font-bold text-stone-900">${phaseVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upfront Deposit Processing Panels */}
        {!isLocked && (
          <div className="border border-stone-200 bg-white rounded-2xl p-6 sm:p-8 text-left space-y-4 shadow-sm">
            <div>
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">Deposit Processing Routing Channels</h3>
              <p className="text-xs text-stone-500 mt-0.5">Select your payment method below for your mobilization draw of <span className="font-mono font-bold text-stone-900">${depositAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button type="button" onClick={() => setPaymentMethod("stripe")} className={`p-4 border rounded-xl flex text-left items-center justify-between transition-all duration-200 ${paymentMethod === 'stripe' ? 'border-stone-900 bg-stone-50 ring-2 ring-stone-900/5' : 'border-stone-200 hover:bg-stone-50'}`}>
                <div className="space-y-0.5 text-left">
                  <p className="text-xs font-bold text-stone-900">Credit / Debit Card / ACH Bank Transfer</p>
                  <p className="text-[9px] text-stone-400">Process instantly using secure, certified credit pipelines</p>
                </div>
                <span className="text-lg shrink-0">💳</span>
              </button>
              <button type="button" onClick={() => setPaymentMethod("check")} className={`p-4 border rounded-xl flex text-left items-center justify-between transition-all duration-200 ${paymentMethod === 'check' ? 'border-stone-900 bg-stone-50 ring-2 ring-stone-900/5' : 'border-stone-200 hover:bg-stone-50'}`}>
                <div className="space-y-0.5 text-left">
                  <p className="text-xs font-bold text-stone-900">Physical Bank Check</p>
                  <p className="text-[9px] text-stone-400">Issue corporate standard paper draft logs at mobilization</p>
                </div>
                <span className="text-lg shrink-0">📝</span>
              </button>
            </div>
            <div className="p-4 bg-stone-50 border border-stone-200 text-left rounded-xl text-xs font-medium text-stone-500 leading-relaxed">
              {paymentMethod === 'stripe' ? "🔒 Gateway channels initialized. Payment checking protocols are structured securely within checkout templates upon signature execution." : <div>💵 Please issue check payments exactly to: <span className="underline font-bold text-stone-950">WDO Custom</span>. Skyler will register entry tracking receipts on-site upon tool staging logistics deployment.</div>}
            </div>
          </div>
        )}

        {/* Legal Text Panel Accordion */}
        <div className="border border-stone-200 bg-white rounded-2xl overflow-hidden shadow-sm text-left">
          <button type="button" onClick={() => setShowTerms(!showTerms)} className="w-full bg-stone-50 p-4 font-bold text-xs uppercase tracking-wider flex justify-between items-center text-stone-500 hover:text-stone-900 transition-all outline-none"  >
            <span>⚖️ Review Binding Terms & Conditions (Omaha Construction Law Standard)</span>
            <span className="text-[10px] text-stone-400 font-mono">{showTerms ? "Hide ▲" : "View ▼"}</span>
          </button>
          
          {showTerms && (
            <div className="p-6 text-xs text-stone-600 space-y-4 max-h-72 overflow-y-scroll leading-relaxed font-sans border-t border-stone-100 bg-white">
              <p className="font-bold text-stone-800">Section 1. Agreement Framework & Omaha Jurisdictional Compliance</p>
              <p>This agreement is configured specifically under the building framework of the City of Omaha, Douglas County, Nebraska. All modifications, materials, structural deviations, and framing updates shall be performed in accordance with the International Residential Code (IRC) as amended by local Omaha ordinances.</p>
              
              <p className="font-bold text-stone-800">Section 2. Dynamic Financial Alterations & Omission Provisions</p>
              <p>The Homeowner has executed selective omissions resulting in a final bound project consideration total of <span className="font-bold text-stone-900">${computedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> under the selected finish specification tier profile matrix. A mobilization deposit of <span className="font-bold text-stone-900">${depositAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> is required strictly prior to staging.</p>
              
              <p className="font-bold text-stone-800">Section 3. Delays, Change Orders, & Subsurface Conditions</p>
              <p>Any subsurface concrete anomaly, hidden framing rot, non-compliant utility layouts bypassed by historical builders, or structural variations discovered inside the jobsite located at <span className="font-bold text-stone-900">{invoice.job_address}</span> will require an independent written Change Order form.</p>
            </div>
          )}
        </div>

        {/* Final Legal Binding Sign-off Section Dashboard Panel */}
        <div className="pt-4 border-t border-stone-200">
          {isLocked ? (
            <div className="bg-stone-900 text-white rounded-2xl p-6 text-center shadow-md relative overflow-hidden">
              <p className="text-emerald-400 font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2">✓ Contract Legally Executed & Bound</p>
              <p className="text-xs text-stone-400 mt-2 font-medium">Validated via client electronic secure timestamp authentication by: <span className="font-serif italic font-black text-white text-base underline">{invoice.signature_name}</span></p>
              <p className="text-[10px] text-stone-500 font-mono mt-1.5 uppercase tracking-wide">System Logging Verification: {new Date(invoice.signed_at || "").toLocaleString()}</p>
            </div>
          ) : (
            <form onSubmit={handleApprove} className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm">
              <div className="text-left space-y-1">
                <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">Dynamic Client Signature Authorization Panel</h3>
                <p className="text-xs text-stone-500 leading-relaxed font-medium">By typing your full legal name below, you execute this digital sign-off. This binds your customized trade omissions, locks in structural project values, outlines milestone payments, and instantiates construction schedules.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <input 
                  type="text" 
                  required 
                  placeholder="Type full legal name to authorize contract..." 
                  value={typedSignature} 
                  onChange={(e) => setTypedSignature(e.target.value)} 
                  className="flex-1 px-4 py-3 rounded-xl outline-none text-xs text-stone-900 bg-stone-50 border border-stone-200 hover:border-stone-300 focus:border-stone-900 font-bold transition-all placeholder:text-stone-400" 
                />
                <button type="submit" disabled={isSubmitting || activeIndices.length === 0} className="bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-white font-bold text-xs px-8 py-3 rounded-xl tracking-widest uppercase transition-all shadow-sm shrink-0">
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