import { supabase } from '../lib/supabaseClient';

// Helper to format date nicely
const formatFriendlyDate = (dateStr) => {
  if (!dateStr) return 'To be announced';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

// Helper to format time nicely
const formatFriendlyTime = (timeStr) => {
  if (!timeStr) return '10:00 AM';
  try {
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(timeStr)) {
      const parts = timeStr.split(':');
      let hour = parseInt(parts[0], 10);
      const min = parts[1];
      const ampm = hour >= 12 ? 'PM' : 'AM';
      hour = hour % 12 || 12;
      return `${hour}:${min} ${ampm}`;
    }
    return timeStr;
  } catch {
    return timeStr;
  }
};

/**
 * Generates a cryptographically secure random password (unambiguous charset, no I/l/O/0/1)
 * Format: TEC-XXXXXX
 */
export function generateRandomPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let pwd = 'TEC-';
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint8Array(6);
    crypto.getRandomValues(arr);
    for (let i = 0; i < 6; i++) {
      pwd += chars[arr[i] % chars.length];
    }
  } else {
    for (let i = 0; i < 6; i++) {
      pwd += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return pwd;
}

/**
 * Resolves SMTP settings from localStorage or Supabase
 */
async function resolveSmtpSettings() {
  let storedSmtp = null;
  try {
    const raw = localStorage.getItem('tec_smtp_config');
    if (raw) storedSmtp = JSON.parse(raw);
  } catch {}

  if (!storedSmtp || !storedSmtp.user || !storedSmtp.pass) {
    try {
      const { data: adminRow } = await supabase
        .from('admins')
        .select('full_name')
        .eq('id', 1)
        .maybeSingle();

      if (adminRow?.full_name && adminRow.full_name.startsWith('SMTP:')) {
        const parsed = JSON.parse(adminRow.full_name.slice(5));
        if (parsed?.user && parsed?.pass) {
          storedSmtp = parsed;
        }
      }
    } catch (err) {
      console.warn('[emailService] Supabase SMTP lookup note:', err);
    }
  }
  return storedSmtp;
}

/**
 * Dispatches a registration confirmation email to all registered teammates via nodemailer.
 */
export async function sendRegistrationEmail({
  registration,
  event = {},
  participants = [],
  password,
}) {
  try {
    // Collect recipient emails for all teammates
    const emails = [];
    if (Array.isArray(participants)) {
      participants.forEach((p) => {
        if (p?.email && typeof p.email === 'string') {
          emails.push(p.email.trim().toLowerCase());
        }
      });
    }

    // Fallback: Check registration properties if participants array was empty
    if (emails.length === 0) {
      if (registration?.leader_email) emails.push(registration.leader_email.trim().toLowerCase());
      if (registration?.player2_email) emails.push(registration.player2_email.trim().toLowerCase());
    }

    const uniqueRecipients = [...new Set(emails.filter(Boolean))];

    if (uniqueRecipients.length === 0) {
      console.warn('[emailService] No valid recipient emails found for registration:', registration?.id);
      return { success: false, error: 'No recipients' };
    }

    const teamId = registration?.registration_id || `TEC-2026-${registration?.id || '0000'}`;
    const finalPassword = password || generateRandomPassword();

    const isSolo = uniqueRecipients.length === 1 && !registration?.team_name?.includes('&');
    const p1 = participants.find((p) => p.is_leader) || participants[0];
    const teamName = registration?.team_name || (isSolo && p1?.full_name ? p1.full_name : 'Participant');

    const eventName = event?.name || registration?.event_name || 'Technical Event';
    const eventDate = formatFriendlyDate(event?.event_date);
    const eventTime = formatFriendlyTime(event?.start_time);
    const venue = event?.venue || 'Indira College of Engineering & Management (ICEM), Pune';

    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://tec-events-platform.vercel.app';
    const loginUrl = `${currentOrigin}/login`;

    const storedSmtp = await resolveSmtpSettings();

    const payload = {
      action: 'REGISTRATION',
      recipients: uniqueRecipients,
      teamName,
      eventName,
      teamId,
      password: finalPassword,
      eventDate,
      eventTime,
      venue,
      loginUrl,
      organizerName: 'Department of Information Technology',
      collegeName: 'Indira College of Engineering and Management (ICEM), Pune',
      smtpConfig: storedSmtp,
    };

    console.log(`[emailService] Sending registration email via nodemailer to:`, uniqueRecipients, `for Team ID: ${teamId}`);

    const res = await fetch('/api/send-registration-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[emailService] Server responded with error status ${res.status}:`, errText);
      return { success: false, error: errText };
    }

    const data = await res.json();
    console.log('[emailService] Email successfully sent:', data);
    return data;
  } catch (err) {
    console.error('[emailService] Exception while triggering registration email:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Dispatches a password reset email to a student or committee admin via nodemailer.
 */
export async function sendPasswordResetEmail({
  recipient,
  userName = 'User',
  resetUrl,
  role = 'student',
}) {
  try {
    if (!recipient) throw new Error('Recipient email is required');

    const storedSmtp = await resolveSmtpSettings();

    const payload = {
      action: 'RESET_PASSWORD',
      recipients: [recipient],
      userName,
      resetUrl,
      role,
      organizerName: 'Technical Committee',
      collegeName: 'Indira College of Engineering and Management (ICEM), Pune',
      smtpConfig: storedSmtp,
    };

    console.log(`[emailService] Sending password reset email to: ${recipient}`);

    const res = await fetch('/api/send-registration-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[emailService] Reset email error status ${res.status}:`, errText);
      return { success: false, error: errText };
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error('[emailService] Exception while sending password reset email:', err);
    return { success: false, error: err.message };
  }
}
