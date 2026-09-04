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

  const previewTotal = generatedItems.reduce((s, i) => s + toNum(i.mid_cost), 0);

  return (
    <div className="pb-28 text-left">

      {/* Sheet header — title block for the document being drafted */}
      <div className="border-b border-obsidian-900/10 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-7 sm:px-8 sm:py-9">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="eyebrow">Proposal Drafting</p>
              <h1 className="display-lg mt-2">New Estimate</h1>
              <p className="mt-2 max-w-md text-[13px] leading-relaxed text-graphite-500">
                Compose a tiered proposal, then publish it to a private client portal.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/admin/projects")}
              className="btn-outline group shrink-0 self-start sm:self-auto"
            >
              View Projects
              <span aria-hidden className="transition-transform duration-300 ease-architect group-hover:translate-x-0.5">&rarr;</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-8 sm:pt-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10">

          {/* ── Drafting column ─────────────────────────────────────────── */}
          <div className="min-w-0 space-y-10">

            {/* 01 — Client */}
            <section className="animate-rise">
              <div className="title-block">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-[10px] font-medium tracking-architect text-brass-500">01</span>
                  <h2 className="display-sm">Client</h2>
                </div>
                <span className="eyebrow hidden sm:block">Record</span>
              </div>
              <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
                <div>
                  <label className="field-label">Client Name <span className="text-brass-500">*</span></label>
                  <input type="text" placeholder="Full name" value={clientName} onChange={(e) => setClientName(e.target.value)} className="field" />
                </div>
                <div>
                  <label className="field-label">Client Email</label>
                  <input type="email" placeholder="name@domain.com" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className="field" />
                </div>
                <div>
                  <label className="field-label">Street Address</label>
                  <input type="text" placeholder="Street address" value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} className="field" />
                </div>
                <div>
                  <label className="field-label">Zip Code</label>
                  <input type="text" placeholder="681xx" value={zipCode} onChange={(e) => setZipCode(e.target.value)} className="field" />
                </div>
              </div>
            </section>

            {/* 02 — Parameters */}
            <section className="animate-rise">
              <div className="title-block">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-[10px] font-medium tracking-architect text-brass-500">02</span>
                  <h2 className="display-sm">Parameters</h2>
                </div>
                <span className="eyebrow hidden sm:block">Terms</span>
              </div>
              <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-3">
                <div>
                  <label className="field-label">Start Date</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="field tnum" />
                </div>
                <div>
                  <label className="field-label">Duration</label>
                  <input type="text" placeholder="e.g., 9 Weeks" value={duration} onChange={(e) => setDuration(e.target.value)} className="field" />
                </div>
                <div>
                  <label className="field-label">Deposit %</label>
                  <input type="number" value={depositPercent} onChange={(e) => setDepositPercent(parseInt(e.target.value) || 0)} className="field tnum no-spin" />
                </div>
              </div>
            </section>

            {/* 03 — Scope engine */}
            <section className="animate-rise">
              <div className="title-block">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-[10px] font-medium tracking-architect text-brass-500">03</span>
                  <h2 className="display-sm">Scope</h2>
                </div>
                <span className="eyebrow hidden sm:block">AI Assisted</span>
              </div>

              <div className="panel-sunken relative overflow-hidden p-5 sm:p-6">
                {isGenerating && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-bone-50/[0.92] backdrop-blur-[2px]">
                    <div className="h-7 w-7 animate-spin rounded-full border border-obsidian-900/15 border-t-brass-500" />
                    <p className="font-mono text-[10px] uppercase tracking-architect text-graphite-500">{generatingPhase}</p>
                  </div>
                )}

                <p className="text-[13px] leading-relaxed text-graphite-600">
                  Describe the renovation in detail — rooms, scope of work, material preferences, constraints.
                  Tiered line items are drafted with pricing for your review.
                </p>

                <textarea
                  placeholder="Full gut of a 1990s primary bath: relocate the shower to the north wall, freestanding tub, heated porcelain floor, custom walnut double vanity..."
                  value={goalsPrompt}
                  onChange={(e) => setGoalsPrompt(e.target.value)}
                  rows={5}
                  className="field mt-4 resize-none leading-relaxed"
                />

                <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <label className="group inline-flex cursor-pointer items-center gap-2 self-start border border-dashed border-obsidian-900/20 px-3 py-2 font-mono text-[10px] uppercase tracking-architect text-graphite-500 transition-colors duration-200 ease-architect hover:border-obsidian-900/45 hover:text-obsidian-900">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                    <span className="max-w-[180px] truncate">{attachedFileName ? attachedFileName : "Attach design package"}</span>
                    <input type="file" onChange={handleClientSideFileLoad} className="hidden" />
                  </label>

                  <button
                    type="button"
                    onClick={runAiEstimatorEngine}
                    disabled={isGenerating}
                    className="btn-ink self-start sm:self-auto"
                  >
                    Generate Scope
                  </button>
                </div>
              </div>
            </section>

            {/* Generated ledger */}
            {generatedItems.length > 0 && (
              <section className="animate-rise">
                <div className="title-block">
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-[10px] font-medium tracking-architect text-brass-500">04</span>
                    <h2 className="display-sm">Line Items</h2>
                  </div>
                  <span className="eyebrow">{generatedItems.length} entries</span>
                </div>

                <div className="panel overflow-hidden">
                  <div className="hidden items-baseline justify-between border-b border-obsidian-900/[0.07] bg-bone-100/60 px-5 py-2.5 sm:flex">
                    <span className="eyebrow">Description</span>
                    <span className="eyebrow">Standard Tier</span>
                  </div>
                  <div className="max-h-[26rem] overflow-y-auto">
                    {generatedItems.map((item, idx) => (
                      <div key={idx} className="group relative flex items-start justify-between gap-5 border-b border-obsidian-900/[0.06] px-5 py-4 transition-colors duration-200 ease-architect last:border-b-0 hover:bg-bone-50">
                        <span aria-hidden className="absolute bottom-0 left-0 top-0 w-px origin-top scale-y-0 bg-brass-400 opacity-0 transition-all duration-300 ease-architect group-hover:scale-y-100 group-hover:opacity-100" />
                        <div className="flex min-w-0 flex-1 gap-4">
                          <span className="mt-[3px] shrink-0 font-mono text-[10px] tabular-nums text-graphite-300">
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          <div className="min-w-0">
                            <p className="text-[13.5px] font-medium leading-snug tracking-[-0.01em] text-obsidian-900">{item.title}</p>
                            <p className="mt-1 text-[12px] leading-relaxed text-graphite-500">{item.mid_description || item.description}</p>
                          </div>
                        </div>
                        <span className="figure shrink-0 text-[13.5px]">
                          ${toNum(item.mid_cost).toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-baseline justify-between border-t border-obsidian-900/[0.12] bg-bone-100/60 px-5 py-3.5">
                    <span className="eyebrow-ink">Standard Tier Total</span>
                    <span className="figure text-[17px]">
                      ${previewTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </span>
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* ── Issue rail ──────────────────────────────────────────────── */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="panel-raised overflow-hidden">
              <div className="border-b border-obsidian-900/10 bg-obsidian-950 px-5 py-4 text-bone-100">
                <p className="eyebrow-invert">Issue</p>
                <p className="mt-1.5 font-display text-[1.35rem] leading-none tracking-[-0.01em]">
                  {clientName.trim() || "Untitled Proposal"}
                </p>
              </div>

              <dl className="divide-y divide-obsidian-900/[0.07]">
                <div className="flex items-baseline justify-between px-5 py-3">
                  <dt className="eyebrow">Line Items</dt>
                  <dd className="figure text-[13px]">{generatedItems.length}</dd>
                </div>
                <div className="flex items-baseline justify-between px-5 py-3">
                  <dt className="eyebrow">Deposit</dt>
                  <dd className="figure text-[13px]">{depositPercent}%</dd>
                </div>
                <div className="flex items-baseline justify-between px-5 py-3">
                  <dt className="eyebrow">Duration</dt>
                  <dd className="text-[13px] font-medium text-obsidian-900">{duration || "—"}</dd>
                </div>
                <div className="flex items-baseline justify-between bg-bone-100/50 px-5 py-4">
                  <dt className="eyebrow-ink">Contract Value</dt>
                  <dd className="figure text-[19px]">
                    ${previewTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}
                  </dd>
                </div>
              </dl>

              <div className="border-t border-obsidian-900/10 p-5">
                <button
                  type="button"
                  onClick={deployLiveProposalRecord}
                  disabled={isDeploying || generatedItems.length === 0}
                  className="btn-ink w-full py-3.5 text-[12.5px]"
                >
                  {isDeploying ? "Publishing..." : "Publish Proposal"}
                </button>
                {generatedItems.length === 0 && (
                  <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-architect text-graphite-300">
                    Generate scope to enable
                  </p>
                )}
              </div>
            </div>

            {proposalLink && (
              <div className="panel mt-4 animate-rise overflow-hidden border-patina-200">
                <div className="flex items-center gap-2 border-b border-patina-200 bg-patina-50 px-5 py-3">
                  <span className="badge-dot bg-patina-500" />
                  <p className="font-mono text-[10px] font-medium uppercase tracking-architect text-patina-700">Proposal Live</p>
                </div>
                <div className="space-y-3 p-5">
                  {proposalNumber && (
                    <div className="flex items-baseline justify-between">
                      <span className="eyebrow">Document No.</span>
                      <span className="font-mono text-[11px] font-medium tracking-architect text-obsidian-900">{proposalNumber}</span>
                    </div>
                  )}
                  <input
                    type="text"
                    readOnly
                    value={proposalLink}
                    className="field-sunken select-all font-mono text-[11px]"
                  />
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
