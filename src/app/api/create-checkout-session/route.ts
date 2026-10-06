import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const { invoice_id, amount, description, phase_index, change_order_id } =
      (await request.json()) as {
        invoice_id: string;
        amount: number;
        description: string;
        phase_index?: number;
        /** Set when paying a change order. invoice_id stays the contract, so
         *  the homeowner lands back on their portal. */
        change_order_id?: string;
      };

    if (!invoice_id || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid invoice_id or amount" },
        { status: 400 }
      );
    }

    const baseUrl =
      request.headers.get("origin") ||
      request.headers.get("referer")?.split("/").slice(0, 3).join("/") ||
      "";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card", "us_bank_account"],
      mode: "payment",
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
      // A change order payment must say so. Without it the phase defaulted to
      // 0 and the webhook recorded the payment as the contract's deposit.
      metadata: change_order_id
        ? { invoice_id, change_order_id, payment_type: "change_order" }
        : {
            invoice_id,
            phase_index: String(phase_index ?? 0),
            payment_type: phase_index === 0 ? "deposit" : `phase_${phase_index}`,
          },
      success_url: `${baseUrl}/invoice/${invoice_id}?payment=success`,
      cancel_url: `${baseUrl}/invoice/${invoice_id}?payment=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
