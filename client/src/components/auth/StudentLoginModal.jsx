import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/client';
import { useStudent } from '../../context/StudentAuthContext';
import './StudentLoginModal.css';

const isValidEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());

export default function StudentLoginModal({ isOpen, onClose, onSuccess }) {
  const { registerWithPRN, loginWithPRN } = useStudent();

  // Mode: 'LOGIN', 'REGISTER', 'REGISTER_PENDING', or 'FORGOT_PASSWORD'
  const [tab, setTab] = useState('LOGIN');

  // Login Form Fields
  const [loginPrn, setLoginPrn] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register Form Fields
  const [fullName, setFullName] = useState('');
  const [registerPrn, setRegisterPrn] = useState('');
  const [email, setEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Pending Approval State
  const [pendingStudent, setPendingStudent] = useState(null);

  // Forgot Password Fields
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 🔒 Prevent background scrolling on both html and body (cross-browser)
  useEffect(() => {
    if (isOpen) {
      document.documentElement.classList.add('modal-open');
      document.body.classList.add('modal-open');
      return () => {
        document.documentElement.classList.remove('modal-open');
        document.body.classList.remove('modal-open');
      };
    }
  }, [isOpen]);

  // Reset fields when modal closes
  useEffect(() => {
    if (!isOpen) {
      setLoginPrn('');
      setLoginPassword('');
      setShowLoginPassword(false);
      setFullName('');
      setRegisterPrn('');
      setEmail('');
      setRegisterPassword('');
      setConfirmPassword('');
      setShowRegisterPassword(false);
      setShowConfirmPassword(false);
      setPendingStudent(null);
      setForgotIdentifier('');
      setForgotSuccess('');
      setError('');
      setLoading(false);
      setTab('LOGIN');
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
        setError('Invalid PRN or password. Click "Forgot password?" below if you forgot your credentials.');
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
      const res = await registerWithPRN({
        fullName: fullName.trim(),
        prn: registerPrn.trim(),
        email: email.trim(),
        password: registerPassword,
      });

      if (res?.pendingApproval) {
        setPendingStudent(res);
        setTab('REGISTER_PENDING');
        return;
      }

      if (onSuccess) onSuccess(res);
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

  // Handle Forgot Password
  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!forgotIdentifier.trim()) {
      setError('Please enter your PRN number or registered email.');
      return;
    }

    setError('');
    setForgotSuccess('');
    setLoading(true);

    try {
      const isEmail = isValidEmail(forgotIdentifier);
      const payload = isEmail
        ? { email: forgotIdentifier.trim(), role: 'student' }
        : { prn: forgotIdentifier.trim(), role: 'student' };

      const { data } = await apiClient.post('/auth/forgot-password', payload);
      setForgotSuccess(
        data.message || `Password reset link has been sent to ${data.email}. Please check your inbox and spam folder.`
      );
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.message ||
        'Could not send reset email. Please ensure your PRN is registered or contact support.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="student-modal-overlay" onClick={onClose}>
      <div className="student-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="student-modal-header">
          <div className="student-modal-title-group">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
              <span className="section__label" style={{ marginBottom: 0 }}>
                STUDENT PORTAL
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Option 1 of 3</span>
            </div>
            <h2 className="student-modal-title">
              {tab === 'LOGIN' && 'Sign In to Your Account'}
              {tab === 'REGISTER' && 'Create Student Account'}
              {tab === 'REGISTER_PENDING' && 'Request Submitted'}
              {tab === 'FORGOT_PASSWORD' && 'Reset Your Password'}
            </h2>
          </div>
          <button
            type="button"
            className="student-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher (Only in Login or Register) */}
        {tab === 'LOGIN' || tab === 'REGISTER' ? (
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
        ) : tab === 'FORGOT_PASSWORD' ? (
          <div style={{ padding: 'var(--space-2) var(--space-6)', borderBottom: '1px solid var(--border)', background: '#fafafa' }}>
            <button
              type="button"
              onClick={() => { setTab('LOGIN'); setError(''); setForgotSuccess(''); }}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, padding: '4px 0' }}
            >
              ← Back to Sign In
            </button>
          </div>
        ) : null}

        <div className="card__body" style={{ padding: 'var(--space-6)' }}>
          {error && (
            <div className="alert alert--error mb-4" role="alert">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {forgotSuccess && (
            <div className="alert alert--success mb-4" role="alert">
              <span>✓</span>
              <span>{forgotSuccess}</span>
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
                <div className="password-input-wrapper">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    className="form-input"
                    value={loginPassword}
                    onChange={(e) => { setLoginPassword(e.target.value); if (error) setError(''); }}
                    placeholder=""
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    title={showLoginPassword ? 'Hide password' : 'Show password'}
                    aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                  >
                    {showLoginPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-8px', marginBottom: 'var(--space-3)' }}>
                <button
                  type="button"
                  onClick={() => { setTab('FORGOT_PASSWORD'); setError(''); setForgotSuccess(''); }}
                  style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  Forgot password?
                </button>
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
                  placeholder=""
                  autoComplete="name"
                  autoFocus
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label form-label--required">PRN Number</label>
                <input
                  type="text"
                  className="form-input font-mono"
                  value={registerPrn}
                  onChange={(e) => { setRegisterPrn(e.target.value); if (error) setError(''); }}
                  placeholder=""
                  autoComplete="off"
                  required
                />
                <span className="form-hint">Official College PRN (e.g. IT250B1016)</span>
              </div>

              <div className="form-group">
                <label className="form-label form-label--required">Personal Email ID</label>
                <input
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (error) setError(''); }}
                  placeholder=""
                  autoComplete="email"
                  required
                />
                <span className="form-hint">Event updates and confirmations will be sent here</span>
              </div>

              <div className="form-group">
                <label className="form-label form-label--required">Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showRegisterPassword ? 'text' : 'password'}
                    className="form-input"
                    value={registerPassword}
                    onChange={(e) => { setRegisterPassword(e.target.value); if (error) setError(''); }}
                    placeholder=""
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                    title={showRegisterPassword ? 'Hide password' : 'Show password'}
                    aria-label={showRegisterPassword ? 'Hide password' : 'Show password'}
                  >
                    {showRegisterPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                <span className="form-hint">At least 6 characters</span>
              </div>

              <div className="form-group">
                <label className="form-label form-label--required">Confirm Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="form-input"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); if (error) setError(''); }}
                    placeholder=""
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div className="student-modal-actions">
                <button
                  type="submit"
                  className={`btn btn--primary btn--full ${loading ? 'btn--loading' : ''}`}
                  disabled={loading}
                >
                  {loading ? '' : 'Submit Registration for Approval'}
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

          {/* ─── Tab 3: REGISTER PENDING APPROVAL CONFIRMATION ─────── */}
          {tab === 'REGISTER_PENDING' && pendingStudent && (
            <div className="approval-pending-card">
              <div className="approval-pending-icon">⏳</div>
              <h3 className="approval-pending-title">Account Request Sent!</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '8px 0' }}>
                Thank you, <strong>{pendingStudent.fullName}</strong>. Your student account registration has been submitted to the Administrator for verification.
              </p>

              <div className="approval-pending-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span className="text-muted">PRN Number:</span>
                  <span className="font-mono fw-bold">{pendingStudent.prn}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span className="text-muted">Registered Email:</span>
                  <span className="font-mono fw-bold">{pendingStudent.email}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Status:</span>
                  <span className="badge badge--warning">🟡 AWAITING ADMIN APPROVAL</span>
                </div>
              </div>

              <div className="approval-pending-privacy">
                <strong>🔒 Privacy Guarantee:</strong> Your password is cryptographically protected and will never be visible to the administrator. Once approved, you can sign in directly with your PRN and password.
              </div>

              <button
                type="button"
                className="btn btn--primary btn--full"
                onClick={() => {
                  setTab('LOGIN');
                  setLoginPrn(pendingStudent.prn);
                  setPendingStudent(null);
                }}
              >
                Go to Sign In
              </button>
            </div>
          )}

          {/* ─── Tab 4: FORGOT PASSWORD ────────────────────────────── */}
          {tab === 'FORGOT_PASSWORD' && (
            <form onSubmit={handleForgotPasswordSubmit} className="student-login-form">
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 'var(--space-4)', lineHeight: 1.5 }}>
                Enter your <strong>PRN number</strong> or <strong>registered email address</strong>. We will send a secure password reset link to your email.
              </p>

              <div className="form-group">
                <label className="form-label form-label--required">PRN Number or Registered Email</label>
                <input
                  type="text"
                  className="form-input font-mono"
                  value={forgotIdentifier}
                  onChange={(e) => { setForgotIdentifier(e.target.value); setError(''); setForgotSuccess(''); }}
                  placeholder=""
                  autoFocus
                  required
                />
              </div>

              <div className="student-modal-actions">
                <button
                  type="submit"
                  className={`btn btn--primary btn--full ${loading ? 'btn--loading' : ''}`}
                  disabled={loading}
                >
                  {loading ? '' : 'Send Password Reset Link'}
                </button>
              </div>

              <div className="student-modal-switch-text">
                Remember your password?{' '}
                <button
                  type="button"
                  className="student-modal-switch-btn"
                  onClick={() => { setTab('LOGIN'); setError(''); setForgotSuccess(''); }}
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}

          {/* ─── Unified 3 Portals Switcher ─────────────────────────── */}
          <div className="student-modal-portal-switch">
            <span>Looking for other portals?</span>
            <div className="student-modal-portal-links">
              <a href="/teacher/login" onClick={onClose}>
                👨‍🏫 Teacher Portal
              </a>
              <span style={{ color: 'var(--border-strong)' }}>•</span>
              <a href="/admin/login" onClick={onClose}>
                ⚡ Admin Portal
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
