import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { buildContractorPaymentNotificationHtml } from "@/lib/email-templates";
import {
  settlementUpdate,
  statusAtCheckout,
  upsertPaymentRecord,
  type PaymentRecord,
  type PaymentStatus,
} from "@/lib/stripe-payments";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function formatMoney(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildPaymentReceiptHtml(data: {
  homeowner_name: string;
  amount: number;
  payment_label: string;
  project_title?: string;
  job_address: string;
  portal_url: string;
  paid_at: string;
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#FBFBFA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1A1A1A;">

<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1A1A1A;">
  <tr><td style="padding:24px 32px;">
    <span style="color:#ffffff;font-size:18px;font-weight:700;">WDO Custom</span>
  </td></tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
  <tr><td style="padding:36px 32px 0;">

    <p style="font-size:16px;font-weight:600;color:#1A1A1A;margin:0 0 8px;">Hi ${esc(data.homeowner_name)},</p>
    <p style="font-size:14px;color:#6B6B6B;line-height:1.7;margin:0 0 28px;">
      Thank you — your payment has been received and confirmed. Here's your receipt:
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F7F4;border:1px solid #C8D9C8;border-radius:12px;">
      <tr><td style="padding:24px 28px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <p style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#4A7A4A;margin:0 0 4px;">Payment Confirmed</p>
              <p style="font-size:28px;font-weight:700;color:#1A1A1A;margin:0;letter-spacing:-0.5px;">$${formatMoney(data.amount)}</p>
            </td>
            <td align="right" valign="top">
              <span style="display:inline-block;background-color:#4A7A4A;color:#ffffff;font-size:10px;font-weight:700;padding:5px 12px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px;">Paid</span>
            </td>
          </tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;border-top:1px solid #C8D9C8;padding-top:12px;">
          <tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;"><strong style="color:#1A1A1A;">For:</strong> ${esc(data.payment_label)}</td></tr>
          <tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;"><strong style="color:#1A1A1A;">Project:</strong> ${esc(data.project_title || data.job_address)}</td></tr>
          <tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;"><strong style="color:#1A1A1A;">Date:</strong> ${new Date(data.paid_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</td></tr>
        </table>
      </td></tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
      <tr><td align="center">
        <a href="${esc(data.portal_url)}" style="display:inline-block;background-color:#1A1A1A;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:12px;">
          View Your Project
        </a>
      </td></tr>
    </table>

    <p style="font-size:14px;color:#6B6B6B;line-height:1.7;margin:0 0 6px;">
      Your project portal is updated with the latest payment status. If you have any questions, don't hesitate to reach out.
    </p>

    <p style="font-size:14px;color:#1A1A1A;font-weight:600;margin:24px 0 4px;">Skyler Camacho</p>
    <p style="font-size:12px;color:#9C9590;margin:0;">WDO Custom &middot; 402-819-8558 &middot; skyler@wdocustom.com</p>

  </td></tr>
  <tr><td style="padding:28px 32px;border-top:1px solid #E8E4DF;">
    <p style="font-size:11px;color:#C0BAB4;margin:0;text-align:center;">
      WDO Custom &middot; General Contractor &middot; LIC-1901422 &middot; Omaha, NE
    </p>
  </td></tr>
</table>
</body>
</html>`;
}

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Short notice for a bank payment that is still clearing, or that the bank
 * returned. Kept plain: the facts, what happens next, and how to reach Skyler.
 */
function buildPaymentNoticeHtml(data: {
  greeting_name: string;
  heading: string;
  body: string;
  amount: number;
  payment_label: string;
  project: string;
  link_url: string;
  link_label: string;
  failed?: boolean;
}) {
  const accent = data.failed ? "#A34A3A" : "#8B6914";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#FBFBFA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1A1A1A;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1A1A1A;">
  <tr><td style="padding:24px 32px;"><span style="color:#ffffff;font-size:18px;font-weight:700;">WDO Custom</span></td></tr>
</table>
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
  <tr><td style="padding:36px 32px 0;">
    <p style="font-size:16px;font-weight:600;color:#1A1A1A;margin:0 0 8px;">Hi ${esc(data.greeting_name)},</p>
    <p style="font-size:14px;color:#6B6B6B;line-height:1.7;margin:0 0 24px;">${data.body}</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F9F7F4;border:1px solid #E8E4DF;border-radius:12px;">
      <tr><td style="padding:20px 24px;">
        <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${accent};margin:0 0 4px;">${esc(data.heading)}</p>
        <p style="font-size:26px;font-weight:700;color:#1A1A1A;margin:0 0 12px;">$${formatMoney(data.amount)}</p>
        <p style="font-size:13px;color:#6B6B6B;margin:0 0 3px;"><strong style="color:#1A1A1A;">For:</strong> ${esc(data.payment_label)}</p>
        <p style="font-size:13px;color:#6B6B6B;margin:0;"><strong style="color:#1A1A1A;">Project:</strong> ${esc(data.project)}</p>
      </td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
      <tr><td align="center">
        <a href="${esc(data.link_url)}" style="display:inline-block;background-color:#1A1A1A;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:12px;">${esc(data.link_label)}</a>
      </td></tr>
    </table>
    <p style="font-size:14px;color:#1A1A1A;font-weight:600;margin:0 0 4px;">Skyler Camacho</p>
    <p style="font-size:12px;color:#9C9590;margin:0;">WDO Custom &middot; 402-819-8558 &middot; skyler@wdocustom.com</p>
  </td></tr>
  <tr><td style="padding:28px 32px;border-top:1px solid #E8E4DF;">
    <p style="font-size:11px;color:#C0BAB4;margin:0;text-align:center;">WDO Custom &middot; General Contractor &middot; LIC-1901422 &middot; Omaha, NE</p>
  </td></tr>
</table>
</body>
</html>`;
}

/**
 * Where links in these emails point. The checkout's own return URL is the
 * site the homeowner actually paid from, so it beats an environment variable
 * that may never have been set.
 */
function siteUrlFor(session: Stripe.Checkout.Session): string {
  try {
    if (session.success_url) return new URL(session.success_url).origin;
  } catch {}
  return process.env.NEXT_PUBLIC_BASE_URL || "https://www.wdocustom.com";
}

const CONTRACTOR_EMAIL = "skyler@wdocustom.com";

interface PaymentTarget {
  /** The row the payment is recorded on: the contract, or the change order. */
  row: Record<string, any>;
  contractId: string;
  isChangeOrder: boolean;
  phaseIndex: number;
  label: string;
}

async function loadTarget(
  supabase: ReturnType<typeof getSupabase>,
  session: Stripe.Checkout.Session
): Promise<PaymentTarget | null> {
  const contractId = session.metadata?.invoice_id;
  if (!contractId) {
    console.error("Webhook: missing invoice_id in session metadata", session.id);
    return null;
  }

  // A change order is paid on its own row. These used to fall through to the
  // contract path with phase 0, which marked the contract's deposit paid and
  // left the change order showing Pay Now.
  const changeOrderId = session.metadata?.change_order_id;
  if (changeOrderId) {
    const { data: co } = await supabase.from("invoices").select("*").eq("id", changeOrderId).maybeSingle();
    // Only record against a change order that belongs to the contract the
    // checkout was opened from.
    if (!co || co.parent_id !== contractId) {
      console.error("Webhook: change order not found for contract", changeOrderId, contractId);
      return null;
    }
    return {
      row: co,
      contractId,
      isChangeOrder: true,
      phaseIndex: 0,
      label: co.proposal_number ? `Change Order ${co.proposal_number}` : "Change Order",
    };
  }

  const { data: invoice, error } = await supabase.from("invoices").select("*").eq("id", contractId).maybeSingle();
  if (error || !invoice) {
    console.error("Webhook: invoice not found", contractId, error);
    return null;
  }
  const phaseIndex = parseInt(session.metadata?.phase_index || "0", 10) || 0;
  const phases = Array.isArray(invoice.payment_phases) ? invoice.payment_phases : [];
  return {
    row: invoice,
    contractId,
    isChangeOrder: false,
    phaseIndex,
    label: phaseIndex === 0 ? "Construction Deposit" : phases[phaseIndex]?.name || `Phase ${phaseIndex + 1} Draw`,
  };
}

async function sendSafely(label: string, send: () => Promise<unknown>) {
  if (!resend) return;
  try {
    await send();
  } catch (err) {
    console.error(`${label} email failed:`, err);
  }
}

/**
 * Record a checkout or ACH outcome against the contract or change order.
 *
 * `status` is what this event establishes: "paid" settles the phase and sends
 * receipts, "processing" records a bank payment that hasn't cleared (nothing is
 * unlocked), "failed" marks it returned so the phase is payable again.
 * Re-delivered events are no-ops: an entry already at this status is skipped.
 */
async function applyPayment(
  supabase: ReturnType<typeof getSupabase>,
  session: Stripe.Checkout.Session,
  status: PaymentStatus
) {
  const target = await loadTarget(supabase, session);
  if (!target) return NextResponse.json({ received: true });

  const { row, contractId, isChangeOrder, phaseIndex, label } = target;
  const history: PaymentRecord[] = Array.isArray(row.payment_history) ? row.payment_history : [];
  const existing = history.find((p) => p?.stripe_session_id === session.id);

  // Already recorded at this status (Stripe retries), or already settled — a
  // late "processing" must never downgrade a payment that has cleared.
  if (
    existing &&
    (existing.status === status ||
      existing.status === "paid" ||
      // Events can arrive out of order; a returned transfer stays returned.
      (existing.status === "failed" && status === "processing"))
  ) {
    return NextResponse.json({ received: true });
  }

  const amount = (session.amount_total || 0) / 100;
  const now = new Date().toISOString();
  const record: PaymentRecord = {
    stripe_session_id: session.id,
    stripe_payment_intent: session.payment_intent,
    amount,
    ...(isChangeOrder ? {} : { phase_index: phaseIndex }),
    status,
    customer_email: session.customer_details?.email,
    paid_at: existing?.paid_at || now,
    ...(status === "paid" ? { settled_at: now } : {}),
    ...(status === "failed" ? { failed_at: now } : {}),
  };

  const update: Record<string, unknown> = { payment_history: upsertPaymentRecord(history, record) };
  if (status === "paid") {
    Object.assign(update, isChangeOrder ? { deposit_cleared: true } : settlementUpdate(row, phaseIndex));
  }

  const { error } = await supabase.from("invoices").update(update).eq("id", row.id);
  if (error) {
    console.error("Webhook: failed to record payment", row.id, error);
    // A 500 makes Stripe retry, so a transient database error doesn't lose it.
    return NextResponse.json({ error: "Database update failed" }, { status: 500 });
  }

  const siteUrl = siteUrlFor(session);
  const portalUrl = `${siteUrl}/invoice/${contractId}?tab=payments`;
  const workspaceUrl = `${siteUrl}/admin/projects/${contractId}`;
  const homeownerEmail = session.customer_details?.email || row.homeowner_email;
  const homeownerName = row.homeowner_name || "Client";
  const firstName = homeownerName.split(" ")[0];
  const project = row.project_title || row.job_address || "your project";

  if (status === "paid") {
    const common = {
      homeowner_name: homeownerName,
      amount,
      payment_label: label,
      project_title: row.project_title,
      job_address: row.job_address || "",
      paid_at: now,
    };
    if (homeownerEmail) {
      await sendSafely("Payment receipt", () =>
        resend!.emails.send({
          from: "WDO Custom <payments@wdocustom.com>",
          to: [homeownerEmail],
          subject: `Payment Confirmed — $${formatMoney(amount)} received for ${isChangeOrder ? label : project}`,
          html: buildPaymentReceiptHtml({ ...common, homeowner_name: firstName, portal_url: portalUrl }),
        })
      );
    }
    await sendSafely("Contractor payment", () =>
      resend!.emails.send({
        from: "WDO Custom <payments@wdocustom.com>",
        to: [CONTRACTOR_EMAIL],
        subject: `Payment received — $${formatMoney(amount)} from ${homeownerName} for ${isChangeOrder ? label : project}`,
        html: buildContractorPaymentNotificationHtml({ ...common, portal_url: workspaceUrl }),
      })
    );
  } else if (status === "processing") {
    if (homeownerEmail) {
      await sendSafely("Bank payment processing", () =>
        resend!.emails.send({
          from: "WDO Custom <payments@wdocustom.com>",
          to: [homeownerEmail],
          subject: `Bank payment started — $${formatMoney(amount)} for ${project}`,
          html: buildPaymentNoticeHtml({
            greeting_name: firstName,
            heading: "Bank Payment Processing",
            body: "Thank you — your bank payment is on its way. Bank transfers usually take a few business days to clear. I'll send your receipt as soon as it does, and there's nothing else you need to do.",
            amount,
            payment_label: label,
            project,
            link_url: portalUrl,
            link_label: "View Payments",
          }),
        })
      );
    }
    await sendSafely("Contractor bank payment processing", () =>
      resend!.emails.send({
        from: "WDO Custom <payments@wdocustom.com>",
        to: [CONTRACTOR_EMAIL],
        subject: `Bank payment processing — $${formatMoney(amount)} from ${homeownerName} (not cleared yet)`,
        html: buildPaymentNoticeHtml({
          greeting_name: "Skyler",
          heading: "ACH Processing — Not Yet Cleared",
          body: `${esc(homeownerName)} paid by bank transfer. It is not marked paid in the portal until Stripe confirms it cleared, usually within a few business days. You'll get a "Payment received" email when it does.`,
          amount,
          payment_label: label,
          project,
          link_url: workspaceUrl,
          link_label: "Open Project",
        }),
      })
    );
  } else {
    if (homeownerEmail) {
      await sendSafely("Bank payment failed", () =>
        resend!.emails.send({
          from: "WDO Custom <payments@wdocustom.com>",
          to: [homeownerEmail],
          subject: `Your bank payment for ${project} didn't go through`,
          html: buildPaymentNoticeHtml({
            greeting_name: firstName,
            heading: "Bank Payment Not Completed",
            body: "Your bank let us know this transfer didn't go through, so no money was taken. You can try again from the Payments tab in your portal, by card or bank transfer. If you'd like a hand, just message me there.",
            amount,
            payment_label: label,
            project,
            link_url: portalUrl,
            link_label: "Go to Payments",
            failed: true,
          }),
        })
      );
    }
    await sendSafely("Contractor bank payment failed", () =>
      resend!.emails.send({
        from: "WDO Custom <payments@wdocustom.com>",
        to: [CONTRACTOR_EMAIL],
        subject: `Bank payment FAILED — $${formatMoney(amount)} from ${homeownerName}`,
        html: buildPaymentNoticeHtml({
          greeting_name: "Skyler",
          heading: "ACH Failed",
          body: `The bank transfer from ${esc(homeownerName)} was returned. Nothing was marked paid, and the payment is open again in their portal. They've been emailed a note to retry.`,
          amount,
          payment_label: label,
          project,
          link_url: workspaceUrl,
          link_label: "Open Project",
          failed: true,
        }),
      })
    );
  }

  console.log(`Webhook: ${isChangeOrder ? "change order" : `phase ${phaseIndex}`} on ${contractId} — ${status} — $${amount}`);
  return NextResponse.json({ received: true });
}

export async function POST(request: Request) {
  const supabase = getSupabase();
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", (err as Error).message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        return await applyPayment(supabase, session, statusAtCheckout(session.payment_status));
      }
      case "checkout.session.async_payment_succeeded":
        return await applyPayment(supabase, event.data.object as Stripe.Checkout.Session, "paid");
      case "checkout.session.async_payment_failed":
        return await applyPayment(supabase, event.data.object as Stripe.Checkout.Session, "failed");
      default:
        return NextResponse.json({ received: true });
    }
  } catch (err) {
    console.error("Webhook processing error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
