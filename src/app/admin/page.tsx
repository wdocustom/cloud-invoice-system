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

  // Interactive Multi-Tier Grid State Workbook
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

  // Handler to allow dynamic editing of fields before deploying the proposal link
  const updateLineItemField = (index: number, field: string, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const deleteLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const addBlankLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        title: "Custom Remodeling Phase",
        mid_description: "Enter standard mid-tier material and labor specifications...",
        mid_cost: 0,
        high_title: "Custom Luxury Upgrade",
        high_description: "Enter premium high-end material and labor specifications...",
        high_cost: 0,
      },
    ]);
  };

  // Recalculates total automatically as you type edits into the mid_cost column
  const totalMidCost = lineItems.reduce((sum, item) => sum + (typeof item.mid_cost === 'string' ? parseFloat(item.mid_cost) || 0 : Number(item.mid_cost) || 0), 0);

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

    // Ensure numeric entries are properly parsed before being saved to the database schema
    const cleanLineItems = lineItems.map(item => ({
      ...item,
      mid_cost: parseFloat(item.mid_cost) || 0,
      high_cost: parseFloat(item.high_cost) || 0
    }));

    const { data, error } = await supabase
      .from("invoices")
      .insert([
        {
          homeowner_name: homeownerName,
          homeowner_email: homeownerEmail,
          job_address: `${address}, Omaha, NE ${zipcode}`,
          amount: totalMidCost, 
          description: `Multi-tier interactive proposal generated for ${homeownerName}. Specifications managed via items array payload.`, 
          items: cleanLineItems, 
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
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-white shadow-xl rounded-lg border border-gray-200 p-8">
          <h1 className="text-2xl font-bold border-b pb-4 mb-6">Multi-Tier Estimate Creator Workspace</h1>

          <form onSubmit={handleCreateInvoice} className="space-y-6">
            {/* Meta Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input type="text" placeholder="Client Name" required value={homeownerName} onChange={(e) => setHomeownerName(e.target.value)} className="p-2.5 border rounded-md text-sm bg-white" />
              <input type="email" placeholder="Client Email" required value={homeownerEmail} onChange={(e) => setHomeownerEmail(e.target.value)} className="p-2.5 border rounded-md text-sm bg-white" />
              <input type="text" placeholder="Street Address" required value={address} onChange={(e) => setAddress(e.target.value)} className="p-2.5 border rounded-md text-sm bg-white" />
              <input type="text" placeholder="Zip Code" required value={zipcode} onChange={(e) => setZipcode(e.target.value)} className="p-2.5 border rounded-md text-sm bg-white" />
            </div>

            {/* Logistics Configuration Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t pt-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Estimated Start Date</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-2.5 border rounded-md text-sm bg-white" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Project Duration</label>
                <input type="text" placeholder="e.g., 9 Weeks" value={projectLength} onChange={(e) => setProjectLength(e.target.value)} className="w-full p-2.5 border rounded-md text-sm bg-white" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Mobilization Deposit (%)</label>
                <input type="number" placeholder="Deposit %" value={depositPercent} onChange={(e) => setDepositPercent(parseInt(e.target.value) || 20)} className="w-full p-2.5 border rounded-md text-sm bg-white" />
              </div>
            </div>

            {/* AI Call Panel */}
            <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-md flex gap-2">
              <input type="text" value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="Describe remodeling goals..." className="flex-1 p-2.5 border rounded-md text-sm bg-white" />
              <button type="button" onClick={handleAiGenerate} disabled={isGeneratingAI} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-5 rounded-md font-bold tracking-wide transition whitespace-nowrap">
                {isGeneratingAI ? "Estimating..." : "Run AI Estimator"}
              </button>
            </div>

            {/* Editable Interactive Table Workspace */}
            {lineItems.length > 0 && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-sm text-slate-700">Proposal Modifications Workbench</h3>
                  <button type="button" onClick={addBlankLineItem} className="text-xs bg-slate-200 hover:bg-slate-300 px-3 py-1.5 rounded-md font-bold text-slate-700 transition">
                    + Insert Custom Line
                  </button>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-inner">
                  <table className="w-full text-left border-collapse table-fixed">
                    <thead>
                      <tr className="bg-slate-50 border-b text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        <th className="p-3 w-1/4">Remodeling Component</th>
                        <th className="p-3 w-5/12">Standard Mid-Tier Specifications</th>
                        <th className="p-3 w-2/12 text-right">Mid Cost ($)</th>
                        <th className="p-3 w-2/12 text-right">High Cost ($)</th>
                        <th className="p-3 w-1/12 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-sm">
                      {lineItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          {/* Title Editor */}
                          <td className="p-2 align-top">
                            <input
                              type="text"
                              value={item.title}
                              onChange={(e) => updateLineItemField(idx, "title", e.target.value)}
                              className="w-full p-1.5 border border-transparent hover:border-gray-300 focus:border-slate-900 focus:bg-white font-bold text-slate-900 rounded outline-none text-xs bg-transparent transition"
                            />
                          </td>
                          {/* Description Editor */}
                          <td className="p-2 align-top">
                            <textarea
                              rows={3}
                              value={item.mid_description}
                              onChange={(e) => updateLineItemField(idx, "mid_description", e.target.value)}
                              className="w-full p-1.5 border border-transparent hover:border-gray-300 focus:border-slate-900 focus:bg-white text-xs text-slate-600 rounded outline-none bg-transparent resize-y transition"
                            />
                            {/* Hidden internal reference tracking indicator for high-tier upgrades */}
                            <p className="text-[10px] text-blue-500 font-medium px-1.5 mt-1 italic select-none">
                              ★ High upgrade text generated. Price mapped below.
                            </p>
                          </td>
                          {/* Mid Cost Editor */}
                          <td className="p-2 align-top">
                            <input
                              type="text"
                              value={item.mid_cost}
                              onChange={(e) => updateLineItemField(idx, "mid_cost", e.target.value)}
                              className="w-full p-1.5 border border-transparent hover:border-gray-300 focus:border-slate-900 focus:bg-white font-mono text-right text-xs font-semibold text-slate-700 rounded outline-none bg-transparent transition"
                            />
                          </td>
                          {/* High Cost Editor */}
                          <td className="p-2 align-top">
                            <input
                              type="text"
                              value={item.high_cost}
                              onChange={(e) => updateLineItemField(idx, "high_cost", e.target.value)}
                              className="w-full p-1.5 border border-transparent hover:border-gray-300 focus:border-slate-900 focus:bg-white font-mono text-right text-xs font-bold text-blue-600 rounded outline-none bg-transparent transition"
                            />
                          </td>
                          {/* Delete Action */}
                          <td className="p-2 text-center align-top pt-4">
                            <button
                              type="button"
                              onClick={() => deleteLineItem(idx)}
                              className="text-red-500 hover:text-red-700 text-xs font-bold tracking-wide transition"
                            >
                              Omit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* Real-time calculated live baseline banner */}
                  <div className="bg-slate-900 text-white p-4 flex justify-between items-center font-bold text-xs tracking-wider">
                    <span>LIVE BASELINE PROPOSAL VALUATION (MID):</span>
                    <span className="font-mono text-base text-emerald-400">
                      ${totalMidCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || lineItems.length === 0}
              className="w-full bg-slate-950 hover:bg-slate-800 text-white font-bold py-3.5 rounded-md text-sm shadow-md tracking-wider uppercase transition disabled:opacity-40"
            >
              {isSubmitting ? "Compiling Framework..." : "Deploy Live Proposal Link"}
            </button>
          </form>
        </div>

        {generatedLink && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 flex justify-between items-center shadow-md animate-fadeIn">
            <div>
              <h3 className="text-sm font-bold text-emerald-900">Proposal Framework Successfully Transmitted!</h3>
              <p className="text-xs text-emerald-700 font-mono mt-1">{generatedLink}</p>
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(generatedLink); alert("Copied to clipboard!"); }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-md transition tracking-wide shadow-sm whitespace-nowrap"
            >
              Copy Shared URL
            </button>
          </div>
        )}
      </div>
    </div>
  );
}