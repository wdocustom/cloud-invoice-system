import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { updateTolerant } from "@/lib/db";
import { generateProposalPdfBuffer } from "@/lib/generate-pdf";
import {
  buildChangeOrderSignedContractorHtml,
  buildChangeOrderSignedHomeownerHtml,
} from "@/lib/email-templates";
import {
  cannotApproveChangeOrder,
  changeOrderEmailFigures,
  changeOrderPdfInput,
  cleanSignature,
} from "@/lib/change-orders";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const CONTRACTOR_EMAIL = "skyler@wdocustom.com";

/**
 * Sign a change order.
 *
 * Replaces a browser confirm() that flipped the status client-side and
 * recorded nothing about who approved or when. The terms (§3) require a change
 * order to be "signed or electronically approved by both parties before the
 * additional work begins", so this records what an electronic signature needs
 * to stand up later: the typed name, the time, and where it came from — the
 * same name and timestamp the original contract carries, plus the request's IP
 * and user agent.
 */
export async function POST(request: Request) {
  try {
    const { change_order_id, parent_id, signature_name, base_url } = await request.json();
    const supabase = getSupabase();

    const { data: changeOrder } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", change_order_id)
      .maybeSingle();

    const refusal = cannotApproveChangeOrder(changeOrder, parent_id, signature_name);
    if (refusal) {
      return NextResponse.json({ error: refusal.error }, { status: refusal.status });
    }

    const signedAt = new Date().toISOString();
    const forwardedFor = request.headers.get("x-forwarded-for") || "";

    // Conditional on still being pending: two tabs signing at once can't both
    // win, and the first signature and timestamp are the ones that stand.
    const { data: signed, error: signErr, dropped } = await updateTolerant(
      supabase,
      "invoices",
      {
        status: "approved",
        signature_name: cleanSignature(signature_name),
        signed_at: signedAt,
        signed_ip: forwardedFor.split(",")[0].trim() || null,
        signed_user_agent: (request.headers.get("user-agent") || "").slice(0, 500) || null,
      },
      (query) => query.eq("id", change_order_id).eq("status", "pending")
    );

    if (signErr || !signed) {
      // No row matched: someone signed it between our read and this write.
      if (!signErr || signErr.code === "PGRST116") {
        return NextResponse.json({ error: "This change order has already been signed." }, { status: 409 });
      }
      console.error("Change order signature failed:", signErr);
      return NextResponse.json({ error: "Could not record your signature. Please try again." }, { status: 500 });
    }

    if (dropped.length) {
      console.warn(`[change-orders] signature saved without ${dropped.join(", ")} — run the latest migration.`);
    }

    // ── Notify both sides; the signature already stands if this fails ──
    const sentTo: string[] = [];
    if (resend) {
      const [{ data: contract }, { data: siblings }] = await Promise.all([
        supabase.from("invoices").select("*").eq("id", parent_id).maybeSingle(),
        supabase.from("invoices").select("*").eq("parent_id", parent_id),
      ]);

      const origin = base_url || "https://www.wdocustom.com";
      const figures = changeOrderEmailFigures(signed, contract, siblings || []);
      const label = figures.change_order_number || "Change order";

      try {
        await resend.emails.send({
          from: "WDO Custom <proposals@wdocustom.com>",
          to: [CONTRACTOR_EMAIL],
          subject: `${label} signed — ${figures.homeowner_name} approved +$${figures.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
          html: buildChangeOrderSignedContractorHtml({
            ...figures,
            portal_url: `${origin}/invoice/${parent_id}`,
            workspace_url: `${origin}/admin/projects/${parent_id}`,
          }),
        });
        sentTo.push("contractor");
      } catch (err) {
        console.error("Change order contractor notification failed:", err);
      }

      const homeownerEmail = signed.homeowner_email || contract?.homeowner_email;
      if (homeownerEmail) {
        try {
          const { buffer, filename } = generateProposalPdfBuffer(
            changeOrderPdfInput(signed, contract, siblings || [])
          );
          await resend.emails.send({
            from: "WDO Custom <proposals@wdocustom.com>",
            to: [homeownerEmail],
            replyTo: CONTRACTOR_EMAIL,
            subject: `Signed: ${label} — your copy`,
            html: buildChangeOrderSignedHomeownerHtml({ ...figures, portal_url: `${origin}/invoice/${parent_id}` }),
            attachments: [{ filename, content: buffer }],
          });
          sentTo.push("homeowner");
        } catch (err) {
          console.error("Change order homeowner confirmation failed:", err);
        }
      }
    }

    return NextResponse.json({ change_order: signed, sent_to: sentTo });
  } catch (err: any) {
    console.error("Approve change order error:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
