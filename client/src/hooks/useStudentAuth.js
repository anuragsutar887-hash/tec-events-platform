import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const STORAGE_KEY = 'participant_user';

export function useStudentAuth() {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [pendingInvites, setPendingInvites] = useState([]);
  const [loadingInvites, setLoadingInvites] = useState(false);

  // Check pending invites for the logged in participant
  const fetchPendingInvites = useCallback(async (student) => {
    const target = student || user;
    if (!target || (!target.prn && !target.email)) {
      setPendingInvites([]);
      return;
    }

    try {
      setLoadingInvites(true);
      // Find participant records where student_id matches or email matches, and is NOT the leader
      let query = supabase
        .from('participants')
        .select('*, registrations!inner(*, events(*))')
        .eq('is_leader', false)
        .eq('registrations.status', 'PENDING_APPROVAL');

      if (target.prn) {
        query = query.or(`student_id.ilike.${target.prn.trim()},email.ilike.${target.email.trim()}`);
      } else {
        query = query.ilike('email', target.email.trim());
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching pending invites:', error);
        return;
      }

      // Format invites
      const formatted = (data || []).map((item) => {
        const reg = item.registrations;
        const ev = reg?.events;
        return {
          participantId: item.id,
          registrationId: reg.id,
          regCode: reg.registration_id,
          teamName: reg.team_name,
          eventTitle: ev?.name || 'Technical Event',
          eventDate: ev?.event_date,
          eventVenue: ev?.venue,
          eventSlug: ev?.slug,
          created_at: reg.created_at,
        };
      });

      setPendingInvites(formatted);
    } catch (err) {
      console.error('Failed to fetch pending invites:', err);
    } finally {
      setLoadingInvites(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchPendingInvites(user);
    }
  }, [user, fetchPendingInvites]);

  const login = (userData) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    setUser(userData);
    fetchPendingInvites(userData);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setPendingInvites([]);
  };

  return {
    user,
    isAuthenticated: Boolean(user && (user.prn || user.email)),
    login,
    logout,
    pendingInvites,
    loadingInvites,
    refreshInvites: () => fetchPendingInvites(user),
  };
}
