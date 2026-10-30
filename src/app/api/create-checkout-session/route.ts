import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { toNum } from "@/lib/utils";
import { contractChargeFor, processingPaymentFor } from "@/lib/stripe-payments";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function POST(request: Request) {
  try {
    const { invoice_id, phase_index, change_order_id } =
      (await request.json()) as {
        invoice_id: string;
        phase_index?: number;
        /** Set when paying a change order. invoice_id stays the contract, so
         *  the homeowner lands back on their portal. */
        change_order_id?: string;
      };

    if (!invoice_id) {
      return NextResponse.json({ error: "Missing invoice_id" }, { status: 400 });
    }

    // The amount is read from the stored proposal, never from the request: the
    // browser only says what is being paid, not how much.
    const supabase = getSupabase();
    const { data: invoice } = await supabase.from("invoices").select("*").eq("id", invoice_id).maybeSingle();
    if (!invoice || invoice.parent_id) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    if (invoice.status !== "approved") {
      return NextResponse.json({ error: "This proposal hasn't been signed yet." }, { status: 409 });
    }

    const who = invoice.homeowner_name ? ` - ${invoice.homeowner_name}` : "";
    let amount = 0;
    let description = "";
    let metadata: Record<string, string>;

    if (change_order_id) {
      const { data: co } = await supabase.from("invoices").select("*").eq("id", change_order_id).maybeSingle();
      if (!co || co.parent_id !== invoice_id || co.status !== "approved") {
        return NextResponse.json({ error: "Change order not found" }, { status: 404 });
      }
      if (co.deposit_cleared) {
        return NextResponse.json({ error: "This change order is already paid." }, { status: 409 });
      }
      if (processingPaymentFor(co.payment_history)) {
        return NextResponse.json({ error: "A bank payment for this change order is already processing." }, { status: 409 });
      }
      amount = toNum(co.amount);
      description = `Change Order${co.proposal_number ? ` ${co.proposal_number}` : ""}${who}`;
      metadata = { invoice_id, change_order_id, payment_type: "change_order" };
    } else {
      const phaseIndex = Math.max(0, Math.floor(toNum(phase_index)));
      const phases = Array.isArray(invoice.payment_phases) ? invoice.payment_phases : [];
      if (phaseIndex === 0 && invoice.deposit_cleared) {
        return NextResponse.json({ error: "The deposit is already paid." }, { status: 409 });
      }
      if (phaseIndex > 0 && toNum(invoice.current_phase_index) > phaseIndex) {
        return NextResponse.json({ error: "That payment is already recorded." }, { status: 409 });
      }
      if (processingPaymentFor(invoice.payment_history, phaseIndex)) {
        return NextResponse.json({ error: "A bank payment for this is already processing." }, { status: 409 });
      }
      amount = contractChargeFor(invoice, phaseIndex);
      description =
        phaseIndex === 0
          ? `Construction Deposit${invoice.proposal_number ? ` ${invoice.proposal_number}` : ""}${who}`
          : `${phases[phaseIndex]?.name || `Phase ${phaseIndex + 1}`}${who}`;
      metadata = {
        invoice_id,
        phase_index: String(phaseIndex),
        payment_type: phaseIndex === 0 ? "deposit" : `phase_${phaseIndex}`,
      };
    }

    if (!(amount > 0)) {
      return NextResponse.json({ error: "Nothing is due for this payment." }, { status: 400 });
    }

    const baseUrl =
      request.headers.get("origin") ||
      request.headers.get("referer")?.split("/").slice(0, 3).join("/") ||
      "";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card", "us_bank_account"],
      mode: "payment",
      customer_email: invoice.homeowner_email || undefined,
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: Math.round(amount * 100),
            product_data: {
              name: description,
            },
          },
          quantity: 1,
        },
      ],
      // Carried onto the PaymentIntent too, so the payment itself (not just the
      // checkout) shows which project and phase it belongs to in Stripe.
      metadata,
      payment_intent_data: { metadata, description },
      success_url: `${baseUrl}/invoice/${invoice_id}?payment=success&tab=payments`,
      cancel_url: `${baseUrl}/invoice/${invoice_id}?payment=cancelled&tab=payments`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Checkout session error:", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
