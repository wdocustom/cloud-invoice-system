interface ProposalEmailData {
  homeowner_name: string;
  project_title?: string;
  job_address: string;
  amount: number;
  portal_url: string;
  estimated_start_date?: string;
  project_length?: string;
  proposal_expires_at?: string;
}

interface ApprovalEmailData {
  homeowner_name: string;
  project_title?: string;
  job_address: string;
  amount: number;
  deposit_amount: number;
  deposit_percentage: number;
  portal_url: string;
  estimated_start_date?: string;
  project_length?: string;
  signed_at: string;
  signature_name: string;
  items: { title: string; cost: number }[];
}

interface ContractorMessageNotificationData {
  homeowner_name: string;
  project_title?: string;
  job_address: string;
  portal_url: string;
  message_preview: string;
}

interface PaymentReminderData {
  homeowner_name: string;
  project_title?: string;
  job_address: string;
  phase_name: string;
  phase_amount: number;
  total_remaining: number;
  portal_url: string;
}

interface DepositEmailData {
  homeowner_name: string;
  project_title?: string;
  job_address: string;
  deposit_amount: number;
  total_amount: number;
  portal_url: string;
  pending_selections?: string[];
}

interface SelectionReminderData {
  homeowner_name: string;
  project_title?: string;
  job_address: string;
  portal_url: string;
  pending_categories: {
    category: string;
    choices: { label: string; image_url?: string; product_url?: string; select_url: string }[];
  }[];
}

interface SelectionMadeNotificationData {
  homeowner_name: string;
  project_title?: string;
  job_address: string;
  category: string;
  selected_value: string;
  total_selected: number;
  total_categories: number;
  portal_url: string;
}

