import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/client';
import { formatDate, formatDateTime } from '../../utils/dateHelpers';
import { SkeletonAdminEventRow } from '../../components/common/SkeletonCard';
import './AdminEvents.css';

const STATUS_LABELS = {
  DRAFT: { label: 'Draft', cls: 'badge--draft' },
  PUBLISHED: { label: 'Published', cls: 'badge--open' },
  COMPLETED: { label: 'Completed', cls: 'badge--completed' },
  ARCHIVED: { label: 'Archived', cls: 'badge--closed' },
};

export default function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState('');

  useEffect(() => { loadEvents(); }, []);

  const loadEvents = async () => {
    try {
      const { data } = await apiClient.get('/admin/events');
      setEvents(data.events || []);
    } catch {
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await apiClient.put(`/admin/events/${id}`, { status: newStatus });
      setEvents((prev) => prev.map((e) => e.id === id ? { ...e, status: newStatus } : e));
    } catch {
      alert('Failed to update event status');
    }
  };

  const handleDeleteEvent = async (id, name) => {
    const confirmed = window.confirm(`Are you sure you want to delete the event "${name}"?\n\nThis will permanently delete the event and its associated registrations.`);
    if (!confirmed) return;

    setError('');
    setSuccess('');
    try {
      await apiClient.delete(`/admin/events/${id}`);
      setEvents((prev) => prev.filter((e) => e.id !== id));
      setSuccess(`Event "${name}" deleted successfully.`);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete event. Please try again.');
    }
  };

  const filtered = filter ? events.filter((e) => e.status === filter) : events;

  return (
    <div className="admin-events">
      <div className="admin-events__header">
        <div>
          <h1 className="dashboard__title">Events Management</h1>
          <p className="dashboard__subtitle">
            {loading ? 'Fetching active events...' : `${events.length} event${events.length !== 1 ? 's' : ''} total`}
          </p>
        </div>
        <Link to="/admin/events/new" className="btn btn--primary">+ Create Event</Link>
      </div>

      {error && <div className="alert alert--error mb-4">⚠️ {error}</div>}
      {success && <div className="alert alert--success mb-4">✅ {success}</div>}

      <div className="admin-events__filters">
        {['', 'DRAFT', 'PUBLISHED', 'COMPLETED', 'ARCHIVED'].map((s) => (
          <button
            key={s}
            className={`btn btn--sm ${filter === s ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setFilter(s)}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="admin-events__list">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonAdminEventRow key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state card">
          <div className="card__body">
            <div className="empty-state__icon">📅</div>
            <div className="empty-state__title">No events found</div>
            <p className="empty-state__text">Create your first event to get started.</p>
            <Link to="/admin/events/new" className="btn btn--primary mt-4">Create Event</Link>
          </div>
        </div>
      ) : (
        <div className="admin-events__list">
          {filtered.map((event) => {
            const st = STATUS_LABELS[event.status] || { label: event.status, cls: '' };
            return (
              <div key={event.id} className="event-row card">
                <div className="event-row__main">
                  <div className="event-row__info">
                    <div className="event-row__top">
                      <span className={`badge ${st.cls}`}>{st.label}</span>
                      {event.allows_team && <span className="badge badge--team">Team</span>}
                      {event.allows_solo && <span className="badge badge--solo">Solo</span>}
                    </div>
                    <h3 className="event-row__name">{event.name}</h3>
                    <div className="event-row__meta">
                      {event.event_date && <span>📅 {formatDate(event.event_date)}</span>}
                      {event.venue && <span>📍 {event.venue}</span>}
                      {event.registration_closes_at && (
                        <span>⏰ Closes {formatDateTime(event.registration_closes_at)}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="event-row__actions">
                  <Link to={`/admin/registrations?event_id=${event.id}`} className="btn btn--ghost btn--sm">
                    Registrations
                  </Link>
                  <Link to={`/admin/events/${event.id}/edit`} className="btn btn--secondary btn--sm">
                    Edit
                  </Link>
                  {event.status === 'DRAFT' && (
                    <button className="btn btn--success btn--sm" onClick={() => handleStatusChange(event.id, 'PUBLISHED')}>
                      Publish
                    </button>
                  )}
                  {event.status === 'PUBLISHED' && (
                    <>
                      <button className="btn btn--secondary btn--sm" onClick={() => handleStatusChange(event.id, 'DRAFT')}>
                        Unpublish
                      </button>
                      <button className="btn btn--secondary btn--sm" onClick={() => handleStatusChange(event.id, 'COMPLETED')}>
                        Complete
                      </button>
                    </>
                  )}
                  {event.status === 'COMPLETED' && (
                    <button className="btn btn--ghost btn--sm" onClick={() => handleStatusChange(event.id, 'ARCHIVED')}>
                      Archive
                    </button>
                  )}
                  <button
                    className="btn btn--ghost btn--sm text-danger"
                    onClick={() => handleDeleteEvent(event.id, event.name)}
                    title="Delete event permanently"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
