import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { useStudent } from '../../context/StudentAuthContext';
import { formatDate, formatTime, formatDateTime } from '../../utils/dateHelpers';
import './EventDetail.css';

export default function EventDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useStudent();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userRegistration, setUserRegistration] = useState(null); // { reg_code, status, is_leader }

  useEffect(() => {
    window.scrollTo(0, 0);
    apiClient.get(`/events/${slug}`)
      .then(({ data }) => setEvent(data.event))
      .catch(() => setError('Event not found'))
      .finally(() => setLoading(false));
  }, [slug]);

  // Check if the logged-in user is already registered for this event
  useEffect(() => {
    if (!isAuthenticated || !user?.email || !slug) {
      setUserRegistration(null);
      return;
    }
    apiClient.get(`/participants/check?event_slug=${slug}&email=${encodeURIComponent(user.email)}`)
      .then(({ data }) => {
        if (data.registered) {
          setUserRegistration(data);
        } else {
          setUserRegistration(null);
        }
      })
      .catch(() => setUserRegistration(null));
  }, [isAuthenticated, user?.email, slug]);


  // ⚡ Skeleton Loader for Event Detail
  if (loading) {
    return (
      <div className="event-detail">
        <div className="event-detail__hero">
          <div className="container">
            <div className="skeleton" style={{ width: '140px', height: '20px', marginBottom: 'var(--space-4)' }} />
            <div className="skeleton" style={{ width: '160px', height: '26px', marginBottom: 'var(--space-3)' }} />
            <div className="skeleton skeleton-title" style={{ width: '60%', height: '48px', marginBottom: 'var(--space-4)' }} />
            <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
              <div className="skeleton" style={{ width: '130px', height: '20px' }} />
              <div className="skeleton" style={{ width: '150px', height: '20px' }} />
              <div className="skeleton" style={{ width: '120px', height: '20px' }} />
            </div>
          </div>
        </div>

        <div className="container section">
          <div className="event-detail__layout">
            <div className="event-detail__main">
              <div className="card skeleton-card mb-6" style={{ height: '200px' }} />
              <div className="card skeleton-card mb-6" style={{ height: '240px' }} />
            </div>
            <aside className="event-detail__sidebar">
              <div className="card skeleton-card mb-4" style={{ height: '180px' }} />
              <div className="card skeleton-card" style={{ height: '220px' }} />
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

  const participationType = 'Duo Team (2 Players)';

  return (
    <div className="event-detail">
      {/* Hero Header Section */}
      <div className="event-detail__hero">
        <div className="container">
          <div className="event-detail__header-nav">
            <Link to="/#events-section" className="event-detail__back">
              Back to Department Events
            </Link>
          </div>

          <div className="event-detail__badges">
            <span className="badge badge--tag">IT DEPARTMENT EVENT</span>
          </div>

          <h1 className="event-detail__title">{event.name}</h1>

          {/* Clean Meta Row */}
          <div className="event-detail__meta">
            {event.event_date && (
              <div className="event-detail__meta-item">
                <span className="event-detail__meta-icon">📅</span>
                <span>{formatDate(event.event_date)}</span>
              </div>
            )}
            {(event.start_time || event.end_time) && (
              <div className="event-detail__meta-item">
                <span className="event-detail__meta-icon">🕐</span>
                <span>
                  {event.start_time ? formatTime(event.start_time) : ''}
                  {event.start_time && event.end_time ? ' – ' : ''}
                  {event.end_time ? formatTime(event.end_time) : ''}
                </span>
              </div>
            )}
            {event.venue && (
              <div className="event-detail__meta-item">
                <span className="event-detail__meta-icon">📍</span>
                <span>{event.venue}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="container">
        {/* Sleek Event Banner Image (Contained & Proportional) */}
        {event.banner_url && (
          <div className="event-detail__banner-card">
            <img
              src={event.banner_url}
              alt={event.name}
              className="event-detail__banner-img"
            />
          </div>
        )}

        <div className="event-detail__layout">
          {/* Main content column */}
          <div className="event-detail__main">
            {/* 1. Quick Registration & Brief Card */}
            <div className="card event-detail__quick-reg-card mb-6">
              <div className="card__header">
                <div>
                  <span className="section__label" style={{ marginBottom: 0 }}>EVENT BRIEF & REGISTRATION MATRIX</span>
                  <h3 className="event-detail__brief-title">
                    {event.short_description || 'Department Technical Challenge'}
                  </h3>
                </div>
              </div>
              <div className="card__body">
                <p className="event-detail__brief-desc">
                  {event.short_description || 'Join this competitive technical symposium organized by the IT Department Technical Committee.'}
                </p>

                {/* Clean, Non-overlapping Action Buttons */}
                <div className="event-detail__action-buttons">
                  {userRegistration ? (
                    /* ✅ Already Registered — show confirmed registration details */
                    <div className="event-detail__already-registered">
                      <div className="event-detail__already-badge">
                        {userRegistration.status === 'CONFIRMED' ? (
                          <span style={{ color: '#16a34a', fontWeight: 700 }}>✓ You are officially registered for this event</span>
                        ) : userRegistration.status === 'PENDING_APPROVAL' ? (
                          <span style={{ color: '#d97706', fontWeight: 700 }}>⏳ Registration pending teammate approval</span>
                        ) : (
                          <span style={{ color: '#6b7280', fontWeight: 700 }}>Registration: {userRegistration.status}</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Registration ID: <span className="font-mono" style={{ fontWeight: 700, color: '#000', fontSize: '1rem' }}>{userRegistration.reg_code}</span>
                      </div>
                    </div>
                  ) : regStatus === 'OPEN' ? (
                    <Link
                      to={isAuthenticated ? `/events/${slug}/register` : `/login?redirect=/events/${slug}/register`}
                      className="btn btn--primary btn--lg event-detail__main-reg-btn"
                      id="event-detail-register-btn"
                    >
                      REGISTER NOW
                    </Link>
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
                      <span className="event-detail__rule-text">{rule}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Guidelines & Instructions */}
            {event.instructions && (
              <div className="event-detail__section">
                <h2 className="event-detail__section-title">GUIDELINES & INSTRUCTIONS</h2>
                <div className="event-detail__desc">{event.instructions}</div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="event-detail__sidebar">
            {/* Key Event Specifications */}
            <div className="event-detail__info-card card mb-6">
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
                {event.registration_closes_at && (
                  <div className="event-detail__info-item">
                    <span className="event-detail__info-label">Closes</span>
                    <span className="event-detail__info-val text-danger fw-bold">
                      {formatDate(event.registration_closes_at)}
                    </span>
                  </div>
                )}
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
