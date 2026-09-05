import { useState, useEffect } from 'react';
import { signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { auth, googleProvider } from '../../lib/firebase';
import { useStudent } from '../../context/StudentAuthContext';
import './StudentLoginModal.css';

export default function StudentLoginModal({ isOpen, onClose, onSuccess }) {
  const { login } = useStudent();
  const [fullName, setFullName] = useState('');
  const [prn, setPrn] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRedirectFallback, setShowRedirectFallback] = useState(false);

  // Reset fields when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setFullName('');
      setPrn('');
      setError('');
      setLoading(false);
      setShowRedirectFallback(false);
    }
  }, [isOpen]);

  // Check if user just returned from Google Redirect
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
            college: 'Indira College of Engineering & Management',
            logged_in_at: new Date().toISOString(),
          };

          login(userData);
          if (onSuccess) onSuccess(userData);
          onClose();
        }
      })
      .catch((err) => {
        console.error('Redirect result error in modal:', err);
      });
  }, [login, onSuccess, onClose]);

  if (!isOpen) return null;

  const validate = () => {
    if (!fullName.trim()) {
      setError('Full Name is required');
      return false;
    }
    if (!prn.trim()) {
      setError('PRN Number is required');
      return false;
    }
    return true;
  };

  const handleGoogleSignIn = (e) => {
    if (e) e.preventDefault();
    if (!validate()) return;

    setError('');
    setLoading(true);
    setShowRedirectFallback(false);

    // Persist pending credentials so redirect flow has access to them
    localStorage.setItem('pending_auth_name', fullName.trim());
    localStorage.setItem('pending_auth_prn', prn.trim().toUpperCase());

    // Synchronous execution in direct user click context (avoids browser popup blocking)
    signInWithPopup(auth, googleProvider)
      .then((result) => {
        const user = result.user;
        if (!user || !user.email) {
          setError('No email found on Google account.');
          setLoading(false);
          return;
        }

        localStorage.removeItem('pending_auth_name');
        localStorage.removeItem('pending_auth_prn');

        const userData = {
          full_name: fullName.trim() || user.displayName || 'Participant',
          email: user.email.toLowerCase(),
          prn: prn.trim().toUpperCase(),
          uid: user.uid,
          photoURL: user.photoURL || '',
          college: 'Indira College of Engineering & Management',
          logged_in_at: new Date().toISOString(),
        };

        login(userData);
        if (onSuccess) onSuccess(userData);
        onClose();
        setLoading(false);
      })
      .catch((err) => {
        console.error('Firebase Google Auth Error:', err);
        setLoading(false);

        if (err.code === 'auth/popup-closed-by-user') {
          // User closed popup
        } else if (err.code === 'auth/popup-blocked') {
          setShowRedirectFallback(true);
          setError('Popup was blocked by your browser. Click "Continue with Google (Direct Redirect)" below.');
        } else if (err.code === 'auth/unauthorized-domain') {
          setError('Domain not authorized in Firebase. Please add this domain to Firebase Console > Authentication > Settings > Authorized domains.');
        } else {
          setError(err.message || 'Google authentication failed. Please try again.');
        }
      });
  };

  const handleDirectRedirect = (e) => {
    if (e) e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    localStorage.setItem('pending_auth_name', fullName.trim());
    localStorage.setItem('pending_auth_prn', prn.trim().toUpperCase());
    signInWithRedirect(auth, googleProvider).catch((err) => {
      setError(err.message || 'Could not redirect to Google.');
      setLoading(false);
    });
  };

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

          <form onSubmit={handleGoogleSignIn} className="student-login-form">
            <div className="form-group">
              <label className="form-label form-label--required">Full Name</label>
              <input
                type="text"
                className="form-input"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (error) setError('');
                }}
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
                onChange={(e) => {
                  setPrn(e.target.value);
                  if (error) setError('');
                }}
                autoComplete="off"
                required
              />
            </div>

            <div className="student-modal-actions">
              <button
                type="submit"
                className={`btn btn--google btn--full ${loading ? 'btn--loading' : ''}`}
                disabled={loading}
              >
                {loading ? (
                  <div className="spinner"></div>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    Sign In with Google
                  </>
                )}
              </button>
            </div>

            {showRedirectFallback && (
              <button
                type="button"
                onClick={handleDirectRedirect}
                className="btn btn--primary btn--full"
                style={{ marginTop: 'var(--space-3)' }}
                disabled={loading}
              >
                Continue with Google (Direct Redirect) →
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
