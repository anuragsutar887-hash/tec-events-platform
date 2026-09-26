import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { teacherService } from '../../services/teacherService';
import './Login.css';

export default function TeacherLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/teacher';

  const [isRegister, setIsRegister] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('Information Technology');
  const [showPassword, setShowPassword] = useState(false);
  const [submittedPending, setSubmittedPending] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        if (!fullName.trim()) throw new Error('Full Name is required.');
        if (!email.trim()) throw new Error('Faculty Email is required.');
        if (password.length < 6) throw new Error('Password must be at least 6 characters.');
        const res = await teacherService.register({ fullName, email, password, department });
        if (res?.pendingApproval) {
          setSubmittedPending(res);
          return;
        }
      } else {
        await teacherService.login(email, password);
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail('teacher@indiraicem.ac.in');
    setPassword('teacher123');
    setIsRegister(false);
    setError('');
    setSubmittedPending(null);
  };

  return (
    <div className="teacher-login-page">
      <div className="teacher-login-card card">
        <div className="teacher-login-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span className="badge badge--bronze">FACULTY PORTAL</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Option 2 of 3</span>
          </div>
          <h1 className="teacher-login-title">
            {submittedPending
              ? 'Request Submitted'
              : isRegister
              ? 'Faculty Registration'
              : 'Teacher Sign In'}
          </h1>
          <p className="teacher-login-subtitle">
            {submittedPending
              ? 'Your faculty registration is awaiting administrator confirmation.'
              : isRegister
              ? 'Create a faculty account to manage questions, imports, and live tests.'
              : 'Sign in with your institutional credentials to access the Question Bank.'}
          </p>
        </div>

        <div className="card__body" style={{ padding: 'var(--space-6)' }}>
          {error && (
            <div className="alert alert--error mb-4" role="alert">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {submittedPending ? (
            <div className="approval-pending-card">
              <div className="approval-pending-icon">⏳</div>
              <h2 className="approval-pending-title">Account Request Sent!</h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '8px 0' }}>
                Thank you, <strong>{submittedPending.fullName}</strong>. Your faculty registration has been submitted to the Administrator for verification.
              </p>

              <div className="approval-pending-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span className="text-muted">Faculty Email:</span>
                  <span className="font-mono fw-bold">{submittedPending.email}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span className="text-muted">Department:</span>
                  <span className="fw-bold">{submittedPending.department}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-muted">Approval Status:</span>
                  <span className="badge badge--warning">🟡 PENDING CONFIRMATION</span>
                </div>
              </div>

              <div className="approval-pending-privacy">
                <strong>🔒 Privacy Guarantee:</strong> In accordance with zero-knowledge standards, your password is cryptographically secured and will never be disclosed to the administrator.
              </div>

              <button
                type="button"
                className="btn btn--primary btn--full"
                onClick={() => {
                  setSubmittedPending(null);
                  setIsRegister(false);
                  setPassword('');
                }}
              >
                Return to Faculty Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="teacher-login-form">
              {isRegister && (
                <>
                  <div className="form-group">
                    <label className="form-label form-label--required">Full Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Prof. Anjali Sharma"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label form-label--required">Department</label>
                    <select
                      className="form-input"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                    >
                      <option value="Information Technology">Information Technology</option>
                      <option value="Computer Engineering">Computer Engineering</option>
                      <option value="AI & Data Science">AI & Data Science</option>
                      <option value="Mechanical Engineering">Mechanical Engineering</option>
                      <option value="Civil Engineering">Civil Engineering</option>
                    </select>
                  </div>
                </>
              )}

              <div className="form-group">
                <label className="form-label form-label--required">Faculty Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="faculty@indiraicem.ac.in"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label form-label--required">Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? 'Hide password' : 'Show password'}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                {isRegister && <span className="form-hint">At least 6 characters</span>}
              </div>

              <button
                type="submit"
                className={`btn btn--primary btn--full ${loading ? 'btn--loading' : ''}`}
                disabled={loading}
                style={{ marginTop: 'var(--space-2)' }}
              >
                {loading ? '' : isRegister ? 'Submit Registration for Approval' : 'Sign In to Portal'}
              </button>
            </form>
          )}

          {!submittedPending && (
            <div style={{ marginTop: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem' }}>
              <button
                type="button"
                onClick={() => { setIsRegister(!isRegister); setError(''); }}
                style={{ background: 'none', border: 'none', color: '#000000', fontWeight: 700, textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
              >
                {isRegister ? 'Already registered? Sign In' : 'New Faculty? Register here'}
              </button>

              <button
                type="button"
                onClick={fillDemoCredentials}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.78rem', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Fill Demo Login
              </button>
            </div>
          )}

          {/* Unified 3 Portal Switcher */}
          <div className="portal-switcher-footer">
            <span className="portal-switcher-label">Switch to another portal:</span>
            <div className="portal-switcher-links">
              <Link to="/login" className="portal-switch-pill">
                🎓 Student Portal
              </Link>
              <Link to="/admin/login" className="portal-switch-pill">
                ⚡ Admin Portal
              </Link>
            </div>
            <div style={{ marginTop: 'var(--space-3)' }}>
              <Link to="/" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textDecoration: 'none' }}>
                ← Return to Public Homepage
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
