import { Suspense } from "react";
import { supabase } from "@/lib/supabase";
import HomeownerPortalClient from "./HomeownerPortalClient";

export const dynamic = "force-dynamic";

export default async function HomeownerPortalPage({ params }: { params: { id: string } }) {
  const { id } = params;

  const [invoiceResult, changeOrdersResult, scheduleResult, logsResult] = await Promise.all([
    supabase.from("invoices").select("*").eq("id", id).single(),
    supabase.from("invoices").select("*").eq("parent_id", id).order("created_at", { ascending: true }),
    supabase.from("project_schedules").select("*").eq("project_id", id).order("sort_order", { ascending: true }).order("target_start_date", { ascending: true }),
    supabase.from("project_logs").select("*").eq("project_id", id).order("created_at", { ascending: false }),
  ]);

  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-paper-100">
        <div className="flex flex-col items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-rule-400 border-t-ink-900" />
          <p className="text-[14px] text-ink-500">Loading proposal</p>
        </div>
      </div>
    }>
      <HomeownerPortalClient
        id={id}
        initialInvoice={invoiceResult.data}
        initialChangeOrders={changeOrdersResult.data || []}
        initialScheduleTasks={scheduleResult.data || []}
        initialDailyLogs={logsResult.data || []}
      />
    </Suspense>
  );
}
