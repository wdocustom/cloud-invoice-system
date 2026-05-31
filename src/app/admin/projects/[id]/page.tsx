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

  // Selector Creation Variables
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
    if (!confirm("Wipe out planned vetting options?")) return;
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

  if (loading) return <div className="p-12 text-center text-xs text-slate-400">Opening file drawer...</div>;
  if (!project) return <div className="p-12 text-center text-red-500">File execution not found.</div>;

  const homeownerLink = `${window.location.origin}/invoice/${id}`;

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 font-sans text-slate-900">
      <div className="max-w-4xl mx-auto space-y-4">
        
        <div className="flex justify-between items-center">
          <button type="button" onClick={() => router.push("/admin/projects")} className="text-xs font-bold text-slate-500 hover:text-slate-800 transition">
            ← Back to Backlog Pipeline Ledger
          </button>
          
          {/* Real-time Status Badge Indicator */}
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${
            project.status === 'approved' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200'
          }`}>
            Proposal Status: {project.status}
          </span>
        </div>

        {/* NEW: Quick Copy Shared Client Link Panel */}
        <div className="bg-blue-600 text-white rounded-lg p-4 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left">
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-100">Homeowner Shared Portal URL</h4>
            <p className="text-xs font-mono bg-blue-700/50 px-2 py-1 rounded text-blue-50 max-w-xl truncate mt-1 select-all">
              {homeownerLink}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopyLink}
            className={`w-full sm:w-auto text-xs font-bold px-4 py-2.5 rounded-md shadow-sm uppercase transition whitespace-nowrap ${
              copied ? 'bg-emerald-500 text-white' : 'bg-white text-blue-700 hover:bg-blue-50'
            }`}
          >
            {copied ? "✓ Copied!" : "Copy Portal Link"}
          </button>
        </div>

        {/* Dashboard Workspace Frame */}
        <div className="bg-white rounded-lg border p-8 shadow-sm text-left space-y-6">
          <div className="border-b pb-4 flex justify-between items-start">
            <div>
              <h1 className="text-xl font-bold text-slate-900">{project.homeowner_name} Operational Workspace</h1>
              <p className="text-xs text-slate-500 mt-0.5">📍 Jobsite Framework: {project.job_address}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Project Value</p>
              <p className="text-base font-mono font-bold text-slate-900">${project.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Left Column: Financials & Project Progress */}
            <div className="space-y-6">
              <div className="p-4 bg-slate-50 rounded-lg border space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Progress & Draws Tracker</h3>
                <div>
                  <p className="text-xs text-slate-500 uppercase">Current Stage Profile Index: {project.current_phase_index || 0}</p>
                  <p className="text-sm font-bold text-blue-600 mt-0.5">
                    {project.payment_phases?.[project.current_phase_index || 0]?.name || "Mobilization Staging"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => shiftPhase(false)} disabled={(project.current_phase_index || 0) === 0} className="flex-1 bg-white hover:bg-slate-50 disabled:opacity-40 border p-1.5 rounded text-xs font-bold uppercase transition">◀ Reverse Stage</button>
                  <button type="button" onClick={() => shiftPhase(true)} disabled={(project.current_phase_index || 0) === (project.payment_phases?.length || 1) - 1} className="flex-1 bg-slate-900 hover:bg-slate-800 text-white p-1.5 rounded text-xs font-bold uppercase transition">Advance Draw ▶</button>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mobilization Financial Clearance</h3>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded border ${project.deposit_cleared ? 'bg-emerald-50 text-emerald-700 border-emerald-200':'bg-red-50 text-red-700 border-red-200'}`}>
                    {project.deposit_cleared ? "💰 Deposit Cleared" : "🛑 Deposit Awaiting Review"}
                  </span>
                  <button type="button" onClick={toggleDeposit} className="text-xs font-bold underline text-slate-600 hover:text-slate-900">Toggle Status</button>
                </div>
              </div>
            </div>

            {/* Right Column: Homeowner Vetted Selections Engine */}
            <div className="p-4 bg-blue-50/20 border border-blue-100 rounded-lg space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider">Deploy Homeowner Selections Vetting Options</h3>
                {project.homeowner_options?.length > 0 && <button type="button" onClick={handleClearAllOptions} className="text-[10px] text-red-500 font-bold hover:underline">Wipe Options</button>}
              </div>
              <p className="text-[11px] text-slate-500">Inject pre-vetted material specs that fit perfectly within your target margins. Homeowners can only choose from this selection.</p>

              {/* Existing Options List */}
              <div className="divide-y border rounded bg-white max-h-36 overflow-y-auto shadow-sm">
                {project.homeowner_options?.map((group: OptionGroup, idx: number) => (
                  <div key={idx} className="p-2.5 text-xs text-left">
                    <p className="font-bold text-slate-800 uppercase text-[10px] tracking-wide mb-1">🛠 {group.category}:</p>
                    <p className="text-slate-500 font-medium mb-1">{group.choices.join("  |  ")}</p>
                    {project.homeowner_selections?.[group.category] ? (
                      <p className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-bold inline-block">
                        ✓ Selected: {project.homeowner_selections[group.category]}
                      </p>
                    ) : (
                      <p className="text-[9px] text-amber-500 font-medium italic">Awaiting client selection...</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Build Option Form */}
              <form onSubmit={handlePushOptionGroup} className="space-y-2 border-t pt-2">
                <input type="text" placeholder="Selection Group (e.g., Guest Bath Tile)" required value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-2 border rounded text-xs bg-white" />
                <input type="text" placeholder="Available Choices (separated by comma, e.g., Matte Black, Gloss White)" required value={choicesText} onChange={(e) => setChoicesText(e.target.value)} className="w-full p-2 border rounded text-xs bg-white" />
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded tracking-wide uppercase shadow-sm transition">Inject Selections Group</button>
              </form>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}