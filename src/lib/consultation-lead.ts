/**
 * Consultation bookings as leads.
 *
 * The consultation form used to send two emails and stop there: nothing reached
 * the `estimates` table, so a homeowner who booked a visit never appeared in the
 * lead ledger, never got a number, and could not be converted into a proposal.
 * Worse, someone who ran the instant estimate and then booked stayed "New Lead"
 * in the ledger, looking like a call Skyler still owed them.
 *
 * A booking now lands in the same pipeline as every other inquiry:
 *
 *  - If it came from an estimate link (the `estimate` token the estimate pages
 *    pass along), or matches an open lead by email, that lead is updated in
 *    place: status moves to `consultation_scheduled` and the appointment is
 *    recorded on it.
 *  - Otherwise a new lead is created, numbered and scored like an estimator
 *    lead, with `lead_source = 'consultation'` and no estimate behind it.
 *
 * Everything here is pure so the matching and patch-building can be tested
 * without a database; the route does the I/O.
 */

export interface ConsultationBooking {
  name: string;
  email: string;
  phone: string;
  address: string;
  projectType?: string | null;
  notes?: string | null;
  /** YYYY-MM-DD, as the booking page sends it. */
  date: string;
  /** "10:30 AM", as the booking page sends it. */
  time: string;
}

/** Project type stored on a booking that didn't pick one. project_type is NOT NULL. */
export const UNSPECIFIED_PROJECT = "Consultation";

/** Statuses a booking must not overwrite: the lead has already moved past it. */
const TERMINAL_STATUSES = new Set(["converted"]);

export function normalizeEmail(email: string | null | undefined): string {
  return (email || "").trim().toLowerCase();
}

/** A five-digit ZIP from a free-text address, if it ends with one. */
export function zipFromAddress(address: string | null | undefined): string | null {
  const match = (address || "").match(/\b(\d{5})(?:-\d{4})?\s*$/);
  return match ? match[1] : null;
}

/** "Tuesday, November 3, 2026 at 10:30 AM" — the line written into lead notes. */
export function describeAppointment(date: string, time: string): string {
  const d = new Date(`${date}T12:00:00`);
  const day = Number.isNaN(d.getTime())
    ? date
    : d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  return `${day} at ${time}`;
}

/**
 * True when the lead has an actual instant estimate behind it. Consultation-only
 * leads carry an empty object, and the admin hides estimate-specific actions
 * (public link, reminder email, preliminary range) for them.
 */
export function hasEstimate(row: { estimate_data?: any } | null | undefined): boolean {
  const ed = row?.estimate_data;
  return !!ed && typeof ed === "object" && Array.isArray(ed.line_items) && ed.line_items.length > 0;
}

/**
 * Which existing lead a booking belongs to. The token wins: it's the estimate
 * the homeowner just clicked through from. Failing that, the newest open lead
 * with the same email. Converted and referred leads are history, so a booking
 * from a past customer starts a fresh opportunity rather than reopening one.
 */
export function pickLeadForBooking<T extends Record<string, any>>(
  candidates: T[],
  booking: { email: string; token?: string | null }
): T | null {
  if (booking.token) {
    const byToken = candidates.find((c) => c.token === booking.token);
    if (byToken) return byToken;
  }
  const email = normalizeEmail(booking.email);
  if (!email) return null;
  const open = candidates
    .filter((c) => normalizeEmail(c.email) === email)
    .filter((c) => !c.converted_to_invoice_id && c.status !== "referred" && c.status !== "converted")
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  return open[0] ?? null;
}

/** The note appended to a lead's internal notes for each booking. */
export function bookingNote(booking: ConsultationBooking): string {
  const lines = [`Consultation booked for ${describeAppointment(booking.date, booking.time)}.`];
  if (booking.address?.trim()) lines.push(`Address given: ${booking.address.trim()}`);
  if (booking.notes?.trim()) lines.push(`Homeowner notes: ${booking.notes.trim()}`);
  return lines.join("\n");
}

function appendNote(existing: string | null | undefined, note: string): string {
  const prior = (existing || "").trim();
  return prior ? `${prior}\n\n${note}` : note;
}

