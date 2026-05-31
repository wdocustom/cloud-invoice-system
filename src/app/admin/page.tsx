"use client";
import { useState } from "react";
import { supabase } from "../lib/supabase";

interface LineItem {
  title: string;
  description: string;
  cost: number;
}

export default function AdminDashboard() {
  const [homeownerName, setHomeownerName] = useState("");
  const [homeownerEmail, setHomeownerEmail] = useState("");
  const [address, setAddress] = useState("");
  const [zipcode, setZipcode] = useState("");
  
  // Interactive Line Item Spreadsheet State
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
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
      } else {
        alert("AI pricing structure error.");
      }
    } catch (err) {
      alert("Error generating line items.");
    }
    setIsGeneratingAI(false);
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const deleteLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const addBlankLineItem = () => {
    setLineItems([...lineItems, { title: "New Item", description: "", cost: 0 }]);
  };

  const totalCost = lineItems.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeownerName || !homeownerEmail || lineItems.length === 0) {
      return alert("Please fill out homeowner details and generate line items.");
    }

    setIsSubmitting(true);
    
    // Package description for backwards compatibility, store structured JSON array in 'items'
    const summaryText = lineItems.map(i => `[${i.title}] - $${i.cost}\n${i.description}`).join("\n\n");

    const { data, error } = await supabase
      .from("invoices")
      .insert([
        {
          homeowner_name: homeownerName,
          homeowner_email: homeownerEmail,
          amount: totalCost,
          description: summaryText,
          items: lineItems, // Saving structured data
          status: "pending",
        },
      ])
      .select()
      .single();

    setIsSubmitting(false);

    if (error) {
      alert("Error saving: " + error.message);
    } else if (data) {
      setGeneratedLink(`${window.location.origin}/invoice/${data.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 py-12 px-4 sm:px-6 lg:px-8 font-sans text-gray-900">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white shadow-xl rounded-lg border border-gray-200 p-8">
          
          <h1 className="text-2xl font-bold border-b pb-4 mb-6">Itemized Estimate Generator</h1>

          <form onSubmit={handleCreateInvoice} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input type="text" placeholder="Homeowner Name" required value={homeownerName} onChange={(e) => setHomeownerName(e.target.value)} className="p-2.5 border rounded-md text-sm bg-white" />
              <input type="email" placeholder="Homeowner Email" required value={homeownerEmail} onChange={(e) => setHomeownerEmail(e.target.value)} className="p-2.5 border rounded-md text-sm bg-white" />
              <input type="text" placeholder="Jobsite Street Address" required value={address} onChange={(e) => setAddress(e.target.value)} className="p-2.5 border rounded-md text-sm sm:col-span-1 bg-white" />
              <input type="text" placeholder="Zip Code" required value={zipcode} onChange={(e) => setZipcode(e.target.value)} className="p-2.5 border rounded-md text-sm bg-white" />
            </div>

            {/* AI Prompt Box */}
            <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-md flex gap-2">
              <input type="text" value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="Describe work (e.g., 800sf basement remodel, black exposed ceiling, 3pc bath)" className="flex-1 p-2.5 border rounded-md text-sm bg-white" />
              <button type="button" onClick={handleAiGenerate} disabled={isGeneratingAI} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 rounded-md font-medium transition">
                {isGeneratingAI ? "Calculating..." : "Draft Scope & Prices"}
              </button>
            </div>

            {/* Itemized Grid Worksheet */}
            {lineItems.length > 0 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-sm text-slate-700">Project Line Items Worksheet</h3>
                  <button type="button" onClick={addBlankLineItem} className="text-xs bg-slate-200 hover:bg-slate-300 px-3 py-1.5 rounded-md font-medium">+ Custom Line</button>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <th className="p-3 w-1/4">Task Title</th>
                        <th className="p-3 w-1/2">Detailed Specifications</th>
                        <th className="p-3 w-1/6">Est. Price ($)</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {lineItems.map((item, index) => (
                        <tr key={index} className="hover:bg-slate-50/50">
                          <td className="p-2 align-top">
                            <input type="text" value={item.title} onChange={(e) => updateLineItem(index, "title", e.target.value)} className="w-full p-1.5 border border-transparent hover:border-gray-300 focus:border-slate-900 rounded bg-transparent font-medium" />
                          </td>
                          <td className="p-2 align-top">
                            <textarea rows={2} value={item.description} onChange={(e) => updateLineItem(index, "description", e.target.value)} className="w-full p-1.5 border border-transparent hover:border-gray-300 focus:border-slate-900 rounded bg-transparent text-xs text-gray-600" />
                          </td>
                          <td className="p-2 align-top">
                            <input type="number" step="0.01" value={item.cost} onChange={(e) => updateLineItem(index, "cost", parseFloat(e.target.value) || 0)} className="w-full p-1.5 border border-transparent hover:border-gray-300 focus:border-slate-900 rounded bg-transparent text-right font-mono" />
                          </td>
                          <td className="p-2 text-center align-top pt-3">
                            <button type="button" onClick={() => deleteLineItem(index)} className="text-red-500 hover:text-red-700 text-xs">Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="bg-slate-900 text-white p-4 flex justify-between items-center font-bold">
                    <span>TOTAL CONTRACT VALUE:</span>
                    <span className="font-mono text-lg">${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            )}

            <button type="submit" disabled={isSubmitting} className="w-full bg-slate-950 hover:bg-slate-800 text-white font-semibold py-3 rounded-md text-sm transition">
              {isSubmitting ? "Publishing estimate..." : "Publish & Lock Contract"}
            </button>
          </form>
        </div>

        {generatedLink && (
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg p-6 shadow-md flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-emerald-900">Estimate Live & Contract Locked!</h3>
              <p className="text-xs text-emerald-700 font-mono mt-1">{generatedLink}</p>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(generatedLink); alert("Copied!"); }} className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs px-4 py-2 rounded-md">Copy URL</button>
          </div>
        )}
      </div>
    </div>
  );
}