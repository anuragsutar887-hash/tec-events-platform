import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import './Register.css';

const emptyLeader = { full_name: '', email: '', phone: '', college: '', department: '', year: '', student_id: '' };
const emptyMember = { full_name: '', email: '', phone: '', college: '', department: '', year: '' };

const YEAR_OPTIONS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'PG'];

export default function Register() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState('choose'); // choose | form
  const [mode, setMode] = useState('');
  const [teamName, setTeamName] = useState('');
  const [leader, setLeader] = useState({ ...emptyLeader });
  const [members, setMembers] = useState([{ ...emptyMember }]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    apiClient.get(`/events/${slug}`)
      .then(({ data }) => {
        setEvent(data.event);
        // Auto-select if only one mode
        if (data.event.allows_solo && !data.event.allows_team) {
          setMode('SOLO');
          setStep('form');
        } else if (!data.event.allows_solo && data.event.allows_team) {
          setMode('TEAM');
          setStep('form');
        }
      })
      .catch(() => navigate('/events'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="register-page">
        <div className="register-page__header">
          <div className="container">
            <div className="skeleton" style={{ width: '120px', height: '20px', marginBottom: 'var(--space-3)' }} />
            <div className="skeleton skeleton-title" style={{ width: '400px', height: '36px' }} />
          </div>
        </div>
        <div className="container section">
          <div className="register-page__layout">
            <div className="register-page__main">
              <div className="card skeleton-card mb-6" style={{ height: '280px' }} />
              <div className="card skeleton-card" style={{ height: '320px' }} />
            </div>
            <aside className="register-page__sidebar">
              <div className="card skeleton-card" style={{ height: '240px' }} />
            </aside>
          </div>
        </div>
      </div>
    );
  }

  if (!event) return null;

  // Block if not open
  if (event.registration_status !== 'OPEN') {
    return (
      <div className="container section">
        <div className="empty-state">
          <div className="empty-state__icon">🔒</div>
          <div className="empty-state__title">
            {event.registration_status === 'CLOSED' ? 'Registration Closed' : 'Registration Not Open Yet'}
          </div>
          <p className="empty-state__text">
            {event.registration_status === 'CLOSED'
              ? 'Online registration for this event has ended.'
              : 'Registration has not started yet. Please check back later.'}
          </p>
          <Link to={`/events/${slug}`} className="btn btn--secondary mt-4">← Back to Event</Link>
        </div>
      </div>
    );
  }

  const setLeaderField = (f, v) => setLeader((l) => ({ ...l, [f]: v }));
  const setMemberField = (i, f, v) => setMembers((ms) => ms.map((m, idx) => idx === i ? { ...m, [f]: v } : m));
  
  const addMember = () => {
    if (members.length + 1 >= event.max_team_size) return;
    setMembers((ms) => [...ms, { ...emptyMember }]);
  };
  
  const removeMember = (i) => {
    if (members.length <= event.min_team_size - 1) return;
    setMembers((ms) => ms.filter((_, idx) => idx !== i));
  };

  const validate = () => {
    const errs = {};
    if (!leader.full_name.trim()) errs.full_name = 'Full name is required';
    if (!leader.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leader.email)) errs.email = 'Invalid email address';
    if (!leader.phone.trim()) errs.phone = 'Phone number is required';
    if (!leader.college.trim()) errs.college = 'College name is required';
    if (!leader.department.trim()) errs.department = 'Department is required';
    if (!leader.year) errs.year = 'Year is required';

    if (mode === 'TEAM') {
      if (!teamName.trim()) errs.teamName = 'Team name is required';
      const total = 1 + members.length;
      if (total < event.min_team_size) errs.members = `Need at least ${event.min_team_size} members (including you)`;
      if (total > event.max_team_size) errs.members = `Maximum ${event.max_team_size} members allowed`;
      
      members.forEach((m, i) => {
        if (!m.full_name.trim()) errs[`m${i}_name`] = 'Teammate full name is required';
        if (!m.email.trim()) errs[`m${i}_email`] = 'Teammate email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.email)) errs[`m${i}_email`] = 'Invalid email';
        if (!m.phone?.trim()) errs[`m${i}_phone`] = 'Teammate phone is required';
        if (!m.department?.trim()) errs[`m${i}_dept`] = 'Teammate department is required';
        if (!m.year) errs[`m${i}_year`] = 'Teammate year is required';
      });
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    setApiError('');
    if (Object.keys(errs).length > 0) {
      window.scrollTo({ top: 150, behavior: 'smooth' });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        event_slug: slug,
        participation_mode: mode,
        leader,
        members: mode === 'TEAM' ? members : [],
        team_name: mode === 'TEAM' ? teamName.trim() : undefined,
      };
      const { data } = await apiClient.post('/registrations', payload);
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

  return (
    <div className="register-page">
      <div className="register-page__header">
        <div className="container">
          <Link to={`/events/${slug}`} className="event-detail__back">← {event.name}</Link>
          <h1 className="register-page__title">Register for {event.name}</h1>
        </div>
      </div>

      <div className="container">
        <div className="register-page__layout">
          <div className="register-page__main">

            {/* Step: choose mode */}
            {step === 'choose' && (
              <div className="register-choose card">
                <div className="card__body">
                  <h2 className="register-choose__title">How would you like to register?</h2>
                  <div className="register-choose__options">
                    {event.allows_solo && (
                      <button
                        id="choose-solo-btn"
                        className="register-choose__option"
                        onClick={() => { setMode('SOLO'); setStep('form'); }}
                      >
                        <div className="register-choose__option-icon">👤</div>
                        <div>
                          <div className="register-choose__option-title">Register Solo</div>
                          <div className="register-choose__option-desc">Register as an individual participant</div>
                        </div>
                        <span className="register-choose__option-arrow">→</span>
                      </button>
                    )}
                    {event.allows_team && (
                      <button
                        id="choose-team-btn"
                        className="register-choose__option"
                        onClick={() => { setMode('TEAM'); setStep('form'); }}
                      >
                        <div className="register-choose__option-icon">👥</div>
                        <div>
                          <div className="register-choose__option-title">Register as Duo Team</div>
                          <div className="register-choose__option-desc">
                            {event.min_team_size}–{event.max_team_size} members required (2 participants)
                          </div>
                        </div>
                        <span className="register-choose__option-arrow">→</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step: form */}
            {step === 'form' && (
              <form onSubmit={handleSubmit} className="register-form" noValidate>
                {apiError && (
                  <div className="alert alert--error mb-4">
                    <span>⚠️</span><span>{apiError}</span>
                  </div>
                )}

                {/* Team Name */}
                {mode === 'TEAM' && (
                  <div className="register-form__section card">
                    <div className="card__header">
                      <h2 className="register-form__section-title">🏷 Duo Team Name</h2>
                    </div>
                    <div className="card__body">
                      <div className="form-group">
                        <label htmlFor="team-name-input" className="form-label form-label--required">Team Name</label>
                        <input
                          type="text"
                          id="team-name-input"
                          className={`form-input ${errors.teamName ? 'form-input--error' : ''}`}
                          value={teamName}
                          onChange={(e) => setTeamName(e.target.value)}
                          placeholder="e.g. Binary Beasts, Code Crusaders..."
                          maxLength={100}
                        />
                        {errors.teamName && <span className="form-error">{errors.teamName}</span>}
                      </div>
                    </div>
                  </div>
                )}

                {/* Leader / Solo */}
                <div className="register-form__section card">
                  <div className="card__header">
                    <h2 className="register-form__section-title">
                      {mode === 'TEAM' ? '👑 Leader Details (Duo Member 1)' : '👤 Your Details'}
                    </h2>
                  </div>
                  <div className="card__body form-section">
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="leader-full-name" className="form-label form-label--required">Leader Full Name</label>
                        <input
                          id="leader-full-name"
                          type="text"
                          className={`form-input ${errors.full_name ? 'form-input--error' : ''}`}
                          value={leader.full_name}
                          onChange={(e) => setLeaderField('full_name', e.target.value)}
                          placeholder="As per College ID"
                        />
                        {errors.full_name && <span className="form-error">{errors.full_name}</span>}
                      </div>
                      <div className="form-group">
                        <label htmlFor="leader-email" className="form-label form-label--required">Leader Email</label>
                        <input
                          id="leader-email"
                          type="email"
                          className={`form-input ${errors.email ? 'form-input--error' : ''}`}
                          value={leader.email}
                          onChange={(e) => setLeaderField('email', e.target.value)}
                          placeholder="leader@gmail.com"
                        />
                        {errors.email && <span className="form-error">{errors.email}</span>}
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="leader-phone" className="form-label form-label--required">Leader Phone Number</label>
                        <input
                          id="leader-phone"
                          type="tel"
                          className={`form-input ${errors.phone ? 'form-input--error' : ''}`}
                          value={leader.phone}
                          onChange={(e) => setLeaderField('phone', e.target.value)}
                          placeholder="+91 98765 43210"
                        />
                        {errors.phone && <span className="form-error">{errors.phone}</span>}
                      </div>
                      <div className="form-group">
                        <label htmlFor="leader-college" className="form-label form-label--required">College / Institution</label>
                        <input
                          id="leader-college"
                          type="text"
                          className={`form-input ${errors.college ? 'form-input--error' : ''}`}
                          value={leader.college}
                          onChange={(e) => setLeaderField('college', e.target.value)}
                          placeholder="Indira College of Engineering..."
                        />
                        {errors.college && <span className="form-error">{errors.college}</span>}
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="leader-dept" className="form-label form-label--required">Department</label>
                        <input
                          id="leader-dept"
                          type="text"
                          className={`form-input ${errors.department ? 'form-input--error' : ''}`}
                          value={leader.department}
                          onChange={(e) => setLeaderField('department', e.target.value)}
                          placeholder="e.g. IT, CSE, AI & DS, ENTC"
                        />
                        {errors.department && <span className="form-error">{errors.department}</span>}
                      </div>
                      <div className="form-group">
                        <label htmlFor="leader-year" className="form-label form-label--required">Year of Study</label>
                        <select
                          id="leader-year"
                          className={`form-input form-select ${errors.year ? 'form-input--error' : ''}`}
                          value={leader.year}
                          onChange={(e) => setLeaderField('year', e.target.value)}
                        >
                          <option value="">Select year</option>
                          {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
                        </select>
                        {errors.year && <span className="form-error">{errors.year}</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Teammate (Duo Member 2) */}
                {mode === 'TEAM' && (
                  <div className="register-form__section card">
                    <div className="card__header">
                      <h2 className="register-form__section-title">🤝 Teammate Details (Duo Member 2)</h2>
                    </div>
                    <div className="card__body form-section">
                      {members.map((m, i) => (
                        <div key={i} className="register-member">
                          <div className="form-row">
                            <div className="form-group">
                              <label className="form-label form-label--required">Teammate Full Name</label>
                              <input
                                type="text"
                                className={`form-input ${errors[`m${i}_name`] ? 'form-input--error' : ''}`}
                                value={m.full_name}
                                onChange={(e) => setMemberField(i, 'full_name', e.target.value)}
                                placeholder="Teammate's full name"
                              />
                              {errors[`m${i}_name`] && <span className="form-error">{errors[`m${i}_name`]}</span>}
                            </div>
                            <div className="form-group">
                              <label className="form-label form-label--required">Teammate Email</label>
                              <input
                                type="email"
                                className={`form-input ${errors[`m${i}_email`] ? 'form-input--error' : ''}`}
                                value={m.email}
                                onChange={(e) => setMemberField(i, 'email', e.target.value)}
                                placeholder="teammate@gmail.com"
                              />
                              {errors[`m${i}_email`] && <span className="form-error">{errors[`m${i}_email`]}</span>}
                            </div>
                          </div>

                          <div className="form-row">
                            <div className="form-group">
                              <label className="form-label form-label--required">Teammate Phone Number</label>
                              <input
                                type="tel"
                                className={`form-input ${errors[`m${i}_phone`] ? 'form-input--error' : ''}`}
                                value={m.phone}
                                onChange={(e) => setMemberField(i, 'phone', e.target.value)}
                                placeholder="+91 98765 43210"
                              />
                              {errors[`m${i}_phone`] && <span className="form-error">{errors[`m${i}_phone`]}</span>}
                            </div>
                            <div className="form-group">
                              <label className="form-label">College (if different)</label>
                              <input
                                type="text"
                                className="form-input"
                                value={m.college}
                                onChange={(e) => setMemberField(i, 'college', e.target.value)}
                                placeholder={leader.college || 'College name'}
                              />
                            </div>
                          </div>

                          <div className="form-row">
                            <div className="form-group">
                              <label className="form-label form-label--required">Department</label>
                              <input
                                type="text"
                                className={`form-input ${errors[`m${i}_dept`] ? 'form-input--error' : ''}`}
                                value={m.department}
                                onChange={(e) => setMemberField(i, 'department', e.target.value)}
                                placeholder="e.g. IT, CSE, AI & DS"
                              />
                              {errors[`m${i}_dept`] && <span className="form-error">{errors[`m${i}_dept`]}</span>}
                            </div>
                            <div className="form-group">
                              <label className="form-label form-label--required">Year of Study</label>
                              <select
                                className={`form-input form-select ${errors[`m${i}_year`] ? 'form-input--error' : ''}`}
                                value={m.year}
                                onChange={(e) => setMemberField(i, 'year', e.target.value)}
                              >
                                <option value="">Select year</option>
                                {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
                              </select>
                              {errors[`m${i}_year`] && <span className="form-error">{errors[`m${i}_year`]}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="register-form__footer">
                  {event.allows_solo && event.allows_team && (
                    <button type="button" className="btn btn--ghost" onClick={() => setStep('choose')}>
                      ← Change Type
                    </button>
                  )}
                  <button
                    id="register-submit-btn"
                    type="submit"
                    className={`btn btn--primary btn--lg ${submitting ? 'btn--loading' : ''}`}
                    disabled={submitting}
                  >
                    {submitting ? 'Registering Duo Team...' : `Submit Registration →`}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Sidebar summary */}
          <aside className="register-page__sidebar">
            <div className="card">
              <div className="card__header">
                <span className="text-sm fw-semibold text-secondary">Event Summary</span>
              </div>
              <div className="card__body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div className="text-base fw-semibold text-primary">{event.name}</div>
                {event.event_date && (
                  <div className="text-sm text-secondary">
                    📅 {new Date(event.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                )}
                {event.venue && <div className="text-sm text-secondary">📍 {event.venue}</div>}
                {mode && (
                  <div>
                    <span className={`badge ${mode === 'SOLO' ? 'badge--solo' : 'badge--team'}`}>
                      {mode === 'SOLO' ? '👤 Solo' : `👥 Duo Team (2 Members)`}
                    </span>
                  </div>
                )}
                <div className="divider" />
                <div className="text-xs text-muted">
                  Registration closes: {event.registration_closes_at
                    ? new Date(event.registration_closes_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : 'Not specified'}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
