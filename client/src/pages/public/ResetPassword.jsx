import { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';

export default function ResetPassword({ isAdminView = false }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const type = searchParams.get('type') || (isAdminView ? 'admin' : 'student');
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';
  const prn = searchParams.get('prn') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!newPassword) {
      setError('Please enter a new password.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/reset-password', {
        token,
        newPassword,
        email,
        prn,
        role: type,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to reset password. Please try again or request a new link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-8) var(--space-4)' }}>
      <div className="card" style={{ maxWidth: '440px', width: '100%', border: '2px solid #000000', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
        {/* Header */}
        <div style={{ background: '#000000', color: '#ffffff', padding: 'var(--space-6)', borderBottom: '1px solid #27272a' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.1em', color: '#a1a1aa', textTransform: 'uppercase', marginBottom: '4px' }}>
            {type === 'admin' ? 'COMMITTEE ACCESS' : 'STUDENT PORTAL'} // SECURITY
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', fontWeight: 800, margin: 0, textTransform: 'uppercase' }}>
            SET NEW PASSWORD
          </h1>
          {(email || prn) && (
            <p style={{ color: '#a1a1aa', fontSize: '0.825rem', margin: '6px 0 0 0', fontFamily: 'var(--font-mono)' }}>
              Account: {prn ? `PRN ${prn}` : email}
            </p>
          )}
        </div>

        <div className="card__body" style={{ padding: 'var(--space-6)' }}>
          {error && (
            <div className="alert alert--error mb-4" role="alert">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-4) 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: 'var(--space-3)' }}>🎉</div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', fontWeight: 800, color: '#000000', marginBottom: '8px' }}>
                PASSWORD UPDATED!
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--space-6)', lineHeight: 1.5 }}>
                Your password has been successfully reset. You can now sign in to your account with your new password.
              </p>

              <Link
                to={type === 'admin' ? '/admin/login' : '/login'}
                className="btn btn--primary btn--full btn--lg"
              >
                {type === 'admin' ? 'Proceed to Committee Login →' : 'Proceed to Student Sign In →'}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 'var(--space-4)', lineHeight: 1.5 }}>
                Create a strong password that you do not use on other websites.
              </p>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label form-label--required">New Password</label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); if (error) setError(''); }}
                  placeholder=""
                  autoFocus
                  required
                />
                <span className="form-hint">At least 6 characters</span>
              </div>

              <div className="form-group">
                <label className="form-label form-label--required">Confirm New Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); if (error) setError(''); }}
                  placeholder=""
                  required
                />
              </div>

              <button
                type="submit"
                className={`btn btn--primary btn--full btn--lg mt-4 ${loading ? 'btn--loading' : ''}`}
                disabled={loading}
              >
                {loading ? '' : 'SAVE NEW PASSWORD'}
              </button>

              <div style={{ textAlign: 'center', marginTop: 'var(--space-4)' }}>
                <Link
                  to={type === 'admin' ? '/admin/login' : '/login'}
                  style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textDecoration: 'none' }}
                >
                  ← Return to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
