"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function HomeownerPortal() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [tier, setTier] = useState<"mid" | "high">("mid");
  const [activeIndices, setActiveIndices] = useState<number[]>([]);
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false); // Default hidden if approved
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
  const computedTotal = isLocked ? invoice.amount : masterItems.reduce((sum: number, item: any, idx: number) => activeIndices.includes(idx) ? sum + (tier === "mid" ? item.mid_cost : item.high_cost) : sum, 0);
  const depositAmount = computedTotal * ((invoice?.deposit_percentage || 20) / 100);

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

  if (loading) return <div className="p-12 text-center font-sans text-slate-500">Connecting to project vault...</div>;
  if (!invoice) return <div className="p-12 text-center text-red-500">Proposal data layout not found.</div>;

  const clientLastName = invoice.homeowner_name ? invoice.homeowner_name.trim().split(" ").pop() : "Client";
  const currentPhaseName = invoice.payment_phases?.[invoice.current_phase_index || 0]?.name || "Mobilization Staging";

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 font-sans text-slate-900">
      <div className="max-w-4xl mx-auto bg-white shadow-2xl rounded-xl overflow-hidden border border-slate-200">
        
        {/* Banner */}
        <div className="bg-slate-900 text-white p-8 flex justify-between items-center">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight uppercase">{clientLastName} Residence Project</h1>
            <p className="text-xs text-slate-400 mt-1">Reference Workspace ID: {invoice.id}</p>
          </div>
          <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase ${isLocked ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>{invoice.status}</span>
        </div>

        {/* Onboarding Banner */}
        {isLocked && (
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6 border-b text-left">
            <h2 className="text-base font-bold flex items-center gap-2">🎉 Framework Confirmed. Project is Live!</h2>
            <p className="text-xs text-emerald-100 mt-1 max-w-3xl leading-relaxed">Skyler is delighted to get started! Use the design worksheet board below to complete your pre-vetted material choices as your build timeline progresses.</p>
          </div>
        )}

        <div className="p-8 space-y-8">
          
          {/* Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 border-b border-slate-100 pb-6 text-left">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contractor</h3>
              <p className="mt-1 font-extrabold text-slate-900 text-base">WDO Custom</p>
              <p className="text-xs text-slate-500 font-mono">Reg: LIC-1901422</p>
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

          {/* ACTIVE MANAGEMENT PORTAL COMPONENT FOR HOMEOWNER */}
          {isLocked && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
              <div className="sm:col-span-1 border border-blue-200 bg-blue-50/10 rounded-lg p-4 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase">Active Phase Target</h4>
                  <p className="text-sm font-bold text-slate-800 mt-1 leading-snug">{currentPhaseName}</p>
                </div>
                <p className="text-[10px] text-slate-400 mt-4 font-mono">Index Level: {invoice.current_phase_index || 0}</p>
              </div>

              {/* Homeowner Choice Worksheet Board Grid */}
              <div className="sm:col-span-2 border border-slate-200 rounded-lg p-5 bg-white space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">🎨 Project Materials Selection Board</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Click your preferred option below. All items are pre-vetted by Skyler to align perfectly with your contract structure.</p>
                </div>
                
                <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
                  {invoice.homeowner_options?.map((group: any, gIdx: number) => {
                    const chosen = invoice.homeowner_selections?.[group.category];
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
                  {(!invoice.homeowner_options || invoice.homeowner_options.length === 0) && (
                    <p className="text-xs text-slate-400 italic text-center py-4">Skyler is preparing your option sheets. Material logs will expand here shortly.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* DENSE CONTRACT DATA: MINIMIZED TO AN ACCORDION BOX IF APPROVED */}
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
                      <span className="font-mono font-bold text-slate-800 shrink-0">${(isLocked ? item.cost : (tier === 'mid' ? item.mid_cost : item.high_cost)).toLocaleString()}</span>
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
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Deposit Details</h3>
                <p className="text-xs text-slate-500 mt-0.5">Select a payment option for your deposit of <span className="font-bold text-slate-900">${depositAmount.toLocaleString(undefined,{minimumFractionDigits:2})}</span>.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setPaymentMethod("stripe")} className={`p-3 border rounded text-xs font-bold transition ${paymentMethod === 'stripe' ? 'border-blue-600 bg-blue-50/10' : ''}`}>Card / ACH</button>
                <button type="button" onClick={() => setPaymentMethod("check")} className={`p-3 border rounded text-xs font-bold transition ${paymentMethod === 'check' ? 'border-slate-900 bg-slate-50' : ''}`}>Physical Check</button>
              </div>
              <div className="p-3 bg-slate-50 rounded text-xs text-left text-slate-600">
                {paymentMethod === 'stripe' ? "💳 Secure card infrastructure pipeline ready." : `💵 Issue check payable exactly to: WDO Custom. Skyler will register entry picking on-site.`}
              </div>
            </div>
          )}

          {/* Terms Box & Approval Workflow */}
          <div className="pt-4 border-t">
            {isLocked ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5 text-center text-xs font-medium">
                <p className="text-emerald-900 font-bold">✓ Agreement Officially Signed & Bound</p>
                <p className="text-slate-600 mt-1">Validated by client name: <span className="font-serif italic font-extrabold text-slate-900 underline">{invoice.signature_name}</span></p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">Timestamp: {new Date(invoice.signed_at).toLocaleString()}</p>
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