import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
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

    const paymentRecord = {
      stripe_session_id: session.id,
      stripe_payment_intent: session.payment_intent,
      amount: amountPaid,
      phase_index: phaseIndex,
      status: session.payment_status,
      customer_email: session.customer_details?.email,
      paid_at: new Date().toISOString(),
    };

    try {
      const { data: invoice, error: fetchError } = await supabase
        .from("invoices")
        .select("payment_history, deposit_cleared, current_phase_index")
        .eq("id", invoiceId)
        .single();

      if (fetchError || !invoice) {
        console.error("Webhook: invoice not found", invoiceId, fetchError);
        return NextResponse.json({ received: true });
      }

      const updatedHistory = [...(invoice.payment_history || []), paymentRecord];

      const updatePayload: Record<string, unknown> = {
        payment_history: updatedHistory,
      };

      if (phaseIndex === 0) {
        updatePayload.deposit_cleared = true;
        if (!invoice.current_phase_index || invoice.current_phase_index === 0) {
          updatePayload.current_phase_index = 1;
        }
      } else {
        updatePayload.current_phase_index = phaseIndex + 1;
      }

      const { error: updateError } = await supabase
        .from("invoices")
        .update(updatePayload)
        .eq("id", invoiceId);

      if (updateError) {
        console.error("Webhook: failed to update invoice", updateError);
      } else {
        console.log(`Webhook: invoice ${invoiceId} updated — phase ${phaseIndex} paid`);
      }
    } catch (err) {
      console.error("Webhook processing error:", err);
    }
  }

  return NextResponse.json({ received: true });
}
