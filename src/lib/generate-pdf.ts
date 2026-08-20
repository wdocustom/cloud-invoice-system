import { jsPDF } from "jspdf";
import { toNum } from "./utils";
import { categoryOf } from "./scope-amendment";

interface PdfInvoiceData {
  proposal_number?: string;
  estimate_number?: string;
  homeowner_name: string;
  homeowner_email?: string;
  job_address: string;
  project_title?: string;
  amount: number;
  items: any[];
  deposit_percentage?: number;
  payment_phases?: any[];
  estimated_start_date?: string;
  project_length?: string;
  status: string;
  signature_name?: string;
  signed_at?: string;
}

const MARGIN = 20;
const PAGE_W = 210;
const CONTENT_W = PAGE_W - MARGIN * 2;

function addPage(doc: jsPDF): number {
  doc.addPage();
  return MARGIN;
}

function checkPageBreak(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > 275) return addPage(doc);
  return y;
}

function generatePdfDoc(invoice: PdfInvoiceData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const isApproved = invoice.status === "approved";
  const baseTotal = toNum(invoice.amount);
  const depositPct = invoice.deposit_percentage ?? 20;
  const depositAmt = baseTotal * (depositPct / 100);

  let y = MARGIN;

  // ── Header band ──
  doc.setFillColor(26, 26, 26);
  doc.rect(0, 0, PAGE_W, 36, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("WDO Custom", MARGIN, 16);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("General Contractor · Omaha, NE", MARGIN, 23);

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  const statusText = isApproved ? "EXECUTED CONTRACT" : "PROPOSAL";
  const statusW = doc.getTextWidth(statusText) + 10;
  doc.setFillColor(isApproved ? 75 : 196, isApproved ? 143 : 162, isApproved ? 75 : 101);
  doc.roundedRect(PAGE_W - MARGIN - statusW, 10, statusW, 8, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.text(statusText, PAGE_W - MARGIN - statusW + 5, 15.5);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 180, 180);
  const generated = `Generated ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
  // The document number sits above the date so it's the first thing a client
  // quotes back on the phone.
  if (invoice.proposal_number) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 220, 220);
    doc.text(`No. ${invoice.proposal_number}`, PAGE_W - MARGIN, 24, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(180, 180, 180);
  }
  doc.text(generated, PAGE_W - MARGIN, 29, { align: "right" });

  y = 46;

  // ── Contractor / Client info side by side ──
  doc.setDrawColor(232, 228, 223);

  // Left: Contractor
  doc.setFillColor(251, 251, 250);
  doc.roundedRect(MARGIN, y, CONTENT_W / 2 - 3, 38, 3, 3, "FD");
  doc.setTextColor(156, 149, 144);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("CONTRACTOR", MARGIN + 5, y + 7);

  doc.setTextColor(26, 26, 26);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Skyler Camacho", MARGIN + 5, y + 14);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("LIC-1901422", MARGIN + 5, y + 20);
  doc.text("402-819-8558", MARGIN + 5, y + 25);
  doc.text("skyler@wdocustom.com", MARGIN + 5, y + 30);

  // Right: Client
  const rx = MARGIN + CONTENT_W / 2 + 3;
  doc.setFillColor(251, 251, 250);
  doc.roundedRect(rx, y, CONTENT_W / 2 - 3, 38, 3, 3, "FD");
  doc.setTextColor(156, 149, 144);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("CLIENT", rx + 5, y + 7);

  doc.setTextColor(26, 26, 26);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(invoice.homeowner_name || "Client", rx + 5, y + 14);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(invoice.job_address || "", rx + 5, y + 20);
  if (invoice.homeowner_email) {
    doc.text(invoice.homeowner_email, rx + 5, y + 25);
  }
  if (invoice.project_title) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(196, 162, 101);
    doc.text(invoice.project_title, rx + 5, y + 32);
  }

  y += 48;

  // ── Project parameters row ──
  doc.setFillColor(251, 251, 250);
  doc.setDrawColor(232, 228, 223);
  doc.roundedRect(MARGIN, y, CONTENT_W, 16, 3, 3, "FD");

  const colW = CONTENT_W / 4;
  const params = [
    { label: "PROJECT TOTAL", value: `$${baseTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
    { label: "DEPOSIT", value: `$${depositAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })} (${depositPct}%)` },
    { label: "TIMELINE", value: invoice.project_length || "TBD" },
    {
      label: "START DATE",
      value: invoice.estimated_start_date
        ? new Date(invoice.estimated_start_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : "TBD",
    },
  ];

  params.forEach((p, i) => {
    const px = MARGIN + colW * i + 5;
    doc.setTextColor(156, 149, 144);
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.text(p.label, px, y + 6);

    doc.setTextColor(26, 26, 26);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(p.value, px, y + 12);
  });

  y += 24;

  // ── Line Items Table ──
  doc.setTextColor(156, 149, 144);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("SCOPE OF WORK", MARGIN, y);
  y += 4;

  // Header row
  doc.setFillColor(26, 26, 26);
  doc.roundedRect(MARGIN, y, CONTENT_W, 8, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("#", MARGIN + 4, y + 5.5);
  doc.text("ITEM", MARGIN + 14, y + 5.5);
  doc.text("AMOUNT", PAGE_W - MARGIN - 4, y + 5.5, { align: "right" });
  y += 10;

  let runningTotal = 0;

  const hasAnyActuals = isApproved && invoice.items.some((item: any) => item.actual_cost != null);

  // Items are stored grouped by category, so a band whenever the category
  // changes turns the table into sections without reordering anything here.
  let lastCategory: string | null = null;

  invoice.items.forEach((item: any, idx: number) => {
    const category = categoryOf(item);
    if (category !== lastCategory) {
      y = checkPageBreak(doc, y, 10);
      doc.setFillColor(244, 243, 241);
      doc.rect(MARGIN, y - 1, CONTENT_W, 6, "F");
      doc.setTextColor(120, 115, 110);
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "bold");
      doc.text(category.toUpperCase(), MARGIN + 4, y + 3);
      y += 7;
      lastCategory = category;
    }

    const title = item.title || item.high_title || "Untitled";
    const bidCost = toNum(item.cost || item.mid_cost);
    const actualCost = item.actual_cost != null ? toNum(item.actual_cost) : null;
    const displayCost = actualCost ?? bidCost;
    const desc = item.description || item.mid_description || "";
    runningTotal += displayCost;

    const descLines = desc ? doc.splitTextToSize(desc, CONTENT_W - 24) : [];
    const hasActualLine = hasAnyActuals && actualCost != null;
    const rowH = 8 + (descLines.length > 0 ? descLines.length * 3.5 + 1 : 0) + (hasActualLine ? 4 : 0);

    y = checkPageBreak(doc, y, rowH + 2);

    if (idx % 2 === 0) {
      doc.setFillColor(251, 251, 250);
      doc.rect(MARGIN, y - 1, CONTENT_W, rowH, "F");
    }

    doc.setDrawColor(240, 240, 238);
    doc.line(MARGIN, y + rowH - 1, PAGE_W - MARGIN, y + rowH - 1);

    doc.setTextColor(156, 149, 144);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(String(idx + 1), MARGIN + 4, y + 5);

    doc.setTextColor(26, 26, 26);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    const truncTitle = title.length > 65 ? title.slice(0, 62) + "..." : title;
    doc.text(truncTitle, MARGIN + 14, y + 5);

    doc.setTextColor(26, 26, 26);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`$${displayCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, PAGE_W - MARGIN - 4, y + 5, { align: "right" });

    if (hasActualLine) {
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(156, 149, 144);
      doc.text(`Bid: $${bidCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, PAGE_W - MARGIN - 4, y + 9, { align: "right" });
    }

    if (descLines.length > 0) {
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(140, 140, 140);
      doc.text(descLines, MARGIN + 14, y + 9.5 + (hasActualLine ? 4 : 0));
    }

    y += rowH;
  });

  // Total row
  y = checkPageBreak(doc, y, 14);
  doc.setFillColor(26, 26, 26);
  doc.roundedRect(MARGIN, y + 2, CONTENT_W, 10, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL", MARGIN + 14, y + 8.5);
  doc.text(
    `$${runningTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    PAGE_W - MARGIN - 4,
    y + 8.5,
    { align: "right" }
  );
  y += 18;

  // ── Payment Schedule ──
  if (invoice.payment_phases && invoice.payment_phases.length > 0) {
    y = checkPageBreak(doc, y, 12 + invoice.payment_phases.length * 8);

    doc.setTextColor(156, 149, 144);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("PAYMENT SCHEDULE", MARGIN, y);
    y += 6;

    invoice.payment_phases.forEach((phase: any) => {
      const phaseAmt = baseTotal * (phase.percentage / 100);

      doc.setDrawColor(240, 240, 238);
      doc.line(MARGIN, y + 6, PAGE_W - MARGIN, y + 6);

      doc.setTextColor(26, 26, 26);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(phase.name, MARGIN + 2, y + 4);

      doc.setTextColor(156, 149, 144);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(`${phase.percentage}%`, MARGIN + CONTENT_W / 2, y + 4);

      doc.setTextColor(26, 26, 26);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(
        `$${phaseAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        PAGE_W - MARGIN - 4,
        y + 4,
        { align: "right" }
      );

      y += 8;
    });

    y += 6;
  }

  // ── Signature block (post-approval only) ──
  if (isApproved && invoice.signature_name) {
    y = checkPageBreak(doc, y, 40);

    doc.setFillColor(244, 247, 244);
    doc.setDrawColor(200, 217, 200);
    doc.roundedRect(MARGIN, y, CONTENT_W, 34, 3, 3, "FD");

    doc.setTextColor(74, 122, 74);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("CONTRACT EXECUTED", MARGIN + 5, y + 8);

    doc.setDrawColor(200, 217, 200);
    doc.line(MARGIN + 5, y + 11, MARGIN + CONTENT_W / 2, y + 11);

    doc.setTextColor(26, 26, 26);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bolditalic");
    doc.text(invoice.signature_name, MARGIN + 5, y + 20);

    doc.setTextColor(100, 100, 100);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    const signedDate = invoice.signed_at
      ? new Date(invoice.signed_at).toLocaleString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : "";
    doc.text(`Digitally signed: ${signedDate}`, MARGIN + 5, y + 26);
    doc.text(`Signatory: ${invoice.homeowner_name}`, MARGIN + 5, y + 30);

    y += 40;
  }

  // ── Footer ──
  y = checkPageBreak(doc, y, 20);
  doc.setDrawColor(232, 228, 223);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 5;

  doc.setTextColor(180, 180, 180);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.text(
    "This document is governed under the building framework of the City of Omaha, Douglas County, Nebraska.",
    MARGIN,
    y
  );
  doc.text(
    "WDO Custom · Skyler Camacho · LIC-1901422 · 402-819-8558 · skyler@wdocustom.com",
    MARGIN,
    y + 4
  );

  return doc;
}

/** WDO_Custom_Proposal_PRO-2026-0007_Jane_Doe.pdf */
function pdfFilename(invoice: PdfInvoiceData): string {
  const safeName = (invoice.homeowner_name || "client").replace(/[^a-zA-Z0-9]/g, "_");
  const docType = invoice.status === "approved" ? "Contract" : "Proposal";
  const number = invoice.proposal_number ? `${invoice.proposal_number}_` : "";
  return `WDO_Custom_${docType}_${number}${safeName}.pdf`;
}

export function generateProposalPdf(invoice: PdfInvoiceData) {
  const doc = generatePdfDoc(invoice);
  doc.save(pdfFilename(invoice));
}

export function generateProposalPdfBuffer(invoice: PdfInvoiceData): { buffer: Buffer; filename: string } {
  const doc = generatePdfDoc(invoice);
  const arrayBuffer = doc.output("arraybuffer");
  return {
    buffer: Buffer.from(arrayBuffer),
    filename: pdfFilename(invoice),
  };
}
