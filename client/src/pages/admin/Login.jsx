import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../../lib/firebase';
import './Login.css';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // ⚡ Real Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      
      // Store session for admin layout
      localStorage.setItem('admin_token', await userCredential.user.getIdToken());
      localStorage.setItem('admin_user', JSON.stringify({
        email: userCredential.user.email,
        uid: userCredential.user.uid,
        role: 'COMMITTEE_ADMIN'
      }));

      navigate('/admin');
    } catch (err) {
      console.error('Firebase Auth Error:', err.code, err.message);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('Invalid committee email or password. Please check your credentials.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please wait a moment and try again.');
      } else {
        setError(`Login failed: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      localStorage.setItem('admin_token', await userCredential.user.getIdToken());
      localStorage.setItem('admin_user', JSON.stringify({
        email: userCredential.user.email,
        uid: userCredential.user.uid,
        role: 'COMMITTEE_ADMIN'
      }));
      navigate('/admin');
    } catch (err) {
      console.error('Google Auth Error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        // User closed popup, no error needed
      } else if (err.code === 'auth/popup-blocked') {
        setError('Popup was blocked by your browser. Please allow popups and try again.');
      } else {
        setError(`Google login failed: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-card__header">
            <div className="login-card__logo-serif">TECH EVENTS</div>
          </div>

          <h1 className="login-card__title">COMMITTEE ACCESS</h1>

          {error && (
            <div className="alert alert--error mb-4" role="alert">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Committee Email
              </label>
              <input
                id="email"
                type="email"
                className="form-input login-form__input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="form-input login-form__input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="off"
                required
              />
            </div>

            <button
              type="submit"
              className={`btn btn--primary btn--full btn--lg login-form__submit ${loading ? 'btn--loading' : ''}`}
              disabled={loading}
            >
              {loading ? (
                <div className="login-buffer">
                  <div className="spinner spinner--white"></div>
                </div>
              ) : (
                'INITIALIZE SESSION'
              )}
            </button>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="btn btn--secondary btn--full btn--lg"
              disabled={loading}
              style={{ marginTop: 'var(--space-2)' }}
            >
              Sign In with Google
            </button>
          </form>

          <div className="login-card__footer">
            <Link to="/" className="login-card__back-link">
              Return to Public Site
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}