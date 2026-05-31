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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans text-slate-400">
      <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!project) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-700 font-bold">Workspace ledger file not found.</div>;

  const homeownerLink = `${window.location.origin}/invoice/${id}`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased pb-24 text-left">
      <div className="max-w-4xl mx-auto px-4 pt-12 space-y-4">
        
        <div className="flex justify-between items-center">
          <button type="button" onClick={() => router.push("/admin/projects")} className="text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-wider outline-none">
            ← Back to backlog pipeline ledger
          </button>
          <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border shadow-sm ${
            project.status === 'approved' ? 'bg-emerald-600 text-white border-transparent' : 'bg-amber-500 text-white border-transparent'
          }`}>
            Proposal Status: {project.status}
          </span>
        </div>

        {/* Premium Shared Link Top Drawer */}
        <div className="bg-slate-900 text-white rounded-xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left shadow-md">
          <div className="space-y-1 max-w-xl truncate w-full">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Homeowner Shared Access Portal URL</h4>
            <p className="text-xs font-mono bg-slate-950 px-3 py-2 rounded-xl text-slate-300 tracking-wide select-all truncate mt-1 border border-slate-800">
              {homeownerLink}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopyLink}
            className={`w-full sm:w-auto text-xs font-bold px-5 py-3 rounded-xl shadow-sm uppercase tracking-wider transition-all duration-200 whitespace-nowrap shrink-0 border ${
              copied ? 'bg-emerald-600 text-white border-transparent shadow-md' : 'bg-white text-slate-900 hover:bg-slate-100 border-transparent'
            }`}
          >
            {copied ? "✓ Copied Link" : "Copy Shared URL"}
          </button>
        </div>

        {/* Main Workspace Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 text-left space-y-6 shadow-sm">
          <div className="border-b border-slate-100 pb-5 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div className="space-y-0.5">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase">{project.homeowner_name} Production Desk</h1>
              <p className="text-xs text-slate-500 font-medium">📍 Structural Jobsite: {project.job_address}</p>
            </div>
            <div className="sm:text-right border-t sm:border-transparent border-slate-100 pt-3 sm:pt-0">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Locked Contract Value</p>
              <p className="text-lg font-mono font-bold text-slate-900 tracking-tight mt-0.5">${project.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Progress Progress Draws Tracker */}
            <div className="space-y-4">
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4 shadow-inner">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-200/60 pb-2">Active Draw Target</h3>
                <div className="space-y-0.5 text-left">
                  <p className="text-sm font-bold text-slate-800 mt-1">🚧 Phase: {project.payment_phases?.[project.current_phase_index || 0]?.name || "Mobilization Setup"}</p>
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => shiftPhase(false)} disabled={(project.current_phase_index || 0) === 0} className="flex-1 bg-white hover:bg-slate-100 disabled:opacity-30 border border-slate-200 p-2 rounded-xl text-[10px] font-bold uppercase tracking-wider text-slate-600 transition-all outline-none">◀ Reverse Step</button>
                  <button type="button" onClick={() => shiftPhase(true)} disabled={(project.current_phase_index || 0) === (project.payment_phases?.length || 1) - 1} className="flex-1 bg-slate-900 hover:bg-slate-800 text-white p-2 rounded-xl text-[10px] font-bold uppercase tracking-wider text-center transition-all outline-none">Advance Draw ▶</button>
                </div>
              </div>

              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 shadow-inner">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-200/60 pb-2">Financial Setup Clearance</h3>
                <div className="flex items-center justify-between pt-1">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border shadow-sm ${project.deposit_cleared ? 'bg-emerald-600 text-white border-transparent':'bg-red-50 text-red-700 border-red-200'}`}>
                    {project.deposit_cleared ? "💰 Deposit Paid / Verified" : "🛑 Awaiting Clearance"}
                  </span>
                  <button type="button" onClick={toggleDeposit} className="text-xs font-bold text-slate-500 hover:text-slate-900 underline transition-colors outline-none">Toggle Clearance</button>
                </div>
              </div>
            </div>

            {/* Right Column: Spec Selector Dispatcher */}
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4 text-left shadow-inner">
              <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Material Selections Dispatcher</h3>
                {project.homeowner_options?.length > 0 && <button type="button" onClick={handleClearAllOptions} className="text-[10px] text-red-600 font-bold hover:underline tracking-wide uppercase outline-none">Wipe Sheet</button>}
              </div>

              {/* Material Selections Dashboard Log */}
              <div className="divide-y divide-slate-100 border border-slate-200 bg-white rounded-xl max-h-44 overflow-y-auto shadow-sm">
                {project.homeowner_options?.map((group: OptionGroup, idx: number) => (
                  <div key={idx} className="p-3 text-xs space-y-1 text-left">
                    <p className="font-bold text-slate-400 uppercase text-[9px] tracking-wide">📦 {group.category}:</p>
                    <p className="text-slate-700 font-semibold text-[11px] leading-tight">{group.choices.join("  |  ")}</p>
                    {project.homeowner_selections?.[group.category] ? (
                      <p className="text-[9px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-black tracking-wide inline-block uppercase mt-1">
                        ✓ Selected: {project.homeowner_selections[group.category]}
                      </p>
                    ) : (
                      <p className="text-[9px] text-amber-600 font-bold italic mt-0.5">Awaiting homeowner feedback...</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Option Dispatch Inputs Block */}
              <form onSubmit={handlePushOptionGroup} className="space-y-2 pt-1 text-left">
                <input type="text" placeholder="Component Category (e.g., Guest Bath vanity top)" required value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-900 rounded-xl text-xs outline-none transition-all placeholder:text-slate-400 shadow-sm" />
                <input type="text" placeholder="Available Choices (separated by comma, e.g., Calacatta Quartz, White Oak)" required value={choicesText} onChange={(e) => setChoicesText(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-900 rounded-xl text-xs outline-none transition-all placeholder:text-slate-400 shadow-sm" />
                <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-black py-2.5 rounded-xl tracking-wider uppercase transition-all shadow-sm outline-none">Inject Selection Group</button>
              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}