import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import { useStudent } from '../../context/StudentAuthContext';
import StudentLoginModal from '../../components/auth/StudentLoginModal';
import './Register.css';

const isValidEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());

export default function Register() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useStudent();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  // Form State
  const [teamName, setTeamName] = useState('');
  const [player1, setPlayer1] = useState({ full_name: '', prn: '', email: '' });
  const [player2, setPlayer2] = useState({ full_name: '', prn: '', email: '' });
  const [player3, setPlayer3] = useState({ full_name: '', prn: '', email: '' });
  const [player4, setPlayer4] = useState({ full_name: '', prn: '', email: '' });
  const [errors, setErrors] = useState({});

  // Success Pop-up Modal State
  const [successModalReg, setSuccessModalReg] = useState(null);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedPwd, setCopiedPwd] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [showPassword, setShowPassword] = useState(true);

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
      setPlayer3({ full_name: '', prn: '', email: '' });
      setPlayer4({ full_name: '', prn: '', email: '' });
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

  // 🔒 Lock scroll on html+body when success pop-up modal is open
  useEffect(() => {
    if (successModalReg) {
      document.documentElement.classList.add('modal-open');
      document.body.classList.add('modal-open');
      return () => {
        document.documentElement.classList.remove('modal-open');
        document.body.classList.remove('modal-open');
      };
    }
  }, [successModalReg]);

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

  const maxPlayers = event?.max_team_size || 2;
  const minPlayers = event?.min_team_size || 1;

  const validate = () => {
    const errs = {};
    if (!teamName.trim()) {
      errs.teamName = 'Team name is required';
    }

    // Player 1 validation (Primary/Leader)
    if (!player1.full_name.trim()) errs.p1_name = 'Your name is required';
    if (!player1.prn.trim()) errs.p1_prn = 'Your PRN is required';
    if (!player1.email.trim()) {
      errs.p1_email = 'Your email is required';
    } else if (!isValidEmail(player1.email)) {
      errs.p1_email = 'Enter a valid email address';
    }

    const checkPlayer = (p, num, isRequired) => {
      const hasAny = p.full_name.trim() || p.prn.trim() || p.email.trim();
      if (isRequired || hasAny) {
        if (!p.full_name.trim()) errs[`p${num}_name`] = `Player ${num} full name is required`;
        if (!p.prn.trim()) errs[`p${num}_prn`] = `Player ${num} PRN number is required`;
        if (!p.email.trim()) {
          errs[`p${num}_email`] = `Player ${num} email is required`;
        } else if (!isValidEmail(p.email)) {
          errs[`p${num}_email`] = 'Enter a valid email address';
        }
      }
    };

    if (maxPlayers >= 2) checkPlayer(player2, 2, minPlayers >= 2);
    if (maxPlayers >= 3) checkPlayer(player3, 3, minPlayers >= 3);
    if (maxPlayers >= 4) checkPlayer(player4, 4, minPlayers >= 4);

    // Cross-check duplicate emails and PRNs
    const allPlayers = [player1, maxPlayers >= 2 && player2, maxPlayers >= 3 && player3, maxPlayers >= 4 && player4].filter(Boolean);
    const validEmails = allPlayers.map(p => p.email.trim().toLowerCase()).filter(Boolean);
    const validPrns = allPlayers.map(p => p.prn.trim().toLowerCase()).filter(Boolean);

    if (new Set(validEmails).size !== validEmails.length) {
      errs.general = 'All team members must have distinct email addresses';
    }
    if (new Set(validPrns).size !== validPrns.length) {
      errs.general = 'All team members must have distinct PRNs';
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

    const activeTeammates = [];
    if (maxPlayers >= 2 && player2.full_name.trim() && player2.prn.trim() && player2.email.trim()) {
      activeTeammates.push(player2);
    }
    if (maxPlayers >= 3 && player3.full_name.trim() && player3.prn.trim() && player3.email.trim()) {
      activeTeammates.push(player3);
    }
    if (maxPlayers >= 4 && player4.full_name.trim() && player4.prn.trim() && player4.email.trim()) {
      activeTeammates.push(player4);
    }

    const hasTeammates = activeTeammates.length > 0;

    setSubmitting(true);
    try {
      const payload = {
        event_slug: slug,
        team_name: teamName.trim(),
        player_1: player1,
        player_2: activeTeammates[0] || null,
        player_3: activeTeammates[1] || null,
        player_4: activeTeammates[2] || null,
        players: [player1, ...activeTeammates],
        ...(hasTeammates ? { status: 'PENDING_APPROVAL' } : { status: 'CONFIRMED' }),
      };

      const { data } = await apiClient.post('/registrations', payload);

      // Save credentials in local storage cache
      if (data?.registration?.password) {
        try {
          const stored = JSON.parse(localStorage.getItem('tec_team_passwords') || '{}');
          stored[data.registration.registration_id] = data.registration.password;
          stored[String(data.registration.id)] = data.registration.password;
          localStorage.setItem('tec_team_passwords', JSON.stringify(stored));
        } catch {}
      }

      // Show immediate Registration Success Pop-up Modal with Team ID and Password!
      setSuccessModalReg(data.registration);
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

  const handleCloseSuccessModal = () => {
    if (!successModalReg) return;
    const reg = successModalReg;
    setSuccessModalReg(null);

    const hasTeammates = (reg.participants?.length || 1) > 1;
    if (hasTeammates && reg.status === 'PENDING_APPROVAL') {
      setPendingApprovalReg(reg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate(`/events/${slug}/register/success`, {
        state: { registration: reg }
      });
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

  // ─── SCREEN: ALREADY REGISTERED ────────────────────────────
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
          <div className="card" style={{ border: '2px solid #000000', overflow: 'hidden' }}>
            <div className="card__body" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: 'var(--space-3)' }}>
                {userRegistration.status === 'CONFIRMED' ? '✅' : '⏳'}
              </div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 800, color: '#000', marginBottom: 'var(--space-2)' }}>
                {userRegistration.status === 'CONFIRMED' ? 'You are officially registered!' : 'Registration Pending Teammate Approval'}
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)', maxWidth: '420px', margin: '0 auto var(--space-4)' }}>
                {userRegistration.status === 'CONFIRMED'
                  ? 'Your participation in this event has been confirmed. You can view your credentials or event details below.'
                  : 'Your registration is awaiting your teammate approval. Once they log in and approve, your registration is confirmed.'}
              </p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 'var(--space-6)' }}>
                Registration ID: <strong style={{ color: '#000' }}>{userRegistration.reg_code}</strong>
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link to={`/events/${slug}`} className="btn btn--primary btn--lg">
                  VIEW EVENT DETAILS
                </Link>
                <Link to="/#events-section" className="btn btn--secondary btn--lg">
                  BROWSE ALL EVENTS
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── SCREEN: WAITING FOR APPROVAL FROM TEAMMATE ──────────────
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
                  Your team registration for <strong>"{teamName}"</strong> is created. Your teammate must log into their account to confirm the registration.
                </p>

                <div className="card" style={{ background: '#fcfcfc', border: '1px dashed var(--border)', padding: 'var(--space-4)', maxWidth: '480px', margin: '0 auto var(--space-6)', textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span className="text-xs text-muted font-mono fw-bold">LEADER (P1):</span>
                    <span className="text-xs text-primary font-mono fw-semibold">{player1.full_name} ({player1.prn})</span>
                  </div>
                  {player2.full_name && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span className="text-xs text-muted font-mono fw-bold">TEAMMATE (P2):</span>
                      <span className="text-xs text-primary font-mono fw-semibold">{player2.full_name} ({player2.prn})</span>
                    </div>
                  )}
                  {player2.email && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="text-xs text-muted font-mono fw-bold">TEAMMATE EMAIL:</span>
                      <span className="text-xs text-primary font-mono fw-semibold">{player2.email}</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn--secondary" onClick={handleCopyInvite}>
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
              {errors.general && (
                <div className="alert alert--error mb-4">
                  <span>⚠️</span>
                  <span>{errors.general}</span>
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
                      Team Name / Handle
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

              {/* Section 3: Player 2 (If maxPlayers >= 2) */}
              {maxPlayers >= 2 && (
                <div className="register-form__section card">
                  <div className="card__header">
                    <span className="section__label" style={{ marginBottom: 0 }}>
                      MEMBER 2 ({minPlayers >= 2 ? 'COMPULSORY' : 'OPTIONAL'})
                    </span>
                    <h2 className="register-form__section-title" style={{ marginTop: 2, marginBottom: 0 }}>
                      PLAYER 2
                    </h2>
                  </div>
                  <div className="card__body">
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="p2-name" className={`form-label ${minPlayers >= 2 ? 'form-label--required' : ''}`}>
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
                        />
                        {errors.p2_name && <span className="form-error">{errors.p2_name}</span>}
                      </div>

                      <div className="form-group">
                        <label htmlFor="p2-prn" className={`form-label ${minPlayers >= 2 ? 'form-label--required' : ''}`}>
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
                        />
                        {errors.p2_prn && <span className="form-error">{errors.p2_prn}</span>}
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="p2-email" className={`form-label ${minPlayers >= 2 ? 'form-label--required' : ''}`}>
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
                      />
                      {errors.p2_email && <span className="form-error">{errors.p2_email}</span>}
                    </div>
                  </div>
                </div>
              )}

              {/* Section 4: Player 3 (If maxPlayers >= 3) */}
              {maxPlayers >= 3 && (
                <div className="register-form__section card">
                  <div className="card__header">
                    <span className="section__label" style={{ marginBottom: 0 }}>
                      MEMBER 3 ({minPlayers >= 3 ? 'COMPULSORY' : 'OPTIONAL'})
                    </span>
                    <h2 className="register-form__section-title" style={{ marginTop: 2, marginBottom: 0 }}>
                      PLAYER 3
                    </h2>
                  </div>
                  <div className="card__body">
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="p3-name" className={`form-label ${minPlayers >= 3 ? 'form-label--required' : ''}`}>
                          Member 3 Full Name
                        </label>
                        <input
                          type="text"
                          id="p3-name"
                          className={`form-input ${errors.p3_name ? 'form-input--error' : ''}`}
                          value={player3.full_name}
                          onChange={(e) => {
                            setPlayer3({ ...player3, full_name: e.target.value });
                            if (errors.p3_name) setErrors((prev) => ({ ...prev, p3_name: '' }));
                          }}
                          autoComplete="off"
                        />
                        {errors.p3_name && <span className="form-error">{errors.p3_name}</span>}
                      </div>

                      <div className="form-group">
                        <label htmlFor="p3-prn" className={`form-label ${minPlayers >= 3 ? 'form-label--required' : ''}`}>
                          Member 3 PRN Number
                        </label>
                        <input
                          type="text"
                          id="p3-prn"
                          className={`form-input font-mono ${errors.p3_prn ? 'form-input--error' : ''}`}
                          value={player3.prn}
                          onChange={(e) => {
                            setPlayer3({ ...player3, prn: e.target.value });
                            if (errors.p3_prn) setErrors((prev) => ({ ...prev, p3_prn: '' }));
                          }}
                          autoComplete="off"
                        />
                        {errors.p3_prn && <span className="form-error">{errors.p3_prn}</span>}
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="p3-email" className={`form-label ${minPlayers >= 3 ? 'form-label--required' : ''}`}>
                        Member 3 Email ID
                      </label>
                      <input
                        type="email"
                        id="p3-email"
                        className={`form-input ${errors.p3_email ? 'form-input--error' : ''}`}
                        value={player3.email}
                        onChange={(e) => {
                          setPlayer3({ ...player3, email: e.target.value });
                          if (errors.p3_email) setErrors((prev) => ({ ...prev, p3_email: '' }));
                        }}
                        autoComplete="off"
                      />
                      {errors.p3_email && <span className="form-error">{errors.p3_email}</span>}
                    </div>
                  </div>
                </div>
              )}

              {/* Section 5: Player 4 (If maxPlayers >= 4) */}
              {maxPlayers >= 4 && (
                <div className="register-form__section card">
                  <div className="card__header">
                    <span className="section__label" style={{ marginBottom: 0 }}>
                      MEMBER 4 ({minPlayers >= 4 ? 'COMPULSORY' : 'OPTIONAL'})
                    </span>
                    <h2 className="register-form__section-title" style={{ marginTop: 2, marginBottom: 0 }}>
                      PLAYER 4
                    </h2>
                  </div>
                  <div className="card__body">
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="p4-name" className={`form-label ${minPlayers >= 4 ? 'form-label--required' : ''}`}>
                          Member 4 Full Name
                        </label>
                        <input
                          type="text"
                          id="p4-name"
                          className={`form-input ${errors.p4_name ? 'form-input--error' : ''}`}
                          value={player4.full_name}
                          onChange={(e) => {
                            setPlayer4({ ...player4, full_name: e.target.value });
                            if (errors.p4_name) setErrors((prev) => ({ ...prev, p4_name: '' }));
                          }}
                          autoComplete="off"
                        />
                        {errors.p4_name && <span className="form-error">{errors.p4_name}</span>}
                      </div>

                      <div className="form-group">
                        <label htmlFor="p4-prn" className={`form-label ${minPlayers >= 4 ? 'form-label--required' : ''}`}>
                          Member 4 PRN Number
                        </label>
                        <input
                          type="text"
                          id="p4-prn"
                          className={`form-input font-mono ${errors.p4_prn ? 'form-input--error' : ''}`}
                          value={player4.prn}
                          onChange={(e) => {
                            setPlayer4({ ...player4, prn: e.target.value });
                            if (errors.p4_prn) setErrors((prev) => ({ ...prev, p4_prn: '' }));
                          }}
                          autoComplete="off"
                        />
                        {errors.p4_prn && <span className="form-error">{errors.p4_prn}</span>}
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="p4-email" className={`form-label ${minPlayers >= 4 ? 'form-label--required' : ''}`}>
                        Member 4 Email ID
                      </label>
                      <input
                        type="email"
                        id="p4-email"
                        className={`form-input ${errors.p4_email ? 'form-input--error' : ''}`}
                        value={player4.email}
                        onChange={(e) => {
                          setPlayer4({ ...player4, email: e.target.value });
                          if (errors.p4_email) setErrors((prev) => ({ ...prev, p4_email: '' }));
                        }}
                        autoComplete="off"
                      />
                      {errors.p4_email && <span className="form-error">{errors.p4_email}</span>}
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="register-form__footer" style={{ marginTop: 'var(--space-6)' }}>
                <button
                  type="submit"
                  className={`btn btn--primary btn--lg btn--full ${submitting ? 'btn--loading' : ''}`}
                  disabled={submitting}
                  id="register-submit-btn"
                >
                  {submitting ? '' : 'SUBMIT REGISTRATION'}
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
                    <div className="text-xs text-muted font-mono fw-bold" style={{ textTransform: 'uppercase' }}>Team Size</div>
                    <div className="text-primary text-sm fw-semibold">
                      {maxPlayers === 1 ? 'Solo (1 Player)' : `Up to ${maxPlayers} Players (${minPlayers} Compulsory)`}
                    </div>
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

      {/* ─── POP-UP MODAL: REGISTRATION SUCCESSFUL WITH TEAM ID & PASSWORD ─── */}
      {successModalReg && (
        <div className="credentials-modal-overlay" onClick={handleCloseSuccessModal}>
          <div className="credentials-modal-dialog" onClick={(e) => e.stopPropagation()}>

            {/* Header — clean black bar, badge only */}
            <div style={{ background: '#000000', color: '#ffffff', padding: 'var(--space-4) var(--space-5)', borderBottom: '2px solid #27272a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <span className="badge badge--bronze" style={{ fontSize: '0.75rem', fontWeight: 800 }}>
                  🎉 REGISTRATION SUCCESSFUL
                </span>
                <div style={{ color: '#ffffff', fontFamily: 'var(--font-serif)', fontSize: '1.1rem', fontWeight: 800, marginTop: '6px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                  {successModalReg.team_name || 'Team Registration'}
                </div>
                <div style={{ color: '#a1a1aa', fontSize: '0.8rem', marginTop: '2px' }}>
                  {event.name}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseSuccessModal}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#ffffff', fontSize: '1.1rem', cursor: 'pointer', lineHeight: 1, width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >
                ✕
              </button>
            </div>

            {/* Scrollable Body */}
            <div style={{ padding: 'var(--space-5)', overflowY: 'auto', maxHeight: 'calc(90vh - 110px)' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 'var(--space-4)', lineHeight: 1.5 }}>
                Your registration is confirmed. Save your <strong>official team credentials</strong> below:
              </p>

              {/* Team ID Card */}
              <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-4)', marginBottom: 'var(--space-3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span className="text-xs text-muted font-mono fw-bold" style={{ textTransform: 'uppercase' }}>
                    Team ID / Registration Number
                  </span>
                  <button
                    type="button"
                    className="btn btn--secondary btn--xs"
                    onClick={() => {
                      navigator.clipboard.writeText(successModalReg.registration_id);
                      setCopiedId(true);
                      setTimeout(() => setCopiedId(false), 2000);
                    }}
                  >
                    {copiedId ? '✓ Copied!' : '📋 Copy ID'}
                  </button>
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#000000', letterSpacing: '0.04em' }}>
                  {successModalReg.registration_id}
                </div>
              </div>

              {/* Password Card */}
              <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span className="text-xs text-muted font-mono fw-bold" style={{ textTransform: 'uppercase' }}>
                    Team Password
                  </span>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                    <button
                      type="button"
                      className="btn btn--secondary btn--xs"
                      onClick={() => {
                        const pwd = successModalReg.password || successModalReg.team_password;
                        if (pwd) {
                          navigator.clipboard.writeText(pwd);
                          setCopiedPwd(true);
                          setTimeout(() => setCopiedPwd(false), 2000);
                        }
                      }}
                      disabled={!(successModalReg.password || successModalReg.team_password)}
                    >
                      {copiedPwd ? '✓ Copied!' : '📋 Copy Password'}
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#2563eb', letterSpacing: '0.04em' }}>
                  {showPassword
                    ? (successModalReg.password || successModalReg.team_password || '—')
                    : '••••••••••'}
                </div>
                {!(successModalReg.password || successModalReg.team_password) && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Check your registered email for credentials
                  </div>
                )}
              </div>

              {/* Copy All */}
              <button
                type="button"
                className="btn btn--secondary btn--sm btn--full"
                style={{ marginBottom: 'var(--space-4)' }}
                onClick={() => {
                  const text = `IND-TEC REGISTRATION\nEvent: ${event.name}\nTeam Name: ${successModalReg.team_name}\nTeam ID: ${successModalReg.registration_id}\nPassword: ${successModalReg.password || successModalReg.team_password || ''}\n`;
                  navigator.clipboard.writeText(text);
                  setCopiedAll(true);
                  setTimeout(() => setCopiedAll(false), 2500);
                }}
              >
                {copiedAll ? '✓ Copied All Credentials!' : '📋 Copy All Credentials'}
              </button>

              <div style={{ padding: 'var(--space-3)', background: '#fafafa', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-5)' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                  🔒 <strong>Please note:</strong> Keep your Team ID and Password safe. You will need them to log in to your team dashboard and participate in the event.
                </p>
              </div>

              <button
                type="button"
                className="btn btn--primary btn--full btn--lg"
                onClick={handleCloseSuccessModal}
              >
                Proceed to Official Confirmation
              </button>
            </div>
          </div>
        </div>
      )}

      <StudentLoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onSuccess={() => setLoginModalOpen(false)}
      />
    </div>
  );
}
