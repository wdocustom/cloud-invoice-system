import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { buildConsultationConfirmationHtml, buildConsultationNotificationHtml } from "@/lib/email-templates";
import { insertTolerant, updateTolerant } from "@/lib/db";
import { allocateDocumentNumber, estimateNumberFields } from "@/lib/document-numbers";
import { leadScoreFields, scoreLead } from "@/lib/lead-score";
import {
  buildLeadUpdate,
  buildNewLead,
  normalizeEmail,
  pickLeadForBooking,
  zipFromAddress,
  type ConsultationBooking,
} from "@/lib/consultation-lead";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function generateToken(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let token = "";
  for (let i = 0; i < 12; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

interface RecordedLead {
  id: string;
  estimate_number: string | null;
  /** True when the booking attached to a lead that already existed. */
  linked: boolean;
}

/**
 * Put the booking into the lead pipeline: attach it to the estimate it came from
 * (or an open lead with the same email), or open a new lead. Never throws — a
 * database problem must not cost the homeowner their confirmation email.
 */
async function recordBooking(booking: ConsultationBooking, token: string | null): Promise<RecordedLead | null> {
  try {
    const supabase = getSupabase();

    const candidates: any[] = [];
    if (token) {
      const { data } = await supabase.from("estimates").select("*").eq("token", token).maybeSingle();
      if (data) candidates.push(data);
    }
    const email = normalizeEmail(booking.email);
    if (email && candidates.length === 0) {
      // ilike for a case-insensitive exact match; escape its wildcards.
      const pattern = email.replace(/[\\%_]/g, (c) => `\\${c}`);
      const { data } = await supabase
        .from("estimates")
        .select("*")
        .ilike("email", pattern)
        .order("created_at", { ascending: false })
        .limit(10);
      if (data) candidates.push(...data);
    }

    const existing = pickLeadForBooking(candidates, { email: booking.email, token });
    if (existing) {
      const { error } = await updateTolerant(
        supabase,
        "estimates",
        buildLeadUpdate(existing, booking),
        (query) => query.eq("id", existing.id)
      );
      if (error) {
        console.error("Failed to attach consultation to lead (non-blocking):", error);
        return null;
      }
      return { id: existing.id, estimate_number: existing.estimate_number ?? null, linked: true };
    }

    const numberFields = estimateNumberFields(await allocateDocumentNumber(supabase));
    const scoreFields = leadScoreFields(
      scoreLead({
        projectType: booking.projectType,
        zip: zipFromAddress(booking.address),
        description: booking.notes,
        name: booking.name,
        email: booking.email,
        phone: booking.phone,
      })
    );

    const { data, error, dropped } = await insertTolerant<{ id: string }>(
      supabase,
      "estimates",
      { ...buildNewLead(booking, generateToken()), ...numberFields, ...scoreFields },
      "id"
    );
    if (error || !data) {
      console.error("Failed to save consultation lead (non-blocking):", error);
      return null;
    }
    return {
      id: data.id,
      estimate_number: dropped.includes("estimate_number") ? null : numberFields.estimate_number ?? null,
      linked: false,
    };
  } catch (err) {
    console.error("Failed to record consultation lead (non-blocking):", err);
    return null;
  }
}

function parseTime12(time12: string): { hours: number; minutes: number } {
  const [timePart, meridiem] = time12.split(" ");
  let [h, m] = timePart.split(":").map(Number);
  if (meridiem === "PM" && h !== 12) h += 12;
  if (meridiem === "AM" && h === 12) h = 0;
  return { hours: h, minutes: m };
}

function toICalDate(dateStr: string, hours: number, minutes: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setHours(hours, minutes, 0, 0);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(hours)}${pad(minutes)}00`;
}

function generateICS(params: {
  date: string;
  time: string;
  name: string;
  address: string;
  phone: string;
  projectType: string;
  notes: string;
}): string {
  const { hours, minutes } = parseTime12(params.time);
  const startDt = toICalDate(params.date, hours, minutes);
  const endDt = toICalDate(params.date, hours, minutes + 45);
  const uid = `consultation-${Date.now()}@wdocustom.com`;

  const description = [
    `Consultation with ${params.name}`,
    params.phone ? `Phone: ${params.phone}` : "",
    params.projectType ? `Project: ${params.projectType}` : "",
    params.notes ? `Notes: ${params.notes}` : "",
  ].filter(Boolean).join("\\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//WDO Custom//Consultation//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTART:${startDt}`,
    `DTEND:${endDt}`,
    `SUMMARY:WDO Custom — Free Consultation with Skyler`,
    `DESCRIPTION:${description}`,
    `LOCATION:${params.address.replace(/,/g, "\\,")}`,
    `ORGANIZER;CN=Skyler Camacho:mailto:skyler@wdocustom.com`,
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Reminder: Consultation with WDO Custom in 1 hour",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export async function POST(request: Request) {
  try {
    const { name, email, phone, address, projectType, notes, date, time, estimateToken } = await request.json();

    if (!name || !email || !phone || !address || !date || !time) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const icsContent = generateICS({ date, time, name, address, phone, projectType, notes });
    const icsBuffer = Buffer.from(icsContent, "utf-8");

    const dateFull = new Date(date + "T12:00:00").toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    // Record the lead before emailing, so Skyler's notification can link to it.
    const lead = await recordBooking(
      { name, email, phone, address, projectType, notes, date, time },
      typeof estimateToken === "string" && estimateToken.trim() ? estimateToken.trim() : null
    );

    if (!resend) {
      console.warn("Consultation scheduling skipped — RESEND_API_KEY not set");
      return NextResponse.json({ success: true, skipped: true, lead_recorded: !!lead });
    }

    await Promise.all([
      resend.emails.send({
        from: "WDO Custom <messages@wdocustom.com>",
        to: [email],
        subject: `Your Consultation is Booked — ${dateFull} at ${time}`,
        html: buildConsultationConfirmationHtml({
          name,
          date: dateFull,
          time,
          address,
          projectType,
          phone,
        }),
        attachments: [
          {
            filename: "WDO-Custom-Consultation.ics",
            content: icsBuffer,
            contentType: "text/calendar; method=REQUEST",
          },
        ],
      }),

      resend.emails.send({
        from: "WDO Custom <messages@wdocustom.com>",
        to: ["skyler@wdocustom.com"],
        subject: `New Consultation Booked: ${name} — ${dateFull} at ${time}`,
        html: buildConsultationNotificationHtml({
          name,
          email,
          phone,
          address,
          projectType,
          notes,
          date: dateFull,
          time,
          leadUrl: lead ? `${new URL(request.url).origin}/admin/estimates/${lead.id}` : undefined,
          leadNumber: lead?.estimate_number ?? undefined,
          linkedToEstimate: lead?.linked ?? false,
        }),
        attachments: [
          {
            filename: "WDO-Custom-Consultation.ics",
            content: icsBuffer,
            contentType: "text/calendar; method=REQUEST",
          },
        ],
      }),
    ]);

    return NextResponse.json({ success: true, lead_recorded: !!lead });
  } catch (err: any) {
    console.error("Schedule consultation error:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
