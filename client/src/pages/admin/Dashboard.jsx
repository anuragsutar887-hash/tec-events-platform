import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/client';
import { formatDate, timeAgo } from '../../utils/dateHelpers';
import './Dashboard.css';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [eventStats, setEventStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedEventId) loadEventStats(selectedEventId);
    else setEventStats(null);
  }, [selectedEventId]);

  const loadData = async () => {
    try {
      const [statsRes, eventsRes] = await Promise.all([
        apiClient.get('/admin/dashboard/stats'),
        apiClient.get('/admin/dashboard/events'),
      ]);
      setStats(statsRes.data.global);
      const recentData = statsRes.data.recent || [];
      setStats({ ...statsRes.data.global, recent: recentData });
      setEvents(eventsRes.data.events || []);
      if (eventsRes.data.events.length > 0) {
        setSelectedEventId(String(eventsRes.data.events[0].id));
      }
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadEventStats = async (eventId) => {
    try {
      const { data } = await apiClient.get(`/admin/dashboard/stats?event_id=${eventId}`);
      setEventStats(data.event_stats);
    } catch {}
  };

  // ⚡ High-end animated Skeleton Loader
  if (loading) {
    return (
      <div className="dashboard dashboard--skeleton">
        {/* Header Skeleton */}
        <div className="dashboard__header">
          <div>
            <div className="skeleton skeleton-title" />
            <div className="skeleton skeleton-subtitle" />
          </div>
          <div className="dashboard__header-actions">
            <div className="skeleton skeleton-btn" />
            <div className="skeleton skeleton-btn" />
          </div>
        </div>

        {/* 4 Stat Cards Skeleton */}
        <div className="dashboard__metrics-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton skeleton-card" style={{ height: '140px' }} />
          ))}
        </div>

        {/* Event Breakdown Skeleton */}
        <div className="skeleton skeleton-card mb-6" style={{ height: '280px' }} />

        {/* Recent Activity Table Skeleton */}
        <div className="skeleton skeleton-card" style={{ height: '220px' }} />
      </div>
    );
  }

  if (error) {
    return <div className="alert alert--error">{error}</div>;
  }

  const selectedEvent = events.find(e => String(e.id) === String(selectedEventId));

  return (
    <div className="dashboard">
      {/* Top Header */}
      <div className="dashboard__header">
        <div>
          <h1 className="dashboard__title">Executive Dashboard</h1>
          <p className="dashboard__subtitle">Real-time telemetry, participant metrics & event operations</p>
        </div>
        <div className="dashboard__header-actions">
          <Link to="/admin/checkin" className="btn btn--secondary">
            ✅ Check-in Console
          </Link>
          <Link to="/admin/events/new" className="btn btn--primary">
            + Create Event
          </Link>
        </div>
      </div>

      {/* 4 Global Stat Cards */}
      <div className="dashboard__metrics-grid">
        <div className="stat-card stat-card--cyan">
          <div className="stat-card__top">
            <div className="stat-card__icon-box">📅</div>
            <span className="stat-card__badge stat-card__badge--cyan">EVENTS</span>
          </div>
          <div className="stat-card__value">{stats?.total_events || 0}</div>
          <div className="stat-card__footer">
            <span className="stat-card__sub-dot"></span>
            <span>{stats?.upcoming_events || 0} active & published</span>
          </div>
        </div>

        <div className="stat-card stat-card--purple">
          <div className="stat-card__top">
            <div className="stat-card__icon-box">📋</div>
            <span className="stat-card__badge stat-card__badge--purple">REGISTRATIONS</span>
          </div>
          <div className="stat-card__value">{stats?.total_registrations || 0}</div>
          <div className="stat-card__footer">
            <span className="stat-card__sub-dot"></span>
            <span>Total teams registered</span>
          </div>
        </div>

        <div className="stat-card stat-card--emerald">
          <div className="stat-card__top">
            <div className="stat-card__icon-box">👥</div>
            <span className="stat-card__badge stat-card__badge--emerald">PARTICIPANTS</span>
          </div>
          <div className="stat-card__value">{stats?.total_participants || 0}</div>
          <div className="stat-card__footer">
            <span className="stat-card__sub-dot"></span>
            <span>Students enrolled</span>
          </div>
        </div>

        <div className="stat-card stat-card--amber">
          <div className="stat-card__top">
            <div className="stat-card__icon-box">⚡</div>
            <span className="stat-card__badge stat-card__badge--amber">IN ARENA</span>
          </div>
          <div className="stat-card__value">{stats?.checked_in || 0}</div>
          <div className="stat-card__footer">
            <span className="stat-card__sub-dot"></span>
            <span>{stats?.on_site_registrations || 0} on-site check-ins</span>
          </div>
        </div>
      </div>

      {/* Event Breakdown */}
      {events.length > 0 && (
        <div className="dashboard__event-section card">
          <div className="dashboard__event-header">
            <div className="dashboard__event-title-wrap">
              <span className="section__label">EVENT BREAKDOWN</span>
              <h2 className="dashboard__section-title">
                {selectedEvent?.name || 'Selected Event'}
              </h2>
            </div>

            <div className="dashboard__event-select-wrap">
              <label htmlFor="event-select" className="dashboard__select-label">Select Event:</label>
              <select
                id="event-select"
                className="form-input form-select dashboard__event-select"
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name} ({ev.status})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {eventStats && (
            <div className="dashboard__breakdown-grid">
              <div className="breakdown-stat-card">
                <span className="breakdown-stat-label">Total Teams</span>
                <span className="breakdown-stat-value text-accent">{eventStats.total_registrations}</span>
                <span className="breakdown-stat-sub">Registered</span>
              </div>

              <div className="breakdown-stat-card">
                <span className="breakdown-stat-label">Participants</span>
                <span className="breakdown-stat-value">{eventStats.total_participants}</span>
                <span className="breakdown-stat-sub">In competition</span>
              </div>

              <div className="breakdown-stat-card">
                <span className="breakdown-stat-label">Online</span>
                <span className="breakdown-stat-value text-cyan">{eventStats.online_registrations}</span>
                <span className="breakdown-stat-sub">Portal registrations</span>
              </div>

              <div className="breakdown-stat-card">
                <span className="breakdown-stat-label">On-Site</span>
                <span className="breakdown-stat-value text-warning">{eventStats.on_site_registrations}</span>
                <span className="breakdown-stat-sub">Desk registrations</span>
              </div>

              <div className="breakdown-stat-card">
                <span className="breakdown-stat-label">Checked In</span>
                <span className="breakdown-stat-value text-success">{eventStats.checked_in}</span>
                <span className="breakdown-stat-sub">Verified in Arena</span>
              </div>

              <div className="breakdown-stat-card">
                <span className="breakdown-stat-label">Pending</span>
                <span className="breakdown-stat-value text-danger">{eventStats.not_checked_in}</span>
                <span className="breakdown-stat-sub">Awaiting entrance</span>
              </div>



            </div>
          )}

          {selectedEventId && (
            <div className="dashboard__event-actions">
              <Link to={`/admin/registrations?event_id=${selectedEventId}`} className="btn btn--secondary btn--sm">
                📋 View Registrations
              </Link>
              <Link to={`/admin/checkin?event_id=${selectedEventId}`} className="btn btn--primary btn--sm">
                ✅ Check-in Console
              </Link>
              <Link to={`/admin/onsite?event_id=${selectedEventId}`} className="btn btn--secondary btn--sm">
                ➕ Add On-site Reg
              </Link>
              <Link to={`/leaderboard/${selectedEvent?.slug || 'codedebug'}`} className="btn btn--ghost btn--sm">
                🏆 Live Standings
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Recent Registrations Table */}
      <div className="dashboard__recent card">
        <div className="card__header">
          <h2 className="dashboard__section-title">Recent Activity Feed</h2>
          <Link to="/admin/registrations" className="btn btn--ghost btn--sm">
            View All Registrations
          </Link>
        </div>
        
        {stats?.recent?.length > 0 ? (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Reg ID</th>
                  <th>Team Name</th>
                  <th>Leader Name</th>
                  <th>PRNs</th>
                  <th>Event</th>
                  <th>Check-In Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent.map((r) => (
                  <tr key={r.registration_id}>
                    <td><span className="font-mono text-accent fw-bold">{r.registration_id}</span></td>
                    <td className="text-primary fw-bold">{r.team_name || '—'}</td>
                    <td className="text-secondary fw-medium">{r.leader_name || '—'}</td>
                    <td><span className="font-mono text-xs">{r.prns || '—'}</span></td>
                    <td className="text-secondary text-sm">{r.event_name}</td>
                    <td>
                      <span className={`badge ${r.checked_in ? 'badge--checked' : 'badge--unchecked'}`}>
                        {r.checked_in ? '✓ In Arena' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card__body">
            <div className="empty-state" style={{ padding: 'var(--space-12) var(--space-4)' }}>
              <div className="empty-state__icon">📋</div>
              <div className="empty-state__title">No Registrations Yet</div>
              <p className="empty-state__text">
                Live participant registrations will stream into this table as students register.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
