import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://jzantniagqzetbbvohzn.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6YW50bmlhZ3F6ZXRiYnZvaHpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNjMxMDQsImV4cCI6MjEwMjYzOTEwNH0.xNGvYpXWjVxSRXdMqykrx8-ox2TdmoEWd_IoB28O-6g";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

function parseEvent(ev) {
  if (!ev) return null;
  const now = new Date();
  const opensAt = ev.registration_opens_at ? new Date(ev.registration_opens_at) : null;
  const closesAt = ev.registration_closes_at ? new Date(ev.registration_closes_at) : null;

  let regStatus = 'OPEN';
  if (ev.status !== 'PUBLISHED') {
    regStatus = 'CLOSED';
  } else if (opensAt && now < opensAt) {
    regStatus = 'NOT_OPEN';
  } else if (closesAt && now > closesAt) {
    regStatus = 'CLOSED';
  }

  return {
    ...ev,
    registration_status: regStatus,
    features: typeof ev.features === 'string' ? JSON.parse(ev.features) : (ev.features || {}),
    contact_info: typeof ev.contact_info === 'string' ? JSON.parse(ev.contact_info) : (ev.contact_info || {}),
  };
}

function formatRegistration(r) {
  if (!r) return null;
  const leader = r.participants?.find(p => p.is_leader) || r.participants?.[0] || {};
  return {
    ...r,
    event_name: r.events?.name || 'Technical Event',
    event: r.events || { name: 'Technical Event' },
    leader_name: leader.full_name || '',
    leader_email: leader.email || '',
    leader_phone: leader.phone || '',
    participant_count: r.participants?.length || 0,
  };
}

