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
      action = 'REGISTRATION',
      recipients = [],
      teamName = 'Participant',
      eventName = 'Technical Event',
      teamId = 'TEC-2026',
      password = 'TEC-PASSWORD',
      eventDate = 'To be announced',
      eventTime = '10:00 AM',
      venue = 'ICEM Campus, Pune',
      loginUrl = 'https://tec-events-platform.vercel.app/login',
      resetUrl = '',
      userName = 'Participant',
      role = 'student',
      organizerName = 'Technical Committee',
      collegeName = 'Indira College of Engineering and Management (ICEM), Pune',
      smtpConfig = null,
      isTestEmail = false,
    } = req.body || {};

    // Collect all valid unique recipient emails
    const rawList = Array.isArray(recipients) ? recipients : [recipients];
    const toEmails = [
      ...new Set(
        rawList
          .map((r) => (typeof r === 'string' ? r : r?.email))
          .filter(Boolean)
          .map((e) => e.trim().toLowerCase())
          .filter((e) => typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
      ),
    ];

    if (toEmails.length === 0) {
      return res.status(400).json({ error: 'No valid recipient email addresses provided.' });
    }

    // ─── Resolve SMTP Credentials ──────────────────────────────
    const clientSmtp = smtpConfig || {};
    let smtpUser = (clientSmtp.user || process.env.SMTP_USER || process.env.EMAIL_USER || '').trim();
    let smtpPass = (clientSmtp.pass || process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD || '').trim();
    let smtpHost = (clientSmtp.host || process.env.SMTP_HOST || 'smtp.gmail.com').trim();
    let smtpPort = parseInt(clientSmtp.port || process.env.SMTP_PORT || '465', 10);
    let smtpSecure = clientSmtp.secure !== undefined ? Boolean(clientSmtp.secure) : (smtpPort === 465);

    // Fallback: Query Supabase REST API directly (zero npm packages required, works in Node 18+)
    if (!smtpUser || !smtpPass) {
      try {
        const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://jzantniagqzetbbvohzn.supabase.co';
        const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6YW50bmlhZ3F6ZXRiYnZvaHpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNjMxMDQsImV4cCI6MjEwMjYzOTEwNH0.xNGvYpXWjVxSRXdMqykrx8-ox2TdmoEWd_IoB28O-6g';
        const response = await fetch(`${supabaseUrl}/rest/v1/admins?id=eq.1&select=full_name`, {
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
        });
        if (response.ok) {
          const rows = await response.json();
          if (rows?.[0]?.full_name && rows[0].full_name.startsWith('SMTP:')) {
            const cfg = JSON.parse(rows[0].full_name.slice(5));
            if (cfg.user && cfg.pass) {
              smtpUser = cfg.user.trim();
              smtpPass = cfg.pass.trim();
              if (cfg.host) smtpHost = cfg.host.trim();
              if (cfg.port) smtpPort = parseInt(cfg.port, 10);
              if (cfg.secure !== undefined) smtpSecure = Boolean(cfg.secure);
            }
          }
        }
      } catch (err) {
        console.warn('[nodemailer] Native Supabase lookup note:', err.message);
      }
    }

    let transporter = null;
    let isTestAccount = false;

    if (smtpUser && smtpPass) {
      const cleanPass = smtpPass.replace(/\s+/g, '');
      const isGmail = smtpHost.includes('gmail') || smtpUser.includes('@gmail.com');

      const transportConfig = isGmail
        ? {
            service: 'gmail',
            auth: {
              user: smtpUser,
              pass: cleanPass,
            },
          }
        : {
            host: smtpHost,
            port: smtpPort,
            secure: smtpSecure,
            auth: {
              user: smtpUser,
              pass: cleanPass,
            },
            tls: {
              rejectUnauthorized: false,
            },
          };

      transporter = nodemailer.createTransport(transportConfig);
    } else {
      // Ethereal sandbox test account fallback
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

    const fromAddress = `"${organizerName}" <${smtpUser || 'no-reply@indiraicem.ac.in'}>`;

    let subject = '';
    let textContent = '';
    let htmlContent = '';

    if (action === 'RESET_PASSWORD') {
      subject = `Password Reset Request - ${organizerName}`;
      textContent = `Hello ${userName || 'User'},

You requested a password reset for your ${role === 'admin' ? 'Committee Admin' : 'Student'} account on the ${collegeName} Technical Portal.

Click the link below to set a new password:
${resetUrl}

This link is valid for 1 hour. If you did not request this password reset, please ignore this email. Your password will remain unchanged.

Regards,
${organizerName}
${collegeName}
`;

      htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Password Reset</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#18181b;line-height:1.6;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;background-color:#ffffff;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
          <tr>
            <td style="background-color:#000000;color:#ffffff;padding:24px 28px;">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#a1a1aa;margin-bottom:4px;">
                SECURITY // ACCOUNT RECOVERY
              </div>
              <div style="font-size:20px;font-weight:800;letter-spacing:-0.02em;">
                PASSWORD RESET REQUEST
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <p style="font-size:16px;margin:0 0 16px 0;">Hello <strong>${userName || 'User'}</strong>,</p>
              <p style="font-size:14px;color:#52525b;margin:0 0 24px 0;">
                We received a request to reset the password for your <strong>${role === 'admin' ? 'Committee Admin' : 'Student'} account</strong>. Click the button below to choose a new password:
              </p>
              <div style="text-align:center;margin:32px 0;">
                <a href="${resetUrl}" target="_blank" style="display:inline-block;background-color:#000000;color:#ffffff;text-decoration:none;padding:14px 32px;font-size:14px;font-weight:700;border-radius:6px;text-transform:uppercase;letter-spacing:0.05em;">
                  Reset My Password →
                </a>
              </div>
              <div style="background-color:#fafafa;border:1px solid #e4e4e7;border-radius:6px;padding:16px;margin-bottom:24px;">
                <p style="font-size:12px;color:#71717a;margin:0 0 8px 0;">
                  If the button above does not work, copy and paste this link into your web browser:
                </p>
                <a href="${resetUrl}" target="_blank" style="font-size:12px;color:#2563eb;word-break:break-all;">${resetUrl}</a>
              </div>
              <p style="font-size:13px;color:#71717a;margin:0 0 16px 0;">
                ⚠️ This password reset link is valid for <strong>1 hour</strong>. If you did not make this request, you can safely ignore this email.
              </p>
              <div style="border-top:1px solid #e4e4e7;padding-top:16px;margin-top:24px;">
                <p style="font-size:13px;font-weight:700;color:#000000;margin:0 0 2px 0;">${organizerName}</p>
                <p style="font-size:12px;color:#71717a;margin:0;">${collegeName}</p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
    } else {
      // ─── Registration Confirmation Email ─────────────────────────
      subject = isTestEmail
        ? `[TEST EMAIL] Registration System Test - ${eventName}`
        : `Registration Confirmed: ${eventName} (${teamName})`;

      textContent = `Hello ${teamName},

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

      htmlContent = `<!DOCTYPE html>
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
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 580px; background-color: #ffffff; border: 1px solid #e4e4e7; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #000000; color: #ffffff; padding: 28px 32px; border-bottom: 2px solid #27272a;">
              <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #a1a1aa; margin-bottom: 6px;">
                DEPARTMENT OF INFORMATION TECHNOLOGY
              </div>
              <div style="font-size: 22px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.2;">
                ${eventName}
              </div>
              <div style="font-size: 13px; color: #d4d4d8; margin-top: 4px;">
                Official Registration Confirmation
              </div>
            </td>
          </tr>

          <!-- Main Content Area -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="font-size: 20px; font-weight: 700; color: #000000; margin: 0 0 8px 0;">
                Hello ${teamName},
              </h2>
              <p style="font-size: 15px; color: #15803d; font-weight: 600; margin: 0 0 16px 0;">
                Congratulations! 🎉
              </p>
              <p style="font-size: 15px; color: #3f3f46; margin: 0 0 24px 0;">
                Your registration for <strong>${eventName}</strong> has been successfully completed.
              </p>

              <!-- Credentials Card -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border: 2px solid #000000; border-radius: 6px; margin: 0 0 24px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <div style="font-size: 13px; font-weight: 800; color: #000000; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em;">
                      🎟️ Your Team Credentials
                    </div>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding: 6px 0; font-size: 14px; color: #475569; width: 110px;">
                          <strong>Team ID:</strong>
                        </td>
                        <td style="padding: 6px 0; font-size: 18px; font-weight: 800; font-family: monospace; color: #000000;">
                          ${teamId}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; font-size: 14px; color: #475569;">
                          <strong>Password:</strong>
                        </td>
                        <td style="padding: 6px 0; font-size: 18px; font-weight: 800; font-family: monospace; color: #2563eb;">
                          ${password}
                        </td>
                      </tr>
                    </table>
                    <p style="font-size: 12px; color: #64748b; margin: 12px 0 0 0; border-top: 1px dashed #cbd5e1; padding-top: 8px;">
                      🔒 Please keep these credentials safe. You will need them to access your team dashboard and participate in the event.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Event Details -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fafafa; border: 1px solid #e4e4e7; border-radius: 6px; margin: 0 0 24px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <div style="font-size: 13px; font-weight: 800; color: #000000; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em;">
                      📅 Event Details
                    </div>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding: 4px 0; font-size: 14px; color: #64748b; width: 100px;">
                          <strong>Event:</strong>
                        </td>
                        <td style="padding: 4px 0; font-size: 14px; font-weight: 600; color: #0f172a;">
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
    }

    const mailOptions = {
      from: fromAddress,
      to: toEmails.join(', '),
      subject,
      text: textContent,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    const previewUrl = isTestAccount ? nodemailer.getTestMessageUrl(info) : null;

    console.log(`[nodemailer] Sent ${action} email to: ${toEmails.join(', ')} | ID: ${info.messageId} | Provider: ${smtpUser ? 'Real SMTP (' + smtpUser + ')' : 'Ethereal Test Sandbox'}`);

    return res.status(200).json({
      success: true,
      messageId: info.messageId,
      recipients: toEmails,
      isTestAccount,
      previewUrl,
      senderUsed: smtpUser || 'Ethereal Test Sandbox',
      statusMessage: smtpUser
        ? `Delivered to ${toEmails.join(', ')} via ${smtpUser}`
        : `Sent via test sandbox (set SMTP credentials in Admin Settings to deliver to live Gmail/Outlook inboxes)`,
    });
  } catch (error) {
    console.error('[nodemailer] Error sending email:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to send email',
    });
  }
}
