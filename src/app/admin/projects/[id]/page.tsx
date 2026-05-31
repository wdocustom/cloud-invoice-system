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
  const [changeOrders, setChangeOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Material selection state variables
  const [category, setCategory] = useState("");
  const [choicesText, setChoicesText] = useState("");

  // AI Change Order generator variables
  const [coPrompt, setCoPrompt] = useState("");
  const [isGeneratingCO, setIsGeneratingCO] = useState(false);
  const [coLineItems, setCoLineItems] = useState<any[]>([]);
  const [coTitle, setCoTitle] = useState("Change Order Supplement");

  useEffect(() => {
    fetchProjectDetail();
  }, [id]);

  async function fetchProjectDetail() {
    setLoading(true);
    // Fetch Main parent project file configuration rows
    const { data: mainProject } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", id)
      .single();

    if (mainProject) {
      setProject(mainProject);
      
      // Fetch associated Child Change Orders
      const { data: children } = await supabase
        .from("invoices")
        .select("*")
        .eq("parent_id", id)
        .order("created_at", { ascending: true });
      
      if (children) setChangeOrders(children);
    }
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

  // AI CHANGE ORDER WORKBENCH ESTIMATOR COMPILER ENGINE
  const runAiChangeOrderEstimator = async () => {
    if (!coPrompt.trim()) return alert("Please specify the additional trade scope for the AI assistant.");
    setIsGeneratingCO(true);
    try {
      const res = await fetch("/api/generate-scope", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt: `Change Order modification: ${coPrompt}`, 
          address: project.job_address, 
          zipcode: "Omaha" 
        }),
      });
      const data = await res.json();
      if (data.items && Array.isArray(data.items)) {
        // Map elements cleanly to child line configurations
        setCoLineItems(data.items);
      }
    } catch (err) {
      alert("AI compiler failure mapping scope components.");
    }
    setIsGeneratingCO(false);
  };

  const handleUpdateCoField = (idx: number, field: string, value: any) => {
    const updated = [...coLineItems];
    updated[idx] = { ...updated[idx], [field]: value };
    setCoLineItems(updated);
  };

  const deployChangeOrderToPortal = async () => {
    if (coLineItems.length === 0) return alert("Generate or customize scope items before broadcasting.");
    
    const coTotalCost = coLineItems.reduce((sum, item) => sum + (parseFloat(item.mid_cost) || 0), 0);
    const flattenedItems = coLineItems.map(item => ({
      title: item.title,
      description: item.mid_description,
      cost: parseFloat(item.mid_cost) || 0
    }));

    const { error } = await supabase
      .from("invoices")
      .insert([
        {
          parent_id: id, // Maps child reference link straight to master project
          homeowner_name: project.homeowner_name,
          homeowner_email: project.homeowner_email,
          job_address: project.job_address,
          amount: coTotalCost,
          description: coTitle.trim(),
          items: flattenedItems, // Passes standalone trade matrix components
          status: "pending", // Awaiting single-click client approval
          deposit_percentage: 0,
          current_phase_index: 0
        }
      ]);

    if (error) {
      alert("Deployment error: " + error.message);
    } else {
      alert("Change Order published directly to client login view!");
      setCoPrompt("");
      setCoLineItems([]);
      setCoTitle("Change Order Supplement");
      fetchProjectDetail();
    }
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
      <div className="max-w-5xl mx-auto px-4 pt-8 space-y-4">
        
        <div className="flex justify-between items-center">
          <button type="button" onClick={() => router.push("/admin/projects")} className="text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-wider outline-none">
            ← Back to operational line ledger
          </button>
          <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border shadow-sm ${
            project.status === 'approved' ? 'bg-emerald-600 text-white border-transparent' : 'bg-amber-50 text-white border-transparent'
          }`}>
            Proposal Status: {project.status}
          </span>
        </div>

        {/* Shared Link Card */}
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

        {/* Main Operational Panel Card */}
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
            
            {/* Left Column: Progress Toggles & Change Order History Logs */}
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4 shadow-inner">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-200/60 pb-2">Active Draw Target</h3>
                <div>
                  <p className="text-sm font-bold text-slate-800">🚧 Phase: {project.payment_phases?.[project.current_phase_index || 0]?.name || "Mobilization Setup"}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => shiftPhase(false)} disabled={(project.current_phase_index || 0) === 0} className="flex-1 bg-white hover:bg-slate-100 disabled:opacity-30 border border-slate-200 p-2 rounded-xl text-[10px] font-bold uppercase tracking-wider text-slate-600 transition-all">◀ Reverse Step</button>
                  <button type="button" onClick={() => shiftPhase(true)} disabled={(project.current_phase_index || 0) === (project.payment_phases?.length || 1) - 1} className="flex-1 bg-slate-900 hover:bg-slate-800 text-white p-2 rounded-xl text-[10px] font-bold uppercase tracking-wider text-center transition-all">Advance Draw ▶</button>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 shadow-inner">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider border-b border-slate-200/60 pb-2">Financial Setup Clearance</h3>
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border shadow-sm ${project.deposit_cleared ? 'bg-emerald-600 text-white border-transparent':'bg-red-50 text-red-700 border-red-200'}`}>
                    {project.deposit_cleared ? "💰 Deposit Paid / Verified" : "🛑 Awaiting Clearance"}
                  </span>
                  <button type="button" onClick={toggleDeposit} className="text-xs font-bold text-slate-500 hover:text-slate-900 underline transition-colors">Toggle Status</button>
                </div>
              </div>

              {/* NEW Component: Historical Change Orders Monitor Log */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 shadow-inner">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-200/60 pb-2">Active Change Orders Ledger</h3>
                <div className="divide-y divide-slate-200 border bg-white rounded-xl max-h-40 overflow-y-auto">
                  {changeOrders.map((co, cIdx) => (
                    <div key={co.id} className="p-2.5 text-xs flex justify-between items-center bg-white">
                      <div className="text-left">
                        <p className="font-bold text-slate-800">{co.description}</p>
                        <p className="text-[10px] text-slate-400 font-mono">ID ref: #{co.id.slice(0,6)}</p>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">${co.amount.toLocaleString()}</span>
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                          co.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800 animate-pulse'
                        }`}>{co.status}</span>
                      </div>
                    </div>
                  ))}
                  {changeOrders.length === 0 && (
                    <p className="p-4 text-center text-slate-400 text-xs italic">No project modifications executed yet.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: AI CHANGE ORDER COMPILER WORKSPACE SYSTEM */}
            <div className="p-4 bg-blue-50/40 border border-blue-200 rounded-xl space-y-4 text-left shadow-inner">
              <div className="border-b border-blue-200 pb-2">
                <h3 className="text-xs font-black text-blue-900 uppercase tracking-widest">⚡ AI Change Order Worksheet Builder</h3>
                <p className="text-[11px] text-slate-500 mt-1">Describe variations dynamically to execute automatic market pricing structures on additions.</p>
              </div>

              <div className="space-y-2">
                <input 
                  type="text" 
                  placeholder="Change Order Title (e.g., Electrical Addition Supplement)" 
                  value={coTitle}
                  onChange={(e) => setCoTitle(e.target.value)}
                  className="w-full p-2.5 bg-white border rounded-xl text-xs outline-none focus:border-blue-600 shadow-sm font-bold"
                />
                <div className="flex gap-1">
                  <input 
                    type="text" 
                    placeholder="Describe addition (e.g., add 6 can lights in hallway)..." 
                    value={coPrompt}
                    onChange={(e) => setCoPrompt(e.target.value)}
                    className="flex-1 p-2.5 bg-white border rounded-xl text-xs outline-none focus:border-blue-600 shadow-sm"
                  />
                  <button 
                    type="button" 
                    onClick={runAiChangeOrderEstimator}
                    disabled={isGeneratingCO}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold px-3 rounded-xl transition"
                  >
                    {isGeneratingCO ? "Pricing..." : "Run AI"}
                  </button>
                </div>
              </div>

              {/* Editable Temporary AI Result Table Block */}
              {coLineItems.length > 0 && (
                <div className="space-y-2 animate-fadeIn">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Review Generated Variance Additions:</p>
                  <div className="border rounded-xl bg-white divide-y max-h-40 overflow-y-auto text-xs shadow-sm">
                    {coLineItems.map((item, idx) => (
                      <div key={idx} className="p-2.5 flex justify-between gap-3 items-start bg-white">
                        <div className="space-y-0.5 text-left flex-1">
                          <input 
                            type="text" 
                            value={item.title} 
                            onChange={(e) => handleUpdateCoField(idx, "title", e.target.value)}
                            className="font-bold text-slate-900 w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-slate-900 outline-none"
                          />
                          <textarea 
                            rows={1}
                            value={item.mid_description} 
                            onChange={(e) => handleUpdateCoField(idx, "mid_description", e.target.value)}
                            className="text-[11px] text-slate-500 w-full bg-transparent outline-none resize-none"
                          />
                        </div>
                        <input 
                          type="text" 
                          value={item.mid_cost} 
                          onChange={(e) => handleUpdateCoField(idx, "mid_cost", e.target.value)}
                          className="font-mono font-bold text-right text-slate-800 w-16 bg-transparent border-b border-transparent focus:border-slate-900 outline-none"
                        />
                      </div>
                    ))}
                  </div>
                  <button 
                    type="button" 
                    onClick={deployChangeOrderToPortal}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-black py-2.5 rounded-xl uppercase tracking-wider transition shadow-md shadow-slate-950/20"
                  >
                    🚀 Deploy Change Order to Client
                  </button>
                </div>
              )}

              {/* Selections Builder Core Engine Panel Component */}
              <div className="border-t border-blue-200/60 pt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Material Selections Log</h4>
                  {project.homeowner_options?.length > 0 && <button type="button" onClick={handleClearAllOptions} className="text-[10px] text-red-500 hover:underline">Wipe Matrix</button>}
                </div>
                <div className="divide-y border bg-white rounded-xl max-h-32 overflow-y-auto text-xs shadow-sm">
                  {project.homeowner_options?.map((group: OptionGroup, idx: number) => (
                    <div key={idx} className="p-2 flex flex-col text-left bg-white">
                      <p className="font-bold text-slate-400 text-[9px] uppercase tracking-wide">📦 {group.category}:</p>
                      <p className="text-slate-700 font-semibold">{group.choices.join("  |  ")}</p>
                      {project.homeowner_selections?.[group.category] && (
                        <p className="text-[9px] text-emerald-700 font-bold mt-0.5 bg-emerald-50 px-1.5 py-0.5 rounded inline-block self-start">✓ Selected: {project.homeowner_selections[group.category]}</p>
                      )}
                    </div>
                  ))}
                </div>
                <form onSubmit={handlePushOptionGroup} className="space-y-1">
                  <input type="text" placeholder="Selection Key Name..." required value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-2 bg-white border rounded-xl text-xs outline-none" />
                  <input type="text" placeholder="Options choices (comma separated)..." required value={choicesText} onChange={(e) => setChoicesText(e.target.value)} className="w-full p-2 bg-white border rounded-xl text-xs outline-none" />
                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded-xl uppercase tracking-wider shadow-sm transition">Inject Selections Group</button>
                </form>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}