export const apiClient = {
  // ─── GET Endpoints ─────────────────────────────────────────
  async get(url) {
    // 1. Single Event by slug (Public)
    if (url.startsWith('/events/')) {
      const slug = url.replace('/events/', '');
      const { data, error } = await supabase.from('events').select('*').eq('slug', slug).single();
      if (error) throw error;
      return { data: { event: parseEvent(data) } };
    }

    // 2. All Published Events (Public)
    if (url === '/events') {
      const { data, error } = await supabase.from('events').select('*').order('event_date', { ascending: true });
      if (error) throw error;
      return { data: { events: (data || []).map(parseEvent) } };
    }

    // 3. Admin Events List / Dashboard Events
    if (url === '/admin/events' || url.startsWith('/admin/dashboard/events')) {
      const { data, error } = await supabase.from('events').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return { data: { events: (data || []).map(parseEvent) } };
    }

    // 4. Single Event by ID (Admin Edit Form)
    if (url.match(/^\/admin\/events\/\d+$/)) {
      const id = url.split('/admin/events/')[1];
      const { data, error } = await supabase.from('events').select('*').eq('id', id).single();
      if (error) throw error;
      return { data: { event: parseEvent(data) } };
    }

    // 5. Lookup by Token (QR Code Scan) - Public / Check-in
    if (url.startsWith('/registrations/lookup-by-token/') || url.includes('/checkin/by-token/') || url.includes('/by-token/')) {
      const parts = url.split('/by-token/');
      const token = parts[parts.length - 1].split('?')[0];
      const { data: reg, error } = await supabase
        .from('registrations')
        .select('*, events(*), participants(*)')
        .eq('qr_token', token)
        .single();
      if (error) throw error;
      return { data: { registration: formatRegistration(reg) } };
    }

    // 6. Lookup by Registration ID - Public
    if (url.startsWith('/registrations/lookup/')) {
      const query = url.replace('/registrations/lookup/', '').trim();
      const { data: reg, error } = await supabase
        .from('registrations')
        .select('*, events(*), participants(*)')
        .ilike('registration_id', query)
        .single();
      if (error) throw error;
      return { data: { registration: formatRegistration(reg) } };
    }

    // 7. Single Registration by ID (Admin Modal / Checkin)
    if (url.match(/^\/admin\/registrations\/\d+$/)) {
      const id = url.split('/admin/registrations/')[1];
      const { data: reg, error } = await supabase
        .from('registrations')
        .select('*, events(*), participants(*)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return { data: { registration: formatRegistration(reg) } };
    }

    // 8. Admin Registrations List (with filters & search)
    if (url.startsWith('/admin/registrations')) {
      const queryParams = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');
      const search = queryParams.get('search')?.toLowerCase().trim();
      const eventId = queryParams.get('event_id');
      const regType = queryParams.get('registration_type');
      const mode = queryParams.get('participation_mode');
      const checkedIn = queryParams.get('checked_in');

      let query = supabase
        .from('registrations')
        .select('*, events(*), participants(*)')
        .order('created_at', { ascending: false });

      if (eventId) query = query.eq('event_id', eventId);
      if (regType) query = query.eq('registration_type', regType);
      if (mode) query = query.eq('participation_mode', mode);
      if (checkedIn === 'true') query = query.eq('checked_in', true);
      if (checkedIn === 'false') query = query.eq('checked_in', false);

      const { data: regs, error } = await query;
      if (error) throw error;

      let formatted = (regs || []).map(formatRegistration);

      if (search) {
        formatted = formatted.filter(r => 
          r.registration_id?.toLowerCase().includes(search) ||
          r.team_name?.toLowerCase().includes(search) ||
          r.leader_name?.toLowerCase().includes(search) ||
          r.leader_email?.toLowerCase().includes(search) ||
          r.leader_phone?.toLowerCase().includes(search) ||
          r.participants?.some(p => p.full_name?.toLowerCase().includes(search) || p.email?.toLowerCase().includes(search))
        );
      }

      return {
        data: {
          registrations: formatted,
          pagination: {
            total: formatted.length,
            page: 1,
            limit: 50,
            pages: Math.ceil(formatted.length / 50) || 1
          }
        }
      };
    }

    // 9. Live Leaderboard by Event ID
    if (url.includes('/registrations/leaderboard/')) {
      const eventId = url.split('/leaderboard/')[1];
      const { data: teams, error } = await supabase
        .from('registrations')
        .select('id, registration_id, team_name, checked_in, checked_in_at, score, participants(full_name, department, year, is_leader)')
        .eq('event_id', eventId)
        .eq('checked_in', true)
        .order('checked_in_at', { ascending: true });
      if (error) throw error;
      return { data: { teams: teams || [] } };
    }

    // 10. Dashboard Stats
    if (url.startsWith('/admin/dashboard/stats')) {
      const urlParams = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');
      const selectedEventId = urlParams.get('event_id');

      const { data: evs } = await supabase.from('events').select('id, status');
      const { data: regs } = await supabase.from('registrations').select('id, event_id, registration_type, participation_mode, checked_in, created_at, registration_id, team_name, events(name), participants(full_name, is_leader)').order('created_at', { ascending: false });
      const { data: parts } = await supabase.from('participants').select('id');

      let eventStats = null;
      if (selectedEventId) {
        const evRegs = (regs || []).filter(r => String(r.event_id) === String(selectedEventId));
        eventStats = {
          total_registrations: evRegs.length,
          total_participants: evRegs.reduce((acc, r) => acc + (r.participants?.length || 0), 0),
          online_registrations: evRegs.filter(r => r.registration_type === 'ONLINE').length,
          on_site_registrations: evRegs.filter(r => r.registration_type === 'ON_SITE').length,
          checked_in: evRegs.filter(r => r.checked_in).length,
          not_checked_in: evRegs.filter(r => !r.checked_in).length,
          team_registrations: evRegs.filter(r => r.participation_mode === 'TEAM').length,
          solo_registrations: evRegs.filter(r => r.participation_mode === 'SOLO').length,
        };
      }

      const recentFormatted = (regs || []).slice(0, 10).map(r => ({
        registration_id: r.registration_id,
        team_name: r.team_name,
        leader_name: r.participants?.find(p => p.is_leader)?.full_name || '',
        event_name: r.events?.name || 'Event',
        registration_type: r.registration_type,
        checked_in: r.checked_in,
        created_at: r.created_at
      }));

      return {
        data: {
          global: {
            total_events: evs?.length || 0,
            upcoming_events: evs?.filter(e => e.status === 'PUBLISHED').length || 0,
            total_registrations: regs?.length || 0,
            total_participants: parts?.length || 0,
            checked_in: regs?.filter(r => r.checked_in).length || 0,
            on_site_registrations: regs?.filter(r => r.registration_type === 'ON_SITE').length || 0,
            recent: recentFormatted
          },
          event_stats: eventStats,
          recent: recentFormatted
        }
      };
    }

    throw new Error(`GET ${url} not mapped`);
  },

  // ─── POST Endpoints ────────────────────────────────────────
  async post(url, payload) {
    // 1. Create New Event (Admin)
    if (url === '/admin/events') {
      const slug = payload.slug || payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const { data, error } = await supabase.from('events').insert({
        ...payload,
        slug,
        status: payload.status || 'PUBLISHED',
        registration_opens_at: payload.registration_opens_at || new Date().toISOString(),
        registration_closes_at: payload.registration_closes_at || new Date(Date.now() + 30 * 86400000).toISOString(),
      }).select().single();
      if (error) throw error;
      return { data: { event: parseEvent(data) } };
    }

    // 2. Register Duo Team (Player 1 & Player 2)
    if (url === '/registrations' || url === '/admin/registrations') {
      const { event_slug, event_id, team_name, leader, members, player_1, player_2, check_in_immediately } = payload;
      
      const p1 = player_1 || leader || {};
      const p2 = player_2 || (members && members[0]) || {};

      let eventRecord = null;
      if (event_id) {
        const { data } = await supabase.from('events').select('id, name, event_date').eq('id', event_id).single();
        eventRecord = data;
      } else {
        const { data } = await supabase.from('events').select('id, name, event_date').eq('slug', event_slug || 'codedebug').single();
        eventRecord = data;
      }

      if (!eventRecord) throw new Error('Event not found for registration');

      const seq = Math.floor(1000 + Math.random() * 9000);
      const registration_id = `TEC-${new Date().getFullYear()}-${seq}`;
      const qr_token = crypto.randomUUID();

      const { data: reg, error: regErr } = await supabase.from('registrations').insert({
        registration_id,
        event_id: eventRecord.id,
        registration_type: url.includes('admin') ? 'ON_SITE' : 'ONLINE',
        participation_mode: 'TEAM',
        team_name: team_name?.trim() || `${p1.full_name || 'Team'}'s Duo`,
        status: 'CONFIRMED',
        checked_in: Boolean(check_in_immediately),
        checked_in_at: check_in_immediately ? new Date().toISOString() : null,
        qr_token,
        score: 0
      }).select().single();

      if (regErr) throw new Error(regErr.message);

      // Insert Player 1
      await supabase.from('participants').insert({
        registration_id: reg.id,
        event_id: eventRecord.id,
        is_leader: true,
        full_name: p1.full_name || '',
        email: p1.email || '',
        phone: p1.phone || '',
        college: p1.college || 'ICEM Pune',
        department: p1.department || 'IT',
        year: p1.year || '',
        student_id: p1.student_id || ''
      });

      // Insert Player 2
      if (p2.full_name) {
        await supabase.from('participants').insert({
          registration_id: reg.id,
          event_id: eventRecord.id,
          is_leader: false,
          full_name: p2.full_name || '',
          email: p2.email || '',
          phone: p2.phone || '',
          college: p2.college || p1.college || 'ICEM Pune',
          department: p2.department || p1.department || 'IT',
          year: p2.year || p1.year || '',
          student_id: p2.student_id || ''
        });
      }

      return {
        data: {
          registration: {
            id: reg.id,
            registration_id: reg.registration_id,
            event_name: eventRecord.name,
            qr_token: reg.qr_token,
            team_name: reg.team_name,
            participation_mode: 'TEAM',
            participants: [
              { is_leader: true, full_name: p1.full_name, email: p1.email },
              { is_leader: false, full_name: p2.full_name, email: p2.email }
            ]
          }
        }
      };
    }

    throw new Error(`POST ${url} not mapped`);
  },

  // ─── PUT Endpoints (Status changes, Edits, Check-ins) ──────
  async put(url, payload = {}) {
    // 1. Update Event Status (Publish / Unpublish / Complete / Archive)
    if (url.includes('/admin/events/') && url.endsWith('/status')) {
      const id = url.split('/admin/events/')[1].split('/status')[0];
      const { data, error } = await supabase
        .from('events')
        .update({ status: payload.status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { data: { event: parseEvent(data) } };
    }

    // 2. Edit Event Details / Status
    if (url.match(/^\/admin\/events\/\d+$/)) {
      const id = url.split('/admin/events/')[1];
      const updateData = { ...payload, updated_at: new Date().toISOString() };
      const { data, error } = await supabase
        .from('events')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { data: { event: parseEvent(data) } };
    }

    // 3. QR Check-In
    if (url.includes('/admin/registrations/') && url.endsWith('/checkin')) {
      const regId = url.split('/admin/registrations/')[1].split('/')[0];
      const { data, error } = await supabase
        .from('registrations')
        .update({ checked_in: true, checked_in_at: new Date().toISOString() })
        .eq('id', regId)
        .select('*, participants(*)')
        .single();
      if (error) throw error;
      return { data: { message: 'Checked in successfully', registration: data } };
    }

    // 4. Undo Check-In
    if (url.includes('/admin/registrations/') && url.endsWith('/undo-checkin')) {
      const regId = url.split('/admin/registrations/')[1].split('/')[0];
      const { data, error } = await supabase
        .from('registrations')
        .update({ checked_in: false, checked_in_at: null })
        .eq('id', regId)
        .select('*, participants(*)')
        .single();
      if (error) throw error;
      return { data: { message: 'Check-in reversed', registration: data } };
    }

    throw new Error(`PUT ${url} not mapped`);
  },

  // ─── DELETE Endpoints ──────────────────────────────────────
  async delete(url) {
    if (url.startsWith('/admin/events/')) {
      const id = url.split('/admin/events/')[1];
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;
      return { data: { message: 'Event deleted successfully' } };
    }
    throw new Error(`DELETE ${url} not mapped`);
  }
};

export default apiClient;