/** Fields recording the appointment itself, shared by the insert and update paths. */
export function consultationFields(booking: ConsultationBooking) {
  return {
    consultation_scheduled: true,
    consultation_date: booking.date,
    consultation_time: booking.time,
    consultation_booked_at: new Date().toISOString(),
  };
}

/**
 * The update for an existing lead. It fills gaps rather than overwriting: the
 * contractor may already have corrected the name or address on the lead, and a
 * booking form shouldn't undo that. The appointment and status always apply.
 */
export function buildLeadUpdate(existing: Record<string, any>, booking: ConsultationBooking): Record<string, any> {
  const update: Record<string, any> = {
    ...consultationFields(booking),
    notes: appendNote(existing.notes, bookingNote(booking)),
    updated_at: new Date().toISOString(),
  };

  if (!TERMINAL_STATUSES.has(existing.status)) update.status = "consultation_scheduled";

  const fill = (column: string, value: string | null | undefined) => {
    const v = (value || "").trim();
    if (v && !(existing[column] || "").toString().trim()) update[column] = v;
  };
  fill("name", booking.name);
  fill("email", booking.email);
  fill("phone", booking.phone);
  fill("address", booking.address);
  fill("zip", zipFromAddress(booking.address));

  // A lead whose type was the placeholder gets the real one once it's known.
  const projectType = (booking.projectType || "").trim();
  if (projectType && (!existing.project_type || existing.project_type === UNSPECIFIED_PROJECT)) {
    update.project_type = projectType;
  }

  return update;
}

/**
 * The insert for a booking with no lead behind it. `estimate_data` is NOT NULL
 * on the table, so it carries an empty object; conversion then produces a
 * proposal with no line items for the contractor to write after the visit.
 */
export function buildNewLead(booking: ConsultationBooking, token: string): Record<string, any> {
  const projectType = (booking.projectType || "").trim() || UNSPECIFIED_PROJECT;
  const notes = (booking.notes || "").trim();
  return {
    token,
    name: booking.name.trim(),
    email: booking.email.trim(),
    phone: booking.phone.trim(),
    address: booking.address.trim(),
    zip: zipFromAddress(booking.address),
    project_type: projectType,
    scope_level: "mid",
    description: notes || `Booked an in-home consultation for ${projectType.toLowerCase()}.`,
    estimate_data: {},
    status: "consultation_scheduled",
    lead_source: "consultation",
    notes: bookingNote(booking),
    ...consultationFields(booking),
  };
}

/** When the booked visit starts, as epoch ms, or null if none is on file. */
export function consultationStartsAt(row: Record<string, any> | null | undefined): number | null {
  if (!row?.consultation_scheduled || !row.consultation_date) return null;
  const date = String(row.consultation_date).slice(0, 10);
  const [timePart, meridiem] = String(row.consultation_time || "12:00 PM").split(" ");
  let [h, m] = timePart.split(":").map(Number);
  if (!Number.isFinite(h)) h = 12;
  if (!Number.isFinite(m)) m = 0;
  if (meridiem === "PM" && h !== 12) h += 12;
  if (meridiem === "AM" && h === 12) h = 0;
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

/** "Tue, Nov 3 · 10:30 AM" for the ledger, or null when nothing is booked. */
export function consultationLabel(row: Record<string, any> | null | undefined): string | null {
  if (!row?.consultation_scheduled || !row.consultation_date) return null;
  const d = new Date(`${String(row.consultation_date).slice(0, 10)}T12:00:00`);
  const day = Number.isNaN(d.getTime())
    ? String(row.consultation_date)
    : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  return row.consultation_time ? `${day} · ${row.consultation_time}` : day;
}

/** A visit still ahead (or later today) on a lead that hasn't converted. */
export function hasUpcomingConsultation(row: Record<string, any> | null | undefined, now = Date.now()): boolean {
  const startsAt = consultationStartsAt(row);
  if (startsAt === null || row?.converted_to_invoice_id) return false;
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  return startsAt >= startOfToday.getTime();
}
