import { supabase } from '../lib/supabaseClient';

const computeRegistrationStatus = (ev) => {
  const status = (ev.status || '').toUpperCase();
  if (status === 'COMPLETED' || status === 'ARCHIVED') return 'CLOSED';
  if (status === 'DRAFT') return 'NOT_OPEN';
  const now = new Date();
  if (ev.registration_opens_at && new Date(ev.registration_opens_at) > now) return 'NOT_OPEN';
  if (ev.registration_closes_at && new Date(ev.registration_closes_at) < now) return 'CLOSED';
  return 'OPEN';
};

// Helper to format event objects from snake_case / JSON strings
const parseEvent = (ev) => {
  if (!ev) return null;
  return {
    ...ev,
    registration_status: computeRegistrationStatus(ev),
    rules: ev.rules || '',
    contact_info: typeof ev.contact_info === 'string' ? JSON.parse(ev.contact_info || '{}') : (ev.contact_info || {}),
    features: typeof ev.features === 'string' ? JSON.parse(ev.features || '{}') : (ev.features || {}),
  };
};

const formatRegistration = (r) => {
  if (!r) return null;
  const p1 = r.participants?.find(p => p.is_leader) || r.participants?.[0];
  const p2 = r.participants?.find(p => !p.is_leader) || r.participants?.[1];
  return {
    ...r,
    event_name: r.events?.name || 'Technical Event',
    event: r.events ? parseEvent(r.events) : null,
    leader_name: p1?.full_name || '',
    leader_email: p1?.email || '',
    leader_phone: p1?.phone || '',
    leader_dept: p1?.department || '',
    leader_year: p1?.year || '',
    leader_prn: p1?.student_id || '',
    player2_name: p2?.full_name || '',
    player2_email: p2?.email || '',
    player2_prn: p2?.student_id || '',
    prns: [p1?.student_id, p2?.student_id].filter(Boolean).join(' • ') || '—',
    participants: (r.participants || []).map(p => ({
      ...p,
      prn: p.student_id || ''
    }))
  };
};

