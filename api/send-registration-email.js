import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const {
      recipients = [],
      teamName = 'Participant',
      eventName = 'Technical Event',
      teamId = 'TEC-2026',
      password = 'TEC-PASSWORD',
      eventDate = 'To be announced',
      eventTime = '10:00 AM',
      venue = 'ICEM Campus, Pune',
      loginUrl = 'https://tec-events-platform.vercel.app/login',
      organizerName = 'Technical Committee',
      collegeName = 'Indira College of Engineering and Management (ICEM), Pune',
    } = req.body || {};

    // Collect all valid unique recipient emails
    const rawList = Array.isArray(recipients) ? recipients : [recipients];
    const toEmails = [
      ...new Set(
        rawList
          .map((r) => (typeof r === 'string' ? r : r?.email))
          .filter(Boolean)
          .map((e) => e.trim().toLowerCase())
          .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
      ),
    ];

    if (toEmails.length === 0) {
      return res.status(400).json({ error: 'No valid recipient email addresses provided.' });
    }

    // Prepare Plain Text Body matching the user's exact specification
    const textContent = `Hello ${teamName},

Congratulations! 🎉

Your registration for **${eventName}** has been successfully completed.

### 🎟️ Your Team Credentials

**Team ID:** ${teamId}
**Password:** ${password}

Please keep these credentials safe. You will need them to access your team dashboard and participate in the event.

### 📅 Event Details

**Event:** ${eventName}
**Date:** ${eventDate}
**Time:** ${eventTime}
**Venue:** ${venue}

### 🔐 Team Login

${loginUrl}

You can use your **Team ID and Password** to log in.

If you have any issues with your registration or credentials, please contact the Technical Committee.

All the best, and good luck! 🚀

**${organizerName}**
${collegeName}
Technical Committee
`;

    // Prepare Professional Responsive HTML Body matching the template layout
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Registration Confirmation - ${eventName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #18181b; line-height: 1.6;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f5; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; border: 1px solid #e4e4e7; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #000000; padding: 24px 32px; text-align: left;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <span style="color: #ffffff; font-size: 20px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase;">
                      ⚡ TEC EVENTS PLATFORM
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="font-size: 18px; font-weight: 700; color: #000000; margin: 0 0 12px 0;">
                Hello ${teamName},
              </p>

              <p style="font-size: 16px; color: #15803d; font-weight: 700; margin: 0 0 16px 0;">
                Congratulations! 🎉
              </p>

              <p style="font-size: 15px; color: #3f3f46; margin: 0 0 24px 0;">
                Your registration for <strong style="color: #000000;">${eventName}</strong> has been successfully completed.
              </p>

              <!-- Credentials Card -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fafafa; border: 1px solid #000000; border-radius: 6px; margin: 0 0 24px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <div style="font-size: 15px; font-weight: 800; color: #000000; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.04em;">
                      🎟️ Your Team Credentials
                    </div>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding: 4px 0; font-size: 14px; color: #52525b; width: 110px;">
                          <strong>Team ID:</strong>
                        </td>
                        <td style="padding: 4px 0; font-size: 16px; font-family: monospace; font-weight: 700; color: #000000;">
                          ${teamId}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-size: 14px; color: #52525b;">
                          <strong>Password:</strong>
                        </td>
                        <td style="padding: 4px 0; font-size: 16px; font-family: monospace; font-weight: 700; color: #2563eb;">
                          ${password}
                        </td>
                      </tr>
                    </table>
                    <p style="font-size: 13px; color: #71717a; margin: 12px 0 0 0; font-style: italic;">
                      Please keep these credentials safe. You will need them to access your team dashboard and participate in the event.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Event Details Card -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; margin: 0 0 24px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <div style="font-size: 15px; font-weight: 800; color: #000000; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.04em;">
                      📅 Event Details
                    </div>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding: 4px 0; font-size: 14px; color: #64748b; width: 90px;">
                          <strong>Event:</strong>
                        </td>
                        <td style="padding: 4px 0; font-size: 14px; font-weight: 700; color: #0f172a;">
                          ${eventName}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-size: 14px; color: #64748b;">
                          <strong>Date:</strong>
                        </td>
                        <td style="padding: 4px 0; font-size: 14px; font-weight: 600; color: #0f172a;">
                          ${eventDate}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-size: 14px; color: #64748b;">
                          <strong>Time:</strong>
                        </td>
                        <td style="padding: 4px 0; font-size: 14px; font-weight: 600; color: #0f172a;">
                          ${eventTime}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-size: 14px; color: #64748b;">
                          <strong>Venue:</strong>
                        </td>
                        <td style="padding: 4px 0; font-size: 14px; font-weight: 600; color: #0f172a;">
                          ${venue}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Team Login Section -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fafafa; border: 1px solid #e4e4e7; border-radius: 6px; margin: 0 0 24px 0;">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <div style="font-size: 15px; font-weight: 800; color: #000000; margin-bottom: 12px; text-transform: uppercase;">
                      🔐 Team Login
                    </div>
                    <div style="margin-bottom: 12px;">
                      <a href="${loginUrl}" target="_blank" style="display: inline-block; background-color: #000000; color: #ffffff; text-decoration: none; padding: 12px 28px; font-size: 14px; font-weight: 700; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.05em;">
                        Access Team Dashboard →
                      </a>
                    </div>
                    <div style="font-size: 13px; color: #52525b; margin-bottom: 6px;">
                      Direct Link: <a href="${loginUrl}" target="_blank" style="color: #2563eb; word-break: break-all;">${loginUrl}</a>
                    </div>
                    <p style="font-size: 13px; color: #71717a; margin: 8px 0 0 0;">
                      You can use your <strong>Team ID and Password</strong> to log in.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="font-size: 14px; color: #52525b; margin: 0 0 16px 0;">
                If you have any issues with your registration or credentials, please contact the Technical Committee.
              </p>

              <p style="font-size: 15px; font-weight: 700; color: #000000; margin: 0 0 24px 0;">
                All the best, and good luck! 🚀
              </p>

              <div style="border-top: 1px solid #e4e4e7; padding-top: 16px;">
                <p style="font-size: 14px; font-weight: 800; color: #000000; margin: 0 0 2px 0;">
                  ${organizerName}
                </p>
                <p style="font-size: 13px; color: #71717a; margin: 0 0 2px 0;">
                  ${collegeName}
                </p>
                <p style="font-size: 12px; color: #a1a1aa; margin: 0; text-transform: uppercase; letter-spacing: 0.05em;">
                  Technical Committee
                </p>
              </div>

            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // Setup Nodemailer Transporter
    const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
    const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD;
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
    const smtpSecure = process.env.SMTP_SECURE === 'true' || (!process.env.SMTP_SECURE && smtpPort === 465);
    const smtpFrom = process.env.SMTP_FROM || process.env.EMAIL_FROM || `"${organizerName}" <${smtpUser || 'no-reply@indiraicem.ac.in'}>`;

    let transporter;
    let isTestAccount = false;

    if (smtpUser && smtpPass) {
      transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
    } else {
      // Fallback to Ethereal nodemailer test account so sending always succeeds
      const testAccount = await nodemailer.createTestAccount();
      isTestAccount = true;
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }

    // Send email to all teammates concurrently
    const mailOptions = {
      from: smtpFrom,
      to: toEmails.join(', '),
      subject: `Registration Confirmed: ${eventName} (${teamName})`,
      text: textContent,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);

    const previewUrl = isTestAccount ? nodemailer.getTestMessageUrl(info) : null;

    console.log(`[nodemailer] Sent registration email to: ${toEmails.join(', ')} | ID: ${info.messageId}`);
    if (previewUrl) {
      console.log(`[nodemailer] Preview URL: ${previewUrl}`);
    }

    return res.status(200).json({
      success: true,
      messageId: info.messageId,
      recipients: toEmails,
      isTestAccount,
      previewUrl,
    });
  } catch (error) {
    console.error('[nodemailer] Error sending email:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to send registration email',
    });
  }
}
