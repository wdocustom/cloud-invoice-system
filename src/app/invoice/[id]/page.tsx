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
  status: string;
  signature_name?: string;
  signed_at?: string;
}

export default function HomeownerPortal() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Client-side interactive array tracking items they want to keep
  const [activeItems, setActiveItems] = useState<LineItem[]>([]);
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
        // Default all line items to active when first loaded
        setActiveItems(data.items || []);
      }
      setLoading(false);
    }
    if (id) fetchInvoice();
  }, [id]);

  // Compute total based strictly on items currently remaining in their checklist
  const computedTotal = activeItems.reduce((sum, item) => sum + item.cost, 0);
  const depositAmount = computedTotal * ((invoice?.deposit_percentage || 10) / 100);

  const removeItem = (idx: number) => {
    if (invoice?.status === "approved") return; // Block modification if signed
    setActiveItems(activeItems.filter((_, i) => i !== idx));
  };

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedSignature.trim()) return alert("Please sign with your full name to bind this agreement.");
    setIsSubmitting(true);

    const { error } = await supabase
      .from("invoices")
      .update({
        status: "approved",
        amount: computedTotal,
        items: activeItems, // Lock in exactly what they chose to keep
        signature_name: typedSignature,
        signed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      alert("Error committing approval. Please retry.");
    } else {
      setInvoice((prev) => prev ? { ...prev, status: "approved", amount: computedTotal, items: activeItems, signature_name: typedSignature } : null);
    }
    setIsSubmitting(false);
  };

  if (loading) return <div className="text-center p-12 font-sans">Loading contract configuration...</div>;
  if (!invoice) return <div className="text-center p-12 font-sans text-red-500">Contract proposal not found.</div>;

  const isLocked = invoice.status === "approved";

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans text-slate-900">
      <div className="max-w-4xl mx-auto bg-white shadow-2xl rounded-xl overflow-hidden border border-slate-200">
        
        {/* Portal Header */}
        <div className="bg-slate-900 text-white p-8 flex justify-between items-center">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">CONSTRUCTION AGREEMENT & PROPOSAL</h1>
            <p className="text-xs text-slate-400 mt-1">Proposal Tracking Reference Key: {invoice.id}</p>
          </div>
          <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
            isLocked ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
          }`}>
            {invoice.status}
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-b border-slate-100 pb-6">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Project Prepared For</h3>
              <p className="mt-1 font-bold text-slate-800 text-base">{invoice.homeowner_name}</p>
              <p className="text-sm text-slate-500">{invoice.homeowner_email}</p>
              <p className="text-sm text-slate-700 font-medium mt-2 bg-slate-100 px-3 py-1.5 rounded inline-block">📍 Jobsite: {invoice.job_address || "Omaha, NE"}</p>
            </div>
            <div className="sm:text-right flex flex-col justify-end sm:items-end">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Project Valuation</h3>
              <p className="mt-1 text-3xl font-extrabold text-slate-900">${computedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              <p className="text-xs text-slate-500 mt-1">Required Deposit: ${depositAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({invoice.deposit_percentage}%)</p>
            </div>
          </div>

          {/* Interactive Line Items */}
          <div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Scope of Structural Work Specifications</h2>
            {!isLocked && <p className="text-xs text-slate-500 mb-3">Review the planned operations below. If you choose to defer or omit a line item, click <span className="text-red-500 font-bold">Remove</span> to instantly update your contract costs.</p>}
            
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white divide-y">
              {(isLocked ? invoice.items : activeItems).map((item, idx) => (
                <div key={idx} className="p-4 flex justify-between items-start gap-4 hover:bg-slate-50/50 transition">
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-900 text-sm">{item.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">{item.description}</p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2 shrink-0">
                    <span className="font-mono font-bold text-slate-800 text-sm">${item.cost.toLocaleString()}</span>
                    {!isLocked && (
                      <button type="button" onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700 text-xs font-medium border border-red-100 hover:border-red-200 px-2 py-0.5 rounded bg-red-50/30 transition">
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dynamic Milestone Payment Schedule */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Milestone Payment Execution Schedule</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {invoice.payment_phases?.map((phase, idx) => {
                const phaseVal = computedTotal * (phase.percentage / 100);
                return (
                  <div key={idx} className="bg-white p-3.5 border rounded-md shadow-sm flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{phase.name}</p>
                      <p className="text-[10px] text-slate-400 uppercase mt-0.5">Phase Share: {phase.percentage}%</p>
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-900">${phaseVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legal Bindings / Accordion */}
          <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
            <button type="button" onClick={() => setShowTerms(!showTerms)} className="w-full bg-slate-100 p-4 font-bold text-xs uppercase tracking-wider flex justify-between text-slate-700 hover:bg-slate-200/60 transition">
              <span>⚖️ Review Binding Terms & Conditions (Omaha Construction Law Standard)</span>
              <span>{showTerms ? "▲ Hide" : "▼ Expand Terms"}</span>
            </button>
            
            {showTerms && (
              <div className="p-6 text-xs text-slate-600 space-y-4 max-h-80 overflow-y-scroll leading-relaxed font-sans border-t">
                <p className="font-bold text-slate-800">Section 1. Agreement Framework & Omaha Jurisdictional Compliance</p>
                <p>This agreement is configured specifically under the building framework of the City of Omaha, Douglas County, Nebraska. All modifications, materials, structural deviations, and framing updates shall be performed in accordance with the International Residential Code (IRC) as amended by local Omaha ordinances. Contract values lock completely upon dynamic client digital execution signature authorization.</p>
                
                <p className="font-bold text-slate-800">Section 2. Dynamic Financial Alterations & Omission Provisions</p>
                <p>The Homeowner has executed selective omissions resulting in a final bound project consideration total of <span className="font-bold text-slate-900">${computedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>. A non-refundable mobilization commitment deposit of <span className="font-bold text-slate-900">${depositAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> is required strictly prior to equipment staging or scheduling assignment.</p>
                
                <p className="font-bold text-slate-800">Section 3. Delays, Change Orders, & Subsurface Conditions</p>
                <p>Any subsurface concrete anomaly, hidden framing rot, non-compliant utility layouts bypassed by historical builders, or structural variations discovered inside the jobsite located at <span className="font-bold text-slate-900">{invoice.job_address || "Omaha, NE"}</span> will require an independent written Change Order form. Contractor is protected against structural delays caused by municipal inspection scheduling logjams within Douglas County.</p>
              </div>
            )}
          </div>

          {/* Footer Approval Form */}
          <div className="pt-4 border-t">
            {isLocked ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 text-center">
                <p className="text-emerald-900 font-bold text-base">✓ Legally Bound Contract Approved & Locked</p>
                <p className="text-xs text-emerald-700 mt-1">
                  Digitally executed via unguessable client secure access key by: <span className="font-serif italic font-extrabold text-base text-slate-900 underline">{invoice.signature_name}</span>
                </p>
                <p className="text-[10px] text-slate-400 mt-1">Timestamp: {new Date(invoice.signed_at || "").toLocaleString()}</p>
              </div>
            ) : (
              <form onSubmit={handleApprove} className="bg-slate-900 text-white rounded-lg p-6 space-y-4 shadow-inner">
                <div>
                  <h3 className="text-sm font-bold tracking-wide">Client Sign-Off Authorization</h3>
                  <p className="text-xs text-slate-400 mt-0.5">By entering your full name below, you verify that you approve the custom-tailored line item list, acknowledge the milestone payment phases, and agree to the legal bounds of the Omaha contract rules outlined above.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Type legal name to instantly execute"
                    value={typedSignature}
                    onChange={(e) => setTypedSignature(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-md outline-none text-sm text-slate-900 bg-white font-medium shadow-sm"
                  />
                  <button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-500 font-bold px-8 py-2.5 rounded-md text-xs tracking-wider uppercase transition shadow-md disabled:opacity-50">
                    {isSubmitting ? "Locking Contract..." : "Execute & Approve Contract"}
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