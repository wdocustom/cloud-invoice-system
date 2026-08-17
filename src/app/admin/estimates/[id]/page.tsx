"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";

function fmt(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  project_type: "",
  size: "",
  notes: "",
};

type LeadForm = typeof EMPTY_FORM;

export default function EstimateDetailPage() {
  const router = useRouter();
  const params = useParams();
  const estimateId = params?.id as string;

  const [estimate, setEstimate] = useState<any>(null);
  const [proposalNumber, setProposalNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [savingLead, setSavingLead] = useState(false);
  const [form, setForm] = useState<LeadForm>(EMPTY_FORM);

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

    if (data.converted_to_invoice_id) {
      const { data: proposal } = await supabase
        .from("invoices")
        .select("proposal_number")
        .eq("id", data.converted_to_invoice_id)
        .single();
      setProposalNumber(proposal?.proposal_number || "");
    }

    setLoading(false);
  }

  function openEditor() {
    const next = { ...EMPTY_FORM };
    (Object.keys(EMPTY_FORM) as (keyof LeadForm)[]).forEach((key) => {
      next[key] = estimate?.[key] || "";
    });
    setForm(next);
    setIsEditOpen(true);
  }

  async function saveLead() {
    setSavingLead(true);
    try {
      const res = await fetch("/api/update-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: estimateId, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");

      setEstimate((prev: any) => ({ ...prev, ...(data.lead || form) }));
      setIsEditOpen(false);
      toast("Customer details updated", "success");

      if (Array.isArray(data.dropped_columns) && data.dropped_columns.length > 0) {
        toast(
          `Couldn't save ${data.dropped_columns.join(", ")} — run the latest migration in Supabase.`,
          "error"
        );
      }
    } catch (err: any) {
      toast(err.message || "Save failed", "error");
    } finally {
      setSavingLead(false);
    }
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
      const converted = data.proposal_number ? `Converted to proposal ${data.proposal_number}` : "Converted to proposal!";
      toast(data.warning || converted, data.warning ? "error" : "success");
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
  const fullAddress = [
    estimate.address,
    estimate.city,
    [estimate.state, estimate.zip].filter(Boolean).join(" "),
  ]
    .map((part: string) => (part || "").trim())
    .filter(Boolean)
    .join(", ");
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
              {estimate.estimate_number && (
                <p className="font-mono text-[10px] font-bold text-brand-muted tracking-widest">{estimate.estimate_number}</p>
              )}
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

        {/* Document Numbering — issued here at the lead, inherited by the proposal */}
        {estimate.estimate_number && (
          <div className="bg-white rounded-2xl shadow-soft border border-brand-stone/30 p-5">
            <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest mb-3">Document Number</p>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono text-sm font-bold text-brand-charcoal bg-brand-warm border border-brand-stone/40 rounded-lg px-3 py-1.5 tracking-wider">
                {estimate.estimate_number}
              </span>
              <span className="text-brand-muted text-sm">→</span>
              {proposalNumber ? (
                <span className="font-mono text-sm font-bold text-sage-700 bg-sage-50 border border-sage-200 rounded-lg px-3 py-1.5 tracking-wider">
                  {proposalNumber}
                </span>
              ) : (
                <span className="text-[11px] font-medium text-brand-muted">
                  becomes {estimate.estimate_number.replace(/^EST-/, "PRO-")} when you convert this lead
                </span>
              )}
            </div>
          </div>
        )}

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
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">Contact Information</p>
            <button
              type="button"
              onClick={openEditor}
              className="bg-brand-warm hover:bg-brand-stone/40 text-brand-charcoal font-bold text-[10px] px-3 py-1.5 rounded-lg uppercase tracking-wider transition-colors"
            >
              Edit Customer
            </button>
          </div>
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
            <div className="sm:col-span-2">
              <p className="text-[10px] font-semibold text-brand-muted uppercase tracking-wide">Project Address</p>
              <p className={`text-sm font-bold mt-0.5 ${fullAddress ? "text-brand-charcoal" : "text-brand-muted"}`}>
                {fullAddress || "Not provided"}
              </p>
            </div>
          </div>

          {estimate.notes && (
            <div className="mt-4 pt-4 border-t border-brand-stone/20">
              <p className="text-[10px] font-semibold text-brand-muted uppercase tracking-wide mb-1">
                Internal Notes <span className="normal-case font-medium">(never shown to the customer)</span>
              </p>
              <p className="text-sm text-brand-charcoal leading-relaxed whitespace-pre-wrap">{estimate.notes}</p>
            </div>
          )}
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

      {/* Edit Customer Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 bg-brand-charcoal/40 backdrop-blur-sm z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-brand-stone/40 rounded-2xl w-full max-w-lg my-8 shadow-elevated">
            <div className="px-5 pt-5 pb-3 border-b border-brand-stone/20">
              <h3 className="font-editorial text-base font-bold text-brand-charcoal">Edit Customer</h3>
              <p className="text-[11px] text-brand-muted font-medium mt-0.5">
                These details travel with the lead onto the proposal when you convert it.
              </p>
            </div>

            <div className="p-5 space-y-4">
              <Field label="Name">
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputClass}
                />
              </Field>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Email">
                  <input
                    type="email"
                    inputMode="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="name@example.com"
                    className={inputClass}
                  />
                </Field>
                <Field label="Phone">
                  <input
                    type="tel"
                    inputMode="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field label="Street Address">
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="1234 Oak Street"
                  className={inputClass}
                />
              </Field>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="col-span-2">
                  <Field label="City">
                    <input
                      type="text"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      placeholder="Omaha"
                      className={inputClass}
                    />
                  </Field>
                </div>
                <Field label="State">
                  <input
                    type="text"
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    placeholder="NE"
                    className={inputClass}
                  />
                </Field>
                <Field label="ZIP">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.zip}
                    onChange={(e) => setForm({ ...form, zip: e.target.value })}
                    className={inputClass}
                  />
                </Field>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Project Type">
                  <input
                    type="text"
                    value={form.project_type}
                    onChange={(e) => setForm({ ...form, project_type: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label="Size / Scope">
                  <input
                    type="text"
                    value={form.size}
                    onChange={(e) => setForm({ ...form, size: e.target.value })}
                    placeholder="e.g. 400 sq ft"
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field label="Internal Notes">
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  placeholder="Gate code, best time to call, site conditions…"
                  className={`${inputClass} resize-y`}
                />
                <p className="text-[10px] text-brand-muted mt-1">
                  Carried onto the proposal as a private contractor note — hidden from the homeowner.
                </p>
              </Field>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 pb-5">
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="bg-brand-warm hover:bg-brand-stone/40 text-brand-muted font-bold text-[10px] px-4 py-2.5 rounded-xl uppercase tracking-wider transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveLead}
                disabled={savingLead}
                className="bg-brand-charcoal hover:bg-brand-charcoal/90 disabled:opacity-50 text-white font-bold text-[10px] px-5 py-2.5 rounded-xl uppercase tracking-wider transition-all shadow-sm"
              >
                {savingLead ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputClass =
  "w-full py-2.5 px-3.5 bg-brand-alabaster border border-brand-stone/40 rounded-xl text-sm font-semibold text-brand-charcoal outline-none focus:bg-white focus:border-brand-charcoal/30 transition-all";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-bold text-brand-muted uppercase tracking-wide block mb-1">{label}</label>
      {children}
    </div>
  );
}
