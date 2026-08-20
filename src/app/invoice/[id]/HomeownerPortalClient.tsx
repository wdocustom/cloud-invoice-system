"use client";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toNum } from "@/lib/utils";
import { toast } from "@/lib/toast";
import type { Invoice } from "@/lib/types";
import { generateProposalPdf } from "@/lib/generate-pdf";
import { categoryOf } from "@/lib/scope-amendment";
import { TERMS_AND_CONDITIONS } from "@/lib/terms";

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
  const [activeTab, setActiveTab] = useState("proposal");
  const [now, setNow] = useState(Date.now());
  const [lastSeenMessages, setLastSeenMessages] = useState<string | null>(null);
  const [pendingSelection, setPendingSelection] = useState<{ category: string; value: string } | null>(null);

  // Load last-seen timestamp from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(`wdo_msgs_seen_${id}`);
    setLastSeenMessages(stored);
  }, [id]);

  // Mark messages as seen when Messages tab is active
  useEffect(() => {
    if (activeTab === "messages") {
      const ts = new Date().toISOString();
      localStorage.setItem(`wdo_msgs_seen_${id}`, ts);
      setLastSeenMessages(ts);
    }
  }, [activeTab, id]);

  useEffect(() => {
    if (activeTab !== "messages" || !id) return;
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("invoices")
        .select("questions")
        .eq("id", id)
        .single();
      if (data?.questions) {
        setInvoice((prev: any) => prev ? { ...prev, questions: data.questions } : prev);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [activeTab, id]);

  // Live countdown timer
  const expiresAt = (invoice as any)?.proposal_expires_at;
  const hasExpiration = invoice?.status !== "approved" && !!expiresAt;
  const expiresTime = hasExpiration ? new Date(expiresAt).getTime() : 0;
  const timeLeft = expiresTime - now;
  const isExpired = hasExpiration && timeLeft <= 0;
  const isUrgent = hasExpiration && !isExpired && timeLeft < 86400000;

  useEffect(() => {
    if (!hasExpiration || isExpired) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [hasExpiration, isExpired]);

  const formatCountdown = useCallback(() => {
    if (timeLeft <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    const days = Math.floor(timeLeft / 86400000);
    const hours = Math.floor((timeLeft % 86400000) / 3600000);
    const minutes = Math.floor((timeLeft % 3600000) / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);
    return { days, hours, minutes, seconds };
  }, [timeLeft]);

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
  const depositAmount = invoice?.deposit_amount ?? (baseTotal * ((invoice?.deposit_percentage || 20) / 100));

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

  const handleSelectMaterialChoice = (category: string, value: string) => {
    const current = invoice?.homeowner_selections?.[category];
    if (pendingSelection?.category === category && pendingSelection.value === value) {
      setPendingSelection(null);
      return;
    }
    if (current === value) {
      setPendingSelection(null);
      return;
    }
    setPendingSelection({ category, value });
  };

  const confirmSelection = async () => {
    if (!invoice || !pendingSelection) return;
    const currentSelections = invoice.homeowner_selections || {};
    const updatedSelections = { ...currentSelections, [pendingSelection.category]: pendingSelection.value };

    const { error } = await supabase
      .from("invoices")
      .update({ homeowner_selections: updatedSelections })
      .eq("id", id);

    if (!error) {
      fetchInvoiceData();
      try {
        fetch("/api/notify-selection-made", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invoice_id: id,
            category: pendingSelection.category,
            selected_value: pendingSelection.value,
            total_selected: Object.keys(updatedSelections).length,
            total_categories: (invoice.homeowner_options || []).length,
          }),
        });
      } catch {}
    }
    setPendingSelection(null);
  };

  const executeOneClickCoApproval = async (coId: string) => {
    if (!confirm("Authorize and append this change order supplement to your project contract?")) return;
    const { error } = await supabase.from("invoices").update({ status: "approved" }).eq("id", coId);
    if (error) toast("Approval exception processing validation token.", "error");
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
        toast(data.error || "Payment session could not be created.", "error");
      }
    } catch {
      toast("Payment service temporarily unavailable.", "error");
    } finally {
      setIsPaymentLoading(false);
    }
  };

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isExpired) return toast("This proposal has expired. Contact your contractor.", "error");
    if (!typedSignature.trim()) return toast("Please sign your name to approve", "error");
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

      // Fire approval confirmation emails (non-blocking)
      fetch("/api/send-approval-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_id: id,
          base_url: window.location.origin,
        }),
      }).catch((err) => console.error("Approval email failed:", err));

      fetchInvoiceData();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    setIsSubmitting(false);
  };

  if (!invoice) return <div className="min-h-screen bg-brand-alabaster flex items-center justify-center font-sans text-brand-muted font-medium text-sm">Proposal data unavailable.</div>;

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
    <div className="min-h-screen bg-brand-alabaster text-brand-charcoal font-sans antialiased pb-24 text-left selection:bg-luxury-gold/10 tracking-normal">

      {/* Minimal Premium Header */}
      <div className="border-b border-brand-stone/60 bg-white/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-charcoal flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">WDO</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight text-brand-charcoal">WDO Custom</h1>
              <p className="text-[10px] text-brand-muted font-medium">Client Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => generateProposalPdf(invoice as any)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[11px] font-semibold text-brand-charcoal bg-brand-warm border border-brand-stone/50 hover:border-brand-charcoal/30 hover:shadow-soft transition-all duration-200 outline-none"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Download PDF
            </button>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold tracking-wide border ${
              isLocked
                ? 'bg-sage-50 text-sage-700 border-sage-200'
                : 'bg-luxury-soft text-luxury-ochre border-luxury-champagne'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isLocked ? 'bg-sage-500' : 'bg-luxury-gold'}`} />
              {isLocked ? "Active" : "Review"}
            </span>
          </div>
        </div>
      </div>

      {/* Proposal Countdown Timer — sticky below header */}
      {hasExpiration && !isLocked && (
        <div
          onClick={() => {
            if (isExpired) return;
            const el = document.getElementById('approve-section');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
          className={`sticky top-[57px] z-10 border-b transition-colors duration-500 group ${
            isExpired
              ? 'bg-red-50 border-red-200'
              : isUrgent
                ? 'bg-amber-50/80 border-amber-200/60 cursor-pointer'
                : 'bg-brand-warm border-brand-stone/40 cursor-pointer'
          }`}
        >
          <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <svg className={`w-4 h-4 shrink-0 ${isExpired ? 'text-red-500' : isUrgent ? 'text-amber-600' : 'text-brand-muted'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="min-w-0">
                {isExpired ? (
                  <p className="text-[12px] sm:text-[13px] font-semibold text-red-700">This proposal has expired and your schedule hold has been released. Contact your contractor for availability.</p>
                ) : (
                  <>
                    <p className={`text-[12px] sm:text-[13px] font-medium ${isUrgent ? 'text-amber-800' : 'text-brand-charcoal'}`}>
                      Your pricing and schedule hold expires{' '}
                      <span className="font-semibold">
                        {new Date(expiresAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                    </p>
                    <p className={`text-[10px] sm:text-[11px] font-medium mt-0.5 transition-opacity duration-200 opacity-60 group-hover:opacity-100 ${isUrgent ? 'text-amber-700' : 'text-brand-muted'}`}>
                      Approve your proposal to secure your spot ↓
                    </p>
                  </>
                )}
              </div>
            </div>
            {!isExpired && (() => {
              const cd = formatCountdown();
              return (
                <div className="flex items-center gap-1.5 shrink-0">
                  {cd.days > 0 && (
                    <div className={`text-center px-2 py-1 rounded-lg ${isUrgent ? 'bg-amber-100 border border-amber-200' : 'bg-white border border-brand-stone/40'}`}>
                      <p className={`text-[15px] sm:text-[17px] font-bold leading-none ${isUrgent ? 'text-amber-800' : 'text-brand-charcoal'}`} style={{fontVariantNumeric:'tabular-nums'}}>{cd.days}</p>
                      <p className={`text-[8px] font-semibold uppercase tracking-wider mt-0.5 ${isUrgent ? 'text-amber-600' : 'text-brand-muted'}`}>days</p>
                    </div>
                  )}
                  <span className={`text-[13px] font-bold ${isUrgent ? 'text-amber-400' : 'text-brand-stone'}`}>:</span>
                  <div className={`text-center px-2 py-1 rounded-lg ${isUrgent ? 'bg-amber-100 border border-amber-200' : 'bg-white border border-brand-stone/40'}`}>
                    <p className={`text-[15px] sm:text-[17px] font-bold leading-none ${isUrgent ? 'text-amber-800' : 'text-brand-charcoal'}`} style={{fontVariantNumeric:'tabular-nums'}}>{String(cd.hours).padStart(2, '0')}</p>
                    <p className={`text-[8px] font-semibold uppercase tracking-wider mt-0.5 ${isUrgent ? 'text-amber-600' : 'text-brand-muted'}`}>hrs</p>
                  </div>
                  <span className={`text-[13px] font-bold ${isUrgent ? 'text-amber-400' : 'text-brand-stone'}`}>:</span>
                  <div className={`text-center px-2 py-1 rounded-lg ${isUrgent ? 'bg-amber-100 border border-amber-200' : 'bg-white border border-brand-stone/40'}`}>
                    <p className={`text-[15px] sm:text-[17px] font-bold leading-none ${isUrgent ? 'text-amber-800' : 'text-brand-charcoal'}`} style={{fontVariantNumeric:'tabular-nums'}}>{String(cd.minutes).padStart(2, '0')}</p>
                    <p className={`text-[8px] font-semibold uppercase tracking-wider mt-0.5 ${isUrgent ? 'text-amber-600' : 'text-brand-muted'}`}>min</p>
                  </div>
                  <span className={`text-[13px] font-bold ${isUrgent ? 'text-amber-400' : 'text-brand-stone'}`}>:</span>
                  <div className={`text-center px-2 py-1 rounded-lg ${isUrgent ? 'bg-amber-100 border border-amber-200' : 'bg-white border border-brand-stone/40'}`}>
                    <p className={`text-[15px] sm:text-[17px] font-bold leading-none ${isUrgent ? 'text-amber-800' : 'text-brand-charcoal'}`} style={{fontVariantNumeric:'tabular-nums'}}>{String(cd.seconds).padStart(2, '0')}</p>
                    <p className={`text-[8px] font-semibold uppercase tracking-wider mt-0.5 ${isUrgent ? 'text-amber-600' : 'text-brand-muted'}`}>sec</p>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Contractor & Project Info */}
      <div className="max-w-6xl mx-auto px-6 pt-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-6 shadow-soft border border-brand-stone/30 space-y-2.5">
            <p className="text-[10px] font-semibold text-brand-muted uppercase tracking-wider">Your Contractor</p>
            <div className="space-y-1">
              <p className="font-semibold text-brand-charcoal text-[15px] tracking-tight">Skyler Camacho</p>
              <p className="text-[13px] text-brand-muted font-medium">WDO Custom · LIC-1901422</p>
              <div className="flex items-center gap-3 pt-1">
                <span className="text-[12px] text-brand-muted font-medium">402-819-8558</span>
                <span className="text-brand-stone">·</span>
                <span className="text-[12px] text-brand-muted font-medium">skyler@wdocustom.com</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-soft border border-brand-stone/30 space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-semibold text-brand-muted uppercase tracking-wider">Project</p>
              {(invoice as any).proposal_number && (
                <p className="font-mono text-[10px] font-bold text-brand-muted tracking-wider">
                  {(invoice as any).proposal_number}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-brand-charcoal text-[15px] tracking-tight">{invoice.homeowner_name || "Client"}</p>
              <p className="text-[13px] text-brand-muted font-medium">{invoice.job_address || "Address Pending"}</p>
              {(invoice as any).project_title && (
                <p className="text-[12px] font-semibold text-luxury-gold mt-1">{(invoice as any).project_title}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pt-6">

        {/* Payment Status Banner */}
        {paymentStatus === "success" && (
          <div className="bg-sage-50 border border-sage-200 rounded-2xl p-4 mb-6 text-sm text-sage-700 font-medium flex items-center gap-3">
            <span className="w-5 h-5 rounded-full bg-sage-500 text-white flex items-center justify-center text-[10px]">✓</span>
            Payment received. Your account will be updated shortly.
          </div>
        )}
        {paymentStatus === "cancelled" && (
          <div className="bg-luxury-soft border border-luxury-champagne rounded-2xl p-4 mb-6 text-sm text-luxury-ochre font-medium flex items-center gap-3">
            <span className="w-5 h-5 rounded-full bg-luxury-gold text-white flex items-center justify-center text-[10px]">!</span>
            Payment cancelled. You can retry using the payment options below.
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl shadow-soft border border-brand-stone/30 p-1.5 mb-6 flex gap-1 overflow-x-auto scrollbar-none">
          {(isLocked
            ? [
                { key: "overview", label: "Overview" },
                { key: "messages", label: "Messages" },
                { key: "selections", label: "Selections" },
                { key: "payments", label: "Payments" },
                ...((invoice as any)?.contractor_notes?.some((n: any) => n.visible) ? [{ key: "notes", label: "Notes" }] : []),
                { key: "docs", label: "Docs" },
              ]
            : [
                { key: "proposal", label: "Proposal" },
                { key: "messages", label: "Messages" },
                ...(invoice?.selections_visible ? [{ key: "selections", label: "Selections" }] : []),
                ...((invoice as any)?.contractor_notes?.some((n: any) => n.visible) ? [{ key: "notes", label: "Notes" }] : []),
                { key: "schedule", label: "Schedule" },
                { key: "docs", label: "Docs" },
              ]
          ).map((tab) => {
            const tabKey = tab.key;
            const isTabActive = activeTab === tabKey || (!isLocked && activeTab === "overview" && tabKey === "proposal") || (isLocked && activeTab === "proposal" && tabKey === "overview");
            const messages = Array.isArray((invoice as any).questions) ? (invoice as any).questions : [];
            const unreadCount = tabKey === "messages" ? messages.filter((m: any) => m.author === "contractor" && (!lastSeenMessages || new Date(m.timestamp) > new Date(lastSeenMessages))).length : 0;
            const hasUnread = tabKey === "messages" && unreadCount > 0 && activeTab !== "messages";
            return (
              <button
                key={tabKey}
                type="button"
                onClick={() => setActiveTab(tabKey)}
                className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-medium tracking-tight transition-all duration-200 whitespace-nowrap shrink-0 outline-none ${
                  isTabActive
                    ? "bg-brand-charcoal text-white shadow-soft"
                    : hasUnread
                      ? "bg-luxury-soft text-luxury-ochre border border-luxury-champagne font-semibold"
                      : "text-brand-muted hover:text-brand-charcoal hover:bg-brand-warm"
                }`}
              >
                {tab.label}
                {hasUnread && (
                  <span className="flex items-center gap-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-luxury-gold opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-luxury-gold" />
                    </span>
                    <span className="text-[9px] font-bold text-luxury-ochre leading-none">{unreadCount}</span>
                  </span>
                )}
                {tabKey === "messages" && !hasUnread && messages.length > 0 && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none ${isTabActive ? 'bg-white/20 text-white' : 'bg-brand-charcoal/10 text-brand-charcoal'}`}>
                    {messages.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Progress Tracker — always visible post-approval */}
        {isLocked && (
          <div className="bg-white rounded-2xl p-6 shadow-soft border border-brand-stone/30 space-y-4 mb-6">
            <div className="text-left flex justify-between items-center">
              <p className="text-[11px] font-semibold text-brand-muted uppercase tracking-wider">Progress</p>
              <span className={`text-[10px] font-semibold tracking-wide px-2.5 py-1 rounded-lg border ${invoice.deposit_cleared ? 'bg-sage-50 text-sage-700 border-sage-200' : 'bg-luxury-soft text-luxury-ochre border-luxury-champagne'}`}>
                {invoice.deposit_cleared ? `Active: ${invoice.payment_phases?.[invoice.current_phase_index || 0]?.name || "In Progress"}` : "Awaiting Deposit"}
              </span>
            </div>
            <div className="relative flex items-center justify-between w-full pt-3 pb-2 overflow-x-auto scrollbar-none">
              <div className="absolute left-6 right-6 top-[22px] h-[2px] bg-brand-stone/50 z-0 rounded-full">
                <div className="h-full bg-brand-charcoal transition-all duration-700 rounded-full" style={{ width: `${(dynamicTimelineIndex / (standardMilestones.length - 1)) * 100}%` }} />
              </div>
              {standardMilestones.map((step, idx) => {
                const isCompleted = idx < dynamicTimelineIndex;
                const isCurrent = idx === dynamicTimelineIndex;
                return (
                  <div key={idx} className="flex flex-col items-center relative z-10 text-center shrink-0 w-16 sm:w-20">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold border-2 transition-all duration-300 ${
                      isCompleted ? 'bg-brand-charcoal border-brand-charcoal text-white' :
                      isCurrent ? 'bg-white border-luxury-gold text-luxury-gold scale-110 ring-4 ring-luxury-soft shadow-glow-gold' :
                      'bg-white border-brand-stone/60 text-brand-muted/50'
                    }`}>{isCompleted ? "✓" : idx + 1}</div>
                    <p className={`text-[9px] font-semibold mt-2 tracking-wide ${isCurrent ? 'text-luxury-gold font-bold' : isCompleted ? 'text-brand-charcoal' : 'text-brand-muted/50'}`}>{step.title}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Priority announcement / contract status banner */}
        {isLocked && (() => {
          const hasAnnouncement = !!(invoice as any).announcement;
          const daysSinceSigned = invoice.signed_at
            ? (Date.now() - new Date(invoice.signed_at).getTime()) / 86400000
            : 999;
          const showNewContractBanner = daysSinceSigned <= 6;

          if (hasAnnouncement) {
            return (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-soft text-[13px] text-amber-900 font-medium leading-relaxed mb-6 flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5">!</span>
                <p>{(invoice as any).announcement}</p>
              </div>
            );
          }
          if (showNewContractBanner) {
            return (
              <div className="bg-sage-50 border border-sage-200 rounded-2xl p-5 shadow-soft text-[13px] text-sage-700 font-medium leading-relaxed mb-6 flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-sage-500 text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5">✓</span>
                <p>Your contract is signed and active. Skyler Camacho and the WDO Custom team are now managing your project. Use the tabs above to track progress, selections, communicate, and manage payments.</p>
              </div>
            );
          }
          return (
            <div className="bg-brand-warm border border-brand-stone/40 rounded-2xl px-5 py-3.5 shadow-soft text-[13px] text-brand-muted font-medium leading-relaxed mb-6">
              Welcome back, {invoice.homeowner_name?.split(" ")[0] || "there"}. Use the tabs above to track progress, selections, communicate, and manage payments.
            </div>
          );
        })()}

        {/* ═══════════════════════ TAB CONTENT AREA ═══════════════════════ */}

        {/* ── PRE-APPROVAL: PROPOSAL TAB (default) ── */}
        {!isLocked && (activeTab === "proposal" || activeTab === "overview") && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-fade-in">
            <div className="lg:col-span-2 space-y-4">

              {/* Tier Toggle — Premium Pricing Matrix Style */}
              {(invoice as any).show_luxury_tier && (
                <div className="bg-white rounded-2xl shadow-soft border border-brand-stone/30 p-5">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="space-y-0.5 text-left">
                      <h4 className="text-[13px] font-semibold text-brand-charcoal">Specification Grade</h4>
                      <p className="text-[12px] text-brand-muted font-medium">Switch between tier options to compare pricing.</p>
                    </div>
                    <div className="bg-brand-warm p-1 rounded-xl flex w-full sm:w-auto border border-brand-stone/40 shrink-0">
                      <button type="button" onClick={() => setTier("mid")} className={`px-5 py-2.5 text-[12px] font-medium rounded-lg transition-all duration-300 ${tier === 'mid' ? 'bg-white text-brand-charcoal shadow-soft font-semibold' : 'text-brand-muted hover:text-brand-charcoal'}`}>
                        Standard
                      </button>
                      <button type="button" onClick={() => setTier("high")} className={`px-5 py-2.5 text-[12px] font-medium rounded-lg transition-all duration-300 ${tier === 'high' ? 'bg-brand-charcoal text-white shadow-elevated' : 'text-brand-muted hover:text-brand-charcoal'}`}>
                        Luxury
                      </button>
                    </div>
                  </div>
                  {tier === 'high' && (
                    <div className="mt-3 pt-3 border-t border-luxury-champagne/50">
                      <p className="text-[11px] font-medium text-luxury-ochre flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-luxury-gold" />
                        Luxury tier includes premium materials, upgraded finishes, and extended warranties.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Line Items */}
              <div className="space-y-2">
                {masterItems.map((item: any, idx: number) => {
                  const isItemActive = activeIndices.includes(idx);
                  const isExpanded = expandedIndices.includes(idx);
                  const category = categoryOf(item);
                  const startsCategory = idx === 0 || categoryOf(masterItems[idx - 1]) !== category;
                  return (
                    <div key={idx}>
                    {startsCategory && (
                      <div className="flex items-center gap-3 px-1 pt-3 pb-1.5">
                        <span className="text-[10px] font-semibold text-brand-muted uppercase tracking-widest shrink-0">{category}</span>
                        <div className="flex-1 h-px bg-brand-stone/40" />
                      </div>
                    )}
                    <div
                      className={`px-5 py-4 rounded-2xl border bg-white shadow-soft transition-all duration-200 ${
                        !isItemActive ? 'opacity-35 border-dashed border-brand-stone/40 bg-brand-warm/30' : 'border-brand-stone/30 hover:shadow-card hover:border-brand-stone/50'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <button type="button" onClick={() => toggleExpandDescription(idx)} className="flex items-center justify-center w-6 h-6 rounded-lg border border-brand-stone/40 text-brand-muted hover:text-brand-charcoal hover:bg-brand-warm hover:border-brand-stone transition-all duration-150 text-xs shrink-0 outline-none">
                            {isExpanded ? "−" : "+"}
                          </button>
                          <h4 className="font-semibold text-brand-charcoal text-[14px] tracking-tight truncate">
                            {tier === 'mid' ? item.title : item.high_title}
                          </h4>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                          <span className="font-semibold text-brand-charcoal text-[15px] tracking-tight" style={{fontVariantNumeric:'tabular-nums'}}>
                            ${(tier === 'mid' ? toNum(item.mid_cost) : toNum(item.high_cost)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          {isItemActive ? (
                            <button type="button" onClick={() => handleRemoveIndex(idx)} title="remove item" className="w-6 h-6 flex items-center justify-center rounded-lg text-brand-muted hover:bg-red-50 hover:text-red-500 border border-brand-stone/40 hover:border-red-200 transition-all duration-150 outline-none text-[11px]">✕</button>
                          ) : (
                            <button type="button" onClick={() => handleReinstateIndex(idx)} className="bg-brand-warm border border-brand-stone/40 text-brand-charcoal font-medium text-[11px] px-3 py-1.5 rounded-lg hover:border-brand-charcoal/30 transition-all duration-200 outline-none">Add back</button>
                          )}
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-brand-stone/30 pl-9 max-w-3xl text-left animate-fade-in">
                          <p className="text-[13px] text-brand-muted font-medium leading-relaxed">
                            {tier === 'mid' ? item.mid_description : item.high_description}
                          </p>
                        </div>
                      )}
                    </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4 sticky top-20">
              <div className="bg-white rounded-2xl p-6 shadow-premium border border-brand-stone/30 space-y-5 text-left">
                <div>
                  <p className="text-[10px] font-semibold text-brand-muted uppercase tracking-wider">Project Total</p>
                  <h2 className="text-3xl font-bold text-brand-charcoal mt-1.5 tracking-tight font-editorial" style={{fontVariantNumeric:'tabular-nums'}}>
                    ${toNum(combinedProjectTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h2>
                </div>
                <div className="bg-brand-warm rounded-xl border border-brand-stone/40 p-4 text-[13px] text-brand-charcoal space-y-3 font-medium">
                  <div className="flex justify-between items-center pb-2.5 border-b border-brand-stone/40">
                    <span className="text-brand-muted">Deposit ({invoice.deposit_percentage ?? 20}%)</span>
                    <span className="font-semibold" style={{fontVariantNumeric:'tabular-nums'}}>${toNum(depositAmount).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-brand-muted">Timeline</span>
                    <span className="font-semibold">{invoice.project_length || "9 Weeks"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-brand-muted">Start Date</span>
                    <span className="font-semibold">
                      {invoice.estimated_start_date ? new Date(invoice.estimated_start_date + 'T00:00:00').toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' }) : "TBD"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Signature */}
              <div id="approve-section">
              {isExpired ? (
                <div className="bg-red-50 rounded-2xl p-6 space-y-3 shadow-soft border border-red-200">
                  <div className="text-left">
                    <h3 className="text-[13px] font-semibold text-red-800">Proposal Expired</h3>
                    <p className="text-[11px] text-red-600 mt-0.5 leading-relaxed">Your reserved schedule slot and pricing have been released. Reach out to discuss availability and an updated proposal.</p>
                  </div>
                  <a href="tel:4028198558" className="block w-full bg-red-100 text-red-800 font-semibold text-sm py-3 rounded-xl tracking-wide text-center border border-red-200">
                    Call 402-819-8558
                  </a>
                </div>
              ) : (
                <form onSubmit={handleApprove} className="bg-white rounded-2xl p-6 space-y-4 shadow-soft border border-brand-stone/30">
                  <div className="text-left">
                    <h3 className="text-[13px] font-semibold text-brand-charcoal">Approve & Sign</h3>
                    <p className="text-[11px] text-brand-muted mt-0.5">Type your full legal name to authorize this proposal.</p>
                  </div>
                  <input type="text" required placeholder="Your full name" value={typedSignature} onChange={(e) => setTypedSignature(e.target.value)} className="w-full px-4 py-3.5 rounded-xl outline-none text-sm text-brand-charcoal bg-brand-alabaster border border-brand-stone/60 focus:ring-2 focus:ring-luxury-gold/20 focus:border-luxury-gold/50 font-medium transition-all placeholder:text-brand-muted/50" />
                  <button type="submit" disabled={isSubmitting || activeIndices.length === 0} className="w-full bg-brand-charcoal hover:bg-brand-charcoal/90 disabled:bg-brand-stone disabled:text-brand-muted text-white font-semibold text-sm py-3.5 rounded-xl tracking-wide transition-all duration-300 shadow-soft hover:shadow-elevated outline-none">
                    {isSubmitting ? "Processing..." : "Accept Proposal"}
                  </button>
                </form>
              )}
              </div>

              {/* Legal Terms */}
              <div className="bg-white rounded-2xl overflow-hidden shadow-soft border border-brand-stone/30 text-left">
                <button type="button" onClick={() => setShowTerms(!showTerms)} className="w-full px-5 py-3 font-medium text-[12px] flex justify-between items-center text-brand-muted hover:text-brand-charcoal transition-all duration-200 outline-none">
                  <span>Terms & Conditions</span>
                  <span className="text-[11px]">{showTerms ? "▲" : "▼"}</span>
                </button>
                {showTerms && (
                  <div className="px-5 pb-4 text-[12px] text-brand-muted space-y-4 max-h-[50vh] overflow-y-scroll leading-relaxed font-medium border-t border-brand-stone/30 pt-4">
                    <p className="text-[11px] font-semibold text-brand-charcoal">WDO Custom — General Contracting Terms & Conditions</p>
                    {TERMS_AND_CONDITIONS.map((section, i) => (
                      <div key={i} className="space-y-1">
                        <p className="text-[11px] font-semibold text-brand-charcoal">{section.heading}</p>
                        <p>{section.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── POST-APPROVAL: OVERVIEW TAB ── */}
        {isLocked && (activeTab === "overview" || activeTab === "proposal") && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-4">

              {scheduleTasks.length > 0 && (
                <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] space-y-3">
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

              {dailyLogs.length > 0 && (
                <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] space-y-3">
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

              <div className="bg-slate-100/70 border border-slate-200/60 text-slate-600 px-6 py-3 rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] select-none">
                <span className="text-blue-500 text-sm">💡</span>
                <p>Click the <span className="font-black text-slate-800 bg-white border border-slate-200 px-1 py-0.2 rounded">+</span> button on any milestone line item to see the full details and project descriptions.</p>
              </div>

              <div className="space-y-2 bg-transparent">
                {masterItems.map((item: any, idx: number) => {
                  const isItemActive = activeIndices.includes(idx);
                  const isExpanded = expandedIndices.includes(idx);
                  if (!isItemActive) return null;
                  const category = categoryOf(item);
                  // Compare against the previous *included* line — declined lines
                  // are skipped here, so array order alone would misplace a band.
                  const prevShown = masterItems
                    .slice(0, idx)
                    .filter((_: any, i: number) => activeIndices.includes(i))
                    .pop();
                  const startsCategory = !prevShown || categoryOf(prevShown) !== category;
                  return (
                    <div key={idx}>
                    {startsCategory && (
                      <div className="flex items-center gap-3 px-1 pt-3 pb-1.5">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">{category}</span>
                        <div className="flex-1 h-px bg-slate-200" />
                      </div>
                    )}
                    <div className="px-5 py-3 rounded-2xl border border-slate-200/60 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] transition-all duration-200 text-xs hover:border-slate-300">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <button type="button" onClick={() => toggleExpandDescription(idx)} className="flex items-center justify-center w-5 h-5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 hover:border-slate-300 transition-all duration-150 font-sans font-black text-xs bg-slate-50/60 shrink-0 outline-none">
                            {isExpanded ? "−" : "+"}
                          </button>
                          <h4 className="font-extrabold text-slate-900 text-sm tracking-tight truncate">{item.title}</h4>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {item.actual_cost != null && (
                            <span className="text-[10px] text-brand-muted font-medium line-through" style={{fontVariantNumeric:'tabular-nums'}}>
                              ${toNum(item.cost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          )}
                          <span className="font-sans font-extrabold text-slate-950 text-sm tracking-tight" style={{fontVariantNumeric:'tabular-nums'}}>
                            ${toNum(item.actual_cost ?? item.cost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          {item.actual_cost != null && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${toNum(item.actual_cost) > toNum(item.cost) ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                              {toNum(item.actual_cost) > toNum(item.cost) ? '▲' : '▼'} ${Math.abs(toNum(item.actual_cost) - toNum(item.cost)).toLocaleString(undefined, {minimumFractionDigits:2})}
                            </span>
                          )}
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="mt-2.5 pt-2.5 border-t border-slate-100 pl-7 max-w-3xl text-left animate-fadeIn">
                          <p className="text-slate-500 font-medium leading-relaxed">{item.description}</p>
                        </div>
                      )}
                    </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sidebar — signed status + total */}
            <div className="space-y-4 sticky top-20">
              <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.03)] space-y-5 text-left relative overflow-hidden">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PROJECT TOTAL</p>
                  <h2 className="text-3xl font-black text-slate-950 mt-1 tracking-tight" style={{fontVariantNumeric:'tabular-nums'}}>
                    ${toNum(combinedProjectTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h2>
                  <div className="mt-3 flex flex-wrap gap-1.5 pt-3 border-t border-slate-100">
                    <span className="text-[9px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-md" style={{fontVariantNumeric:'tabular-nums'}}>
                      Contract Base: ${toNum(baseTotal).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}
                    </span>
                    {approvedCoTotal > 0 && (
                      <span className="text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-md shadow-sm" style={{fontVariantNumeric:'tabular-nums'}}>
                        Appended Variations: +${toNum(approvedCoTotal).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 text-white rounded-xl p-4 text-center shadow-md relative overflow-hidden border border-slate-800">
                <p className="text-emerald-400 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5">✓ Contract Execution Bound & Sealed</p>
                <p className="text-[11px] text-slate-400 mt-1 font-medium">Digital signature verification matching: <span className="font-sans font-extrabold text-white underline tracking-tight">{invoice.signature_name}</span></p>
                <p className="text-[9px] text-slate-500 font-semibold tracking-wide mt-0.5">Timestamp: {new Date(invoice.signed_at || "").toLocaleString()}</p>
              </div>

              <div className="border border-slate-200/60 bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] text-left">
                <button type="button" onClick={() => setShowTerms(!showTerms)} className="w-full bg-slate-50 px-4 py-2.5 font-bold text-[10px] uppercase tracking-wider flex justify-between items-center text-slate-400 hover:text-slate-700 transition-all duration-200 outline-none border-0">
                  <span>⚖️ Binding Terms (Omaha Law Standard)</span>
                  <span className="text-[10px] text-slate-400 font-semibold">{showTerms ? "Hide ▲" : "View ▼"}</span>
                </button>
                {showTerms && (
                  <div className="p-4 text-[11px] text-slate-400 space-y-4 max-h-[50vh] overflow-y-scroll border-t bg-white leading-relaxed font-medium shadow-inner">
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">WDO Custom — General Contracting Terms & Conditions</p>
                    {TERMS_AND_CONDITIONS.map((section, i) => (
                      <div key={i} className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-600">{section.heading}</p>
                        <p>{section.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── MESSAGES TAB (both pre and post approval) ── */}
        {activeTab === "messages" && (
          <div className="max-w-3xl mx-auto animate-fade-in">
            <div className="bg-white rounded-2xl shadow-soft border border-brand-stone/30 overflow-hidden">
              <div className="px-6 py-4 border-b border-brand-stone/30">
                <h3 className="text-[15px] font-semibold text-brand-charcoal">Messages</h3>
                <p className="text-[12px] text-brand-muted mt-0.5">Questions about your project? We typically respond within a few hours.</p>
              </div>

              <div className="max-h-[440px] overflow-y-auto p-5 space-y-3 bg-brand-warm/30">
                {Array.isArray((invoice as any).questions) && (invoice as any).questions.length > 0 ? (
                  (invoice as any).questions.map((msg: any, i: number) => (
                    <div key={i} className={`flex ${msg.author === "homeowner" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[78%] px-4 py-3 rounded-2xl text-[13px] font-medium leading-relaxed ${
                        msg.author === "homeowner"
                          ? "bg-brand-charcoal text-white rounded-br-md shadow-soft"
                          : "bg-white border border-brand-stone/40 text-brand-charcoal rounded-bl-md shadow-soft"
                      }`}>
                        {msg.image_url && (
                          <a href={msg.image_url} target="_blank" rel="noopener noreferrer" className="block mb-2">
                            <img src={msg.image_url} alt="Attachment" className="max-w-full max-h-52 rounded-lg border border-brand-stone/20" />
                          </a>
                        )}
                        {msg.text && <p>{msg.text}</p>}
                        <p className={`text-[10px] mt-2 font-medium ${msg.author === "homeowner" ? "text-white/50" : "text-brand-muted"}`}>
                          {msg.author === "homeowner" ? "You" : "Skyler · WDO Custom"} · {new Date(msg.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-brand-warm mx-auto flex items-center justify-center border border-brand-stone/40">
                      <svg className="w-5 h-5 text-brand-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    </div>
                    <p className="text-sm font-medium text-brand-charcoal">No messages yet</p>
                    <p className="text-[12px] text-brand-muted">Ask about materials, timeline, pricing — we're here to help.</p>
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
                    fetch("/api/notify-contractor-message", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        homeowner_name: (invoice as any)?.homeowner_name,
                        project_title: (invoice as any)?.project_title,
                        job_address: (invoice as any)?.job_address,
                        message_text: newMsg.text,
                        portal_url: `${window.location.origin}/admin/projects/${id}`,
                      }),
                    }).catch(() => {});
                    setQaMessage("");
                  } catch {
                    toast("Failed to send message. Please try again.", "error");
                  } finally {
                    setIsSendingQa(false);
                  }
                }}
                className="flex gap-2 p-4 border-t border-brand-stone/30 bg-white"
              >
                <input
                  type="text"
                  value={qaMessage}
                  onChange={(e) => setQaMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 p-3.5 bg-brand-alabaster border border-brand-stone/60 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-luxury-gold/20 focus:border-luxury-gold/50 focus:bg-white transition-all placeholder:text-brand-muted/60"
                />
                <button
                  type="submit"
                  disabled={isSendingQa || !qaMessage.trim()}
                  className="bg-brand-charcoal hover:bg-brand-charcoal/90 disabled:opacity-30 text-white font-semibold text-sm px-6 py-3.5 rounded-xl transition-all duration-200 shadow-soft hover:shadow-elevated shrink-0"
                >
                  {isSendingQa ? "..." : "Send"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── PRE-APPROVAL: SCHEDULE TAB ── */}
        {!isLocked && activeTab === "schedule" && (
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] text-left space-y-3">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1.5 border-slate-100">Payment Schedule</h3>
              <div className="space-y-2">
                {invoice.payment_phases?.map((phase: any, idx: number) => {
                  const phaseVal = phase.amount ?? (baseTotal * ((phase.percentage ?? 0) / 100));
                  const phasePercent = phase.percentage ?? (baseTotal > 0 ? (toNum(phase.amount) / baseTotal) * 100 : 0);
                  return (
                    <div key={idx} className="bg-slate-50/50 border border-slate-200/60 p-3 rounded-xl text-xs">
                      <div className="flex justify-between items-center">
                        <div className="space-y-0.5">
                          <p className="font-extrabold text-slate-800 tracking-tight">{phase.name}</p>
                          <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wide">Draw Allocation: {Math.round(phasePercent * 10) / 10}%</p>
                        </div>
                        <span className="font-sans font-extrabold text-slate-900" style={{fontVariantNumeric:'tabular-nums'}}>${toNum(phaseVal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] text-left space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Construction Deposit ({invoice.deposit_percentage ?? 20}%):</span>
                <span className="font-sans font-black text-slate-950 text-sm" style={{fontVariantNumeric:'tabular-nums'}}>${toNum(depositAmount).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Estimated Build Timeline:</span>
                <span className="font-extrabold text-slate-800 uppercase tracking-wide">{invoice.project_length || "9 Weeks"}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Start Date*:</span>
                <span className="font-extrabold text-slate-800">
                  {invoice.estimated_start_date ? new Date(invoice.estimated_start_date + 'T00:00:00').toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' }) : "Jun 15, 2026"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── POST-APPROVAL: SELECTIONS TAB ── */}
        {(isLocked || invoice?.selections_visible) && activeTab === "selections" && (
          <div className="max-w-3xl mx-auto">
            {invoice.homeowner_options && invoice.homeowner_options.length > 0 ? (
              <div className="border border-slate-200/60 bg-white rounded-2xl p-6 text-left space-y-4 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-slate-900" />
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">🎨 Project Materials Selection Board</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Finalize your property finishes below. Tap an entry variant to register allowances logs directly onto the build schedule.</p>
                </div>
                <div className="space-y-3 divide-y divide-slate-100">
                  {invoice.homeowner_options.map((group: any, gIdx: number) => {
                    const chosen = invoice.homeowner_selections?.[group.category];
                    const isPendingCategory = pendingSelection?.category === group.category;
                    return (
                      <div key={gIdx} className="space-y-2 pt-3 first:pt-0">
                        <p className="text-[11px] font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-900" /> Design Component: Specify {group.category}
                          {chosen && !isPendingCategory && <span className="ml-auto text-[10px] font-medium text-emerald-600 normal-case tracking-normal">Selected: {chosen}</span>}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {group.choices.map((choice: any, cIdx: number) => {
                            const choiceLabel = typeof choice === "string" ? choice : choice.label;
                            const imageUrl = typeof choice === "string" ? undefined : choice.image_url;
                            const productUrl = typeof choice === "string" ? undefined : choice.product_url;
                            const isChosen = chosen === choiceLabel && !isPendingCategory;
                            const isPending = isPendingCategory && pendingSelection?.value === choiceLabel;
                            return (
                              <div key={cIdx} className="flex flex-col items-center">
                                {imageUrl && (
                                  <a href={productUrl || "#"} target={productUrl ? "_blank" : undefined} rel="noopener noreferrer" onClick={(e) => { if (!productUrl) e.preventDefault(); }} className="block mb-1.5">
                                    <img src={imageUrl} alt={choiceLabel} className="w-28 h-20 object-cover rounded-lg border border-slate-200" />
                                  </a>
                                )}
                                <button type="button" onClick={() => handleSelectMaterialChoice(group.category, choiceLabel)} className={`px-4 py-2 rounded-xl text-xs font-bold border shadow-sm transition-all duration-150 ${isPending ? 'bg-amber-500 border-amber-600 text-white ring-2 ring-amber-300 font-black' : isChosen ? 'bg-slate-900 border-transparent text-white font-black' : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}>{choiceLabel} {isChosen && "✓"} {isPending && "←"}</button>
                                {productUrl && !imageUrl && (
                                  <a href={productUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-amber-600 hover:text-amber-800 mt-0.5 underline">View product</a>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {isPendingCategory && (
                          <div className="flex items-center gap-2 pt-1">
                            <button type="button" onClick={confirmSelection} className="px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wide bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm">Confirm Selection</button>
                            <button type="button" onClick={() => setPendingSelection(null)} className="px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide bg-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-200 transition-colors">Cancel</button>
                            <span className="text-[10px] text-amber-600 font-medium">Tap confirm to lock in your choice</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200/60 rounded-2xl p-12 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)]">
                <p className="text-3xl mb-3">🎨</p>
                <p className="text-sm font-bold text-slate-500">No material selections available yet</p>
                <p className="text-xs text-slate-400 mt-1">Your contractor will add design choices here as the project progresses.</p>
              </div>
            )}
          </div>
        )}

        {/* ── POST-APPROVAL: PAYMENTS TAB ── */}
        {isLocked && activeTab === "payments" && (
          <div className="max-w-3xl mx-auto space-y-4">

            {/* Deposit Dock */}
            {!invoice.deposit_cleared && (
              <div className="border border-slate-200/60 rounded-2xl bg-white p-6 text-left space-y-3 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] animate-fadeIn">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1.5 border-slate-100">Deposit Remittance Channel</h3>
                <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                  <button type="button" onClick={() => setPaymentMethod("stripe")} className={`p-2.5 border rounded-xl text-center transition-all duration-200 ${paymentMethod === 'stripe' ? 'border-slate-950 bg-slate-50' : 'border-slate-200'}`}>Pay Online</button>
                  <button type="button" onClick={() => setPaymentMethod("check")} className={`p-2.5 border rounded-xl text-center transition-all duration-200 ${paymentMethod === 'check' ? 'border-slate-950 bg-slate-50' : 'border-slate-200'}`}>Physical Check</button>
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
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-black text-xs py-3 rounded-xl tracking-widest uppercase transition-all duration-200 shadow-md hover:shadow-lg shadow-blue-900/10 outline-none"
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

            {/* Payment Schedule */}
            <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] text-left space-y-3">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1.5 border-slate-100">Payment Schedule</h3>
              <div className="space-y-2">
                {invoice.payment_phases?.map((phase: any, idx: number) => {
                  const phaseVal = phase.amount ?? (baseTotal * ((phase.percentage ?? 0) / 100));
                  const phasePercent = phase.percentage ?? (baseTotal > 0 ? (toNum(phase.amount) / baseTotal) * 100 : 0);
                  const activePhaseIdx = invoice.current_phase_index || 0;
                  const isPaid = invoice.deposit_cleared && idx < activePhaseIdx;
                  const isFirstPhaseDepositPaid = invoice.deposit_cleared && idx === 0;
                  const isPhaseActive = idx === activePhaseIdx || (idx === 0 && !invoice.deposit_cleared);
                  const canPayPhase = isPhaseActive && !(isPaid || isFirstPhaseDepositPaid) && idx > 0;

                  return (
                    <div key={idx} className="bg-slate-50/50 border border-slate-200/60 p-3 rounded-xl text-xs">
                      <div className="flex justify-between items-center">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <p className="font-extrabold text-slate-800 tracking-tight">{phase.name}</p>
                            {(isPaid || isFirstPhaseDepositPaid) ? (
                              <span className="text-[8px] font-black tracking-widest uppercase px-1 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200/60">PAID</span>
                            ) : isPhaseActive ? (
                              <span className="text-[8px] font-black tracking-widest uppercase px-1 py-0.2 rounded-full bg-blue-100 text-blue-800 border border-blue-200/60 animate-pulse">ACTIVE</span>
                            ) : (
                              <span className="text-[8px] font-black tracking-widest uppercase px-1 py-0.2 rounded-full bg-slate-200 text-slate-400">PEND</span>
                            )}
                          </div>
                          <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wide">Draw Allocation: {Math.round(phasePercent * 10) / 10}%</p>
                        </div>
                        <span className="font-sans font-extrabold text-slate-900" style={{fontVariantNumeric:'tabular-nums'}}>${toNum(phaseVal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      {canPayPhase && (
                        <button
                          type="button"
                          disabled={isPaymentLoading}
                          onClick={() => initiateStripePayment(phaseVal, `${phase.name} - ${invoice.homeowner_name}`, idx)}
                          className="mt-2 w-full bg-brand-charcoal hover:bg-brand-charcoal/90 disabled:opacity-40 text-white font-semibold text-[11px] py-2.5 rounded-xl tracking-wide transition-all duration-200 shadow-soft hover:shadow-elevated outline-none flex items-center justify-center gap-2"
                        >
                          {isPaymentLoading ? "Connecting..." : (
                            <>
                              Pay Now — ${toNum(phaseVal).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Change Orders */}
            {changeOrders.length > 0 && (
              <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] space-y-2.5 text-left">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1.5 border-slate-100">Scope Modifications</h3>
                <div className="space-y-2">
                  {changeOrders.map((co: any) => {
                    const isCoApproved = co.status === "approved";
                    const isCoPaid = co.deposit_cleared;
                    const isExpanded = expandedCoId === co.id;

                    return (
                      <div key={co.id} className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm text-xs">
                        <div onClick={() => setExpandedCoId(isExpanded ? null : co.id)} className="p-3 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors">
                          <div className="text-left space-y-0.5">
                            {co.proposal_number && (
                              <p className="font-mono text-[8px] font-black text-slate-400 tracking-widest">{co.proposal_number}</p>
                            )}
                            <p className="font-bold text-slate-900 tracking-tight truncate w-36 sm:w-44">{co.description}</p>
                            <div className="flex gap-1">
                              <span className={`text-[7px] font-black uppercase px-1 rounded ${isCoApproved ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700'}`}>{isCoApproved ? "APP" : "PEND"}</span>
                              {isCoApproved && <span className={`text-[7px] font-black uppercase px-1 rounded ${isCoPaid ? 'bg-blue-50 text-blue-700':'bg-red-50 text-red-700'}`}>{isCoPaid ? "PAID":"UNPD"}</span>}
                            </div>
                          </div>
                          <span className="font-sans font-extrabold text-slate-900" style={{fontVariantNumeric:'tabular-nums'}}>${toNum(co.amount).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
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
                              <button type="button" onClick={() => executeOneClickCoApproval(co.id)} className="w-full bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black py-2.5 rounded-xl tracking-wider uppercase transition-all duration-200 shadow-sm outline-none">
                                Approve Change Order
                              </button>
                            )}
                            {isCoApproved && !isCoPaid && (
                              <button
                                type="button"
                                disabled={isPaymentLoading}
                                onClick={() => initiateStripePayment(toNum(co.amount), `Change Order - ${co.description} - ${invoice.homeowner_name}`)}
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-black text-[10px] py-2.5 rounded-xl tracking-wider uppercase transition-all duration-200 shadow-sm outline-none"
                              >
                                {isPaymentLoading ? "Connecting..." : "Pay Now"}
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

            {/* Project Total Summary */}
            <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] text-left space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TOTAL PROJECT VALUE</p>
                <h2 className="text-2xl font-black text-slate-950 tracking-tight" style={{fontVariantNumeric:'tabular-nums'}}>
                  ${toNum(combinedProjectTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h2>
              </div>
              {Array.isArray(invoice.payment_history) && invoice.payment_history.length > 0 && (
                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Payment Receipts</p>
                  {invoice.payment_history.map((pmt: any, i: number) => (
                    <div key={i} className="flex justify-between items-center bg-emerald-50/50 border border-emerald-100 p-2.5 rounded-lg text-xs">
                      <div className="space-y-0.5">
                        <p className="font-bold text-emerald-800">
                          {pmt.phase_index === 0 ? "Deposit" : `Phase ${pmt.phase_index} Draw`}
                        </p>
                        <p className="text-[9px] text-emerald-600 font-medium">
                          {new Date(pmt.paid_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          {pmt.customer_email && ` · ${pmt.customer_email}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-emerald-800" style={{fontVariantNumeric:'tabular-nums'}}>
                          ${toNum(pmt.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        <p className="text-[8px] font-bold text-emerald-600 uppercase">Confirmed</p>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-1 text-xs">
                    <span className="text-slate-500 font-medium">Total Paid</span>
                    <span className="font-black text-emerald-700" style={{fontVariantNumeric:'tabular-nums'}}>
                      ${invoice.payment_history.reduce((s: number, p: any) => s + toNum(p.amount), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Remaining Balance</span>
                    <span className="font-black text-slate-900" style={{fontVariantNumeric:'tabular-nums'}}>
                      ${(combinedProjectTotal - invoice.payment_history.reduce((s: number, p: any) => s + toNum(p.amount), 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── NOTES TAB ── */}
        {activeTab === "notes" && (
          <div className="max-w-3xl mx-auto animate-fade-in">
            <div className="bg-white rounded-2xl shadow-soft border border-brand-stone/30 p-6 space-y-4">
              <div className="border-b border-brand-stone/30 pb-3">
                <h3 className="text-[15px] font-semibold text-brand-charcoal">Project Notes</h3>
                <p className="text-[12px] text-brand-muted mt-0.5">Notes and updates from your contractor about this project.</p>
              </div>
              <div className="space-y-3">
                {((invoice as any)?.contractor_notes || []).filter((n: any) => n.visible).map((note: any, i: number) => (
                  <div key={i} className="bg-brand-warm/40 border border-brand-stone/30 rounded-xl p-4">
                    <p className="text-[13px] font-medium text-brand-charcoal leading-relaxed whitespace-pre-wrap">{note.text}</p>
                    <p className="text-[10px] font-medium text-brand-muted mt-2">
                      Skyler · WDO Custom · {new Date(note.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── DOCS TAB (both pre and post approval) ── */}
        {activeTab === "docs" && (
          <div className="max-w-3xl mx-auto animate-fade-in">
            <div className="bg-white rounded-2xl shadow-soft border border-brand-stone/30 p-6 space-y-4">
              <div className="border-b border-brand-stone/30 pb-3">
                <h3 className="text-[15px] font-semibold text-brand-charcoal">Project Documents</h3>
                <p className="text-[12px] text-brand-muted mt-0.5">Contracts, permits, plans, and other project files shared by your contractor.</p>
              </div>

              {Array.isArray((invoice as any).documents) && (invoice as any).documents.length > 0 ? (
                <div className="divide-y divide-brand-stone/30">
                  {(invoice as any).documents.map((doc: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-brand-warm border border-brand-stone/40 rounded-xl flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold text-brand-muted uppercase">{doc.name?.split('.').pop()?.slice(0, 4)}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-brand-charcoal truncate">{doc.name}</p>
                          <p className="text-[11px] text-brand-muted font-medium">
                            {new Date(doc.uploaded_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            {doc.size && ` · ${(doc.size / 1024).toFixed(0)} KB`}
                          </p>
                        </div>
                      </div>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[11px] font-semibold text-brand-charcoal bg-brand-warm border border-brand-stone/50 hover:border-brand-charcoal/30 hover:shadow-soft transition-all duration-200 outline-none shrink-0"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        View
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-brand-warm mx-auto flex items-center justify-center border border-brand-stone/40">
                    <svg className="w-5 h-5 text-brand-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                  </div>
                  <p className="text-sm font-medium text-brand-charcoal">No documents yet</p>
                  <p className="text-[12px] text-brand-muted">Your contractor will upload project documents here as they become available.</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
