"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

interface OptionGroup {
  category: string;
  choices: string[];
}

export default function ProjectDetailPanel() {
  const { id } = useParams();
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const [category, setCategory] = useState("");
  const [choicesText, setChoicesText] = useState("");

  useEffect(() => {
    fetchProjectDetail();
  }, [id]);

  async function fetchProjectDetail() {
    setLoading(true);
    const { data } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", id)
      .single();

    if (data) setProject(data);
    setLoading(false);
  }

  const toggleDeposit = async () => {
    const { error } = await supabase
      .from("invoices")
      .update({ deposit_cleared: !project.deposit_cleared })
      .eq("id", id);
    if (!error) fetchProjectDetail();
  };

  const shiftPhase = async (increment: boolean) => {
    const curr = project.current_phase_index || 0;
    const nextIdx = increment ? curr + 1 : curr - 1;
    const { error } = await supabase
      .from("invoices")
      .update({ current_phase_index: nextIdx })
      .eq("id", id);
    if (!error) fetchProjectDetail();
  };

  const handlePushOptionGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category.trim() || !choicesText.trim()) return;

    const choicesArray = choicesText.split(",").map(c => c.trim()).filter(Boolean);
    const currentOptions = project.homeowner_options || [];
    
    const updatedOptions = [...currentOptions, { category: category.trim(), choices: choicesArray }];

    const { error } = await supabase
      .from("invoices")
      .update({ homeowner_options: updatedOptions })
      .eq("id", id);

    if (!error) {
      setCategory("");
      setChoicesText("");
      fetchProjectDetail();
    }
  };

  const handleClearAllOptions = async () => {
    if (!confirm("Wipe planned options parameters?")) return;
    const { error } = await supabase
      .from("invoices")
      .update({ homeowner_options: [] })
      .eq("id", id);
    if (!error) fetchProjectDetail();
  };

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}/invoice/${id}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  if (loading) return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center font-sans text-stone-400">
      <div className="w-5 h-5 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!project) return <div className="min-h-screen bg-stone-50 flex items-center justify-center text-stone-700 font-bold">Workspace ledger file not found.</div>;

  const homeownerLink = `${window.location.origin}/invoice/${id}`;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans antialiased pb-24 text-left">
      <div className="max-w-4xl mx-auto px-4 pt-12 space-y-4">
        
        <div className="flex justify-between items-center">
          <button type="button" onClick={() => router.push("/admin/projects")} className="text-xs font-bold text-stone-400 hover:text-stone-900 transition-colors uppercase tracking-wider">
            ← Back to backlog matrix rows
          </button>
          <span className={`text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border ${
            project.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            Proposal Framework: {project.status}
          </span>
        </div>

        {/* Minimal High-Contrast Shared Link Card */}
        <div className="bg-white border border-stone-200 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left shadow-sm">
          <div className="space-y-0.5 max-w-xl truncate w-full">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Homeowner Portal Routing URL</h4>
            <p className="text-xs font-mono bg-stone-50 border border-stone-200 px-3 py-2 rounded-xl text-stone-800 tracking-wide select-all truncate mt-1">
              {homeownerLink}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopyLink}
            className={`w-full sm:w-auto text-xs font-bold px-5 py-3 rounded-xl shadow-sm uppercase tracking-wider transition-all duration-200 whitespace-nowrap shrink-0 border ${
              copied ? 'bg-emerald-600 text-white border-transparent' : 'bg-stone-900 text-white hover:bg-stone-800'
            }`}
          >
            {copied ? "✓ Copied!" : "Copy Portal Link"}
          </button>
        </div>

        {/* Main Workspace Frame Panel Grid */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 text-left space-y-6 shadow-sm">
          <div className="border-b border-stone-100 pb-5 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div className="space-y-0.5">
              <h1 className="text-xl font-bold tracking-tight text-stone-900 uppercase">{project.homeowner_name} Client Profile</h1>
              <p className="text-xs text-stone-500 font-medium">📍 Jobsite: {project.job_address}</p>
            </div>
            <div className="sm:text-right border-t sm:border-transparent border-stone-100 pt-3 sm:pt-0">
              <p className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">Locked Contract Valuation</p>
              <p className="text-lg font-mono font-bold text-stone-900 tracking-tight mt-0.5">${project.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Progress Telemetry Details */}
            <div className="space-y-4">
              <div className="p-5 bg-stone-50 border border-stone-200 rounded-xl space-y-4 shadow-inner">
                <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider border-b border-stone-200/60 pb-2">Draw Tracker</h3>
                <div className="space-y-0.5">
                  <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Active Progress Phase Draw</p>
                  <p className="text-sm font-bold text-stone-900 tracking-wide mt-1">🚧 {project.payment_phases?.[project.current_phase_index || 0]?.name || "Mobilization Down"}</p>
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => shiftPhase(false)} disabled={(project.current_phase_index || 0) === 0} className="flex-1 bg-white hover:bg-stone-100 disabled:opacity-30 border border-stone-200 p-2 rounded-xl text-[10px] font-bold uppercase tracking-wider text-stone-600 transition-all">◀ Back Step</button>
                  <button type="button" onClick={() => shiftPhase(true)} disabled={(project.current_phase_index || 0) === (project.payment_phases?.length || 1) - 1} className="flex-1 bg-stone-900 hover:bg-stone-800 text-white p-2 rounded-xl text-[10px] font-bold uppercase tracking-wider text-center transition-all">Advance Draw ▶</button>
                </div>
              </div>

              <div className="p-5 bg-stone-50 border border-stone-200 rounded-xl space-y-3 shadow-inner">
                <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider border-b border-stone-200/60 pb-2">Financial Staging Status</h3>
                <div className="flex items-center justify-between pt-1">
                  <span className={`text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border ${project.deposit_cleared ? 'bg-emerald-50 text-emerald-700 border-emerald-200':'bg-red-50 text-red-700 border-red-200'}`}>
                    {project.deposit_cleared ? "💰 Deposit Paid / Cleared" : "🛑 Deposit Missing"}
                  </span>
                  <button type="button" onClick={toggleDeposit} className="text-xs font-bold text-stone-500 hover:text-stone-900 underline transition-colors">Toggle Status</button>
                </div>
              </div>
            </div>

            {/* Right Column: Material Choice Injector Engine */}
            <div className="p-5 bg-stone-50 border border-stone-200 rounded-xl space-y-4 text-left shadow-inner">
              <div className="flex justify-between items-center border-b border-stone-200/60 pb-2">
                <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">Material Selection Dispatcher</h3>
                {project.homeowner_options?.length > 0 && <button type="button" onClick={handleClearAllOptions} className="text-[10px] text-red-600 font-bold hover:underline tracking-wide uppercase">Wipe Options</button>}
              </div>

              {/* Material Selections Dashboard Log Sheet */}
              <div className="divide-y divide-stone-100 border border-stone-200 bg-white rounded-xl max-h-44 overflow-y-auto shadow-sm">
                {project.homeowner_options?.map((group: OptionGroup, idx: number) => (
                  <div key={idx} className="p-3 text-xs space-y-1 text-left">
                    <p className="font-bold text-stone-400 uppercase text-[9px] tracking-wide">📦 {group.category}:</p>
                    <p className="text-stone-700 font-semibold text-[11px] leading-tight">{group.choices.join("  |  ")}</p>
                    {project.homeowner_selections?.[group.category] ? (
                      <p className="text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-bold tracking-wide inline-block uppercase mt-1">
                        ✓ Selected: {project.homeowner_selections[group.category]}
                      </p>
                    ) : (
                      <p className="text-[9px] text-amber-600 font-bold italic mt-0.5">Awaiting homeowner feedback...</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Selection Builder Form Controls */}
              <form onSubmit={handlePushOptionGroup} className="space-y-2 pt-1 text-left">
                <input type="text" placeholder="Component Category (e.g., Basement Drywall Sheen)" required value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-2.5 bg-white border border-stone-200 hover:border-stone-300 focus:border-stone-900 rounded-xl text-xs outline-none transition-all placeholder:text-stone-400" />
                <input type="text" placeholder="Available Choices (comma separated, e.g., Flat Matte, Eggshell White)" required value={choicesText} onChange={(e) => setChoicesText(e.target.value)} className="w-full p-2.5 bg-white border border-stone-200 hover:border-stone-300 focus:border-stone-900 rounded-xl text-xs outline-none transition-all placeholder:text-stone-400" />
                <button type="submit" className="w-full bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold py-2.5 rounded-xl tracking-wider uppercase transition-all shadow-sm">Inject Selection Options Group</button>
              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}