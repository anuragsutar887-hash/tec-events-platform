import { useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/client';
import { formatDate } from '../../utils/dateHelpers';
import './Lookup.css';

export default function Lookup() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showManualInput, setShowManualInput] = useState(true);

  const fetchRegistration = async (idToFetch) => {
    const q = (idToFetch || query).trim();
    if (!q) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const { data } = await apiClient.get(`/registrations/lookup/${q}`);
      setResult(data.registration);
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

  return (
    <div className="lookup-page">
      {/* Header */}
      <div className="lookup-page__hero">
        <div className="container">
          <div className="section__label">OFFICIAL PASS // DIGITAL TICKET</div>
          <h1 className="lookup-page__title">MY REGISTRATION</h1>
          <p className="lookup-page__subtitle">
            Enter your Registration Number to access your verified event ticket and duo team details for IT Department events.
          </p>
        </div>
      </div>

      <div className="section">
        <div className="container--narrow">
          {/* Registration ID Input */}
          {showManualInput && (
            <form onSubmit={handleSearchSubmit} className="lookup-form card mb-6">
              <div className="card__body">
                <div className="form-group">
                  <label htmlFor="lookup-input" className="form-label form-label--required">
                    Enter Your Registration Number
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
                  <div>
                    {/* Left Details */}
                    <div>
                      <div style={{
                        marginBottom: 'var(--space-4)',
                        padding: 'var(--space-4)',
                        background: '#f8fafc',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)'
                      }}>
                        <div className="text-xs text-muted font-mono fw-bold" style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                          Official Registration Number
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: '4px' }}>
                          <span className="reg-id" style={{ fontSize: '1.6rem', color: '#000000', letterSpacing: '0.05em' }}>
                            {result.registration_id}
                          </span>
                          <button
                            className="btn btn--secondary btn--sm"
                            style={{ padding: '3px 10px', fontSize: '0.8rem' }}
                            onClick={() => navigator.clipboard.writeText(result.registration_id)}
                            title="Copy Registration Number"
                          >
                            📋 Copy ID
                          </button>
                        </div>
                        <div className="text-xs text-muted font-mono mt-1">
                          Present this Registration Number at the event check-in desk
                        </div>
                      </div>

                      {result.team_name && (
                        <div style={{ marginBottom: 'var(--space-4)' }}>
                          <div className="text-xs text-muted font-mono fw-bold" style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                            Duo Team Name
                          </div>
                          <div className="text-primary fw-bold text-xl">{result.team_name}</div>
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
                          <div className="text-primary text-sm fw-semibold">{result.participation_mode || 'Duo Team'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted font-mono fw-bold" style={{ textTransform: 'uppercase' }}>Status</div>
                          <div className="text-success text-sm fw-bold">Confirmed</div>
                        </div>
                      </div>

                      {/* Duo Players (Player 1 & Player 2) */}
                      <div>
                        <div className="text-xs text-muted font-mono fw-bold" style={{ textTransform: 'uppercase', marginBottom: 'var(--space-2)' }}>
                          Duo Team Members (2 Players)
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                          {result.participants?.map((p, i) => (
                            <div key={i} style={{
                              padding: 'var(--space-3) var(--space-4)',
                              background: '#fafafa',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius-sm)'
                            }}>
                              <div className="text-xs text-muted font-mono fw-bold" style={{ textTransform: 'uppercase', marginBottom: '2px' }}>
                                PLAYER {i + 1} {p.is_leader ? '(LEADER)' : ''}
                              </div>
                              <div className="text-primary fw-bold text-sm">{p.full_name}</div>
                              {(p.student_id || p.prn) && (
                                <div className="text-xs font-mono fw-semibold" style={{ color: '#000000', margin: '2px 0' }}>
                                  PRN: {p.student_id || p.prn}
                                </div>
                              )}
                              <div className="text-secondary text-xs">{p.email}</div>
                            </div>
                          ))}
                        </div>
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
                  <button
                    className="btn btn--secondary btn--sm"
                    onClick={() => setShowManualInput(!showManualInput)}
                  >
                    {showManualInput ? 'Hide Search' : 'Enter Different ID'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
