"use client";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toNum } from "@/lib/utils";
import { toast } from "@/lib/toast";
import type { Invoice } from "@/lib/types";
import { generateProposalPdf } from "@/lib/generate-pdf";
import { categoryOf } from "@/lib/scope-amendment";
import { depositAmountOf, depositPercentOf, displayPercent, phaseAmountOf, phasePercentOf } from "@/lib/payment-schedule";
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
    const interval = setInterval(() => setNow(Date.now()), 60000);
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
  const depositPercent = displayPercent(depositPercentOf(invoice, baseTotal));
  const depositAmount = depositAmountOf(invoice, baseTotal);

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

  if (!invoice) return (
    <div className="flex min-h-screen items-center justify-center bg-paper-100 px-6 text-center font-sans">
      <div>
        <p className="eyebrow">Portal</p>
        <p className="display-sm mt-2">This proposal is not available</p>
      </div>
    </div>
  );

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
    <div className="min-h-screen bg-paper-100 text-ink-900 font-sans antialiased pb-28 text-left selection:bg-bronze-200/40">

      {/* Top bar — wordmark, the job, and where the proposal stands */}
      <div className="sticky top-0 z-20 border-b border-rule-300 bg-paper-100/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <div className="flex min-w-0 items-baseline gap-3">
            <span className="shrink-0 text-[15px] font-semibold tracking-[-0.01em] text-ink-900">WDO Custom</span>
            <span aria-hidden className="hidden h-3 w-px shrink-0 bg-rule-400 sm:block" />
            <span className="hidden min-w-0 truncate text-[13px] text-ink-500 sm:block">
              {invoice.job_address || "Address pending"}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => generateProposalPdf(invoice as any)}
              className="btn-outline px-3 py-2 text-[13px] sm:px-4"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <span className="hidden sm:inline">Download PDF</span>
            </button>
            <span className={`badge ${isLocked ? 'badge-approved' : 'badge-neutral'}`}>
              {isLocked ? "Signed" : "Awaiting signature"}
            </span>
          </div>
        </div>
      </div>

      {/* Proposal hold — rides at the top of the package. A stated date, not a
          ticking clock: the countdown is deliberately gone, the deadline is not. */}
      {hasExpiration && !isLocked && (() => {
        const expiryDate = new Date(expiresAt);
        const daysLeft = Math.ceil((expiryDate.getTime() - now) / 86400000);
        const dateLong = expiryDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        if (isExpired) {
          return (
            <div className="border-b border-brick-200 bg-brick-50">
              <div className="mx-auto max-w-5xl border-l-2 border-brick-600 px-5 py-5 sm:px-8">
                <p className="spec-label text-brick-600">Proposal hold ended</p>
                <p className="mt-2 text-[17px] font-semibold leading-snug tracking-[-0.01em] text-brick-700 sm:text-[19px]">
                  Pricing and schedule were held through {dateLong}
                </p>
                <p className="mt-2 max-w-prose text-[14px] leading-relaxed text-brick-700">
                  That date has passed, so this proposal can no longer be signed as priced. Call{" "}
                  <a href="tel:4028198558" className="font-medium underline underline-offset-2 tnum">402-819-8558</a>{" "}
                  and Skyler will confirm current availability and reissue it.
                </p>
              </div>
            </div>
          );
        }
        const closing = daysLeft <= 2;
        return (
          <div className={`border-b ${closing ? 'border-dust-200 bg-dust-50' : 'border-rule-300 bg-paper-50'}`}>
            <div className={`mx-auto max-w-5xl border-l-2 px-5 py-5 sm:px-8 ${closing ? 'border-dust-600' : 'border-bronze-500'}`}>
              <p className={`spec-label ${closing ? 'text-dust-600' : 'text-bronze-500'}`}>Proposal hold</p>
              <p className="mt-2 text-[17px] font-semibold leading-snug tracking-[-0.01em] text-ink-900 sm:text-[19px]">
                Pricing and schedule held through {dateLong}
              </p>
              <p className="mt-2 max-w-prose text-[14px] leading-relaxed text-ink-500">
                {closing
                  ? "This is the last of the hold period. Approving on or before this date keeps both the pricing above and your place on the build calendar."
                  : "Approving on or before this date holds the pricing above and your place on the build calendar. After it passes, material costs and scheduling are re-quoted."}
              </p>
            </div>
          </div>
        );
      })()}

      {/* Identity block — the spec sheet that opens the package */}
      <div className="border-b border-rule-300 bg-paper-50">
        <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-10">
          <p className="spec-label">
            Proposal{(invoice as any).proposal_number ? ` ${(invoice as any).proposal_number}` : ""}
          </p>
          <h1 className="display-xl mt-2">{invoice.job_address || "Address pending"}</h1>
          {(invoice as any).project_title && (
            <p className="mt-2 text-[15px] text-ink-500">{(invoice as any).project_title}</p>
          )}

          <dl className="mt-7 grid grid-cols-1 gap-x-10 gap-y-0 border-t border-rule-200 sm:grid-cols-2">
            <div className="flex justify-between gap-4 border-b border-rule-200 py-3">
              <dt className="text-[13px] text-ink-500">Prepared for</dt>
              <dd className="text-right text-[13px] font-medium text-ink-900">{invoice.homeowner_name || "Client"}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-rule-200 py-3">
              <dt className="text-[13px] text-ink-500">Contractor of record</dt>
              <dd className="text-right text-[13px] font-medium text-ink-900">Skyler Camacho</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-rule-200 py-3">
              <dt className="text-[13px] text-ink-500">Nebraska license</dt>
              <dd className="text-right text-[13px] font-medium text-ink-900 tnum">LIC-1901422</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-rule-200 py-3">
              <dt className="text-[13px] text-ink-500">Direct</dt>
              <dd className="text-right text-[13px] font-medium text-ink-900">
                <a href="tel:4028198558" className="underline decoration-rule-400 underline-offset-2 hover:decoration-ink-900 tnum">402-819-8558</a>
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-rule-200 py-3 sm:col-span-2">
              <dt className="text-[13px] text-ink-500">Email</dt>
              <dd className="min-w-0 text-right text-[13px] font-medium text-ink-900">
                <a href="mailto:skyler@wdocustom.com" className="break-all underline decoration-rule-400 underline-offset-2 hover:decoration-ink-900">skyler@wdocustom.com</a>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Job summary — the four numbers that matter, before any tab */}
      <div className="border-b border-rule-300 bg-paper-100">
        <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8">
          <dl className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4">
            <div>
              <dt className="eyebrow">Contract total</dt>
              <dd className="figure-hero mt-1.5 text-[1.5rem] sm:text-[1.75rem]">
                ${toNum(combinedProjectTotal).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Deposit ({depositPercent}%)</dt>
              <dd className="figure mt-1.5 text-[1.125rem]">
                ${toNum(depositAmount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Duration</dt>
              <dd className="figure mt-1.5 text-[1.125rem]">{invoice.project_length || "9 Weeks"}</dd>
            </div>
            <div>
              <dt className="eyebrow">Start date</dt>
              <dd className="figure mt-1.5 text-[1.125rem]">
                {invoice.estimated_start_date
                  ? new Date(invoice.estimated_start_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                  : "To be scheduled"}
              </dd>
            </div>
          </dl>

          <p className="mt-5 border-t border-rule-200 pt-4 text-[13px] leading-relaxed text-ink-500">
            Start date subject to permits and material lead times.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-5 pt-8 sm:px-8 sm:pt-10">

        {/* Payment Status Banner */}
        {paymentStatus === "success" && (
          <div className="mb-6 flex items-center gap-3 border border-forest-200 bg-forest-50 px-5 py-5 text-[13px] text-forest-700">
            <svg className="h-4 w-4 shrink-0 text-forest-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Payment received. Your account will be updated shortly.
          </div>
        )}
        {paymentStatus === "cancelled" && (
          <div className="mb-6 flex items-center gap-3 border border-bronze-200 bg-bronze-50 px-5 py-5 text-[13px] text-bronze-600">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.5h.008M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Payment cancelled. You can retry using the payment options below.
          </div>
        )}

        {/* Tab Navigation */}
        <div className="tabstrip mb-7">
          {(isLocked
            ? [
                { key: "overview", label: "Proposal" },
                { key: "messages", label: "Messages" },
                { key: "selections", label: "Selections" },
                { key: "payments", label: "Payments" },
                ...((invoice as any)?.contractor_notes?.some((n: any) => n.visible) ? [{ key: "notes", label: "Notes" }] : []),
                { key: "docs", label: "Documents" },
              ]
            : [
                { key: "proposal", label: "Proposal" },
                { key: "messages", label: "Messages" },
                ...(invoice?.selections_visible ? [{ key: "selections", label: "Selections" }] : []),
                ...((invoice as any)?.contractor_notes?.some((n: any) => n.visible) ? [{ key: "notes", label: "Notes" }] : []),
                { key: "schedule", label: "Schedule" },
                { key: "docs", label: "Documents" },
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
                className={`tab flex items-center gap-1.5 ${isTabActive ? "tab-active" : ""} ${hasUnread ? "text-bronze-600" : ""}`}
              >
                {tab.label}
                {hasUnread && (
                  <span className="flex items-center gap-1">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-bronze-400 opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-bronze-500" />
                    </span>
                    <span className="text-[9px] leading-none tabular-nums text-bronze-600">{unreadCount}</span>
                  </span>
                )}
                {tabKey === "messages" && !hasUnread && messages.length > 0 && (
                  <span className="text-[9px] leading-none tabular-nums text-ink-400">
                    {messages.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Progress Tracker — always visible post-approval */}
        {isLocked && (
          <div className="panel mb-7 p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="eyebrow">Progress</p>
              <span className={`badge ${invoice.deposit_cleared ? 'badge-approved' : 'badge-pending'}`}>
                <span className={`badge-dot ${invoice.deposit_cleared ? 'bg-forest-500' : 'bg-bronze-400'}`} />
                {invoice.deposit_cleared ? `Active: ${invoice.payment_phases?.[invoice.current_phase_index || 0]?.name || "In Progress"}` : "Awaiting Deposit"}
              </span>
            </div>

            <div className="scrollbar-none relative mt-6 flex w-full items-start justify-between overflow-x-auto pb-1">
              {/* Datum line */}
              <div className="absolute left-8 right-8 top-[9px] z-0 h-px bg-rule-300">
                <div
                  className="h-full bg-paper-50 transition-all duration-700 ease-architect"
                  style={{ width: `${(dynamicTimelineIndex / (standardMilestones.length - 1)) * 100}%` }}
                />
              </div>
              {standardMilestones.map((step, idx) => {
                const isCompleted = idx < dynamicTimelineIndex;
                const isCurrent = idx === dynamicTimelineIndex;
                return (
                  <div key={idx} className="relative z-10 flex w-[64px] shrink-0 flex-col items-center text-center sm:w-[92px]">
                    <div className={`flex h-[18px] w-[18px] items-center justify-center border transition-all duration-300 ease-architect ${
                      isCompleted ? 'border-rule-300 bg-paper-50 text-ink-900' :
                      isCurrent ? 'border-bronze-500 bg-bronze-50 ring-[3px] ring-bronze-500/15' :
                      'border-rule-300 bg-paper-50'
                    }`}>
                      {isCompleted ? (
                        <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      ) : (
                        <span className={`h-[5px] w-[5px] ${isCurrent ? 'bg-bronze-500' : 'bg-rule-300'}`} />
                      )}
                    </div>
                    <p className={`mt-2.5 text-[12px] leading-tight ${
                      isCurrent ? 'text-bronze-600' : isCompleted ? 'text-ink-900' : 'text-ink-400'
                    }`}>{step.title}</p>
                    <p className="mt-0.5 hidden font-sans text-[13px] tracking-architect text-ink-400 sm:block">{step.subtitle}</p>
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
              <div className="mb-7 flex items-start gap-3.5 border border-bronze-200 border-l-2 border-l-bronze-500 bg-bronze-50 px-6 py-5">
                <p className="eyebrow mt-[3px] shrink-0 text-bronze-500">Notice</p>
                <p className="text-[13px] leading-relaxed text-ink-500">{(invoice as any).announcement}</p>
              </div>
            );
          }
          if (showNewContractBanner) {
            return (
              <div className="mb-7 flex items-start gap-3.5 border border-forest-200 border-l-2 border-l-forest-500 bg-forest-50 px-6 py-5">
                <p className="eyebrow mt-[3px] shrink-0 text-forest-600">Signed</p>
                <p className="text-[13px] leading-relaxed text-ink-500">Your contract is signed and active. Skyler Camacho and the WDO Custom team are now managing your project. Use the tabs above to track progress, selections, communicate, and manage payments.</p>
              </div>
            );
          }
          return (
            <div className="mb-7 border border-rule-300/70 border-l-2 border-l-rule-400/25 bg-paper-50 px-6 py-5 text-[13px] leading-relaxed text-ink-500">
              Welcome back, {invoice.homeowner_name?.split(" ")[0] || "there"}. Use the tabs above to track progress, selections, communicate, and manage payments.
            </div>
          );
        })()}

        {/* ═══════════════════════ TAB CONTENT AREA ═══════════════════════ */}

        {/* ── PRE-APPROVAL: PROPOSAL TAB (default) ── */}
        {!isLocked && (activeTab === "proposal" || activeTab === "overview") && (
          <div className="animate-rise space-y-12">
            <div className="min-w-0 space-y-12">

              {/* Specification grade */}
              {(invoice as any).show_luxury_tier && (
                <div className="border-b border-rule-300 pb-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                      <h2 className="display-md">Specification grade</h2>
                      <p className="mt-1.5 max-w-prose text-[14px] leading-relaxed text-ink-500">
                        This proposal is priced at two levels of finish. Pricing below reflects the grade selected here.
                      </p>
                    </div>
                    <div className="flex shrink-0 overflow-hidden rounded-edge border border-rule-400">
                      <button
                        type="button"
                        onClick={() => setTier("mid")}
                        aria-pressed={tier === 'mid'}
                        className={`min-h-[44px] px-5 text-[14px] font-medium transition-colors duration-150 ease-architect ${tier === 'mid' ? 'bg-ink-900 text-paper-50' : 'bg-paper-50 text-ink-500 hover:text-ink-900'}`}
                      >
                        Standard
                      </button>
                      <button
                        type="button"
                        onClick={() => setTier("high")}
                        aria-pressed={tier === 'high'}
                        className={`min-h-[44px] border-l border-rule-400 px-5 text-[14px] font-medium transition-colors duration-150 ease-architect ${tier === 'high' ? 'bg-ink-900 text-paper-50' : 'bg-paper-50 text-ink-500 hover:text-ink-900'}`}
                      >
                        Upgraded
                      </button>
                    </div>
                  </div>
                  {tier === 'high' && (
                    <p className="mt-4 max-w-prose text-[14px] leading-relaxed text-ink-500">
                      Upgraded grade includes premium materials, upgraded finishes, and extended warranties.
                    </p>
                  )}
                </div>
              )}

              {/* Scope of work */}
              <div>
                <div className="title-block">
                  <h2 className="display-lg">Scope of work</h2>
                  <span className="eyebrow">{masterItems.length} items</span>
                </div>

                <div className="border-t border-rule-300">
                  {masterItems.map((item: any, idx: number) => {
                    const isExpanded = expandedIndices.includes(idx);
                    const category = categoryOf(item);
                    const startsCategory = idx === 0 || categoryOf(masterItems[idx - 1]) !== category;
                    const body = tier === 'mid' ? item.mid_description : item.high_description;
                    return (
                      <div key={idx}>
                        {startsCategory && (
                          <p className="spec-label bg-paper-200/70 px-4 py-2">{category}</p>
                        )}
                        <div className="border-b border-rule-200 px-1 py-5 sm:px-2">
                          <div className="flex items-baseline justify-between gap-4">
                            <div className="flex min-w-0 gap-3 sm:gap-4">
                              <span className="w-6 shrink-0 pt-px text-[13px] text-ink-300 tnum">
                                {String(idx + 1).padStart(2, "0")}
                              </span>
                              <h3 className="min-w-0 text-[15px] font-medium leading-snug text-ink-900">
                                {tier === 'mid' ? item.title : item.high_title}
                              </h3>
                            </div>
                            <span className="figure shrink-0 text-[15px]">
                              ${(tier === 'mid' ? toNum(item.mid_cost) : toNum(item.high_cost)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>

                          {body && (
                            <div className="mt-2 pl-9 sm:pl-10">
                              <p className={`max-w-2xl text-[14px] leading-relaxed text-ink-500 ${isExpanded ? '' : 'line-clamp-3'}`}>
                                {body}
                              </p>
                              {String(body).length > 220 && (
                                <button
                                  type="button"
                                  onClick={() => toggleExpandDescription(idx)}
                                  aria-expanded={isExpanded}
                                  className="mt-1.5 text-[13px] font-medium text-bronze-500 underline underline-offset-2 transition-colors duration-150 hover:text-bronze-600"
                                >
                                  {isExpanded ? "Show less" : "Read full specification"}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Last page of the estimate */}
                <dl className="mt-8 border-t-2 border-ink-900">
                  <div className="flex items-baseline justify-between gap-4 border-b border-rule-200 py-4">
                    <dt className="text-[15px] font-medium text-ink-900">Contract total</dt>
                    <dd className="figure-hero text-[1.5rem] sm:text-[1.75rem]">
                      ${toNum(combinedProjectTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 border-b border-rule-200 py-3.5">
                    <dt className="text-[14px] text-ink-500">Deposit due on signing ({depositPercent}%)</dt>
                    <dd className="figure text-[15px]">
                      ${toNum(depositAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 py-3.5">
                    <dt className="text-[14px] text-ink-500">Remaining, billed on the draw schedule</dt>
                    <dd className="figure text-[15px]">
                      ${(toNum(combinedProjectTotal) - toNum(depositAmount)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Authorization + contract addendum */}
            <div className="space-y-10">
              <div id="approve-section">
              {isExpired ? (
                <div className="panel border-brick-200 bg-brick-50 p-6">
                  <h2 className="display-md text-brick-700">Pricing period has passed</h2>
                  <p className="mt-2 max-w-prose text-[14px] leading-relaxed text-brick-700">
                    Your reserved schedule slot and pricing have been released. Call for current availability and an updated proposal.
                  </p>
                  <a href="tel:4028198558" className="btn-outline mt-5 border-brick-200 text-brick-700 hover:border-brick-600">
                    Call 402-819-8558
                  </a>
                </div>
              ) : (
                <form onSubmit={handleApprove} className="panel p-6 sm:p-8">
                  <h2 className="display-lg">Approve and sign</h2>
                  <p className="mt-3 max-w-prose text-[14px] leading-relaxed text-ink-500">
                    By typing your full legal name and confirming, you authorize this proposal as contractor and owner agreed.
                    The deposit of{" "}
                    <span className="font-medium text-ink-900 tnum">
                      ${toNum(depositAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>{" "}
                    is due on signing.
                  </p>

                  <div className="mt-6 max-w-md">
                    <label htmlFor="signature-name" className="field-label">Full legal name</label>
                    <input
                      id="signature-name"
                      type="text"
                      required
                      autoComplete="name"
                      placeholder="First and last name"
                      value={typedSignature}
                      onChange={(e) => setTypedSignature(e.target.value)}
                      className="field"
                    />
                  </div>

                  <button type="submit" disabled={isSubmitting || activeIndices.length === 0} className="btn-ink mt-5 w-full sm:w-auto sm:min-w-[15rem]">
                    {isSubmitting ? "Submitting..." : "Sign and authorize"}
                  </button>

                  <p className="mt-4 text-[13px] leading-relaxed text-ink-400">
                    Skyler Camacho · WDO Custom · Nebraska license LIC-1901422 · 1-year workmanship warranty
                  </p>
                </form>
              )}
              </div>

              {/* Terms — a contract addendum, not an FAQ */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowTerms(!showTerms)}
                  aria-expanded={showTerms}
                  className="flex w-full items-center justify-between gap-4 border-t border-rule-300 py-4 text-left transition-colors duration-150 ease-architect hover:text-bronze-500"
                >
                  <span className="display-md">Terms and conditions</span>
                  <svg className={`h-4 w-4 shrink-0 text-ink-400 transition-transform duration-150 ${showTerms ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showTerms && (
                  <div className="max-w-prose space-y-6 border-t border-rule-200 pb-2 pt-5">
                    <p className="text-[13px] font-medium text-ink-900">
                      WDO Custom — General contracting terms and conditions
                    </p>
                    {TERMS_AND_CONDITIONS.map((section, i) => (
                      <div key={i} className="space-y-1.5">
                        <p className="text-[14px] font-medium text-ink-900">{section.heading}</p>
                        <p className="text-[14px] leading-relaxed text-ink-500">{section.text}</p>
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
          <div className="grid animate-rise grid-cols-1 items-start gap-8 lg:grid-cols-3 lg:gap-10">
            <div className="min-w-0 space-y-14 lg:col-span-2">

              {scheduleTasks.length > 0 && (
                <div>
                  <div className="title-block">
                    <h2 className="display-sm">Construction Timeline</h2>
                    <span className="eyebrow hidden sm:block">Live</span>
                  </div>
                  <div className="panel overflow-hidden">
                    {masterMilestones.map((milestone) => {
                      const subTasks = getSubTasksForMilestone(milestone.id);
                      return (
                        <div key={milestone.id} className="border-b border-rule-300/55 last:border-b-0">
                          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5 bg-paper-50/60 px-5 py-4">
                            <h3 className="min-w-0 text-[13.5px] font-medium leading-snug tracking-[-0.01em] text-ink-900">
                              {milestone.task_name}
                            </h3>
                            <div className="flex shrink-0 items-baseline gap-3">
                              <span className="font-sans text-[13px] tracking-architect text-ink-500">
                                {new Date(milestone.target_start_date + 'T00:00:00').toLocaleDateString(undefined, {month:'short', day:'numeric'})} – {new Date(milestone.target_end_date + 'T00:00:00').toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                              </span>
                              <span className="figure text-[12px]">{milestone.progress_percent}%</span>
                            </div>
                          </div>
                          <div>
                            {subTasks.map((task) => (
                              <div key={task.id} className="flex flex-col gap-2 border-t border-rule-300/45 px-5 py-4 transition-colors duration-200 ease-architect hover:bg-paper-100 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
                                <div className="flex min-w-0 flex-1 items-baseline gap-2.5">
                                  <span aria-hidden className="mt-1 h-px w-3 shrink-0 bg-rule-300" />
                                  <span className="min-w-0 truncate text-[12.5px] text-ink-500">{task.task_name}</span>
                                  <span className={`shrink-0 border px-1.5 py-0.5 font-sans text-[13px] tracking-architect ${task.color_theme}`}>
                                    {new Date(task.target_start_date + 'T00:00:00').toLocaleDateString(undefined, {month:'short', day:'numeric'})} – {new Date(task.target_end_date + 'T00:00:00').toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                                  </span>
                                </div>
                                <div className="flex shrink-0 items-center gap-3 pl-5 sm:pl-0">
                                  <div className="h-[3px] w-20 overflow-hidden bg-paper-200">
                                    <div className="h-full bg-paper-50 transition-all duration-500 ease-architect" style={{ width: `${task.progress_percent}%` }} />
                                  </div>
                                  <span className="min-w-[28px] text-right font-sans text-[10px] tabular-nums text-ink-500">{task.progress_percent}%</span>
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
                <div>
                  <div className="title-block">
                    <h2 className="display-sm">Field Log</h2>
                    <span className="eyebrow hidden sm:block">{dailyLogs.length} entries</span>
                  </div>
                  <div className="max-h-[420px] overflow-y-auto border-t border-rule-300/70">
                    {dailyLogs.map((log) => (
                      <div key={log.id} className="space-y-3 border-b border-rule-300/55 px-1 py-5 sm:px-2">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="eyebrow">Site Report</span>
                          <span className="font-sans text-[13px] tracking-architect text-ink-500">
                            {new Date(log.created_at).toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'})}
                          </span>
                        </div>
                        <p className="whitespace-pre-line text-[13px] leading-relaxed text-ink-500">{log.log_text}</p>
                        {log.photo_urls && log.photo_urls.length > 0 && (
                          <div className="grid grid-cols-2 gap-1.5 pt-1 sm:grid-cols-4">
                            {log.photo_urls.map((photoUrl: string, pIdx: number) => (
                              <a key={pIdx} href={photoUrl} target="_blank" rel="noopener noreferrer" className="group relative block aspect-[4/3] overflow-hidden border border-rule-300/70 bg-paper-50">
                                <img src={photoUrl} alt="" className="h-full w-full object-cover transition-transform duration-500 ease-architect group-hover:scale-[1.03]" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="title-block">
                  <h2 className="display-sm">Contracted Scope</h2>
                  <span className="eyebrow hidden sm:block">Expand for detail</span>
                </div>

                <div className="border-t border-rule-300/70">
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
                          <div className="flex items-center gap-3 bg-paper-50/60 px-3 py-2 sm:px-4">
                            <span className="eyebrow shrink-0">{category}</span>
                            <span aria-hidden className="h-px flex-1 bg-paper-200" />
                          </div>
                        )}
                        <div className="group relative border-b border-rule-300/55 bg-paper-50 px-3 py-3.5 transition-colors duration-300 ease-architect hover:bg-paper-100 sm:px-4">
                          <span aria-hidden className="absolute bottom-0 left-0 top-0 w-px origin-top scale-y-0 bg-bronze-400 opacity-0 transition-all duration-300 ease-architect group-hover:scale-y-100 group-hover:opacity-100" />
                          <div className="flex items-start justify-between gap-3 sm:gap-5">
                            <div className="flex min-w-0 flex-1 items-start gap-3">
                              <button
                                type="button"
                                onClick={() => toggleExpandDescription(idx)}
                                aria-expanded={isExpanded}
                                className="mt-[1px] flex h-5 w-5 shrink-0 items-center justify-center border border-rule-300/70 text-ink-500 transition-all duration-200 ease-architect hover:border-rule-400 hover:text-ink-900"
                              >
                                <svg className={`h-2.5 w-2.5 transition-transform duration-300 ease-architect ${isExpanded ? 'rotate-45' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                                </svg>
                              </button>
                              <h4 className="min-w-0 text-[13.5px] font-medium leading-snug tracking-[-0.01em] text-ink-900">{item.title}</h4>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1">
                              <div className="flex items-baseline gap-2.5">
                                {item.actual_cost != null && (
                                  <span className="font-sans text-[10px] tabular-nums text-ink-400 line-through">
                                    ${toNum(item.cost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                )}
                                <span className="figure text-[14px]">
                                  ${toNum(item.actual_cost ?? item.cost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                              {item.actual_cost != null && (
                                <span className={`font-sans text-[13px] tracking-architect ${toNum(item.actual_cost) > toNum(item.cost) ? 'text-brick-600' : 'text-forest-600'}`}>
                                  {toNum(item.actual_cost) > toNum(item.cost) ? 'Over' : 'Under'} ${Math.abs(toNum(item.actual_cost) - toNum(item.cost)).toLocaleString(undefined, {minimumFractionDigits:2})}
                                </span>
                              )}
                            </div>
                          </div>
                          {isExpanded && (
                            <div className="mt-3 max-w-2xl animate-rise border-t border-rule-300/50 pl-8 pt-3">
                              <p className="text-[12.5px] leading-relaxed text-ink-500">{item.description}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Sidebar — signed status + total */}
            <div className="space-y-4 lg:sticky lg:top-24">
              <div className="panel-raised overflow-hidden">
                <div className="bg-paper-50 px-7 pb-10 pt-8 text-ink-900">
                  <p className="eyebrow-invert">Project Total</p>
                  <p className="figure-hero mt-6 text-[2.25rem] text-ink-900 sm:text-[3.25rem]">
                    ${toNum(combinedProjectTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <dl className="divide-y divide-rule-200/60">
                  <div className="flex items-baseline justify-between px-7 py-5">
                    <dt className="eyebrow">Contract Base</dt>
                    <dd className="figure text-[13px]">${toNum(baseTotal).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</dd>
                  </div>
                  {approvedCoTotal > 0 && (
                    <div className="flex items-baseline justify-between px-7 py-5">
                      <dt className="eyebrow text-bronze-500">Approved Variations</dt>
                      <dd className="figure text-[13px] text-bronze-600">+${toNum(approvedCoTotal).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Execution record */}
              <div className="panel border-forest-200 bg-forest-50 p-5">
                <div className="flex items-center gap-2">
                  <svg className="h-3.5 w-3.5 shrink-0 text-forest-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <p className="font-sans text-[13px] tracking-architect text-forest-700">Contract Executed</p>
                </div>
                <p className="mt-3 figure-hero text-[1.75rem] text-ink-900">
                  {invoice.signature_name}
                </p>
                <p className="mt-2.5 border-t border-forest-200 pt-2.5 font-sans text-[13px] tracking-architect text-forest-600">
                  {new Date(invoice.signed_at || "").toLocaleString()}
                </p>
              </div>

              <div className="panel overflow-hidden">
                <button type="button" onClick={() => setShowTerms(!showTerms)} aria-expanded={showTerms} className="flex w-full items-center justify-between px-6 py-5 text-left transition-colors duration-200 ease-architect hover:bg-paper-100">
                  <span className="eyebrow">Binding Terms</span>
                  <svg className={`h-3 w-3 shrink-0 text-ink-500 transition-transform duration-300 ease-architect ${showTerms ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showTerms && (
                  <div className="max-h-[50vh] space-y-4 overflow-y-auto border-t border-rule-300/55 px-5 pb-5 pt-4">
                    <p className="text-[13px] leading-relaxed tracking-architect text-ink-500">WDO Custom — General Contracting Terms &amp; Conditions</p>
                    {TERMS_AND_CONDITIONS.map((section, i) => (
                      <div key={i} className="space-y-1">
                        <p className="text-[11.5px] font-medium text-ink-900">{section.heading}</p>
                        <p className="text-[11.5px] leading-relaxed text-ink-500">{section.text}</p>
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
          <div className="mx-auto max-w-3xl animate-rise">
            <div className="title-block">
              <h2 className="display-sm">Messages</h2>
              <span className="eyebrow hidden sm:block">Messages go straight to Skyler</span>
            </div>

            <div className="panel overflow-hidden">
              <div className="max-h-[440px] space-y-4 overflow-y-auto bg-paper-50/40 p-5 sm:p-7">
                {Array.isArray((invoice as any).questions) && (invoice as any).questions.length > 0 ? (
                  (invoice as any).questions.map((msg: any, i: number) => (
                    <div key={i} className={`flex ${msg.author === "homeowner" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[86%] px-5 py-4 text-[13px] leading-relaxed sm:max-w-[76%] ${
                        msg.author === "homeowner"
                          ? "border border-rule-300 bg-paper-50 text-ink-900"
                          : "border border-rule-300/70 bg-paper-50 text-ink-500"
                      }`}>
                        {msg.image_url && (
                          <a href={msg.image_url} target="_blank" rel="noopener noreferrer" className="mb-2.5 block">
                            <img src={msg.image_url} alt="Attachment" className="max-h-52 max-w-full border border-rule-300/10" />
                          </a>
                        )}
                        {msg.text && <p>{msg.text}</p>}
                        <p className={`mt-2.5 font-sans text-[13px] tracking-architect ${msg.author === "homeowner" ? "text-ink-900/45" : "text-ink-500"}`}>
                          {msg.author === "homeowner" ? "You" : "Skyler · WDO Custom"} · {new Date(msg.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="blueprint-grid px-6 py-16 text-center">
                    <p className="display-sm">No messages on this job yet</p>
                    <p className="mx-auto mt-2 max-w-xs text-[12.5px] leading-relaxed text-ink-500">
                      Send a question and it lands with Skyler directly.
                    </p>
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
                className="flex gap-2 border-t border-rule-300/70 bg-paper-50 p-3 sm:p-4"
              >
                <input
                  type="text"
                  value={qaMessage}
                  onChange={(e) => setQaMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="field flex-1"
                />
                <button
                  type="submit"
                  disabled={isSendingQa || !qaMessage.trim()}
                  className="btn-ink shrink-0 px-5"
                >
                  {isSendingQa ? "..." : "Send"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── PRE-APPROVAL: SCHEDULE TAB ── */}
        {!isLocked && activeTab === "schedule" && (
          <div className="mx-auto max-w-3xl animate-rise space-y-14">
            <div>
              <div className="title-block">
                <h2 className="display-sm">Payment Schedule</h2>
                <span className="eyebrow hidden sm:block">Schedule of Values</span>
              </div>

              <div className="panel overflow-hidden">
                <div className="hidden items-baseline justify-between border-b border-rule-300/55 bg-paper-50/60 px-5 py-3 sm:flex">
                  <span className="eyebrow">Draw</span>
                  <span className="eyebrow">Amount</span>
                </div>
                {invoice.payment_phases?.map((phase: any, idx: number) => {
                  const phaseVal = phaseAmountOf(phase, baseTotal);
                  const phasePercent = phasePercentOf(phase, baseTotal);
                  return (
                    <div key={idx} className="flex items-start justify-between gap-4 border-b border-rule-300/50 px-5 py-5 transition-colors duration-200 ease-architect last:border-b-0 hover:bg-paper-100">
                      <div className="flex min-w-0 gap-3.5">
                        <span className="mt-[3px] shrink-0 font-sans text-[10px] tabular-nums text-ink-400">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium leading-snug text-ink-900">{phase.name}</p>
                          <p className="mt-1 font-sans text-[13px] tracking-architect text-ink-500">
                            {displayPercent(phasePercent)}% of contract
                          </p>
                        </div>
                      </div>
                      <span className="figure shrink-0 text-[13.5px]">
                        ${toNum(phaseVal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="title-block">
                <h2 className="display-sm">Terms</h2>
              </div>
              <dl className="panel divide-y divide-rule-200/60">
                <div className="flex items-baseline justify-between px-5 py-5">
                  <dt className="eyebrow">Construction Deposit ({depositPercent}%)</dt>
                  <dd className="figure text-[14px]">${toNum(depositAmount).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</dd>
                </div>
                <div className="flex items-baseline justify-between px-5 py-5">
                  <dt className="eyebrow">Estimated Build Timeline</dt>
                  <dd className="text-[13px] font-medium text-ink-900">{invoice.project_length || "9 Weeks"}</dd>
                </div>
                <div className="flex items-baseline justify-between px-5 py-5">
                  <dt className="eyebrow">Start Date</dt>
                  <dd className="text-[13px] font-medium text-ink-900">
                    {invoice.estimated_start_date ? new Date(invoice.estimated_start_date + 'T00:00:00').toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' }) : "Jun 15, 2026"}
                  </dd>
                </div>
              </dl>
              <p className="mt-2.5 font-sans text-[13px] tracking-architect text-ink-400">
                Start date subject to permit issuance and material lead times.
              </p>
            </div>
          </div>
        )}

        {/* ── POST-APPROVAL: SELECTIONS TAB ── */}
        {(isLocked || invoice?.selections_visible) && activeTab === "selections" && (
          <div className="mx-auto max-w-3xl animate-rise">
            {invoice.homeowner_options && invoice.homeowner_options.length > 0 ? (
              <>
                <div className="title-block">
                  <h2 className="display-sm">Finish Selections</h2>
                  <span className="eyebrow hidden sm:block">Specification Board</span>
                </div>
                <p className="-mt-1 mb-7 max-w-lg text-[12.5px] leading-relaxed text-ink-500">
                  Choose a finish for each component. Selections are logged against the build schedule once confirmed.
                </p>

                <div className="space-y-12">
                  {invoice.homeowner_options.map((group: any, gIdx: number) => {
                    const chosen = invoice.homeowner_selections?.[group.category];
                    const isPendingCategory = pendingSelection?.category === group.category;
                    return (
                      <div key={gIdx}>
                        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-rule-300/70 pb-2.5">
                          <div className="flex items-baseline gap-3">
                            <span className="font-sans text-[10px] font-medium tracking-architect text-bronze-500">
                              {String(gIdx + 1).padStart(2, "0")}
                            </span>
                            <h3 className="display-sm">{group.category}</h3>
                          </div>
                          {chosen && !isPendingCategory && (
                            <span className="badge badge-approved">
                              <span className="badge-dot bg-forest-500" />
                              {chosen}
                            </span>
                          )}
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                          {group.choices.map((choice: any, cIdx: number) => {
                            const choiceLabel = typeof choice === "string" ? choice : choice.label;
                            const imageUrl = typeof choice === "string" ? undefined : choice.image_url;
                            const productUrl = typeof choice === "string" ? undefined : choice.product_url;
                            const isChosen = chosen === choiceLabel && !isPendingCategory;
                            const isPending = isPendingCategory && pendingSelection?.value === choiceLabel;
                            return (
                              <div key={cIdx} className={`group flex flex-col overflow-hidden rounded-panel border transition-all duration-300 ease-architect ${
                                isPending
                                  ? 'border-bronze-500 shadow-riser ring-1 ring-bronze-500/30'
                                  : isChosen
                                    ? 'border-bronze-400 shadow-lift ring-1 ring-bronze-400/25'
                                    : 'border-rule-300 hover:border-rule-300 hover:shadow-riser'
                              }`}>
                                {imageUrl && (
                                  <a
                                    href={productUrl || "#"}
                                    target={productUrl ? "_blank" : undefined}
                                    rel="noopener noreferrer"
                                    onClick={(e) => { if (!productUrl) e.preventDefault(); }}
                                    className="block aspect-[4/3] overflow-hidden bg-paper-50"
                                  >
                                    <img src={imageUrl} alt={choiceLabel} className="h-full w-full object-cover transition-transform duration-500 ease-architect group-hover:scale-[1.04]" />
                                  </a>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleSelectMaterialChoice(group.category, choiceLabel)}
                                  aria-pressed={isChosen}
                                  className={`flex flex-1 items-center justify-between gap-2 px-3 py-2.5 text-left text-[12px] leading-snug transition-colors duration-200 ease-architect ${
                                    isPending
                                      ? 'bg-bronze-50 text-bronze-600'
                                      : isChosen
                                        ? 'bg-paper-50 text-ink-900'
                                        : 'bg-paper-50 text-ink-500 hover:bg-paper-100 hover:text-ink-900'
                                  }`}
                                >
                                  <span className="min-w-0">{choiceLabel}</span>
                                  {isChosen && (
                                    <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                    </svg>
                                  )}
                                  {isPending && (
                                    <span className="shrink-0 font-sans text-[13px] tracking-architect">Pending</span>
                                  )}
                                </button>
                                {productUrl && !imageUrl && (
                                  <a href={productUrl} target="_blank" rel="noopener noreferrer" className="border-t border-rule-300/55 px-3 py-1.5 font-sans text-[13px] tracking-architect text-ink-500 transition-colors duration-200 hover:text-bronze-600">
                                    View product
                                  </a>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {isPendingCategory && (
                          <div className="mt-3.5 flex flex-wrap items-center gap-2.5 border border-bronze-200 bg-bronze-50 px-5 py-4">
                            <button type="button" onClick={confirmSelection} className="btn-ink px-4 py-2">Confirm Selection</button>
                            <button type="button" onClick={() => setPendingSelection(null)} className="btn-quiet">Cancel</button>
                            <span className="font-sans text-[13px] tracking-architect text-bronze-600">Confirm to lock in your choice</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="blueprint-grid panel px-8 py-20 text-center">
                <p className="display-sm">No selections posted yet</p>
                <p className="mx-auto mt-2 max-w-xs text-[12.5px] leading-relaxed text-ink-500">
                  Finish selections will be posted here as the job progresses.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── POST-APPROVAL: PAYMENTS TAB ── */}
        {isLocked && activeTab === "payments" && (
          <div className="mx-auto max-w-3xl animate-rise space-y-14">

            {/* Deposit Dock */}
            {!invoice.deposit_cleared && (
              <div>
                <div className="title-block">
                  <h2 className="display-sm">Deposit</h2>
                  <span className="eyebrow hidden sm:block">Remittance</span>
                </div>

                <div className="panel-raised overflow-hidden">
                  <div className="flex border-b border-rule-300/70">
                    <button type="button" onClick={() => setPaymentMethod("stripe")} className={`flex-1 py-3 font-sans text-[13px] tracking-architect transition-colors duration-200 ease-architect ${paymentMethod === 'stripe' ? 'bg-paper-50 text-ink-900' : 'bg-paper-50 text-ink-500 hover:text-ink-900'}`}>Pay Online</button>
                    <button type="button" onClick={() => setPaymentMethod("check")} className={`flex-1 border-l border-rule-300/70 py-3 font-sans text-[13px] tracking-architect transition-colors duration-200 ease-architect ${paymentMethod === 'check' ? 'bg-paper-50 text-ink-900' : 'bg-paper-50 text-ink-500 hover:text-ink-900'}`}>Physical Check</button>
                  </div>

                  <div className="p-5">
                    {paymentMethod === 'stripe' ? (
                      <div className="space-y-4">
                        <div className="flex items-baseline justify-between border-b border-rule-300/55 pb-4">
                          <span className="eyebrow">Amount Due</span>
                          <span className="figure-hero text-[1.75rem] text-ink-900 sm:text-[2.375rem]">
                            ${toNum(depositAmount).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}
                          </span>
                        </div>
                        <p className="flex items-start gap-2 text-[12px] leading-relaxed text-ink-500">
                          <svg className="mt-[2px] h-3.5 w-3.5 shrink-0 text-ink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                          </svg>
                          Secure payment via Stripe. Card and ACH bank transfer accepted.
                        </p>
                        <button
                          type="button"
                          disabled={isPaymentLoading}
                          onClick={() => initiateStripePayment(depositAmount, `Construction Deposit - ${invoice.homeowner_name}`, 0)}
                          className="btn-ink w-full py-3.5 text-[12.5px]"
                        >
                          {isPaymentLoading ? "Connecting to Stripe..." : `Pay $${toNum(depositAmount).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})} Deposit`}
                        </button>
                      </div>
                    ) : (
                      <p className="text-[12.5px] leading-relaxed text-ink-500">
                        Make check payable to <span className="font-medium text-ink-900">WDO Custom</span>. Field coordinators will confirm receipt upon site staging arrival.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Payment Schedule */}
            <div>
              <div className="title-block">
                <h2 className="display-sm">Payment Schedule</h2>
                <span className="eyebrow hidden sm:block">Schedule of Values</span>
              </div>

              <div className="panel overflow-hidden">
                {invoice.payment_phases?.map((phase: any, idx: number) => {
                  const phaseVal = phaseAmountOf(phase, baseTotal);
                  const phasePercent = phasePercentOf(phase, baseTotal);
                  const activePhaseIdx = invoice.current_phase_index || 0;
                  const isPaid = invoice.deposit_cleared && idx < activePhaseIdx;
                  const isFirstPhaseDepositPaid = invoice.deposit_cleared && idx === 0;
                  const isPhaseActive = idx === activePhaseIdx || (idx === 0 && !invoice.deposit_cleared);
                  const canPayPhase = isPhaseActive && !(isPaid || isFirstPhaseDepositPaid) && idx > 0;

                  return (
                    <div key={idx} className={`border-b border-rule-300/50 px-5 py-5 last:border-b-0 ${isPhaseActive && !(isPaid || isFirstPhaseDepositPaid) ? 'border-l-2 border-l-bronze-500 bg-bronze-50/40' : ''}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 gap-3.5">
                          <span className="mt-[3px] shrink-0 font-sans text-[10px] tabular-nums text-ink-400">
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium leading-snug text-ink-900">{phase.name}</p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                              {(isPaid || isFirstPhaseDepositPaid) ? (
                                <span className="badge badge-approved"><span className="badge-dot bg-forest-500" />Paid</span>
                              ) : isPhaseActive ? (
                                <span className="badge badge-pending"><span className="badge-dot bg-bronze-400" />Active</span>
                              ) : (
                                <span className="badge badge-neutral"><span className="badge-dot bg-rule-300" />Scheduled</span>
                              )}
                              <span className="font-sans text-[13px] tracking-architect text-ink-500">
                                {displayPercent(phasePercent)}% of contract
                              </span>
                            </div>
                          </div>
                        </div>
                        <span className="figure shrink-0 text-[13.5px]">
                          ${toNum(phaseVal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      {canPayPhase && (
                        <button
                          type="button"
                          disabled={isPaymentLoading}
                          onClick={() => initiateStripePayment(phaseVal, `${phase.name} - ${invoice.homeowner_name}`, idx)}
                          className="btn-ink mt-3.5 w-full py-2.5"
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
              <div>
                <div className="title-block">
                  <h2 className="display-sm">Scope Modifications</h2>
                  <span className="eyebrow hidden sm:block">{changeOrders.length} on record</span>
                </div>

                <div className="panel overflow-hidden">
                  {changeOrders.map((co: any) => {
                    const isCoApproved = co.status === "approved";
                    const isCoPaid = co.deposit_cleared;
                    const isExpanded = expandedCoId === co.id;

                    return (
                      <div key={co.id} className="border-b border-rule-300/50 last:border-b-0">
                        <div onClick={() => setExpandedCoId(isExpanded ? null : co.id)} className="flex cursor-pointer items-start justify-between gap-4 px-5 py-5 transition-colors duration-200 ease-architect hover:bg-paper-100">
                          <div className="min-w-0">
                            {co.proposal_number && (
                              <p className="font-sans text-[9.5px] tracking-architect text-ink-400">{co.proposal_number}</p>
                            )}
                            <p className="mt-0.5 truncate text-[13px] font-medium leading-snug text-ink-900">{co.description}</p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              <span className={`badge ${isCoApproved ? 'badge-approved' : 'badge-pending'}`}>
                                <span className={`badge-dot ${isCoApproved ? 'bg-forest-500' : 'bg-bronze-400'}`} />
                                {isCoApproved ? "Approved" : "Pending"}
                              </span>
                              {isCoApproved && (
                                <span className={`badge ${isCoPaid ? 'badge-approved' : 'badge-declined'}`}>
                                  {isCoPaid ? "Paid" : "Unpaid"}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <span className="figure text-[13.5px]">${toNum(co.amount).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                            <svg className={`h-3 w-3 shrink-0 text-ink-400 transition-transform duration-300 ease-architect ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="animate-rise space-y-3 border-t border-rule-300/50 bg-paper-50/50 p-4">
                            <div className="panel overflow-hidden">
                              {co.items?.map((item: any, iIdx: number) => (
                                <div key={iIdx} className="flex items-baseline justify-between gap-4 border-b border-rule-300/50 px-3.5 py-2.5 last:border-b-0">
                                  <span className="min-w-0 truncate text-[12.5px] text-ink-500">{item.title}</span>
                                  <span className="figure shrink-0 text-[12.5px]">${toNum(item.cost).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                                </div>
                              ))}
                            </div>
                            {!isCoApproved && (
                              <button type="button" onClick={() => executeOneClickCoApproval(co.id)} className="btn-ink w-full py-2.5">
                                Approve Change Order
                              </button>
                            )}
                            {isCoApproved && !isCoPaid && (
                              <button
                                type="button"
                                disabled={isPaymentLoading}
                                onClick={() => initiateStripePayment(toNum(co.amount), `Change Order - ${co.description} - ${invoice.homeowner_name}`)}
                                className="btn-ink w-full py-2.5"
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
            <div>
              <div className="title-block">
                <h2 className="display-sm">Account Summary</h2>
              </div>

              <div className="panel-raised overflow-hidden">
                <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 bg-paper-50 px-6 pb-9 pt-7 text-ink-900">
                  <span className="eyebrow-invert">Total Project Value</span>
                  <span className="figure-hero text-[2rem] text-ink-900 sm:text-[3rem]">
                    ${toNum(combinedProjectTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {Array.isArray(invoice.payment_history) && invoice.payment_history.length > 0 && (
                  <>
                    <p className="eyebrow border-b border-rule-300/55 bg-paper-50/60 px-6 py-3">Payment Receipts</p>
                    {invoice.payment_history.map((pmt: any, i: number) => (
                      <div key={i} className="flex items-start justify-between gap-4 border-b border-rule-300/50 px-6 py-5">
                        <div className="min-w-0">
                          <p className="text-[12.5px] font-medium text-ink-900">
                            {pmt.phase_index === 0 ? "Deposit" : `Phase ${pmt.phase_index} Draw`}
                          </p>
                          <p className="mt-1 font-sans text-[13px] tracking-architect text-ink-500">
                            {new Date(pmt.paid_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                            {pmt.customer_email && ` · ${pmt.customer_email}`}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="figure text-[13px] text-forest-600">
                            ${toNum(pmt.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                          <p className="mt-0.5 font-sans text-[13px] tracking-architect text-forest-600">Confirmed</p>
                        </div>
                      </div>
                    ))}
                    <dl className="divide-y divide-rule-200/60">
                      <div className="flex items-baseline justify-between px-6 py-5">
                        <dt className="eyebrow">Total Paid</dt>
                        <dd className="figure text-[14px] text-forest-600">
                          ${invoice.payment_history.reduce((s: number, p: any) => s + toNum(p.amount), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </dd>
                      </div>
                      <div className="flex items-baseline justify-between bg-paper-50/60 px-6 py-5">
                        <dt className="eyebrow-ink">Remaining Balance</dt>
                        <dd className="figure text-[17px]">
                          ${(combinedProjectTotal - invoice.payment_history.reduce((s: number, p: any) => s + toNum(p.amount), 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </dd>
                      </div>
                    </dl>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── NOTES TAB ── */}
        {activeTab === "notes" && (
          <div className="mx-auto max-w-3xl animate-rise">
            <div className="title-block">
              <h2 className="display-sm">Project Notes</h2>
              <span className="eyebrow hidden sm:block">From your contractor</span>
            </div>

            <div className="border-t border-rule-300/70">
              {((invoice as any)?.contractor_notes || []).filter((n: any) => n.visible).map((note: any, i: number) => (
                <div key={i} className="border-b border-rule-300/55 px-1 py-5 sm:px-2">
                  <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink-500">{note.text}</p>
                  <p className="mt-2.5 font-sans text-[13px] tracking-architect text-ink-500">
                    Skyler · WDO Custom · {new Date(note.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── DOCS TAB (both pre and post approval) ── */}
        {activeTab === "docs" && (
          <div className="mx-auto max-w-3xl animate-rise">
            <div className="title-block">
              <h2 className="display-sm">Documents</h2>
              <span className="eyebrow hidden sm:block">Contracts, permits, plans</span>
            </div>

            {Array.isArray((invoice as any).documents) && (invoice as any).documents.length > 0 ? (
              <div className="border-t border-rule-300/70">
                {(invoice as any).documents.map((doc: any, i: number) => (
                  <div key={i} className="group flex items-center justify-between gap-4 border-b border-rule-300/55 px-1 py-4 transition-colors duration-300 ease-architect hover:bg-paper-50 sm:px-2">
                    <div className="flex min-w-0 items-center gap-3.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-rule-300 bg-paper-50 font-sans text-[13px] tracking-architect text-ink-500 transition-colors duration-300 ease-architect group-hover:border-bronze-300 group-hover:bg-bronze-50 group-hover:text-bronze-600">
                        {doc.name?.split('.').pop()?.slice(0, 4)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-ink-900">{doc.name}</p>
                        <p className="mt-0.5 font-sans text-[13px] tracking-architect text-ink-500">
                          {new Date(doc.uploaded_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          {doc.size && ` · ${(doc.size / 1024).toFixed(0)} KB`}
                        </p>
                      </div>
                    </div>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-outline shrink-0 px-3 py-2 sm:px-4"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      <span className="hidden sm:inline">View</span>
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="blueprint-grid panel px-8 py-20 text-center">
                <p className="display-sm">No documents on this job yet</p>
                <p className="mx-auto mt-2 max-w-xs text-[12.5px] leading-relaxed text-ink-500">
                  Contracts, permits and plans will appear here as the job progresses.
                </p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
