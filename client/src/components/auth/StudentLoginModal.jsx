import { useState, useEffect } from 'react';
import {
  signInWithRedirect,
  getRedirectResult,
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
} from 'firebase/auth';
import { auth, googleProvider } from '../../lib/firebase';
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

  // Handle Google Redirect result on page load
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result && result.user && result.user.email) {
          const savedName = localStorage.getItem('pending_auth_name') || '';
          const savedPrn = localStorage.getItem('pending_auth_prn') || '';
          localStorage.removeItem('pending_auth_name');
          localStorage.removeItem('pending_auth_prn');

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
        }
      })
      .catch((err) => {
        console.error('Redirect result error:', err);
      });
  }, [login, onSuccess, onClose]);

  // Handle Firebase Email Link sign-in (when user comes back from email)
  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      const savedEmail = localStorage.getItem('emailForSignIn') || '';
      const savedName = localStorage.getItem('pending_auth_name') || '';
      const savedPrn = localStorage.getItem('pending_auth_prn') || '';

      if (savedEmail) {
        setLoading(true);
        signInWithEmailLink(auth, savedEmail, window.location.href)
          .then((result) => {
            localStorage.removeItem('emailForSignIn');
            localStorage.removeItem('pending_auth_name');
            localStorage.removeItem('pending_auth_prn');
            // Clean up the URL
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
            setError('Sign-in link is invalid or expired. Please try again.');
            setLoading(false);
          });
      }
    }
  }, [login, onSuccess, onClose]);

  if (!isOpen) return null;

  // Send Firebase Email Link to user's Gmail
  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) { setError('Full Name is required'); return; }
    if (!prn.trim()) { setError('PRN Number is required'); return; }
    if (!email.trim()) { setError('Gmail ID is required'); return; }
    if (!isGmail(email)) {
      setError('Only @gmail.com emails are allowed. Please enter a valid Gmail address.');
      return;
    }

    setError('');
    setLoading(true);

    const actionCodeSettings = {
      url: window.location.origin + window.location.pathname,
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
        setError('Domain not authorized. Please add this domain in Firebase Console > Authentication > Authorized domains.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address. Please enter a valid Gmail.');
      } else {
        setError(err.message || 'Failed to send sign-in link. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Google Sign-In using redirect (no popup — avoids popup blocked issues)
  const handleGoogleSignIn = () => {
    if (!fullName.trim()) { setError('Full Name is required'); return; }
    if (!prn.trim()) { setError('PRN Number is required'); return; }

    setError('');
    setLoading(true);
    localStorage.setItem('pending_auth_name', fullName.trim());
    localStorage.setItem('pending_auth_prn', prn.trim().toUpperCase());

    signInWithRedirect(auth, googleProvider).catch((err) => {
      console.error('Google redirect error:', err);
      setError(err.message || 'Could not redirect to Google. Please try again.');
      setLoading(false);
    });
  };

  // "Email sent" confirmation view
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
              <h3 className="student-email-sent__heading">Sign-in link sent!</h3>
              <p className="student-email-sent__text">
                We sent a sign-in link to <strong>{email}</strong>.
                Open your Gmail and click the link to complete sign-in.
              </p>
              <p className="student-email-sent__note">
                The link expires in 1 hour. Check your spam folder if you don't see it.
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

  return (
    <div className="student-modal-overlay" onClick={onClose}>
      <div className="student-modal-card card" onClick={(e) => e.stopPropagation()}>
        <div className="student-modal-header">
          <div>
            <h2 className="student-modal-title">Participant Login</h2>
          </div>
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
                {loading ? '' : 'Send Sign-In Link'}
              </button>
            </div>

            <div className="student-login-divider">
              <span>OR</span>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              className={`btn btn--google btn--full ${loading ? 'btn--loading' : ''}`}
              disabled={loading}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              Continue with Google
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
