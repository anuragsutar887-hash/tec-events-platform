import { useState } from 'react';
import apiClient from '../../api/client';
import { useAuth } from '../../hooks/useAuth';
import './Settings.css';

export default function Settings() {
  const { admin } = useAuth();
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (form.new_password !== form.confirm_password) {
      setError('New passwords do not match');
      return;
    }
    if (form.new_password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      // Password change endpoint — basic implementation
      // In production, add a dedicated /auth/change-password endpoint
      setSuccess('Password change functionality requires a server-side endpoint. Add POST /auth/change-password to the backend.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-page">
      <h1 className="dashboard__title" style={{ marginBottom: 'var(--space-2)' }}>Settings</h1>
      <p className="dashboard__subtitle" style={{ marginBottom: 'var(--space-8)' }}>Manage your admin account</p>

      {/* Account info */}
      <div className="settings-card card" style={{ marginBottom: 'var(--space-5)', maxWidth: 540 }}>
        <div className="card__header">
          <h2 className="text-base fw-semibold text-secondary">Account Information</h2>
        </div>
        <div className="card__body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="settings-info-row">
            <span className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Username</span>
            <span className="text-primary fw-medium">{admin?.username || '—'}</span>
          </div>
          <div className="settings-info-row">
            <span className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Email</span>
            <span className="text-secondary">{admin?.email || '—'}</span>
          </div>
          <div className="settings-info-row">
            <span className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Role</span>
            <span className="badge badge--open" style={{ fontSize: '0.7rem' }}>{admin?.role || '—'}</span>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="settings-card card" style={{ maxWidth: 540 }}>
        <div className="card__header">
          <h2 className="text-base fw-semibold text-secondary">Change Password</h2>
        </div>
        <div className="card__body">
          {error && <div className="alert alert--error mb-4">⚠️ {error}</div>}
          {success && <div className="alert alert--info mb-4">ℹ️ {success}</div>}
          <form onSubmit={handlePasswordChange} className="form-section">
            <div className="form-group">
              <label className="form-label form-label--required">Current Password</label>
              <input type="password" className="form-input"
                value={form.current_password} onChange={(e) => setForm({ ...form, current_password: e.target.value })}
                placeholder="Current password" />
            </div>
            <div className="form-group">
              <label className="form-label form-label--required">New Password</label>
              <input type="password" className="form-input"
                value={form.new_password} onChange={(e) => setForm({ ...form, new_password: e.target.value })}
                placeholder="Min 6 characters" />
            </div>
            <div className="form-group">
              <label className="form-label form-label--required">Confirm New Password</label>
              <input type="password" className="form-input"
                value={form.confirm_password} onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                placeholder="Confirm new password" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className={`btn btn--primary ${loading ? 'btn--loading' : ''}`} disabled={loading}>
                {loading ? '' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Platform info */}
      <div className="settings-card card" style={{ maxWidth: 540, marginTop: 'var(--space-5)' }}>
        <div className="card__header">
          <h2 className="text-base fw-semibold text-secondary">Platform</h2>
        </div>
        <div className="card__body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div className="settings-info-row">
            <span className="text-xs text-muted">Version</span>
            <span className="text-secondary text-sm font-mono">TEC Events v1.0.0</span>
          </div>
          <div className="settings-info-row">
            <span className="text-xs text-muted">Environment</span>
            <span className="text-secondary text-sm font-mono">{import.meta.env.MODE}</span>
          </div>
          <div className="settings-info-row">
            <span className="text-xs text-muted">Default Admin</span>
            <span className="text-sm text-warning">⚠️ Change default credentials in production</span>
          </div>
        </div>
      </div>
    </div>
  );
}
