import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { updateTolerant } from "@/lib/db";
import { leadScoreFields, scoreLeadRow, type LeadFlag } from "@/lib/lead-score";
import { findPartnerForProjectType } from "@/lib/referral-partners";
import { flagsForAnswers } from "@/lib/intake-questions";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function POST(request: Request) {
  try {
    const { token, name, email, phone, timeline, budgetFit, ownership } = await request.json();

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const trimName = (name || "").trim();
    const trimEmail = (email || "").trim();
    const trimPhone = (phone || "").trim();

    if (!trimEmail && !trimPhone) {
      return NextResponse.json(
        { error: "Email or phone number is required to proceed." },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Tier B answers are optional — skipping them scores neutral rather than
    // blocking the unlock, so the gate never costs a lead over a question.
    // Unanswered questions are omitted entirely rather than written as null, so
    // a second unlock on the same token can't erase the first one's answers.
    const intake: Record<string, string> = {};
    if ((timeline || "").trim()) intake.intake_timeline = timeline.trim();
    if ((budgetFit || "").trim()) intake.intake_budget_fit = budgetFit.trim();
    if ((ownership || "").trim()) intake.intake_ownership = ownership.trim();

    const contact = {
      name: trimName || null,
      email: trimEmail || null,
      phone: trimPhone || null,
      ...intake,
    };

    // Contact completeness is a scored component, so unlocking moves the score.
    // Re-score from the stored row merged with what just arrived; if the row
    // can't be read, still write the contact details — capturing the lead
    // matters more than keeping its score current.
    const { data: existing } = await supabase
      .from("estimates")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    // Unknown or stale token. updateTolerant matches exactly one row, so
    // pushing on would turn what used to be a silent no-op into a 500.
    if (!existing) {
      return NextResponse.json({ success: true });
    }

    const partner = findPartnerForProjectType(existing.project_type);
    const extraFlags: LeadFlag[] = [
      ...(partner ? (["referral"] as LeadFlag[]) : []),
      // A lead can refine before unlocking, so branch flags may already exist.
      ...flagsForAnswers(existing.project_type, existing.intake_answers),
    ];
    const scoreFields = leadScoreFields(scoreLeadRow({ ...existing, ...contact }, extraFlags));

    const { error } = await updateTolerant(
      supabase,
      "estimates",
      { ...contact, ...scoreFields },
      (query) => query.eq("token", token)
    );

    if (error) {
      console.error("Unlock estimate update failed:", error);
      return NextResponse.json({ error: "Could not save your details." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Unlock estimate error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