function formatMoney(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function buildProposalEmailHtml(data: ProposalEmailData): string {
  const startDate = data.estimated_start_date
    ? new Date(data.estimated_start_date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  const expiresDate = data.proposal_expires_at
    ? new Date(data.proposal_expires_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : null;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#FBFBFA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1A1A1A;-webkit-font-smoothing:antialiased;">

<!-- Header -->
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1A1A1A;">
  <tr><td style="padding:28px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">WDO Custom</span>
          <br>
          <span style="color:#9C9590;font-size:12px;font-weight:500;">General Contractor &middot; Omaha, NE</span>
        </td>
        <td align="right">
          <span style="display:inline-block;background-color:#C4A265;color:#ffffff;font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;padding:5px 14px;border-radius:20px;">Proposal</span>
        </td>
      </tr>
    </table>
  </td></tr>
</table>

<!-- Body -->
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
  <tr><td style="padding:36px 32px 0;">

    <!-- Greeting -->
    <p style="font-size:16px;font-weight:600;color:#1A1A1A;margin:0 0 8px;">Hi ${data.homeowner_name},</p>
    <p style="font-size:14px;color:#6B6B6B;line-height:1.7;margin:0 0 28px;">
      Thank you for the opportunity to work on your project. We've put together a detailed proposal for your review — take your time looking it over, and reach out with any questions.
    </p>

    <!-- Project Card -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border:1px solid #E8E4DF;border-radius:16px;overflow:hidden;">
      <tr><td style="padding:24px 28px;">
        ${data.project_title ? `<p style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#C4A265;margin:0 0 4px;">${data.project_title}</p>` : ""}
        <p style="font-size:13px;color:#9C9590;margin:0 0 16px;">${data.job_address}</p>

        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="50%" style="padding-right:12px;">
              <p style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:#9C9590;margin:0 0 4px;">Project Total</p>
              <p style="font-size:26px;font-weight:700;color:#1A1A1A;margin:0;letter-spacing:-0.5px;">$${formatMoney(data.amount)}</p>
            </td>
            <td width="50%">
              <table cellpadding="0" cellspacing="0">
                ${startDate ? `<tr><td style="padding-bottom:6px;"><span style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:#9C9590;">Start Date</span><br><span style="font-size:13px;font-weight:600;color:#1A1A1A;">${startDate}</span></td></tr>` : ""}
                ${data.project_length ? `<tr><td><span style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:#9C9590;">Timeline</span><br><span style="font-size:13px;font-weight:600;color:#1A1A1A;">${data.project_length}</span></td></tr>` : ""}
              </table>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>

    <!-- CTA Button -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
      <tr><td align="center">
        <a href="${data.portal_url}" style="display:inline-block;background-color:#1A1A1A;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:12px;letter-spacing:0.2px;">
          View Full Proposal
        </a>
      </td></tr>
    </table>

    <!-- What you can do -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F3F0;border-radius:12px;margin-bottom:24px;">
      <tr><td style="padding:20px 24px;">
        <p style="font-size:12px;font-weight:600;color:#1A1A1A;margin:0 0 10px;">From your portal you can:</p>
        <table cellpadding="0" cellspacing="0">
          <tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;line-height:1.6;">
            <span style="color:#C4A265;font-weight:700;margin-right:8px;">&bull;</span> Review every line item and description in detail
          </td></tr>
          <tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;line-height:1.6;">
            <span style="color:#C4A265;font-weight:700;margin-right:8px;">&bull;</span> Remove or add back items to customize your scope
          </td></tr>
          <tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;line-height:1.6;">
            <span style="color:#C4A265;font-weight:700;margin-right:8px;">&bull;</span> Send us questions directly through the Messages tab
          </td></tr>
          <tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;line-height:1.6;">
            <span style="color:#C4A265;font-weight:700;margin-right:8px;">&bull;</span> Approve and sign digitally when you're ready
          </td></tr>
          <tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;line-height:1.6;">
            <span style="color:#C4A265;font-weight:700;margin-right:8px;">&bull;</span> Download a PDF copy for your records
          </td></tr>
        </table>
      </td></tr>
    </table>

    ${expiresDate ? `
    <!-- Expiration Note -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFF9F0;border:1px solid #E8D5B7;border-radius:12px;margin-bottom:24px;">
      <tr><td style="padding:16px 20px;">
        <p style="font-size:12px;color:#8B6914;margin:0;line-height:1.6;">
          <strong>A note on timing:</strong> We've reserved a schedule slot and held this pricing through <strong>${expiresDate}</strong>. No rush — just want to make sure you're aware so we can keep that window open for you.
        </p>
      </td></tr>
    </table>
    ` : ""}

    <!-- Closing -->
    <p style="font-size:14px;color:#6B6B6B;line-height:1.7;margin:0 0 6px;">
      We genuinely appreciate the opportunity to earn your trust and your business. If you have any questions at all, don't hesitate to reach out — we're here to help.
    </p>
    <p style="font-size:14px;color:#1A1A1A;font-weight:600;margin:24px 0 4px;">Skyler Camacho</p>
    <p style="font-size:12px;color:#9C9590;margin:0;">WDO Custom &middot; 402-819-8558 &middot; skyler@wdocustom.com</p>

  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:28px 32px;border-top:1px solid #E8E4DF;margin-top:24px;">
    <p style="font-size:11px;color:#C0BAB4;margin:0;text-align:center;line-height:1.6;">
      WDO Custom &middot; General Contractor &middot; LIC-1901422 &middot; Omaha, NE
    </p>
  </td></tr>
</table>

</body>
</html>`;
}

export function buildReminderEmailHtml(data: ProposalEmailData & { days_remaining: number }): string {
  const expiresDate = data.proposal_expires_at
    ? new Date(data.proposal_expires_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
    : "";

  const urgencyText = data.days_remaining <= 1
    ? "expires tomorrow"
    : `expires in ${data.days_remaining} days`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#FBFBFA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1A1A1A;-webkit-font-smoothing:antialiased;">

<!-- Header -->
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1A1A1A;">
  <tr><td style="padding:24px 32px;">
    <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">WDO Custom</span>
  </td></tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
  <tr><td style="padding:36px 32px 0;">

    <p style="font-size:16px;font-weight:600;color:#1A1A1A;margin:0 0 8px;">Hi ${data.homeowner_name},</p>
    <p style="font-size:14px;color:#6B6B6B;line-height:1.7;margin:0 0 24px;">
      Just a quick note — your proposal for <strong>${data.project_title || data.job_address}</strong> ${urgencyText} on <strong>${expiresDate}</strong>. We're still holding your schedule slot and pricing, but wanted to make sure this doesn't slip off your radar.
    </p>

    <!-- Reminder Card -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${data.days_remaining <= 1 ? '#FFF5F5' : '#FFF9F0'};border:1px solid ${data.days_remaining <= 1 ? '#FED7D7' : '#E8D5B7'};border-radius:12px;margin-bottom:24px;">
      <tr><td style="padding:20px 24px;text-align:center;">
        <p style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:${data.days_remaining <= 1 ? '#C53030' : '#8B6914'};margin:0 0 6px;">Your schedule hold ${urgencyText}</p>
        <p style="font-size:28px;font-weight:700;color:#1A1A1A;margin:0;letter-spacing:-0.5px;">$${formatMoney(data.amount)}</p>
        <p style="font-size:12px;color:#9C9590;margin:4px 0 0;">${data.job_address}</p>
      </td></tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
      <tr><td align="center">
        <a href="${data.portal_url}" style="display:inline-block;background-color:#1A1A1A;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:12px;">
          Review Your Proposal
        </a>
      </td></tr>
    </table>

    <p style="font-size:14px;color:#6B6B6B;line-height:1.7;margin:0 0 6px;">
      If you need more time or have questions, just reply to this email or message us through your portal — we're happy to help.
    </p>

    <p style="font-size:14px;color:#1A1A1A;font-weight:600;margin:24px 0 4px;">Skyler Camacho</p>
    <p style="font-size:12px;color:#9C9590;margin:0;">WDO Custom &middot; 402-819-8558 &middot; skyler@wdocustom.com</p>

  </td></tr>
  <tr><td style="padding:28px 32px;border-top:1px solid #E8E4DF;">
    <p style="font-size:11px;color:#C0BAB4;margin:0;text-align:center;line-height:1.6;">
      WDO Custom &middot; General Contractor &middot; LIC-1901422 &middot; Omaha, NE
    </p>
  </td></tr>
</table>

</body>
</html>`;
}

// ─── Approval Confirmation Email (to homeowner) ───

export function buildApprovalConfirmationHtml(data: ApprovalEmailData): string {
  const signedDate = new Date(data.signed_at).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric"
  });
  const startDate = data.estimated_start_date
    ? new Date(data.estimated_start_date + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  const itemRows = data.items.map((item) => `
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#1A1A1A;border-bottom:1px solid #F0EDE8;">${item.title}</td>
            <td align="right" style="padding:8px 0;font-size:13px;font-weight:600;color:#1A1A1A;border-bottom:1px solid #F0EDE8;font-variant-numeric:tabular-nums;">$${formatMoney(item.cost)}</td>
          </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#FBFBFA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1A1A1A;-webkit-font-smoothing:antialiased;">

<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1A1A1A;">
  <tr><td style="padding:28px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">WDO Custom</span>
          <br>
          <span style="color:#9C9590;font-size:12px;font-weight:500;">General Contractor &middot; Omaha, NE</span>
        </td>
        <td align="right">
          <span style="display:inline-block;background-color:#4A7A4A;color:#ffffff;font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;padding:5px 14px;border-radius:20px;">Contract Signed</span>
        </td>
      </tr>
    </table>
  </td></tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
  <tr><td style="padding:36px 32px 0;">

    <p style="font-size:16px;font-weight:600;color:#1A1A1A;margin:0 0 8px;">Hi ${data.homeowner_name},</p>
    <p style="font-size:14px;color:#6B6B6B;line-height:1.7;margin:0 0 28px;">
      Great news — your proposal has been officially approved and your contract is now active. We're excited to get started on your project. Here's a summary of everything you've signed off on:
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F7F4;border:1px solid #C8D9C8;border-radius:16px;overflow:hidden;">
      <tr><td style="padding:24px 28px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <p style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#4A7A4A;margin:0 0 4px;">Contract Approved</p>
              <p style="font-size:28px;font-weight:700;color:#1A1A1A;margin:0;letter-spacing:-0.5px;">$${formatMoney(data.amount)}</p>
            </td>
            <td align="right" valign="top">
              <span style="display:inline-block;background-color:#4A7A4A;color:#ffffff;font-size:10px;font-weight:700;padding:5px 12px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px;">Active</span>
            </td>
          </tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;border-top:1px solid #C8D9C8;padding-top:12px;">
          ${data.project_title ? `<tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;"><strong style="color:#1A1A1A;">Project:</strong> ${data.project_title}</td></tr>` : ""}
          <tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;"><strong style="color:#1A1A1A;">Address:</strong> ${data.job_address}</td></tr>
          <tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;"><strong style="color:#1A1A1A;">Signed:</strong> ${signedDate}</td></tr>
          <tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;"><strong style="color:#1A1A1A;">Signed by:</strong> ${data.signature_name}</td></tr>
          ${startDate ? `<tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;"><strong style="color:#1A1A1A;">Est. Start:</strong> ${startDate}</td></tr>` : ""}
          ${data.project_length ? `<tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;"><strong style="color:#1A1A1A;">Timeline:</strong> ${data.project_length}</td></tr>` : ""}
        </table>
      </td></tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;background-color:#ffffff;border:1px solid #E8E4DF;border-radius:12px;overflow:hidden;">
      <tr><td style="padding:20px 24px;">
        <p style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:#9C9590;margin:0 0 12px;">Approved Scope of Work</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          ${itemRows}
          <tr>
            <td style="padding:12px 0 4px;font-size:14px;font-weight:700;color:#1A1A1A;">Contract Total</td>
            <td align="right" style="padding:12px 0 4px;font-size:14px;font-weight:700;color:#1A1A1A;font-variant-numeric:tabular-nums;">$${formatMoney(data.amount)}</td>
          </tr>
        </table>
      </td></tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;background-color:#FFF9F0;border:1px solid #E8D5B7;border-radius:12px;">
      <tr><td style="padding:20px 24px;">
        <p style="font-size:12px;font-weight:600;color:#8B6914;margin:0 0 6px;">Next Step: Construction Deposit</p>
        <p style="font-size:13px;color:#6B6B6B;line-height:1.6;margin:0;">
          Your construction deposit of <strong style="color:#1A1A1A;">$${formatMoney(data.deposit_amount)}</strong> (${data.deposit_percentage}%) is the next step to lock in your start date and begin material ordering. You can pay securely through your project portal.
        </p>
      </td></tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
      <tr><td align="center">
        <a href="${data.portal_url}" style="display:inline-block;background-color:#1A1A1A;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:12px;letter-spacing:0.2px;">
          Go to Your Project Portal
        </a>
      </td></tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F3F0;border-radius:12px;margin-bottom:24px;">
      <tr><td style="padding:20px 24px;">
        <p style="font-size:12px;font-weight:600;color:#1A1A1A;margin:0 0 10px;">What happens next:</p>
        <table cellpadding="0" cellspacing="0">
          <tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;line-height:1.6;">
            <span style="color:#4A7A4A;font-weight:700;margin-right:8px;">1.</span> Submit your construction deposit through the Payments tab
          </td></tr>
          <tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;line-height:1.6;">
            <span style="color:#4A7A4A;font-weight:700;margin-right:8px;">2.</span> We'll begin material ordering and scheduling subcontractors
          </td></tr>
          <tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;line-height:1.6;">
            <span style="color:#4A7A4A;font-weight:700;margin-right:8px;">3.</span> You'll receive progress updates, photos, and daily logs in your portal
          </td></tr>
          <tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;line-height:1.6;">
            <span style="color:#4A7A4A;font-weight:700;margin-right:8px;">4.</span> Message us anytime through the Messages tab — we're always available
          </td></tr>
        </table>
      </td></tr>
    </table>

    <p style="font-size:14px;color:#6B6B6B;line-height:1.7;margin:0 0 6px;">
      Thank you for choosing WDO Custom. We don't take this trust lightly — we're going to build something great together.
    </p>

    <p style="font-size:14px;color:#1A1A1A;font-weight:600;margin:24px 0 4px;">Skyler Camacho</p>
    <p style="font-size:12px;color:#9C9590;margin:0;">WDO Custom &middot; 402-819-8558 &middot; skyler@wdocustom.com</p>

  </td></tr>
  <tr><td style="padding:28px 32px;border-top:1px solid #E8E4DF;">
    <p style="font-size:11px;color:#C0BAB4;margin:0;text-align:center;line-height:1.6;">
      WDO Custom &middot; General Contractor &middot; LIC-1901422 &middot; Omaha, NE
    </p>
  </td></tr>
</table>

</body>
</html>`;
}

// ─── Contractor Notification Email (to Skyler) ───

export function buildContractorApprovalNotificationHtml(data: ApprovalEmailData): string {
  const signedDate = new Date(data.signed_at).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit"
  });

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#FBFBFA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1A1A1A;-webkit-font-smoothing:antialiased;">

<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1A1A1A;">
  <tr><td style="padding:24px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td><span style="color:#ffffff;font-size:18px;font-weight:700;">WDO Custom</span></td>
        <td align="right"><span style="display:inline-block;background-color:#4A7A4A;color:#ffffff;font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;padding:5px 14px;border-radius:20px;">New Approval</span></td>
      </tr>
    </table>
  </td></tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
  <tr><td style="padding:36px 32px 0;">

    <p style="font-size:16px;font-weight:600;color:#1A1A1A;margin:0 0 8px;">Skyler,</p>
    <p style="font-size:14px;color:#6B6B6B;line-height:1.7;margin:0 0 24px;">
      <strong style="color:#1A1A1A;">${data.homeowner_name}</strong> just signed and approved their proposal. The contract is now active.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F7F4;border:1px solid #C8D9C8;border-radius:16px;">
      <tr><td style="padding:24px 28px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <p style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#4A7A4A;margin:0 0 4px;">Contract Value</p>
              <p style="font-size:28px;font-weight:700;color:#1A1A1A;margin:0;letter-spacing:-0.5px;">$${formatMoney(data.amount)}</p>
            </td>
            <td align="right" valign="top">
              <p style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#4A7A4A;margin:0 0 4px;">Deposit Due</p>
              <p style="font-size:20px;font-weight:700;color:#1A1A1A;margin:0;letter-spacing:-0.3px;">$${formatMoney(data.deposit_amount)}</p>
            </td>
          </tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;border-top:1px solid #C8D9C8;padding-top:12px;">
          <tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;"><strong style="color:#1A1A1A;">Client:</strong> ${data.homeowner_name}</td></tr>
          ${data.project_title ? `<tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;"><strong style="color:#1A1A1A;">Project:</strong> ${data.project_title}</td></tr>` : ""}
          <tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;"><strong style="color:#1A1A1A;">Address:</strong> ${data.job_address}</td></tr>
          <tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;"><strong style="color:#1A1A1A;">Signed:</strong> ${signedDate}</td></tr>
          <tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;"><strong style="color:#1A1A1A;">Signature:</strong> ${data.signature_name}</td></tr>
          <tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;"><strong style="color:#1A1A1A;">Items:</strong> ${data.items.length} line items</td></tr>
        </table>
      </td></tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr><td align="center">
        <a href="${data.portal_url}" style="display:inline-block;background-color:#1A1A1A;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:12px;">
          Open Project Workspace
        </a>
      </td></tr>
    </table>

  </td></tr>
  <tr><td style="padding:28px 32px;border-top:1px solid #E8E4DF;">
    <p style="font-size:11px;color:#C0BAB4;margin:0;text-align:center;">WDO Custom &middot; Automated Notification</p>
  </td></tr>
</table>

</body>
</html>`;
}

// ─── New Message Notification (to homeowner) ───

export function buildMessageNotificationHtml(data: ContractorMessageNotificationData): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#FBFBFA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1A1A1A;-webkit-font-smoothing:antialiased;">

<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1A1A1A;">
  <tr><td style="padding:24px 32px;">
    <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">WDO Custom</span>
  </td></tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
  <tr><td style="padding:36px 32px 0;">

    <p style="font-size:16px;font-weight:600;color:#1A1A1A;margin:0 0 8px;">Hi ${data.homeowner_name.split(" ")[0]},</p>
    <p style="font-size:14px;color:#6B6B6B;line-height:1.7;margin:0 0 24px;">
      Skyler from WDO Custom sent you a message about your ${data.project_title || data.job_address} project:
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F3F0;border-left:3px solid #1A1A1A;border-radius:0 12px 12px 0;">
      <tr><td style="padding:16px 20px;">
        <p style="font-size:14px;color:#1A1A1A;line-height:1.6;margin:0;font-style:italic;">"${data.message_preview}"</p>
      </td></tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
      <tr><td align="center">
        <a href="${data.portal_url}" style="display:inline-block;background-color:#1A1A1A;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:12px;letter-spacing:0.2px;">
          View & Reply
        </a>
      </td></tr>
    </table>

    <p style="font-size:12px;color:#9C9590;margin:0;">Skyler Camacho &middot; WDO Custom &middot; 402-819-8558</p>

  </td></tr>
  <tr><td style="padding:28px 32px;border-top:1px solid #E8E4DF;">
    <p style="font-size:11px;color:#C0BAB4;margin:0;text-align:center;line-height:1.6;">
      WDO Custom &middot; General Contractor &middot; LIC-1901422 &middot; Omaha, NE
    </p>
  </td></tr>
</table>

</body>
</html>`;
}

// ─── New Message Notification (homeowner → Skyler) ───

interface HomeownerMessageNotificationData {
  homeowner_name: string;
  project_title?: string;
  job_address: string;
  portal_url: string;
  message_preview: string;
}

export function buildHomeownerMessageNotificationHtml(data: HomeownerMessageNotificationData): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#FBFBFA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1A1A1A;-webkit-font-smoothing:antialiased;">

<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1A1A1A;">
  <tr><td style="padding:24px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td><span style="color:#ffffff;font-size:18px;font-weight:700;">WDO Custom</span></td>
        <td align="right"><span style="display:inline-block;background-color:#C4A265;color:#ffffff;font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;padding:5px 14px;border-radius:20px;">New Message</span></td>
      </tr>
    </table>
  </td></tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
  <tr><td style="padding:36px 32px 0;">

    <p style="font-size:16px;font-weight:600;color:#1A1A1A;margin:0 0 8px;">Skyler,</p>
    <p style="font-size:14px;color:#6B6B6B;line-height:1.7;margin:0 0 24px;">
      <strong style="color:#1A1A1A;">${data.homeowner_name}</strong> sent a message about their <strong style="color:#1A1A1A;">${data.project_title || data.job_address}</strong> project:
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F3F0;border-left:3px solid #C4A265;border-radius:0 12px 12px 0;">
      <tr><td style="padding:16px 20px;">
        <p style="font-size:14px;color:#1A1A1A;line-height:1.6;margin:0;font-style:italic;">"${data.message_preview}"</p>
      </td></tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
      <tr><td align="center">
        <a href="${data.portal_url}" style="display:inline-block;background-color:#1A1A1A;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:12px;letter-spacing:0.2px;">
          Open Project Workspace
        </a>
      </td></tr>
    </table>

  </td></tr>
  <tr><td style="padding:28px 32px;border-top:1px solid #E8E4DF;">
    <p style="font-size:11px;color:#C0BAB4;margin:0;text-align:center;">WDO Custom &middot; Automated Notification</p>
  </td></tr>
</table>

</body>
</html>`;
}

// ─── Payment Received Notification (Stripe → Skyler) ───

interface ContractorPaymentNotificationData {
  homeowner_name: string;
  amount: number;
  payment_label: string;
  project_title?: string;
  job_address: string;
  portal_url: string;
  paid_at: string;
}

export function buildContractorPaymentNotificationHtml(data: ContractorPaymentNotificationData): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#FBFBFA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1A1A1A;-webkit-font-smoothing:antialiased;">

<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1A1A1A;">
  <tr><td style="padding:24px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td><span style="color:#ffffff;font-size:18px;font-weight:700;">WDO Custom</span></td>
        <td align="right"><span style="display:inline-block;background-color:#4A7A4A;color:#ffffff;font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;padding:5px 14px;border-radius:20px;">Payment Received</span></td>
      </tr>
    </table>
  </td></tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
  <tr><td style="padding:36px 32px 0;">

    <p style="font-size:16px;font-weight:600;color:#1A1A1A;margin:0 0 8px;">Skyler,</p>
    <p style="font-size:14px;color:#6B6B6B;line-height:1.7;margin:0 0 24px;">
      <strong style="color:#1A1A1A;">${data.homeowner_name}</strong> just submitted a payment. Here are the details:
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F7F4;border:1px solid #C8D9C8;border-radius:16px;">
      <tr><td style="padding:24px 28px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <p style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#4A7A4A;margin:0 0 4px;">Amount Received</p>
              <p style="font-size:28px;font-weight:700;color:#1A1A1A;margin:0;letter-spacing:-0.5px;">$${formatMoney(data.amount)}</p>
            </td>
            <td align="right" valign="top">
              <span style="display:inline-block;background-color:#4A7A4A;color:#ffffff;font-size:10px;font-weight:700;padding:5px 12px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px;">Paid</span>
            </td>
          </tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;border-top:1px solid #C8D9C8;padding-top:12px;">
          <tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;"><strong style="color:#1A1A1A;">Client:</strong> ${data.homeowner_name}</td></tr>
          <tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;"><strong style="color:#1A1A1A;">For:</strong> ${data.payment_label}</td></tr>
          <tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;"><strong style="color:#1A1A1A;">Project:</strong> ${data.project_title || data.job_address}</td></tr>
          <tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;"><strong style="color:#1A1A1A;">Date:</strong> ${new Date(data.paid_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</td></tr>
        </table>
      </td></tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
      <tr><td align="center">
        <a href="${data.portal_url}" style="display:inline-block;background-color:#1A1A1A;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:12px;letter-spacing:0.2px;">
          Open Project Workspace
        </a>
      </td></tr>
    </table>

  </td></tr>
  <tr><td style="padding:28px 32px;border-top:1px solid #E8E4DF;">
    <p style="font-size:11px;color:#C0BAB4;margin:0;text-align:center;">WDO Custom &middot; Automated Notification</p>
  </td></tr>
</table>

</body>
</html>`;
}

// ─── Lead Notification (estimate page → Skyler) ───

interface LeadNotificationData {
  name: string;
  email: string;
  phone: string;
  projectType: string;
  scopeLevel: string;
  size: string;
  zip: string;
  description: string;
  estimateLow: string;
  estimateHigh: string;
  timeline: string;
}

export function buildLeadNotificationHtml(data: LeadNotificationData): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#FBFBFA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1A1A1A;-webkit-font-smoothing:antialiased;">

<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1A1A1A;">
  <tr><td style="padding:24px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td><span style="color:#ffffff;font-size:18px;font-weight:700;">WDO Custom</span></td>
        <td align="right"><span style="display:inline-block;background-color:#C4A265;color:#ffffff;font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;padding:5px 14px;border-radius:20px;">New Lead</span></td>
      </tr>
    </table>
  </td></tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
  <tr><td style="padding:36px 32px 0;">

    <p style="font-size:16px;font-weight:600;color:#1A1A1A;margin:0 0 8px;">Skyler,</p>
    <p style="font-size:14px;color:#6B6B6B;line-height:1.7;margin:0 0 24px;">
      Someone just used the instant estimate tool and wants you to follow up.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F7F4;border:1px solid #C8D9C8;border-radius:16px;">
      <tr><td style="padding:24px 28px;">
        <p style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#4A7A4A;margin:0 0 12px;">Contact Info</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:3px 0;font-size:14px;color:#1A1A1A;"><strong>Name:</strong> ${data.name || "Not provided"}</td></tr>
          <tr><td style="padding:3px 0;font-size:14px;color:#1A1A1A;"><strong>Email:</strong> ${data.email || "Not provided"}</td></tr>
          <tr><td style="padding:3px 0;font-size:14px;color:#1A1A1A;"><strong>Phone:</strong> ${data.phone || "Not provided"}</td></tr>
        </table>
      </td></tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;background-color:#ffffff;border:1px solid #E8E4DF;border-radius:12px;">
      <tr><td style="padding:20px 24px;">
        <p style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:#9C9590;margin:0 0 12px;">Project Details</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;"><strong style="color:#1A1A1A;">Type:</strong> ${data.projectType}</td></tr>
          <tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;"><strong style="color:#1A1A1A;">Finish Level:</strong> ${data.scopeLevel}</td></tr>
          ${data.size ? `<tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;"><strong style="color:#1A1A1A;">Size:</strong> ${data.size} sq ft</td></tr>` : ""}
          ${data.zip ? `<tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;"><strong style="color:#1A1A1A;">ZIP:</strong> ${data.zip}</td></tr>` : ""}
          <tr><td style="padding:8px 0 0;font-size:13px;color:#6B6B6B;"><strong style="color:#1A1A1A;">Description:</strong></td></tr>
          <tr><td style="padding:4px 0;font-size:13px;color:#6B6B6B;line-height:1.6;font-style:italic;">"${data.description}"</td></tr>
        </table>
      </td></tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;background-color:#FFF9F0;border:1px solid #E8D5B7;border-radius:12px;">
      <tr><td style="padding:20px 24px;">
        <p style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:#8B6914;margin:0 0 8px;">AI Estimate Given</p>
        <p style="font-size:22px;font-weight:700;color:#1A1A1A;margin:0;letter-spacing:-0.3px;">$${data.estimateLow} — $${data.estimateHigh}</p>
        ${data.timeline ? `<p style="font-size:12px;color:#9C9590;margin:6px 0 0;">Timeline: ${data.timeline}</p>` : ""}
      </td></tr>
    </table>

    <p style="font-size:12px;color:#9C9590;margin:28px 0 0;">This lead came from wdocustom.com/estimate</p>

  </td></tr>
  <tr><td style="padding:28px 32px;border-top:1px solid #E8E4DF;">
    <p style="font-size:11px;color:#C0BAB4;margin:0;text-align:center;">WDO Custom &middot; Automated Notification</p>
  </td></tr>
</table>

</body>
</html>`;
}

// ─── Consultation Confirmation (to homeowner) ───

interface ConsultationConfirmationData {
  name: string;
  date: string;
  time: string;
  address: string;
  projectType: string;
  phone: string;
}

export function buildConsultationConfirmationHtml(data: ConsultationConfirmationData): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#FBFBFA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1A1A1A;-webkit-font-smoothing:antialiased;">

<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1A1A1A;">
  <tr><td style="padding:28px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">WDO Custom</span>
          <br>
          <span style="color:#9C9590;font-size:12px;font-weight:500;">General Contractor &middot; Omaha, NE</span>
        </td>
        <td align="right">
          <span style="display:inline-block;background-color:#4A7A4A;color:#ffffff;font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;padding:5px 14px;border-radius:20px;">Confirmed</span>
        </td>
      </tr>
    </table>
  </td></tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
  <tr><td style="padding:36px 32px 0;">

    <p style="font-size:16px;font-weight:600;color:#1A1A1A;margin:0 0 8px;">Hi ${data.name.split(" ")[0]},</p>
    <p style="font-size:14px;color:#6B6B6B;line-height:1.7;margin:0 0 28px;">
      Great news — your free in-home consultation with Skyler is confirmed! We're looking forward to meeting you and learning more about your project.
    </p>

    <!-- Appointment Card -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F7F4;border:1px solid #C8D9C8;border-radius:16px;overflow:hidden;">
      <tr><td style="padding:24px 28px;">
        <p style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#4A7A4A;margin:0 0 16px;">Your Consultation</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="50%">
              <p style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:#9C9590;margin:0 0 4px;">Date</p>
              <p style="font-size:16px;font-weight:700;color:#1A1A1A;margin:0;">${data.date}</p>
            </td>
            <td width="50%">
              <p style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:#9C9590;margin:0 0 4px;">Time</p>
              <p style="font-size:16px;font-weight:700;color:#1A1A1A;margin:0;">${data.time}</p>
            </td>
          </tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;border-top:1px solid #C8D9C8;padding-top:12px;">
          <tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;"><strong style="color:#1A1A1A;">Location:</strong> ${data.address}</td></tr>
          ${data.projectType ? `<tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;"><strong style="color:#1A1A1A;">Project:</strong> ${data.projectType}</td></tr>` : ""}
          <tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;"><strong style="color:#1A1A1A;">Duration:</strong> About 30–45 minutes</td></tr>
        </table>
      </td></tr>
    </table>

    <!-- Calendar Note -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;background-color:#EEF2FF;border:1px solid #C7D2FE;border-radius:12px;">
      <tr><td style="padding:16px 20px;">
        <p style="font-size:12px;color:#4338CA;margin:0;line-height:1.6;">
          <strong>Calendar invite attached.</strong> Open the .ics file attached to this email to add this appointment to Google Calendar, Apple Calendar, or Outlook.
        </p>
      </td></tr>
    </table>

    <!-- What to Expect -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;background-color:#F5F3F0;border-radius:12px;">
      <tr><td style="padding:20px 24px;">
        <p style="font-size:12px;font-weight:600;color:#1A1A1A;margin:0 0 12px;">Here&rsquo;s what to expect:</p>
        <table cellpadding="0" cellspacing="0">
          <tr><td style="padding:4px 0;font-size:13px;color:#6B6B6B;line-height:1.6;">
            <span style="color:#C4A265;font-weight:700;margin-right:8px;">1.</span> Skyler arrives at your home at the scheduled time
          </td></tr>
          <tr><td style="padding:4px 0;font-size:13px;color:#6B6B6B;line-height:1.6;">
            <span style="color:#C4A265;font-weight:700;margin-right:8px;">2.</span> We walk through the space together to understand your vision
          </td></tr>
          <tr><td style="padding:4px 0;font-size:13px;color:#6B6B6B;line-height:1.6;">
            <span style="color:#C4A265;font-weight:700;margin-right:8px;">3.</span> We take measurements and discuss options, materials, and timeline
          </td></tr>
          <tr><td style="padding:4px 0;font-size:13px;color:#6B6B6B;line-height:1.6;">
            <span style="color:#C4A265;font-weight:700;margin-right:8px;">4.</span> You&rsquo;ll receive a detailed, line-itemized proposal within 48 hours
          </td></tr>
          <tr><td style="padding:4px 0;font-size:13px;color:#6B6B6B;line-height:1.6;">
            <span style="color:#C4A265;font-weight:700;margin-right:8px;">5.</span> Review everything at your pace in your own digital project portal
          </td></tr>
        </table>
      </td></tr>
    </table>

    <!-- Reschedule Note -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;background-color:#FFF9F0;border:1px solid #E8D5B7;border-radius:12px;">
      <tr><td style="padding:16px 20px;">
        <p style="font-size:12px;color:#8B6914;margin:0;line-height:1.6;">
          <strong>Need to reschedule?</strong> No problem — just call or text Skyler at <strong>(402) 819-8558</strong> or reply to this email. We&rsquo;re flexible.
        </p>
      </td></tr>
    </table>

    <p style="font-size:14px;color:#6B6B6B;line-height:1.7;margin:28px 0 6px;">
      We genuinely appreciate the opportunity to earn your trust and your business. See you soon!
    </p>

    <p style="font-size:14px;color:#1A1A1A;font-weight:600;margin:24px 0 4px;">Skyler Camacho</p>
    <p style="font-size:12px;color:#9C9590;margin:0;">WDO Custom &middot; 402-819-8558 &middot; skyler@wdocustom.com</p>

  </td></tr>
  <tr><td style="padding:28px 32px;border-top:1px solid #E8E4DF;margin-top:24px;">
    <p style="font-size:11px;color:#C0BAB4;margin:0;text-align:center;line-height:1.6;">
      WDO Custom &middot; General Contractor &middot; LIC-1901422 &middot; Omaha, NE
    </p>
  </td></tr>
</table>

</body>
</html>`;
}

// ─── Consultation Notification (to Skyler) ───

interface ConsultationNotificationData {
  name: string;
  email: string;
  phone: string;
  address: string;
  projectType: string;
  notes: string;
  date: string;
  time: string;
}

export function buildConsultationNotificationHtml(data: ConsultationNotificationData): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#FBFBFA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1A1A1A;-webkit-font-smoothing:antialiased;">

<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1A1A1A;">
  <tr><td style="padding:24px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td><span style="color:#ffffff;font-size:18px;font-weight:700;">WDO Custom</span></td>
        <td align="right"><span style="display:inline-block;background-color:#C4A265;color:#ffffff;font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;padding:5px 14px;border-radius:20px;">New Booking</span></td>
      </tr>
    </table>
  </td></tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
  <tr><td style="padding:36px 32px 0;">

    <p style="font-size:16px;font-weight:600;color:#1A1A1A;margin:0 0 8px;">Skyler,</p>
    <p style="font-size:14px;color:#6B6B6B;line-height:1.7;margin:0 0 24px;">
      <strong style="color:#1A1A1A;">${data.name}</strong> just booked a free in-home consultation.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFF9F0;border:1px solid #E8D5B7;border-radius:16px;">
      <tr><td style="padding:24px 28px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="50%">
              <p style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:#8B6914;margin:0 0 4px;">Date</p>
              <p style="font-size:16px;font-weight:700;color:#1A1A1A;margin:0;">${data.date}</p>
            </td>
            <td width="50%">
              <p style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:#8B6914;margin:0 0 4px;">Time</p>
              <p style="font-size:16px;font-weight:700;color:#1A1A1A;margin:0;">${data.time}</p>
            </td>
          </tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;border-top:1px solid #E8D5B7;padding-top:12px;">
          <tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;"><strong style="color:#1A1A1A;">Client:</strong> ${data.name}</td></tr>
          <tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;"><strong style="color:#1A1A1A;">Phone:</strong> <a href="tel:${data.phone}" style="color:#1A1A1A;text-decoration:underline;">${data.phone}</a></td></tr>
          <tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;"><strong style="color:#1A1A1A;">Email:</strong> <a href="mailto:${data.email}" style="color:#1A1A1A;text-decoration:underline;">${data.email}</a></td></tr>
          <tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;"><strong style="color:#1A1A1A;">Address:</strong> ${data.address}</td></tr>
          ${data.projectType ? `<tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;"><strong style="color:#1A1A1A;">Project:</strong> ${data.projectType}</td></tr>` : ""}
          ${data.notes ? `<tr><td style="padding:8px 0 0;font-size:13px;color:#6B6B6B;"><strong style="color:#1A1A1A;">Notes:</strong> ${data.notes}</td></tr>` : ""}
        </table>
      </td></tr>
    </table>

    <p style="font-size:12px;color:#9C9590;margin:28px 0 0;">Calendar invite attached &middot; wdocustom.com/consultation</p>

  </td></tr>
  <tr><td style="padding:28px 32px;border-top:1px solid #E8E4DF;">
    <p style="font-size:11px;color:#C0BAB4;margin:0;text-align:center;">WDO Custom &middot; Automated Notification</p>
  </td></tr>
</table>

</body>
</html>`;
}

// ─── Estimate Confirmation Email (to homeowner) ───

interface EstimateConfirmationData {
  name: string;
  projectType: string;
  estimateLow: string;
  estimateHigh: string;
  timeline: string;
  consultationUrl: string;
}

export function buildEstimateConfirmationHtml(data: EstimateConfirmationData): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#FBFBFA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1A1A1A;-webkit-font-smoothing:antialiased;">

<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1A1A1A;">
  <tr><td style="padding:28px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">WDO Custom</span>
          <br>
          <span style="color:#9C9590;font-size:12px;font-weight:500;">General Contractor &middot; Omaha, NE</span>
        </td>
        <td align="right">
          <span style="display:inline-block;background-color:#C4A265;color:#ffffff;font-size:10px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;padding:5px 14px;border-radius:20px;">Your Estimate</span>
        </td>
      </tr>
    </table>
  </td></tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
  <tr><td style="padding:36px 32px 0;">

    <p style="font-size:16px;font-weight:600;color:#1A1A1A;margin:0 0 8px;">Hi ${data.name.split(" ")[0]},</p>
    <p style="font-size:14px;color:#6B6B6B;line-height:1.7;margin:0 0 28px;">
      Thanks for using our instant estimate tool! Here&rsquo;s a summary of your ballpark estimate. These numbers are based on current Omaha-area market rates and give you a solid starting point for budgeting.
    </p>

    <!-- Estimate Summary Card -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFF9F0;border:1px solid #E8D5B7;border-radius:16px;overflow:hidden;">
      <tr><td style="padding:24px 28px;text-align:center;">
        <p style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#8B6914;margin:0 0 4px;">${data.projectType}</p>
        <p style="font-size:32px;font-weight:700;color:#1A1A1A;margin:0;letter-spacing:-0.5px;">$${data.estimateLow} &mdash; $${data.estimateHigh}</p>
        ${data.timeline ? `<p style="font-size:12px;color:#9C9590;margin:8px 0 0;">Estimated timeline: ${data.timeline}</p>` : ""}
      </td></tr>
    </table>

    <!-- Next Steps -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;background-color:#F5F3F0;border-radius:12px;">
      <tr><td style="padding:20px 24px;">
        <p style="font-size:12px;font-weight:600;color:#1A1A1A;margin:0 0 12px;">Your next steps:</p>
        <table cellpadding="0" cellspacing="0">
          <tr><td style="padding:5px 0;font-size:13px;color:#6B6B6B;line-height:1.6;">
            <span style="display:inline-block;width:22px;height:22px;background-color:#C4A265;color:#ffffff;font-size:10px;font-weight:700;text-align:center;line-height:22px;border-radius:50%;margin-right:10px;">1</span>
            <strong style="color:#1A1A1A;">Schedule your free consultation</strong> &mdash; Skyler comes to your home, no obligation
          </td></tr>
          <tr><td style="padding:5px 0;font-size:13px;color:#6B6B6B;line-height:1.6;">
            <span style="display:inline-block;width:22px;height:22px;background-color:#C4A265;color:#ffffff;font-size:10px;font-weight:700;text-align:center;line-height:22px;border-radius:50%;margin-right:10px;">2</span>
            We measure, discuss your vision, and walk through options together
          </td></tr>
          <tr><td style="padding:5px 0;font-size:13px;color:#6B6B6B;line-height:1.6;">
            <span style="display:inline-block;width:22px;height:22px;background-color:#C4A265;color:#ffffff;font-size:10px;font-weight:700;text-align:center;line-height:22px;border-radius:50%;margin-right:10px;">3</span>
            Receive a <strong style="color:#1A1A1A;">detailed, line-itemized proposal</strong> within 48 hours
          </td></tr>
          <tr><td style="padding:5px 0;font-size:13px;color:#6B6B6B;line-height:1.6;">
            <span style="display:inline-block;width:22px;height:22px;background-color:#C4A265;color:#ffffff;font-size:10px;font-weight:700;text-align:center;line-height:22px;border-radius:50%;margin-right:10px;">4</span>
            Review everything in your own <strong style="color:#1A1A1A;">digital project portal</strong> &mdash; adjust scope, ask questions, approve when ready
          </td></tr>
        </table>
      </td></tr>
    </table>

    <!-- CTA: Schedule -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
      <tr><td align="center">
        <a href="${data.consultationUrl}" style="display:inline-block;background-color:#1A1A1A;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:16px 48px;border-radius:12px;letter-spacing:0.2px;">
          Schedule Free Consultation
        </a>
      </td></tr>
      <tr><td align="center" style="padding-top:12px;">
        <p style="font-size:11px;color:#9C9590;margin:0;">Or call/text Skyler directly: <a href="tel:+14028198558" style="color:#1A1A1A;font-weight:600;text-decoration:underline;">(402) 819-8558</a></p>
      </td></tr>
    </table>

    <!-- Why WDO -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border:1px solid #E8E4DF;border-radius:12px;margin-bottom:24px;">
      <tr><td style="padding:20px 24px;">
        <p style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;color:#C4A265;margin:0 0 12px;">Why homeowners choose WDO Custom</p>
        <table cellpadding="0" cellspacing="0">
          <tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;line-height:1.6;">
            <span style="color:#C4A265;font-weight:700;margin-right:8px;">&bull;</span> Transparent, line-itemized pricing &mdash; no mystery bids
          </td></tr>
          <tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;line-height:1.6;">
            <span style="color:#C4A265;font-weight:700;margin-right:8px;">&bull;</span> Your own digital project portal with photos, messages &amp; payments
          </td></tr>
          <tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;line-height:1.6;">
            <span style="color:#C4A265;font-weight:700;margin-right:8px;">&bull;</span> One contractor, one point of contact from start to finish
          </td></tr>
          <tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;line-height:1.6;">
            <span style="color:#C4A265;font-weight:700;margin-right:8px;">&bull;</span> 1-year workmanship warranty on every project
          </td></tr>
          <tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;line-height:1.6;">
            <span style="color:#C4A265;font-weight:700;margin-right:8px;">&bull;</span> Licensed &amp; insured &mdash; NE #LIC-1901422
          </td></tr>
        </table>
      </td></tr>
    </table>

    <p style="font-size:14px;color:#6B6B6B;line-height:1.7;margin:0 0 6px;">
      This ballpark gets you started &mdash; a free on-site walkthrough gets you exact numbers. We&rsquo;d love the opportunity to earn your trust.
    </p>

    <p style="font-size:14px;color:#1A1A1A;font-weight:600;margin:24px 0 4px;">Skyler Camacho</p>
    <p style="font-size:12px;color:#9C9590;margin:0;">WDO Custom &middot; 402-819-8558 &middot; skyler@wdocustom.com</p>

  </td></tr>
  <tr><td style="padding:28px 32px;border-top:1px solid #E8E4DF;">
    <p style="font-size:11px;color:#C0BAB4;margin:0;text-align:center;line-height:1.6;">
      WDO Custom &middot; General Contractor &middot; LIC-1901422 &middot; Omaha, NE
    </p>
  </td></tr>
</table>

</body>
</html>`;
}

// ─── Estimate Follow-Up Reminder (to homeowner) ───

interface EstimateReminderData {
  name: string;
  projectType: string;
  estimateLow: string;
  estimateHigh: string;
  estimateUrl: string;
  consultationUrl: string;
}

export function buildEstimateReminderHtml(data: EstimateReminderData): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#FBFBFA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1A1A1A;-webkit-font-smoothing:antialiased;">

<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1A1A1A;">
  <tr><td style="padding:28px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">WDO Custom</span>
          <br>
          <span style="color:#9C9590;font-size:12px;font-weight:500;">General Contractor &middot; Omaha, NE</span>
        </td>
      </tr>
    </table>
  </td></tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
  <tr><td style="padding:36px 32px 0;">

    <p style="font-size:16px;font-weight:600;color:#1A1A1A;margin:0 0 8px;">Hi ${data.name.split(" ")[0]},</p>
    <p style="font-size:14px;color:#6B6B6B;line-height:1.7;margin:0 0 24px;">
      Just checking in &mdash; you recently got a ballpark estimate for your <strong style="color:#1A1A1A;">${data.projectType.toLowerCase()}</strong> project, and we&rsquo;d love to help you take the next step.
    </p>

    <!-- Estimate Recap Card -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFF9F0;border:1px solid #E8D5B7;border-radius:16px;overflow:hidden;">
      <tr><td style="padding:20px 24px;text-align:center;">
        <p style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#8B6914;margin:0 0 4px;">Your Estimate</p>
        <p style="font-size:26px;font-weight:700;color:#1A1A1A;margin:0;">$${data.estimateLow} &mdash; $${data.estimateHigh}</p>
        <p style="font-size:12px;color:#9C9590;margin:6px 0 0;">${data.projectType}</p>
      </td></tr>
    </table>

    <!-- Urgency Note -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;background-color:#FEF3C7;border:1px solid #FCD34D;border-radius:12px;">
      <tr><td style="padding:16px 20px;">
        <p style="font-size:12px;color:#92400E;margin:0;line-height:1.6;">
          <strong>Our schedule fills up quickly</strong> &mdash; especially heading into the busy season. Locking in a consultation now ensures we can hold a spot for your project and protect today&rsquo;s pricing.
        </p>
      </td></tr>
    </table>

    <!-- Steps -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;background-color:#F5F3F0;border-radius:12px;">
      <tr><td style="padding:20px 24px;">
        <p style="font-size:12px;font-weight:600;color:#1A1A1A;margin:0 0 12px;">Here&rsquo;s how it works:</p>
        <table cellpadding="0" cellspacing="0">
          <tr><td style="padding:4px 0;font-size:13px;color:#6B6B6B;line-height:1.6;">
            <span style="display:inline-block;width:20px;height:20px;background-color:#C4A265;color:#ffffff;font-size:10px;font-weight:700;text-align:center;line-height:20px;border-radius:50%;margin-right:10px;">1</span>
            <strong style="color:#1A1A1A;">Pick a day &amp; time</strong> that works for you (takes 30 seconds)
          </td></tr>
          <tr><td style="padding:4px 0;font-size:13px;color:#6B6B6B;line-height:1.6;">
            <span style="display:inline-block;width:20px;height:20px;background-color:#C4A265;color:#ffffff;font-size:10px;font-weight:700;text-align:center;line-height:20px;border-radius:50%;margin-right:10px;">2</span>
            Skyler visits your home &mdash; <strong style="color:#1A1A1A;">free, no obligation</strong>
          </td></tr>
          <tr><td style="padding:4px 0;font-size:13px;color:#6B6B6B;line-height:1.6;">
            <span style="display:inline-block;width:20px;height:20px;background-color:#C4A265;color:#ffffff;font-size:10px;font-weight:700;text-align:center;line-height:20px;border-radius:50%;margin-right:10px;">3</span>
            Receive a <strong style="color:#1A1A1A;">detailed, line-itemized proposal</strong> within 48 hours
          </td></tr>
        </table>
      </td></tr>
    </table>

    <!-- CTA -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
      <tr><td align="center">
        <a href="${data.consultationUrl}" style="display:inline-block;background-color:#1A1A1A;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:16px 48px;border-radius:12px;letter-spacing:0.2px;">
          Schedule Free Consultation
        </a>
      </td></tr>
      <tr><td align="center" style="padding-top:12px;">
        <a href="${data.estimateUrl}" style="font-size:11px;color:#9C9590;text-decoration:underline;">View your full estimate</a>
        <span style="font-size:11px;color:#C0BAB4;margin:0 6px;">&middot;</span>
        <a href="tel:+14028198558" style="font-size:11px;color:#9C9590;text-decoration:underline;">Call (402) 819-8558</a>
      </td></tr>
    </table>

    <p style="font-size:14px;color:#6B6B6B;line-height:1.7;margin:0 0 6px;">
      We&rsquo;d love the opportunity to earn your trust. No pressure, no sales pitch &mdash; just honest advice from a licensed contractor.
    </p>

    <p style="font-size:14px;color:#1A1A1A;font-weight:600;margin:24px 0 4px;">Skyler Camacho</p>
    <p style="font-size:12px;color:#9C9590;margin:0;">WDO Custom &middot; 402-819-8558 &middot; skyler@wdocustom.com</p>

  </td></tr>
  <tr><td style="padding:28px 32px;border-top:1px solid #E8E4DF;">
    <p style="font-size:11px;color:#C0BAB4;margin:0;text-align:center;line-height:1.6;">
      WDO Custom &middot; General Contractor &middot; LIC-1901422 &middot; Omaha, NE
    </p>
  </td></tr>
</table>

</body>
</html>`;
}

// ─── Selection Reminder (manual, from contractor) ───

export function buildSelectionReminderHtml(data: SelectionReminderData): string {
  const projectLabel = data.project_title || data.job_address || "your project";
  const firstName = data.homeowner_name?.split(" ")[0] || "there";

  const categoriesHtml = data.pending_categories.map(cat => {
    const choicesHtml = cat.choices.map(ch => {
      const imageBlock = ch.image_url
        ? `<a href="${ch.product_url || ch.select_url}" style="text-decoration:none;"><img src="${ch.image_url}" alt="${ch.label}" style="width:100%;max-width:220px;height:130px;object-fit:cover;border-radius:12px;border:1px solid #E8E4DF;display:block;margin-bottom:8px;" /></a>`
        : '';
      const productLink = ch.product_url
        ? `<p style="margin:2px 0 0;"><a href="${ch.product_url}" style="font-size:11px;color:#C4A265;text-decoration:underline;font-weight:600;">View Product Details</a></p>`
        : '';
      return `
      <table cellpadding="0" cellspacing="0" style="display:inline-table;vertical-align:top;width:220px;margin:0 12px 16px 0;">
        <tr><td>
          ${imageBlock}
          <p style="font-size:13px;font-weight:700;color:#1A1A1A;margin:0 0 4px;">${ch.label}</p>
          ${productLink}
          <a href="${ch.select_url}" style="display:inline-block;margin-top:6px;background-color:#1A1A1A;color:#ffffff;font-size:11px;font-weight:700;text-decoration:none;padding:10px 24px;border-radius:10px;letter-spacing:0.3px;text-transform:uppercase;">
            Select This
          </a>
        </td></tr>
      </table>`;
    }).join('');

    return `
    <tr><td style="padding:0 32px 28px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F3F0;border:1px solid #E8E4DF;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:16px 20px 8px;">
          <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#C4A265;margin:0 0 2px;">Awaiting Your Selection</p>
          <p style="font-size:16px;font-weight:700;color:#1A1A1A;margin:0;">${cat.category}</p>
        </td></tr>
        <tr><td style="padding:12px 20px 20px;">
          ${choicesHtml}
        </td></tr>
      </table>
    </td></tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#FBFBFA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1A1A1A;-webkit-font-smoothing:antialiased;">

<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1A1A1A;">
  <tr><td style="padding:24px 32px;">
    <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">WDO Custom</span>
  </td></tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
  <tr><td style="padding:36px 32px 0;">

    <p style="font-size:16px;font-weight:600;color:#1A1A1A;margin:0 0 8px;">Hi ${firstName},</p>
    <p style="font-size:14px;color:#6B6B6B;line-height:1.7;margin:0 0 8px;">
      We have material selections ready for your review on <strong style="color:#1A1A1A;">${projectLabel}</strong>. You can choose directly from this email — just tap <strong>"Select This"</strong> on the option you'd like.
    </p>
    <p style="font-size:13px;color:#9C9590;line-height:1.6;margin:0 0 28px;">
      ${data.pending_categories.length} ${data.pending_categories.length === 1 ? 'category needs' : 'categories need'} your selection to keep the project moving forward.
    </p>

  </td></tr>

  ${categoriesHtml}

  <tr><td style="padding:8px 32px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFF9F0;border:1px solid #E8D5B7;border-radius:12px;">
      <tr><td style="padding:16px 20px;text-align:center;">
        <p style="font-size:12px;color:#8B6914;margin:0 0 8px;font-weight:600;">Or view all selections in one place:</p>
        <a href="${data.portal_url}" style="display:inline-block;background-color:#C4A265;color:#ffffff;font-size:12px;font-weight:700;text-decoration:none;padding:10px 28px;border-radius:10px;letter-spacing:0.3px;">
          Open Project Portal
        </a>
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="padding:32px 32px 0;">
    <p style="font-size:14px;color:#1A1A1A;font-weight:600;margin:0 0 4px;">Skyler Camacho</p>
    <p style="font-size:12px;color:#9C9590;margin:0;">WDO Custom &middot; 402-819-8558 &middot; skyler@wdocustom.com</p>
  </td></tr>
  <tr><td style="padding:28px 32px;border-top:1px solid #E8E4DF;">
    <p style="font-size:11px;color:#C0BAB4;margin:0;text-align:center;line-height:1.6;">
      WDO Custom &middot; General Contractor &middot; LIC-1901422 &middot; Omaha, NE
    </p>
  </td></tr>
</table>

</body>
</html>`;
}

// ─── Selection Made Notification (automatic, to contractor) ───

export function buildSelectionMadeNotificationHtml(data: SelectionMadeNotificationData): string {
  const projectLabel = data.project_title || data.job_address || "Project";
  const progress = `${data.total_selected} of ${data.total_categories}`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#FBFBFA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1A1A1A;-webkit-font-smoothing:antialiased;">

<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1A1A1A;">
  <tr><td style="padding:24px 32px;">
    <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">WDO Custom</span>
  </td></tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
  <tr><td style="padding:36px 32px 0;">

    <p style="font-size:16px;font-weight:600;color:#1A1A1A;margin:0 0 12px;">New Selection Made</p>
    <p style="font-size:14px;color:#6B6B6B;line-height:1.7;margin:0 0 24px;">
      <strong style="color:#1A1A1A;">${data.homeowner_name}</strong> just made a material selection for <strong style="color:#1A1A1A;">${projectLabel}</strong>.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F7F4;border:1px solid #C8D9C8;border-radius:16px;overflow:hidden;">
      <tr><td style="padding:20px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <p style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#4A7A4A;margin:0 0 4px;">${data.category}</p>
              <p style="font-size:20px;font-weight:700;color:#1A1A1A;margin:0;letter-spacing:-0.3px;">${data.selected_value}</p>
            </td>
            <td align="right" valign="top">
              <span style="display:inline-block;background-color:#4A7A4A;color:#ffffff;font-size:10px;font-weight:700;padding:5px 12px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px;">Confirmed</span>
            </td>
          </tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;border-top:1px solid #C8D9C8;padding-top:10px;">
          <tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;"><strong style="color:#1A1A1A;">Client:</strong> ${data.homeowner_name}</td></tr>
          <tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;"><strong style="color:#1A1A1A;">Project:</strong> ${projectLabel}</td></tr>
          <tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;"><strong style="color:#1A1A1A;">Selection Progress:</strong> ${progress} categories selected</td></tr>
        </table>
      </td></tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr><td align="center">
        <a href="${data.portal_url}" style="display:inline-block;background-color:#1A1A1A;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:12px;letter-spacing:0.2px;">
          View in Workspace
        </a>
      </td></tr>
    </table>

  </td></tr>
  <tr><td style="padding:28px 32px;border-top:1px solid #E8E4DF;">
    <p style="font-size:11px;color:#C0BAB4;margin:0;text-align:center;line-height:1.6;">
      WDO Custom &middot; General Contractor &middot; LIC-1901422 &middot; Omaha, NE
    </p>
  </td></tr>
</table>

</body>
</html>`;
}

