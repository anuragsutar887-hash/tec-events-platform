import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import apiClient from '../../api/client';
import { formatDateTime, formatDate, timeAgo } from '../../utils/dateHelpers';
import RegistrationDetailModal from './RegistrationDetailModal';
import './AdminRegistrations.css';

export default function AdminRegistrations() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialEventId = searchParams.get('event_id') || null;

  const [selectedEventId, setSelectedEventId] = useState(initialEventId);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    registration_type: '',
    checked_in: '',
  });
  const [expandedRegId, setExpandedRegId] = useState(null);
  const [modalRegId, setModalRegId] = useState(null);
  const [checkinLoading, setCheckinLoading] = useState({});

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadRegistrations(selectedEventId);
    }
  }, [selectedEventId, filters]);

  const loadEvents = async () => {
    setEventsLoading(true);
    try {
      const [{ data: eventsData }, { data: regsData }] = await Promise.all([
        apiClient.get('/admin/dashboard/events'),
        apiClient.get('/admin/registrations'),
      ]);

      const allEvents = eventsData.events || [];
      const allRegs = regsData.registrations || [];

      // Compute registration statistics for each event
      const eventsWithStats = allEvents.map((ev) => {
        const evRegs = allRegs.filter((r) => String(r.event_id) === String(ev.id));
        const checkedInCount = evRegs.filter((r) => r.checked_in).length;
        return {
          ...ev,
          total_registrations: evRegs.length,
          checked_in_count: checkedInCount,
          pending_count: evRegs.length - checkedInCount,
        };
      });

      setEvents(eventsWithStats);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setEventsLoading(false);
    }
  };

  const loadRegistrations = async (eventId) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        event_id: eventId,
        ...filters,
        search,
        limit: 100,
      });
      const { data } = await apiClient.get(`/admin/registrations?${params}`);
      setRegistrations(data.registrations || []);
    } catch {
      setRegistrations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEvent = (eventId) => {
    setSelectedEventId(eventId);
    setSearch('');
    setFilters({ registration_type: '', checked_in: '' });
    if (eventId) {
      setSearchParams({ event_id: eventId });
    } else {
      setSearchParams({});
      loadEvents();
    }
  };

  const handleSearch = useCallback(() => {
    if (selectedEventId) loadRegistrations(selectedEventId);
  }, [search, filters, selectedEventId]);

  const handleCheckin = async (reg) => {
    if (reg.checked_in) return;
    setCheckinLoading((p) => ({ ...p, [reg.id]: true }));
    try {
      await apiClient.put(`/admin/registrations/${reg.id}/checkin`);
      setRegistrations((prev) =>
        prev.map((r) => (r.id === reg.id ? { ...r, checked_in: true, checked_in_at: new Date().toISOString() } : r))
      );
    } catch (err) {
      alert(err.response?.data?.error || 'Check-in failed');
    } finally {
      setCheckinLoading((p) => ({ ...p, [reg.id]: false }));
    }
  };

  const handleUndoCheckin = async (reg) => {
    if (!window.confirm(`Undo check-in for ${reg.team_name || reg.registration_id}?`)) return;
    setCheckinLoading((p) => ({ ...p, [reg.id]: true }));
    try {
      await apiClient.put(`/admin/registrations/${reg.id}/undo-checkin`);
      setRegistrations((prev) =>
        prev.map((r) => (r.id === reg.id ? { ...r, checked_in: false, checked_in_at: null } : r))
      );
    } catch {
      alert('Failed to undo check-in');
    } finally {
      setCheckinLoading((p) => ({ ...p, [reg.id]: false }));
    }
  };

  const toggleExpand = (id) => {
    setExpandedRegId((prev) => (prev === id ? null : id));
  };

  // 📊 Excel / CSV Export
  const exportToExcel = () => {
    if (!registrations || registrations.length === 0) {
      alert('No registrations found to export.');
      return;
    }

    const headers = [
      'Registration ID',
      'Event Name',
      'Team Name',
      'Registration Type',
      'Player 1 Full Name',
      'Player 1 Email',
      'Player 1 PRN',
      'Player 2 Full Name',
      'Player 2 Email',
      'Player 2 PRN',
      'Check-in Status',
      'Check-in Time',
      'Registration Date',
    ];

    const escVal = (val) => {
      if (val === null || val === undefined) return '""';
      return `"${String(val).replace(/"/g, '""')}"`;
    };

    const rows = registrations.map((r) => {
      const p1 = r.participants?.find((p) => p.is_leader) || r.participants?.[0] || {};
      const p2 = r.participants?.find((p) => !p.is_leader) || r.participants?.[1] || {};

      return [
        escVal(r.registration_id),
        escVal(r.event_name),
        escVal(r.team_name || `${p1.full_name || 'Solo'}`),
        escVal(r.registration_type || 'ONLINE'),
        escVal(p1.full_name || 'N/A'),
        escVal(p1.email || 'N/A'),
        escVal(p1.student_id || p1.prn || 'N/A'),
        escVal(p2.full_name || 'N/A'),
        escVal(p2.email || 'N/A'),
        escVal(p2.student_id || p2.prn || 'N/A'),
        escVal(r.checked_in ? 'YES (In Arena)' : 'NO (Pending)'),
        escVal(r.checked_in_at ? formatDateTime(r.checked_in_at) : 'Not Checked In'),
        escVal(formatDateTime(r.created_at)),
      ].join(',');
    });

    const activeEvent = events.find((e) => String(e.id) === String(selectedEventId));
    const eventNameSlug = activeEvent?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'Event';
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `TEC_${eventNameSlug}_Registrations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeEvent = events.find((e) => String(e.id) === String(selectedEventId));

  // ════════════════════════════════════════════════════════════════
  // 1. ALL EVENTS DIRECTORY VIEW (When no event is opened)
  // ════════════════════════════════════════════════════════════════
  if (!selectedEventId) {
    return (
      <div className="admin-registrations">
        <div className="admin-regs__header">
          <div>
            <span className="section__label">EVENT DIRECTORY</span>
            <h1 className="dashboard__title">REGISTRATIONS BY EVENT</h1>
            <p className="dashboard__subtitle">
              Select an event to view and manage its registered participants
            </p>
          </div>
          <div className="admin-regs__header-actions">
            <Link to="/admin/onsite" className="btn btn--secondary">+ On-site Reg</Link>
            <Link to="/admin/checkin" className="btn btn--primary">Check-in Console</Link>
          </div>
        </div>

        {eventsLoading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <span>Loading events directory...</span>
          </div>
        ) : events.length === 0 ? (
          <div className="empty-state card">
            <div className="card__body">
              <div className="empty-state__icon">📅</div>
              <div className="empty-state__title">No events created yet</div>
              <p className="empty-state__text">Create an event to start accepting registrations.</p>
              <Link to="/admin/events/new" className="btn btn--primary mt-4">
                + Create First Event
              </Link>
            </div>
          </div>
        ) : (
          <div className="admin-events-grid">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="admin-event-card card card--hover"
                onClick={() => handleSelectEvent(ev.id)}
                style={{ cursor: 'pointer' }}
              >
                <div className="admin-event-card__header">
                  <span className="badge badge--tag">{ev.status}</span>
                  {ev.event_date && (
                    <span className="text-xs text-muted font-mono">
                      📅 {formatDate(ev.event_date)}
                    </span>
                  )}
                </div>

                <div className="admin-event-card__body">
                  <h3 className="admin-event-card__title">{ev.name}</h3>
                  {ev.venue && (
                    <p className="admin-event-card__venue text-xs text-muted">
                      📍 {ev.venue}
                    </p>
                  )}

                  <div className="admin-event-card__stats">
                    <div className="admin-event-stat-box">
                      <span className="admin-event-stat-box__label">TOTAL REGISTRATIONS</span>
                      <span className="admin-event-stat-box__val text-accent">
                        {ev.total_registrations || 0}
                      </span>
                    </div>
                    <div className="admin-event-stat-box">
                      <span className="admin-event-stat-box__label">CHECKED IN</span>
                      <span className="admin-event-stat-box__val text-success">
                        {ev.checked_in_count || 0}
                      </span>
                    </div>
                    <div className="admin-event-stat-box">
                      <span className="admin-event-stat-box__label">PENDING</span>
                      <span className="admin-event-stat-box__val text-danger">
                        {ev.pending_count || 0}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="admin-event-card__footer">
                  <button
                    type="button"
                    className="btn btn--primary btn--full btn--sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectEvent(ev.id);
                    }}
                  >
                    View Registrations ({ev.total_registrations || 0})
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // 2. SPECIFIC EVENT REGISTRATIONS VIEW (When an event is opened)
  // ════════════════════════════════════════════════════════════════
  return (
    <div className="admin-registrations">
      {/* Top Navigation & Header */}
      <div className="admin-regs__header">
        <div>
          <button
            type="button"
            className="btn btn--ghost btn--sm mb-2"
            onClick={() => handleSelectEvent(null)}
            style={{ paddingLeft: 0, fontWeight: 700 }}
          >
            Back to All Events
          </button>
          <div className="section__label">
            {activeEvent?.status} // EVENT REGISTRATIONS
          </div>
          <h1 className="dashboard__title">
            {activeEvent?.name || 'Event'}
          </h1>
          <p className="dashboard__subtitle">
            {registrations.length} registration(s) found for this event
          </p>
        </div>

        <div className="admin-regs__header-actions">
          <button
            onClick={exportToExcel}
            className="btn btn--secondary"
            title="Export this event's participants to Excel"
          >
            📊 Export to Excel
          </button>
          <Link to={`/admin/onsite?event_id=${selectedEventId}`} className="btn btn--secondary">
            + On-site Reg
          </Link>
          <Link to={`/admin/checkin?event_id=${selectedEventId}`} className="btn btn--primary">
            Check-in Console
          </Link>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="admin-regs__search-bar card">
        <div className="card__body">
          <div className="admin-regs__search-row">
            <div className="admin-regs__search-input-wrap">
              <input
                type="text"
                className="form-input"
                placeholder="Search by ID, team name, leader name, email, PRN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                id="registrations-search"
              />
              <button className="btn btn--primary" onClick={handleSearch}>
                🔍 SEARCH
              </button>
            </div>
          </div>

          <div className="admin-regs__filters" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <select
              className="form-input form-select"
              value={filters.registration_type}
              onChange={(e) => setFilters((f) => ({ ...f, registration_type: e.target.value }))}
              aria-label="Filter by Registration Type"
            >
              <option value="">All Types (Online & On-site)</option>
              <option value="ONLINE">Online Portal</option>
              <option value="ON_SITE">On-site Desk</option>
            </select>

            <select
              className="form-input form-select"
              value={filters.checked_in}
              onChange={(e) => setFilters((f) => ({ ...f, checked_in: e.target.value }))}
              aria-label="Filter by Check-in"
            >
              <option value="">All Attendance Statuses</option>
              <option value="true">Checked In (In Arena)</option>
              <option value="false">Pending Check-in</option>
            </select>
          </div>
        </div>
      </div>

      {/* Registrations List / Table */}
      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <span>Loading registrations...</span>
        </div>
      ) : registrations.length === 0 ? (
        <div className="empty-state card">
          <div className="card__body">
            <div className="empty-state__icon">📋</div>
            <div className="empty-state__title">No registrations found</div>
            <p className="empty-state__text">
              {search
                ? 'No participants matched your search criteria.'
                : 'No participants have registered for this event yet.'}
            </p>
            <Link
              to={`/admin/onsite?event_id=${selectedEventId}`}
              className="btn btn--secondary mt-4"
            >
              + Add On-site Registration
            </Link>
          </div>
        </div>
      ) : (
        <div className="card" style={{ border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>REG ID</th>
                  <th>TEAM / PARTICIPANT</th>
                  <th>MEMBERS</th>
                  <th>TYPE</th>
                  <th>REGISTERED</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((r) => {
                  const p1 = r.participants?.find((p) => p.is_leader) || r.participants?.[0];
                  const p2 = r.participants?.find((p) => !p.is_leader) || r.participants?.[1];
                  const isExpanded = expandedRegId === r.id;

                  return (
                    <tr key={r.id} className={isExpanded ? 'admin-regs__row--expanded' : ''}>
                      <td>
                        <button
                          className="font-mono text-accent fw-bold"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                          onClick={() => setModalRegId(r.id)}
                          title="Open full details modal"
                        >
                          {r.registration_id}
                        </button>
                      </td>

                      <td>
                        <div
                          className="fw-bold text-primary"
                          style={{ cursor: 'pointer' }}
                          onClick={() => toggleExpand(r.id)}
                          title="Click to toggle quick inline details"
                        >
                          {r.team_name || p1?.full_name || 'Solo Participant'}
                          <span style={{ fontSize: '0.75rem', marginLeft: '6px', color: 'var(--text-muted)' }}>
                            {isExpanded ? '▲' : '▼'}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div className="text-xs font-mono">
                          <div><strong>P1:</strong> {p1?.full_name || '—'}</div>
                          {p2 && p2.full_name && (
                            <div><strong>P2:</strong> {p2.full_name}</div>
                          )}
                        </div>
                      </td>

                      <td>
                        <span className={`badge ${r.registration_type === 'ONLINE' ? 'badge--online' : 'badge--onsite'}`}>
                          {r.registration_type}
                        </span>
                      </td>

                      <td className="text-xs text-muted">
                        {timeAgo(r.created_at)}
                      </td>

                      <td>
                        <span className={`badge ${r.checked_in ? 'badge--checked' : 'badge--unchecked'}`}>
                          {r.checked_in ? 'Checked In' : 'Pending'}
                        </span>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          {!r.checked_in ? (
                            <button
                              className={`btn btn--primary btn--xs ${checkinLoading[r.id] ? 'btn--loading' : ''}`}
                              onClick={() => handleCheckin(r)}
                              disabled={checkinLoading[r.id]}
                            >
                              {checkinLoading[r.id] ? '' : '✓ Check-In'}
                            </button>
                          ) : (
                            <button
                              className="btn btn--ghost btn--xs text-muted"
                              onClick={() => handleUndoCheckin(r)}
                              title="Undo check-in"
                            >
                              Undo
                            </button>
                          )}
                          <button
                            className="btn btn--secondary btn--xs"
                            onClick={() => setModalRegId(r.id)}
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Registration Details Modal */}
      {modalRegId && (
        <RegistrationDetailModal
          registrationId={modalRegId}
          onClose={() => setModalRegId(null)}
          onUpdate={() => loadRegistrations(selectedEventId)}
        />
      )}
    </div>
  );
}
