/**
 * Find contracts and proposals damaged by the inline-edit save bug.
 *
 * From 2026-06-27 an inline edit on a signed contract could save with the
 * project still unloaded, total the lines with the unsigned rule, and store
 * $0. From 2026-08-20 the same save also wrote an empty draw schedule and the
 * default deposit — on proposals as well as contracts.
 *
 * Read-only. It changes nothing; restoring a total is done per job from its
 * project page, where you can see what you're restoring.
 *
 *   npm run audit:totals
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (a .env.local
 * is loaded automatically if present).
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { contractTotalMismatch } from "../src/lib/contract-total";
import { DEFAULT_DEPOSIT_PERCENT, depositPercentOf } from "../src/lib/payment-schedule";

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    // No .env.local — rely on the ambient environment.
  }
}

const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

async function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const { data: rows, error } = await createClient(url, key)
    .from("invoices")
    .select("*")
    .is("parent_id", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Could not read invoices:", error.message);
    process.exit(1);
  }
  if (!rows?.length) {
    console.log("No contracts or proposals found.");
    return;
  }

  const label = (r: any) =>
    `${(r.proposal_number || "(unnumbered)").padEnd(16)} ${(r.homeowner_name || "(no name)").slice(0, 32).padEnd(32)} ${r.status}`;

  // 1. Definite damage: the stored total disagrees with the line items.
  const mismatched = rows.filter((r) => contractTotalMismatch(r));
  console.log(`\nTotals that don't match their line items: ${mismatched.length} of ${rows.length}`);
  for (const r of mismatched) {
    const m = contractTotalMismatch(r)!;
    console.log(`  ${label(r)}   stored ${money(m.stored)}  →  items ${money(m.expected)}`);
  }
  if (mismatched.length) {
    console.log("  Restore each from its project page (“Restore total from line items”).");
  }

  // 2. Likely damage: no draw schedule. Both ways of creating a job (the admin
  //    and lead conversion) seed a standard schedule, so an empty one almost
  //    always means it was cleared — by this bug, or by hand.
  const noDraws = rows.filter(
    (r) => (!Array.isArray(r.payment_phases) || r.payment_phases.length === 0) && Array.isArray(r.items) && r.items.length > 0
  );
  console.log(`\nNo draw schedule (every job is created with one): ${noDraws.length}`);
  for (const r of noDraws) console.log(`  ${label(r)}${contractTotalMismatch(r) ? "   ← total also mismatched" : ""}`);

  // 3. Deposit at exactly the default — what the bug reset it to.
  const defaultDeposit = rows.filter((r) => depositPercentOf(r, r.amount) === DEFAULT_DEPOSIT_PERCENT);
  console.log(`\nDeposit at the ${DEFAULT_DEPOSIT_PERCENT}% default — confirm each was agreed: ${defaultDeposit.length}`);
  for (const r of defaultDeposit) console.log(`  ${label(r)}`);

  console.log(
    "\nDraw schedules and deposit percentages that were overwritten can't be recovered from these rows." +
      "\nIf you need the originals, Supabase backups (or point-in-time recovery, if enabled) will have them.\n"
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