// ─── Payment Reminder (manual, from contractor) ───

export function buildPaymentReminderHtml(data: PaymentReminderData): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#FBFBFA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1A1A1A;-webkit-font-smoothing:antialiased;">

<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1A1A1A;">
  <tr><td style="padding:24px 32px;">
    <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">WDO Custom</span>
  </td></tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
  <tr><td style="padding:36px 32px 0;">

    <p style="font-size:16px;font-weight:600;color:#1A1A1A;margin:0 0 8px;">Hi ${data.homeowner_name.split(" ")[0]},</p>
    <p style="font-size:14px;color:#6B6B6B;line-height:1.7;margin:0 0 24px;">
      Quick reminder — your next draw payment for <strong style="color:#1A1A1A;">${data.project_title || data.job_address}</strong> is ready to be submitted so we can keep your project moving forward.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFF9F0;border:1px solid #E8D5B7;border-radius:16px;overflow:hidden;">
      <tr><td style="padding:24px 28px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <p style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#8B6914;margin:0 0 4px;">Payment Due</p>
              <p style="font-size:28px;font-weight:700;color:#1A1A1A;margin:0;letter-spacing:-0.5px;">$${formatMoney(data.phase_amount)}</p>
            </td>
            <td align="right" valign="top">
              <span style="display:inline-block;background-color:#C4A265;color:#ffffff;font-size:10px;font-weight:700;padding:5px 12px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px;">Due Now</span>
            </td>
          </tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;border-top:1px solid #E8D5B7;padding-top:12px;">
          <tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;"><strong style="color:#1A1A1A;">For:</strong> ${data.phase_name}</td></tr>
          <tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;"><strong style="color:#1A1A1A;">Project:</strong> ${data.project_title || data.job_address}</td></tr>
          <tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;"><strong style="color:#1A1A1A;">Remaining Balance:</strong> $${formatMoney(data.total_remaining)}</td></tr>
        </table>
      </td></tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
      <tr><td align="center">
        <a href="${data.portal_url}" style="display:inline-block;background-color:#1A1A1A;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:14px 40px;border-radius:12px;letter-spacing:0.2px;">
          Pay Now
        </a>
      </td></tr>
    </table>

    <p style="font-size:14px;color:#6B6B6B;line-height:1.7;margin:0 0 6px;">
      You can pay securely online through your project portal — card and ACH bank transfer are both accepted. If you have any questions, don't hesitate to reach out.
    </p>

    <p style="font-size:14px;color:#1A1A1A;font-weight:600;margin:24px 0 4px;">Skyler Camacho</p>
    <p style="font-size:12px;color:#9C9590;margin:0;">WDO Custom &middot; 402-819-8558 &middot; skyler@wdocustom.com</p>

  </td></tr>
  <tr><td style="padding:28px 32px;border-top:1px solid #E8E4DF;">
    <p style="font-size:11px;color:#C0BAB4;margin:0;text-align:center;line-height:1.6;">
      WDO Custom &middot; General Contractor &middot; LIC-1901422 &middot; Omaha, NE
    </p>
  </td></tr>
