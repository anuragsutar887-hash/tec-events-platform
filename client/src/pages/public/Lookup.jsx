import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import apiClient from '../../api/client';
import { formatDate, formatTime } from '../../utils/dateHelpers';
import { QRCodeSVG } from 'qrcode.react';
import './Lookup.css';

export default function Lookup() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialId = searchParams.get('id') || localStorage.getItem('my_ticket_id') || '';
  const token = searchParams.get('token') || '';

  const [query, setQuery] = useState(initialId);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(Boolean(initialId || token));
  const [error, setError] = useState('');
  const [showManualInput, setShowManualInput] = useState(!initialId && !token);

  useEffect(() => {
    if (token) {
      handleTokenLookup(token);
    } else if (initialId) {
      fetchRegistration(initialId);
    }
  }, []);

  const handleTokenLookup = async (tok) => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const { data } = await apiClient.get(`/registrations/lookup-by-token/${tok}`);
      setResult(data.registration);
      if (data.registration?.registration_id) {
        localStorage.setItem('my_ticket_id', data.registration.registration_id);
      }
    } catch {
      setError('Registration not found for this QR pass.');
      setShowManualInput(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchRegistration = async (idToFetch) => {
    const q = (idToFetch || query).trim();
    if (!q) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const { data } = await apiClient.get(`/registrations/lookup/${q}`);
      setResult(data.registration);
      localStorage.setItem('my_ticket_id', data.registration.registration_id);
      setShowManualInput(false);
    } catch {
      setError(`No registration found for "${q}". Please check the ID and try again.`);
      setShowManualInput(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchRegistration(query);
  };

  const handleClearSaved = () => {
    localStorage.removeItem('my_ticket_id');
    setResult(null);
    setQuery('');
    setError('');
    setShowManualInput(true);
    setSearchParams({});
  };

  return (
    <div className="lookup-page">
      {/* Header */}
      <div className="lookup-page__hero">
        <div className="container">
          <div className="section__label">OFFICIAL PASS // DIGITAL TICKET</div>
          <h1 className="lookup-page__title">MY REGISTRATION</h1>
          <p className="lookup-page__subtitle">
            Access your verified event ticket, duo team details, and QR desk check-in pass for IT Department events.
          </p>
        </div>
      </div>

      <div className="section">
        <div className="container--narrow">
          {/* Manual ID Input (Only shown if no saved ticket or if user clicks 'Switch Pass') */}
          {showManualInput && (
            <form onSubmit={handleSearchSubmit} className="lookup-form card mb-6">
              <div className="card__body">
                <div className="form-group">
                  <label htmlFor="lookup-input" className="form-label form-label--required">
                    Enter Your Registration ID
                  </label>
                  <div className="lookup-form__row">
                    <input
                      id="lookup-input"
                      type="text"
                      className="form-input"
                      placeholder="e.g. TEC-2026-0042"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      autoComplete="off"
                      style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}
                      required
                    />
                    <button
                      id="lookup-submit-btn"
                      type="submit"
                      className={`btn btn--primary ${loading ? 'btn--loading' : ''}`}
                      disabled={loading || !query.trim()}
                    >
                      {loading ? '' : 'LOAD MY PASS'}
                    </button>
                  </div>
                  <span className="form-hint text-xs text-muted mt-2">
                    Format: TEC-YYYY-NNNN (e.g. TEC-2026-0042)
                  </span>
                </div>
              </div>
            </form>
          )}

          {/* Skeleton Loading State */}
          {loading && (
            <div className="card skeleton-card" style={{ height: '320px', padding: 'var(--space-6)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                <div className="skeleton" style={{ width: '180px', height: '32px' }} />
                <div className="skeleton" style={{ width: '120px', height: '24px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 'var(--space-6)', marginTop: 'var(--space-6)' }}>
                <div className="skeleton" style={{ height: '180px' }} />
                <div className="skeleton" style={{ height: '180px' }} />
              </div>
            </div>
          )}

          {/* Error Message */}
          {!loading && error && (
            <div className="alert alert--error mb-6">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* User's Verified Ticket Pass */}
          {!loading && result && (
            <div className="lookup-result">
              <div className="lookup-result__card card" style={{ border: '1px solid #000000', overflow: 'hidden' }}>
                {/* Top Pass Header */}
                <div className="card__header" style={{
                  background: '#fafafa',
                  borderBottom: '1px solid var(--border)',
                  padding: 'var(--space-4) var(--space-6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 'var(--space-2)'
                }}>
                  <div>
                    <span className="section__label" style={{ marginBottom: 0 }}>VERIFIED DIGITAL PASS</span>
                    <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 800, margin: 0, textTransform: 'uppercase' }}>
                      {result.event?.name || 'Department Technical Event'}
                    </h2>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                    <span className={`badge ${result.checked_in ? 'badge--checked' : 'badge--unchecked'}`}>
                      {result.checked_in ? '✓ Checked In (In Arena)' : '• Pending Check-in'}
                    </span>
                    <span className="badge badge--tag">{result.registration_type}</span>
                  </div>
                </div>

                {/* Main Pass Body */}
                <div className="card__body" style={{ padding: 'var(--space-6)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 'var(--space-6)', alignItems: 'start' }}>
                    {/* Left Details */}
                    <div>
                      <div style={{ marginBottom: 'var(--space-4)' }}>
                        <div className="text-xs text-muted font-mono fw-bold" style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                          Registration ID
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: '2px' }}>
                          <span className="reg-id" style={{ fontSize: '1.4rem', color: '#000000' }}>
                            {result.registration_id}
                          </span>
                          <button
                            className="btn btn--secondary btn--sm"
                            style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                            onClick={() => navigator.clipboard.writeText(result.registration_id)}
                            title="Copy ID"
                          >
                            📋 Copy
                          </button>
                        </div>
                      </div>

                      {result.team_name && (
                        <div style={{ marginBottom: 'var(--space-4)' }}>
                          <div className="text-xs text-muted font-mono fw-bold" style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                            Duo Team Name
                          </div>
                          <div className="text-primary fw-bold text-lg">{result.team_name}</div>
                        </div>
                      )}

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
                        {result.event?.event_date && (
                          <div>
                            <div className="text-xs text-muted font-mono fw-bold" style={{ textTransform: 'uppercase' }}>Event Date</div>
                            <div className="text-primary text-sm fw-semibold">{formatDate(result.event.event_date)}</div>
                          </div>
                        )}
                        {result.event?.venue && (
                          <div>
                            <div className="text-xs text-muted font-mono fw-bold" style={{ textTransform: 'uppercase' }}>Venue</div>
                            <div className="text-primary text-sm fw-semibold">{result.event.venue}</div>
                          </div>
                        )}
                        <div>
                          <div className="text-xs text-muted font-mono fw-bold" style={{ textTransform: 'uppercase' }}>Format</div>
                          <div className="text-primary text-sm fw-semibold">{result.participation_mode}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted font-mono fw-bold" style={{ textTransform: 'uppercase' }}>Status</div>
                          <div className="text-success text-sm fw-bold">Confirmed</div>
                        </div>
                      </div>

                      {/* Duo Players (Player 1 & Player 2) */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        <div className="text-xs text-muted font-mono fw-bold" style={{ textTransform: 'uppercase' }}>
                          Duo Team Members (2 Players)
                        </div>
                        {result.participants?.map((p, i) => (
                          <div key={i} style={{
                            padding: 'var(--space-3) var(--space-4)',
                            background: '#fafafa',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)'
                          }}>
                            <div className="text-xs text-muted font-mono fw-bold" style={{ textTransform: 'uppercase', marginBottom: '2px' }}>
                              PLAYER {i + 1}
                            </div>
                            <div className="text-primary fw-bold text-sm">{p.full_name}</div>
                            <div className="text-secondary text-xs">{p.email}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right QR Desk Pass */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: 'var(--space-4)',
                      background: '#fafafa',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)'
                    }}>
                      <div style={{
                        padding: 'var(--space-2)',
                        background: 'white',
                        border: '1px solid #000000',
                        display: 'inline-block',
                        marginBottom: 'var(--space-2)',
                      }}>
                        <QRCodeSVG
                          value={`${window.location.origin}/lookup?token=${result.qr_token}`}
                          size={125}
                          level="M"
                          fgColor="#000000"
                        />
                      </div>
                      <div className="text-xs text-muted font-mono text-center" style={{ fontSize: '0.6875rem', fontWeight: 700 }}>
                        SHOW AT ARENA DESK
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="card__footer" style={{
                  background: '#fafafa',
                  borderTop: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'var(--space-4) var(--space-6)',
                  flexWrap: 'wrap',
                  gap: 'var(--space-3)'
                }}>
                  <Link to="/#events-section" className="btn btn--ghost btn--sm">
                    ← Browse Events
                  </Link>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <button
                      className="btn btn--secondary btn--sm"
                      onClick={() => setShowManualInput(!showManualInput)}
                    >
                      {showManualInput ? 'Hide Search' : 'Enter Different ID'}
                    </button>
                    <button
                      className="btn btn--ghost btn--sm text-danger"
                      onClick={handleClearSaved}
                      title="Clear saved pass from this device"
                    >
                      ✕ Clear Saved Pass
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
