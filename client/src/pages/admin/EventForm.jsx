import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '../../api/client';
import './EventForm.css';

const defaultFeatures = {
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
        min_team_size: 2,
        max_team_size: 2,
        rules: typeof ev.rules === 'string' ? ev.rules : (Array.isArray(ev.rules) ? ev.rules.join('\n') : ''),
        instructions: ev.instructions || '',
        contact_info: ev.contact_info || { email: '', phone: '', name: '' },
        banner_url: ev.banner_url || '',
        features: ev.features || defaultFeatures,
      });
    } catch (err) {
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
    return errs;
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete "${form.name}"?\n\nThis will permanently delete the event and its associated registrations.`)) {
      return;
    }
    setLoading(true);
    try {
      await apiClient.delete(`/admin/events/${id}`);
      navigate('/admin/events');
    } catch (err) {
      setErrors({ submit: err.response?.data?.error || err.message || 'Failed to delete event' });
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setLoading(true);
    setSuccess('');
    try {
      const generatedSlug = form.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `event-${Date.now()}`;
      const payload = {
        ...form,
        slug: form.slug || generatedSlug,
        status: form.status || 'PUBLISHED',
        allows_solo: false,
        allows_team: true,
        min_team_size: 2,
        max_team_size: 2,
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
        await apiClient.post('/admin/events', payload);
        setSuccess('Event created successfully! Redirecting...');
        setTimeout(() => navigate('/admin/events'), 1200);
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Save failed. Please check the fields and try again.';
      setErrors({ submit: msg });
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
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {isEdit && (
            <button type="button" className="btn btn--danger" onClick={handleDelete} disabled={loading}>
              🗑️ Delete Event
            </button>
          )}
          <button className="btn btn--secondary" onClick={() => navigate('/admin/events')}>
            Back to Events
          </button>
        </div>
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
              <label className="form-label">Event Status</label>
              <select
                className="form-input form-select"
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
              >
                <option value="PUBLISHED">Published (Visible to public & Open for registrations)</option>
                <option value="DRAFT">Draft (Hidden from public site)</option>
                <option value="COMPLETED">Completed</option>
                <option value="ARCHIVED">Archived</option>
              </select>
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

        {/* Contact Info (Clean generic placeholders, no hardcoded values) */}
        <div className="event-form__section card">
          <div className="card__header">
            <h2 className="event-form__section-title">📞 Contact Information</h2>
          </div>
          <div className="card__body form-section">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Contact Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.contact_info.name}
                  onChange={(e) => setContactInfo('name', e.target.value)}
                  placeholder="Coordinator name"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={form.contact_info.email}
                  onChange={(e) => setContactInfo('email', e.target.value)}
                  placeholder="e.g. coordinator@college.edu"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Phone</label>
                <input
                  type="tel"
                  className="form-input"
                  value={form.contact_info.phone}
                  onChange={(e) => setContactInfo('phone', e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="event-form__footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {isEdit && (
              <button type="button" className="btn btn--danger" onClick={handleDelete} disabled={loading}>
                🗑️ Delete Event
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
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
        </div>
      </form>
    </div>
  );
}
