"use client";
import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function AdminDashboard() {
  const [homeownerName, setHomeownerName] = useState("");
  const [homeownerEmail, setHomeownerEmail] = useState("");
  const [address, setAddress] = useState("");
  const [zipcode, setZipcode] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  
  // AI State variables
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return alert("Please describe what work needs to be done first.");
    if (!address || !zipcode) return alert("Please provide the address and zipcode so the AI can evaluate local constraints.");

    setIsGeneratingAI(true);
    try {
      const res = await fetch("/api/generate-scope", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt, address, zipcode }),
      });
      const data = await res.json();
      if (data.text) {
        setDescription(data.text);
      } else {
        alert("AI Generation failed: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      alert("Error connecting to AI assistant.");
    }
    setIsGeneratingAI(false);
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeownerName || !homeownerEmail || !amount || !description) {
      return alert("Please fill out all core contract fields.");
    }

    setIsSubmitting(true);
    setGeneratedLink("");

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
      alert("Error creating invoice: " + error.message);
    } else if (data) {
      setGeneratedLink(`${window.location.origin}/invoice/${data.id}`);
      // Clear inputs
      setHomeownerName("");
      setHomeownerEmail("");
      setAddress("");
      setZipcode("");
      setAmount("");
      setDescription("");
      setAiPrompt("");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 py-12 px-4 sm:px-6 lg:px-8 font-sans text-gray-900">
      <div className="max-w-3xl mx-auto space-y-6">
        
        <div className="bg-white shadow-xl rounded-lg overflow-hidden border border-gray-200 p-8">
          <div className="border-b border-gray-100 pb-4 mb-6">
            <h1 className="text-2xl font-bold text-slate-900">AI-Powered Project Builder</h1>
            <p className="text-sm text-gray-500 mt-1">Leverage a specialized remodeling AI assistant to draft pristine localized contract specifications.</p>
          </div>

          <form onSubmit={handleCreateInvoice} className="space-y-6">
            {/* Client Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Homeowner Name</label>
                <input type="text" required value={homeownerName} onChange={(e) => setHomeownerName(e.target.value)} placeholder="Skyler Camacho" className="w-full px-4 py-2.5 border border-gray-300 rounded-md outline-none text-sm bg-white" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Homeowner Email</label>
                <input type="email" required value={homeownerEmail} onChange={(e) => setHomeownerEmail(e.target.value)} placeholder="camachoskyler@gmail.com" className="w-full px-4 py-2.5 border border-gray-300 rounded-md outline-none text-sm bg-white" />
              </div>
            </div>

            {/* Location Targeting inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Jobsite Street Address</label>
                <input type="text" required value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Remodel St" className="w-full px-4 py-2.5 border border-gray-300 rounded-md outline-none text-sm bg-white" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Zip Code</label>
                <input type="text" required value={zipcode} onChange={(e) => setZipcode(e.target.value)} placeholder="90210" className="w-full px-4 py-2.5 border border-gray-300 rounded-md outline-none text-sm bg-white" />
              </div>
            </div>

            {/* AI Generator Feature Box */}
            <div className="p-5 bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-200 rounded-lg space-y-3">
              <label className="block text-xs font-bold text-blue-900 uppercase tracking-wider">🔨 AI Remodeling Expert Assistant</label>
              <p className="text-xs text-slate-500">Describe the basic scope in plain English. The AI will look up your target location context to craft structural, aesthetic, and clean-up details.</p>
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g., Build a new 15ft retaining wall with block masonry" 
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-md outline-none text-sm bg-white"
                />
                <button
                  type="button"
                  onClick={handleAiGenerate}
                  disabled={isGeneratingAI}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 rounded-md text-xs transition duration-150 disabled:opacity-50"
                >
                  {isGeneratingAI ? "Analyzing..." : "Draft Scope"}
                </button>
              </div>
            </div>

            {/* Financials & Final Scope Output */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Total Project Cost ($)</label>
              <input type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="5000.00" className="w-full px-4 py-2.5 border border-gray-300 rounded-md outline-none text-sm bg-white" />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Official Scope of Work & Terms</label>
              <textarea
                rows={10}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="The AI draft or your manual specifications will populate here..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-md outline-none text-xs bg-white font-mono leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-slate-950 hover:bg-slate-800 text-white font-semibold py-3 px-4 rounded-md transition duration-150 disabled:opacity-50 tracking-wide text-sm shadow-md"
            >
              {isSubmitting ? "Saving Contract..." : "Publish & Generate Homeowner Link"}
            </button>
          </form>
        </div>

        {/* Link Output Block */}
        {generatedLink && (
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg p-6 shadow-md">
            <h3 className="text-sm font-bold text-emerald-900">🎉 Professional Contract Generated!</h3>
            <div className="mt-4 flex gap-2">
              <input type="text" readOnly value={generatedLink} className="flex-1 px-3 py-2 bg-white border border-emerald-300 rounded-md text-xs text-gray-700 font-mono" />
              <button onClick={() => { navigator.clipboard.writeText(generatedLink); alert("Copied!"); }} className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 rounded-md text-xs">Copy Link</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}