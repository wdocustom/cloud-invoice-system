import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const { invoice_id, amount, description, phase_index } =
      (await request.json()) as {
        invoice_id: string;
        amount: number;
        description: string;
        phase_index?: number;
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
      metadata: {
        invoice_id,
        phase_index: String(phase_index),
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
