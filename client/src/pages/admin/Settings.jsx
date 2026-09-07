import { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabaseClient';
import './Settings.css';

export default function Settings() {
  const { admin } = useAuth();
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ─── SMTP Email Configuration State ─────────────────────────
  const [smtpConfig, setSmtpConfig] = useState({
    user: 'anuragsutar887@gmail.com',
    pass: '',
    from_name: 'Technical Event Committee',
    host: 'smtp.gmail.com',
    port: '465',
  });
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [smtpSuccess, setSmtpSuccess] = useState('');
  const [smtpError, setSmtpError] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState('');

  // Load existing SMTP config from localStorage or Supabase
  useEffect(() => {
    try {
      const stored = localStorage.getItem('tec_smtp_config');
      if (stored) {
        const parsed = JSON.parse(stored);
        setSmtpConfig((prev) => ({ ...prev, ...parsed }));
      }
    } catch {}

    // Also check Supabase admins table
    supabase
      .from('admins')
      .select('full_name')
      .eq('id', 1)
      .single()
      .then(({ data }) => {
        if (data?.full_name && data.full_name.startsWith('SMTP:')) {
          try {
            const parsed = JSON.parse(data.full_name.slice(5));
            setSmtpConfig((prev) => ({
              ...prev,
              ...parsed,
              pass: prev.pass || parsed.pass || '',
            }));
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

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

  const handleSaveSmtp = async (e) => {
    e.preventDefault();
    setSmtpError('');
    setSmtpSuccess('');
    setSmtpLoading(true);

    try {
      const cleanConfig = {
        user: smtpConfig.user.trim(),
        pass: smtpConfig.pass.trim(),
        from_name: smtpConfig.from_name.trim(),
        host: smtpConfig.host.trim() || 'smtp.gmail.com',
        port: smtpConfig.port.trim() || '465',
      };

      // 1. Save to local storage for instant browser usage
      localStorage.setItem('tec_smtp_config', JSON.stringify(cleanConfig));

      // 2. Persist to Supabase so serverless function on Vercel reads it across all devices
      await supabase
        .from('admins')
        .update({
          full_name: 'SMTP:' + JSON.stringify(cleanConfig),
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1);

      setSmtpSuccess('Email & SMTP credentials saved! All registration emails will now be delivered to real inboxes via this account.');
    } catch (err) {
      console.error('SMTP Save Error:', err);
      setSmtpError(err.message || 'Failed to persist SMTP settings.');
    } finally {
      setSmtpLoading(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!smtpConfig.user.trim() || !smtpConfig.pass.trim()) {
      setSmtpError('Please enter both your Sender Email and App Password before sending a test.');
      return;
    }

    setTestSending(true);
    setTestResult('');
    setSmtpError('');

    try {
      const payload = {
        recipients: [smtpConfig.user.trim()],
        teamName: 'Technical Committee Admin',
        eventName: 'Platform Notification Test',
        teamId: 'TEC-2026-TEST',
        password: 'TEC#TEST',
        eventDate: 'Today',
        eventTime: new Date().toLocaleTimeString(),
        venue: 'ICEM Campus, Pune',
        loginUrl: window.location.origin + '/login',
        organizerName: smtpConfig.from_name || 'Technical Committee',
        collegeName: 'Indira College of Engineering and Management (ICEM), Pune',
        smtpConfig: {
          user: smtpConfig.user.trim(),
          pass: smtpConfig.pass.trim(),
          host: smtpConfig.host.trim() || 'smtp.gmail.com',
          port: smtpConfig.port.trim() || '465',
        },
        isTestEmail: true,
      };

      const res = await fetch('/api/send-registration-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult(`✓ Test email delivered successfully to ${smtpConfig.user.trim()}! Please check your inbox (and spam folder).`);
      } else {
        setSmtpError(data.error || data.message || 'Failed to dispatch test email.');
      }
    } catch (err) {
      setSmtpError('Error contacting email server: ' + err.message);
    } finally {
      setTestSending(false);
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-page__header">
        <h1 className="dashboard__title">SETTINGS</h1>
        <p className="dashboard__subtitle">Manage administrative account, security, and automated email delivery</p>
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

      {/* ─── Automated Email & Nodemailer SMTP Configuration ──── */}
      <div className="settings-card card">
        <div className="card__header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '8px' }}>
            <h2 className="section__label" style={{ marginBottom: 0 }}>
              AUTOMATED REGISTRATION EMAIL DISPATCH (NODEMAILER)
            </h2>
            <span className={`badge ${smtpConfig.user && smtpConfig.pass ? 'badge--online' : 'badge--upcoming'}`} style={{ fontSize: '0.7rem' }}>
              {smtpConfig.user && smtpConfig.pass ? '● SMTP LIVE' : '○ SETUP NEEDED'}
            </span>
          </div>
        </div>
        <div className="card__body">
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)', lineHeight: 1.5 }}>
            Configure your institutional or personal Gmail address to automatically send registration credentials to all registered teammates.
          </p>

          {smtpError && <div className="alert alert--error mb-4">⚠️ {smtpError}</div>}
          {smtpSuccess && <div className="alert alert--success mb-4">✓ {smtpSuccess}</div>}
          {testResult && <div className="alert alert--success mb-4">{testResult}</div>}

          <form onSubmit={handleSaveSmtp} className="form-section">
            <div className="form-group">
              <label className="form-label form-label--required">Sender Email Address (Gmail)</label>
              <input
                type="email"
                className="form-input font-mono"
                value={smtpConfig.user}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, user: e.target.value })}
                placeholder="e.g. anuragsutar887@gmail.com"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label form-label--required">
                Google 16-Character App Password
              </label>
              <input
                type="password"
                className="form-input font-mono"
                value={smtpConfig.pass}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, pass: e.target.value })}
                placeholder="Paste your 16-digit Google App Password"
                autoComplete="off"
                required
              />
              <span className="form-hint" style={{ marginTop: '4px', display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                💡 Generate at: <strong>Google Account → Security → 2-Step Verification → App passwords</strong>
              </span>
            </div>

            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div className="form-group">
                <label className="form-label">Sender Display Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={smtpConfig.from_name}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, from_name: e.target.value })}
                  placeholder="e.g. Technical Event Committee"
                />
              </div>

              <div className="form-group">
                <label className="form-label">SMTP Host & Port</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="form-input font-mono"
                    value={smtpConfig.host}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                    style={{ flex: 2 }}
                    placeholder="smtp.gmail.com"
                  />
                  <input
                    type="text"
                    className="form-input font-mono"
                    value={smtpConfig.port}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, port: e.target.value })}
                    style={{ flex: 1 }}
                    placeholder="465"
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-6)', flexWrap: 'wrap', gap: '12px' }}>
              <button
                type="button"
                className={`btn btn--secondary ${testSending ? 'btn--loading' : ''}`}
                onClick={handleSendTestEmail}
                disabled={testSending || smtpLoading}
              >
                {testSending ? '' : '📨 Send Test Email'}
              </button>

              <button
                type="submit"
                className={`btn btn--primary ${smtpLoading ? 'btn--loading' : ''}`}
                disabled={smtpLoading || testSending}
              >
                {smtpLoading ? '' : '💾 Save SMTP Credentials'}
              </button>
            </div>
          </form>
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
                placeholder=""
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
                placeholder=""
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
                placeholder=""
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
