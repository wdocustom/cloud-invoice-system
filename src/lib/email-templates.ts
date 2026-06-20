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
