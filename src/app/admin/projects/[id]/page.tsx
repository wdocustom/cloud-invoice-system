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
    if (!confirm("Wipe planned option arrays?")) return;
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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center font-sans text-slate-500">
      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!project) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-red-400 font-bold">Workspace link not found.</div>;

  const homeownerLink = `${window.location.origin}/invoice/${id}`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased pb-24">
      <div className="max-w-4xl mx-auto px-4 pt-12 space-y-6">
        
        <div className="flex justify-between items-center">
          <button type="button" onClick={() => router.push("/admin/projects")} className="text-xs font-black text-slate-500 hover:text-slate-300 transition-colors uppercase tracking-wider">
            ← Back to pipeline ledger
          </button>
          <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border ${
            project.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}>
            Proposal: {project.status}
          </span>
        </div>

        {/* Quick Link Share Panel */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-800 border border-blue-600 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left shadow-lg shadow-blue-950/20">
          <div className="space-y-1 max-w-xl truncate w-full">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-200">Homeowner Shared Portal Link URL</h4>
            <p className="text-xs font-mono bg-slate-950/40 px-3 py-2 rounded-xl text-blue-50 tracking-wide select-all truncate mt-1">
              {homeownerLink}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopyLink}
            className={`w-full sm:w-auto text-xs font-black px-5 py-3 rounded-xl shadow-md uppercase tracking-wider transition-all duration-200 whitespace-nowrap shrink-0 ${
              copied ? 'bg-emerald-600 text-white' : 'bg-white text-blue-800 hover:bg-slate-100'
            }`}
          >
            {copied ? "✓ Link Copied!" : "Copy Portal Link"}
          </button>
        </div>

        {/* Core Workspace Frame */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 text-left space-y-6 shadow-xl">
          <div className="border-b border-slate-800 pb-5 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div className="space-y-1">
              <h1 className="text-xl font-black tracking-tight text-white uppercase">{project.homeowner_name} File Workspace</h1>
              <p className="text-xs text-slate-400 font-medium">📍 Framework Jobsite: {project.job_address}</p>
            </div>
            <div className="sm:text-right border-t sm:border-transparent border-slate-800 pt-3 sm:pt-0">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Project Value</p>
              <p className="text-lg font-mono font-bold text-white tracking-tight mt-0.5">${project.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Progress Telemetry */}
            <div className="space-y-4">
              <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-4">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-900 pb-2">Draw Tracker</h3>
                <div className="space-y-0.5">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Active Construction Level index: {project.current_phase_index || 0}</p>
                  <p className="text-sm font-bold text-blue-400 tracking-wide mt-1">🚧 {project.payment_phases?.[project.current_phase_index || 0]?.name || "Mobilization Setup"}</p>
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => shiftPhase(false)} disabled={(project.current_phase_index || 0) === 0} className="flex-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 border border-slate-800 p-2 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-300 transition-all">◀ Back Step</button>
                  <button type="button" onClick={() => shiftPhase(true)} disabled={(project.current_phase_index || 0) === (project.payment_phases?.length || 1) - 1} className="flex-1 bg-slate-100 hover:bg-white text-slate-900 p-2 rounded-xl text-[10px] font-black uppercase tracking-wider text-center transition-all">Advance Draw ▶</button>
                </div>
              </div>

              <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-900 pb-2">Financial Clearance</h3>
                <div className="flex items-center justify-between pt-1">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border ${project.deposit_cleared ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20':'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                    {project.deposit_cleared ? "💰 Deposit Cleared" : "🛑 Deposit Pending"}
                  </span>
                  <button type="button" onClick={toggleDeposit} className="text-xs font-bold text-slate-400 hover:text-white underline transition-colors">Toggle Clearance</button>
                </div>
              </div>
            </div>

            {/* Right Column: Dynamic Selections Box Engine */}
            <div className="p-5 bg-blue-500/5 border border-blue-950/60 rounded-xl space-y-4 text-left">
              <div className="flex justify-between items-center border-b border-blue-950/40 pb-2">
                <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest">Material Spec Injector</h3>
                {project.homeowner_options?.length > 0 && <button type="button" onClick={handleClearAllOptions} className="text-[10px] text-red-400 font-bold hover:underline tracking-wide uppercase">Wipe Sheet</button>}
              </div>

              {/* Selection Options List Matrix */}
              <div className="divide-y divide-slate-900 border border-slate-800 bg-slate-950 rounded-xl max-h-44 overflow-y-auto shadow-inner">
                {project.homeowner_options?.map((group: OptionGroup, idx: number) => (
                  <div key={idx} className="p-3 text-xs space-y-1">
                    <p className="font-bold text-slate-300 uppercase text-[9px] tracking-widest">🛠 {group.category}:</p>
                    <p className="text-slate-500 font-semibold text-[11px] leading-tight">{group.choices.join("  |  ")}</p>
                    {project.homeowner_selections?.[group.category] ? (
                      <p className="text-[9px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-black tracking-wide inline-block uppercase mt-1">
                        ✓ Choice: {project.homeowner_selections[group.category]}
                      </p>
                    ) : (
                      <p className="text-[9px] text-amber-500/80 font-bold italic mt-0.5">Awaiting homeowner choice...</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Build Option Inputs Block Form */}
              <form onSubmit={handlePushOptionGroup} className="space-y-2 pt-1">
                <input type="text" placeholder="Component Category (e.g., Basement Paint Trim)" required value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-blue-500 rounded-xl text-xs outline-none transition-all placeholder:text-slate-600" />
                <input type="text" placeholder="Available Options (comma separated, e.g., Iron Ore, Pure White)" required value={choicesText} onChange={(e) => setChoicesText(e.target.value)} className="w-full p-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-blue-500 rounded-xl text-xs outline-none transition-all placeholder:text-slate-600" />
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-black py-2.5 rounded-xl tracking-wider uppercase shadow-md shadow-blue-950/50 transition-all">Inject Category Group</button>
              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}