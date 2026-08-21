import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import apiClient from '../../api/client';
import { formatDateTime, timeAgo } from '../../utils/dateHelpers';
import { QRCodeSVG } from 'qrcode.react';
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
  const [expandedRegId, setExpandedRegId] = useState(null);
  const [modalRegId, setModalRegId] = useState(null);
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

  const handleUndoCheckin = async (reg) => {
    if (!window.confirm(`Undo check-in for team ${reg.team_name || reg.registration_id}?`)) return;
    setCheckinLoading((p) => ({ ...p, [reg.id]: true }));
    try {
      await apiClient.put(`/admin/registrations/${reg.id}/undo-checkin`);
      setRegistrations((prev) =>
        prev.map((r) => r.id === reg.id ? { ...r, checked_in: false, checked_in_at: null } : r)
      );
    } catch {
      alert('Failed to undo check-in');
    } finally {
      setCheckinLoading((p) => ({ ...p, [reg.id]: false }));
    }
  };

  // Toggle inline expansion right beneath the team row
  const toggleExpand = (id) => {
    setExpandedRegId((prev) => (prev === id ? null : id));
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
          <h1 className="dashboard__title">REGISTRATIONS MATRIX</h1>
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

      {/* Search & Filters Bar */}
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
                🔍 SEARCH
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
                <th>REG ID</th>
                <th>DUO TEAM / LEADER</th>
                <th>EVENT</th>
                <th>MODE</th>
                <th>TYPE</th>
                <th>ATTENDANCE</th>
                <th>REGISTERED</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((r) => {
                const leader = r.participants?.find((p) => p.is_leader) || r.participants?.[0] || {};
                const teammate = r.participants?.find((p) => !p.is_leader);
                const isExpanded = expandedRegId === r.id;

                return (
                  <>
                    <tr
                      key={r.id}
                      className={`admin-regs__row ${isExpanded ? 'admin-regs__row--expanded' : ''}`}
                      onClick={() => toggleExpand(r.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <span className="font-mono text-xs fw-bold" style={{ color: '#000000' }}>
                          {r.registration_id}
                        </span>
                      </td>
                      <td>
                        <div className="fw-bold text-primary" style={{ fontSize: '0.95rem' }}>
                          {r.team_name || leader.full_name}
                        </div>
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
                      <td>
                        {r.checked_in ? (
                          <span className="badge badge--checked">✓ IN ARENA</span>
                        ) : (
                          <span className="badge badge--unchecked">PENDING</span>
                        )}
                      </td>
                      <td className="text-xs text-muted">{timeAgo(r.created_at)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="admin-regs__row-actions">
                          <button
                            className="btn btn--secondary btn--sm"
                            onClick={() => toggleExpand(r.id)}
                            title="Expand details below team name in center"
                          >
                            {isExpanded ? '▲ Hide' : '▼ Details'}
                          </button>
                          {!r.checked_in ? (
                            <button
                              className={`btn btn--primary btn--sm ${checkinLoading[r.id] ? 'btn--loading' : ''}`}
                              onClick={() => handleCheckin(r)}
                              disabled={checkinLoading[r.id]}
                            >
                              {checkinLoading[r.id] ? '' : 'Check In'}
                            </button>
                          ) : (
                            <button
                              className="btn btn--danger btn--sm"
                              onClick={() => handleUndoCheckin(r)}
                            >
                              Undo
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* ⚡ Task 2: Inline Centered Detail View Below Clicked Team Name */}
                    {isExpanded && (
                      <tr key={`expand-${r.id}`} className="admin-regs__expansion-row">
                        <td colSpan={8} className="admin-regs__expansion-cell">
                          <div className="inline-detail-box card">
                            <div className="inline-detail-box__inner">
                              {/* Header & Badges */}
                              <div className="inline-detail-box__header">
                                <div>
                                  <span className="section__label">TEAM REGISTRATION DETAILS</span>
                                  <h3 className="inline-detail-box__title">{r.team_name || `${leader.full_name}'s Duo`}</h3>
                                </div>
                                <div className="inline-detail-box__badges">
                                  <span className={`badge ${r.registration_type === 'ONLINE' ? 'badge--online' : 'badge--onsite'}`}>
                                    {r.registration_type}
                                  </span>
                                  <span className={`badge ${r.participation_mode === 'SOLO' ? 'badge--solo' : 'badge--team'}`}>
                                    {r.participation_mode}
                                  </span>
                                  <span className={`badge ${r.checked_in ? 'badge--checked' : 'badge--unchecked'}`}>
                                    {r.checked_in ? '✓ Checked In (In Arena)' : 'Pending Check-In'}
                                  </span>
                                </div>
                              </div>

                              {/* Centered 3-Column Balanced Layout */}
                              <div className="inline-detail-box__grid">
                                {/* Col 1: Registration Metadata */}
                                <div className="inline-detail-box__col">
                                  <div className="detail-field">
                                    <span className="detail-field__label">REGISTRATION ID</span>
                                    <span className="detail-field__val reg-id">{r.registration_id}</span>
                                  </div>
                                  <div className="detail-field">
                                    <span className="detail-field__label">EVENT NAME</span>
                                    <span className="detail-field__val text-primary">{r.event_name}</span>
                                  </div>
                                  <div className="detail-field">
                                    <span className="detail-field__label">REGISTERED TIMESTAMP</span>
                                    <span className="detail-field__val">{formatDateTime(r.created_at)}</span>
                                  </div>
                                  {r.checked_in && (
                                    <div className="detail-field">
                                      <span className="detail-field__label">ARENA CHECK-IN TIME</span>
                                      <span className="detail-field__val text-success fw-bold">{formatDateTime(r.checked_in_at)}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Col 2: Duo Members */}
                                <div className="inline-detail-box__col inline-detail-box__col--members">
                                  <span className="detail-field__label">DUO TEAM MEMBERS ({r.participants?.length || 1})</span>
                                  <div className="inline-members-list">
                                    {r.participants?.map((p, pIdx) => (
                                      <div key={pIdx} className="inline-member-pill">
                                        <div className="inline-member-pill__top">
                                          <span className="inline-member-pill__name">{p.full_name}</span>
                                          {p.is_leader ? (
                                            <span className="badge badge--team" style={{ fontSize: '0.65rem' }}>👑 Leader</span>
                                          ) : (
                                            <span className="badge badge--solo" style={{ fontSize: '0.65rem' }}>🤝 Teammate</span>
                                          )}
                                        </div>
                                        <div className="inline-member-pill__meta">
                                          <span>📧 {p.email}</span>
                                          {p.phone && <span>📱 {p.phone}</span>}
                                          <span>🏛️ {[p.department, p.year, p.college].filter(Boolean).join(' • ')}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Col 3: Centered QR Code Box */}
                                <div className="inline-detail-box__col inline-detail-box__col--qr">
                                  <div className="inline-qr-card">
                                    <QRCodeSVG
                                      value={`${window.location.origin}/lookup?token=${r.qr_token}`}
                                      size={125}
                                      level="M"
                                      fgColor="#000000"
                                    />
                                    <span className="inline-qr-label">QR CODE CHECK-IN</span>
                                  </div>
                                </div>
                              </div>

                              {/* Footer Actions with Theme-Matching Cancel/Close Button */}
                              <div className="inline-detail-box__footer">
                                <div className="inline-detail-box__footer-left">
                                  {!r.checked_in ? (
                                    <button
                                      className={`btn btn--primary btn--sm ${checkinLoading[r.id] ? 'btn--loading' : ''}`}
                                      onClick={() => handleCheckin(r)}
                                      disabled={checkinLoading[r.id]}
                                    >
                                      {checkinLoading[r.id] ? '' : '✓ Check-In to Arena'}
                                    </button>
                                  ) : (
                                    <button
                                      className="btn btn--danger btn--sm"
                                      onClick={() => handleUndoCheckin(r)}
                                    >
                                      Undo Check-in
                                    </button>
                                  )}
                                </div>
                                <button
                                  className="btn btn--secondary btn--sm"
                                  onClick={() => toggleExpand(r.id)}
                                >
                                  Close Details ✕
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
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

      {modalRegId && (
        <RegistrationDetailModal
          registrationId={modalRegId}
          onClose={() => setModalRegId(null)}
          onCheckin={() => loadRegistrations()}
        />
      )}
    </div>
  );
}
