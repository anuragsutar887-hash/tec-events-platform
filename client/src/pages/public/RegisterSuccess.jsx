import { useLocation, Link, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
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

  const { registration_id, event_name, team_name, participants, qr_token } = registration;

  const player1 = participants?.find((p) => p.is_leader) || participants?.[0];
  const player2 = participants?.find((p) => !p.is_leader) || participants?.[1];

  return (
    <div className="success-page">
      <div className="container--narrow">
        {/* Success header */}
        <div className="success-header">
          <div className="success-header__icon">🎉</div>
          <h1 className="success-header__title">REGISTRATION CONFIRMED!</h1>
          <p className="success-header__sub">
            Your duo team is successfully registered. Save your Registration ID and QR pass for event check-in.
          </p>
        </div>

        {/* Registration ID Pass Card */}
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
              <span className="section__label" style={{ marginBottom: 0 }}>OFFICIAL EVENT PASS</span>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 800, margin: 0, textTransform: 'uppercase' }}>
                {event_name || 'Department Technical Event'}
              </h2>
            </div>
            <span className="badge badge--team">DUO TEAM (2 PLAYERS)</span>
          </div>

          <div className="success-card__body card__body" style={{ padding: 'var(--space-6)' }}>
            <div className="success-card__layout">
              <div className="success-card__info">
                {team_name && (
                  <div style={{ marginBottom: 'var(--space-4)' }}>
                    <div className="text-xs text-muted font-mono fw-bold" style={{ textTransform: 'uppercase' }}>
                      Team Name
                    </div>
                    <div className="text-primary fw-bold text-xl">{team_name}</div>
                  </div>
                )}

                <div className="success-card__reg-id-section" style={{ marginBottom: 'var(--space-5)' }}>
                  <div className="text-xs text-muted font-mono fw-bold" style={{ textTransform: 'uppercase' }}>
                    Registration ID
                  </div>
                  <div className="success-card__reg-id reg-id" style={{ fontSize: '1.5rem', color: '#000000', margin: '4px 0' }}>
                    {registration_id}
                  </div>
                  <button
                    className="btn btn--secondary btn--sm success-card__copy"
                    onClick={() => navigator.clipboard.writeText(registration_id)}
                    title="Copy to clipboard"
                  >
                    📋 Copy ID
                  </button>
                </div>

                {/* Player 1 & Player 2 Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {player1 && (
                    <div style={{ padding: 'var(--space-3) var(--space-4)', background: '#fafafa', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                      <div className="text-xs text-muted font-mono fw-bold" style={{ textTransform: 'uppercase' }}>
                        PLAYER 1
                      </div>
                      <div className="text-primary fw-bold text-sm">{player1.full_name}</div>
                      <div className="text-muted text-xs">{player1.email}</div>
                    </div>
                  )}

                  {player2 && (
                    <div style={{ padding: 'var(--space-3) var(--space-4)', background: '#fafafa', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                      <div className="text-xs text-muted font-mono fw-bold" style={{ textTransform: 'uppercase' }}>
                        PLAYER 2
                      </div>
                      <div className="text-primary fw-bold text-sm">{player2.full_name}</div>
                      <div className="text-muted text-xs">{player2.email}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* QR Code */}
              <div className="success-card__qr" style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'var(--space-4)',
                background: '#fafafa',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)'
              }}>
                <div className="success-card__qr-box" style={{
                  background: 'white',
                  padding: 'var(--space-2)',
                  border: '1px solid #000000',
                  marginBottom: 'var(--space-2)'
                }}>
                  <QRCodeSVG
                    value={`${window.location.origin}/lookup?token=${qr_token}`}
                    size={140}
                    level="M"
                    fgColor="#000000"
                    bgColor="#ffffff"
                  />
                </div>
                <div className="success-card__qr-label text-xs font-mono fw-bold text-muted text-center" style={{ textTransform: 'uppercase' }}>
                  SHOW AT DESK FOR CHECK-IN
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="success-actions" style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', marginTop: 'var(--space-6)' }}>
          <Link to="/lookup" className="btn btn--primary">
            VIEW MY TICKET PASS
          </Link>
          <Link to="/#events-section" className="btn btn--secondary">
            Browse More Events
          </Link>
        </div>
      </div>
    </div>
  );
}
