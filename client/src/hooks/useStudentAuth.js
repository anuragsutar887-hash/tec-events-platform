import { useState, useEffect, useCallback } from 'react';
import {
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { supabase } from '../lib/supabaseClient';

const STORAGE_KEY = 'participant_user';
const SYNC_CHANNEL = 'participant_auth_channel';

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
      let query = supabase
        .from('participants')
        .select('*, registrations!inner(*, events(*), participants(*))')
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

      const formatted = (data || []).map((item) => {
        const reg = item.registrations;
        const ev = reg?.events;
        const leader = (reg?.participants || []).find((p) => p.is_leader);
        return {
          participantId: item.id,
          registrationId: reg.id,
          regCode: reg.registration_id,
          teamName: reg.team_name,
          leaderName: leader?.full_name || 'Your teammate',
          leaderPrn: leader?.student_id || '',
          leaderEmail: leader?.email || '',
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
      const interval = setInterval(() => {
        fetchPendingInvites(user);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [user, fetchPendingInvites]);

  // Sync auth state across all open tabs via BroadcastChannel & storage events
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === STORAGE_KEY) {
        try {
          const updated = e.newValue ? JSON.parse(e.newValue) : null;
          setUser(updated);
          if (updated) fetchPendingInvites(updated);
        } catch {}
      }
    };

    let bc;
    try {
      bc = new BroadcastChannel(SYNC_CHANNEL);
      bc.onmessage = (event) => {
        if (event.data?.type === 'LOGIN_SUCCESS' && event.data.user) {
          setUser(event.data.user);
          fetchPendingInvites(event.data.user);
        } else if (event.data?.type === 'LOGOUT') {
          setUser(null);
          setPendingInvites([]);
        }
      };
    } catch {}

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      if (bc) bc.close();
    };
  }, [fetchPendingInvites]);

  const login = (userData) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    localStorage.setItem('participant_auth_sync', Date.now().toString());
    setUser(userData);
    fetchPendingInvites(userData);
    try {
      const bc = new BroadcastChannel(SYNC_CHANNEL);
      bc.postMessage({ type: 'LOGIN_SUCCESS', user: userData });
    } catch {}
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setPendingInvites([]);
    try {
      const bc = new BroadcastChannel(SYNC_CHANNEL);
      bc.postMessage({ type: 'LOGOUT' });
    } catch {}
    try {
      signOut(auth);
    } catch {}
  };

  const registerWithPRN = async ({ fullName, prn, email, password }) => {
    const cleanPrn = (prn || '').trim().replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    if (!cleanPrn) throw new Error('PRN is required');
    const authEmail = `${cleanPrn}@prn.indiraicem.ac.in`;
    
    const cred = await createUserWithEmailAndPassword(auth, authEmail, password);
    const profilePayload = {
      name: (fullName || '').trim(),
      prn: (prn || '').trim().toUpperCase(),
      email: (email || '').trim().toLowerCase(),
    };

    try {
      await updateProfile(cred.user, {
        displayName: JSON.stringify(profilePayload),
      });
    } catch (err) {
      console.warn('Profile update non-critical error:', err);
    }

    const userData = {
      full_name: profilePayload.name,
      prn: profilePayload.prn,
      email: profilePayload.email,
      uid: cred.user.uid,
      college: 'Indira College of Engineering & Management',
      logged_in_at: new Date().toISOString(),
    };

    login(userData);
    return userData;
  };

  const loginWithPRN = async ({ prn, password }) => {
    const cleanPrn = (prn || '').trim().replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    if (!cleanPrn) throw new Error('PRN is required');
    const authEmail = `${cleanPrn}@prn.indiraicem.ac.in`;

    let cred = null;
    try {
      cred = await signInWithEmailAndPassword(auth, authEmail, password);
    } catch (firebaseErr) {
      const storedResetPass = typeof localStorage !== 'undefined' ? localStorage.getItem(`tec_student_pass_${cleanPrn}`) : null;
      if (storedResetPass && storedResetPass === password) {
        // Authenticated with locally reset password
        let email = '';
        let name = '';
        try {
          const { data: part } = await supabase
            .from('participants')
            .select('full_name, email')
            .ilike('student_id', (prn || '').trim())
            .limit(1)
            .maybeSingle();
          if (part) {
            email = part.email || '';
            name = part.full_name || '';
          }
        } catch {}

        const userData = {
          full_name: name || 'Participant',
          prn: (prn || '').trim().toUpperCase(),
          email: email,
          uid: `student_${cleanPrn}`,
          college: 'Indira College of Engineering & Management',
          logged_in_at: new Date().toISOString(),
        };
        login(userData);
        return userData;
      }
      throw firebaseErr;
    }
    
    let parsed = {};
    try {
      parsed = JSON.parse(cred.user?.displayName || '{}');
    } catch {
      parsed = { name: cred.user?.displayName || 'Participant' };
    }

    // If email is not stored in displayName, attempt fallback to participants table
    let email = parsed.email || '';
    let name = parsed.name || '';
    if (!email || !name) {
      try {
        const { data: part } = await supabase
          .from('participants')
          .select('full_name, email')
          .ilike('student_id', (prn || '').trim())
          .limit(1)
          .maybeSingle();
        if (part) {
          if (!email) email = part.email || '';
          if (!name) name = part.full_name || '';
        }
      } catch {}
    }

    const userData = {
      full_name: name || 'Participant',
      prn: parsed.prn || (prn || '').trim().toUpperCase(),
      email: email,
      uid: cred.user.uid,
      college: 'Indira College of Engineering & Management',
      logged_in_at: new Date().toISOString(),
    };

    login(userData);
    return userData;
  };

  return {
    user,
    isAuthenticated: Boolean(user && (user.prn || user.email)),
    login,
    logout,
    registerWithPRN,
    loginWithPRN,
    pendingInvites,
    loadingInvites,
    refreshInvites: () => fetchPendingInvites(user),
  };
}

