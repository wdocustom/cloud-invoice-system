import { NextResponse } from "next/server";
import { Resend } from "resend";
import { buildConsultationConfirmationHtml, buildConsultationNotificationHtml } from "@/lib/email-templates";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

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
    const { name, email, phone, address, projectType, notes, date, time } = await request.json();

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

    if (!resend) {
      console.warn("Consultation scheduling skipped — RESEND_API_KEY not set");
      return NextResponse.json({ success: true, skipped: true });
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

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Schedule consultation error:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