</table>

</body>
</html>`;
}

// ─── Deposit Email (first payment, material procurement focus) ───

export function buildDepositEmailHtml(data: DepositEmailData): string {
  const firstName = data.homeowner_name.split(" ")[0];
  const projectLabel = data.project_title || data.job_address;
  const hasSelections = data.pending_selections && data.pending_selections.length > 0;

  const selectionsBlock = hasSelections ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;background-color:#F9F7F4;border:1px solid #E8E4DF;border-radius:12px;">
      <tr><td style="padding:20px 24px;">
        <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#9C9590;margin:0 0 12px;">Selections to Finalize</p>
        ${data.pending_selections!.map(s => `<p style="font-size:13px;color:#1A1A1A;margin:0 0 6px;padding-left:12px;border-left:3px solid #C4A265;">
          ${s}</p>`).join("")}
        <p style="font-size:12px;color:#9C9590;line-height:1.6;margin:12px 0 0;">
          Locking in your selections early helps us avoid delays. You can make your choices directly from your project portal.
        </p>
      </td></tr>
    </table>` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#FBFBFA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1A1A1A;-webkit-font-smoothing:antialiased;">

<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1A1A1A;">
  <tr><td style="padding:24px 32px;">
    <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">WDO Custom</span>
  </td></tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
  <tr><td style="padding:36px 32px 0;">

    <p style="font-size:16px;font-weight:600;color:#1A1A1A;margin:0 0 8px;">Hi ${firstName},</p>

    <p style="font-size:14px;color:#6B6B6B;line-height:1.8;margin:0 0 20px;">
      We're excited to get started on <strong style="color:#1A1A1A;">${projectLabel}</strong> and we look forward to bringing your vision to life. Before we can begin, we need to secure your construction deposit so we can begin the procurement process on your behalf.
    </p>

    <p style="font-size:14px;color:#6B6B6B;line-height:1.8;margin:0 0 20px;">
      Most major materials — cabinetry, countertops, specialty tile, and custom-order items — carry a <strong style="color:#1A1A1A;">6 to 8 week lead time</strong> from the date of order. Your deposit allows us to lock in pricing, reserve production slots, and begin coordinating the materials and trades needed for phase one of your project. The sooner we get rolling, the sooner we can start capturing that unused value in your home.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F7F4;border:1px solid #C8D9C8;border-radius:16px;overflow:hidden;">
      <tr><td style="padding:28px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#4A7A4A;margin:0 0 6px;">Construction Deposit</p>
              <p style="font-size:32px;font-weight:700;color:#1A1A1A;margin:0;letter-spacing:-0.5px;">$` + formatMoney(data.deposit_amount) + `</p>
            </td>
            <td align="right" valign="top">
              <span style="display:inline-block;background-color:#4A7A4A;color:#ffffff;font-size:10px;font-weight:700;padding:6px 14px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px;">Phase 1</span>
            </td>
          </tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;border-top:1px solid #C8D9C8;padding-top:12px;">
          <tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;"><strong style="color:#1A1A1A;">Project:</strong> ${projectLabel}</td></tr>
          <tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;"><strong style="color:#1A1A1A;">Total Contract:</strong> $` + formatMoney(data.total_amount) + `</td></tr>
          <tr><td style="padding:3px 0;font-size:13px;color:#6B6B6B;"><strong style="color:#1A1A1A;">Deposit covers:</strong> Material procurement, scheduling, &amp; project coordination</td></tr>
        </table>
      </td></tr>
    </table>

    ${selectionsBlock}

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
      <tr><td align="center">
        <a href="${data.portal_url}" style="display:inline-block;background-color:#1A1A1A;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:16px 48px;border-radius:12px;letter-spacing:0.2px;">
          View Project &amp; Submit Deposit
        </a>
      </td></tr>
    </table>

    <p style="font-size:14px;color:#6B6B6B;line-height:1.8;margin:0 0 8px;">
      If you have any outstanding selections — flooring, tile, hardware, or other finishes — now is the perfect time to finalize those choices so we can include them in our initial material order and keep your timeline on track.
    </p>

    <p style="font-size:14px;color:#6B6B6B;line-height:1.8;margin:0 0 20px;">
      Payment can be made securely online through your project portal. We accept card and ACH bank transfer. If you have any questions about the process or your project timeline, don't hesitate to reach out — we're here to help.
    </p>

    <p style="font-size:14px;color:#1A1A1A;font-weight:600;margin:24px 0 4px;">Skyler Camacho</p>
    <p style="font-size:12px;color:#9C9590;margin:0;">WDO Custom &middot; 402-819-8558 &middot; skyler@wdocustom.com</p>

  </td></tr>
  <tr><td style="padding:28px 32px;border-top:1px solid #E8E4DF;">
    <p style="font-size:11px;color:#C0BAB4;margin:0;text-align:center;line-height:1.6;">
      WDO Custom &middot; General Contractor &middot; LIC-1901422 &middot; Omaha, NE
    </p>
  </td></tr>
</table>

</body>
</html>`;
}
