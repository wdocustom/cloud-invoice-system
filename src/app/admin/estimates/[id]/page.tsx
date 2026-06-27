"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";

function fmt(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export default function EstimateDetailPage() {
  const router = useRouter();
  const params = useParams();
  const estimateId = params?.id as string;

  const [estimate, setEstimate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);

  useEffect(() => {
    if (estimateId) fetchEstimate();
  }, [estimateId]);

  async function fetchEstimate() {
    setLoading(true);
    const { data, error } = await supabase
      .from("estimates")
      .select("*")
      .eq("id", estimateId)
      .single();
    if (error || !data) {
      toast("Estimate not found", "error");
      router.push("/admin/projects");
      return;
    }
    setEstimate(data);
    setLoading(false);
  }

  async function handleConvert() {
    if (!confirm("Convert this estimate to a proposal? This will create a new project in your portfolio.")) return;
    setConverting(true);
    try {
      const res = await fetch("/api/convert-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estimate_id: estimateId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Conversion failed");
      toast("Converted to proposal!", "success");
      router.push(`/admin/projects/${data.invoice_id}`);
    } catch (err: any) {
      toast(err.message || "Conversion failed", "error");
    } finally {
      setConverting(false);
    }
  }

  async function handleSendReminder() {
    if (!estimate?.email) {
      toast("No email address on file — can't send reminder", "error");
      return;
    }
    setSendingReminder(true);
    try {
      const res = await fetch("/api/send-estimate-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estimate_id: estimateId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      toast("Reminder sent!", "success");
      fetchEstimate();
    } catch (err: any) {
      toast(err.message || "Failed to send reminder", "error");
    } finally {
      setSendingReminder(false);
    }
  }

  async function updateStatus(status: string) {
    await supabase.from("estimates").update({ status }).eq("id", estimateId);
    setEstimate((prev: any) => ({ ...prev, status }));
    toast(`Status updated to ${status.replace("_", " ")}`, "success");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-alabaster flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-brand-charcoal/20 border-t-brand-charcoal rounded-full animate-spin" />
          <p className="text-xs font-medium text-brand-muted">Loading estimate...</p>
        </div>
      </div>
    );
  }

  if (!estimate) return null;

  const ed = estimate.estimate_data || {};
  const isConverted = !!estimate.converted_to_invoice_id;
  const reminderCount = Array.isArray(estimate.reminder_emails) ? estimate.reminder_emails.length : 0;
  const createdDate = new Date(estimate.created_at).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });

  const statusColors: Record<string, string> = {
    new: "bg-blue-50 text-blue-700 border-blue-200",
    contacted: "bg-luxury-soft text-luxury-ochre border-luxury-champagne",
    consultation_scheduled: "bg-emerald-50 text-emerald-700 border-emerald-200",
    converted: "bg-sage-50 text-sage-700 border-sage-200",
  };
  const statusLabels: Record<string, string> = {
    new: "New Lead",
    contacted: "Contacted",
    consultation_scheduled: "Consultation Set",
    converted: "Converted",
  };

  return (
    <div className="min-h-screen bg-brand-alabaster text-brand-charcoal font-sans antialiased pb-24">

      {/* Header */}
      <div className="border-b border-brand-stone/60 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button type="button" onClick={() => router.push("/admin/projects")} className="text-brand-muted hover:text-brand-charcoal transition-colors shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="min-w-0">
              <h1 className="font-editorial text-lg sm:text-xl font-bold tracking-tight text-brand-charcoal truncate">
                {estimate.name || "Anonymous Lead"}
              </h1>
              <p className="text-[11px] font-medium tracking-wide text-brand-muted">{estimate.project_type}</p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1 font-semibold text-[9px] px-2.5 py-1 rounded-full tracking-wide uppercase border shrink-0 ${
            statusColors[estimate.status] || statusColors.new
          }`}>
            {statusLabels[estimate.status] || "New Lead"}
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6">

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          {!isConverted && (
            <button
              type="button"
              onClick={handleConvert}
              disabled={converting}
              className="bg-brand-charcoal hover:bg-brand-charcoal/90 disabled:opacity-50 text-white font-bold text-xs tracking-wide uppercase px-6 py-3 rounded-xl transition-all shadow-sm"
            >
              {converting ? "Converting..." : "Convert to Proposal"}
            </button>
          )}
          {isConverted && (
            <button
              type="button"
              onClick={() => router.push(`/admin/projects/${estimate.converted_to_invoice_id}`)}
              className="bg-sage-600 hover:bg-sage-700 text-white font-bold text-xs tracking-wide uppercase px-6 py-3 rounded-xl transition-all shadow-sm"
            >
              View Proposal
            </button>
          )}
          {estimate.email && !isConverted && (
            <button
              type="button"
              onClick={handleSendReminder}
              disabled={sendingReminder}
              className="border border-brand-stone/50 hover:border-brand-charcoal/30 text-brand-charcoal disabled:opacity-50 font-bold text-xs tracking-wide uppercase px-6 py-3 rounded-xl transition-all"
            >
              {sendingReminder ? "Sending..." : `Send Reminder${reminderCount > 0 ? ` (${reminderCount} sent)` : ""}`}
            </button>
          )}
          <a
            href={`/estimate/${estimate.token}`}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-brand-stone/50 hover:border-brand-charcoal/30 text-brand-charcoal font-bold text-xs tracking-wide uppercase px-6 py-3 rounded-xl transition-all"
          >
            View Public Link
          </a>
        </div>

        {/* Status Changer */}
        {!isConverted && (
          <div className="bg-white rounded-2xl shadow-soft border border-brand-stone/30 p-5">
            <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest mb-3">Update Status</p>
            <div className="flex flex-wrap gap-2">
              {(["new", "contacted", "consultation_scheduled"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => updateStatus(s)}
                  className={`text-[11px] font-bold px-4 py-2 rounded-lg border transition-all ${
                    estimate.status === s
                      ? "bg-brand-charcoal text-white border-brand-charcoal"
                      : "bg-white text-brand-muted border-brand-stone/40 hover:border-brand-charcoal/30"
                  }`}
                >
                  {statusLabels[s]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Contact Info Card */}
        <div className="bg-white rounded-2xl shadow-soft border border-brand-stone/30 p-5">
          <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest mb-4">Contact Information</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-semibold text-brand-muted uppercase tracking-wide">Name</p>
              <p className="text-sm font-bold text-brand-charcoal mt-0.5">{estimate.name || "Not provided"}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-brand-muted uppercase tracking-wide">Email</p>
              {estimate.email ? (
                <a href={`mailto:${estimate.email}`} className="text-sm font-bold text-brand-charcoal mt-0.5 underline underline-offset-2">{estimate.email}</a>
              ) : (
                <p className="text-sm font-bold text-brand-muted mt-0.5">Not provided</p>
              )}
            </div>
            <div>
              <p className="text-[10px] font-semibold text-brand-muted uppercase tracking-wide">Phone</p>
              {estimate.phone ? (
                <a href={`tel:${estimate.phone}`} className="text-sm font-bold text-brand-charcoal mt-0.5 underline underline-offset-2">{estimate.phone}</a>
              ) : (
                <p className="text-sm font-bold text-brand-muted mt-0.5">Not provided</p>
              )}
            </div>
            <div>
              <p className="text-[10px] font-semibold text-brand-muted uppercase tracking-wide">Submitted</p>
              <p className="text-sm font-bold text-brand-charcoal mt-0.5">{createdDate}</p>
            </div>
          </div>
        </div>

        {/* Project Details */}
        <div className="bg-white rounded-2xl shadow-soft border border-brand-stone/30 p-5">
          <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest mb-4">Project Details</p>
          <div className="grid sm:grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-[10px] font-semibold text-brand-muted uppercase tracking-wide">Type</p>
              <p className="text-sm font-bold text-brand-charcoal mt-0.5">{estimate.project_type}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-brand-muted uppercase tracking-wide">Finish Level</p>
              <p className="text-sm font-bold text-brand-charcoal mt-0.5 capitalize">{estimate.scope_level}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-brand-muted uppercase tracking-wide">Size / ZIP</p>
              <p className="text-sm font-bold text-brand-charcoal mt-0.5">
                {[estimate.size, estimate.zip].filter(Boolean).join(" · ") || "Not provided"}
              </p>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-brand-muted uppercase tracking-wide mb-1">Description</p>
            <p className="text-sm text-brand-charcoal leading-relaxed bg-brand-alabaster rounded-xl p-4 border border-brand-stone/20">
              {estimate.description}
            </p>
          </div>
        </div>

        {/* Estimate Breakdown */}
        <div className="bg-white rounded-2xl shadow-soft border border-brand-stone/30 overflow-hidden">
          <div className="bg-brand-charcoal px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-luxury-gold uppercase tracking-widest">AI Estimate</p>
                <p className="text-base font-black text-white mt-0.5">{ed.project_title}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-luxury-gold" style={{fontVariantNumeric:"tabular-nums"}}>
                  ${fmt(ed.total_projected_low || 0)} — ${fmt(ed.total_projected_high || 0)}
                </p>
                {ed.timeline_weeks && (
                  <p className="text-[10px] text-white/40 mt-0.5">{ed.timeline_weeks} weeks</p>
                )}
              </div>
            </div>
          </div>

          <div className="divide-y divide-brand-stone/15">
            {(ed.line_items || []).map((item: any, i: number) => (
              <div key={i} className="px-5 py-3 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-md bg-brand-warm flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[9px] font-black text-brand-muted">{i + 1}</span>
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-brand-charcoal">{item.item}</p>
                    {item.notes && <p className="text-[11px] text-brand-muted mt-0.5">{item.notes}</p>}
                  </div>
                </div>
                <p className="text-sm font-bold text-brand-charcoal flex-shrink-0" style={{fontVariantNumeric:"tabular-nums"}}>
                  ${fmt(item.low)} — ${fmt(item.high)}
                </p>
              </div>
            ))}
          </div>

          <div className="bg-brand-warm/40 border-t border-brand-stone/20 px-5 py-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-brand-charcoal uppercase tracking-wide">Total Estimate</span>
              <span className="text-base font-black text-brand-charcoal" style={{fontVariantNumeric:"tabular-nums"}}>
                ${fmt(ed.total_projected_low || 0)} — ${fmt(ed.total_projected_high || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Reminder History */}
        {reminderCount > 0 && (
          <div className="bg-white rounded-2xl shadow-soft border border-brand-stone/30 p-5">
            <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest mb-3">Reminder History</p>
            <div className="space-y-2">
              {(estimate.reminder_emails as any[]).map((r: any, i: number) => (
                <div key={i} className="flex items-center gap-3 text-xs">
                  <span className="w-5 h-5 rounded-full bg-brand-warm flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-brand-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  </span>
                  <span className="text-brand-muted">Sent to {r.to}</span>
                  <span className="text-brand-muted/50">·</span>
                  <span className="text-brand-muted">
                    {new Date(r.sent_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Public Estimate Link */}
        <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-5 flex items-center gap-3">
          <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.364-3.314a4.5 4.5 0 00-6.364 0l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-blue-800">Customer&apos;s Estimate Link</p>
            <p className="text-[11px] text-blue-600 font-mono truncate">wdocustom.com/estimate/{estimate.token}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(`https://www.wdocustom.com/estimate/${estimate.token}`);
              toast("Link copied!", "success");
            }}
            className="text-[10px] font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 px-3 py-1.5 rounded-lg transition-colors shrink-0"
          >
            Copy
          </button>
        </div>
      </div>
    </div>
  );
}
