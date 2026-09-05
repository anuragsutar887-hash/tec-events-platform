import { useState, useEffect } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../../lib/firebase';
import { useStudent } from '../../context/StudentAuthContext';
import './StudentLoginModal.css';

export default function StudentLoginModal({ isOpen, onClose, onSuccess }) {
  const { login } = useStudent();
  const [prn, setPrn] = useState('');
  const [googleUser, setGoogleUser] = useState(null);
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset all fields when modal is closed so nothing remains stored
  useEffect(() => {
    if (!isOpen) {
      setPrn('');
      setGoogleUser(null);
      setFullName('');
      setError('');
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      if (!user.email) {
        setError('No email found on your Google account.');
        setLoading(false);
        return;
      }

      // If PRN was already provided in the input, immediately complete sign in
      if (prn.trim()) {
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
        return;
      }

      // Otherwise, save verified Google account and prompt for PRN
      setGoogleUser(user);
      setFullName(user.displayName || '');
      setLoading(false);
    } catch (err) {
      console.error('Firebase Google Auth Error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        // User closed popup
      } else if (err.code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Please allow popups and try again.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('Domain not authorized in Firebase Console. Please authorize this domain in Firebase settings.');
      } else {
        setError(err.message || 'Google authentication failed. Please try again.');
      }
      setLoading(false);
    }
  };

  const handleCompleteLogin = (e) => {
    e.preventDefault();
    if (!prn.trim()) {
      setError('PRN Number is required');
      return;
    }
    if (!googleUser) {
      setError('Please authenticate with Google first.');
      return;
    }

    const userData = {
      full_name: fullName.trim() || googleUser.displayName || 'Participant',
      email: googleUser.email.toLowerCase(),
      prn: prn.trim().toUpperCase(),
      uid: googleUser.uid,
      photoURL: googleUser.photoURL || '',
      college: 'Indira College of Engineering & Management',
      logged_in_at: new Date().toISOString(),
    };

    login(userData);
    if (onSuccess) onSuccess(userData);
    onClose();
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

          {!googleUser ? (
            <form onSubmit={handleGoogleSignIn} className="student-login-form">
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
                  autoFocus
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
            </form>
          ) : (
            <form onSubmit={handleCompleteLogin} className="student-login-form">
              <div className="form-group">
                <label className="form-label">Verified Gmail</label>
                <div className="form-input font-mono" style={{ background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{googleUser.email}</span>
                  <span style={{ color: '#16a34a', fontSize: '0.75rem', fontWeight: 'bold' }}>✓ Verified</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="off"
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
                  autoFocus
                  required
                />
              </div>

              <div className="student-modal-actions">
                <button
                  type="submit"
                  className="btn btn--primary btn--full"
                >
                  Complete Sign In
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
