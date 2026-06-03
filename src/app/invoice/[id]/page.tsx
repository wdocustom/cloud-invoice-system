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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
          <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Synchronizing Premium Workspace...</p>
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
