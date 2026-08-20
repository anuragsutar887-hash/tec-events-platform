import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import './OnsiteRegistration.css';

const emptyLeader = { full_name: '', email: '', phone: '', college: '', department: '', year: '' };
const emptyMember = { full_name: '', email: '', department: '', year: '' };

export default function OnsiteRegistration() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(searchParams.get('event_id') || '');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [mode, setMode] = useState('SOLO'); // SOLO | TEAM
  const [teamName, setTeamName] = useState('');
  const [leader, setLeader] = useState({ ...emptyLeader });
  const [members, setMembers] = useState([{ ...emptyMember }]);
  const [checkInImmediately, setCheckInImmediately] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(null);

  useEffect(() => { loadEvents(); }, []);
  useEffect(() => {
    if (selectedEventId) {
      const ev = events.find((e) => String(e.id) === String(selectedEventId));
      setSelectedEvent(ev || null);
      if (ev) {
        if (ev.allows_team && !ev.allows_solo) setMode('TEAM');
        else if (ev.allows_solo && !ev.allows_team) setMode('SOLO');
      }
    }
  }, [selectedEventId, events]);

  const loadEvents = async () => {
    try {
      const { data } = await apiClient.get('/admin/events');
      setEvents(data.events.filter((e) => ['PUBLISHED', 'DRAFT', 'COMPLETED'].includes(e.status)));
    } catch { }
  };

  const setLeaderField = (f, v) => setLeader((l) => ({ ...l, [f]: v }));
  const setMemberField = (i, f, v) => {
    setMembers((ms) => ms.map((m, idx) => idx === i ? { ...m, [f]: v } : m));
  };
  const addMember = () => {
    if (selectedEvent && members.length + 1 >= selectedEvent.max_team_size) return;
    setMembers((ms) => [...ms, { ...emptyMember }]);
  };
  const removeMember = (i) => setMembers((ms) => ms.filter((_, idx) => idx !== i));

  const validate = () => {
    const errs = {};
    if (!selectedEventId) errs.event = 'Select an event';
    if (!leader.full_name.trim()) errs.leader_name = 'Leader name required';
    if (!leader.email.trim()) errs.leader_email = 'Leader email required';
    if (!leader.phone.trim()) errs.leader_phone = 'Leader phone required';
    if (mode === 'TEAM') {
      if (!teamName.trim()) errs.team_name = 'Team name required';
      const total = 1 + members.length;
      if (selectedEvent && total < selectedEvent.min_team_size) {
        errs.members = `Need at least ${selectedEvent.min_team_size} members total (including leader)`;
      }
      if (selectedEvent && total > selectedEvent.max_team_size) {
        errs.members = `Maximum ${selectedEvent.max_team_size} members (including leader)`;
      }
    }
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
        participation_mode: mode,
        team_name: mode === 'TEAM' ? teamName.trim() : undefined,
        leader,
        members: mode === 'TEAM' ? members : [],
        check_in_immediately: checkInImmediately,
      };
      const { data } = await apiClient.post('/admin/registrations', payload);
      setSuccess(data.registration);
      setLeader({ ...emptyLeader });
      setMembers([{ ...emptyMember }]);
      setTeamName('');
    } catch (err) {
      setErrors({ submit: err.response?.data?.error || err.response?.data?.errors?.join(', ') || 'Registration failed' });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="onsite-success">
        <div className="onsite-success__icon">✅</div>
        <h2 className="onsite-success__title">On-site Registration Successful!</h2>
        <div className="onsite-success__reg-id">
          <div className="text-xs text-muted mb-2">REGISTRATION ID</div>
          <span className="reg-id">{success.registration_id}</span>
        </div>
        {success.team_name && (
          <p className="onsite-success__team">Team: <strong>{success.team_name}</strong></p>
        )}
        {checkInImmediately && <p className="text-success mt-2">✓ Participant checked in</p>}
        <div className="onsite-success__actions">
          <button className="btn btn--secondary" onClick={() => setSuccess(null)}>Add Another</button>
          <button className="btn btn--primary" onClick={() => navigate('/admin/checkin')}>Go to Check-in</button>
        </div>
      </div>
    );
  }

  return (
    <div className="onsite-page">
      <div className="onsite-page__header">
        <div>
          <h1 className="dashboard__title">On-site Registration</h1>
          <p className="dashboard__subtitle">Register a participant or team on the day of the event</p>
        </div>
      </div>

      {errors.submit && <div className="alert alert--error mb-4">⚠️ {errors.submit}</div>}

      <form onSubmit={handleSubmit} className="onsite-form">
        {/* Event & Mode */}
        <div className="onsite-form__section card">
          <div className="card__header"><h2 className="event-form__section-title">📅 Event & Mode</h2></div>
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

            {selectedEvent && (
              <div>
                <label className="form-label mb-2">Registration Mode</label>
                <div className="onsite-form__mode-toggle">
                  {selectedEvent.allows_solo && (
                    <button
                      type="button"
                      className={`onsite-form__mode-btn ${mode === 'SOLO' ? 'active' : ''}`}
                      onClick={() => setMode('SOLO')}
                    >
                      👤 Solo Participant
                    </button>
                  )}
                  {selectedEvent.allows_team && (
                    <button
                      type="button"
                      className={`onsite-form__mode-btn ${mode === 'TEAM' ? 'active' : ''}`}
                      onClick={() => setMode('TEAM')}
                    >
                      👥 Team ({selectedEvent.min_team_size}–{selectedEvent.max_team_size} members)
                    </button>
                  )}
                </div>
              </div>
            )}

            {mode === 'TEAM' && (
              <div className="form-group">
                <label className="form-label form-label--required">Team Name</label>
                <input
                  type="text"
                  className={`form-input ${errors.team_name ? 'form-input--error' : ''}`}
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Enter unique team name"
                />
                {errors.team_name && <span className="form-error">{errors.team_name}</span>}
              </div>
            )}
          </div>
        </div>

        {/* Leader */}
        <div className="onsite-form__section card">
          <div className="card__header">
            <h2 className="event-form__section-title">
              {mode === 'SOLO' ? '👤 Participant Details' : '👑 Team Leader'}
            </h2>
          </div>
          <div className="card__body form-section">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label form-label--required">Full Name</label>
                <input type="text" className={`form-input ${errors.leader_name ? 'form-input--error' : ''}`}
                  value={leader.full_name} onChange={(e) => setLeaderField('full_name', e.target.value)}
                  id="leader-name" placeholder="Full name" />
                {errors.leader_name && <span className="form-error">{errors.leader_name}</span>}
              </div>
              <div className="form-group">
                <label className="form-label form-label--required">Email</label>
                <input type="email" className={`form-input ${errors.leader_email ? 'form-input--error' : ''}`}
                  value={leader.email} onChange={(e) => setLeaderField('email', e.target.value)}
                  placeholder="email@example.com" />
                {errors.leader_email && <span className="form-error">{errors.leader_email}</span>}
              </div>
              <div className="form-group">
                <label className="form-label form-label--required">Phone</label>
                <input type="tel" className={`form-input ${errors.leader_phone ? 'form-input--error' : ''}`}
                  value={leader.phone} onChange={(e) => setLeaderField('phone', e.target.value)}
                  placeholder="+91 98765 43210" />
                {errors.leader_phone && <span className="form-error">{errors.leader_phone}</span>}
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">College / Institution</label>
                <input type="text" className="form-input" value={leader.college}
                  onChange={(e) => setLeaderField('college', e.target.value)} placeholder="College name" />
              </div>
              <div className="form-group">
                <label className="form-label">Department</label>
                <input type="text" className="form-input" value={leader.department}
                  onChange={(e) => setLeaderField('department', e.target.value)} placeholder="e.g. CSE" />
              </div>
              <div className="form-group">
                <label className="form-label">Year</label>
                <select className="form-input form-select" value={leader.year}
                  onChange={(e) => setLeaderField('year', e.target.value)}>
                  <option value="">Select year</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                  <option value="PG">PG</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Team Members */}
        {mode === 'TEAM' && (
          <div className="onsite-form__section card">
            <div className="card__header">
              <h2 className="event-form__section-title">👥 Team Members</h2>
              {errors.members && <span className="form-error">{errors.members}</span>}
            </div>
            <div className="card__body form-section">
              {members.map((member, i) => (
                <div key={i} className="onsite-form__member">
                  <div className="onsite-form__member-header">
                    <span className="text-sm fw-semibold text-secondary">Member {i + 2}</span>
                    {members.length > 1 && (
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => removeMember(i)}>
                        ✕ Remove
                      </button>
                    )}
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label form-label--required">Full Name</label>
                      <input type="text" className="form-input" value={member.full_name}
                        onChange={(e) => setMemberField(i, 'full_name', e.target.value)} placeholder="Full name" />
                    </div>
                    <div className="form-group">
                      <label className="form-label form-label--required">Email</label>
                      <input type="email" className="form-input" value={member.email}
                        onChange={(e) => setMemberField(i, 'email', e.target.value)} placeholder="email@example.com" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Department</label>
                      <input type="text" className="form-input" value={member.department}
                        onChange={(e) => setMemberField(i, 'department', e.target.value)} placeholder="CSE" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Year</label>
                      <select className="form-input form-select" value={member.year}
                        onChange={(e) => setMemberField(i, 'year', e.target.value)}>
                        <option value="">Select year</option>
                        <option value="1st Year">1st Year</option>
                        <option value="2nd Year">2nd Year</option>
                        <option value="3rd Year">3rd Year</option>
                        <option value="4th Year">4th Year</option>
                        <option value="PG">PG</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}

              {selectedEvent && (members.length + 1) < selectedEvent.max_team_size && (
                <button type="button" className="btn btn--secondary btn--sm" onClick={addMember}>
                  + Add Member
                </button>
              )}
            </div>
          </div>
        )}

        {/* Options */}
        <div className="onsite-form__section card">
          <div className="card__body">
            <label className="event-form__feature-toggle">
              <input type="checkbox" checked={checkInImmediately}
                onChange={(e) => setCheckInImmediately(e.target.checked)} />
              <span>Check in immediately after registration</span>
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
            {loading ? '' : 'Register On-site'}
          </button>
        </div>
      </form>
    </div>
  );
}
