"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toNum } from "@/lib/utils";
import { toast } from "@/lib/toast";

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

  const [attachedFileName, setAttachedFileName] = useState("");
  const [extractedFileText, setExtractedFileText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [generatedItems, setGeneratedItems] = useState<any[]>([]);
  const [proposalLink, setProposalLink] = useState("");

  const handleClientSideFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAttachedFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const fullResultText = event.target?.result as string;
      const normalizedText = fullResultText
        .replace(/[^\x20-\x7E\n\r\t]/g, " ")
        .replace(/\s+/g, " ");

      setExtractedFileText(normalizedText);
    };
    reader.readAsText(file);
  };

  const runAiEstimatorEngine = async () => {
    if (!goalsPrompt.trim() && !extractedFileText) {
      return toast("Please describe your remodeling goals or upload a design package document.", "error");
    }
    setIsGenerating(true);

    try {
      const res = await fetch("/api/generate-scope", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: goalsPrompt.trim(),
          fileContext: extractedFileText,
          address: streetAddress.trim() || "Project Address",
          zipcode: zipCode.trim() || "Omaha"
        }),
      });

      const responseData = await res.json();

      if (responseData.items && Array.isArray(responseData.items)) {
        setGeneratedItems(responseData.items);
        toast("Estimation generated successfully", "success");
      } else {
        toast(responseData.error || "Could not parse items from the provided parameters.", "error");
      }
    } catch (err) {
      console.error(err);
      toast("AI compiler failure mapping scope metrics components.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const deployLiveProposalRecord = async () => {
    if (!clientName.trim()) {
      return toast("Please fill out the client name", "error");
    }
    setIsDeploying(true);

    const calculatedBaseTotal = generatedItems.reduce((sum, item) => sum + toNum(item.mid_cost), 0);

    const standardPhasesArray = [
      { name: "Initial Deposit / Mobilization", percentage: depositPercent },
      { name: "Framing & MEP Rough-In Completion", percentage: 24 },
      { name: "Drywall Tape & Level 4 Finish Completion", percentage: 24 },
      { name: "Flawless Properties turnover handoff", percentage: 100 - (depositPercent + 24 + 24) }
    ];

    // Generate a fallback string to satisfy the database constraint rule
    const primaryDatabaseSummaryText = goalsPrompt.trim() || `Residential renovation project scope manifest for ${clientName}.`;

    try {
      const { data, error } = await supabase
        .from("invoices")
        .insert([
          {
            homeowner_name: clientName.trim(),
            homeowner_email: clientEmail.trim() || null,
            job_address: `${streetAddress.trim()}, Omaha, NE ${zipCode.trim()}`,
            description: primaryDatabaseSummaryText, // Added to fix the database constraint error
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
        toast("Proposal deployed successfully", "success");
      }
    } catch (err: any) {
      toast("Database dispatch pipeline error: " + err.message, "error");
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans antialiased pb-24 text-left flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200/60 rounded-2xl p-8 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.03)] max-w-4xl w-full space-y-6">

        {/* Title and Navigation Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            New Estimate
          </h1>
          <button
            type="button"
            onClick={() => router.push("/admin/projects")}
            className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[11px] px-4 py-2.5 rounded-xl uppercase tracking-wider transition shadow-sm outline-none shrink-0"
          >
            Projects
          </button>
        </div>

        {/* Input Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <input type="text" placeholder="Client Name" value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full py-3.5 px-4 bg-white border border-slate-200 rounded-xl outline-none font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" />
          <input type="email" placeholder="Client Email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className="w-full py-3.5 px-4 bg-white border border-slate-200 rounded-xl outline-none font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" />
          <input type="text" placeholder="Street Address" value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} className="w-full py-3.5 px-4 bg-white border border-slate-200 rounded-xl outline-none font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" />
          <input type="text" placeholder="Zip Code" value={zipCode} onChange={(e) => setZipCode(e.target.value)} className="w-full py-3.5 px-4 bg-white border border-slate-200 rounded-xl outline-none font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Estimated Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full py-3.5 px-4 bg-white border border-slate-200 rounded-xl outline-none font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Project Duration</label>
            <input type="text" placeholder="e.g., 9 Weeks" value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full py-3.5 px-4 bg-white border border-slate-200 rounded-xl outline-none font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">Mobilization Deposit (%)</label>
            <input type="number" value={depositPercent} onChange={(e) => setDepositPercent(parseInt(e.target.value) || 0)} className="w-full py-3.5 px-4 bg-white border border-slate-200 rounded-xl outline-none font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" />
          </div>
        </div>

        {/* DUAL CONTENT DEPLOYER CONTROL DROPZONE */}
        <div className="border border-blue-200/40 bg-gradient-to-br from-blue-50/60 to-slate-50/40 p-6 rounded-2xl space-y-4 text-xs">
          <div>
            <h4 className="font-black text-slate-900 uppercase tracking-wide text-[11px]">AI Scope Generator</h4>
            <p className="text-slate-400 font-medium text-[11px] mt-0.5">Describe the project scope or upload a design document.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <input
              type="text"
              placeholder="Provide complementary contextual instructions or describe project metrics..."
              value={goalsPrompt}
              onChange={(e) => setGoalsPrompt(e.target.value)}
              className="w-full sm:flex-1 py-3.5 px-4 bg-white border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 rounded-xl outline-none font-semibold text-slate-800 shadow-sm transition-all"
            />

            <label className="w-full sm:w-auto bg-white border border-slate-200 hover:border-slate-400 py-3.5 px-4 rounded-xl shadow-sm text-center font-bold text-slate-600 cursor-pointer transition-colors whitespace-nowrap">
              {attachedFileName ? `📎 ${attachedFileName.slice(0, 15)}...` : "Upload File"}
              <input type="file" onChange={handleClientSideFileLoad} className="hidden" />
            </label>

            <button
              type="button"
              onClick={runAiEstimatorEngine}
              disabled={isGenerating}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-black px-6 py-3 rounded-xl uppercase tracking-wider shadow-sm hover:shadow-md transition-all duration-200 whitespace-nowrap"
            >
              {isGenerating ? "Processing..." : "Run AI Estimator"}
            </button>
          </div>
        </div>

        {generatedItems.length > 0 && (
          <div className="border rounded-2xl bg-slate-50 p-4 space-y-2 max-h-48 overflow-y-auto text-xs shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.03)] animate-fadeIn">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider border-b pb-1 mb-2">Generated Line Items</p>
            {generatedItems.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] gap-4">
                <div className="text-left">
                  <span className="font-extrabold text-slate-800 block text-xs">{item.title}</span>
                  <span className="text-[10px] text-slate-400 font-medium block mt-0.5">{item.mid_description || item.description}</span>
                </div>
                <span className="font-sans font-black text-slate-900 text-sm shrink-0" style={{fontVariantNumeric:'tabular-nums'}}>${toNum(item.mid_cost).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
              </div>
            ))}
          </div>
        )}

        {/* Global Broadcast Actions Block */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={deployLiveProposalRecord}
            disabled={isDeploying || generatedItems.length === 0}
            className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-black text-xs py-3.5 rounded-xl uppercase tracking-widest shadow-sm hover:shadow-md transition-all duration-200 outline-none"
          >
            {isDeploying ? "Deploying Parameters Link..." : "Create Proposal"}
          </button>

          {proposalLink && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl shadow-sm text-center text-xs animate-fadeIn">
              <p className="text-emerald-800 font-extrabold">✓ Live Client Channel Active & Secure</p>
              <input
                type="text"
                readOnly
                value={proposalLink}
                className="w-full text-center font-mono font-bold bg-white text-slate-700 p-2 rounded-lg border border-emerald-200 mt-2 outline-none select-all"
              />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
