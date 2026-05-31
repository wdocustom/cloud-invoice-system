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

  const handleSelectMaterialChoice = async (category: string, value: string) => {
    if (!invoice) return;
    const currentSelections = (invoice as any).homeowner_selections || {};
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

  if (loading) return <div className="p-12 text-center font-sans text-slate-500">Connecting to project vault...</div>;
  if (!invoice) return <div className="p-12 text-center text-red-500">Proposal data layout not found.</div>;

  const clientLastName = invoice.homeowner_name ? invoice.homeowner_name.trim().split(" ").pop() : "Client";
  const projectHeaderTitle = `${clientLastName} Residence Project`;
  
  // Standard Production Milestone Configuration Definitions
  const activePhaseIndex = invoice.current_phase_index || 0;
  const standardMilestones = [
    { title: "Proposal Signed", subtitle: "Contract Locked" },
    { title: "Deposit Cleared", subtitle: "Project Mobilized" },
    { title: "Rough-In Complete", subtitle: "Framing & MEP Specs" },
    { title: "Drywall & Finish", subtitle: "Surfaces Paint Ready" },
    { title: "Final Signoff", subtitle: "Walkthrough Closeout" }
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 font-sans text-slate-900">
      <div className="max-w-4xl mx-auto bg-white shadow-2xl rounded-xl overflow-hidden border border-slate-200">
        
        {/* Header Banner */}
        <div className="bg-slate-900 text-white p-8 flex justify-between items-center">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight uppercase">{projectHeaderTitle}</h1>
            <p className="text-xs text-slate-400 mt-1">Reference Workspace ID: {invoice.id}</p>
          </div>
          <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase ${isLocked ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>{invoice.status}</span>
        </div>

        {/* Onboarding Banner */}
        {isLocked && (
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6 border-b text-left">
            <h2 className="text-base font-bold flex items-center gap-2">🎉 Framework Confirmed. Project is Live!</h2>
            <p className="text-xs text-emerald-100 mt-1 max-w-3xl leading-relaxed">Skyler is delighted to get started! Use your custom dashboard milestone tracks and material selection worksheets below to track the physical progress of your home.</p>
          </div>
        )}

        <div className="p-8 space-y-8">
          
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 border-b border-slate-100 pb-6 text-left">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Project Contractor</h3>
              <p className="mt-1 font-extrabold text-slate-900 text-base">WDO Custom</p>
              <p className="text-sm font-medium text-slate-700">Skyler Camacho</p>
              <p className="text-xs text-slate-500 mt-0.5 font-mono">Reg: LIC-1901422</p>
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Jobsite Location</h3>
              <p className="mt-1 font-bold text-slate-800 text-sm">{invoice.job_address}</p>
            </div>
            <div className="sm:text-right flex flex-col justify-end sm:items-end">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Project Valuation</h3>
              <p className="mt-1 text-2xl font-extrabold text-slate-900">${computedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          {/* NEW: PIZZA-STYLE PRODUCTION TRACKER PIPELINE */}
          {isLocked && (
            <div className="p-6 bg-slate-900 text-white border rounded-xl shadow-inner space-y-6">
              <div className="text-left border-b border-slate-800 pb-3 flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Real-time Project Timeline Tracking</h3>
                  <p className="text-sm font-bold text-emerald-400 mt-0.5">Current Phase: {invoice.payment_phases?.[activePhaseIndex]?.name || "Mobilization Staging"}</p>
                </div>
                <span className="text-xl animate-pulse">🚧</span>
              </div>

              {/* Progress Pipeline Visualization Node Block */}
              <div className="relative flex items-center justify-between w-full px-2">
                
                {/* Connector Line Element */}
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-slate-800 z-0">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                    style={{ width: `${(activePhaseIndex / (standardMilestones.length - 1)) * 100}%` }}
                  />
                </div>

                {/* Milestone Node Bullets */}
                {standardMilestones.map((step, idx) => {
                  const isCompleted = idx < activePhaseIndex;
                  const isActive = idx === activePhaseIndex;

                  return (
                    <div key={idx} className="flex flex-col items-center relative z-10 text-center w-16">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shadow-md border-2 transition-all duration-300 ${
                        isCompleted ? 'bg-emerald-500 border-emerald-400 text-white' :
                        isActive ? 'bg-blue-600 border-blue-400 text-white scale-110 ring-4 ring-blue-500/20' :
                        'bg-slate-800 border-slate-700 text-slate-500'
                      }`}>
                        {isCompleted ? "✓" : idx + 1}
                      </div>
                      <p className={`text-[10px] font-bold mt-2 truncate w-20 tracking-tight ${isActive ? 'text-blue-400' : isCompleted ? 'text-emerald-400' : 'text-slate-500'}`}>
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

          {/* Timeline Deck with Tooltip Hover Notification */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="group relative border border-slate-200 bg-slate-50/50 hover:bg-blue-50/20 hover:border-blue-300 rounded-lg p-4 flex justify-between items-center transition cursor-help">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  Start Date <span className="text-[10px] text-blue-500 lowercase bg-blue-100/60 px-1.5 py-0.5 rounded font-normal font-sans">ⓘ hover note</span>
                </p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">
                  {invoice.estimated_start_date ? new Date(invoice.estimated_start_date + 'T00:00:00').toLocaleDateString(undefined, { dateStyle: 'long' }) : "Pending Assignment"}
                </p>
              </div>
              <span className="text-xl">📅</span>

              <div className="pointer-events-none absolute left-1/2 -top-14 -translate-x-1/2 w-72 bg-slate-950 text-white text-xs rounded-md p-2.5 opacity-0 group-hover:opacity-100 transition duration-200 shadow-xl z-20 text-center leading-normal">
                💡 Please coordinate directly with your contractor if you would like to adjust or modify this targeted start date timeline.
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-950" />
              </div>
            </div>
            <div className="border border-slate-200 bg-slate-50/50 rounded-lg p-4 flex justify-between items-center">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Project Length</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">{invoice.project_length || "TBD"}</p>
              </div>
              <span className="text-xl">⏳</span>
            </div>
          </div>

          {/* Material Choices Worksheet Grid */}
          {isLocked && (
            <div className="border border-slate-200 rounded-lg p-5 bg-white text-left space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">🎨 Project Materials Selection Board</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Click your preferred option below. All items are pre-vetted by Skyler to align perfectly with your contract structure.</p>
              </div>
              
              <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
                {(invoice as any).homeowner_options?.map((group: any, gIdx: number) => {
                  const chosen = (invoice as any).homeowner_selections?.[group.category];
                  return (
                    <div key={gIdx} className="space-y-2 border-b pb-3 last:border-0 last:pb-0">
                      <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">🔧 Choose {group.category}:</p>
                      <div className="flex flex-wrap gap-2">
                        {group.choices.map((choice: string, cIdx: number) => {
                          const isChosen = chosen === choice;
                          return (
                            <button
                              type="button"
                              key={cIdx}
                              onClick={() => handleSelectMaterialChoice(group.category, choice)}
                              className={`px-3 py-1.5 rounded text-xs font-medium transition shadow-sm border ${
                                isChosen 
                                  ? 'bg-blue-600 border-transparent text-white font-bold' 
                                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
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
                {(!(invoice as any).homeowner_options || (invoice as any).homeowner_options.length === 0) && (
                  <p className="text-xs text-slate-400 italic text-center py-4">Skyler is preparing your option sheets. Material logs will expand here shortly.</p>
                )}
              </div>
            </div>
          )}

          {/* DENSE CONTRACT DATA: MINIMIZED TO AN ACCORDION BOX */}
          <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm">
            <button 
              type="button" 
              onClick={() => setShowInvoiceDetails(!showInvoiceDetails)} 
              className="w-full bg-slate-100 p-4 font-bold text-xs uppercase tracking-wider flex justify-between text-slate-700 hover:bg-slate-200/50 transition"
            >
              <span>📋 {isLocked ? "View Closed Contract Paperwork Sheets" : "Review Planned Operations Specifications Grid"}</span>
              <span>{showInvoiceDetails ? "▲ Collapse" : "▼ Expand Specifications"}</span>
            </button>
            
            {(!isLocked || showInvoiceDetails) && (
              <div className="divide-y border-t bg-white animate-fadeIn">
                {!isLocked && (
                  <div className="bg-slate-50 p-4 flex items-center justify-between gap-4 border-b">
                    <p className="text-xs font-medium text-slate-500 text-left">Toggle specification finish variants:</p>
                    <div className="bg-white border rounded p-0.5 flex">
                      <button type="button" onClick={() => setTier("mid")} className={`px-3 py-1 text-xs font-bold rounded ${tier === 'mid' ? 'bg-slate-900 text-white':''}`}>Standard Mid</button>
                      <button type="button" onClick={() => setTier("high")} className={`px-3 py-1 text-xs font-bold rounded ${tier === 'high' ? 'bg-blue-600 text-white':''}`}>💎 Luxury Upgrade</button>
                    </div>
                  </div>
                )}
                {masterItems.map((item: any, idx: number) => {
                  const isActive = activeIndices.includes(idx);
                  if (isLocked && !isActive) return null;
                  return (
                    <div key={idx} className={`p-4 flex justify-between items-center gap-4 text-xs ${!isActive ? 'bg-slate-50 opacity-40':''}`}>
                      <div className="text-left max-w-2xl">
                        <h4 className="font-bold text-slate-900">{isLocked ? item.title : (tier === 'mid' ? item.title : item.high_title)}</h4>
                        <p className="text-slate-500 mt-0.5 leading-relaxed">{isLocked ? item.description : (tier === 'mid' ? item.mid_description : item.high_description)}</p>
                      </div>
                      <span className="font-mono font-bold text-slate-800 shrink-0">${(isLocked ? item.cost : (tier === 'mid' ? item.mid_cost : item.high_cost)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Deposit Controls: Hidden if Approved */}
          {!isLocked && (
            <div className="border border-slate-200 rounded-lg p-5 bg-white space-y-4">
              <div className="text-left">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Deposit Information to start your project</h3>
                <p className="text-xs text-slate-500 mt-0.5">Select a payment preference to route your mobilization commitment balance of <span className="font-bold text-slate-900">${depositAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setPaymentMethod("stripe")} className={`p-3 border rounded text-xs font-bold transition ${paymentMethod === 'stripe' ? 'border-blue-600 bg-blue-50/10 ring-2 ring-blue-500/20' : 'border-slate-200'}`}>Credit / Debit Card / ACH Bank Transfer</button>
                <button type="button" onClick={() => setPaymentMethod("check")} className={`p-3 border rounded text-xs font-bold transition ${paymentMethod === 'check' ? 'border-slate-900 bg-slate-50 ring-2 ring-slate-900/10' : 'border-slate-200'}`}>Physical Check</button>
              </div>
              <div className="p-3 bg-slate-50 rounded text-xs text-left text-slate-600">
                {paymentMethod === 'stripe' ? "💳 Ready for processing. Your contract checkout pipeline will route verification triggers directly to your account file once finalized." : `💵 Please make check payable exactly to: WDO Custom. Skyler will coordinate check handoff logs and register clearing confirmations inside your client dashboard history upon arrival.`}
              </div>
            </div>
          )}

          {/* Legal Accordion Box */}
          <div className="border border-slate-200 rounded-lg bg-white overflow-hidden text-left">
            <button type="button" onClick={() => setShowTerms(!showTerms)} className="w-full bg-slate-100 p-4 font-bold text-xs uppercase tracking-wider flex justify-between text-slate-700 hover:bg-slate-200/60 transition">
              <span>⚖️ Review Binding Terms & Conditions (Omaha Construction Law Standard)</span>
              <span>{showTerms ? "▲ Hide" : "▼ Expand Terms"}</span>
            </button>
            
            {showTerms && (
              <div className="p-6 text-xs text-slate-600 space-y-4 max-h-80 overflow-y-scroll leading-relaxed font-sans border-t">
                <p className="font-bold text-slate-800">Section 1. Agreement Framework & Omaha Jurisdictional Compliance</p>
                <p>This agreement is configured specifically under the building framework of the City of Omaha, Douglas County, Nebraska. All modifications, materials, structural deviations, and framing updates shall be performed in accordance with the International Residential Code (IRC) as amended by local Omaha ordinances.</p>
                
                <p className="font-bold text-slate-800">Section 2. Dynamic Financial Alterations & Omission Provisions</p>
                <p>The Homeowner has executed selective omissions resulting in a final bound project consideration total of <span className="font-bold text-slate-900">${computedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> under the selected finish specification tier profile matrix. A mobilization deposit of <span className="font-bold text-slate-900">${depositAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> is required strictly prior to staging.</p>
                
                <p className="font-bold text-slate-800">Section 3. Delays, Change Orders, & Subsurface Conditions</p>
                <p>Any subsurface concrete anomaly, hidden framing rot, non-compliant utility layouts bypassed by historical builders, or structural variations discovered inside the jobsite located at <span className="font-bold text-slate-900">{invoice.job_address}</span> will require an independent written Change Order form.</p>
              </div>
            )}
          </div>

          {/* Approval Signoff Panel Footer */}
          <div className="pt-4 border-t">
            {isLocked ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5 text-center text-xs font-medium">
                <p className="text-emerald-900 font-bold">✓ Agreement Officially Signed & Bound</p>
                <p className="text-slate-600 mt-1">Validated by client name: <span className="font-serif italic font-extrabold text-slate-900 underline">{invoice.signature_name}</span></p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">Timestamp: {new Date(invoice.signed_at || "").toLocaleString()}</p>
              </div>
            ) : (
              <form onSubmit={handleApprove} className="bg-slate-900 text-white rounded-lg p-5 space-y-4">
                <input type="text" required placeholder="Type full legal name to bind contract" value={typedSignature} onChange={(e) => setTypedSignature(e.target.value)} className="w-full px-4 py-2 rounded text-sm text-slate-900 font-medium" />
                <button type="submit" disabled={isSubmitting || activeIndices.length === 0} className="w-full bg-emerald-600 hover:bg-emerald-500 py-2.5 rounded text-xs font-bold tracking-wider uppercase transition">Execute & Lock Contract</button>
              </form>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}