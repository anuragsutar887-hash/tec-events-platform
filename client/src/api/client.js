import { supabase } from '../lib/supabaseClient';

// Helper to format event objects from snake_case / JSON strings
const parseEvent = (ev) => {
  if (!ev) return null;
  return {
    ...ev,
    rules: Array.isArray(ev.rules) ? ev.rules : (typeof ev.rules === 'string' ? JSON.parse(ev.rules) : []),
    prizes: Array.isArray(ev.prizes) ? ev.prizes : (typeof ev.prizes === 'string' ? JSON.parse(ev.prizes) : []),
    timeline: Array.isArray(ev.timeline) ? ev.timeline : (typeof ev.timeline === 'string' ? JSON.parse(ev.timeline) : []),
    contact_info: typeof ev.contact_info === 'string' ? JSON.parse(ev.contact_info) : (ev.contact_info || {}),
    evaluation_criteria: Array.isArray(ev.evaluation_criteria) ? ev.evaluation_criteria : (typeof ev.evaluation_criteria === 'string' ? JSON.parse(ev.evaluation_criteria) : []),
  };
};

const formatRegistration = (r) => {
  if (!r) return null;
  const p1 = r.participants?.find(p => p.is_leader) || r.participants?.[0];
  return {
    ...r,
    event_name: r.events?.name || 'Technical Event',
    event: r.events ? parseEvent(r.events) : null,
    leader_name: p1?.full_name || '',
    leader_email: p1?.email || '',
    leader_phone: p1?.phone || '',
    leader_dept: p1?.department || '',
    leader_year: p1?.year || '',
    participants: r.participants || []
  };
};

