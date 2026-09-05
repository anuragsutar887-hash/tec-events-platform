import { useState, useEffect, useCallback } from 'react';
import { signOut, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
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

  // Handle incoming verification email link if opened in ANY tab
  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      const urlParams = new URLSearchParams(window.location.search);
      const emailFromUrl = urlParams.get('verify_email') || '';
      const savedEmail = localStorage.getItem('emailForSignIn') || emailFromUrl;
      const savedName = localStorage.getItem('pending_auth_name') || '';
      const savedPrn = localStorage.getItem('pending_auth_prn') || '';

      if (savedEmail) {
        signInWithEmailLink(auth, savedEmail, window.location.href)
          .then((result) => {
            localStorage.removeItem('emailForSignIn');
            localStorage.removeItem('pending_auth_name');
            localStorage.removeItem('pending_auth_prn');

            const userData = {
              full_name: savedName || result.user?.displayName || 'Participant',
              email: result.user?.email ? result.user.email.toLowerCase() : savedEmail.toLowerCase(),
              prn: (savedPrn || '').toUpperCase(),
              uid: result.user?.uid || '',
              photoURL: result.user?.photoURL || '',
              college: 'Indira College of Engineering & Management',
              logged_in_at: new Date().toISOString(),
            };

            // 1. Store in localStorage (fires storage event in origin tab)
            localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
            localStorage.setItem('participant_auth_sync', Date.now().toString());

            // 2. Broadcast to other open tabs
            try {
              const bc = new BroadcastChannel(SYNC_CHANNEL);
              bc.postMessage({ type: 'LOGIN_SUCCESS', user: userData });
            } catch {}

            // 3. Update current tab
            setUser(userData);
            fetchPendingInvites(userData);

            // 4. If this is a secondary tab opened from email, close it so origin tab is active!
            const isOriginTab = sessionStorage.getItem('is_auth_origin_tab') === 'true';
            if (!isOriginTab) {
              window.close();
              setTimeout(() => {
                window.close();
              }, 400);
            }

            // Clean query params from URL
            window.history.replaceState({}, document.title, window.location.pathname);
          })
          .catch((err) => {
            console.error('Email link auth error:', err);
          });
      }
    }
  }, [fetchPendingInvites]);

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
