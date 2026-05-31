"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

interface Invoice {
  id: string;
  homeowner_name: string;
  homeowner_email: string;
  amount: number;
  description: string;
  status: string;
  signature_name?: string;
}

export default function InvoicePage() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [typedSignature, setTypedSignature] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchInvoice() {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", id)
        .single();

      if (data) setInvoice(data);
      setLoading(false);
    }
    if (id) fetchInvoice();
  }, [id]);

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedSignature.trim()) return alert("Please type your name to sign.");

    setIsSubmitting(true);
    const { error } = await supabase
      .from("invoices")
      .update({
        status: "approved",
        signature_name: typedSignature,
        signed_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      alert("Something went wrong. Please try again.");
    } else {
      setInvoice((prev) => prev ? { ...prev, status: "approved", signature_name: typedSignature } : null);
    }
    setIsSubmitting(false);
  };

  if (loading) return <div className="text-center p-10 font-sans">Loading invoice...</div>;
  if (!invoice) return <div className="text-center p-10 font-sans text-red-500">Invoice not found.</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto bg-white shadow-xl rounded-lg overflow-hidden border border-gray-200">
        
        {/* Header banner */}
        <div className="bg-slate-900 text-white p-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">INVOICE & CONTRACT</h1>
            <p className="text-sm text-slate-400 mt-1">ID: {invoice.id.slice(0, 8)}...</p>
          </div>
          <div className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
            invoice.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
          }`}>
            {invoice.status}
          </div>
        </div>

        {/* Invoice Body */}
        <div className="p-8 space-y-8">
          <div className="grid grid-cols-2 gap-4 border-b border-gray-100 pb-6">
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Prepared For</h3>
              <p className="mt-1 font-semibold text-gray-800">{invoice.homeowner_name}</p>
              <p className="text-sm text-gray-500">{invoice.homeowner_email}</p>
            </div>
            <div className="text-right">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Amount</h3>
              <p className="mt-1 text-3xl font-bold text-slate-900">${invoice.amount.toFixed(2)}</p>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Scope of Work</h3>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 text-gray-700 whitespace-pre-line leading-relaxed">
              {invoice.description}
            </div>
          </div>

          {/* Sign/Approved Section */}
          <div className="pt-6 border-t border-gray-100">
            {invoice.status === "approved" ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 text-center">
                <p className="text-emerald-800 font-medium">✓ Contract Approved & Signed</p>
                <p className="text-sm text-emerald-600 mt-1">
                  Signed digitally by: <span className="font-serif italic font-bold text-base text-gray-800">{invoice.signature_name}</span>
                </p>
              </div>
            ) : (
              <form onSubmit={handleApprove} className="bg-slate-50 border border-slate-200 rounded-lg p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-800">Sign & Approve Contract</h3>
                  <p className="text-xs text-gray-500 mt-0.5">By typing your name below, you agree to the scope of work detailed above.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="Type your full name to sign"
                    value={typedSignature}
                    onChange={(e) => setTypedSignature(e.target.value)}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition text-gray-900"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-slate-950 hover:bg-slate-800 text-white font-medium px-6 py-2.5 rounded-md transition duration-150 disabled:opacity-50 tracking-wide text-sm"
                  >
                    {isSubmitting ? "Processing..." : "Sign & Approve"}
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