export const apiClient = {
  // ─── GET Endpoints ──────────────────────────────────────────
  async get(url) {
    // 1. All Published Events (Public Homepage / Events List)
    if (url === '/events') {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .in('status', ['PUBLISHED', 'COMPLETED'])
        .order('event_date', { ascending: true });
      if (error) throw error;
      return { data: { events: (data || []).map(parseEvent) } };
    }

    // 2. All Events for Admin (Draft, Published, etc.)
    if (url === '/admin/events' || url === '/admin/dashboard/events') {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return { data: { events: (data || []).map(parseEvent) } };
    }

    // 3. Single Event by ID for Admin Edit
    if (url.match(/^\/admin\/events\/\d+$/)) {
      const id = url.split('/admin/events/')[1];
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return { data: { event: parseEvent(data) } };
    }

    // 4. Single Event by Slug (Public Event Detail & Registration)
    if (url.startsWith('/events/')) {
      const slug = url.replace('/events/', '').split('?')[0];
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('slug', slug)
        .single();
      if (error) throw error;
      return { data: { event: parseEvent(data) } };
    }

    // 5. Lookup by Token
    if (url.startsWith('/registrations/lookup-by-token/') || url.includes('/by-token/')) {
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
      const query = decodeURIComponent(url.replace('/registrations/lookup/', '')).trim();
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
      const urlParams = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');
      const eventId = urlParams.get('event_id');
      const regType = urlParams.get('registration_type');
      const mode = urlParams.get('participation_mode');
      const checkedIn = urlParams.get('checked_in');
      const search = urlParams.get('search')?.toLowerCase();

      let query = supabase
        .from('registrations')
        .select('*, events(name, venue), participants(*)')
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

      const [{ count: totalEvents }, { count: totalRegs }, { count: totalCheckedIn }, { count: onSiteRegs }] = await Promise.all([
        supabase.from('events').select('*', { count: 'exact', head: true }),
        supabase.from('registrations').select('*', { count: 'exact', head: true }),
        supabase.from('registrations').select('*', { count: 'exact', head: true }).eq('checked_in', true),
        supabase.from('registrations').select('*', { count: 'exact', head: true }).eq('registration_type', 'ON_SITE')
      ]);

      const { data: recentRegs } = await supabase
        .from('registrations')
        .select('*, events(name), participants(full_name)')
        .order('created_at', { ascending: false })
        .limit(6);

      let eventStats = null;
      if (selectedEventId) {
        const [{ count: evTotal }, { count: evChecked }, { count: evOnline }, { count: evOnsite }, { count: evTeam }, { count: evSolo }] = await Promise.all([
          supabase.from('registrations').select('*', { count: 'exact', head: true }).eq('event_id', selectedEventId),
          supabase.from('registrations').select('*', { count: 'exact', head: true }).eq('event_id', selectedEventId).eq('checked_in', true),
          supabase.from('registrations').select('*', { count: 'exact', head: true }).eq('event_id', selectedEventId).eq('registration_type', 'ONLINE'),
          supabase.from('registrations').select('*', { count: 'exact', head: true }).eq('event_id', selectedEventId).eq('registration_type', 'ON_SITE'),
          supabase.from('registrations').select('*', { count: 'exact', head: true }).eq('event_id', selectedEventId).eq('participation_mode', 'TEAM'),
          supabase.from('registrations').select('*', { count: 'exact', head: true }).eq('event_id', selectedEventId).eq('participation_mode', 'SOLO'),
        ]);

        eventStats = {
          total_registrations: evTotal || 0,
          total_participants: (evTotal || 0) * 2,
          checked_in: evChecked || 0,
          not_checked_in: (evTotal || 0) - (evChecked || 0),
          online_registrations: evOnline || 0,
          on_site_registrations: evOnsite || 0,
          team_registrations: evTeam || 0,
          solo_registrations: evSolo || 0
        };
      }

      return {
        data: {
          global: {
            total_events: totalEvents || 0,
            total_registrations: totalRegs || 0,
            total_participants: (totalRegs || 0) * 2,
            checked_in: totalCheckedIn || 0,
            on_site_registrations: onSiteRegs || 0,
            recent: (recentRegs || []).map(r => ({
              ...r,
              event_name: r.events?.name || 'Event',
              leader_name: r.participants?.[0]?.full_name || r.team_name
            }))
          },
          event_stats: eventStats
        }
      };
    }

    throw new Error(`GET ${url} not mapped`);
  },

  // ─── POST Endpoints (Create Event, Create Registration) ─────
  async post(url, payload) {
    // 1. Admin Login
    if (url === '/auth/login') {
      const { username, password } = payload;
      if ((username === 'admin' || username === 'admin@indiraicem.ac.in') && (password === 'admin123' || password === 'admin')) {
        return {
          data: {
            token: 'mock-session-token-' + Date.now(),
            admin: { username: 'admin', role: 'ADMIN', email: 'admin@indiraicem.ac.in' }
          }
        };
      }
      const err = new Error('Invalid credentials');
      err.response = { data: { error: 'Invalid username or password. Default is admin / admin123' } };
      throw err;
    }

    // 2. Create Event
    if (url === '/admin/events') {
      const slug = payload.slug || payload.name?.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `event-${Date.now()}`;
      const { data, error } = await supabase
        .from('events')
        .insert({
          ...payload,
          slug,
          rules: JSON.stringify(payload.rules || []),
          prizes: JSON.stringify(payload.prizes || []),
          timeline: JSON.stringify(payload.timeline || []),
          contact_info: JSON.stringify(payload.contact_info || {}),
          evaluation_criteria: JSON.stringify(payload.evaluation_criteria || []),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      if (error) throw error;
      return { data: { event: parseEvent(data) } };
    }

    // 3. Register Team (Public & On-site)
    if (url === '/registrations' || url === '/admin/registrations/onsite') {
      const { event_slug, event_id, team_name, player_1, player_2, is_on_site } = payload;

      let eventRecord = null;
      if (event_slug) {
        const { data: ev } = await supabase.from('events').select('*').eq('slug', event_slug).single();
        eventRecord = ev;
      } else if (event_id) {
        const { data: ev } = await supabase.from('events').select('*').eq('id', event_id).single();
        eventRecord = ev;
      }

      if (!eventRecord) throw new Error('Event not found');

      // Generate clean registration ID (Format: TEC-2026-XXXX)
      const regId = `TEC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const p1 = player_1 || payload.player1 || {};
      const p2 = player_2 || payload.player2 || {};

      // Insert Registration
      const { data: reg, error: regError } = await supabase
        .from('registrations')
        .insert({
          event_id: eventRecord.id,
          registration_id: regId,
          team_name: team_name?.trim() || `${p1.full_name}'s Duo`,
          participation_mode: 'TEAM',
          registration_type: is_on_site ? 'ON_SITE' : 'ONLINE',
          checked_in: Boolean(payload.checked_in || is_on_site),
          checked_in_at: payload.checked_in || is_on_site ? new Date().toISOString() : null,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (regError) throw regError;

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
      const updateData = { 
        ...payload, 
        rules: typeof payload.rules === 'string' ? payload.rules : JSON.stringify(payload.rules || []),
        prizes: typeof payload.prizes === 'string' ? payload.prizes : JSON.stringify(payload.prizes || []),
        timeline: typeof payload.timeline === 'string' ? payload.timeline : JSON.stringify(payload.timeline || []),
        contact_info: typeof payload.contact_info === 'string' ? payload.contact_info : JSON.stringify(payload.contact_info || {}),
        evaluation_criteria: typeof payload.evaluation_criteria === 'string' ? payload.evaluation_criteria : JSON.stringify(payload.evaluation_criteria || []),
        updated_at: new Date().toISOString() 
      };
      const { data, error } = await supabase
        .from('events')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { data: { event: parseEvent(data) } };
    }

    // 3. Check-In
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

  // ─── DELETE Endpoints (Delete Event with Cascade) ───────────
  async delete(url) {
    if (url.startsWith('/admin/events/')) {
      const id = url.split('/admin/events/')[1];
      // 1. Delete all participants belonging to this event
      await supabase.from('participants').delete().eq('event_id', id);
      // 2. Delete all registrations belonging to this event
      await supabase.from('registrations').delete().eq('event_id', id);
      // 3. Delete the event record itself
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;
      return { data: { message: 'Event deleted successfully' } };
    }
    throw new Error(`DELETE ${url} not mapped`);
  }
};

export default apiClient;