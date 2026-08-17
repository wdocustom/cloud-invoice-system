"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toNum } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { allocateDocumentNumber, proposalNumberFields } from "@/lib/document-numbers";

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
  const [proposalNumber, setProposalNumber] = useState("");
  const [generatingPhase, setGeneratingPhase] = useState("");

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
    setGeneratingPhase("Analyzing scope parameters...");

    const phases = [
      "Analyzing scope parameters...",
      "Mapping material specifications...",
      "Crafting tiered line items...",
      "Calculating labor allocations...",
      "Finalizing estimate matrix..."
    ];
    let phaseIdx = 0;
    const interval = setInterval(() => {
      phaseIdx = (phaseIdx + 1) % phases.length;
      setGeneratingPhase(phases[phaseIdx]);
    }, 2200);

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
      clearInterval(interval);
      setIsGenerating(false);
      setGeneratingPhase("");
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

    const primaryDatabaseSummaryText = goalsPrompt.trim() || `Residential renovation project scope manifest for ${clientName}.`;

    // No lead behind this one, so it draws its own number off the shared
    // counter — same sequence the estimate links pull from.
    const numberFields = proposalNumberFields(await allocateDocumentNumber(supabase));

    try {
      const { data, error } = await supabase
        .from("invoices")
        .insert([
          {
            ...numberFields,
            homeowner_name: clientName.trim(),
            homeowner_email: clientEmail.trim() || null,
            job_address: `${streetAddress.trim()}, Omaha, NE ${zipCode.trim()}`,
            description: primaryDatabaseSummaryText,
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
        setProposalNumber(data.proposal_number || "");
        toast(
          data.proposal_number ? `Proposal ${data.proposal_number} deployed` : "Proposal deployed successfully",
          "success"
        );
      }
    } catch (err: any) {
      toast("Database dispatch pipeline error: " + err.message, "error");
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-alabaster text-brand-charcoal font-sans antialiased pb-24 text-left flex items-center justify-center p-4">
      <div className="bg-white border border-brand-stone/40 rounded-3xl p-8 sm:p-10 shadow-premium max-w-4xl w-full space-y-8 animate-fade-in">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-stone/40 pb-6">
          <div>
            <h1 className="font-editorial text-2xl font-bold tracking-tight text-brand-charcoal">
              New Estimate
            </h1>
            <p className="text-sm text-brand-muted font-medium mt-1">Create a tiered proposal for your client</p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/admin/projects")}
            className="bg-brand-charcoal hover:bg-brand-charcoal/90 text-white font-semibold text-[11px] px-5 py-2.5 rounded-xl tracking-wide transition-all duration-200 hover:shadow-elevated outline-none shrink-0"
          >
            View Projects →
          </button>
        </div>

        {/* Client Info Grid */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-brand-muted uppercase tracking-wider">Client Information</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="text" placeholder="Client Name *" value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full py-3.5 px-4 bg-brand-alabaster border border-brand-stone/60 rounded-xl outline-none text-sm font-medium text-brand-charcoal placeholder:text-brand-muted/60 focus:ring-2 focus:ring-luxury-gold/20 focus:border-luxury-gold/50 transition-all" />
            <input type="email" placeholder="Client Email (optional)" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className="w-full py-3.5 px-4 bg-brand-alabaster border border-brand-stone/60 rounded-xl outline-none text-sm font-medium text-brand-charcoal placeholder:text-brand-muted/60 focus:ring-2 focus:ring-luxury-gold/20 focus:border-luxury-gold/50 transition-all" />
            <input type="text" placeholder="Street Address" value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} className="w-full py-3.5 px-4 bg-brand-alabaster border border-brand-stone/60 rounded-xl outline-none text-sm font-medium text-brand-charcoal placeholder:text-brand-muted/60 focus:ring-2 focus:ring-luxury-gold/20 focus:border-luxury-gold/50 transition-all" />
            <input type="text" placeholder="Zip Code" value={zipCode} onChange={(e) => setZipCode(e.target.value)} className="w-full py-3.5 px-4 bg-brand-alabaster border border-brand-stone/60 rounded-xl outline-none text-sm font-medium text-brand-charcoal placeholder:text-brand-muted/60 focus:ring-2 focus:ring-luxury-gold/20 focus:border-luxury-gold/50 transition-all" />
          </div>
        </div>

        {/* Project Parameters */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-brand-muted uppercase tracking-wider">Project Parameters</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-brand-muted/80 block">Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full py-3 px-4 bg-brand-alabaster border border-brand-stone/60 rounded-xl outline-none text-sm font-medium text-brand-charcoal focus:ring-2 focus:ring-luxury-gold/20 focus:border-luxury-gold/50 transition-all" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-brand-muted/80 block">Duration</label>
              <input type="text" placeholder="e.g., 9 Weeks" value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full py-3 px-4 bg-brand-alabaster border border-brand-stone/60 rounded-xl outline-none text-sm font-medium text-brand-charcoal placeholder:text-brand-muted/60 focus:ring-2 focus:ring-luxury-gold/20 focus:border-luxury-gold/50 transition-all" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-brand-muted/80 block">Deposit %</label>
              <input type="number" value={depositPercent} onChange={(e) => setDepositPercent(parseInt(e.target.value) || 0)} className="w-full py-3 px-4 bg-brand-alabaster border border-brand-stone/60 rounded-xl outline-none text-sm font-medium text-brand-charcoal focus:ring-2 focus:ring-luxury-gold/20 focus:border-luxury-gold/50 transition-all" />
            </div>
          </div>
        </div>

        {/* AI Scope Engine */}
        <div className="border border-brand-stone/40 bg-gradient-to-br from-brand-warm to-white p-6 rounded-2xl space-y-4 relative overflow-hidden">
          {isGenerating && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-2xl">
              <div className="w-10 h-10 rounded-full border-2 border-luxury-gold border-t-transparent animate-spin mb-3" />
              <p className="text-sm font-semibold text-brand-charcoal animate-pulse">{generatingPhase}</p>
            </div>
          )}
          <div>
            <h4 className="font-semibold text-brand-charcoal text-sm tracking-tight">AI Scope Engine</h4>
            <p className="text-[12px] text-brand-muted font-medium mt-0.5">Describe the renovation scope in detail — the AI will generate tiered line items with pricing.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch gap-3">
            <textarea
              placeholder="Describe your project in detail: rooms, scope of work, material preferences, special requirements..."
              value={goalsPrompt}
              onChange={(e) => setGoalsPrompt(e.target.value)}
              rows={3}
              className="w-full sm:flex-1 py-3 px-4 bg-white border border-brand-stone/60 focus:ring-2 focus:ring-luxury-gold/20 focus:border-luxury-gold/50 rounded-xl outline-none text-sm font-medium text-brand-charcoal placeholder:text-brand-muted/60 resize-none transition-all"
            />
            <div className="flex sm:flex-col gap-2 shrink-0">
              <label className="flex-1 sm:flex-none bg-white border border-brand-stone/60 hover:border-brand-muted py-3 px-4 rounded-xl text-center font-semibold text-xs text-brand-muted cursor-pointer transition-colors flex items-center justify-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                {attachedFileName ? attachedFileName.slice(0, 12) + "..." : "Attach"}
                <input type="file" onChange={handleClientSideFileLoad} className="hidden" />
              </label>

              <button
                type="button"
                onClick={runAiEstimatorEngine}
                disabled={isGenerating}
                className="flex-1 sm:flex-none bg-brand-charcoal hover:bg-brand-charcoal/90 disabled:opacity-40 text-white font-semibold text-xs px-5 py-3 rounded-xl tracking-wide transition-all duration-200 hover:shadow-elevated whitespace-nowrap"
              >
                Generate
              </button>
            </div>
          </div>
        </div>

        {/* Generated Items Preview */}
        {generatedItems.length > 0 && (
          <div className="border border-brand-stone/40 rounded-2xl bg-white overflow-hidden shadow-card animate-fade-in">
            <div className="px-5 py-3 border-b border-brand-stone/30 bg-brand-warm/50">
              <p className="text-[11px] font-semibold text-brand-muted uppercase tracking-wider">Generated Line Items · {generatedItems.length} items</p>
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-brand-stone/20">
              {generatedItems.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start px-5 py-3.5 gap-4 hover:bg-brand-warm/30 transition-colors">
                  <div className="text-left min-w-0 flex-1">
                    <span className="font-semibold text-brand-charcoal block text-sm tracking-tight">{item.title}</span>
                    <span className="text-[12px] text-brand-muted font-medium block mt-0.5 truncate">{item.mid_description || item.description}</span>
                  </div>
                  <span className="font-semibold text-brand-charcoal text-sm shrink-0" style={{fontVariantNumeric:'tabular-nums'}}>${toNum(item.mid_cost).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-brand-stone/30 bg-brand-warm/30 flex justify-between items-center">
              <span className="text-xs font-medium text-brand-muted">Standard Tier Total</span>
              <span className="font-bold text-brand-charcoal text-base" style={{fontVariantNumeric:'tabular-nums'}}>
                ${generatedItems.reduce((s, i) => s + toNum(i.mid_cost), 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
              </span>
            </div>
          </div>
        )}

        {/* Deploy Action */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={deployLiveProposalRecord}
            disabled={isDeploying || generatedItems.length === 0}
            className="w-full bg-brand-charcoal hover:bg-brand-charcoal/90 disabled:bg-brand-stone disabled:text-brand-muted text-white font-semibold text-sm py-4 rounded-xl tracking-wide shadow-soft hover:shadow-elevated transition-all duration-300 outline-none"
          >
            {isDeploying ? "Creating proposal..." : "Create & Deploy Proposal"}
          </button>

          {proposalLink && (
            <div className="p-5 bg-sage-50 border border-sage-200 rounded-2xl shadow-soft text-center animate-fade-in">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-sage-500" />
                <p className="text-sage-700 font-semibold text-sm">Proposal Live</p>
              </div>
              {proposalNumber && (
                <p className="font-mono text-[11px] font-bold text-sage-700 tracking-wider mb-2">{proposalNumber}</p>
              )}
              <input
                type="text"
                readOnly
                value={proposalLink}
                className="w-full text-center font-mono text-xs bg-white text-brand-charcoal p-3 rounded-xl border border-sage-200 outline-none select-all"
              />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
