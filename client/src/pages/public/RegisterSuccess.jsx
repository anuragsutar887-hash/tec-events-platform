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
        <div className="empty-state">
          <div className="empty-state__icon">🔍</div>
          <div className="empty-state__title">No registration data</div>
          <Link to="/events" className="btn btn--primary mt-4">Browse Events</Link>
        </div>
      </div>
    );
  }

  const { registration_id, event_name, participation_mode, registration_type,
    team_name, participants, qr_token } = registration;

  const leader = participants?.find((p) => p.is_leader);
  const members = participants?.filter((p) => !p.is_leader) || [];

  return (
    <div className="success-page">
      <div className="container--narrow">
        {/* Success header */}
        <div className="success-header">
          <div className="success-header__icon">🎉</div>
          <h1 className="success-header__title">Registration Successful!</h1>
          <p className="success-header__sub">
            You're in! Save your registration ID — you'll need it on event day.
          </p>
        </div>

        {/* Registration ID card */}
        <div className="success-card card">
          <div className="success-card__body card__body">
            <div className="success-card__layout">
              <div className="success-card__info">
                <div className="success-card__event-name">{event_name}</div>

                <div className="success-card__reg-id-section">
                  <div className="success-card__label">Registration ID</div>
                  <div className="success-card__reg-id reg-id">{registration_id}</div>
                  <button
                    className="btn btn--ghost btn--sm success-card__copy"
                    onClick={() => {
                      navigator.clipboard.writeText(registration_id);
                    }}
                    title="Copy to clipboard"
                  >
                    📋 Copy
                  </button>
                </div>

                <div className="success-card__badges">
                  <span className={`badge ${participation_mode === 'SOLO' ? 'badge--solo' : 'badge--team'}`}>
                    {participation_mode === 'SOLO' ? '👤 Solo' : '👥 Team'}
                  </span>
                  <span className={`badge ${registration_type === 'ONLINE' ? 'badge--online' : 'badge--onsite'}`}>
                    {registration_type}
                  </span>
                </div>

                {team_name && (
                  <div className="success-card__team-name">
                    <span className="success-card__label">Team</span>
                    <span className="text-primary fw-semibold">{team_name}</span>
                  </div>
                )}
              </div>

              {/* QR Code */}
              <div className="success-card__qr">
                <div className="success-card__qr-box">
                  <QRCodeSVG
                    value={`${window.location.origin}/lookup?token=${qr_token}`}
                    size={140}
                    level="M"
                    fgColor="#111827"
                    bgColor="#ffffff"
                  />
                </div>
                <div className="success-card__qr-label">Show this on event day</div>
              </div>
            </div>
          </div>
        </div>

        {/* Participants */}
        <div className="success-participants card">
          <div className="card__header">
            <h2 className="text-base fw-semibold text-secondary">
              {participation_mode === 'SOLO' ? 'Participant' : `Team Members (${participants?.length || 0})`}
            </h2>
          </div>
          <div className="card__body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {[leader, ...members].filter(Boolean).map((p, i) => (
              <div key={i} className="success-participant">
                <div className="success-participant__name">
                  {p.is_leader && <span className="badge badge--solo" style={{ fontSize: '0.6rem', padding: '0.1rem 0.35rem' }}>Leader</span>}
                  <span>{p.full_name}</span>
                </div>
                <div className="success-participant__detail">
                  {p.email}
                  {p.department && ` · ${p.department}`}
                  {p.year && ` · ${p.year}`}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* What next */}
        <div className="success-next card">
          <div className="card__body">
            <h3 className="text-base fw-semibold text-primary mb-4">What's Next?</h3>
            <div className="success-next__steps">
              <div className="success-next__step">
                <span className="success-next__step-num">1</span>
                <div>
                  <div className="text-sm fw-medium text-primary">Save your Registration ID</div>
                  <div className="text-xs text-muted">Screenshot this page or note down <strong>{registration_id}</strong></div>
                </div>
              </div>
              <div className="success-next__step">
                <span className="success-next__step-num">2</span>
                <div>
                  <div className="text-sm fw-medium text-primary">Arrive on time</div>
                  <div className="text-xs text-muted">Check the event page for date, time, and venue details</div>
                </div>
              </div>
              <div className="success-next__step">
                <span className="success-next__step-num">3</span>
                <div>
                  <div className="text-sm fw-medium text-primary">Show your QR code</div>
                  <div className="text-xs text-muted">Present this page's QR code or your Registration ID to check in</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="success-actions">
          <Link to={`/lookup?id=${registration_id}`} className="btn btn--secondary">
            🔍 View Registration
          </Link>
          <Link to="/events" className="btn btn--ghost">
            Browse More Events
          </Link>
        </div>
      </div>
    </div>
  );
}
