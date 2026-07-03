import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function POST(request: Request) {
  try {
    const { token, name, email, phone } = await request.json();

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const supabase = getSupabase();
    await supabase
      .from("estimates")
      .update({ name: name || null, email: email || null, phone: phone || null })
      .eq("token", token);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Unlock estimate error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
