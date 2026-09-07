import { useLocation, Link, useParams } from 'react-router-dom';
import './RegisterSuccess.css';

export default function RegisterSuccess() {
  const { slug } = useParams();
  const location = useLocation();
  const registration = location.state?.registration;

  if (!registration) {
    return (
      <div className="container section">
        <div className="empty-state card">
          <div className="card__body">
            <div className="empty-state__icon">🔍</div>
            <div className="empty-state__title">No registration data found</div>
            <Link to="/#events-section" className="btn btn--primary mt-4">Browse Events</Link>
          </div>
        </div>
      </div>
    );
  }

  const { registration_id, event_name, team_name, participants } = registration;

  const player1 = participants?.find((p) => p.is_leader) || participants?.[0];
  const player2 = participants?.find((p) => !p.is_leader) || participants?.[1];

  return (
    <div className="success-page">
      <div className="container--narrow">
        {/* Success header */}
        <div className="success-header">
          <div className="success-header__icon">🎉</div>
          <h1 className="success-header__title">REGISTRATION CONFIRMED!</h1>
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

                <div className="success-card__reg-id-section" style={{
                  marginBottom: 'var(--space-5)',
                  padding: 'var(--space-4)',
                  background: '#f8fafc',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)'
                }}>
                  <div className="text-xs text-muted font-mono fw-bold" style={{ textTransform: 'uppercase' }}>
                    Official Registration ID
                  </div>
                  <div className="success-card__reg-id reg-id" style={{ fontSize: '1.75rem', color: '#000000', margin: '6px 0', letterSpacing: '0.05em' }}>
                    {registration_id}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <button
                      className="btn btn--secondary btn--sm success-card__copy"
                      onClick={() => navigator.clipboard.writeText(registration_id)}
                      title="Copy to clipboard"
                    >
                      📋 Copy Registration ID
                    </button>
                    <span className="text-xs text-muted font-mono">
                      (Show this ID at the desk for check-in)
                    </span>
                  </div>
                </div>

                {/* Player Details */}
                {(() => {
                  const hasPlayer2 = Boolean(player2 && player2.full_name && player2.full_name.trim());
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: hasPlayer2 ? '1fr 1fr' : '1fr', gap: 'var(--space-3)' }}>
                      {player1 && (
                        <div style={{ padding: 'var(--space-3) var(--space-4)', background: '#fafafa', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                          <div className="text-xs text-muted font-mono fw-bold" style={{ textTransform: 'uppercase' }}>
                            {hasPlayer2 ? 'PLAYER 1 (LEADER)' : 'PARTICIPANT'}
                          </div>
                          <div className="text-primary fw-bold text-sm">{player1.full_name}</div>
                          {(player1.prn || player1.student_id) && (
                            <div className="text-xs font-mono fw-semibold" style={{ color: '#000000', margin: '2px 0' }}>
                              PRN: {player1.prn || player1.student_id}
                            </div>
                          )}
                          <div className="text-muted text-xs">{player1.email}</div>
                        </div>
                      )}

                      {hasPlayer2 && (
                        <div style={{ padding: 'var(--space-3) var(--space-4)', background: '#fafafa', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                          <div className="text-xs text-muted font-mono fw-bold" style={{ textTransform: 'uppercase' }}>
                            PLAYER 2
                          </div>
                          <div className="text-primary fw-bold text-sm">{player2.full_name}</div>
                          {(player2.prn || player2.student_id) && (
                            <div className="text-xs font-mono fw-semibold" style={{ color: '#000000', margin: '2px 0' }}>
                              PRN: {player2.prn || player2.student_id}
                            </div>
                          )}
                          <div className="text-muted text-xs">{player2.email}</div>
                        </div>
                      )}
                    </div>
                  );
                })()}
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
