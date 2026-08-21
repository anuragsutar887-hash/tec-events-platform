import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { formatDate, formatTime, formatDateTime } from '../../utils/dateHelpers';
import './EventDetail.css';

export default function EventDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient.get(`/events/${slug}`)
      .then(({ data }) => setEvent(data.event))
      .catch(() => setError('Event not found'))
      .finally(() => setLoading(false));
  }, [slug]);

  // ⚡ Skeleton Loader for Event Detail
  if (loading) {
    return (
      <div className="event-detail">
        <div className="event-detail__hero" style={{ padding: 'var(--space-12) 0' }}>
          <div className="container">
            <div className="skeleton" style={{ width: '120px', height: '18px', marginBottom: 'var(--space-4)' }} />
            <div className="skeleton" style={{ width: '140px', height: '24px', borderRadius: 'var(--radius-full)', marginBottom: 'var(--space-3)' }} />
            <div className="skeleton skeleton-title" style={{ width: '50%', height: '40px', marginBottom: 'var(--space-4)' }} />
            <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
              <div className="skeleton" style={{ width: '120px', height: '18px' }} />
              <div className="skeleton" style={{ width: '140px', height: '18px' }} />
              <div className="skeleton" style={{ width: '100px', height: '18px' }} />
            </div>
          </div>
        </div>

        <div className="container section">
          <div className="event-detail__layout">
            <div className="event-detail__main">
              <div className="card skeleton-card mb-6" style={{ height: '180px' }} />
              <div className="card skeleton-card mb-6" style={{ height: '220px' }} />
            </div>
            <aside className="event-detail__sidebar">
              <div className="card skeleton-card mb-4" style={{ height: '160px' }} />
              <div className="card skeleton-card" style={{ height: '200px' }} />
            </aside>
          </div>
        </div>
      </div>
    );
  }

  if (error || !event) return (
    <div className="container section">
      <div className="empty-state card">
        <div className="card__body">
          <div className="empty-state__icon">🔍</div>
          <div className="empty-state__title">Event Not Found</div>
          <Link to="/#events-section" className="btn btn--primary mt-4">Back to Events</Link>
        </div>
      </div>
    </div>
  );

  const regStatus = event.registration_status;
  const regBadgeMap = {
    OPEN: { cls: 'badge--open', label: '• REGISTRATION OPEN' },
    NOT_OPEN: { cls: 'badge--upcoming', label: '• COMING SOON' },
    CLOSED: { cls: 'badge--closed', label: '• REGISTRATION CLOSED' },
  };
  const regBadge = regBadgeMap[regStatus] || { cls: '', label: regStatus };

  const participationType = event.allows_solo && event.allows_team
    ? `Solo & Duo Team (${event.min_team_size}–${event.max_team_size} members)`
    : event.allows_team
    ? `Duo Team (${event.min_team_size}–${event.max_team_size} members)`
    : 'Solo Participant';

  return (
    <div className="event-detail">
      {/* Banner */}
      {event.banner_url && (
        <div className="event-detail__banner">
          <img src={event.banner_url} alt={event.name} />
        </div>
      )}

      {/* Hero Header */}
      <div className="event-detail__hero">
        <div className="container">
          <Link to="/#events-section" className="event-detail__back">← Back to Department Events</Link>
          <div className="event-detail__badges">
            <span className={`badge ${regBadge.cls}`}>{regBadge.label}</span>
            <span className="badge badge--tag">DEPARTMENT EVENT</span>
          </div>
          <h1 className="event-detail__title">{event.name}</h1>
          <div className="event-detail__meta">
            {event.event_date && (
              <div className="event-detail__meta-item">
                <span>📅</span>
                <span>{formatDate(event.event_date)}</span>
              </div>
            )}
            {(event.start_time || event.end_time) && (
              <div className="event-detail__meta-item">
                <span>🕐</span>
                <span>
                  {event.start_time ? formatTime(event.start_time) : ''}
                  {event.start_time && event.end_time ? ' – ' : ''}
                  {event.end_time ? formatTime(event.end_time) : ''}
                </span>
              </div>
            )}
            {event.venue && (
              <div className="event-detail__meta-item">
                <span>📍</span>
                <span>{event.venue}</span>
              </div>
            )}
            <div className="event-detail__meta-item">
              <span>👥</span>
              <span>{participationType}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="event-detail__layout">
          {/* Main content */}
          <div className="event-detail__main">
            {/* 1. Short Info & Registration Options Card (Task 2) */}
            <div className="card event-detail__quick-reg-card mb-6">
              <div className="card__header">
                <div>
                  <span className="section__label" style={{ marginBottom: 0 }}>EVENT BRIEF & REGISTRATION MATRIX</span>
                  <h3 className="text-lg fw-bold text-primary" style={{ fontFamily: 'var(--font-serif)', marginTop: '2px' }}>
                    {event.short_description || 'Department Technical Challenge'}
                  </h3>
                </div>
              </div>
              <div className="card__body">
                <p className="text-secondary text-sm mb-4" style={{ lineHeight: 1.6 }}>
                  {event.short_description || 'Join this competitive technical symposium organized by the Department Technical Committee.'}
                </p>

                {/* Direct Registration Options */}
                <div className="event-detail__reg-actions">
                  {regStatus === 'OPEN' ? (
                    <div className="event-detail__reg-buttons-row">
                      <Link
                        to={`/events/${slug}/register`}
                        className="btn btn--primary btn--lg"
                        id="event-detail-register-btn"
                      >
                        INITIALIZE REGISTRATION →
                      </Link>
                      <Link
                        to="/lookup"
                        className="btn btn--secondary btn--lg"
                      >
                        CHECK EXISTING TICKET
                      </Link>
                    </div>
                  ) : regStatus === 'NOT_OPEN' ? (
                    <div className="alert alert--info">
                      Registration opens {event.registration_opens_at ? formatDateTime(event.registration_opens_at) : 'soon'}. Stay tuned!
                    </div>
                  ) : (
                    <div className="alert alert--error">
                      Registration is officially closed for this event.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Full Description */}
            {event.full_description && (
              <div className="event-detail__section">
                <h2 className="event-detail__section-title">ABOUT THIS EVENT</h2>
                <div className="event-detail__desc">{event.full_description}</div>
              </div>
            )}

            {/* 3. Event Rules */}
            {event.rules && (
              <div className="event-detail__section">
                <h2 className="event-detail__section-title">COMPETITION RULES</h2>
                <div className="event-detail__rules">
                  {event.rules.split('\n').filter(Boolean).map((rule, i) => (
                    <div key={i} className="event-detail__rule">
                      <span className="event-detail__rule-num">{i < 9 ? `0${i + 1}` : i + 1}</span>
                      <span>{rule}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Instructions */}
            {event.instructions && (
              <div className="event-detail__section">
                <h2 className="event-detail__section-title">GUIDELINES & INSTRUCTIONS</h2>
                <div className="event-detail__desc">{event.instructions}</div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="event-detail__sidebar">
            {/* Registration CTA Sidebar */}
            <div className="event-detail__reg-card card">
              <div className="card__body">
                <div className={`badge ${regBadge.cls}`} style={{ marginBottom: 'var(--space-4)', display: 'block', textAlign: 'center' }}>
                  {regBadge.label}
                </div>

                {event.registration_closes_at && (
                  <div className="event-detail__reg-deadline">
                    <span className="text-xs text-muted font-mono" style={{ textTransform: 'uppercase' }}>Registration Closes</span>
                    <span className="text-sm fw-bold text-primary">
                      {formatDateTime(event.registration_closes_at)}
                    </span>
                  </div>
                )}

                {regStatus === 'OPEN' && (
                  <Link
                    to={`/events/${slug}/register`}
                    className="btn btn--primary btn--full btn--lg"
                    style={{ marginTop: 'var(--space-4)' }}
                  >
                    REGISTER NOW →
                  </Link>
                )}
              </div>
            </div>

            {/* Key Event Details */}
            <div className="event-detail__info-card card">
              <div className="card__header">
                <span className="section__label" style={{ marginBottom: 0 }}>SPECIFICATIONS</span>
              </div>
              <div className="card__body event-detail__info-list">
                <div className="event-detail__info-item">
                  <span className="event-detail__info-label">Date</span>
                  <span className="event-detail__info-val">{event.event_date ? formatDate(event.event_date) : '—'}</span>
                </div>
                <div className="event-detail__info-item">
                  <span className="event-detail__info-label">Time</span>
                  <span className="event-detail__info-val">
                    {event.start_time ? `${formatTime(event.start_time)}${event.end_time ? ` – ${formatTime(event.end_time)}` : ''}` : '—'}
                  </span>
                </div>
                <div className="event-detail__info-item">
                  <span className="event-detail__info-label">Venue</span>
                  <span className="event-detail__info-val">{event.venue || '—'}</span>
                </div>
                <div className="event-detail__info-item">
                  <span className="event-detail__info-label">Format</span>
                  <span className="event-detail__info-val">{participationType}</span>
                </div>
              </div>
            </div>

            {/* Coordinator Contact */}
            {event.contact_info && (event.contact_info.email || event.contact_info.phone || event.contact_info.name) && (
              <div className="event-detail__info-card card">
                <div className="card__header">
                  <span className="section__label" style={{ marginBottom: 0 }}>EVENT COORDINATOR</span>
                </div>
                <div className="card__body event-detail__info-list">
                  {event.contact_info.name && (
                    <div className="event-detail__info-item">
                      <span className="event-detail__info-label">Coordinator</span>
                      <span className="event-detail__info-val">{event.contact_info.name}</span>
                    </div>
                  )}
                  {event.contact_info.email && (
                    <div className="event-detail__info-item">
                      <span className="event-detail__info-label">Email</span>
                      <a href={`mailto:${event.contact_info.email}`} className="event-detail__info-val text-accent">
                        {event.contact_info.email}
                      </a>
                    </div>
                  )}
                  {event.contact_info.phone && (
                    <div className="event-detail__info-item">
                      <span className="event-detail__info-label">Phone</span>
                      <a href={`tel:${event.contact_info.phone}`} className="event-detail__info-val text-accent">
                        {event.contact_info.phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
