"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function MultiTierEstimatorCreator() {
  const router = useRouter();
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [startDate, setStartDate] = useState("");
  const [duration, setDuration] = useState("9 Weeks");
  const [depositPercent, setDepositPercent] = useState(20);
  const [goalsPrompt, setGoalsPrompt] = useState("");
  
  // New document processing states
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [generatedItems, setGeneratedItems] = useState<any[]>([]);
  const [proposalLink, setProposalLink] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachedFile(e.target.files[0]);
    }
  };

  const runAiEstimatorEngine = async () => {
    if (!goalsPrompt.trim() && !attachedFile) {
      return alert("Please describe your remodeling goals or upload a design package document.");
    }
    setIsGenerating(true);
    
    try {
      let responseData;
      
      // If a document is attached, switch to a multipart payload delivery pipeline
      if (attachedFile) {
        const formData = new FormData();
        formData.append("file", attachedFile);
        formData.append("prompt", goalsPrompt.trim());
        formData.append("address", streetAddress.trim() || "Project Address");
        formData.append("zipcode", zipCode.trim() || "Omaha");

        const res = await fetch("/api/generate-scope", {
          method: "POST",
          body: formData, // Browser auto-detects multipart content boundaries
        });
        responseData = await res.json();
      } else {
        // Standard structural text fallback pipeline
        const res = await fetch("/api/generate-scope", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            prompt: goalsPrompt.trim(), 
            address: streetAddress.trim() || "Project Address", 
            zipcode: zipCode.trim() || "Omaha" 
          }),
        });
        responseData = await res.json();
      }

      if (responseData.items && Array.isArray(responseData.items)) {
        setGeneratedItems(responseData.items);
        alert("AI Estimation sheet populated successfully from design parameters!");
      } else {
        alert("Could not parse items from the provided parameters.");
      }
    } catch (err) {
      console.error(err);
      alert("AI compiler failure mapping scope metrics components.");
    } finally {
      setIsGenerating(false);
    }
  };

  const deployLiveProposalRecord = async () => {
    if (!clientName.trim() || !clientEmail.trim()) {
      return alert("Please fill out the Client Name and Client Email before deploying.");
    }
    setIsDeploying(true);

    const calculatedBaseTotal = generatedItems.reduce((sum, item) => sum + (parseFloat(item.mid_cost) || 0), 0);

    const standardPhasesArray = [
      { name: "Initial Deposit / Mobilization", percentage: depositPercent },
      { name: "Framing & MEP Rough-In Completion", percentage: 24 },
      { name: "Drywall Tape & Level 4 Finish Completion", percentage: 24 },
      { name: "Flawless Properties turnover handoff", percentage: 100 - (depositPercent + 24 + 24) }
    ];

    try {
      const { data, error } = await supabase
        .from("invoices")
        .insert([
          {
            homeowner_name: clientName.trim(),
            homeowner_email: clientEmail.trim(),
            job_address: `${streetAddress.trim()}, Omaha, NE ${zipCode.trim()}`,
            amount: calculatedBaseTotal,
            status: "pending",
            deposit_percentage: depositPercent,
            project_length: duration,
            estimated_start_date: startDate,
            items: generatedItems,
            payment_phases: standardPhasesArray,
            current_phase_index: 0,
            deposit_cleared: false,
            view_count: 0,
            view_history: [],
            homeowner_options: [
              { category: "Paint Scheme", choices: ["Classic Repose Gray", "Alabaster White", "Naval Blue Accent"] },
              { category: "Flooring Allowance", choices: ["Waterproof Engineered Luxury Vinyl Plank", "Plush Carpeting + 8lb Pad", "Polished Concrete Polish"] }
            ],
            homeowner_selections: {}
          }
        ])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setProposalLink(`${window.location.origin}/invoice/${data.id}`);
        alert("Live proposal channel broadcasted successfully!");
      }
    } catch (err: any) {
      alert("Database dispatch pipeline error: " + err.message);
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans antialiased pb-24 text-left flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl max-w-4xl w-full space-y-6">
        
        {/* Title and Navigation Link Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">
            Multi-Tier Estimate Creator Workspace
          </h1>
          <button
            type="button"
            onClick={() => router.push("/admin/projects")}
            className="bg-slate-900 hover:bg-slate-800 text-white font-black text-[11px] px-4 py-2.5 rounded-xl uppercase tracking-wider transition shadow-sm outline-none shrink-0"
          >
            📁 View Active Projects Ledger →
          </button>
        </div>

        {/* Input Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <input type="text" placeholder="Client Name" value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full p-3 bg-slate-50/50 border rounded-xl outline-none font-bold text-slate-800" />
          <input type="email" placeholder="Client Email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className="w-full p-3 bg-slate-50/50 border rounded-xl outline-none font-bold text-slate-800" />
          <input type="text" placeholder="Street Address" value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} className="w-full p-3 bg-slate-50/50 border rounded-xl outline-none font-bold text-slate-800" />
          <input type="text" placeholder="Zip Code" value={zipCode} onChange={(e) => setZipCode(e.target.value)} className="w-full p-3 bg-slate-50/50 border rounded-xl outline-none font-bold text-slate-800" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Estimated Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-3 bg-slate-50/50 border rounded-xl outline-none font-bold text-slate-800" />
          </div>
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Project Duration</label>
            <input type="text" placeholder="e.g., 9 Weeks" value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full p-3 bg-slate-50/50 border rounded-xl outline-none font-bold text-slate-800" />
          </div>
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Mobilization Deposit (%)</label>
            <input type="number" value={depositPercent} onChange={(e) => setDepositPercent(parseInt(e.target.value) || 0)} className="w-full p-3 bg-slate-50/50 border rounded-xl outline-none font-bold text-slate-800" />
          </div>
        </div>

        {/* INTEGRATED DUAL CONTENT/DOCUMENT REMODELING DROPZONE */}
        <div className="border border-blue-100 bg-blue-50/30 p-5 rounded-2xl space-y-4 text-xs">
          <div>
            <h4 className="font-black text-slate-900 uppercase tracking-wide text-[11px]">⚡ Intelligent Document Extraction Input</h4>
            <p className="text-slate-400 font-medium text-[11px] mt-0.5">Describe structural goals or attach estimation summary packets (such as IKEA planning manifests) to process item breakdowns.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <input 
              type="text" 
              placeholder="Provide context or complementary instructions (e.g., Include Sink Base installation)..." 
              value={goalsPrompt} 
              onChange={(e) => setGoalsPrompt(e.target.value)}
              className="w-full sm:flex-1 p-3 bg-white border border-slate-200 focus:border-blue-400 rounded-xl outline-none font-semibold text-slate-800 shadow-sm" 
            />
            
            <label className="w-full sm:w-auto bg-white border border-slate-200 hover:border-slate-400 p-3 rounded-xl shadow-sm text-center font-bold text-slate-600 cursor-pointer transition-colors whitespace-nowrap">
              {attachedFile ? `📎 ${attachedFile.name.slice(0, 15)}...` : "📁 Upload Package (PDF/Img)"}
              <input type="file" accept=".pdf,image/*" onChange={handleFileChange} className="hidden" />
            </label>

            <button 
              type="button" 
              onClick={runAiEstimatorEngine}
              disabled={isGenerating}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-black px-6 py-3 rounded-xl uppercase tracking-wider transition shadow-sm whitespace-nowrap"
            >
              {isGenerating ? "Processing..." : "Run AI Estimator"}
            </button>
          </div>
        </div>

        {generatedItems.length > 0 && (
          <div className="border rounded-xl bg-slate-50 p-4 space-y-2 max-h-48 overflow-y-auto text-xs shadow-inner animate-fadeIn">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b pb-1 mb-2">Calculated Estimation Lines Queue</p>
            {generatedItems.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm gap-4">
                <div className="text-left">
                  <span className="font-extrabold text-slate-800 block text-xs">{item.title}</span>
                  <span className="text-[10px] text-slate-400 font-medium leading-relaxed block mt-0.5">{item.mid_description || item.description}</span>
                </div>
                <span className="font-sans font-black text-slate-900 text-sm shrink-0">${(parseFloat(item.mid_cost) || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
              </div>
            ))}
          </div>
        )}

        {/* Global Broadcast Contract Actions Block */}
        <div className="space-y-3 pt-2">
          <button 
            type="button" 
            onClick={deployLiveProposalRecord}
            disabled={isDeploying || generatedItems.length === 0}
            className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-black text-xs py-3.5 rounded-xl uppercase tracking-widest transition-all shadow-md outline-none"
          >
            {isDeploying ? "Deploying Parameters Link..." : "Deploy Live Proposal Link"}
          </button>

          {proposalLink && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-center text-xs animate-fadeIn">
              <p className="text-emerald-800 font-extrabold">✓ Live Client Channel Active & Secure</p>
              <input 
                type="text" 
                readOnly 
                value={proposalLink} 
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="w-full text-center font-mono font-bold bg-white text-slate-700 p-2 rounded-lg border border-emerald-200 mt-2 outline-none select-all" 
              />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}