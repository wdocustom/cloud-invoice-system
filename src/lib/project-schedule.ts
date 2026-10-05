/**
 * The construction timeline the homeowner sees — one place for its rules.
 *
 * Rows live in `project_schedules`. Signing builds one row per line item; the
 * admin's Schedule Horizon edits them; the portal's Construction Timeline
 * shows them. Before this, the admin had no way to touch these rows at all, so
 * every job's timeline sat at 0% on the dates signing guessed.
 */

export type ScheduleStatus = "scheduled" | "in_progress" | "complete";

export interface ScheduleRow {
  project_id: string;
  task_name: string;
  target_start_date: string;
  target_end_date: string;
  parent_id: string | null;
  progress_percent: number;
  status: ScheduleStatus;
  sort_order: number;
  color_theme: string;
}

export const DEFAULT_COLOR_THEME = "bg-amber-400/20 text-amber-800 border-amber-300";

/** Each line item gets this many days, then a one-day gap before the next. */
const DAYS_PER_TASK = 5;

/** Whole-number percent, 0–100. Anything unusable is 0. */
export function clampProgress(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

/** Status follows progress, so the two can never contradict each other. */
export function statusForProgress(progress: unknown): ScheduleStatus {
  const p = clampProgress(progress);
  if (p >= 100) return "complete";
  if (p > 0) return "in_progress";
  return "scheduled";
}

/** "2026-09-01" plus n days, in UTC so the date never slips across a timezone. */
export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

/** Why these dates can't be saved, or null. */
export function invalidDateRange(start: unknown, end: unknown): string | null {
  if (!isIsoDate(start) || !isIsoDate(end)) return "Enter a start and end date.";
  if (end < start) return "The end date can't be before the start date.";
  return null;
}

/**
 * One row per line item, back to back from the start date — the timeline
 * signing creates. Moved here from the portal so a rebuild from the admin
 * produces exactly the same thing.
 */
export function buildScheduleFromItems(
  projectId: string,
  items: unknown,
  startDate?: string | null
): ScheduleRow[] {
  const titles = (Array.isArray(items) ? items : [])
    .map((item: any) => (item?.title ?? item?.high_title ?? "").toString().trim())
    .filter(Boolean);

  let cursor = isIsoDate(startDate) ? startDate : new Date().toISOString().slice(0, 10);

  return titles.map((title, index) => {
    const start = cursor;
    const end = addDays(start, DAYS_PER_TASK - 1);
    cursor = addDays(end, 1);
    return {
      project_id: projectId,
      task_name: title,
      target_start_date: start,
      target_end_date: end,
      parent_id: null,
      progress_percent: 0,
      status: "scheduled",
      sort_order: index * 10,
      color_theme: DEFAULT_COLOR_THEME,
    };
  });
}

/**
 * The job's overall progress, weighted by each phase's length in days — a
 * three-week framing phase at 50% is more of the job than a two-day fixture
 * install at 50%. Sub-tasks are detail under their phase, so only top-level
 * rows count.
 */
export function overallProgress(
  rows: Array<{ parent_id?: string | null; progress_percent?: unknown; target_start_date?: string; target_end_date?: string }>
): number {
  const phases = rows.filter((r) => !r.parent_id);
  if (phases.length === 0) return 0;

  let weighted = 0;
  let totalDays = 0;
  for (const phase of phases) {
    const days =
      isIsoDate(phase.target_start_date) && isIsoDate(phase.target_end_date)
        ? Math.max(1, Math.round((Date.parse(`${phase.target_end_date}T00:00:00Z`) - Date.parse(`${phase.target_start_date}T00:00:00Z`)) / 86_400_000) + 1)
        : 1;
    weighted += clampProgress(phase.progress_percent) * days;
    totalDays += days;
  }
  return Math.round(weighted / totalDays);
}

/** The next sort position, after everything already there. */
export function nextSortOrder(rows: Array<{ sort_order?: unknown }>): number {
  const highest = rows.reduce((max, r) => Math.max(max, Number(r.sort_order) || 0), -10);
  return highest + 10;
}
