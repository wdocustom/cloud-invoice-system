import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

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

    <p style="font-size:16px;font-weight:600;color:#1A1A1A;margin:0 0 8px;">Hi ${data.homeowner_name},</p>
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
          <tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;"><strong style="color:#1A1A1A;">For:</strong> ${data.payment_label}</td></tr>
          <tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;"><strong style="color:#1A1A1A;">Project:</strong> ${data.project_title || data.job_address}</td></tr>
          <tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;"><strong style="color:#1A1A1A;">Date:</strong> ${new Date(data.paid_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</td></tr>
        </table>
      </td></tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
      <tr><td align="center">
        <a href="${data.portal_url}" style="display:inline-block;background-color:#1A1A1A;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:12px;">
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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const invoiceId = session.metadata?.invoice_id;
    const phaseIndex = parseInt(session.metadata?.phase_index || "0", 10);
    const amountPaid = (session.amount_total || 0) / 100;

    if (!invoiceId) {
      console.error("Webhook: missing invoice_id in session metadata");
      return NextResponse.json({ received: true });
    }

    try {
      const { data: invoice, error: fetchError } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", invoiceId)
        .single();

      if (fetchError || !invoice) {
        console.error("Webhook: invoice not found", invoiceId, fetchError);
        return NextResponse.json({ received: true });
      }

      const existingHistory = invoice.payment_history || [];
      const alreadyProcessed = existingHistory.some(
        (p: any) => p.stripe_session_id === session.id
      );
      if (alreadyProcessed) {
        return NextResponse.json({ received: true });
      }

      const paymentRecord = {
        stripe_session_id: session.id,
        stripe_payment_intent: session.payment_intent,
        amount: amountPaid,
        phase_index: phaseIndex,
        status: session.payment_status,
        customer_email: session.customer_details?.email,
        paid_at: new Date().toISOString(),
      };

      const updatedHistory = [...existingHistory, paymentRecord];

      const updatePayload: Record<string, unknown> = {
        payment_history: updatedHistory,
      };

      if (phaseIndex === 0) {
        updatePayload.deposit_cleared = true;
        if (!invoice.current_phase_index || invoice.current_phase_index === 0) {
          updatePayload.current_phase_index = 1;
        }
      } else {
        updatePayload.current_phase_index = Math.max(
          invoice.current_phase_index || 0,
          phaseIndex + 1
        );
      }

      const { error: updateError } = await supabase
        .from("invoices")
        .update(updatePayload)
        .eq("id", invoiceId);

      if (updateError) {
        console.error("Webhook: failed to update invoice", updateError);
        return NextResponse.json({ error: "Database update failed" }, { status: 500 });
      }

      // Send payment confirmation email
      const customerEmail = session.customer_details?.email || invoice.homeowner_email;
      if (resend && customerEmail) {
        const phases = invoice.payment_phases || [];
        const paymentLabel = phaseIndex === 0
          ? "Construction Deposit"
          : (phases[phaseIndex]?.name || `Phase ${phaseIndex} Draw`);

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://cloud-invoice-system.vercel.app";
        const portalUrl = `${baseUrl}/invoice/${invoiceId}`;

        try {
          await resend.emails.send({
            from: "WDO Custom <payments@wdocustom.com>",
            to: [customerEmail],
            subject: `Payment Confirmed — $${formatMoney(amountPaid)} received for ${invoice.project_title || invoice.job_address || "your project"}`,
            html: buildPaymentReceiptHtml({
              homeowner_name: invoice.homeowner_name || "Client",
              amount: amountPaid,
              payment_label: paymentLabel,
              project_title: invoice.project_title,
              job_address: invoice.job_address || "",
              portal_url: portalUrl,
              paid_at: paymentRecord.paid_at,
            }),
          });
        } catch (emailErr) {
          console.error("Payment receipt email failed:", emailErr);
        }
      }

      console.log(`Webhook: invoice ${invoiceId} updated — phase ${phaseIndex} paid — $${amountPaid}`);
    } catch (err) {
      console.error("Webhook processing error:", err);
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
