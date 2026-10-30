/**
 * The certificate of insurance attached to homeowner emails (contract signed,
 * deposit request).
 *
 * The repository is public, so the PDF is never committed or served from
 * /public. It lives in a private Supabase Storage bucket that only the server
 * (service role key) can read:
 *
 *   bucket  documents   (private)
 *   object  certificate-of-insurance.pdf
 *
 * Renewing is just uploading the new PDF over that object and updating
 * COI_EXPIRES_ON (Vercel env var) to the new policy expiration date. Past that
 * date the certificate stops being attached, so an expired one is never sent.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export const COI_BUCKET = "documents";
export const COI_OBJECT = "certificate-of-insurance.pdf";
export const COI_FILENAME = "WDO-Custom-Certificate-of-Insurance.pdf";

/** Expiration of the policy on the current certificate (HSIC-ISC01-0008641). */
export const DEFAULT_COI_EXPIRES_ON = "2027-10-30";

/** True while the certificate's policy is in force (through its expiration day). */
export function coiIsCurrent(expiresOn: string | null | undefined, now = new Date()): boolean {
  const day = (expiresOn || "").trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  return now.getTime() < new Date(`${day}T23:59:59`).getTime();
}

export interface CertificateAttachment {
  filename: string;
  content: Buffer;
}

/**
 * The current certificate as an email attachment, or null when it's missing,
 * unreadable or expired. Never throws: an email must still go out without it.
 */
export async function loadCertificateOfInsurance(supabase: SupabaseClient): Promise<CertificateAttachment | null> {
  const expiresOn = process.env.COI_EXPIRES_ON || DEFAULT_COI_EXPIRES_ON;
  if (!coiIsCurrent(expiresOn)) {
    console.warn(`Certificate of insurance expired ${expiresOn} — not attaching. Upload the renewal and update COI_EXPIRES_ON.`);
    return null;
  }
  try {
    const { data, error } = await supabase.storage.from(COI_BUCKET).download(COI_OBJECT);
    if (error || !data) {
      console.warn("Certificate of insurance not found in storage — sending without it:", error?.message);
      return null;
    }
    return { filename: COI_FILENAME, content: Buffer.from(await data.arrayBuffer()) };
  } catch (err) {
    console.warn("Certificate of insurance could not be loaded — sending without it:", err);
    return null;
  }
}
