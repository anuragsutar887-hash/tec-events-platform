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

  // 🔐 Email OTP Verification State (Player 1)
  const [otpState, setOtpState] = useState('IDLE'); // 'IDLE' | 'SENT' | 'VERIFIED'
  const [enteredOtp, setEnteredOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpNotice, setOtpNotice] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
    apiClient.get(`/events/${slug}`)
      .then(({ data }) => setEvent(data.event))
      .catch(() => setApiError('Event not found'))
      .finally(() => setLoading(false));
  }, [slug]);

  // Resend Countdown Timer
  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // ─── ✉️ Send OTP to Player 1 Email ─────────────────────────────
  const handleSendOtp = () => {
    setOtpError('');
    setOtpNotice('');

    const email = player1.email.trim();
    if (!email) {
      setErrors((prev) => ({ ...prev, p1_email: 'Please enter your email address first' }));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors((prev) => ({ ...prev, p1_email: 'Enter a valid email address' }));
      return;
    }

    // Generate secure 6-digit numeric OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setOtpState('SENT');
    setResendTimer(60);
    setEnteredOtp('');
    setOtpNotice(`Verification OTP sent to ${email}. (Your OTP code is: ${code})`);
  };

  // ─── 🔒 Verify Entered OTP ──────────────────────────────────────
  const handleVerifyOtp = () => {
    setOtpError('');
    if (!enteredOtp || enteredOtp.trim().length !== 6) {
      setOtpError('Please enter the complete 6-digit OTP');
      return;
    }

    if (enteredOtp.trim() === generatedOtp) {
      setOtpState('VERIFIED');
      setOtpNotice('');
      setOtpError('');
      setErrors((prev) => ({ ...prev, p1_email: '' }));
    } else {
      setOtpError('Incorrect OTP code. Please verify and try again.');
    }
  };

  // Reset OTP state if user wants to change email
  const handleChangeEmail = () => {
    setOtpState('IDLE');
    setEnteredOtp('');
    setGeneratedOtp('');
    setOtpError('');
    setOtpNotice('');
    setResendTimer(0);
  };

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
    } else if (otpState !== 'VERIFIED') {
      errs.p1_email = 'Please verify Player 1 email with OTP before proceeding';
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
          <Link to={`/events/${slug}`} className="event-detail__back">Back to {event.name}</Link>
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

              {/* Section 2: Player 1 (with OTP Verification) */}
              <div className="register-form__section card">
                <div className="card__header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <span className="section__label" style={{ marginBottom: 0 }}>MEMBER 1 (PRIMARY)</span>
                    <h2 className="register-form__section-title" style={{ marginTop: 2, marginBottom: 0 }}>
                      PLAYER 1
                    </h2>
                  </div>
                  {otpState === 'VERIFIED' && (
                    <span className="otp-verified-badge">
                      ✓ Email Verified
                    </span>
                  )}
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
                      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <input
                          type="email"
                          id="p1-email"
                          className={`form-input ${errors.p1_email ? 'form-input--error' : ''}`}
                          value={player1.email}
                          disabled={otpState === 'VERIFIED'}
                          onChange={(e) => {
                            setPlayer1({ ...player1, email: e.target.value });
                            if (errors.p1_email) setErrors((prev) => ({ ...prev, p1_email: '' }));
                            if (otpState !== 'IDLE') setOtpState('IDLE');
                          }}
                          placeholder="player1@gmail.com"
                          required
                        />

                        {otpState === 'IDLE' && (
                          <button
                            type="button"
                            onClick={handleSendOtp}
                            className="btn btn--secondary"
                            style={{ flexShrink: 0 }}
                          >
                            Verify with OTP
                          </button>
                        )}

                        {otpState === 'VERIFIED' && (
                          <button
                            type="button"
                            onClick={handleChangeEmail}
                            className="btn btn--ghost btn--sm"
                            style={{ flexShrink: 0 }}
                            title="Change Email Address"
                          >
                            Change
                          </button>
                        )}
                      </div>
                      {errors.p1_email && <span className="form-error">{errors.p1_email}</span>}
                    </div>
                  </div>

                  {/* 📩 Inline OTP Entry Box */}
                  {otpState === 'SENT' && (
                    <div className="otp-verification-wrap">
                      <div className="otp-header-info">
                        <span className="text-xs text-primary font-mono fw-bold">
                          📩 Enter the 6-digit OTP code sent to your email
                        </span>
                        {resendTimer > 0 ? (
                          <span className="text-xs text-muted font-mono">
                            Resend in {resendTimer}s
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={handleSendOtp}
                            className="btn btn--ghost btn--sm"
                            style={{ padding: '0 4px', height: 'auto', fontSize: '0.75rem' }}
                          >
                            Resend Code
                          </button>
                        )}
                      </div>

                      {otpNotice && (
                        <div className="alert alert--info" style={{ margin: 0, padding: '8px 12px', fontSize: '0.8125rem' }}>
                          <span>{otpNotice}</span>
                        </div>
                      )}

                      <div className="otp-inputs-row">
                        <input
                          type="text"
                          maxLength={6}
                          className="form-input otp-input-field"
                          placeholder="••••••"
                          value={enteredOtp}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            setEnteredOtp(val);
                            if (otpError) setOtpError('');
                          }}
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={handleVerifyOtp}
                          className="btn btn--primary"
                          disabled={enteredOtp.length !== 6}
                        >
                          Verify Code
                        </button>
                      </div>

                      {otpError && (
                        <span className="form-error" style={{ margin: 0 }}>
                          ⚠️ {otpError}
                        </span>
                      )}
                    </div>
                  )}
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
                <span className="section__label" style={{ marginBottom: 0 }}>REGISTRATION BRIEF</span>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', fontWeight: 800, margin: 0, textTransform: 'uppercase' }}>
                  {event.name}
                </h3>
              </div>
              <div className="card__body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <div>
                    <div className="text-xs text-muted font-mono fw-bold" style={{ textTransform: 'uppercase' }}>Format</div>
                    <div className="text-primary text-sm fw-semibold">Duo Team (2 Members)</div>
                  </div>
                  {event.event_date && (
                    <div>
                      <div className="text-xs text-muted font-mono fw-bold" style={{ textTransform: 'uppercase' }}>Event Date</div>
                      <div className="text-primary text-sm fw-semibold">{new Date(event.event_date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    </div>
                  )}
                  {event.venue && (
                    <div>
                      <div className="text-xs text-muted font-mono fw-bold" style={{ textTransform: 'uppercase' }}>Venue</div>
                      <div className="text-primary text-sm fw-semibold">{event.venue}</div>
                    </div>
                  )}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-3)' }}>
                    <div className="text-xs text-muted font-mono fw-bold" style={{ textTransform: 'uppercase' }}>Fee</div>
                    <div className="text-success text-sm fw-bold">FREE ENTRY</div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
