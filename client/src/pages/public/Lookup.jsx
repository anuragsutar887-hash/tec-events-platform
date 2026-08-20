import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import apiClient from '../../api/client';
import { formatDate } from '../../utils/dateHelpers';
import './Lookup.css';

export default function Lookup() {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('id') || '');
  const [token] = useState(searchParams.get('token') || '');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  // Auto-search if token is in URL (QR code scan)
  useEffect(() => {
    if (token) {
      handleTokenLookup(token);
    } else if (searchParams.get('id')) {
      handleSearch(null, searchParams.get('id'));
    }
  }, []);

  const handleTokenLookup = async (tok) => {
    setLoading(true);
    setError('');
    setResult(null);
    setSearched(true);
    try {
      const { data } = await apiClient.get(`/registrations/lookup-by-token/${tok}`);
      setResult(data.registration);
    } catch {
      setError('Registration not found for this QR code.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e, overrideQuery) => {
    if (e) e.preventDefault();
    const q = (overrideQuery || query).trim();
    if (!q) return;
    setLoading(true);
    setError('');
    setResult(null);
    setSearched(true);
    try {
      const { data } = await apiClient.get(`/registrations/lookup/${q}`);
      setResult(data.registration);
    } catch {
      setError(`No registration found for "${q}". Please check the ID and try again.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lookup-page">
      <div className="lookup-page__hero">
        <div className="container">
          <div className="section__label">Registration Lookup</div>
          <h1 className="lookup-page__title">Find Your Registration</h1>
          <p className="lookup-page__subtitle">
            Enter your Registration ID to view your registration details and check-in status.
          </p>
        </div>
      </div>

      <div className="section">
        <div className="container--narrow">
          {/* Search form */}
          {!token && (
            <form onSubmit={handleSearch} className="lookup-form card">
              <div className="card__body">
                <div className="form-group">
                  <label htmlFor="lookup-input" className="form-label form-label--required">
                    Registration ID
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
                    />
                    <button
                      id="lookup-submit-btn"
                      type="submit"
                      className={`btn btn--primary ${loading ? 'btn--loading' : ''}`}
                      disabled={loading || !query.trim()}
                    >
                      {loading ? 'Searching...' : '🔍 Search'}
                    </button>
                  </div>
                  <span className="form-hint text-xs text-muted mt-2">Format: TEC-YYYY-NNNN (e.g. TEC-2026-0042)</span>
                </div>
              </div>
            </form>
          )}

          {/* Skeleton Loading State */}
          {loading && (
            <div className="mt-6">
              <div className="card skeleton-card" style={{ height: '260px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                  <div className="skeleton" style={{ width: '160px', height: '28px' }} />
                  <div className="skeleton" style={{ width: '100px', height: '24px', borderRadius: 'var(--radius-full)' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)', margin: 'var(--space-4) 0' }}>
                  <div className="skeleton" style={{ height: '40px' }} />
                  <div className="skeleton" style={{ height: '40px' }} />
                  <div className="skeleton" style={{ height: '40px' }} />
                </div>
                <div className="skeleton" style={{ height: '60px', marginTop: 'var(--space-4)' }} />
              </div>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="alert alert--error mt-4">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Result */}
          {!loading && result && (
            <div className="lookup-result mt-4">
              <div className="lookup-result__card card">
                <div className="card__body">
                  <div className="lookup-result__header">
                    <div>
                      <div className="lookup-result__label">Registration ID</div>
                      <div className="reg-id lookup-result__reg-id">{result.registration_id}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', alignItems: 'flex-end' }}>
                      <span className={`badge ${result.checked_in ? 'badge--checked' : 'badge--unchecked'}`}>
                        {result.checked_in ? '✓ Checked In' : 'Not Checked In'}
                      </span>
                      <span className={`badge ${result.registration_type === 'ONLINE' ? 'badge--online' : 'badge--onsite'}`}>
                        {result.registration_type}
                      </span>
                    </div>
                  </div>

                  <div className="lookup-result__grid">
                    <div className="lookup-result__item">
                      <div className="lookup-result__item-label">Event</div>
                      <div className="lookup-result__item-val">{result.event?.name || '—'}</div>
                    </div>
                    {result.event?.event_date && (
                      <div className="lookup-result__item">
                        <div className="lookup-result__item-label">Date</div>
                        <div className="lookup-result__item-val">{formatDate(result.event.event_date)}</div>
                      </div>
                    )}
                    {result.event?.venue && (
                      <div className="lookup-result__item">
                        <div className="lookup-result__item-label">Venue</div>
                        <div className="lookup-result__item-val">{result.event.venue}</div>
                      </div>
                    )}
                    <div className="lookup-result__item">
                      <div className="lookup-result__item-label">Mode</div>
                      <div className="lookup-result__item-val">
                        <span className={`badge ${result.participation_mode === 'SOLO' ? 'badge--solo' : 'badge--team'}`}>
                          {result.participation_mode}
                        </span>
                      </div>
                    </div>
                    {result.team_name && (
                      <div className="lookup-result__item">
                        <div className="lookup-result__item-label">Team Name</div>
                        <div className="lookup-result__item-val fw-semibold text-primary">{result.team_name}</div>
                      </div>
                    )}
                    <div className="lookup-result__item">
                      <div className="lookup-result__item-label">Status</div>
                      <div className="lookup-result__item-val">
                        <span className={`badge ${result.status === 'CONFIRMED' ? 'badge--open' : 'badge--closed'}`}>
                          {result.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Participants (safe fields only) */}
                  {result.participants?.length > 0 && (
                    <div className="lookup-result__participants">
                      <div className="lookup-result__label" style={{ marginBottom: 'var(--space-3)' }}>
                        Participants ({result.participants.length})
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                        {result.participants.map((p, i) => (
                          <div key={i} className="lookup-result__participant">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                              {p.is_leader && <span className="badge badge--solo" style={{ fontSize: '0.65rem' }}>Leader</span>}
                              <span className="text-sm fw-medium text-primary">{p.full_name}</span>
                            </div>
                            <div className="text-xs text-muted">
                              {[p.department, p.year].filter(Boolean).join(' · ')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="lookup-result__actions mt-4">
                <Link to="/events" className="btn btn--ghost">Browse More Events</Link>
                {!token && (
                  <button className="btn btn--secondary" onClick={() => { setResult(null); setError(''); setSearched(false); setQuery(''); }}>
                    Search Again
                  </button>
                )}
              </div>
            </div>
          )}

          {/* No search yet */}
          {!loading && !searched && !result && !error && !token && (
            <div className="lookup-hint card mt-6">
              <div className="card__body" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
                <div className="lookup-hint__icon" style={{ fontSize: '2.5rem', marginBottom: 'var(--space-3)' }}>🔍</div>
                <p className="lookup-hint__text">
                  Enter your Registration ID above to find your registration.
                  <br />Your ID looks like: <span className="reg-id" style={{ fontSize: '1rem' }}>TEC-2026-0042</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
