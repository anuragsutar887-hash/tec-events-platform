import { useState } from 'react';
import { useLocation, Link, useParams } from 'react-router-dom';
import './RegisterSuccess.css';

export default function RegisterSuccess() {
  const { slug } = useParams();
  const location = useLocation();
  const registration = location.state?.registration;

  const [copiedId, setCopiedId] = useState(false);
  const [copiedPwd, setCopiedPwd] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [showPassword, setShowPassword] = useState(true);

  if (!registration) {
    return (
      <div className="container section">
        <div className="empty-state card">
          <div className="card__body">
            <div className="empty-state__icon">🔍</div>
            <div className="empty-state__title">No registration data found</div>
            <p className="empty-state__text">Please search for your registration or browse events.</p>
            <Link to="/#events-section" className="btn btn--primary mt-4">Browse Events</Link>
          </div>
        </div>
      </div>
    );
  }

  const { registration_id, event_name, team_name, participants = [] } = registration;

  // Retrieve password from registration object or local storage cache
  let teamPassword = registration.password || registration.team_password;
  if (!teamPassword && typeof localStorage !== 'undefined') {
    try {
      const stored = JSON.parse(localStorage.getItem('tec_team_passwords') || '{}');
      teamPassword = stored[registration_id] || stored[String(registration.id)];
    } catch {}
  }

  const loginUrl = typeof window !== 'undefined' ? `${window.location.origin}/login` : 'https://tec-events-platform.vercel.app/login';

  const handleCopyId = () => {
    navigator.clipboard.writeText(registration_id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyPwd = () => {
    if (teamPassword) {
      navigator.clipboard.writeText(teamPassword);
      setCopiedPwd(true);
      setTimeout(() => setCopiedPwd(false), 2000);
    }
  };

  const handleCopyAll = () => {
    const text = `IND-TEC EVENTS PLATFORM REGISTRATION
Event: ${event_name || 'Technical Event'}
Team Name: ${team_name || 'Participant'}
Team ID: ${registration_id}
Password: ${teamPassword || 'Available on registration'}
Login Portal: ${loginUrl}
`;
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  return (
    <div className="success-page">
      <div className="container--narrow">
        {/* Success header */}
        <div className="success-header">
          <div className="success-header__icon">🎉</div>
          <h1 className="success-header__title">REGISTRATION CONFIRMED!</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.95rem' }}>
            Your registration is officially submitted. Save your credentials below.
          </p>
        </div>

        {/* Credentials Callout Card */}
        <div className="card mb-6" style={{ border: '2px solid #000000', background: '#000000', color: '#ffffff', overflow: 'hidden' }}>
          <div style={{ padding: 'var(--space-4) var(--space-6)', borderBottom: '1px solid #27272a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            <div>
              <span className="badge badge--bronze" style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.08em' }}>
                🎟️ OFFICIAL TEAM CREDENTIALS
              </span>
              <span style={{ fontSize: '0.8rem', color: '#a1a1aa', marginLeft: '8px' }}>
                Keep these credentials safe for login
              </span>
            </div>
            <button
              type="button"
              className="btn btn--secondary btn--xs"
              onClick={handleCopyAll}
              style={{ background: '#ffffff', color: '#000000', fontWeight: 800, border: 'none' }}
            >
              {copiedAll ? '✓ Copied All Credentials!' : '📋 Copy All Credentials'}
            </button>
          </div>

          <div style={{ padding: 'var(--space-6)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
              {/* Team ID Box */}
              <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)' }}>
                <div style={{ fontSize: '0.75rem', color: '#a1a1aa', fontFamily: 'var(--font-mono)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  TEAM / REGISTRATION ID
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#ffffff', margin: '6px 0', letterSpacing: '0.04em' }}>
                  {registration_id}
                </div>
                <button
                  type="button"
                  className="btn btn--secondary btn--xs"
                  onClick={handleCopyId}
                  style={{ background: '#27272a', color: '#ffffff', border: '1px solid #3f3f46' }}
                >
                  {copiedId ? '✓ Copied!' : '📋 Copy Team ID'}
                </button>
              </div>

              {/* Team Password Box */}
              <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.75rem', color: '#a1a1aa', fontFamily: 'var(--font-mono)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    TEAM PASSWORD
                  </div>
                  {teamPassword && (
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ background: 'none', border: 'none', color: '#93c5fd', cursor: 'pointer', fontSize: '0.75rem', padding: 0 }}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  )}
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#60a5fa', margin: '6px 0', letterSpacing: '0.04em' }}>
                  {teamPassword ? (showPassword ? teamPassword : '••••••••••') : 'TEC-CONFIRMED'}
                </div>
                <button
                  type="button"
                  className="btn btn--secondary btn--xs"
                  onClick={handleCopyPwd}
                  disabled={!teamPassword}
                  style={{ background: '#27272a', color: '#ffffff', border: '1px solid #3f3f46' }}
                >
                  {copiedPwd ? '✓ Copied!' : '📋 Copy Password'}
                </button>
              </div>
            </div>

            <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3) var(--space-4)', background: '#27272a', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <span style={{ fontSize: '1.2rem' }}>ℹ️</span>
              <span style={{ fontSize: '0.825rem', color: '#d4d4d8', lineHeight: 1.4 }}>
                <strong>Save this information:</strong> You will need your <strong>Team ID</strong> and <strong>Password</strong> to log in, view your live score, and participate on the event day.
              </span>
            </div>
          </div>
        </div>

        {/* Official Registration Details Card */}
        <div className="success-card card" style={{ border: '1px solid #000000', overflow: 'hidden' }}>
          <div className="card__header" style={{
            background: '#fafafa',
            borderBottom: '1px solid var(--border)',
            padding: 'var(--space-4) var(--space-6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <span className="section__label" style={{ marginBottom: 0 }}>OFFICIAL REGISTRATION</span>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 800, margin: 0, textTransform: 'uppercase' }}>
                {event_name || 'Department Technical Event'}
              </h2>
            </div>
            <span className="badge badge--tag">CONFIRMED</span>
          </div>

          <div className="success-card__body card__body" style={{ padding: 'var(--space-6)' }}>
            <div className="success-card__layout" style={{ gridTemplateColumns: '1fr' }}>
              <div className="success-card__info">
                {team_name && (
                  <div style={{ marginBottom: 'var(--space-4)' }}>
                    <div className="text-xs text-muted font-mono fw-bold" style={{ textTransform: 'uppercase' }}>
                      Team Name
                    </div>
                    <div className="text-primary fw-bold text-xl">{team_name}</div>
                  </div>
                )}

                {/* All Registered Participants */}
                <div>
                  <div className="text-xs text-muted font-mono fw-bold" style={{ textTransform: 'uppercase', marginBottom: 'var(--space-2)' }}>
                    Registered Team Members ({participants.length || 1})
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: participants.length > 1 ? 'repeat(auto-fit, minmax(220px, 1fr))' : '1fr', gap: 'var(--space-3)' }}>
                    {participants.length > 0 ? (
                      participants.map((p, idx) => (
                        <div key={idx} style={{ padding: 'var(--space-3) var(--space-4)', background: '#fafafa', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                          <div className="text-xs text-muted font-mono fw-bold" style={{ textTransform: 'uppercase' }}>
                            {p.is_leader ? 'PLAYER 1 (LEADER)' : `PLAYER ${idx + 1}`}
                          </div>
                          <div className="text-primary fw-bold text-sm">{p.full_name}</div>
                          {(p.prn || p.student_id) && (
                            <div className="text-xs font-mono fw-semibold" style={{ color: '#000000', margin: '2px 0' }}>
                              PRN: {p.prn || p.student_id}
                            </div>
                          )}
                          <div className="text-muted text-xs">{p.email}</div>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: 'var(--space-3) var(--space-4)', background: '#fafafa', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                        <div className="text-primary fw-bold text-sm">Participant</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="success-actions" style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', marginTop: 'var(--space-6)', flexWrap: 'wrap' }}>
          <Link to={`/events/${slug || ''}`} className="btn btn--primary">
            View Event Details
          </Link>
          <Link to="/#events-section" className="btn btn--secondary">
            Browse More Events
          </Link>
        </div>
      </div>
    </div>
  );
}
