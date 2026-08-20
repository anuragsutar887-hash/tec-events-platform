import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import apiClient from '../../api/client';
import { formatDateTime, timeAgo } from '../../utils/dateHelpers';
import RegistrationDetailModal from './RegistrationDetailModal';
import './AdminRegistrations.css';

export default function AdminRegistrations() {
  const [searchParams] = useSearchParams();
  const [registrations, setRegistrations] = useState([]);
  const [pagination, setPagination] = useState({});
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    event_id: searchParams.get('event_id') || '',
    registration_type: '',
    participation_mode: '',
    checked_in: '',
  });
  const [selectedRegId, setSelectedRegId] = useState(null);
  const [page, setPage] = useState(1);
  const [checkinLoading, setCheckinLoading] = useState({});

  useEffect(() => { loadEvents(); }, []);
  useEffect(() => { loadRegistrations(); }, [filters, page]);

  const handleSearch = useCallback(() => { setPage(1); loadRegistrations(); }, [search, filters]);

  const loadEvents = async () => {
    try {
      const { data } = await apiClient.get('/admin/dashboard/events');
      setEvents(data.events || []);
    } catch {}
  };

  const loadRegistrations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ ...filters, search, page, limit: 50 });
      const { data } = await apiClient.get(`/admin/registrations?${params}`);
      setRegistrations(data.registrations || []);
      setPagination(data.pagination || {});
    } catch {
      setRegistrations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckin = async (reg) => {
    if (reg.checked_in) return;
    setCheckinLoading((p) => ({ ...p, [reg.id]: true }));
    try {
      await apiClient.put(`/admin/registrations/${reg.id}/checkin`);
      setRegistrations((prev) =>
        prev.map((r) => r.id === reg.id ? { ...r, checked_in: true, checked_in_at: new Date().toISOString() } : r)
      );
    } catch (err) {
      alert(err.response?.data?.error || 'Check-in failed');
    } finally {
      setCheckinLoading((p) => ({ ...p, [reg.id]: false }));
    }
  };

  // 📊 Ultra-Professional Duo Team Excel Export
  const exportToExcel = () => {
    if (!registrations || registrations.length === 0) {
      alert('No registrations found to export.');
      return;
    }

    const headers = [
      'Registration ID',
      'Event Name',
      'Team Name',
      'Participation Mode',
      'Registration Type',
      'Leader Full Name',
      'Leader Email',
      'Leader Phone',
      'Leader College',
      'Leader Department',
      'Leader Year',
      'Teammate Full Name',
      'Teammate Email',
      'Teammate Phone',
      'Teammate College',
      'Teammate Department',
      'Teammate Year',
      'Checked In Status',
      'Checked In Time',
      'Registered Timestamp'
    ];

    const rows = registrations.map((r) => {
      const participants = r.participants || [];
      const leader = participants.find((p) => p.is_leader) || participants[0] || {};
      const teammate = participants.find((p) => !p.is_leader) || (participants.length > 1 ? participants[1] : {});

      // Text escape helper that prevents Excel scientific notation (e.g. 9.18E+11)
      const escText = (val) => {
        if (!val) return '""';
        const clean = String(val).replace(/"/g, '""');
        return `="${clean}"`;
      };

      const escVal = (val) => {
        if (!val) return '""';
        return `"${String(val).replace(/"/g, '""')}"`;
      };

      return [
        escText(r.registration_id),
        escVal(r.event_name || 'codeDebug'),
        escVal(r.team_name || `${leader.full_name || 'Team'}'s Duo`),
        escVal(r.participation_mode || 'TEAM'),
        escVal(r.registration_type || 'ONLINE'),
        escVal(leader.full_name || 'N/A'),
        escVal(leader.email || 'N/A'),
        escText(leader.phone || 'N/A'),
        escVal(leader.college || 'Indira College of Engineering'),
        escVal(leader.department || 'N/A'),
        escVal(leader.year || 'N/A'),
        escVal(teammate.full_name || 'N/A'),
        escVal(teammate.email || 'N/A'),
        escText(teammate.phone || 'N/A'),
        escVal(teammate.college || leader.college || 'Indira College of Engineering'),
        escVal(teammate.department || leader.department || 'N/A'),
        escVal(teammate.year || leader.year || 'N/A'),
        escVal(r.checked_in ? 'YES (In Arena)' : 'NO (Pending)'),
        escVal(r.checked_in_at ? formatDateTime(r.checked_in_at) : 'Not Checked In'),
        escVal(formatDateTime(r.created_at)),
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `TEC_Duo_Participants_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const setFilter = (key, val) => { setFilters((f) => ({ ...f, [key]: val })); setPage(1); };

  return (
    <div className="admin-registrations">
      <div className="admin-regs__header">
        <div>
          <h1 className="dashboard__title">Registrations</h1>
          <p className="dashboard__subtitle">
            {pagination.total !== undefined ? `${pagination.total} registration(s) found` : 'Manage duo participants & attendance'}
          </p>
        </div>
        <div className="admin-regs__header-actions">
          <button onClick={exportToExcel} className="btn btn--secondary" title="Export full participant list to Excel">
            📊 Export to Excel
          </button>
          <Link to="/admin/onsite" className="btn btn--secondary">+ On-site Reg</Link>
          <Link to="/admin/checkin" className="btn btn--primary">Check-in Console</Link>
        </div>
      </div>

      {/* Search & Filters Bar (Spacious 4-column layout) */}
      <div className="admin-regs__search-bar card">
        <div className="card__body">
          <div className="admin-regs__search-row">
            <div className="admin-regs__search-input-wrap">
              <input
                type="text"
                className="form-input"
                placeholder="Search by ID, team name, leader name, email, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                id="registrations-search"
              />
              <button className="btn btn--primary" onClick={handleSearch}>
                🔍 Search
              </button>
            </div>
          </div>

          <div className="admin-regs__filters">
            <select
              className="form-input form-select"
              value={filters.event_id}
              onChange={(e) => setFilter('event_id', e.target.value)}
              aria-label="Filter by Event"
            >
              <option value="">All Events</option>
              {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>

            <select
              className="form-input form-select"
              value={filters.registration_type}
              onChange={(e) => setFilter('registration_type', e.target.value)}
              aria-label="Filter by Registration Type"
            >
              <option value="">All Types (Online & On-site)</option>
              <option value="ONLINE">Online</option>
              <option value="ON_SITE">On-site</option>
            </select>

            <select
              className="form-input form-select"
              value={filters.participation_mode}
              onChange={(e) => setFilter('participation_mode', e.target.value)}
              aria-label="Filter by Mode"
            >
              <option value="">Solo & Duo Teams</option>
              <option value="TEAM">Duo Team</option>
              <option value="SOLO">Solo</option>
            </select>

            <select
              className="form-input form-select"
              value={filters.checked_in}
              onChange={(e) => setFilter('checked_in', e.target.value)}
              aria-label="Filter by Check-in"
            >
              <option value="">All Attendance</option>
              <option value="false">Pending Check-in</option>
              <option value="true">Checked In (In Arena)</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="skeleton skeleton-card" style={{ height: '300px' }} />
      ) : registrations.length === 0 ? (
        <div className="empty-state card">
          <div className="card__body">
            <div className="empty-state__icon">📋</div>
            <div className="empty-state__title">No Registrations Found</div>
            <p className="empty-state__text">Try adjusting your search criteria or filter selections.</p>
          </div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Reg ID</th>
                <th>Duo Team / Leader</th>
                <th>Event</th>
                <th>Mode</th>
                <th>Type</th>
                <th>Members</th>
                <th>Attendance</th>
                <th>Registered</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((r) => {
                const leader = r.participants?.find((p) => p.is_leader) || r.participants?.[0] || {};
                const teammate = r.participants?.find((p) => !p.is_leader);

                return (
                  <tr key={r.id}>
                    <td>
                      <span className="font-mono text-xs text-accent fw-bold">{r.registration_id}</span>
                    </td>
                    <td>
                      <div className="fw-bold text-primary">{r.team_name || leader.full_name}</div>
                      <div className="text-xs text-muted">
                        👑 {leader.full_name || 'Leader'} {teammate ? `• 🤝 ${teammate.full_name}` : ''}
                      </div>
                    </td>
                    <td className="text-secondary text-sm">{r.event_name}</td>
                    <td>
                      <span className={`badge ${r.participation_mode === 'SOLO' ? 'badge--solo' : 'badge--team'}`}>
                        {r.participation_mode}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${r.registration_type === 'ONLINE' ? 'badge--online' : 'badge--onsite'}`}>
                        {r.registration_type}
                      </span>
                    </td>
                    <td className="text-center font-mono text-secondary">{r.participants?.length || 1}</td>
                    <td>
                      {r.checked_in ? (
                        <span className="badge badge--checked">✓ In Arena</span>
                      ) : (
                        <span className="badge badge--unchecked">Pending</span>
                      )}
                    </td>
                    <td className="text-xs text-muted">{timeAgo(r.created_at)}</td>
                    <td>
                      <div className="admin-regs__row-actions">
                        <button
                          className="btn btn--ghost btn--sm"
                          onClick={() => setSelectedRegId(r.id)}
                        >
                          View
                        </button>
                        {!r.checked_in && (
                          <button
                            className={`btn btn--primary btn--sm ${checkinLoading[r.id] ? 'btn--loading' : ''}`}
                            onClick={() => handleCheckin(r)}
                            disabled={checkinLoading[r.id]}
                          >
                            {checkinLoading[r.id] ? '' : 'Check In'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pagination.pages > 1 && (
        <div className="admin-regs__pagination">
          <button className="btn btn--secondary btn--sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
          <span className="text-sm text-muted font-mono">Page {page} of {pagination.pages}</span>
          <button className="btn btn--secondary btn--sm" onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages}>Next →</button>
        </div>
      )}

      {selectedRegId && (
        <RegistrationDetailModal
          registrationId={selectedRegId}
          onClose={() => setSelectedRegId(null)}
          onCheckin={() => loadRegistrations()}
        />
      )}
    </div>
  );
}
