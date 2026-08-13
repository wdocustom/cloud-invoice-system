import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { describeDbError, updateTolerant } from "@/lib/db";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Everything the contractor can correct or fill in on a lead. Anything else in
// the request body is ignored.
const EDITABLE_FIELDS = [
  "name",
  "email",
  "phone",
  "address",
  "city",
  "state",
  "zip",
  "project_type",
  "size",
  "notes",
] as const;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const updates: Record<string, any> = {};
    for (const field of EDITABLE_FIELDS) {
      if (!(field in body)) continue;
      const value = typeof body[field] === "string" ? body[field].trim() : body[field];
      const normalized = value === "" || value == null ? null : value;
      // project_type is NOT NULL on estimates — leave it alone rather than
      // blanking the row when the field is submitted empty.
      if (normalized === null && field === "project_type") continue;
      updates[field] = normalized;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    if (updates.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.email)) {
      return NextResponse.json({ error: "That email address doesn't look valid." }, { status: 400 });
    }

    const supabase = getSupabase();

    const { data: existing, error: fetchErr } = await supabase
      .from("estimates")
      .select("email, phone")
      .eq("id", id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Same rule the public estimate form enforces: never leave a lead with no
    // way to reach the customer.
    const email = "email" in updates ? updates.email : existing.email;
    const phone = "phone" in updates ? updates.phone : existing.phone;
    if (!email && !phone) {
      return NextResponse.json(
        { error: "A lead needs at least an email address or a phone number." },
        { status: 400 }
      );
    }

    updates.updated_at = new Date().toISOString();

    const { data, error, dropped } = await updateTolerant(
      supabase,
      "estimates",
      updates,
      (q) => q.eq("id", id)
    );

    if (error) {
      console.error("Update lead error:", error);
      return NextResponse.json({ error: describeDbError(error) }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      lead: data,
      ...(dropped.length ? { dropped_columns: dropped } : {}),
    });
  } catch (err: any) {
    console.error("Update lead error:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
