import { useState, useEffect } from 'react';
import { sendSignInLinkToEmail } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useStudent } from '../../context/StudentAuthContext';
import './StudentLoginModal.css';

const isGmail = (val) => /^[^\s@]+@gmail\.com$/i.test(val.trim());
const STORAGE_KEY = 'participant_user';
const SYNC_CHANNEL = 'participant_auth_channel';

export default function StudentLoginModal({ isOpen, onClose, onSuccess }) {
  const { login } = useStudent();
  const [fullName, setFullName] = useState('');
  const [prn, setPrn] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // 🔒 Prevent background scrolling without causing page scroll jump
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Reset fields when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFullName('');
      setPrn('');
      setEmail('');
      setError('');
      setLoading(false);
      setEmailSent(false);
    }
  }, [isOpen]);

  // When email link has been sent, watch for the email verification event in real time!
  // This automatically logs the user in and gives access in this SAME TAB.
  useEffect(() => {
    if (!emailSent) return;

    const checkAndCompleteLogin = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const userData = JSON.parse(stored);
          if (userData && (userData.email || userData.prn)) {
            login(userData);
            if (onSuccess) onSuccess(userData);
            onClose();
          }
        }
      } catch {}
    };

    // 1. BroadcastChannel listener (instant cross-tab signal)
    let bc;
    try {
      bc = new BroadcastChannel(SYNC_CHANNEL);
      bc.onmessage = (event) => {
        if (event.data?.type === 'LOGIN_SUCCESS' && event.data.user) {
          login(event.data.user);
          if (onSuccess) onSuccess(event.data.user);
          onClose();
        }
      };
    } catch {}

    // 2. Storage event listener (fires when another tab writes to localStorage)
    const handleStorage = (e) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        checkAndCompleteLogin();
      }
    };
    window.addEventListener('storage', handleStorage);

    // 3. Polling fallback every 600ms to guarantee zero delay
    const interval = setInterval(checkAndCompleteLogin, 600);

    return () => {
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, [emailSent, login, onSuccess, onClose]);

  if (!isOpen) return null;

  // Send Firebase Email Link to user's Gmail
  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) { setError('Full Name is required'); return; }
    if (!prn.trim())      { setError('PRN Number is required'); return; }
    if (!email.trim())    { setError('Gmail ID is required'); return; }
    if (!isGmail(email)) {
      setError('Only @gmail.com addresses are allowed.');
      return;
    }

    setError('');
    setLoading(true);

    // Mark this tab as the origin tab so secondary tabs close themselves
    sessionStorage.setItem('is_auth_origin_tab', 'true');

    // Build URL with verify_email param so email is preserved in all browser contexts
    const targetUrl = new URL(window.location.href);
    targetUrl.searchParams.set('verify_email', email.trim().toLowerCase());

    const actionCodeSettings = {
      url: targetUrl.toString(),
      handleCodeInApp: true,
    };

    try {
      await sendSignInLinkToEmail(auth, email.trim().toLowerCase(), actionCodeSettings);
      localStorage.setItem('emailForSignIn', email.trim().toLowerCase());
      localStorage.setItem('pending_auth_name', fullName.trim());
      localStorage.setItem('pending_auth_prn', prn.trim().toUpperCase());
      setEmailSent(true);
    } catch (err) {
      console.error('Send email link error:', err);
      if (err.code === 'auth/unauthorized-domain') {
        setError('Domain not authorized. Add this domain in Firebase Console > Authentication > Authorized domains.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email. Please enter a valid Gmail address.');
      } else {
        setError(err.message || 'Failed to send sign-in link. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Email Sent Minimal View (Simplified, no clutter/paragraphs) ───────────
  if (emailSent) {
    return (
      <div className="student-modal-overlay" onClick={onClose}>
        <div className="student-modal-card card" onClick={(e) => e.stopPropagation()}>
          <div className="student-modal-header">
            <h2 className="student-modal-title">Verify Email</h2>
            <button className="student-modal-close" onClick={onClose} aria-label="Close modal">✕</button>
          </div>
          <div className="card__body" style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
            <div className="student-email-waiting">
              <div className="spinner mb-3" style={{ width: '28px', height: '28px', margin: '0 auto var(--space-3)' }}></div>
              <p style={{ fontWeight: 600, color: '#000', marginBottom: '6px', fontSize: '0.95rem' }}>
                Verification link sent to <span style={{ fontFamily: 'var(--font-mono)' }}>{email}</span>
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 var(--space-4)' }}>
                Waiting for verification...
              </p>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => { setEmailSent(false); setEmail(''); }}
              >
                Change Email
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Form ─────────────────────────────────────────────────────────────
  return (
    <div className="student-modal-overlay" onClick={onClose}>
      <div className="student-modal-card card" onClick={(e) => e.stopPropagation()}>
        <div className="student-modal-header">
          <h2 className="student-modal-title">Participant Login</h2>
          <button className="student-modal-close" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        <div className="card__body" style={{ padding: 'var(--space-6)' }}>
          {error && (
            <div className="alert alert--error mb-4" role="alert">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleEmailSignIn} className="student-login-form">
            <div className="form-group">
              <label className="form-label form-label--required">Full Name</label>
              <input
                type="text"
                className="form-input"
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); if (error) setError(''); }}
                placeholder="Enter your full name"
                autoComplete="off"
                autoFocus
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label form-label--required">PRN Number</label>
              <input
                type="text"
                className="form-input font-mono"
                value={prn}
                onChange={(e) => { setPrn(e.target.value); if (error) setError(''); }}
                placeholder="e.g. IT250B1016"
                autoComplete="off"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label form-label--required">Gmail ID</label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (error) setError(''); }}
                placeholder="yourname@gmail.com"
                autoComplete="off"
                required
              />
              <span className="form-hint">Only @gmail.com addresses are accepted</span>
            </div>

            <div className="student-modal-actions">
              <button
                type="submit"
                className={`btn btn--primary btn--full ${loading ? 'btn--loading' : ''}`}
                disabled={loading}
              >
                {loading ? '' : 'Send Verification Link'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
