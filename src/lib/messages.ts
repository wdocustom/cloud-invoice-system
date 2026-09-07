// Read receipts for the job thread.
//
// Read state lives on each message in the `questions` JSONB array as `read_at`,
// stamped by the homeowner portal when the thread is opened.
//
// Messages sent before receipts shipped have no `read_at` and never will. Rather
// than treating that absence as "unread" — which would light up an entire
// historical thread the first time a homeowner opened the portal, on any device
// — anything before the cutoff is left alone: not flagged for the homeowner, and
// not reported either way to the contractor, because we genuinely do not know.
export const READ_RECEIPTS_SINCE = new Date("2026-09-07T00:00:00Z");

export function isReceiptTracked(msg: any): boolean {
  if (!msg?.timestamp) return false;
  const sentAt = new Date(msg.timestamp).getTime();
  return Number.isFinite(sentAt) && sentAt >= READ_RECEIPTS_SINCE.getTime();
}

export function isUnreadFromContractor(msg: any): boolean {
  return msg?.author === "contractor" && !msg?.read_at && isReceiptTracked(msg);
}
