"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toNum } from "@/lib/utils";
import type { Invoice } from "@/lib/types";

interface HomeownerPortalProps {
  id: string;
  initialInvoice: Invoice | null;
  initialChangeOrders: any[];
  initialScheduleTasks: any[];
  initialDailyLogs: any[];
}

export default function HomeownerPortalClient({
  id,
  initialInvoice,
  initialChangeOrders,
  initialScheduleTasks,
  initialDailyLogs,
}: HomeownerPortalProps) {
  const searchParams = useSearchParams();
  const paymentStatus = searchParams.get("payment");

  const [invoice, setInvoice] = useState<Invoice | null>(initialInvoice);
  const [changeOrders, setChangeOrders] = useState<any[]>(initialChangeOrders);
  const [scheduleTasks, setScheduleTasks] = useState<any[]>(initialScheduleTasks);
  const [dailyLogs, setDailyLogs] = useState<any[]>(initialDailyLogs);

  const [tier, setTier] = useState<"mid" | "high">("mid");
  const [activeIndices, setActiveIndices] = useState<number[]>([]);
  const [expandedIndices, setExpandedIndices] = useState<number[]>([]);
  const [showTerms, setShowTerms] = useState(false);
  const [typedSignature, setTypedSignature] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "check">("stripe");
  const [expandedCoId, setExpandedCoId] = useState<string | null>(null);
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [qaMessage, setQaMessage] = useState("");
  const [isSendingQa, setIsSendingQa] = useState(false);

  useEffect(() => {
    if (initialInvoice?.items && activeIndices.length === 0) {
      setActiveIndices(initialInvoice.items.map((_: any, idx: number) => idx));
    }
  }, []);

  useEffect(() => {
    if (id) {
      logTelemetryView();
      fetchInvoiceData();
    }
  }, [id]);

  async function logTelemetryView() {
    const ua = navigator.userAgent;
    let device = "Desktop";
    if (/Mobi|Android|iPhone|iPad/i.test(ua)) {
      device = /iPhone|iPad/i.test(ua) ? "Mobile (iOS)" : "Mobile (Android)";
    }

    let browser = "Unknown";
    if (ua.indexOf("Chrome") > -1 && ua.indexOf("Edge") === -1) browser = "Chrome";
    else if (ua.indexOf("Edge") > -1) browser = "Edge";
    else if (ua.indexOf("Safari") > -1 && ua.indexOf("Chrome") === -1) browser = "Safari";
    else if (ua.indexOf("Firefox") > -1) browser = "Firefox";

    try {
      await fetch("/api/track-view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_id: id,
          device,
          browser,
          referrer: document.referrer || null,
          screen: `${window.screen.width}x${window.screen.height}`,
        }),
      });
    } catch (err) {
      console.error("Telemetry collection exception:", err);
    }
  }

  async function fetchInvoiceData() {
    const { data: mainProject } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", id)
      .single();

    if (mainProject) {
      setInvoice(mainProject);
      if (mainProject.items) {
        setActiveIndices(mainProject.items.map((_: any, idx: number) => idx));
      }

      const { data: children } = await supabase
        .from("invoices")
        .select("*")
        .eq("parent_id", id)
        .order("created_at", { ascending: true });
      if (children) setChangeOrders(children);

      const { data: schedule } = await supabase
        .from("project_schedules")
        .select("*")
        .eq("project_id", id)
        .order("sort_order", { ascending: true })
        .order("target_start_date", { ascending: true });
      if (schedule) setScheduleTasks(schedule);

      const { data: logs } = await supabase
        .from("project_logs")
        .select("*")
        .eq("project_id", id)
        .order("created_at", { ascending: false });
      if (logs) setDailyLogs(logs);
    }
  }

  const isLocked = invoice?.status === "approved";
  const masterItems = invoice?.items || [];

  const baseTotal = isLocked
    ? toNum(invoice.amount)
    : masterItems.reduce((sum: number, item: any, idx: number) => {
        if (activeIndices.includes(idx)) {
          const costValue = tier === "mid" ? toNum(item.mid_cost) : toNum(item.high_cost);
          return sum + (costValue || 0);
        }
        return sum;
      }, 0);

  const approvedCoTotal = changeOrders
    .filter((co: any) => co.status === "approved")
    .reduce((sum: number, co: any) => sum + toNum(co.amount), 0);

  const combinedProjectTotal = baseTotal + approvedCoTotal;
  const depositAmount = baseTotal * ((invoice?.deposit_percentage || 20) / 100);

  const handleRemoveIndex = (idx: number) => {
    if (isLocked) return;
    setActiveIndices(activeIndices.filter((i: number) => i !== idx));
  };

  const handleReinstateIndex = (idx: number) => {
    if (isLocked) return;
    setActiveIndices([...activeIndices, idx].sort((a: number, b: number) => a - b));
  };

  const toggleExpandDescription = (idx: number) => {
    if (expandedIndices.includes(idx)) {
      setExpandedIndices(expandedIndices.filter((i) => i !== idx));
    } else {
      setExpandedIndices([...expandedIndices, idx]);
    }
  };

  const handleSelectMaterialChoice = async (category: string, value: string) => {
    if (!invoice) return;
    const currentSelections = invoice.homeowner_selections || {};
    const updatedSelections = { ...currentSelections, [category]: value };

    const { error } = await supabase
      .from("invoices")
      .update({ homeowner_selections: updatedSelections })
      .eq("id", id);

    if (!error) fetchInvoiceData();
  };

  const executeOneClickCoApproval = async (coId: string) => {
    if (!confirm("Authorize and append this change order supplement to your project contract?")) return;
    const { error } = await supabase.from("invoices").update({ status: "approved" }).eq("id", coId);
    if (error) alert("Approval exception processing validation token.");
    else fetchInvoiceData();
  };

  const initiateStripePayment = async (amount: number, description: string, phaseIndex?: number) => {
    setIsPaymentLoading(true);
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_id: id,
          amount,
          description,
          phase_index: phaseIndex,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Payment session could not be created.");
      }
    } catch {
      alert("Payment service temporarily unavailable.");
    } finally {
      setIsPaymentLoading(false);
    }
  };

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedSignature.trim()) return alert("Please sign with your name to authorize approval.");
    setIsSubmitting(true);
    const timestamp = new Date().toISOString();

    const finalizedItems = masterItems.filter((_: any, idx: number) => activeIndices.includes(idx)).map((item: any) => ({
      title: tier === "mid" ? item.title : (item.high_title || `${item.title} Upgrade`),
      description: tier === "mid" ? item.mid_description : item.high_description,
      cost: tier === "mid" ? toNum(item.mid_cost) : toNum(item.high_cost)
    }));

    const { error } = await supabase
      .from("invoices")
      .update({ status: "approved", amount: baseTotal, items: finalizedItems, signature_name: typedSignature, signed_at: timestamp })
      .eq("id", id);

    if (!error) {
      try {
        await supabase.from("project_schedules").delete().eq("project_id", id);

        const fallbackProjectStart = invoice?.estimated_start_date || new Date().toISOString().split("T")[0];
        let runningDateTracker = new Date(fallbackProjectStart + 'T00:00:00');

        const schedulesToInsert = finalizedItems.map((item: any, orderIndex: number) => {
          const taskStartStr = runningDateTracker.toISOString().split("T")[0];
          runningDateTracker.setDate(runningDateTracker.getDate() + 4);
          const taskEndStr = runningDateTracker.toISOString().split("T")[0];
          runningDateTracker.setDate(runningDateTracker.getDate() + 1);

          return {
            project_id: id,
            task_name: item.title,
            target_start_date: taskStartStr,
            target_end_date: taskEndStr,
            parent_id: null,
            progress_percent: 0,
            status: "scheduled",
            sort_order: orderIndex * 10,
            color_theme: "bg-amber-400/20 text-amber-800 border-amber-300"
          };
        });

        if (schedulesToInsert.length > 0) {
          await supabase.from("project_schedules").insert(schedulesToInsert);
        }
      } catch (ganttErr) {
        console.error("Auto-Gantt orchestration failure:", ganttErr);
      }

      fetchInvoiceData();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    setIsSubmitting(false);
  };

  if (!invoice) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans text-slate-700 font-bold">Proposal data missing.</div>;

  let dynamicTimelineIndex = 0;
  if (isLocked) {
    if (invoice.deposit_cleared) {
      dynamicTimelineIndex = 1 + (invoice.current_phase_index || 0);
    } else {
      dynamicTimelineIndex = 1;
    }
  }

  const standardMilestones = [
    { title: "Proposal", subtitle: "Locked" },
    { title: "Deposit", subtitle: "Initiated" },
    { title: "Rough-In", subtitle: "Utilities" },
    { title: "Finishes", subtitle: "Trim Out" },
    { title: "Hand-off", subtitle: "Turnover" }
  ];

  const masterMilestones = scheduleTasks.filter(t => !t.parent_id);
  const getSubTasksForMilestone = (parentId: string) => scheduleTasks.filter(t => t.parent_id === parentId);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans antialiased pb-24 text-left selection:bg-slate-900/10 tracking-normal">

      {/* Top Professional Accent Header Bar */}
      <div className="bg-slate-900 text-white shadow-sm border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-5 flex items-center justify-between">
          <h1 className="text-sm font-black tracking-wider uppercase text-slate-200">WDO Custom Client Hub</h1>
          <span className={`px-3 py-1 rounded-md text-[9px] font-black tracking-widest uppercase border ${
            isLocked ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}>
            • {invoice.status}
          </span>
        </div>
      </div>

      {/* Contractor & Project Info Cards */}
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-1.5">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 mb-2">Contractor</p>
            <p className="font-black text-slate-900 text-sm tracking-tight">WDO Custom</p>
            <p className="text-xs font-bold text-slate-700">Skyler Camacho</p>
            <p className="text-[11px] font-bold text-slate-500">LIC-1901422</p>
            <p className="text-[11px] font-bold text-slate-500">402-819-8558</p>
            <p className="text-[11px] font-mono font-bold text-slate-500">skyler@wdocustom.com</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-1.5">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 mb-2">Project Details</p>
            <p className="font-black text-slate-900 text-sm tracking-tight">{invoice.homeowner_name || "Client"}</p>
            <p className="text-xs font-bold text-slate-700">{invoice.job_address || "Address Pending"}</p>
            {(invoice as any).project_title && (
              <p className="text-[11px] font-black text-blue-600 uppercase tracking-wide mt-1">{(invoice as any).project_title}</p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pt-6">

        {/* Payment Status Banner */}
        {paymentStatus === "success" && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 text-xs text-emerald-800 font-bold flex items-center gap-2">
            <span className="text-base">✓</span> Payment received successfully. Your account will be updated shortly.
          </div>
        )}
        {paymentStatus === "cancelled" && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-xs text-amber-800 font-bold flex items-center gap-2">
            <span className="text-base">⚠</span> Payment was cancelled. You can retry at any time using the payment options below.
          </div>
        )}

        {/* Dynamic Responsive Split Layout Blueprint Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* LEFT CONTAINER COMPONENT FRAME */}
          <div className="lg:col-span-2 space-y-4">

            {/* Global Tier Option Selector Card */}
            {!isLocked && (invoice as any).show_luxury_tier && (
              <div className="bg-white border border-slate-200/60 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.01)] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-0.5 text-left">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">Project Specification Grade</h4>
                  <p className="text-[11px] text-slate-400 font-medium">Toggle configuration tiers to view alternative finish options and live project cost updates instantly.</p>
                </div>
                <div className="bg-slate-100 p-0.5 rounded-lg flex w-full sm:w-auto border border-slate-200/40 shadow-inner shrink-0">
                  <button type="button" onClick={() => setTier("mid")} className={`px-4 py-2 text-xs font-bold rounded-md transition-all duration-150 ${tier === 'mid' ? 'bg-white text-slate-900 shadow-sm font-black border' : 'text-slate-500 hover:text-slate-900'}`}>
                    Standard Mid-Tier
                  </button>
                  <button type="button" onClick={() => setTier("high")} className={`px-4 py-2 text-xs font-bold rounded-md transition-all duration-150 flex items-center justify-center gap-1.5 ${tier === 'high' ? 'bg-slate-900 text-white shadow-sm font-black' : 'text-slate-600 hover:text-slate-900'}`}>
                    💎 Luxury High-Tier
                  </button>
                </div>
              </div>
            )}

            {isLocked && (
              <div className="bg-emerald-50/60 border border-emerald-200/60 rounded-xl p-4 text-xs text-slate-700 leading-relaxed">
                <strong>✓ Contract Bounds Signed & Live.</strong> Skyler Camacho is delighted to bring production frameworks onto your home! Monitor active milestones on site targets via the tracker sub-ledgers below.
              </div>
            )}

            {/* HIGH-DENSITY INTERACTIVE SCHEDULE PROGRESS TRACKER */}
            {isLocked && (
              <div className="bg-white border border-slate-200/60 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.01)] space-y-4">
                <div className="text-left border-b pb-2.5 border-slate-100 flex justify-between items-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Construction Stage Progress Tracker</p>
                  <span className={`text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-md border ${invoice.deposit_cleared ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                    {invoice.deposit_cleared ? `Active: ${invoice.payment_phases?.[invoice.current_phase_index || 0]?.name || "Staging"}` : "Staging: Awaiting Clearance"}
                  </span>
                </div>
                <div className="relative flex items-center justify-between w-full pt-2 pb-1 overflow-x-auto scrollbar-none">
                  <div className="absolute left-4 right-4 top-[18px] h-0.5 bg-slate-100 z-0">
                    <div className="h-full bg-slate-900 transition-all duration-500 rounded-full shadow-sm" style={{ width: `${(dynamicTimelineIndex / (standardMilestones.length - 1)) * 100}%` }} />
                  </div>
                  {standardMilestones.map((step, idx) => {
                    const isCompleted = idx < dynamicTimelineIndex;
                    const isActive = idx === dynamicTimelineIndex;
                    return (
                      <div key={idx} className="flex flex-col items-center relative z-10 text-center shrink-0 w-16 sm:w-20">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] border transition-all duration-300 ${
                          isCompleted ? 'bg-slate-900 border-slate-900 text-white' :
                          isActive ? 'bg-white border-blue-600 text-blue-600 scale-110 ring-4 ring-blue-50 font-black' :
                          'bg-white border-slate-200 text-slate-300'
                        }`}>{isCompleted ? "✓" : idx + 1}</div>
                        <p className={`text-[9px] font-black mt-2 uppercase tracking-wide ${isActive ? 'text-blue-600 font-extrabold' : isCompleted ? 'text-slate-800' : 'text-slate-400'}`}>{step.title}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SOPHISTICATED AUTOMATED NESTED GANTT CHART VIEW FOR CLIENT VIEW */}
            {isLocked && scheduleTasks.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-2 border-slate-100">🗓️ Live Construction Timeline Gantt Grid</h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs shadow-inner">
                  {masterMilestones.map((milestone) => {
                    const subTasks = getSubTasksForMilestone(milestone.id);
                    return (
                      <div key={milestone.id} className="bg-white">

                        <div className="p-3 bg-slate-50/40 flex justify-between items-center text-left font-black text-slate-900 text-sm">
                          <div className="flex items-center gap-2">
                            <span>🔼</span>
                            <span>{milestone.task_name}</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-[9px] font-bold text-slate-400 bg-white border px-1.5 py-0.2 rounded-md font-sans">
                              {new Date(milestone.target_start_date + 'T00:00:00').toLocaleDateString(undefined, {month:'short', day:'numeric'})} - {new Date(milestone.target_end_date + 'T00:00:00').toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                            </span>
                            <span className="font-sans font-black text-blue-600 text-[10px]">{milestone.progress_percent}%</span>
                          </div>
                        </div>

                        <div className="divide-y divide-slate-50 pl-6">
                          {subTasks.map((task) => (
                            <div key={task.id} className="p-2.5 flex justify-between items-center gap-4 hover:bg-slate-50/30 transition-colors">
                              <div className="flex items-center gap-2.5 text-left min-w-0 flex-1">
                                <span className="text-slate-300 font-bold">↳</span>
                                <span className="font-bold text-slate-800 truncate">{task.task_name}</span>
                                <div className={`px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-wider shrink-0 ${task.color_theme}`}>
                                  {new Date(task.target_start_date + 'T00:00:00').toLocaleDateString(undefined, {month:'short', day:'numeric'})} – {new Date(task.target_end_date + 'T00:00:00').toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                                </div>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200/40 shadow-inner">
                                  <div className="h-full bg-slate-900 transition-all duration-300" style={{ width: `${task.progress_percent}%` }} />
                                </div>
                                <span className="font-sans font-bold text-slate-500 text-[10px] min-w-[24px] text-right">{task.progress_percent}%</span>
                              </div>
                            </div>
                          ))}
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* HOMEOWNER ACCORDION LOG COMPONENT BLOCK */}
            {isLocked && dailyLogs.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-2 border-slate-100">📸 Field Progress Updates & Logs</h3>
                <div className="divide-y divide-slate-100 max-h-[280px] overflow-y-auto pr-1 text-xs">
                  {dailyLogs.map((log) => (
                    <div key={log.id} className="py-3 space-y-2 first:pt-0">
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                        <span className="uppercase text-slate-600">Daily Log Entry Deployed</span>
                        <span>{new Date(log.created_at).toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'})}</span>
                      </div>
                      <p className="text-slate-600 font-medium leading-relaxed whitespace-pre-line text-left">{log.log_text}</p>
                      {log.photo_urls && log.photo_urls.length > 0 && (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                          {log.photo_urls.map((photoUrl: string, pIdx: number) => (
                            <a key={pIdx} href={photoUrl} target="_blank" rel="noopener noreferrer" className="block relative aspect-video border rounded-lg overflow-hidden bg-slate-50 shadow-sm transition-transform duration-150 hover:scale-102">
                              <img src={photoUrl} className="object-cover w-full h-full" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* HUMAN-FRIENDLY ONBOARDING INSTRUCTION BLOCK */}
            <div className="bg-slate-100/70 border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-[0_1px_2px_rgba(0,0,0,0.01)] select-none">
              <span className="text-blue-500 text-sm">💡</span>
              <p>Click the <span className="font-black text-slate-800 bg-white border border-slate-200 px-1 py-0.2 rounded">+</span> button on any milestone line item to see the full details and project descriptions.</p>
            </div>

            {/* CONDENSED LINE ITEMS FEED ROW PANELS */}
            <div className="space-y-2 bg-transparent">
              {masterItems.map((item: any, idx: number) => {
                const isActive = activeIndices.includes(idx);
                const isExpanded = expandedIndices.includes(idx);
                if (isLocked && !isActive) return null;
                return (
                  <div
                    key={idx}
                    className={`px-5 py-3 rounded-xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.01)] transition-all duration-150 text-xs ${
                      !isActive ? 'opacity-30 select-none border-dashed bg-slate-50/50' : 'hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => toggleExpandDescription(idx)}
                          className="flex items-center justify-center w-5 h-5 rounded border border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300 transition-all font-sans font-black text-xs bg-slate-50/60 shrink-0 outline-none"
                        >
                          {isExpanded ? "−" : "+"}
                        </button>
                        <h4 className="font-extrabold text-slate-900 text-sm tracking-tight truncate">
                          {isLocked ? item.title : (tier === 'mid' ? item.title : item.high_title)}
                        </h4>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 sm:pt-0">
                        <span className="font-sans font-extrabold text-slate-950 text-sm tracking-tight">
                          ${(isLocked ? toNum(item.cost) : (tier === 'mid' ? toNum(item.mid_cost) : toNum(item.high_cost))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        {!isLocked && (
                          isActive ? (
                            <button
                              type="button"
                              onClick={() => handleRemoveIndex(idx)}
                              title="remove item"
                              className="w-5 h-5 flex items-center justify-center rounded bg-red-50 hover:bg-red-500 text-red-500 hover:text-white border border-red-100 transition-all duration-150 outline-none font-sans font-black text-[10px]"
                            >
                              ✕
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleReinstateIndex(idx)}
                              className="bg-blue-50 border border-blue-100 text-blue-700 font-bold text-[9px] px-2 py-1 rounded uppercase tracking-wider shadow-sm transition-all outline-none"
                            >
                              Include
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-2.5 pt-2.5 border-t border-slate-100 pl-7 max-w-3xl text-left animate-fadeIn">
                        <p className="text-slate-500 font-medium leading-relaxed">
                          {isLocked ? item.description : (tier === 'mid' ? item.mid_description : item.high_description)}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Q&A COMMUNICATION THREAD */}
            <div className="border-2 border-blue-200 bg-white rounded-2xl p-5 shadow-md text-left space-y-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-blue-600" />
              <div className="pt-1">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  💬 Questions & Answers
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">Have a question about the proposal? Ask below and we'll respond directly.</p>
              </div>

              <div className="border border-slate-100 rounded-xl max-h-[280px] overflow-y-auto p-4 space-y-3 bg-slate-50/40">
                {Array.isArray((invoice as any).questions) && (invoice as any).questions.length > 0 ? (
                  (invoice as any).questions.map((msg: any, i: number) => (
                    <div key={i} className={`flex ${msg.author === "homeowner" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${
                        msg.author === "homeowner"
                          ? "bg-blue-600 text-white rounded-br-md"
                          : "bg-white border border-slate-200 text-slate-800 rounded-bl-md"
                      }`}>
                        <p>{msg.text}</p>
                        <p className={`text-[9px] mt-1.5 font-bold ${msg.author === "homeowner" ? "text-blue-200" : "text-slate-400"}`}>
                          {msg.author === "homeowner" ? "You" : "Skyler · WDO Custom"} · {new Date(msg.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 space-y-2">
                    <p className="text-2xl">💬</p>
                    <p className="text-xs font-bold text-slate-500">No messages yet</p>
                    <p className="text-[11px] text-slate-400 font-medium">Ask a question about materials, timeline, pricing — we're here to help!</p>
                  </div>
                )}
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!qaMessage.trim()) return;
                  setIsSendingQa(true);
                  const newMsg = { text: qaMessage.trim(), author: "homeowner", timestamp: new Date().toISOString() };
                  const currentMessages = Array.isArray((invoice as any).questions) ? [...(invoice as any).questions] : [];
                  const updated = [...currentMessages, newMsg];
                  try {
                    const { error } = await supabase.from("invoices").update({ questions: updated }).eq("id", id);
                    if (error) throw error;
                    setInvoice((prev: any) => ({ ...prev, questions: updated }));
                    setQaMessage("");
                  } catch {
                    alert("Failed to send message. Please try again.");
                  } finally {
                    setIsSendingQa(false);
                  }
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={qaMessage}
                  onChange={(e) => setQaMessage(e.target.value)}
                  placeholder="Type your question here..."
                  className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-400 focus:bg-white transition shadow-sm"
                />
                <button
                  type="submit"
                  disabled={isSendingQa || !qaMessage.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-black text-[10px] px-5 py-3 rounded-xl uppercase tracking-wider transition shadow-md shrink-0"
                >
                  {isSendingQa ? "..." : "Send"}
                </button>
              </form>
            </div>

            {/* DYNAMIC DESIGN CHOICE BOARD MODULE */}
            {isLocked && invoice.homeowner_options && invoice.homeowner_options.length > 0 && (
              <div className="border border-slate-200/60 bg-white rounded-xl p-5 text-left space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.01)] relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-slate-900" />
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">🎨 Project Materials Selection Board</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Finalize your property finishes below. Tap an entry variant to register allowances logs directly onto the build schedule.</p>
                </div>
                <div className="space-y-3 divide-y divide-slate-100">
                  {invoice.homeowner_options.map((group: any, gIdx: number) => {
                    const chosen = invoice.homeowner_selections?.[group.category];
                    return (
                      <div key={gIdx} className="space-y-2 pt-3 first:pt-0">
                        <p className="text-[11px] font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-900" /> Design Component: Specify {group.category}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {group.choices.map((choice: string, cIdx: number) => {
                            const isChosen = chosen === choice;
                            return (
                              <button type="button" key={cIdx} onClick={() => handleSelectMaterialChoice(group.category, choice)} className={`px-4 py-2 rounded-xl text-xs font-bold border shadow-sm transition-all duration-150 ${isChosen ? 'bg-slate-900 border-transparent text-white font-black' : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}>{choice} {isChosen && "✓"}</button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

          {/* RIGHT SIDEBAR COMPONENT PANEL: FIXED CHECKOUT VALUE HUB */}
          <div className="space-y-4 sticky top-20">

            {/* COMPACT CLEAN SIDEBAR VALUE HUB */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-[0_4px_12px_rgba(15,23,42,0.02)] space-y-5 text-left relative overflow-hidden">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PROJECT TOTAL</p>
                <h2 className="text-3xl font-black text-slate-950 mt-1 tracking-tight">
                  ${toNum(combinedProjectTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h2>
                <div className="mt-3 flex flex-wrap gap-1.5 pt-3 border-t border-slate-100">
                  <span className="text-[9px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-md">
                    Contract Base: ${toNum(baseTotal).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}
                  </span>
                  {approvedCoTotal > 0 && (
                    <span className="text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-md shadow-sm">
                      Appended Variations: +${toNum(approvedCoTotal).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl border border-slate-200/60 p-4 text-xs text-slate-600 space-y-2.5 font-semibold">
                <div className="flex justify-between items-center border-b border-slate-200/40 pb-2">
                  <span className="text-slate-500 font-medium">Construction Deposit ({invoice.deposit_percentage ?? 20}%):</span>
                  <span className="font-sans font-black text-slate-950 text-sm">${toNum(depositAmount).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-500">
                  <span className="text-slate-500 font-medium">Estimated Build Timeline:</span>
                  <span className="font-extrabold text-slate-800 uppercase tracking-wide">{invoice.project_length || "9 Weeks"}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-500">
                  <span className="text-slate-500 font-medium">Start Date*:</span>
                  <span className="font-extrabold text-slate-800">
                    {invoice.estimated_start_date ? new Date(invoice.estimated_start_date + 'T00:00:00').toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' }) : "Jun 15, 2026"}
                  </span>
                </div>
              </div>

              <p className="text-[9px] text-slate-400 font-semibold italic leading-normal px-0.5">* Timelines and milestone sequencing execute immediately following initial deposit clearance log signatures.</p>
            </div>

            {/* CONCISE REARRANGED SIGNATURE MODULE PANEL */}
            <div className="border-t pt-1 border-slate-200/40">
              {isLocked ? (
                <div className="bg-slate-900 text-white rounded-xl p-4 text-center shadow-md relative overflow-hidden border border-slate-800">
                  <p className="text-emerald-400 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5">✓ Contract Execution Bound & Sealed</p>
                  <p className="text-[11px] text-slate-400 mt-1 font-medium">Digital signature verification matching: <span className="font-sans font-extrabold text-white underline tracking-tight">{invoice.signature_name}</span></p>
                  <p className="text-[9px] text-slate-500 font-semibold tracking-wide mt-0.5">Timestamp: {new Date(invoice.signed_at || "").toLocaleString()}</p>
                </div>
              ) : (
                <form onSubmit={handleApprove} className="bg-white border border-slate-200/80 rounded-xl p-5 space-y-3 shadow-md">
                  <div className="text-left">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Project Approval Signature</h3>
                  </div>
                  <div className="space-y-2">
                    <input type="text" required placeholder="Type legal signature..." value={typedSignature} onChange={(e) => setTypedSignature(e.target.value)} className="w-full px-4 py-2.5 rounded-xl outline-none text-xs text-slate-900 bg-slate-50 border border-slate-200 focus:border-slate-900 font-bold transition-all shadow-inner placeholder:text-slate-400" />
                    <button type="submit" disabled={isSubmitting || activeIndices.length === 0} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-xs py-3 rounded-xl tracking-widest uppercase transition-all shadow-md shadow-blue-900/10 outline-none">
                      Accept Proposal
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* DRAW PHASES MATRIX */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm text-left space-y-3">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1.5 border-slate-100">Payment Schedule</h3>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
                {invoice.payment_phases?.map((phase: any, idx: number) => {
                  const phaseVal = baseTotal * (phase.percentage / 100);
                  const activePhaseIdx = invoice.current_phase_index || 0;

                  const isPaid = invoice.deposit_cleared && idx < activePhaseIdx;
                  const isFirstPhaseDepositPaid = invoice.deposit_cleared && idx === 0;
                  const isPhaseActive = isLocked && (idx === activePhaseIdx || (idx === 0 && !invoice.deposit_cleared));
                  const canPayPhase = isPhaseActive && !(isPaid || isFirstPhaseDepositPaid) && idx > 0;

                  return (
                    <div key={idx} className="bg-slate-50/50 border border-slate-200/60 p-2.5 rounded-lg text-xs">
                      <div className="flex justify-between items-center">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <p className="font-extrabold text-slate-800 tracking-tight">{phase.name}</p>
                            {(isPaid || isFirstPhaseDepositPaid) ? (
                              <span className="text-[8px] font-black tracking-widest uppercase px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200/60">PAID</span>
                            ) : isPhaseActive ? (
                              <span className="text-[8px] font-black tracking-widest uppercase px-1 py-0.2 rounded bg-blue-100 text-blue-800 border border-blue-200/60 animate-pulse">ACTIVE</span>
                            ) : (
                              <span className="text-[8px] font-black tracking-widest uppercase px-1 py-0.2 rounded bg-slate-200 text-slate-400">PEND</span>
                            )}
                          </div>
                          <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wide">Draw Allocation: {phase.percentage}%</p>
                        </div>
                        <span className="font-sans font-extrabold text-slate-900">${toNum(phaseVal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      {canPayPhase && (
                        <button
                          type="button"
                          disabled={isPaymentLoading}
                          onClick={() => initiateStripePayment(phaseVal, `${phase.name} - ${invoice.homeowner_name}`, idx)}
                          className="mt-2 w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-black text-[10px] py-2 rounded-lg tracking-wider uppercase transition shadow-sm outline-none"
                        >
                          {isPaymentLoading ? "Connecting..." : `Pay $${toNum(phaseVal).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})} via Stripe`}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PENDING CHANGE ORDERS MODULE */}
            {isLocked && changeOrders.length > 0 && (
              <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-2.5 text-left">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1.5 border-slate-100">Scope Modifications</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {changeOrders.map((co: any) => {
                    const isCoApproved = co.status === "approved";
                    const isCoPaid = co.deposit_cleared;
                    const isExpanded = expandedCoId === co.id;

                    return (
                      <div key={co.id} className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm text-xs">
                        <div onClick={() => setExpandedCoId(isExpanded ? null : co.id)} className="p-3 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors">
                          <div className="text-left space-y-0.5">
                            <p className="font-bold text-slate-900 tracking-tight truncate w-36 sm:w-44">{co.description}</p>
                            <div className="flex gap-1">
                              <span className={`text-[7px] font-black uppercase px-1 rounded ${isCoApproved ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700'}`}>{isCoApproved ? "APP" : "PEND"}</span>
                              {isCoApproved && <span className={`text-[7px] font-black uppercase px-1 rounded ${isCoPaid ? 'bg-blue-50 text-blue-700':'bg-red-50 text-red-700'}`}>{isCoPaid ? "PAID":"UNPD"}</span>}
                            </div>
                          </div>
                          <span className="font-sans font-extrabold text-slate-900">${toNum(co.amount).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                        </div>
                        {isExpanded && (
                          <div className="p-2.5 bg-slate-50 border-t space-y-2.5 animate-fadeIn">
                            <div className="divide-y border bg-white rounded-lg overflow-hidden text-[11px] font-medium text-slate-600">
                              {co.items?.map((item: any, iIdx: number) => (
                                <div key={iIdx} className="p-2 flex justify-between bg-white">
                                  <span className="font-bold text-slate-800 truncate w-32">{item.title}</span>
                                  <span className="font-sans font-bold text-slate-700">${toNum(item.cost).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                                </div>
                              ))}
                            </div>
                            {!isCoApproved && (
                              <button type="button" onClick={() => executeOneClickCoApproval(co.id)} className="w-full bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black py-2.5 rounded-xl tracking-wider uppercase transition shadow-sm outline-none">
                                🔒 Execute Change Order Supplement
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* DEPOSIT REMITTANCE DOCK */}
            {isLocked && !invoice.deposit_cleared && (
              <div className="border border-slate-200 rounded-xl bg-white p-5 text-left space-y-3 shadow-sm animate-fadeIn">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1.5 border-slate-100">Deposit Remittance Channel</h3>
                <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                  <button type="button" onClick={() => setPaymentMethod("stripe")} className={`p-2.5 border rounded-lg text-center transition-all ${paymentMethod === 'stripe' ? 'border-slate-950 bg-slate-50' : 'border-slate-200'}`}>Pay Online</button>
                  <button type="button" onClick={() => setPaymentMethod("check")} className={`p-2.5 border rounded-lg text-center transition-all ${paymentMethod === 'check' ? 'border-slate-950 bg-slate-50' : 'border-slate-200'}`}>Physical Check</button>
                </div>
                {paymentMethod === 'stripe' ? (
                  <div className="space-y-2.5">
                    <p className="text-[11px] text-slate-500 leading-normal font-medium bg-slate-50 border border-slate-200/60 p-2.5 rounded-lg shadow-inner">
                      🔒 Secure payment via Stripe. Card and ACH bank transfer accepted.
                    </p>
                    <button
                      type="button"
                      disabled={isPaymentLoading}
                      onClick={() => initiateStripePayment(depositAmount, `Construction Deposit - ${invoice.homeowner_name}`, 0)}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-black text-xs py-3 rounded-xl tracking-widest uppercase transition-all shadow-md shadow-blue-900/10 outline-none"
                    >
                      {isPaymentLoading ? "Connecting to Stripe..." : `Pay $${toNum(depositAmount).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})} Deposit`}
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 leading-normal font-medium bg-slate-50 border border-slate-200/60 p-2.5 rounded-lg shadow-inner">
                    💵 Make check payable to: <strong className="text-slate-800">WDO Custom</strong>. Field coordinators will confirm receipt upon site staging arrival.
                  </p>
                )}
              </div>
            )}

            {/* LEGAL TERMS ACCORDION */}
            <div className="border border-slate-200 bg-white rounded-xl overflow-hidden shadow-sm text-left">
              <button type="button" onClick={() => setShowTerms(!showTerms)} className="w-full bg-slate-50 px-4 py-2.5 font-bold text-[10px] uppercase tracking-wider flex justify-between items-center text-slate-400 hover:text-slate-700 transition-all outline-none border-0"  >
                <span>⚖️ Binding Terms (Omaha Law Standard)</span>
                <span className="text-[10px] text-slate-400 font-semibold">{showTerms ? "Hide ▲" : "View ▼"}</span>
              </button>
              {showTerms && (
                <div className="p-4 text-[11px] text-slate-400 space-y-2 max-h-40 overflow-y-scroll border-t bg-white leading-relaxed font-medium shadow-inner">
                  <p>This agreement is configured specifically under the building framework of the City of Omaha, Douglas County, Nebraska. All modifications, materials, structural deviations, and framing updates shall be performed in accordance with the International Residential Code (IRC) as amended by local Omaha ordinances.</p>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
