"use client";
import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function AdminDashboard() {
  const [homeownerName, setHomeownerName] = useState("");
  const [homeownerEmail, setHomeownerEmail] = useState("");
  const [address, setAddress] = useState("");
  const [zipcode, setZipcode] = useState("");
  const [depositPercent, setDepositPercent] = useState(20);
  const [startDate, setStartDate] = useState("");
  const [projectLength, setProjectLength] = useState("");

  const [lineItems, setLineItems] = useState<any[]>([]);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim() || !address || !zipcode) {
      return alert("Please fill out Address, Zip Code, and the AI prompt first.");
    }
    setIsGeneratingAI(true);
    try {
      const res = await fetch("/api/generate-scope", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt, address, zipcode }),
      });
      const data = await res.json();
      if (data.items && Array.isArray(data.items)) {
        setLineItems(data.items);
      }
    } catch (err) {
      alert("Error generating line items.");
    }
    setIsGeneratingAI(false);
  };

  const totalMidCost = lineItems.reduce((sum, item) => sum + (Number(item.mid_cost) || 0), 0);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeownerName || !homeownerEmail || lineItems.length === 0) {
      return alert("Please map client details and generate a scope proposal first.");
    }
    setIsSubmitting(true);

    const defaultPhases = [
      { name: "Initial Deposit / Mobilization", percentage: depositPercent },
      { name: "Framing & MEP Rough-In Completion", percentage: Math.round((100 - depositPercent) * 0.4) },
      { name: "Drywall Tape & Level 4 Finish Completion", percentage: Math.round((100 - depositPercent) * 0.4) },
      { name: "Final Punch List Approval & Closeout", percentage: 100 - depositPercent - (Math.round((100 - depositPercent) * 0.4) * 2) }
    ];

    const { data, error } = await supabase
      .from("invoices")
      .insert([
        {
          homeowner_name: homeownerName,
          homeowner_email: homeownerEmail,
          job_address: `${address}, Omaha, NE ${zipcode}`,
          amount: totalMidCost, 
          description: `Multi-tier interactive proposal generated for ${homeownerName}. Specifications managed via items array payload.`, // Fixes the NOT NULL constraint
          items: lineItems, 
          deposit_percentage: depositPercent,
          payment_phases: defaultPhases,
          estimated_start_date: startDate || null,
          project_length: projectLength,
          status: "pending",
        },
      ])
      .select()
      .single();

    setIsSubmitting(false);
    if (error) alert("Error publishing: " + error.message);
    else if (data) setGeneratedLink(`${window.location.origin}/invoice/${data.id}`);
  };

  return (
    <div className="min-h-screen bg-slate-100 py-12 px-4 font-sans text-gray-900">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white shadow-xl rounded-lg border border-gray-200 p-8">
          <h1 className="text-2xl font-bold border-b pb-4 mb-6">Multi-Tier Estimate Creator</h1>

          <form onSubmit={handleCreateInvoice} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input type="text" placeholder="Client Name" required value={homeownerName} onChange={(e) => setHomeownerName(e.target.value)} className="p-2.5 border rounded-md text-sm bg-white" />
              <input type="email" placeholder="Client Email" required value={homeownerEmail} onChange={(e) => setHomeownerEmail(e.target.value)} className="p-2.5 border rounded-md text-sm bg-white" />
              <input type="text" placeholder="Street Address" required value={address} onChange={(e) => setAddress(e.target.value)} className="p-2.5 border rounded-md text-sm bg-white" />
              <input type="text" placeholder="Zip Code" required value={zipcode} onChange={(e) => setZipcode(e.target.value)} className="p-2.5 border rounded-md text-sm bg-white" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t pt-4">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="p-2.5 border rounded-md text-sm bg-white" />
              <input type="text" placeholder="Duration (e.g., 8 weeks)" value={projectLength} onChange={(e) => setProjectLength(e.target.value)} className="p-2.5 border rounded-md text-sm bg-white" />
              <input type="number" placeholder="Deposit %" value={depositPercent} onChange={(e) => setDepositPercent(parseInt(e.target.value) || 20)} className="p-2.5 border rounded-md text-sm bg-white" />
            </div>

            <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-md flex gap-2">
              <input type="text" value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="Describe remodeling goals..." className="flex-1 p-2.5 border rounded-md text-sm bg-white" />
              <button type="button" onClick={handleAiGenerate} disabled={isGeneratingAI} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 rounded-md font-medium transition">
                {isGeneratingAI ? "Estimating Tier Options..." : "Run AI Estimator"}
              </button>
            </div>

            {lineItems.length > 0 && (
              <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b text-xs font-bold text-gray-500 uppercase">
                      <th className="p-3">Remodeling Phase Layout</th>
                      <th className="p-3 text-right">Mid Cost</th>
                      <th className="p-3 text-right">High Upgrade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-sm">
                    {lineItems.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-3">
                          <p className="font-bold">{item.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{item.mid_description.slice(0, 80)}...</p>
                        </td>
                        <td className="p-3 text-right font-mono text-xs text-slate-600">${item.mid_cost.toFixed(2)}</td>
                        <td className="p-3 text-right font-mono text-xs text-blue-600 font-bold">${item.high_cost.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <button type="submit" disabled={isSubmitting} className="w-full bg-slate-950 hover:bg-slate-800 text-white font-semibold py-3 rounded-md text-sm transition">
              Deploy Multi-Tier Contract Proposal
            </button>
          </form>
        </div>

        {generatedLink && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 flex justify-between items-center shadow-md">
            <div>
              <h3 className="text-sm font-bold text-emerald-900">Proposal Launched Live!</h3>
              <p className="text-xs text-emerald-700 font-mono mt-1">{generatedLink}</p>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(generatedLink); alert("Copied!"); }} className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs px-4 py-2 rounded-md">Copy Link</button>
          </div>
        )}
      </div>
    </div>
  );
}