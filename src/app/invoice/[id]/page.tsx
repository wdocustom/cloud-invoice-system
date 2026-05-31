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
}

export default function HomeownerPortal() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [tier, setTier] = useState<"mid" | "high">("mid");
  const [activeIndices, setActiveIndices] = useState<number[]>([]);
  const [showTerms, setShowTerms] = useState(false);
  const [typedSignature, setTypedSignature] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "check">("stripe");

  useEffect(() => {
    async function fetchInvoice() {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", id)
        .single();

      if (data) {
        setInvoice(data);
        if (data.items) {
          setActiveIndices(data.items.map((_: any, idx: number) => idx));
        }
      }
      setLoading(false);
    }
    if (id) fetchInvoice();
  }, [id]);

  const isLocked = invoice?.status === "approved";
  const masterItems = invoice?.items || [];

  const computedTotal = masterItems.reduce((sum, item, idx) => {
    if (!activeIndices.includes(idx)) return sum;
    return sum + (tier === "mid" ? item.mid_cost : item.high_cost);
  }, 0);

  const depositAmount = computedTotal * ((invoice?.deposit_percentage || 20) / 100);

  const handleRemoveIndex = (idx: number) => {
    if (isLocked) return;
    setActiveIndices(activeIndices.filter((i) => i !== idx));
  };

  const handleReinstateIndex = (idx: number) => {
    if (isLocked) return;
    setActiveIndices([...activeIndices, idx].sort((a, b) => a - b));
  };

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedSignature.trim()) return alert("Please type your name to approve.");
    setIsSubmitting(true);

    const timestamp = new Date().toISOString();
    
    const finalizedItems = masterItems
      .filter((_, idx) => activeIndices.includes(idx))
      .map(item => ({
        title: tier === "mid" ? item.title : (item.high_title || `${item.title} (Luxury Upgrade)`),
        description: tier === "mid" ? item.mid_description : item.high_description,
        cost: tier === "mid" ? item.mid_cost : item.high_cost
      }));

    const { error } = await supabase
      .from("invoices")
      .update({
        status: "approved",
        amount: computedTotal,
        items: finalizedItems, 
        signature_name: typedSignature,
        signed_at: timestamp,
      })
      .eq("id", id);

    if (error) {
      alert("Error approving contract. Please retry.");
    } else {
      setInvoice((prev) => prev ? { 
        ...prev, 
        status: "approved", 
        amount: computedTotal, 
        signature_name: typedSignature,
        signed_at: timestamp 
      } : null);

      // Auto-scroll instantly back up to the top of the viewport to display onboarding banner
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 100);
    }
    setIsSubmitting(false);
  };

  if (loading) return <div className="text-center p-12 font-sans">Connecting to client portal...</div>;
  if (!invoice) return <div className="text-center p-12 font-sans text-red-500">Proposal file not found.</div>;

  const clientLastName = invoice.homeowner_name ? invoice.homeowner_name.trim().split(" ").pop() : "Client";
  const projectHeaderTitle = `${clientLastName} Residence Project`;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans text-slate-900">
      <div className="max-w-4xl mx-auto bg-white shadow-2xl rounded-xl overflow-hidden border border-slate-200">
        
        {/* Header Banner */}
        <div className="bg-slate-900 text-white p-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight uppercase">{projectHeaderTitle}</h1>
            <p className="text-xs text-slate-400 mt-1 font-mono">Reference Key: {invoice.id}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
              isLocked ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}>
              {invoice.status}
            </div>
          </div>
        </div>

        {/* Post-Approval Celebration Header Panel */}
        {isLocked && (
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6 border-b text-center sm:text-left shadow-inner">
            <h2 className="text-lg font-bold flex items-center justify-center sm:justify-start gap-2">
              🎉 Congratulations! Your Project Framework is Approved & Locked.
            </h2>
            <p className="text-xs text-emerald-100 mt-1 max-w-3xl leading-relaxed">
              Skyler is absolutely delighted to get started on your remodeling project! He will be in touch with you shortly to work through your specific material selections, coordinate your target start date logistics, and provide guidance on how to prepare your home for your upcoming project.
            </p>
          </div>
        )}

        {/* Finish Tier Control Hub Selector */}
        {!isLocked && (
          <div className="bg-slate-100 border-b border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs font-medium text-slate-600">Toggle preferred finish specifications to view live budget variations:</p>
            <div className="bg-white border rounded-lg p-1 flex shadow-sm shrink-0">
              <button type="button" onClick={() => setTier("mid")} className={`px-4 py-1.5 text-xs font-bold rounded-md transition ${tier === 'mid' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}>
                Standard Mid-Tier
              </button>
              <button type="button" onClick={() => setTier("high")} className={`px-4 py-1.5 text-xs font-bold rounded-md transition flex items-center gap-1.5 ${tier === 'high' ? 'bg-blue-600 text-white' : 'text-blue-600 hover:bg-blue-50'}`}>
                💎 High-Tier Luxury Upgrade
              </button>
            </div>
          </div>
        )}

        <div className="p-8 space-y-8">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 border-b border-slate-100 pb-6">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Project Contractor</h3>
              <p className="mt-1 font-extrabold text-slate-900 text-base">WDO Custom</p>
              <p className="text-sm font-medium text-slate-700">Skyler Camacho</p>
              <p className="text-xs text-slate-500 mt-0.5 font-mono">Reg: LIC-1901422</p>
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Prepared For</h3>
              <p className="mt-1 font-bold text-slate-800 text-base">{invoice.homeowner_name}</p>
              <p className="text-sm text-slate-500">{invoice.homeowner_email}</p>
              <p className="text-xs text-slate-700 font-medium mt-2 bg-slate-100 px-2.5 py-1 rounded inline-block">📍 Jobsite: {invoice.job_address}</p>
            </div>
            <div className="sm:text-right flex flex-col justify-end sm:items-end">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Project Value ({tier === 'mid' ? 'Standard' : 'Luxury'})
              </h3>
              <p className="mt-1 text-3xl font-extrabold text-slate-900">${computedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              <p className="text-xs text-slate-500 mt-1">Mobilization Draw: ${depositAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({invoice.deposit_percentage}%)</p>
            </div>
          </div>

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

              {/* Hover Tooltip Popup Element */}
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

          {/* Active Work Items Spec Sheet */}
          <div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">Approved Operations Blueprint</h2>
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white divide-y">
              {masterItems.map((item, idx) => {
                const isActive = activeIndices.includes(idx);
                if (isLocked && !isActive) return null;

                const currentTitle = tier === "mid" ? item.title : (item.high_title || `${item.title} (Luxury Upgrade)`);
                const currentDesc = tier === "mid" ? item.mid_description : item.high_description;
                const currentCost = tier === "mid" ? item.mid_cost : item.high_cost;

                return (
                  <div key={idx} className={`p-4 flex justify-between items-start gap-4 transition ${
                    !isActive ? 'bg-slate-50/70 text-slate-400' : 'hover:bg-slate-50/30'
                  }`}>
                    <div className={`space-y-1 text-left ${!isActive ? 'line-through decoration-red-500 decoration-2 opacity-50' : ''}`}>
                      <h4 className={`font-bold text-sm ${!isActive ? 'text-slate-600' : 'text-slate-900'}`}>{currentTitle}</h4>
                      <p className={`text-xs ${!isActive ? 'text-slate-400' : 'text-slate-600'} leading-relaxed max-w-2xl`}>{currentDesc}</p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2 shrink-0">
                      <span className={`font-mono font-bold text-sm ${!isActive ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                        ${currentCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      {!isLocked && (
                        isActive ? (
                          <button type="button" onClick={() => handleRemoveIndex(idx)} className="text-red-500 hover:text-red-700 text-[11px] font-medium border border-red-100 hover:border-red-200 px-2 py-0.5 rounded bg-red-50/30 transition">
                            Omit Item
                          </button>
                        ) : (
                          <button type="button" onClick={() => handleReinstateIndex(idx)} className="text-emerald-600 hover:text-emerald-700 text-[11px] font-bold border border-emerald-200 hover:border-emerald-300 px-2 py-0.5 rounded bg-emerald-50/40 transition">
                            Reinstate
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment Schedule */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Milestone Draw Milestones</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {invoice.payment_phases?.map((phase, idx) => {
                const phaseVal = computedTotal * (phase.percentage / 100);
                return (
                  <div key={idx} className="bg-white p-3.5 border rounded-md shadow-sm flex justify-between items-center">
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-800">{phase.name}</p>
                      <p className="text-[10px] text-slate-400 uppercase mt-0.5">Allocation: {phase.percentage}%</p>
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-900">${phaseVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Deposit Payment Guidance Hub */}
          <div className="border border-slate-200 rounded-lg p-6 bg-white space-y-4">
            <div className="text-left">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Deposit Information to start your project</h3>
              <p className="text-xs text-slate-500 mt-0.5">Select a payment preference to route your mobilization commitment balance of <span className="font-bold text-slate-900">${depositAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button 
                type="button" 
                onClick={() => setPaymentMethod("stripe")}
                className={`p-4 border rounded-lg text-left flex items-center justify-between transition shadow-sm ${paymentMethod === 'stripe' ? 'border-blue-600 bg-blue-50/10 ring-2 ring-blue-500/20' : 'border-slate-200 hover:bg-slate-50'}`}
              >
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-900">Credit / Debit Card / ACH Bank Transfer</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Secure credit routing or immediate digital checking check-out</p>
                </div>
                <span className="text-lg">💳</span>
              </button>

              <button 
                type="button" 
                onClick={() => setPaymentMethod("check")}
                className={`p-4 border rounded-lg text-left flex items-center justify-between transition shadow-sm ${paymentMethod === 'check' ? 'border-slate-900 bg-slate-50 ring-2 ring-slate-900/10' : 'border-slate-200 hover:bg-slate-50'}`}
              >
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-900">Physical Check</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Hand-deliver or process a traditional corporate paper check</p>
                </div>
                <span className="text-lg">📝</span>
              </button>
            </div>

            {/* Cleaned Dynamic Payment Details Display Card */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-md text-xs leading-relaxed text-left animate-fadeIn">
              {paymentMethod === "stripe" ? (
                <div className="text-slate-600 flex items-center justify-between gap-4">
                  <p>💳 Ready for processing. Your contract checkout pipeline will route verification triggers directly to your account file once finalized.</p>
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold uppercase tracking-wider shrink-0">Processor Ready</span>
                </div>
              ) : (
                <div className="text-slate-700 space-y-1">
                  <p className="font-bold text-slate-900">💵 Physical Check Remittance Instructions:</p>
                  <p>Please make check payable exactly to: <span className="underline font-bold text-slate-950">WDO Custom</span></p>
                  <p className="text-slate-500 text-[11px] mt-1">Skyler will coordinate check handoff logs and register clearing confirmations inside your client dashboard history upon arrival.</p>
                </div>
              )}
            </div>
          </div>

          {/* Legal Accordion */}
          <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
            <button type="button" onClick={() => setShowTerms(!showTerms)} className="w-full bg-slate-100 p-4 font-bold text-xs uppercase tracking-wider flex justify-between text-slate-700 hover:bg-slate-200/60 transition">
              <span>⚖️ Review Binding Terms & Conditions (Omaha Construction Law Standard)</span>
              <span>{showTerms ? "▲ Hide" : "▼ Expand Terms"}</span>
            </button>
            
            {showTerms && (
              <div className="p-6 text-xs text-slate-600 space-y-4 max-h-80 overflow-y-scroll text-left leading-relaxed font-sans border-t">
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
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 text-center shadow-sm">
                <p className="text-emerald-900 font-bold text-base">✓ Legally Bound Contract Executed & Sealed</p>
                <p className="text-xs text-slate-700 mt-1.5">
                  Digitally validated by homeowner: <span className="font-serif italic font-extrabold text-base text-slate-900 underline">{invoice.signature_name}</span>
                </p>
                <p className="text-[10px] text-slate-400 mt-1 font-mono">Atomic System Verification Timestamp: {invoice.signed_at ? new Date(invoice.signed_at).toLocaleString() : "Sync Failure"}</p>
              </div>
            ) : (
              <form onSubmit={handleApprove} className="bg-slate-900 text-white rounded-lg p-6 space-y-4 shadow-inner">
                <div>
                  <h3 className="text-sm font-bold tracking-wide text-left">Dynamic Client Authorization Panel</h3>
                  <p className="text-xs text-slate-400 text-left mt-0.5">By entering your name below, you execute this digital sign-off. This will immediately freeze your current tier selections, lock in your final custom balance, generate the milestone draws, and map precise contract tracking details.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Type name to execute contract validation"
                    value={typedSignature}
                    onChange={(e) => setTypedSignature(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-md outline-none text-sm text-slate-900 bg-white font-medium shadow-sm"
                  />
                  <button type="submit" disabled={isSubmitting || activeIndices.length === 0} className="bg-emerald-600 hover:bg-emerald-500 font-bold px-8 py-2.5 rounded-md text-xs tracking-wider uppercase transition shadow-md disabled:opacity-50">
                    {isSubmitting ? "Locking Bounds..." : "Execute & Approve Contract"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}