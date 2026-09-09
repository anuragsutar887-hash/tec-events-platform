import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import apiClient from '../../api/client';
import './Login.css';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [isForgot, setIsForgot] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Try Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      
      localStorage.setItem('admin_token', await userCredential.user.getIdToken());
      localStorage.setItem('admin_user', JSON.stringify({
        email: userCredential.user.email,
        uid: userCredential.user.uid,
        role: 'COMMITTEE_ADMIN'
      }));

      navigate('/admin');
    } catch (err) {
      console.warn('Firebase Auth notice, attempting admin credentials check:', err.code);

      // 2. Fallback to Platform Admin credentials & custom reset password
      const storedAdminPass = typeof localStorage !== 'undefined' ? localStorage.getItem('tec_admin_password') : null;
      const cleanEmail = email.trim().toLowerCase();
      const isAllowedEmail = cleanEmail === 'admin' || cleanEmail === 'admin@indiraicem.ac.in' || cleanEmail === 'admin@college.edu';
      const isDefaultPass = password === 'admin123' || password === 'admin';
      const isCustomPass = storedAdminPass && password === storedAdminPass;

      if (isAllowedEmail && (isDefaultPass || isCustomPass)) {
        localStorage.setItem('admin_token', 'admin_session_' + Date.now());
        localStorage.setItem('admin_user', JSON.stringify({
          email: cleanEmail,
          role: 'COMMITTEE_ADMIN'
        }));
        navigate('/admin');
        return;
      }

      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('Invalid committee email or password. Click "Forgot password?" if you need to reset.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please wait a moment and try again.');
      } else {
        setError(err.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setError('Please enter your committee email address.');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const { data } = await apiClient.post('/auth/forgot-password', {
        email: forgotEmail.trim(),
        role: 'admin',
      });
      setSuccess(data.message || `Password reset email sent to ${data.email}! Check your inbox and spam folder.`);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to dispatch password reset email.');
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

          <h1 className="login-card__title">
            {isForgot ? 'PASSWORD RECOVERY' : 'COMMITTEE ACCESS'}
          </h1>

          {error && (
            <div className="alert alert--error mb-4" role="alert">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="alert alert--success mb-4" role="alert">
              <span>✓</span>
              <span>{success}</span>
            </div>
          )}

          {!isForgot ? (
            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Committee Email
                </label>
                <input
                  id="email"
                  type="text"
                  className="form-input login-form__input"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (error) setError(''); }}
                  autoComplete="off"
                  placeholder=""
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
                  onChange={(e) => { setPassword(e.target.value); if (error) setError(''); }}
                  autoComplete="current-password"
                  placeholder=""
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-6px', marginBottom: 'var(--space-2)' }}>
                <button
                  type="button"
                  onClick={() => { setIsForgot(true); setError(''); setSuccess(''); }}
                  style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                className={`btn btn--primary btn--full btn--lg login-form__submit ${loading ? 'btn--loading' : ''}`}
                disabled={loading}
              >
                {loading ? (
                  <div className="login-buffer">
                    <span className="spinner-dots">●</span>
                    <span className="spinner-dots">●</span>
                    <span className="spinner-dots">●</span>
                  </div>
                ) : (
                  'SIGN IN'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleForgotSubmit} className="login-form">
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 'var(--space-4)', lineHeight: 1.5 }}>
                Enter your registered <strong>Committee Email</strong> address. We will send a secure password reset link to your email.
              </p>

              <div className="form-group">
                <label htmlFor="forgot-email" className="form-label">
                  Committee Email Address
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  className="form-input login-form__input"
                  value={forgotEmail}
                  onChange={(e) => { setForgotEmail(e.target.value); if (error) setError(''); }}
                  placeholder=""
                  autoFocus
                  required
                />
              </div>

              <button
                type="submit"
                className={`btn btn--primary btn--full btn--lg login-form__submit ${loading ? 'btn--loading' : ''}`}
                disabled={loading}
              >
                {loading ? 'SENDING LINK...' : 'SEND RESET LINK'}
              </button>

              <div style={{ textAlign: 'center', marginTop: 'var(--space-4)' }}>
                <button
                  type="button"
                  onClick={() => { setIsForgot(false); setError(''); setSuccess(''); }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  ← Back to Sign In
                </button>
              </div>
            </form>
          )}

          <div className="login-card__footer">
            <Link to="/" className="login-card__back">
              ← Return to public site
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
