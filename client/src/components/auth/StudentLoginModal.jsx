import { useState, useEffect } from 'react';
import {
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
} from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useStudent } from '../../context/StudentAuthContext';
import './StudentLoginModal.css';

const isGmail = (val) => /^[^\s@]+@gmail\.com$/i.test(val.trim());

export default function StudentLoginModal({ isOpen, onClose, onSuccess }) {
  const { login } = useStudent();
  const [fullName, setFullName] = useState('');
  const [prn, setPrn] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

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

  // Handle Firebase Email Link sign-in — fires when user returns from email link in SAME TAB
  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      const savedEmail = localStorage.getItem('emailForSignIn') || '';
      const savedName  = localStorage.getItem('pending_auth_name') || '';
      const savedPrn   = localStorage.getItem('pending_auth_prn') || '';

      if (savedEmail) {
        setLoading(true);
        signInWithEmailLink(auth, savedEmail, window.location.href)
          .then((result) => {
            localStorage.removeItem('emailForSignIn');
            localStorage.removeItem('pending_auth_name');
            localStorage.removeItem('pending_auth_prn');
            // Clean URL without reload so user stays on same page
            window.history.replaceState({}, document.title, window.location.pathname);

            const userData = {
              full_name: savedName || result.user.displayName || 'Participant',
              email: result.user.email.toLowerCase(),
              prn: (savedPrn || '').toUpperCase(),
              uid: result.user.uid,
              photoURL: result.user.photoURL || '',
              logged_in_at: new Date().toISOString(),
            };

            login(userData);
            if (onSuccess) onSuccess(userData);
            onClose();
          })
          .catch((err) => {
            console.error('Email link sign-in error:', err);
            setError('Sign-in link is invalid or expired. Please request a new one.');
            setLoading(false);
          });
      }
    }
  }, [login, onSuccess, onClose]);

  if (!isOpen) return null;

  // Send Firebase Email Link to user's Gmail — opens in same tab via handleCodeInApp: true
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

    // url = current page URL — Firebase redirects back here (same tab) after email click
    const actionCodeSettings = {
      url: window.location.href,
      handleCodeInApp: true,   // opens inside the app (same tab), NOT a new browser tab
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

  // ── Email Sent Confirmation View ──────────────────────────────────────────
  if (emailSent) {
    return (
      <div className="student-modal-overlay" onClick={onClose}>
        <div className="student-modal-card card" onClick={(e) => e.stopPropagation()}>
          <div className="student-modal-header">
            <h2 className="student-modal-title">Check Your Gmail</h2>
            <button className="student-modal-close" onClick={onClose} aria-label="Close modal">✕</button>
          </div>
          <div className="card__body" style={{ padding: 'var(--space-6)' }}>
            <div className="student-email-sent">
              <div className="student-email-sent__icon">📧</div>
              <h3 className="student-email-sent__heading">Verify your email</h3>
              <p className="student-email-sent__text">
                We sent a <strong>Verify Email</strong> link to <strong>{email}</strong>.
                Open your Gmail and click <strong>"Verify Email"</strong> — you'll be
                logged in automatically in this same tab.
              </p>
              <p className="student-email-sent__note">
                Link expires in 1 hour. Check spam/promotions if you don't see it.
              </p>
              <button
                className="btn btn--secondary btn--full"
                style={{ marginTop: 'var(--space-4)' }}
                onClick={() => { setEmailSent(false); setEmail(''); }}
              >
                Use a different email
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
