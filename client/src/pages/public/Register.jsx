import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiClient from '../../api/client';
import './Register.css';

export default function Register() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  // Clean form state: Team Name, Player 1 (Name, Email), Player 2 (Name, Email)
  const [teamName, setTeamName] = useState('');
  const [player1, setPlayer1] = useState({ full_name: '', email: '' });
  const [player2, setPlayer2] = useState({ full_name: '', email: '' });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    window.scrollTo(0, 0);
    apiClient.get(`/events/${slug}`)
      .then(({ data }) => setEvent(data.event))
      .catch(() => setApiError('Event not found'))
      .finally(() => setLoading(false));
  }, [slug]);

  const validate = () => {
    const errs = {};
    if (!teamName.trim()) {
      errs.teamName = 'Team name is required';
    }
    if (!player1.full_name.trim()) {
      errs.p1_name = 'Player 1 name is required';
    }
    if (!player1.email.trim()) {
      errs.p1_email = 'Player 1 email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(player1.email)) {
      errs.p1_email = 'Enter a valid email address';
    }

    if (!player2.full_name.trim()) {
      errs.p2_name = 'Player 2 name is required';
    }
    if (!player2.email.trim()) {
      errs.p2_email = 'Player 2 email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(player2.email)) {
      errs.p2_email = 'Enter a valid email address';
    }

    if (player1.email && player2.email && player1.email.toLowerCase() === player2.email.toLowerCase()) {
      errs.p2_email = 'Player 1 and Player 2 must have distinct email addresses';
    }

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    setApiError('');

    if (Object.keys(errs).length > 0) {
      window.scrollTo({ top: 100, behavior: 'smooth' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        event_slug: slug,
        team_name: teamName.trim(),
        player_1: player1,
        player_2: player2,
      };

      const { data } = await apiClient.post('/registrations', payload);
      if (data.registration?.registration_id) {
        localStorage.setItem('my_ticket_id', data.registration.registration_id);
      }

      navigate(`/events/${slug}/register/success`, {
        state: { registration: data.registration },
      });
    } catch (err) {
      const errData = err.response?.data;
      setApiError(
        errData?.error ||
        (Array.isArray(errData?.errors) ? errData.errors.join(', ') : 'Registration failed. Please try again.')
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="register-page">
        <div className="container section">
          <div className="skeleton" style={{ width: '220px', height: '24px', marginBottom: 'var(--space-4)' }} />
          <div className="skeleton skeleton-title mb-6" style={{ width: '50%' }} />
          <div className="card skeleton-card" style={{ height: '320px' }} />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container section">
        <div className="empty-state card">
          <div className="card__body">
            <div className="empty-state__icon">⚠️</div>
            <div className="empty-state__title">Event Not Found</div>
            <p className="empty-state__text">{apiError || 'The requested event could not be found.'}</p>
            <Link to="/#events-section" className="btn btn--primary mt-4">Browse Events</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="register-page">
      {/* Header */}
      <div className="register-page__header">
        <div className="container">
          <Link to={`/events/${slug}`} className="event-detail__back">← Back to {event.name}</Link>
          <h1 className="register-page__title">REGISTER FOR {event.name.toUpperCase()}</h1>
        </div>
      </div>

      <div className="container">
        <div className="register-page__layout">
          {/* Main Form */}
          <div className="register-page__main">
            <form onSubmit={handleSubmit} className="register-form" noValidate>
              {apiError && (
                <div className="alert alert--error mb-4">
                  <span>⚠️</span>
                  <span>{apiError}</span>
                </div>
              )}

              {/* Section 1: Team Name */}
              <div className="register-form__section card">
                <div className="card__header">
                  <span className="section__label" style={{ marginBottom: 0 }}>STEP 1</span>
                  <h2 className="register-form__section-title" style={{ marginTop: 2, marginBottom: 0 }}>
                    TEAM NAME
                  </h2>
                </div>
                <div className="card__body">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="team-name-input" className="form-label form-label--required">
                      Team Name
                    </label>
                    <input
                      type="text"
                      id="team-name-input"
                      className={`form-input ${errors.teamName ? 'form-input--error' : ''}`}
                      value={teamName}
                      onChange={(e) => {
                        setTeamName(e.target.value);
                        if (errors.teamName) setErrors((prev) => ({ ...prev, teamName: '' }));
                      }}
                      placeholder="e.g. Binary Beasts, Syntax Squad..."
                      autoFocus
                      required
                    />
                    {errors.teamName && <span className="form-error">{errors.teamName}</span>}
                  </div>
                </div>
              </div>

              {/* Section 2: Player 1 */}
              <div className="register-form__section card">
                <div className="card__header">
                  <span className="section__label" style={{ marginBottom: 0 }}>MEMBER 1</span>
                  <h2 className="register-form__section-title" style={{ marginTop: 2, marginBottom: 0 }}>
                    PLAYER 1
                  </h2>
                </div>
                <div className="card__body">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="p1-name" className="form-label form-label--required">
                        Full Name
                      </label>
                      <input
                        type="text"
                        id="p1-name"
                        className={`form-input ${errors.p1_name ? 'form-input--error' : ''}`}
                        value={player1.full_name}
                        onChange={(e) => {
                          setPlayer1({ ...player1, full_name: e.target.value });
                          if (errors.p1_name) setErrors((prev) => ({ ...prev, p1_name: '' }));
                        }}
                        placeholder="Player 1 Name"
                        required
                      />
                      {errors.p1_name && <span className="form-error">{errors.p1_name}</span>}
                    </div>

                    <div className="form-group">
                      <label htmlFor="p1-email" className="form-label form-label--required">
                        Email Address
                      </label>
                      <input
                        type="email"
                        id="p1-email"
                        className={`form-input ${errors.p1_email ? 'form-input--error' : ''}`}
                        value={player1.email}
                        onChange={(e) => {
                          setPlayer1({ ...player1, email: e.target.value });
                          if (errors.p1_email) setErrors((prev) => ({ ...prev, p1_email: '' }));
                        }}
                        placeholder="player1@gmail.com"
                        required
                      />
                      {errors.p1_email && <span className="form-error">{errors.p1_email}</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Player 2 */}
              <div className="register-form__section card">
                <div className="card__header">
                  <span className="section__label" style={{ marginBottom: 0 }}>MEMBER 2</span>
                  <h2 className="register-form__section-title" style={{ marginTop: 2, marginBottom: 0 }}>
                    PLAYER 2
                  </h2>
                </div>
                <div className="card__body">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="p2-name" className="form-label form-label--required">
                        Full Name
                      </label>
                      <input
                        type="text"
                        id="p2-name"
                        className={`form-input ${errors.p2_name ? 'form-input--error' : ''}`}
                        value={player2.full_name}
                        onChange={(e) => {
                          setPlayer2({ ...player2, full_name: e.target.value });
                          if (errors.p2_name) setErrors((prev) => ({ ...prev, p2_name: '' }));
                        }}
                        placeholder="Player 2 Name"
                        required
                      />
                      {errors.p2_name && <span className="form-error">{errors.p2_name}</span>}
                    </div>

                    <div className="form-group">
                      <label htmlFor="p2-email" className="form-label form-label--required">
                        Email Address
                      </label>
                      <input
                        type="email"
                        id="p2-email"
                        className={`form-input ${errors.p2_email ? 'form-input--error' : ''}`}
                        value={player2.email}
                        onChange={(e) => {
                          setPlayer2({ ...player2, email: e.target.value });
                          if (errors.p2_email) setErrors((prev) => ({ ...prev, p2_email: '' }));
                        }}
                        placeholder="player2@gmail.com"
                        required
                      />
                      {errors.p2_email && <span className="form-error">{errors.p2_email}</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="register-form__footer">
                <Link to={`/events/${slug}`} className="btn btn--secondary btn--lg">
                  Cancel
                </Link>
                <button
                  type="submit"
                  id="register-submit-btn"
                  className={`btn btn--primary btn--lg ${submitting ? 'btn--loading' : ''}`}
                  disabled={submitting}
                >
                  {submitting ? '' : 'COMPLETE REGISTRATION'}
                </button>
              </div>
            </form>
          </div>

          {/* Sidebar Summary */}
          <aside className="register-page__sidebar">
            <div className="card">
              <div className="card__header">
                <span className="section__label" style={{ marginBottom: 0 }}>EVENT SUMMARY</span>
              </div>
              <div className="card__body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div className="text-base fw-bold text-primary" style={{ fontFamily: 'var(--font-serif)' }}>
                  {event.name}
                </div>
                {event.event_date && (
                  <div className="text-sm text-secondary">
                    📅 {new Date(event.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                )}
                {event.venue && (
                  <div className="text-sm text-secondary">
                    📍 {event.venue}
                  </div>
                )}
                <div style={{ marginTop: 'var(--space-2)' }}>
                  <span className="badge badge--team" style={{ width: '100%', justifyContent: 'center', textAlign: 'center', display: 'block' }}>
                    DUO TEAM (2 PLAYERS)
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
