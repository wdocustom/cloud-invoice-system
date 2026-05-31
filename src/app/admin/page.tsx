"use client";
import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function AdminDashboard() {
  const [homeownerName, setHomeownerName] = useState("");
  const [homeownerEmail, setHomeownerEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeownerName || !homeownerEmail || !amount || !description) {
      return alert("Please fill out all fields.");
    }

    setIsSubmitting(true);
    setGeneratedLink("");

    // Insert the new invoice row into Supabase
    const { data, error } = await supabase
      .from("invoices")
      .insert([
        {
          homeowner_name: homeownerName,
          homeowner_email: homeownerEmail,
          amount: parseFloat(amount),
          description: description,
          status: "pending",
        },
      ])
      .select()
      .single();

    setIsSubmitting(false);

    if (error) {
      console.error(error);
      alert("Error creating invoice: " + error.message);
    } else if (data) {
      // Construct the secure sharing link using the current window origin
      const uniqueLink = `${window.location.origin}/invoice/${data.id}`;
      setGeneratedLink(uniqueLink);
      
      // Clear the form fields
      setHomeownerName("");
      setHomeownerEmail("");
      setAmount("");
      setDescription("");
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    alert("Invoice link copied to clipboard!");
  };

  return (
    <div className="min-h-screen bg-slate-100 py-12 px-4 sm:px-6 lg:px-8 font-sans text-gray-900">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Main Creation Card */}
        <div className="bg-white shadow-xl rounded-lg overflow-hidden border border-gray-200 p-8">
          <div className="border-b border-gray-100 pb-4 mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Create New Invoice & Contract</h1>
            <p className="text-sm text-gray-500 mt-1">Fill out the details below to generate a secure, signature-ready contract link for your client.</p>
          </div>

          <form onSubmit={handleCreateInvoice} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Homeowner Name</label>
                <input
                  type="text"
                  value={homeownerName}
                  onChange={(e) => setHomeownerName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Homeowner Email</label>
                <input
                  type="email"
                  value={homeownerEmail}
                  onChange={(e) => setHomeownerEmail(e.target.value)}
                  placeholder="johndoe@example.com"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition text-sm bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Total Project Amount ($)</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition text-sm bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Scope of Work / Terms</label>
              <textarea
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detail the materials, timeline, and exact scope of work here..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition text-sm bg-white whitespace-pre-line"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-slate-950 hover:bg-slate-800 text-white font-semibold py-3 px-4 rounded-md transition duration-150 disabled:opacity-50 tracking-wide text-sm shadow-md"
            >
              {isSubmitting ? "Generating Contract..." : "Generate Secure Invoice Link"}
            </button>
          </form>
        </div>

        {/* Success Output Card */}
        {generatedLink && (
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg p-6 animate-fadeIn shadow-md">
            <h3 className="text-sm font-bold text-emerald-900 flex items-center gap-2">
              🎉 Invoice Successfully Created!
            </h3>
            <p className="text-xs text-emerald-700 mt-1">Copy the private link below and text or email it directly to the homeowner.</p>
            
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                readOnly
                value={generatedLink}
                className="flex-1 px-3 py-2 bg-white border border-emerald-300 rounded-md text-xs text-gray-700 outline-none select-all font-mono"
              />
              <button
                onClick={copyToClipboard}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-md text-xs transition whitespace-nowrap"
              >
                Copy Link
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}