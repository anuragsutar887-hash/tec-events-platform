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
    // If it's HH:mm or HH:mm:ss
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
 * Dispatches a registration confirmation email to all registered teammates via nodemailer.
 *
 * @param {Object} params
 * @param {Object} params.registration - Registration record from Supabase
 * @param {Object} params.event - Event record (name, date, time, venue)
 * @param {Array} params.participants - Array of participants ({ email, full_name, is_leader, prn })
 * @param {string} [params.password] - Optional explicit password, otherwise generates TEC#<digits>
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
    const cleanDigits = teamId.replace(/\D/g, '').slice(-4) || '2026';
    const finalPassword = password || `TEC#${cleanDigits}`;

    const isSolo = uniqueRecipients.length === 1 && !registration?.team_name?.includes('&');
    const p1 = participants.find((p) => p.is_leader) || participants[0];
    const teamName = registration?.team_name || (isSolo && p1?.full_name ? p1.full_name : 'Participant');

    const eventName = event?.name || registration?.event_name || 'Technical Event';
    const eventDate = formatFriendlyDate(event?.event_date);
    const eventTime = formatFriendlyTime(event?.start_time);
    const venue = event?.venue || 'Indira College of Engineering & Management (ICEM), Pune';

    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://tec-events-platform.vercel.app';
    const loginUrl = `${currentOrigin}/login`;

    let storedSmtp = null;
    try {
      const raw = localStorage.getItem('tec_smtp_config');
      if (raw) storedSmtp = JSON.parse(raw);
    } catch {}

    const payload = {
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
