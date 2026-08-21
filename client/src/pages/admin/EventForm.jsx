import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '../../api/client';
import './EventForm.css';

const defaultFeatures = {
  qr_checkin: true,
  attendance: true,
  scoring: false,
  leaderboard: false,
  submissions: false,
};

const emptyForm = {
  name: '',
  short_description: '',
  full_description: '',
  event_date: '',
  start_time: '',
  end_time: '',
  venue: '',
  registration_opens_at: '',
  registration_closes_at: '',
  status: 'PUBLISHED',
  allows_solo: false,
  allows_team: true,
  min_team_size: 2,
  max_team_size: 2,
  rules: '',
  instructions: '',
  contact_info: { email: '', phone: '', name: '' },
  banner_url: '',
  features: defaultFeatures,
};

export default function EventForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEdit);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isEdit) fetchEvent();
  }, [id]);

  const fetchEvent = async () => {
    try {
      const { data } = await apiClient.get(`/admin/events/${id}`);
      const ev = data.event;
      setForm({
        name: ev.name || '',
        short_description: ev.short_description || '',
        full_description: ev.full_description || '',
        event_date: ev.event_date || '',
        start_time: ev.start_time || '',
        end_time: ev.end_time || '',
        venue: ev.venue || '',
        registration_opens_at: ev.registration_opens_at
          ? ev.registration_opens_at.slice(0, 16) : '',
        registration_closes_at: ev.registration_closes_at
          ? ev.registration_closes_at.slice(0, 16) : '',
        status: ev.status || 'PUBLISHED',
        allows_solo: false,
        allows_team: true,
        min_team_size: ev.min_team_size || 2,
        max_team_size: ev.max_team_size || 2,
        rules: ev.rules || '',
        instructions: ev.instructions || '',
        contact_info: ev.contact_info || { email: '', phone: '', name: '' },
        banner_url: ev.banner_url || '',
        features: ev.features || defaultFeatures,
      });
    } catch {
      alert('Failed to load event');
    } finally {
      setFetchLoading(false);
    }
  };

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const setContactInfo = (field, value) =>
    setForm((f) => ({ ...f, contact_info: { ...f.contact_info, [field]: value } }));

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Event name is required';
    if (!form.min_team_size || form.min_team_size < 2) errs.min_team_size = 'Min team size must be at least 2';
    if (!form.max_team_size || form.max_team_size < form.min_team_size) errs.max_team_size = 'Max must be ≥ min';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setLoading(true);
    setSuccess('');
    try {
      const payload = {
        ...form,
        status: 'PUBLISHED',
        allows_solo: false,
        allows_team: true,
        registration_opens_at: form.registration_opens_at || null,
        registration_closes_at: form.registration_closes_at || null,
        event_date: form.event_date || null,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
      };
      if (isEdit) {
        await apiClient.put(`/admin/events/${id}`, payload);
        setSuccess('Event updated successfully!');
      } else {
        const { data } = await apiClient.post('/admin/events', payload);
        setSuccess('Event created! Redirecting...');
        setTimeout(() => navigate(`/admin/events/${data.event.id}/edit`), 1200);
      }
    } catch (err) {
      setErrors({ submit: err.response?.data?.error || 'Save failed' });
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <div className="event-form-page">
        <div className="skeleton skeleton-title mb-4" />
        <div className="skeleton skeleton-card mb-6" style={{ height: '320px' }} />
        <div className="skeleton skeleton-card" style={{ height: '240px' }} />
      </div>
    );
  }

  return (
    <div className="event-form-page">
      <div className="event-form-page__header">
        <div>
          <h1 className="dashboard__title">{isEdit ? 'Edit Event' : 'Create Event'}</h1>
          <p className="dashboard__subtitle">{isEdit ? `Editing: ${form.name}` : 'Configure and publish a new event'}</p>
        </div>
        <button className="btn btn--secondary" onClick={() => navigate('/admin/events')}>
          ← Back
        </button>
      </div>

      {errors.submit && <div className="alert alert--error mb-4">⚠️ {errors.submit}</div>}
      {success && <div className="alert alert--success mb-4">✅ {success}</div>}

      <form onSubmit={handleSubmit} className="event-form">
        {/* Basic Info */}
        <div className="event-form__section card">
          <div className="card__header">
            <h2 className="event-form__section-title">📋 Basic Information</h2>
          </div>
          <div className="card__body form-section">
            <div className="form-group">
              <label className="form-label form-label--required">Event Name</label>
              <input
                type="text"
                className={`form-input ${errors.name ? 'form-input--error' : ''}`}
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. codeDebug 2026"
                required
              />
              {errors.name && <span className="form-error">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Short Description</label>
              <input
                type="text"
                className="form-input"
                value={form.short_description}
                onChange={(e) => set('short_description', e.target.value)}
                placeholder="Brief one-line summary (shown on event cards)"
                maxLength={200}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Full Description</label>
              <textarea
                className="form-input form-textarea"
                rows={5}
                value={form.full_description}
                onChange={(e) => set('full_description', e.target.value)}
                placeholder="Detailed event overview, problem statement, structure..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Banner Image URL</label>
              <input
                type="url"
                className="form-input"
                value={form.banner_url}
                onChange={(e) => set('banner_url', e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>
        </div>

        {/* Date & Venue */}
        <div className="event-form__section card">
          <div className="card__header">
            <h2 className="event-form__section-title">📅 Date, Time & Venue</h2>
          </div>
          <div className="card__body form-section">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Event Date</label>
                <input type="date" className="form-input" value={form.event_date}
                  onChange={(e) => set('event_date', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Start Time</label>
                <input type="time" className="form-input" value={form.start_time}
                  onChange={(e) => set('start_time', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">End Time</label>
                <input type="time" className="form-input" value={form.end_time}
                  onChange={(e) => set('end_time', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Venue</label>
              <input type="text" className="form-input" value={form.venue}
                onChange={(e) => set('venue', e.target.value)}
                placeholder="e.g. Seminar Hall, Block A" />
            </div>
          </div>
        </div>

        {/* Registration Window */}
        <div className="event-form__section card">
          <div className="card__header">
            <h2 className="event-form__section-title">⏰ Registration Window</h2>
          </div>
          <div className="card__body form-section">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Registration Opens At</label>
                <input type="datetime-local" className="form-input"
                  value={form.registration_opens_at}
                  onChange={(e) => set('registration_opens_at', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Registration Closes At</label>
                <input type="datetime-local" className="form-input"
                  value={form.registration_closes_at}
                  onChange={(e) => set('registration_closes_at', e.target.value)} />
                <span className="form-hint">After this time, public registration is automatically closed.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Participation — Team Size Only */}
        <div className="event-form__section card">
          <div className="card__header">
            <h2 className="event-form__section-title">👥 Team Size</h2>
          </div>
          <div className="card__body form-section">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label form-label--required">Min Team Size</label>
                <input
                  type="number"
                  min={2}
                  max={20}
                  className={`form-input ${errors.min_team_size ? 'form-input--error' : ''}`}
                  value={form.min_team_size}
                  onChange={(e) => set('min_team_size', parseInt(e.target.value) || 2)}
                />
                {errors.min_team_size && <span className="form-error">{errors.min_team_size}</span>}
              </div>
              <div className="form-group">
                <label className="form-label form-label--required">Max Team Size</label>
                <input
                  type="number"
                  min={2}
                  max={20}
                  className={`form-input ${errors.max_team_size ? 'form-input--error' : ''}`}
                  value={form.max_team_size}
                  onChange={(e) => set('max_team_size', parseInt(e.target.value) || 2)}
                />
                {errors.max_team_size && <span className="form-error">{errors.max_team_size}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Rules & Instructions */}
        <div className="event-form__section card">
          <div className="card__header">
            <h2 className="event-form__section-title">📝 Rules & Instructions</h2>
          </div>
          <div className="card__body form-section">
            <div className="form-group">
              <label className="form-label">Event Rules</label>
              <textarea className="form-input form-textarea" rows={5} value={form.rules}
                onChange={(e) => set('rules', e.target.value)}
                placeholder="List the rules for this event..." />
            </div>
            <div className="form-group">
              <label className="form-label">Instructions</label>
              <textarea className="form-input form-textarea" rows={4} value={form.instructions}
                onChange={(e) => set('instructions', e.target.value)}
                placeholder="Registration and participation instructions..." />
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="event-form__section card">
          <div className="card__header">
            <h2 className="event-form__section-title">📞 Contact Information</h2>
          </div>
          <div className="card__body form-section">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Contact Name</label>
                <input type="text" className="form-input" value={form.contact_info.name}
                  onChange={(e) => setContactInfo('name', e.target.value)}
                  placeholder="Coordinator name" />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Email</label>
                <input type="email" className="form-input" value={form.contact_info.email}
                  onChange={(e) => setContactInfo('email', e.target.value)}
                  placeholder="contact@college.edu" />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Phone</label>
                <input type="tel" className="form-input" value={form.contact_info.phone}
                  onChange={(e) => setContactInfo('phone', e.target.value)}
                  placeholder="+91 98765 43210" />
              </div>
            </div>
          </div>
        </div>

        <div className="event-form__footer">
          <button type="button" className="btn btn--secondary" onClick={() => navigate('/admin/events')}>
            Cancel
          </button>
          <button
            type="submit"
            id="event-form-submit"
            className={`btn btn--primary btn--lg ${loading ? 'btn--loading' : ''}`}
            disabled={loading}
          >
            {loading ? '' : isEdit ? 'Save Changes' : 'Create Event'}
          </button>
        </div>
      </form>
    </div>
  );
}
