import { useState, useEffect } from 'react';
import { useStudent } from '../../context/StudentAuthContext';
import './StudentLoginModal.css';

const isValidEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());

export default function StudentLoginModal({ isOpen, onClose, onSuccess }) {
  const { registerWithPRN, loginWithPRN } = useStudent();

  // Mode: 'LOGIN' or 'REGISTER'
  const [tab, setTab] = useState('LOGIN');

  // Login Form Fields
  const [loginPrn, setLoginPrn] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register Form Fields
  const [fullName, setFullName] = useState('');
  const [registerPrn, setRegisterPrn] = useState('');
  const [email, setEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      setLoginPrn('');
      setLoginPassword('');
      setFullName('');
      setRegisterPrn('');
      setEmail('');
      setRegisterPassword('');
      setConfirmPassword('');
      setError('');
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Login with PRN + Password
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginPrn.trim()) {
      setError('Please enter your PRN number.');
      return;
    }
    if (!loginPassword) {
      setError('Please enter your password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const userData = await loginWithPRN({
        prn: loginPrn.trim(),
        password: loginPassword,
      });
      if (onSuccess) onSuccess(userData);
      onClose();
    } catch (err) {
      console.error('Login error:', err);
      const code = err.code || '';
      if (
        code === 'auth/invalid-credential' ||
        code === 'auth/user-not-found' ||
        code === 'auth/wrong-password'
      ) {
        setError('Invalid PRN or password. If you are new, click "Create Account" below.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please wait a moment and try again.');
      } else {
        setError(err.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Account Registration with Full Name, PRN, Email, Password
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();

    if (!fullName.trim()) {
      setError('Full Name is required.');
      return;
    }
    if (!registerPrn.trim()) {
      setError('PRN number is required.');
      return;
    }
    if (!email.trim() || !isValidEmail(email)) {
      setError('Please enter a valid email address for notifications.');
      return;
    }
    if (!registerPassword) {
      setError('Password is required.');
      return;
    }
    if (registerPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (registerPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const userData = await registerWithPRN({
        fullName: fullName.trim(),
        prn: registerPrn.trim(),
        email: email.trim(),
        password: registerPassword,
      });
      if (onSuccess) onSuccess(userData);
      onClose();
    } catch (err) {
      console.error('Registration error:', err);
      const code = err.code || '';
      if (code === 'auth/email-already-in-use') {
        setError(`An account with PRN "${registerPrn.trim().toUpperCase()}" already exists. Please Sign In.`);
      } else if (code === 'auth/weak-password') {
        setError('Password is too weak. Please use at least 6 characters.');
      } else {
        setError(err.message || 'Failed to create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="student-modal-overlay" onClick={onClose}>
      <div className="student-modal-card card" onClick={(e) => e.stopPropagation()}>
        {/* Header with Title & Close */}
        <div className="student-modal-header">
          <div>
            <h2 className="student-modal-title">
              {tab === 'LOGIN' ? 'Participant Sign In' : 'Create Account'}
            </h2>
            <p className="student-modal-subtitle">
              {tab === 'LOGIN'
                ? 'Sign in with your student PRN and password'
                : 'Register your account using your PRN'}
            </p>
          </div>
          <button className="student-modal-close" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        {/* Tab Switcher: Sign In vs Create Account */}
        <div className="student-modal-tabs">
          <button
            type="button"
            className={`student-modal-tab ${tab === 'LOGIN' ? 'active' : ''}`}
            onClick={() => { setTab('LOGIN'); setError(''); }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`student-modal-tab ${tab === 'REGISTER' ? 'active' : ''}`}
            onClick={() => { setTab('REGISTER'); setError(''); }}
          >
            Create Account
          </button>
        </div>

        <div className="card__body" style={{ padding: 'var(--space-6)' }}>
          {error && (
            <div className="alert alert--error mb-4" role="alert">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* ─── Tab 1: SIGN IN ────────────────────────────────────── */}
          {tab === 'LOGIN' && (
            <form onSubmit={handleLoginSubmit} className="student-login-form">
              <div className="form-group">
                <label className="form-label form-label--required">PRN Number</label>
                <input
                  type="text"
                  className="form-input font-mono"
                  value={loginPrn}
                  onChange={(e) => { setLoginPrn(e.target.value); if (error) setError(''); }}
                  placeholder=""
                  autoComplete="username"
                  autoFocus
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label form-label--required">Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={loginPassword}
                  onChange={(e) => { setLoginPassword(e.target.value); if (error) setError(''); }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>

              <div className="student-modal-actions">
                <button
                  type="submit"
                  className={`btn btn--primary btn--full ${loading ? 'btn--loading' : ''}`}
                  disabled={loading}
                >
                  {loading ? '' : 'Sign In'}
                </button>
              </div>

              <div className="student-modal-switch-text">
                Don't have an account?{' '}
                <button
                  type="button"
                  className="student-modal-switch-btn"
                  onClick={() => { setTab('REGISTER'); setError(''); }}
                >
                  Create Account
                </button>
              </div>
            </form>
          )}

          {/* ─── Tab 2: CREATE ACCOUNT ─────────────────────────────── */}
          {tab === 'REGISTER' && (
            <form onSubmit={handleRegisterSubmit} className="student-login-form">
              <div className="form-group">
                <label className="form-label form-label--required">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={fullName}
                  onChange={(e) => { setFullName(e.target.value); if (error) setError(''); }}
                  placeholder="e.g. Anurag Sutar"
                  autoComplete="name"
                  autoFocus
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label form-label--required">PRN Number (Registration)</label>
                <input
                  type="text"
                  className="form-input font-mono"
                  value={registerPrn}
                  onChange={(e) => { setRegisterPrn(e.target.value); if (error) setError(''); }}
                  placeholder=""
                  autoComplete="off"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label form-label--required">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (error) setError(''); }}
                  placeholder="e.g. anuragsutar887@gmail.com"
                  autoComplete="email"
                  required
                />
                <span className="form-hint">Used for event messages & teammate notifications</span>
              </div>

              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <div className="form-group">
                  <label className="form-label form-label--required">Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={registerPassword}
                    onChange={(e) => { setRegisterPassword(e.target.value); if (error) setError(''); }}
                    placeholder="Min 6 characters"
                    autoComplete="new-password"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label form-label--required">Confirm Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); if (error) setError(''); }}
                    placeholder="Repeat password"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>

              <div className="student-modal-actions">
                <button
                  type="submit"
                  className={`btn btn--primary btn--full ${loading ? 'btn--loading' : ''}`}
                  disabled={loading}
                >
                  {loading ? '' : 'Create Account & Sign In'}
                </button>
              </div>

              <div className="student-modal-switch-text">
                Already have an account?{' '}
                <button
                  type="button"
                  className="student-modal-switch-btn"
                  onClick={() => { setTab('LOGIN'); setError(''); }}
                >
                  Sign In
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

