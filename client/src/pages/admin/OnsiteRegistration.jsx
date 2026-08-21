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
  const [player1, setPlayer1] = useState({ full_name: '', email: '' });
  const [player2, setPlayer2] = useState({ full_name: '', email: '' });
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
    if (!player1.email.trim()) errs.p1_email = 'Player 1 email required';
    if (!player2.full_name.trim()) errs.p2_name = 'Player 2 name required';
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
        check_in_immediately: checkInImmediately,
      };
      const { data } = await apiClient.post('/admin/registrations', payload);
      setSuccess(data.registration);
      setTeamName('');
      setPlayer1({ full_name: '', email: '' });
      setPlayer2({ full_name: '', email: '' });
    } catch (err) {
      setErrors({ submit: err.response?.data?.error || 'Registration failed' });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="onsite-success">
        <div className="onsite-success__icon">✅</div>
        <h2 className="onsite-success__title">On-site Duo Registered!</h2>
        <div className="onsite-success__reg-id">
          <div className="text-xs text-muted mb-2 font-mono fw-bold">REGISTRATION ID</div>
          <span className="reg-id" style={{ fontSize: '1.4rem' }}>{success.registration_id}</span>
        </div>
        {success.team_name && (
          <p className="onsite-success__team">Team: <strong>{success.team_name}</strong></p>
        )}
        {checkInImmediately && <p className="text-success mt-2 fw-bold">✓ Team Checked-in to Live Arena</p>}
        <div className="onsite-success__actions">
          <button className="btn btn--secondary" onClick={() => setSuccess(null)}>+ Register Another Duo</button>
          <button className="btn btn--primary" onClick={() => navigate('/admin/checkin')}>Go to Check-in Console</button>
        </div>
      </div>
    );
  }

  return (
    <div className="onsite-page">
      <div className="onsite-page__header">
        <div>
          <h1 className="dashboard__title">ON-SITE REGISTRATION</h1>
          <p className="dashboard__subtitle">Fast desk registration for 2-player duo teams on event day</p>
        </div>
      </div>

      {errors.submit && <div className="alert alert--error mb-4">⚠️ {errors.submit}</div>}

      <form onSubmit={handleSubmit} className="onsite-form" noValidate>
        {/* Event Selection & Team Name */}
        <div className="onsite-form__section card">
          <div className="card__header">
            <span className="section__label" style={{ marginBottom: 0 }}>STEP 1</span>
            <h2 className="event-form__section-title" style={{ marginTop: 2, marginBottom: 0 }}>
              EVENT & TEAM NAME
            </h2>
          </div>
          <div className="card__body form-section">
            <div className="form-group">
              <label className="form-label form-label--required">Select Event</label>
              <select
                className={`form-input form-select ${errors.event ? 'form-input--error' : ''}`}
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                id="onsite-event-select"
              >
                <option value="">-- Choose event --</option>
                {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
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
              PLAYER 1
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
                <label className="form-label form-label--required">Email</label>
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
                <label className="form-label form-label--required">Email</label>
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
            id="onsite-submit-btn"
            className={`btn btn--primary btn--lg ${loading ? 'btn--loading' : ''}`}
            disabled={loading}
          >
            {loading ? '' : 'Register Duo On-site →'}
          </button>
        </div>
      </form>
    </div>
  );
}
