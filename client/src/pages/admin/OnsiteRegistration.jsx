import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import './OnsiteRegistration.css';

export default function OnsiteRegistration() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(searchParams.get('event_id') || '');
  
  const [teamName, setTeamName] = useState('');
  const [player1, setPlayer1] = useState({ full_name: '', prn: '', email: '' });
  const [player2, setPlayer2] = useState({ full_name: '', prn: '', email: '' });
  const [checkInImmediately, setCheckInImmediately] = useState(true);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const { data } = await apiClient.get('/admin/events');
      const evs = data.events.filter((e) => ['PUBLISHED', 'DRAFT', 'COMPLETED'].includes(e.status));
      setEvents(evs);
      if (!selectedEventId && evs.length > 0) {
        setSelectedEventId(String(evs[0].id));
      }
    } catch {}
  };

  const validate = () => {
    const errs = {};
    if (!selectedEventId) errs.event = 'Select an event';
    if (!teamName.trim()) errs.team_name = 'Team name required';
    if (!player1.full_name.trim()) errs.p1_name = 'Player 1 name required';
    if (!player1.prn.trim()) errs.p1_prn = 'Player 1 PRN required';
    if (!player1.email.trim()) errs.p1_email = 'Player 1 email required';
    if (!player2.full_name.trim()) errs.p2_name = 'Player 2 name required';
    if (!player2.prn.trim()) errs.p2_prn = 'Player 2 PRN required';
    if (!player2.email.trim()) errs.p2_email = 'Player 2 email required';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      const payload = {
        event_id: parseInt(selectedEventId),
        team_name: teamName.trim(),
        player_1: player1,
        player_2: player2,
        is_on_site: true,
        checked_in: checkInImmediately,
      };
      const { data } = await apiClient.post('/admin/registrations/onsite', payload);
      setSuccess(data.registration);
      setTeamName('');
      setPlayer1({ full_name: '', prn: '', email: '' });
      setPlayer2({ full_name: '', prn: '', email: '' });
    } catch (err) {
      setErrors({ submit: err.response?.data?.error || 'Registration failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onsite-page">
      <div className="onsite-page__header">
        <div>
          <h1 className="dashboard__title">On-site Registration Desk</h1>
          <p className="dashboard__subtitle">Register walk-in duo participants and check them in directly</p>
        </div>
      </div>

      {success && (
        <div className="onsite-success card mb-6">
          <div className="card__body">
            <div className="onsite-success__header">
              <span className="onsite-success__icon">✅</span>
              <div>
                <h3 className="onsite-success__title">Team Registered Successfully!</h3>
                <p className="onsite-success__sub">
                  Registration ID:{' '}
                  <span className="font-mono fw-bold text-accent">{success.registration_id}</span>
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
              <button className="btn btn--secondary btn--sm" onClick={() => setSuccess(null)}>
                + Register Another Team
              </button>
              <button
                className="btn btn--primary btn--sm"
                onClick={() => navigate(`/admin/registrations?event_id=${selectedEventId}`)}
              >
                View in Registrations →
              </button>
            </div>
          </div>
        </div>
      )}

      {errors.submit && <div className="alert alert--error mb-4">⚠️ {errors.submit}</div>}

      <form onSubmit={handleSubmit} className="onsite-form">
        {/* Event Selector */}
        <div className="onsite-form__section card">
          <div className="card__header">
            <h2 className="event-form__section-title">📅 Event Selection</h2>
          </div>
          <div className="card__body form-section">
            <div className="form-group">
              <label className="form-label form-label--required">Select Event</label>
              <select
                className={`form-input form-select ${errors.event ? 'form-input--error' : ''}`}
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
              >
                <option value="">-- Select Event --</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name} ({ev.status})
                  </option>
                ))}
              </select>
              {errors.event && <span className="form-error">{errors.event}</span>}
            </div>

            <div className="form-group">
              <label className="form-label form-label--required">Duo Team Name</label>
              <input
                type="text"
                className={`form-input ${errors.team_name ? 'form-input--error' : ''}`}
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Enter unique team name"
                required
              />
              {errors.team_name && <span className="form-error">{errors.team_name}</span>}
            </div>
          </div>
        </div>

        {/* Player 1 */}
        <div className="onsite-form__section card">
          <div className="card__header">
            <span className="section__label" style={{ marginBottom: 0 }}>MEMBER 1</span>
            <h2 className="event-form__section-title" style={{ marginTop: 2, marginBottom: 0 }}>
              PLAYER 1 (LEADER)
            </h2>
          </div>
          <div className="card__body form-section">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label form-label--required">Full Name</label>
                <input
                  type="text"
                  className={`form-input ${errors.p1_name ? 'form-input--error' : ''}`}
                  value={player1.full_name}
                  onChange={(e) => setPlayer1({ ...player1, full_name: e.target.value })}
                  placeholder="Player 1 Name"
                  required
                />
                {errors.p1_name && <span className="form-error">{errors.p1_name}</span>}
              </div>
              <div className="form-group">
                <label className="form-label form-label--required">PRN Number</label>
                <input
                  type="text"
                  className={`form-input ${errors.p1_prn ? 'form-input--error' : ''}`}
                  value={player1.prn}
                  onChange={(e) => setPlayer1({ ...player1, prn: e.target.value })}
                  placeholder="e.g. 123B1B045"
                  required
                />
                {errors.p1_prn && <span className="form-error">{errors.p1_prn}</span>}
              </div>
              <div className="form-group">
                <label className="form-label form-label--required">Email ID</label>
                <input
                  type="email"
                  className={`form-input ${errors.p1_email ? 'form-input--error' : ''}`}
                  value={player1.email}
                  onChange={(e) => setPlayer1({ ...player1, email: e.target.value })}
                  placeholder="player1@gmail.com"
                  required
                />
                {errors.p1_email && <span className="form-error">{errors.p1_email}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Player 2 */}
        <div className="onsite-form__section card">
          <div className="card__header">
            <span className="section__label" style={{ marginBottom: 0 }}>MEMBER 2</span>
            <h2 className="event-form__section-title" style={{ marginTop: 2, marginBottom: 0 }}>
              PLAYER 2
            </h2>
          </div>
          <div className="card__body form-section">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label form-label--required">Full Name</label>
                <input
                  type="text"
                  className={`form-input ${errors.p2_name ? 'form-input--error' : ''}`}
                  value={player2.full_name}
                  onChange={(e) => setPlayer2({ ...player2, full_name: e.target.value })}
                  placeholder="Player 2 Name"
                  required
                />
                {errors.p2_name && <span className="form-error">{errors.p2_name}</span>}
              </div>
              <div className="form-group">
                <label className="form-label form-label--required">PRN Number</label>
                <input
                  type="text"
                  className={`form-input ${errors.p2_prn ? 'form-input--error' : ''}`}
                  value={player2.prn}
                  onChange={(e) => setPlayer2({ ...player2, prn: e.target.value })}
                  placeholder="e.g. 123B1B046"
                  required
                />
                {errors.p2_prn && <span className="form-error">{errors.p2_prn}</span>}
              </div>
              <div className="form-group">
                <label className="form-label form-label--required">Email ID</label>
                <input
                  type="email"
                  className={`form-input ${errors.p2_email ? 'form-input--error' : ''}`}
                  value={player2.email}
                  onChange={(e) => setPlayer2({ ...player2, email: e.target.value })}
                  placeholder="player2@gmail.com"
                  required
                />
                {errors.p2_email && <span className="form-error">{errors.p2_email}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="onsite-form__section card">
          <div className="card__body">
            <label className="event-form__feature-toggle">
              <input
                type="checkbox"
                checked={checkInImmediately}
                onChange={(e) => setCheckInImmediately(e.target.checked)}
              />
              <span>Check in immediately into Live Arena upon registration</span>
            </label>
          </div>
        </div>

        <div className="event-form__footer">
          <button type="button" className="btn btn--secondary" onClick={() => navigate('/admin/registrations')}>
            Cancel
          </button>
          <button
            type="submit"
            className={`btn btn--primary btn--lg ${loading ? 'btn--loading' : ''}`}
            disabled={loading}
          >
            {loading ? '' : 'Register & Confirm Team'}
          </button>
        </div>
      </form>
    </div>
  );
}
