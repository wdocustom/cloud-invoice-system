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
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-6 w-6 animate-spin rounded-full border border-taupe-300/70 border-t-espresso-900" />
          <p className="font-sans text-[10px] uppercase tracking-architect text-taupe-400">Loading estimate</p>
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
    new: "badge-ink",
    contacted: "badge-pending",
    consultation_scheduled: "badge-neutral",
    converted: "badge-approved",
  };
  const statusLabels: Record<string, string> = {
    new: "New Lead",
    contacted: "Contacted",
    consultation_scheduled: "Consultation Set",
    converted: "Converted",
  };

  return (
    <div className="pb-28 text-left">

      {/* ── Sheet header ──────────────────────────────────────────────── */}
      <div className="border-b border-taupe-200/70 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-8">
          <button
            type="button"
            onClick={() => router.push("/admin/projects")}
            className="btn-quiet -ml-3 mb-5 font-sans text-[10px] uppercase tracking-architect"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Portfolio
          </button>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {estimate.estimate_number && (
              <span className="font-sans text-[10px] tracking-architect text-taupe-400">{estimate.estimate_number}</span>
            )}
            <span className={`badge ${statusColors[estimate.status] || statusColors.new}`}>
              <span aria-hidden className="badge-dot bg-current opacity-60" />
              {statusLabels[estimate.status] || "New Lead"}
            </span>
          </div>

          <h1 className="display-lg mt-2.5 truncate">
            {estimate.name || "Anonymous Lead"}
          </h1>
          <p className="mt-2 font-sans text-[10px] uppercase tracking-architect text-taupe-400">{estimate.project_type}</p>

          {/* Actions */}
          <div className="mt-6 flex flex-wrap gap-2">
            {!isConverted && (
              <button
                type="button"
                onClick={handleConvert}
                disabled={converting}
                className="btn-ink"
              >
                {converting ? "Converting..." : "Convert to Proposal"}
              </button>
            )}
            {isConverted && (
              <button
                type="button"
                onClick={() => router.push(`/admin/projects/${estimate.converted_to_invoice_id}`)}
                className="btn-ink"
              >
                View Proposal
              </button>
            )}
            {estimate.email && !isConverted && (
              <button
                type="button"
                onClick={handleSendReminder}
                disabled={sendingReminder}
                className="btn-outline"
              >
                {sendingReminder ? "Sending..." : `Send Reminder${reminderCount > 0 ? ` (${reminderCount} sent)` : ""}`}
              </button>
            )}
            <a
              href={`/estimate/${estimate.token}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline"
            >
              View Public Link
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H18v4.5M17.25 6.75L10.5 13.5M18 14.25v3.75A1.5 1.5 0 0116.5 19.5h-10.5A1.5 1.5 0 014.5 18V7.5A1.5 1.5 0 016 6h3.75" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-14 px-5 pt-12 sm:px-8 sm:pt-16">

        {/* Document numbering — issued at the lead, inherited by the proposal */}
        {estimate.estimate_number && (
          <section className="animate-rise">
            <div className="title-block">
              <h2 className="display-sm">Document Number</h2>
              <span className="eyebrow hidden sm:block">Sequence</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="rounded-edge border border-taupe-200 bg-alabaster-100 px-3 py-1.5 font-sans text-[11.5px] tracking-architect text-espresso-900">
                {estimate.estimate_number}
              </span>
              <svg aria-hidden className="h-3.5 w-3.5 shrink-0 text-taupe-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
              {proposalNumber ? (
                <span className="rounded-edge border border-patina-200 bg-patina-50 px-3 py-1.5 font-sans text-[11.5px] tracking-architect text-patina-700">
                  {proposalNumber}
                </span>
              ) : (
                <span className="text-[12.5px] leading-relaxed text-taupe-500">
                  Becomes{" "}
                  <span className="font-sans text-[11.5px] tracking-architect text-espresso-900">
                    {estimate.estimate_number.replace(/^EST-/, "PRO-")}
                  </span>{" "}
                  on conversion
                </span>
              )}
            </div>
          </section>
        )}

        {/* Status */}
        {!isConverted && (
          <section className="animate-rise">
            <div className="title-block">
              <h2 className="display-sm">Status</h2>
              <span className="eyebrow hidden sm:block">Pipeline</span>
            </div>
            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-edge bg-taupe-200 shadow-riser ring-1 ring-taupe-200/60 sm:inline-grid sm:grid-cols-3">
              {(["new", "contacted", "consultation_scheduled"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => updateStatus(s)}
                  className={`px-6 py-3 text-center font-sans text-[10px] uppercase tracking-architect transition-colors duration-200 ease-architect ${
                    estimate.status === s
                      ? "bg-espresso-900 text-alabaster-50"
                      : "bg-white text-taupe-500 hover:bg-alabaster-50 hover:text-espresso-900"
                  }`}
                >
                  {statusLabels[s]}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Contact */}
        <section className="animate-rise">
          <div className="title-block">
            <h2 className="display-sm">Contact</h2>
            <button
              type="button"
              onClick={openEditor}
              className="btn-outline shrink-0 px-3 py-1.5 font-sans text-[10px] uppercase tracking-architect"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
              </svg>
              Edit
            </button>
          </div>

          <dl className="border-t border-taupe-200/70">
            <div className="flex flex-col gap-0.5 border-b border-taupe-200/55 py-3 sm:flex-row sm:items-baseline sm:gap-6">
              <dt className="eyebrow sm:w-44 sm:shrink-0">Name</dt>
              <dd className="min-w-0 text-[13.5px] text-espresso-900">{estimate.name || "Not provided"}</dd>
            </div>
            <div className="flex flex-col gap-0.5 border-b border-taupe-200/55 py-3 sm:flex-row sm:items-baseline sm:gap-6">
              <dt className="eyebrow sm:w-44 sm:shrink-0">Email</dt>
              <dd className="min-w-0 break-words text-[13.5px] text-espresso-900">
                {estimate.email ? (
                  <a href={`mailto:${estimate.email}`} className="underline decoration-espresso-900/20 underline-offset-4 transition-colors duration-200 ease-architect hover:decoration-espresso-900">{estimate.email}</a>
                ) : (
                  <span className="text-taupe-400">Not provided</span>
                )}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5 border-b border-taupe-200/55 py-3 sm:flex-row sm:items-baseline sm:gap-6">
              <dt className="eyebrow sm:w-44 sm:shrink-0">Phone</dt>
              <dd className="min-w-0 text-[13.5px] text-espresso-900">
                {estimate.phone ? (
                  <a href={`tel:${estimate.phone}`} className="tnum underline decoration-espresso-900/20 underline-offset-4 transition-colors duration-200 ease-architect hover:decoration-espresso-900">{estimate.phone}</a>
                ) : (
                  <span className="text-taupe-400">Not provided</span>
                )}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5 border-b border-taupe-200/55 py-3 sm:flex-row sm:items-baseline sm:gap-6">
              <dt className="eyebrow sm:w-44 sm:shrink-0">Submitted</dt>
              <dd className="min-w-0 text-[13.5px] tabular-nums text-espresso-900">{createdDate}</dd>
            </div>
            <div className="flex flex-col gap-0.5 border-b border-taupe-200/55 py-3 sm:flex-row sm:items-baseline sm:gap-6">
              <dt className="eyebrow sm:w-44 sm:shrink-0">Project Address</dt>
              <dd className={`min-w-0 text-[13.5px] ${fullAddress ? "text-espresso-900" : "text-taupe-400"}`}>
                {fullAddress || "Not provided"}
              </dd>
            </div>
          </dl>

          {estimate.notes && (
            <div className="panel-sunken mt-5 p-5 sm:p-7">
              <p className="eyebrow">
                Internal Notes <span className="normal-case tracking-normal text-taupe-300">(never shown to the customer)</span>
              </p>
              <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-taupe-700">{estimate.notes}</p>
            </div>
          )}
        </section>

        {/* Project details */}
        <section className="animate-rise">
          <div className="title-block">
            <h2 className="display-sm">Project</h2>
            <span className="eyebrow hidden sm:block">Brief</span>
          </div>

          <dl className="border-t border-taupe-200/70">
            <div className="flex flex-col gap-0.5 border-b border-taupe-200/55 py-3 sm:flex-row sm:items-baseline sm:gap-6">
              <dt className="eyebrow sm:w-44 sm:shrink-0">Type</dt>
              <dd className="min-w-0 text-[13.5px] text-espresso-900">{estimate.project_type}</dd>
            </div>
            <div className="flex flex-col gap-0.5 border-b border-taupe-200/55 py-3 sm:flex-row sm:items-baseline sm:gap-6">
              <dt className="eyebrow sm:w-44 sm:shrink-0">Finish Level</dt>
              <dd className="min-w-0 text-[13.5px] capitalize text-espresso-900">{estimate.scope_level}</dd>
            </div>
            <div className="flex flex-col gap-0.5 border-b border-taupe-200/55 py-3 sm:flex-row sm:items-baseline sm:gap-6">
              <dt className="eyebrow sm:w-44 sm:shrink-0">Size / ZIP</dt>
              <dd className="min-w-0 text-[13.5px] tabular-nums text-espresso-900">
                {[estimate.size, estimate.zip].filter(Boolean).join(" · ") || "Not provided"}
              </dd>
            </div>
          </dl>

          <div className="mt-5">
            <p className="eyebrow">Description</p>
            <p className="panel-sunken mt-2 p-4 text-[13px] leading-relaxed text-taupe-700 sm:p-5">
              {estimate.description}
            </p>
          </div>
        </section>

        {/* Schedule of values */}
        <section className="animate-rise">
          <div className="title-block">
            <h2 className="display-sm">Estimate</h2>
            <span className="eyebrow hidden sm:block">Schedule of Values</span>
          </div>

          <div className="panel overflow-hidden">
            <div className="border-b border-taupe-200/70 bg-espresso-900 px-6 py-5 text-alabaster-100">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                  <p className="eyebrow-invert">Projected Range</p>
                  <p className="mt-1.5 font-display text-[1.25rem] leading-tight tracking-[-0.01em] sm:text-[1.4rem]">{ed.project_title}</p>
                </div>
                <div className="shrink-0 sm:text-right">
                  <p className="figure text-[15px] text-alabaster-50 sm:text-[16.5px]">
                    ${fmt(ed.total_projected_low || 0)} — ${fmt(ed.total_projected_high || 0)}
                  </p>
                  {ed.timeline_weeks && (
                    <p className="eyebrow-invert mt-1.5">{ed.timeline_weeks} weeks</p>
                  )}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-left">
                <thead>
                  <tr className="border-b border-taupe-200/55 bg-alabaster-100/60">
                    <th scope="col" className="eyebrow w-12 px-5 py-3 font-medium">No.</th>
                    <th scope="col" className="eyebrow px-2 py-2.5 font-medium">Description</th>
                    <th scope="col" className="eyebrow whitespace-nowrap px-5 py-3 text-right font-medium">Range</th>
                  </tr>
                </thead>
                <tbody>
                  {(ed.line_items || []).map((item: any, i: number) => (
                    <tr key={i} className="border-b border-taupe-200/50 transition-colors duration-200 ease-architect last:border-b-0 hover:bg-alabaster-50">
                      <td className="px-5 py-5 align-top font-sans text-[10px] tabular-nums text-taupe-300">
                        {i + 1}
                      </td>
                      <td className="px-2 py-3.5 align-top">
                        <p className="text-[13.5px] font-medium leading-snug tracking-[-0.01em] text-espresso-900">{item.item}</p>
                        {item.notes && <p className="mt-1 text-[12px] leading-relaxed text-taupe-500">{item.notes}</p>}
                      </td>
                      <td className="whitespace-nowrap px-5 py-5 text-right align-top">
                        <span className="figure text-[13px]">
                          ${fmt(item.low)} — ${fmt(item.high)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-taupe-200 bg-alabaster-100/60">
                    <td className="px-5 py-5" />
                    <td className="px-2 py-3.5">
                      <span className="eyebrow-ink">Total Estimate</span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-5 text-right">
                      <span className="figure text-[15px]">
                        ${fmt(ed.total_projected_low || 0)} — ${fmt(ed.total_projected_high || 0)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </section>

        {/* Reminder history */}
        {reminderCount > 0 && (
          <section className="animate-rise">
            <div className="title-block">
              <h2 className="display-sm">Reminders</h2>
              <span className="eyebrow hidden sm:block">History</span>
            </div>
            <ol className="border-t border-taupe-200/70">
              {(estimate.reminder_emails as any[]).map((r: any, i: number) => (
                <li key={i} className="relative flex flex-col gap-1 border-b border-taupe-200/55 py-3 pl-6 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                  <span aria-hidden className="absolute left-0 top-[19px] h-px w-3.5 bg-taupe-300" />
                  <span aria-hidden className="absolute left-[13px] top-[16px] h-[7px] w-[7px] rounded-full border border-taupe-300 bg-white" />
                  <span className="min-w-0 truncate text-[13px] text-espresso-900">
                    Sent to <span className="text-taupe-600">{r.to}</span>
                  </span>
                  <span className="shrink-0 font-sans text-[10px] uppercase tracking-architect tabular-nums text-taupe-400">
                    {new Date(r.sent_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Public estimate link */}
        <section className="animate-rise">
          <div className="title-block">
            <h2 className="display-sm">Client Link</h2>
            <span className="eyebrow hidden sm:block">Published</span>
          </div>
          <div className="panel flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex min-w-0 items-center gap-3">
              <svg aria-hidden className="h-4 w-4 shrink-0 text-taupe-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.364-3.314a4.5 4.5 0 00-6.364 0l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
              </svg>
              <div className="min-w-0">
                <p className="eyebrow">Estimate Link</p>
                <p className="mt-1 truncate font-sans text-[11.5px] text-espresso-900">wdocustom.com/estimate/{estimate.token}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(`https://www.wdocustom.com/estimate/${estimate.token}`);
                toast("Link copied!", "success");
              }}
              className="btn-outline shrink-0 self-start px-4 py-2 font-sans text-[10px] uppercase tracking-architect sm:self-auto"
            >
              Copy
            </button>
          </div>
        </section>
      </div>

      {/* ── Edit customer sheet ───────────────────────────────────────── */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-espresso-950/55 p-4 backdrop-blur-sm sm:items-center">
          <div className="my-8 w-full max-w-lg animate-rise rounded-sheet border border-taupe-200 bg-white shadow-lift">
            <div className="border-b border-taupe-200/70 px-6 py-5 sm:px-6">
              <p className="eyebrow">Lead Record</p>
              <h3 className="display-sm mt-1.5">Edit Customer</h3>
              <p className="mt-2 text-[12.5px] leading-relaxed text-taupe-500">
                These details travel with the lead onto the proposal when you convert it.
              </p>
            </div>

            <div className="space-y-4 px-6 py-7 sm:px-6">
              <Field label="Name">
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputClass}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
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

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
                    className={`${inputClass} tnum`}
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
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
                  className={`${inputClass} resize-y leading-relaxed`}
                />
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-taupe-400">
                  Carried onto the proposal as a private contractor note — hidden from the homeowner.
                </p>
              </Field>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-taupe-200/70 px-6 py-5 sm:px-6">
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="btn-outline"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveLead}
                disabled={savingLead}
                className="btn-ink"
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

const inputClass = "field";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}
