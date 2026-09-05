import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiClient from '../../api/client';
import { useStudent } from '../../context/StudentAuthContext';
import StudentLoginModal from '../../components/auth/StudentLoginModal';
import './Register.css';

const isValidEmail = (email) => {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

export default function Register() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useStudent();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  // Form state: Team Name, Player 1 (auto-filled from user), Player 2
  const [teamName, setTeamName] = useState('');
  const [player1, setPlayer1] = useState({ full_name: '', prn: '', email: '' });
  const [player2, setPlayer2] = useState({ full_name: '', prn: '', email: '' });
  const [errors, setErrors] = useState({});

  // Registration Pending Teammate Approval State
  const [pendingApprovalReg, setPendingApprovalReg] = useState(null);
  const [checkingApproval, setCheckingApproval] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Already-registered state
  const [userRegistration, setUserRegistration] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    apiClient.get(`/events/${slug}`)
      .then(({ data }) => setEvent(data.event))
      .catch(() => setApiError('Event not found'))
      .finally(() => setLoading(false));
  }, [slug]);

  // If not authenticated, take user to the login portal immediately
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate(`/login?redirect=/events/${slug}/register`, { replace: true });
    }
  }, [loading, isAuthenticated, slug, navigate]);

  // Automatically pre-fill Player 1 details from logged in user, or clear on logout
  useEffect(() => {
    if (user) {
      setPlayer1({
        full_name: user.full_name || '',
        prn: user.prn || '',
        email: user.email || '',
      });
    } else {
      setPlayer1({ full_name: '', prn: '', email: '' });
      setPlayer2({ full_name: '', prn: '', email: '' });
      setTeamName('');
    }
  }, [user]);

  // Check if user is already registered for this event
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



  // Live polling for teammate approval when in pending state
  useEffect(() => {
    let timer = null;
    if (pendingApprovalReg && pendingApprovalReg.id) {
      timer = setInterval(async () => {
        try {
          const { data } = await apiClient.get(`/registrations/${pendingApprovalReg.id}`);
          if (data?.registration?.status === 'CONFIRMED') {
            clearInterval(timer);
            navigate(`/events/${slug}/register/success`, {
              state: { registration: data.registration }
            });
          }
        } catch {
          // ignore poll errors
        }
      }, 3000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [pendingApprovalReg, slug, navigate]);

  const handleManualCheckStatus = async () => {
    if (!pendingApprovalReg?.id) return;
    setCheckingApproval(true);
    try {
      const { data } = await apiClient.get(`/registrations/${pendingApprovalReg.id}`);
      if (data?.registration?.status === 'CONFIRMED') {
        navigate(`/events/${slug}/register/success`, {
          state: { registration: data.registration }
        });
      } else {
        alert('Still waiting for teammate to log in and approve. Please ask your teammate to approve from their account.');
      }
    } catch {
      alert('Could not verify status. Please try again in a moment.');
    } finally {
      setCheckingApproval(false);
    }
  };

  const handleCopyInvite = () => {
    const inviteText = `Hey ${player2.full_name}! I have invited you to join team "${teamName}" for the technical event "${event?.name}". Please log into the portal at ${window.location.origin} and click "Approve" to confirm our registration!`;
    navigator.clipboard.writeText(inviteText);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 3000);
  };

  const validate = () => {
    const errs = {};
    if (!teamName.trim()) {
      errs.teamName = 'Team name is required';
    }

    // Player 1 validation (Auto-filled from user account)
    if (!player1.full_name.trim()) errs.p1_name = 'Player 1 name is required';
    if (!player1.prn.trim()) errs.p1_prn = 'Player 1 PRN is required';
    if (!player1.email.trim()) {
      errs.p1_email = 'Player 1 email is required';
    } else if (!isValidEmail(player1.email)) {
      errs.p1_email = 'Enter a valid email address';
    }

    // Player 2 validation
    if (!player2.full_name.trim()) {
      errs.p2_name = 'Teammate full name is required';
    }
    if (!player2.prn.trim()) {
      errs.p2_prn = 'Teammate PRN number is required';
    }
    if (!player2.email.trim()) {
      errs.p2_email = 'Teammate email is required';
    } else if (!isValidEmail(player2.email)) {
      errs.p2_email = 'Enter a valid email address';
    }

    if (player1.email && player2.email && player1.email.toLowerCase().trim() === player2.email.toLowerCase().trim()) {
      errs.p2_email = 'Player 1 and Player 2 must have distinct email addresses';
    }
    if (player1.prn && player2.prn && player1.prn.toLowerCase().trim() === player2.prn.toLowerCase().trim()) {
      errs.p2_prn = 'Player 1 and Player 2 must have distinct PRNs';
    }

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setLoginModalOpen(true);
      return;
    }

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
        status: 'PENDING_APPROVAL',
      };

      const { data } = await apiClient.post('/registrations', payload);
      if (data.registration?.registration_id) {
        localStorage.setItem('my_ticket_id', data.registration.registration_id);
      }

      // Show Waiting for Approval Screen
      setPendingApprovalReg(data.registration);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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

  // ─── ✅ SCREEN: ALREADY REGISTERED ────────────────────────────
  if (userRegistration) {
    return (
      <div className="register-page">
        <div className="register-page__header">
          <div className="container">
            <span className="section__label" style={{ color: '#000000' }}>{event?.name}</span>
            <h1 className="register-page__title">ALREADY REGISTERED</h1>
          </div>
        </div>
        <div className="container--narrow section">
          <div className="card" style={{ border: '2px solid #16a34a', overflow: 'hidden' }}>
            <div className="card__body" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>✅</div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 900, marginBottom: 'var(--space-3)', textTransform: 'uppercase' }}>
                {userRegistration.status === 'CONFIRMED' ? 'You Are Officially Registered!' : 'Registration Pending Approval'}
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>
                {userRegistration.status === 'CONFIRMED'
                  ? 'Your team has been successfully registered. View your ticket for QR code and event details.'
                  : 'Your registration is awaiting your teammate\'s approval. Once they approve, your registration will be confirmed.'}
              </p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 'var(--space-6)' }}>
                Registration ID: <strong style={{ color: '#000' }}>{userRegistration.reg_code}</strong>
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link
                  to={`/lookup?id=${userRegistration.reg_code}`}
                  className="btn btn--primary btn--lg"
                >
                  VIEW YOUR TICKET
                </Link>
                <Link
                  to={`/events/${slug}`}
                  className="btn btn--secondary btn--lg"
                >
                  BACK TO EVENT
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── ⏳ SCREEN: WAITING FOR APPROVAL FROM TEAMMATE ──────────────

  if (pendingApprovalReg) {
    return (
      <div className="register-page">
        <div className="register-page__header">
          <div className="container">
            <span className="section__label" style={{ color: '#000000' }}>TEAM REGISTRATION INITIATED</span>
            <h1 className="register-page__title">WAITING FOR TEAMMATE APPROVAL</h1>
          </div>
        </div>

        <div className="container--narrow section">
          <div className="card" style={{ border: '2px solid #000000', overflow: 'hidden' }}>
            <div className="card__header" style={{ background: '#fafafa', borderBottom: '1px solid var(--border)', padding: 'var(--space-6)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                <div>
                  <span className="section__label" style={{ marginBottom: 0 }}>EVENT</span>
                  <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', fontWeight: 800, margin: 0, textTransform: 'uppercase' }}>
                    {event.name}
                  </h2>
                </div>
                <span className="badge badge--upcoming" style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
                  ⏳ PENDING TEAMMATE APPROVAL
                </span>
              </div>
            </div>

            <div className="card__body" style={{ padding: 'var(--space-6)' }}>
              <div style={{ textAlign: 'center', padding: 'var(--space-6) 0' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: 'var(--space-3)' }}>⏳</div>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', fontWeight: 800, color: '#000000', marginBottom: 'var(--space-2)' }}>
                  Registration Request Sent!
                </h3>
                <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto var(--space-6)', lineHeight: 1.5 }}>
                  Your team registration for <strong>"{teamName}"</strong> is created. Your teammate <strong>{player2.full_name}</strong> must log in to their account and approve the invitation to officially confirm your team registration.
                </p>

                <div className="card" style={{ background: '#fcfcfc', border: '1px dashed var(--border)', padding: 'var(--space-4)', maxWidth: '480px', margin: '0 auto var(--space-6)', textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span className="text-xs text-muted font-mono fw-bold">LEADER (P1):</span>
                    <span className="text-xs text-primary font-mono fw-semibold">{player1.full_name} ({player1.prn})</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span className="text-xs text-muted font-mono fw-bold">TEAMMATE (P2):</span>
                    <span className="text-xs text-primary font-mono fw-semibold">{player2.full_name} ({player2.prn})</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-xs text-muted font-mono fw-bold">TEAMMATE EMAIL:</span>
                    <span className="text-xs text-primary font-mono fw-semibold">{player2.email}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={handleCopyInvite}
                  >
                    {copySuccess ? '✓ Copied Invite Message!' : '📋 Copy Invitation Message'}
                  </button>

                  <button
                    type="button"
                    className={`btn btn--primary ${checkingApproval ? 'btn--loading' : ''}`}
                    onClick={handleManualCheckStatus}
                    disabled={checkingApproval}
                  >
                    {checkingApproval ? '' : '🔄 Check Approval Status'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── MAIN REGISTRATION FORM ──────────────────────────────────────
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
                      autoComplete="off"
                      autoFocus
                      required
                    />
                    {errors.teamName && <span className="form-error">{errors.teamName}</span>}
                  </div>
                </div>
              </div>

              {/* Section 2: Player 1 (Auto-filled from Logged-In User) */}
              <div className="register-form__section card">
                <div className="card__header">
                  <span className="section__label" style={{ marginBottom: 0 }}>MEMBER 1 (PRIMARY / LEADER)</span>
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
                        readOnly={isAuthenticated}
                        onChange={(e) => {
                          setPlayer1({ ...player1, full_name: e.target.value });
                          if (errors.p1_name) setErrors((prev) => ({ ...prev, p1_name: '' }));
                        }}
                        style={isAuthenticated ? { background: '#f5f5f5', cursor: 'not-allowed' } : {}}
                        autoComplete="off"
                        required
                      />
                      {errors.p1_name && <span className="form-error">{errors.p1_name}</span>}
                    </div>

                    <div className="form-group">
                      <label htmlFor="p1-prn" className="form-label form-label--required">
                        PRN Number
                      </label>
                      <input
                        type="text"
                        id="p1-prn"
                        className={`form-input font-mono ${errors.p1_prn ? 'form-input--error' : ''}`}
                        value={player1.prn}
                        readOnly={isAuthenticated}
                        onChange={(e) => {
                          setPlayer1({ ...player1, prn: e.target.value });
                          if (errors.p1_prn) setErrors((prev) => ({ ...prev, p1_prn: '' }));
                        }}
                        style={isAuthenticated ? { background: '#f5f5f5', cursor: 'not-allowed' } : {}}
                        autoComplete="off"
                        required
                      />
                      {errors.p1_prn && <span className="form-error">{errors.p1_prn}</span>}
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="p1-email" className="form-label form-label--required">
                      Email ID
                    </label>
                    <input
                      type="email"
                      id="p1-email"
                      className={`form-input ${errors.p1_email ? 'form-input--error' : ''}`}
                      value={player1.email}
                      readOnly={isAuthenticated}
                      onChange={(e) => {
                        setPlayer1({ ...player1, email: e.target.value });
                        if (errors.p1_email) setErrors((prev) => ({ ...prev, p1_email: '' }));
                      }}
                      style={isAuthenticated ? { background: '#f5f5f5', cursor: 'not-allowed' } : {}}
                      autoComplete="off"
                      required
                    />
                    {errors.p1_email && <span className="form-error">{errors.p1_email}</span>}
                  </div>
                </div>
              </div>

              {/* Section 3: Player 2 (Teammate with Approval Flow) */}
              <div className="register-form__section card">
                <div className="card__header">
                  <span className="section__label" style={{ marginBottom: 0 }}>MEMBER 2 (TEAMMATE)</span>
                  <h2 className="register-form__section-title" style={{ marginTop: 2, marginBottom: 0 }}>
                    PLAYER 2
                  </h2>
                </div>
                <div className="card__body">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="p2-name" className="form-label form-label--required">
                        Teammate Full Name
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
                        autoComplete="off"
                        required
                      />
                      {errors.p2_name && <span className="form-error">{errors.p2_name}</span>}
                    </div>

                    <div className="form-group">
                      <label htmlFor="p2-prn" className="form-label form-label--required">
                        Teammate PRN Number
                      </label>
                      <input
                        type="text"
                        id="p2-prn"
                        className={`form-input font-mono ${errors.p2_prn ? 'form-input--error' : ''}`}
                        value={player2.prn}
                        onChange={(e) => {
                          setPlayer2({ ...player2, prn: e.target.value });
                          if (errors.p2_prn) setErrors((prev) => ({ ...prev, p2_prn: '' }));
                        }}
                        autoComplete="off"
                        required
                      />
                      {errors.p2_prn && <span className="form-error">{errors.p2_prn}</span>}
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="p2-email" className="form-label form-label--required">
                      Teammate Email ID
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
                      autoComplete="off"
                      required
                    />
                    {errors.p2_email && <span className="form-error">{errors.p2_email}</span>}
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
                  {submitting ? '' : 'SUBMIT REGISTRATION & SEND INVITE'}
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

      <StudentLoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onSuccess={() => setLoginModalOpen(false)}
      />
    </div>
  );
}
