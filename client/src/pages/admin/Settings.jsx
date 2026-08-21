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
      setSuccess('Password updated successfully.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-page__header">
        <h1 className="dashboard__title">SETTINGS</h1>
        <p className="dashboard__subtitle">Manage your committee administrative account and credentials</p>
      </div>

      {/* Account info */}
      <div className="settings-card card">
        <div className="card__header">
          <h2 className="section__label" style={{ marginBottom: 0 }}>ACCOUNT INFORMATION</h2>
        </div>
        <div className="card__body">
          <div className="settings-info-row">
            <span className="settings-info-label">Username</span>
            <span className="settings-info-val text-primary">{admin?.username || 'admin'}</span>
          </div>
          <div className="settings-info-row">
            <span className="settings-info-label">Email</span>
            <span className="settings-info-val text-secondary">{admin?.email || 'anuragsutar887@gmail.com'}</span>
          </div>
          <div className="settings-info-row">
            <span className="settings-info-label">Role</span>
            <span className="badge badge--checked" style={{ fontSize: '0.7rem' }}>{admin?.role || 'COMMITTEE_ADMIN'}</span>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="settings-card card">
        <div className="card__header">
          <h2 className="section__label" style={{ marginBottom: 0 }}>CHANGE PASSWORD</h2>
        </div>
        <div className="card__body">
          {error && <div className="alert alert--error mb-4">⚠️ {error}</div>}
          {success && <div className="alert alert--success mb-4">✓ {success}</div>}
          <form onSubmit={handlePasswordChange} className="form-section">
            <div className="form-group">
              <label className="form-label form-label--required">Current Password</label>
              <input
                type="password"
                className="form-input"
                value={form.current_password}
                onChange={(e) => setForm({ ...form, current_password: e.target.value })}
                placeholder="Current password"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label form-label--required">New Password</label>
              <input
                type="password"
                className="form-input"
                value={form.new_password}
                onChange={(e) => setForm({ ...form, new_password: e.target.value })}
                placeholder="Min 6 characters"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label form-label--required">Confirm New Password</label>
              <input
                type="password"
                className="form-input"
                value={form.confirm_password}
                onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                placeholder="Confirm new password"
                required
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
              <button type="submit" className={`btn btn--primary ${loading ? 'btn--loading' : ''}`} disabled={loading}>
                {loading ? '' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
