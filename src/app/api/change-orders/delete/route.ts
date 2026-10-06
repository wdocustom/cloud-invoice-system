import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { buildChangeOrderWithdrawnHtml } from "@/lib/email-templates";
import { cannotDeleteChangeOrder, contractTotals } from "@/lib/change-orders";
import { toNum } from "@/lib/utils";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * Delete a change order.
 *
 * Unsigned: an offer being withdrawn. Signed: removed from the contract, which
 * lowers what the homeowner owes, so it needs the number typed back. Paid:
 * refused outright (see cannotDeleteChangeOrder). Either way the homeowner is
 * told — they were emailed this change order and it shouldn't just vanish
 * from their portal.
 *
 * Its number is retired, not reused: numbering counts up from the highest
 * issued, so the next change order still gets a new number.
 */
export async function POST(request: Request) {
  try {
    const { change_order_id, parent_id, confirmation, base_url } = await request.json();
    const supabase = getSupabase();

    const { data: co } = await supabase.from("invoices").select("*").eq("id", change_order_id).maybeSingle();

    const refusal = cannotDeleteChangeOrder(co, parent_id, confirmation);
    if (refusal) {
      return NextResponse.json(
        { error: refusal.error, needs_confirmation: refusal.needsConfirmation ?? null },
        { status: refusal.status }
      );
    }

    // Only delete it in the state we just checked. If the homeowner signed or
    // paid in between, nothing matches and their signature stands.
    const { data: deleted, error } = await supabase
      .from("invoices")
      .delete()
      .eq("id", change_order_id)
      .eq("status", co!.status)
      // IS NOT TRUE, not = false: older change orders carry NULL here.
      .not("deposit_cleared", "is", true)
      .select("id");

    if (error) {
      console.error("Change order delete failed:", error);
      return NextResponse.json({ error: error.message || "Could not delete the change order." }, { status: 500 });
    }
    if (!deleted || deleted.length === 0) {
      return NextResponse.json(
        { error: "This change order changed while you were deleting it — it may have just been signed or paid. Reload and check." },
        { status: 409 }
      );
    }

    // ── Tell the homeowner ──
    let notified = false;
    const wasSigned = co!.status === "approved";
    const email = co!.homeowner_email;
    if (email && resend) {
      try {
        const [{ data: contract }, { data: remaining }] = await Promise.all([
          supabase.from("invoices").select("*").eq("id", parent_id).maybeSingle(),
          supabase.from("invoices").select("status, amount").eq("parent_id", parent_id),
        ]);
        const origin = base_url || "https://www.wdocustom.com";
        const label = co!.proposal_number || "Change order";

        const { error: sendErr } = await resend.emails.send({
          from: "WDO Custom <proposals@wdocustom.com>",
          to: [email],
          replyTo: "skyler@wdocustom.com",
          subject: wasSigned ? `${label} removed from your contract` : `${label} withdrawn — no signature needed`,
          html: buildChangeOrderWithdrawnHtml({
            change_order_number: co!.proposal_number,
            homeowner_name: co!.homeowner_name || "there",
            description: co!.description || "",
            amount: toNum(co!.amount),
            was_signed: wasSigned,
            contract_total: contractTotals(contract, remaining || []).revised,
            portal_url: `${origin}/invoice/${parent_id}`,
          }),
        });
        if (sendErr) throw sendErr;
        notified = true;
      } catch (err) {
        console.error("Change order withdrawal email failed:", err);
      }
    }

    return NextResponse.json({ deleted: true, notified, was_signed: wasSigned });
  } catch (err: any) {
    console.error("Delete change order error:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
