"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

interface LineItem {
  title: string;
  description: string;
  cost: number;
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
  items: LineItem[];
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
  
  // Track indices of line items currently kept active
  const [activeIndices, setActiveIndices] = useState<number[]>([]);
  const [showTerms, setShowTerms] = useState(false);
  const [typedSignature, setTypedSignature] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchInvoice() {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", id)
        .single();

      if (data) {
        setInvoice(data);
        // Default all line item entries to active on initial load
        if (data.items) {
          setActiveIndices(data.items.map((_: LineItem, idx: number) => idx));
        }
      }
      setLoading(false);
    }
    if (id) fetchInvoice();
  }, [id]);

  const isLocked = invoice?.status === "approved";

  // Separate line item layout configurations dynamically
  const masterItems = invoice?.items || [];
  const activeItems = masterItems.filter((_, idx) => activeIndices.includes(idx));
  const omittedItemsWithIndices = masterItems
  .map((item: LineItem, idx: number) => ({ item, idx }))
  .filter(({ idx }: { idx: number }) => !activeIndices.includes(idx));

  const computedTotal = activeItems.reduce((sum, item) => sum + item.cost, 0);
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
    if (!typedSignature.trim()) return alert("Please type your signature name to bind this arrangement.");
    setIsSubmitting(true);

    const timestamp = new Date().toISOString();

    const { error } = await supabase
      .from("invoices")
      .update({
        status: "approved",
        amount: computedTotal,
        items: activeItems, // Permanently save only active selections
        signature_name: typedSignature,
        signed_at: timestamp,
      })
      .eq("id", id);

    if (error) {
      alert("Error processing proposal signature activation. Please retry.");
    } else {
      setInvoice((prev) => prev ? { 
        ...prev, 
        status: "approved", 
        amount: computedTotal, 
        items: activeItems, 
        signature_name: typedSignature,
        signed_at: timestamp 
      } : null);
    }
    setIsSubmitting(false);
  };

  if (loading) return <div className="text-center p-12 font-sans">Connecting to project portal...</div>;
  if (!invoice) return <div className="text-center p-12 font-sans text-red-500">Proposal file not found.</div>;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans text-slate-900">
      <div className="max-w-4xl mx-auto bg-white shadow-2xl rounded-xl overflow-hidden border border-slate-200">
        
        {/* Banner Section */}
        <div className="bg-slate-900 text-white p-8 flex justify-between items-center">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">CONSTRUCTION PROPOSAL & CONTRACT</h1>
            <p className="text-xs text-slate-400 mt-1 font-mono">Reference Core Token: {invoice.id}</p>
          </div>
          <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
            isLocked ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
          }`}>
            {invoice.status}
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* Metadata Matrix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-b border-slate-100 pb-6">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Project Prepared For</h3>
              <p className="mt-1 font-bold text-slate-800 text-base">{invoice.homeowner_name}</p>
              <p className="text-sm text-slate-500">{invoice.homeowner_email}</p>
              <p className="text-sm text-slate-700 font-medium mt-2 bg-slate-100 px-3 py-1.5 rounded inline-block">📍 Jobsite: {invoice.job_address}</p>
            </div>
            <div className="sm:text-right flex flex-col justify-end sm:items-end">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Project Balance</h3>
              <p className="mt-1 text-3xl font-extrabold text-slate-900">${computedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              <p className="text-xs text-slate-500 mt-1">Mobilization Deposit: ${depositAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({invoice.deposit_percentage}%)</p>
            </div>
          </div>

          {/* Schedule & Metrics Deck */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-slate-200 bg-slate-50/50 rounded-lg p-4 flex justify-between items-center">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Target Start Date</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">
                  {invoice.estimated_start_date ? new Date(invoice.estimated_start_date + 'T00:00:00').toLocaleDateString(undefined, { dateStyle: 'long' }) : "Pending Schedule Assignment"}
                </p>
              </div>
              <span className="text-xl">📅</span>
            </div>
            <div className="border border-slate-200 bg-slate-50/50 rounded-lg p-4 flex justify-between items-center">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estimated Project Duration</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">{invoice.project_length || "TBD Upon Engineering Signoff"}</p>
              </div>
              <span className="text-xl">⏳</span>
            </div>
          </div>

          {/* Active Line Items */}
          <div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">Approved Operations Blueprint</h2>
            
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white divide-y">
              {(isLocked ? masterItems : activeItems).map((item, idx) => {
                // Determine true original index mapping
                const realIdx = isLocked ? idx : activeIndices[idx];
                return (
                  <div key={idx} className="p-4 flex justify-between items-start gap-4 hover:bg-slate-50/30 transition">
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-900 text-sm">{item.title}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">{item.description}</p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2 shrink-0">
                      <span className="font-mono font-bold text-slate-800 text-sm">${item.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      {!isLocked && (
                        <button type="button" onClick={() => handleRemoveIndex(realIdx)} className="text-red-500 hover:text-red-700 text-xs font-medium border border-red-100 hover:border-red-200 px-2 py-0.5 rounded bg-red-50/30 transition">
                          Omit Item
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {activeItems.length === 0 && (
                <div className="p-8 text-center text-sm text-slate-400 font-medium">No items selected. Use the omitted catalog menu below to reinstate components.</div>
              )}
            </div>
          </div>

          {/* Omitted Items Dashboard Section */}
          {!isLocked && omittedItemsWithIndices.length > 0 && (
            <div className="border border-red-200 bg-red-50/10 rounded-lg p-4 space-y-3">
              <h3 className="text-xs font-bold text-red-900 uppercase tracking-wider">Omitted / Deferred Components Queue</h3>
              <p className="text-[11px] text-slate-500">The following scope divisions are omitted from the active cost calculation. Tap Reinstate to re-incorporate them into the contract parameters.</p>
              
              <div className="divide-y border border-red-100 bg-white rounded-md overflow-hidden">
                {omittedItemsWithIndices.map(({ item, idx }) => (
                  <div key={idx} className="p-4 bg-slate-50/80 flex justify-between items-center gap-4 text-slate-400">
                    <div className="line-through decoration-red-500 decoration-2 text-left space-y-0.5 opacity-60">
                      <h4 className="font-bold text-slate-700 text-xs">{item.title}</h4>
                      <p className="text-[11px] text-slate-500 max-w-2xl leading-tight">{item.description}</p>
                    </div>
                    <div className="text-right flex flex-col sm:flex-row items-end sm:items-center gap-3 shrink-0">
                      <span className="font-mono text-xs font-bold line-through decoration-red-400">${item.cost.toLocaleString()}</span>
                      <button type="button" onClick={() => handleReinstateIndex(idx)} className="text-emerald-600 hover:text-emerald-700 text-xs font-bold border border-emerald-200 hover:border-emerald-300 bg-emerald-50/50 px-2.5 py-1 rounded transition">
                        Reinstate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Micro-adjusted Dynamic Schedule Layout */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Dynamically Formulated Payment Phases</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {invoice.payment_phases?.map((phase, idx) => {
                const phaseVal = computedTotal * (phase.percentage / 100);
                return (
                  <div key={idx} className="bg-white p-3.5 border rounded-md shadow-sm flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{phase.name}</p>
                      <p className="text-[10px] text-slate-400 uppercase mt-0.5">Allocation: {phase.percentage}%</p>
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-900">${phaseVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legal Bindings Section */}
          <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
            <button type="button" onClick={() => setShowTerms(!showTerms)} className="w-full bg-slate-100 p-4 font-bold text-xs uppercase tracking-wider flex justify-between text-slate-700 hover:bg-slate-200/60 transition">
              <span>⚖️ Review Binding Terms & Conditions (Omaha Construction Law Standard)</span>
              <span>{showTerms ? "▲ Hide" : "▼ Expand Terms"}</span>
            </button>
            
            {showTerms && (
              <div className="p-6 text-xs text-slate-600 space-y-4 max-h-80 overflow-y-scroll leading-relaxed font-sans border-t">
                <p className="font-bold text-slate-800">Section 1. Agreement Framework & Omaha Jurisdictional Compliance</p>
                <p>This agreement is configured specifically under the building framework of the City of Omaha, Douglas County, Nebraska. All modifications, materials, structural deviations, and framing updates shall be performed in accordance with the International Residential Code (IRC) as amended by local Omaha ordinances.</p>
                
                <p className="font-bold text-slate-800">Section 2. Dynamic Financial Alterations & Omission Provisions</p>
                <p>The Homeowner has executed selective omissions resulting in a final bound project consideration total of <span className="font-bold text-slate-900">${computedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>. A non-refundable mobilization commitment deposit of <span className="font-bold text-slate-900">${depositAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> is required strictly prior to equipment staging or scheduling assignment.</p>
                
                <p className="font-bold text-slate-800">Section 3. Delays, Change Orders, & Subsurface Conditions</p>
                <p>Any subsurface concrete anomaly, hidden framing rot, non-compliant utility layouts bypassed by historical builders, or structural variations discovered inside the jobsite located at <span className="font-bold text-slate-900">{invoice.job_address}</span> will require an independent written Change Order form. Contractor is protected against structural delays caused by municipal inspection scheduling logjams within Douglas County.</p>
              </div>
            )}
          </div>

          {/* Footer Digital Authorization Layout */}
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
                  <h3 className="text-sm font-bold tracking-wide">Dynamic Client Authorization Panel</h3>
                  <p className="text-xs text-slate-400 mt-0.5">By entering your full name below, you execute this digital sign-off. This will immediately finalize the scope list above, lock in your final balanced price, formulate the milestone draws, and map the project timeline details into a bound contract agreement.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Type name to execute atomic signature"
                    value={typedSignature}
                    onChange={(e) => setTypedSignature(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-md outline-none text-sm text-slate-900 bg-white font-medium shadow-sm"
                  />
                  <button type="submit" disabled={isSubmitting || activeItems.length === 0} className="bg-emerald-600 hover:bg-emerald-500 font-bold px-8 py-2.5 rounded-md text-xs tracking-wider uppercase transition shadow-md disabled:opacity-50">
                    {isSubmitting ? "Locking Structural Bounds..." : "Lock & Execute Proposal"}
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