export const apiClient = {
  // ─── GET Endpoints ──────────────────────────────────────────
  async get(url) {
    // 1. All Published Events (Public Homepage / Events List) — Ordered by latest update for immediate visibility
    if (url === '/events') {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      const validEvents = (data || []).filter(e => {
        const s = (e.status || '').toUpperCase();
        return s === 'PUBLISHED' || s === 'COMPLETED';
      });
      return { data: { events: validEvents.map(parseEvent) } };
    }

    // 2. All Events for Admin (Draft, Published, etc.)
    if (url === '/admin/events' || url === '/admin/dashboard/events') {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('updated_at', { ascending: false });
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

    // 4. Single Event by Slug or ID (Public Event Detail & Registration)
    if (url.startsWith('/events/')) {
      const param = url.replace('/events/', '').split('?')[0];
      let query = supabase.from('events').select('*');
      if (/^\d+$/.test(param)) {
        query = query.eq('id', parseInt(param));
      } else {
        query = query.eq('slug', param);
      }
      const { data, error } = await query.single();
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

    // 7b. Single Registration status check by ID or Code
    if (url.startsWith('/registrations/') && !url.includes('/leaderboard/')) {
      const param = url.replace('/registrations/', '').split('?')[0];
      let query = supabase.from('registrations').select('*, events(*), participants(*)');
      if (/^\d+$/.test(param)) {
        query = query.eq('id', parseInt(param));
      } else {
        query = query.eq('registration_id', param);
      }
      const { data: reg, error } = await query.single();
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
          r.leader_prn?.toLowerCase().includes(search) ||
          r.player2_name?.toLowerCase().includes(search) ||
          r.player2_prn?.toLowerCase().includes(search) ||
          r.prns?.toLowerCase().includes(search) ||
          r.participants?.some(p => 
            p.full_name?.toLowerCase().includes(search) || 
            p.email?.toLowerCase().includes(search) ||
            p.student_id?.toLowerCase().includes(search)
          )
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
        .select('id, registration_id, team_name, checked_in, checked_in_at, score, participants(full_name, student_id, department, year, is_leader)')
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
        .select('*, events(name), participants(*)')
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
              leader_name: r.participants?.[0]?.full_name || r.team_name,
              prns: (r.participants || []).map(p => p.student_id).filter(Boolean).join(', ') || '—'
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

    // 2. Create Event (Sanitized with actual database columns)
    if (url === '/admin/events') {
      let slug = payload.slug || payload.name?.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `event-${Date.now()}`;
      
      // Auto-handle slug conflicts so unique constraints never fail
      const { data: existing } = await supabase.from('events').select('id').eq('slug', slug).maybeSingle();
      if (existing) {
        slug = `${slug}-${Date.now().toString().slice(-4)}`;
      }

      const insertData = {
        name: payload.name?.trim(),
        slug,
        short_description: payload.short_description || '',
        full_description: payload.full_description || '',
        event_date: payload.event_date || null,
        start_time: payload.start_time || null,
        end_time: payload.end_time || null,
        venue: payload.venue || '',
        registration_opens_at: payload.registration_opens_at || null,
        registration_closes_at: payload.registration_closes_at || null,
        status: (payload.status || 'PUBLISHED').toUpperCase(),
        allows_solo: Boolean(payload.allows_solo),
        allows_team: Boolean(payload.allows_team ?? true),
        min_team_size: payload.min_team_size || 2,
        max_team_size: payload.max_team_size || 2,
        rules: typeof payload.rules === 'string' ? payload.rules : (Array.isArray(payload.rules) ? payload.rules.join('\n') : ''),
        instructions: payload.instructions || '',
        contact_info: typeof payload.contact_info === 'string' ? payload.contact_info : JSON.stringify(payload.contact_info || {}),
        banner_url: payload.banner_url || '',
        features: typeof payload.features === 'string' ? payload.features : JSON.stringify(payload.features || {}),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('events')
        .insert(insertData)
        .select()
        .single();
      if (error) throw error;
      return { data: { event: parseEvent(data) } };
    }

    // 3. Register Team (Public & On-site) — Saves Full Name, PRN, Email ID
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
      const initialStatus = payload.status || (is_on_site ? 'CONFIRMED' : 'PENDING_APPROVAL');
      const { data: reg, error: regError } = await supabase
        .from('registrations')
        .insert({
          event_id: eventRecord.id,
          registration_id: regId,
          team_name: team_name?.trim() || `${p1.full_name}'s Duo`,
          participation_mode: 'TEAM',
          registration_type: is_on_site ? 'ON_SITE' : 'ONLINE',
          status: initialStatus,
          checked_in: Boolean(payload.checked_in || is_on_site),
          checked_in_at: payload.checked_in || is_on_site ? new Date().toISOString() : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (regError) throw regError;

      // Insert Player 1 (Includes PRN in student_id)
      await supabase.from('participants').insert({
        registration_id: reg.id,
        event_id: eventRecord.id,
        is_leader: true,
        full_name: p1.full_name?.trim() || '',
        email: p1.email?.trim() || '',
        phone: p1.phone || '',
        college: p1.college || 'ICEM Pune',
        department: p1.department || 'IT',
        year: p1.year || '',
        student_id: p1.prn?.trim() || p1.student_id?.trim() || ''
      });

      // Insert Player 2 (Includes PRN in student_id)
      if (p2.full_name) {
        await supabase.from('participants').insert({
          registration_id: reg.id,
          event_id: eventRecord.id,
          is_leader: false,
          full_name: p2.full_name?.trim() || '',
          email: p2.email?.trim() || '',
          phone: p2.phone || '',
          college: p2.college || p1.college || 'ICEM Pune',
          department: p2.department || p1.department || 'IT',
          year: p2.year || p1.year || '',
          student_id: p2.prn?.trim() || p2.student_id?.trim() || ''
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
            status: reg.status,
            participants: [
              { is_leader: true, full_name: p1.full_name, email: p1.email, prn: p1.prn || p1.student_id || '' },
              { is_leader: false, full_name: p2.full_name, email: p2.email, prn: p2.prn || p2.student_id || '' }
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
        .update({ status: (payload.status || 'PUBLISHED').toUpperCase(), updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { data: { event: parseEvent(data) } };
    }

    // 2. Edit Event Details / Status (Sanitized with actual database columns)
    if (url.match(/^\/admin\/events\/\d+$/)) {
      const id = url.split('/admin/events/')[1];
      const updateData = { updated_at: new Date().toISOString() };

      if (payload.name !== undefined) updateData.name = payload.name.trim();
      if (payload.slug !== undefined) updateData.slug = payload.slug.trim();
      if (payload.short_description !== undefined) updateData.short_description = payload.short_description;
      if (payload.full_description !== undefined) updateData.full_description = payload.full_description;
      if (payload.event_date !== undefined) updateData.event_date = payload.event_date || null;
      if (payload.start_time !== undefined) updateData.start_time = payload.start_time || null;
      if (payload.end_time !== undefined) updateData.end_time = payload.end_time || null;
      if (payload.venue !== undefined) updateData.venue = payload.venue;
      if (payload.registration_opens_at !== undefined) updateData.registration_opens_at = payload.registration_opens_at || null;
      if (payload.registration_closes_at !== undefined) updateData.registration_closes_at = payload.registration_closes_at || null;
      if (payload.status !== undefined) updateData.status = payload.status.toUpperCase();
      if (payload.allows_solo !== undefined) updateData.allows_solo = Boolean(payload.allows_solo);
      if (payload.allows_team !== undefined) updateData.allows_team = Boolean(payload.allows_team);
      if (payload.min_team_size !== undefined) updateData.min_team_size = payload.min_team_size;
      if (payload.max_team_size !== undefined) updateData.max_team_size = payload.max_team_size;
      if (payload.rules !== undefined) {
        updateData.rules = typeof payload.rules === 'string' ? payload.rules : (Array.isArray(payload.rules) ? payload.rules.join('\n') : '');
      }
      if (payload.instructions !== undefined) updateData.instructions = payload.instructions;
      if (payload.contact_info !== undefined) {
        updateData.contact_info = typeof payload.contact_info === 'string' ? payload.contact_info : JSON.stringify(payload.contact_info || {});
      }
      if (payload.banner_url !== undefined) updateData.banner_url = payload.banner_url;
      if (payload.features !== undefined) {
        updateData.features = typeof payload.features === 'string' ? payload.features : JSON.stringify(payload.features || {});
      }

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
      return { data: { message: 'Checked in successfully', registration: formatRegistration(data) } };
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
      return { data: { message: 'Check-in reversed', registration: formatRegistration(data) } };
    }

    // 5. Teammate Approves Team Registration
    if (url.match(/^\/registrations\/\d+\/approve$/)) {
      const id = url.split('/registrations/')[1].split('/approve')[0];
      const { data, error } = await supabase
        .from('registrations')
        .update({ status: 'CONFIRMED', updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*, participants(*), events(*)')
        .single();
      if (error) throw error;
      return { data: { message: 'Registration approved and confirmed!', registration: formatRegistration(data) } };
    }

    // 6. Teammate Declines Team Registration
    if (url.match(/^\/registrations\/\d+\/decline$/)) {
      const id = url.split('/registrations/')[1].split('/decline')[0];
      const { data, error } = await supabase
        .from('registrations')
        .update({ status: 'DECLINED', updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*, participants(*), events(*)')
        .single();
      if (error) throw error;
      return { data: { message: 'Invitation declined.', registration: formatRegistration(data) } };
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