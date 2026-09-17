/**
 * Backfill lead scores over the existing `estimates` table, and report how well
 * the model lines up with leads whose outcome is already known.
 *
 * This is the calibration step, and it runs before anything in the admin depends
 * on a score. You already know which past leads converted, so scoring them is a
 * free test of whether the weights rank the right leads highly. If converted
 * leads don't skew towards A, the weights are wrong and this is the cheapest
 * possible moment to find out.
 *
 * Read-only by default. Pass --apply to write.
 *
 *   npm run score:backfill            # dry run + calibration report
 *   npm run score:backfill -- --apply # write lead_score/lead_band/qualification
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the
 * environment (a .env.local is loaded automatically if present).
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { BAND_LABELS, leadScoreFields, scoreLeadRow, type LeadBand, type LeadFlag } from "../src/lib/lead-score";
import { findPartnerForProjectType } from "../src/lib/referral-partners";

/** Minimal .env.local reader — avoids adding dotenv for one script. */
function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!match) continue;
      const [, key, value] = match;
      if (!process.env[key]) {
        process.env[key] = value.replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // No .env.local — rely on the ambient environment.
  }
}

function pct(part: number, whole: number): string {
  if (!whole) return "—";
  return `${Math.round((part / whole) * 100)}%`;
}

async function main() {
  loadEnvLocal();

  const apply = process.argv.includes("--apply");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const supabase = createClient(url, key);

  const { data: rows, error } = await supabase
    .from("estimates")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Could not read estimates:", error.message);
    process.exit(1);
  }
  if (!rows?.length) {
    console.log("No estimates found — nothing to score.");
    return;
  }

  console.log(`\nScoring ${rows.length} lead${rows.length === 1 ? "" : "s"}${apply ? "" : " (dry run)"}\n`);

  const scored = rows.map((row) => {
    const partner = findPartnerForProjectType(row.project_type);
    const extraFlags: LeadFlag[] = partner ? ["referral"] : [];
    return { row, result: scoreLeadRow(row, extraFlags), partnerId: partner?.id ?? null };
  });

  // ── Distribution ──
  const bands: LeadBand[] = ["A", "B", "C"];
  console.log("Band distribution");
  for (const band of bands) {
    const inBand = scored.filter((s) => s.result.band === band);
    const bar = "█".repeat(Math.round((inBand.length / rows.length) * 40));
    console.log(
      `  ${band} ${BAND_LABELS[band].padEnd(14)} ${String(inBand.length).padStart(4)}  ${pct(inBand.length, rows.length).padStart(4)}  ${bar}`
    );
  }

  // ── Calibration: does the score rank converted leads highly? ──
  const converted = scored.filter((s) => !!s.row.converted_to_invoice_id);
  console.log(`\nCalibration — ${converted.length} of ${rows.length} leads converted (${pct(converted.length, rows.length)})`);
  if (converted.length === 0) {
    console.log("  No conversions on file yet; revisit this once some leads have closed.");
  } else {
    for (const band of bands) {
      const inBand = scored.filter((s) => s.result.band === band);
      const wins = inBand.filter((s) => !!s.row.converted_to_invoice_id);
      console.log(
        `  ${band}: ${String(wins.length).padStart(3)}/${String(inBand.length).padEnd(3)} converted  (${pct(wins.length, inBand.length)})`
      );
    }
    const avgConverted = converted.reduce((sum, s) => sum + s.result.score, 0) / converted.length;
    const lost = scored.filter((s) => !s.row.converted_to_invoice_id);
    const avgLost = lost.length ? lost.reduce((sum, s) => sum + s.result.score, 0) / lost.length : 0;
    console.log(`\n  Mean score, converted: ${avgConverted.toFixed(1)}`);
    console.log(`  Mean score, everything else: ${avgLost.toFixed(1)}`);
    console.log(
      avgConverted > avgLost
        ? "  → Converted leads score higher. The weights point the right way."
        : "  → Converted leads do NOT score higher. Re-weight before relying on this."
    );
  }

  // ── Tier B coverage: how many leads answered the gate questions at all ──
  const answered = rows.filter((row) => row.intake_timeline || row.intake_budget_fit).length;
  const refinedCount = rows.filter((row) => !!row.refined_at).length;
  console.log(`\nQualification coverage`);
  console.log(`  Answered the gate questions  ${String(answered).padStart(4)}  ${pct(answered, rows.length)}`);
  console.log(`  Refined their estimate       ${String(refinedCount).padStart(4)}  ${pct(refinedCount, rows.length)}`);
  if (answered === 0) {
    console.log("  (Leads created before the gate questions shipped score these neutral.)");
  }

  // ── Flags worth eyeballing ──
  const flagCounts = new Map<string, number>();
  for (const { result } of scored) {
    for (const flag of result.flags) {
      flagCounts.set(flag, (flagCounts.get(flag) || 0) + 1);
    }
  }
  if (flagCounts.size) {
    console.log("\nFlags");
    for (const [flag, count] of Array.from(flagCounts.entries()).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${flag.padEnd(20)} ${String(count).padStart(4)}  ${pct(count, rows.length)}`);
    }
  }

  // ── Top of the list, as the ledger would order it ──
  console.log("\nTop 10 by score");
  for (const { row, result } of [...scored].sort((a, b) => b.result.score - a.result.score).slice(0, 10)) {
    const label = `${row.name || "(no name)"} — ${row.project_type || "?"}`;
    console.log(`  ${String(result.score).padStart(3)} ${result.band}  ${label.slice(0, 54)}`);
  }

  if (!apply) {
    console.log("\nDry run — nothing written. Re-run with --apply to persist.\n");
    return;
  }

  let written = 0;
  let failed = 0;
  for (const { row, result, partnerId } of scored) {
    const payload: Record<string, any> = { ...leadScoreFields(result) };
    // Backfill the referral pointer too, but never a referred_at timestamp:
    // these leads were never actually sent to a partner.
    if (partnerId && !row.referred_partner_id) payload.referred_partner_id = partnerId;

    const { error: updateErr } = await supabase.from("estimates").update(payload).eq("id", row.id);
    if (updateErr) {
      failed += 1;
      console.error(`  ! ${row.id}: ${updateErr.message}`);
    } else {
      written += 1;
    }
  }

  console.log(`\nWrote ${written} row${written === 1 ? "" : "s"}${failed ? `, ${failed} failed` : ""}.\n`);
  if (failed) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
