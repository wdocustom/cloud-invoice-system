import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") || "").trim().toLowerCase();
    const excludeInvoiceId = searchParams.get("exclude") || "";

    const supabase = getSupabase();
    let dbQuery = supabase
      .from("invoices")
      .select("id, project_title, job_address, homeowner_options")
      .not("homeowner_options", "is", null);

    if (excludeInvoiceId) {
      dbQuery = dbQuery.neq("id", excludeInvoiceId);
    }

    const { data: invoices, error } = await dbQuery;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const seen = new Map<string, any>();

    for (const inv of invoices || []) {
      const options = inv.homeowner_options || [];
      const projectLabel = inv.project_title || inv.job_address || "Untitled Project";

      for (const group of options) {
        const category = group.category || "";
        for (const choice of group.choices || []) {
          const label = typeof choice === "string" ? choice : choice.label;
          if (!label) continue;

          const key = label.toLowerCase();
          if (query && !key.includes(query) && !category.toLowerCase().includes(query)) continue;

          if (!seen.has(key)) {
            const choiceObj = typeof choice === "string"
              ? { label: choice }
              : { label: choice.label, ...(choice.image_url && { image_url: choice.image_url }), ...(choice.product_url && { product_url: choice.product_url }) };

            seen.set(key, {
              ...choiceObj,
              source_category: category,
              source_project: projectLabel,
            });
          }
        }
      }
    }

    const results = Array.from(seen.values());
    results.sort((a, b) => a.label.localeCompare(b.label));

    return NextResponse.json({ results: results.slice(0, 30) });
  } catch (err: any) {
    console.error("Search selections error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
