import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import apiClient from '../../api/client';
import { formatDateTime, timeAgo } from '../../utils/dateHelpers';
import { QRCodeSVG } from 'qrcode.react';
import './CheckIn.css';

export default function CheckIn() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [result, setResult] = useState(null);
  const [recentCheckins, setRecentCheckins] = useState([]);
  const [pendingCheckins, setPendingCheckins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(searchParams.get('event_id') || '');
  const inputRef = useRef(null);

  useEffect(() => {
    loadEvents();
    loadLiveQueues();
    inputRef.current?.focus();
  }, [selectedEventId]);

  const loadEvents = async () => {
    try {
      const { data } = await apiClient.get('/admin/dashboard/events');
      setEvents(data.events || []);
      if (!selectedEventId && data.events?.length > 0) {
        setSelectedEventId(String(data.events[0].id));
      }
    } catch {}
  };

  const loadLiveQueues = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedEventId) params.append('event_id', selectedEventId);
      const { data } = await apiClient.get(`/admin/registrations?${params}`);
      const regs = data.registrations || [];

      setRecentCheckins(regs.filter(r => r.checked_in).slice(0, 5));
      setPendingCheckins(regs.filter(r => !r.checked_in).slice(0, 8));
    } catch {}
  };

  const parseSearchQuery = (raw) => {
    let q = raw.trim();
    if (!q) return '';

    // If a full URL is scanned (e.g. http://localhost:5173/lookup?token=xxxx)
    if (q.includes('token=')) {
      try {
        const urlObj = new URL(q);
        return { type: 'token', value: urlObj.searchParams.get('token') || q };
      } catch {
        const match = q.match(/token=([a-zA-Z0-9-]+)/);
        if (match) return { type: 'token', value: match[1] };
      }
    }

    // If raw UUID token
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q)) {
      return { type: 'token', value: q };
    }

    return { type: 'query', value: q };
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    const queryObj = parseSearchQuery(search);
    if (!queryObj || !queryObj.value) return;

    setLoading(true);
    setError('');
    setSuccessMsg('');
    setResult(null);

    try {
      let reg = null;

      if (queryObj.type === 'token') {
        const { data } = await apiClient.get(`/registrations/lookup-by-token/${queryObj.value}`);
        reg = data.registration;
      } else {
        // Search by registration list with full text
        const params = new URLSearchParams({ search: queryObj.value });
        if (selectedEventId) params.append('event_id', selectedEventId);
        
        const { data } = await apiClient.get(`/admin/registrations?${params}`);
        reg = data.registrations?.[0];

        if (reg) {
          const detail = await apiClient.get(`/admin/registrations/${reg.id}`);
          reg = detail.data.registration;
        } else {
          // Fallback direct lookup by exact ID
          try {
            const { data: directData } = await apiClient.get(`/registrations/lookup/${queryObj.value}`);
            reg = directData.registration;
          } catch {}
        }
      }

      if (!reg) {
        setError(`No registration found matching "${search.trim()}". Verify the ID or QR code.`);
      } else {
        setResult(reg);
      }
    } catch {
      setError('Registration not found. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckin = async (targetReg = null) => {
    const toCheckin = targetReg || result;
    if (!toCheckin) return;

    setCheckinLoading(true);
    setError('');
    try {
      await apiClient.put(`/admin/registrations/${toCheckin.id}/checkin`);
      const updated = { ...toCheckin, checked_in: true, checked_in_at: new Date().toISOString() };
      
      if (!targetReg || targetReg.id === result?.id) {
        setResult(updated);
      }
      
      setSuccessMsg(`✅ Verified & Checked In: ${updated.team_name || updated.leader_name} (${updated.registration_id})`);
      loadLiveQueues();
    } catch (err) {
      setError(err.response?.data?.error || 'Check-in failed. Please try again.');
    } finally {
      setCheckinLoading(false);
    }
  };

  const handleUndoCheckin = async () => {
    if (!result) return;
    if (!window.confirm(`Undo check-in for ${result.team_name || result.registration_id}?`)) return;
    
    setCheckinLoading(true);
    try {
      await apiClient.put(`/admin/registrations/${result.id}/undo-checkin`);
      setResult((r) => ({ ...r, checked_in: false, checked_in_at: null }));
      setSuccessMsg(`Check-in reversed for ${result.registration_id}`);
      loadLiveQueues();
    } catch {
      setError('Failed to undo check-in');
    } finally {
      setCheckinLoading(false);
    }
  };

  const handleClear = () => {
    setResult(null);
    setError('');
    setSuccessMsg('');
    setSearch('');
    inputRef.current?.focus();
  };

  return (
    <div className="checkin-page">
      {/* Header */}
      <div className="checkin__header">
        <div>
          <h1 className="dashboard__title">Check-In Console</h1>
          <p className="dashboard__subtitle">Scan QR codes or search by Registration ID / Team name for instant verification</p>
        </div>
        <div className="checkin__header-actions">
          <Link to="/leaderboard/codedebug" className="btn btn--secondary btn--sm" style={{ borderColor: 'var(--accent)' }}>
            ⚡ Open Live Arena
          </Link>
          <Link to="/admin/onsite" className="btn btn--secondary btn--sm">
            ➕ Add On-site Reg
          </Link>
        </div>
      </div>

      {/* Main Search Area */}
      <div className="checkin__search-card card">
        <div className="card__body">
          <form onSubmit={handleSearch} className="checkin__form">
            <div className="checkin__event-field">
              <label htmlFor="event-filter" className="form-label">Event</label>
              <select
                id="event-filter"
                className="form-input form-select checkin__select"
                value={selectedEventId}
                onChange={(e) => {
                  setSelectedEventId(e.target.value);
                  setResult(null);
                }}
              >
                <option value="">All Events</option>
                {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>

            <div className="checkin__search-field">
              <label htmlFor="checkin-search" className="form-label">
                Registration ID / QR Scanner Input / Team Name
              </label>
              <div className="checkin__input-group">
                <input
                  ref={inputRef}
                  type="text"
                  id="checkin-search"
                  className="form-input checkin__input"
                  placeholder="e.g. TEC-2026-0002 or paste scanned QR code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoComplete="off"
                  autoFocus
                />
                <button
                  type="submit"
                  className={`btn btn--primary checkin__submit-btn ${loading ? 'btn--loading' : ''}`}
                  disabled={loading || !search.trim()}
                >
                  {loading ? '' : '🔍 Verify'}
                </button>
              </div>
            </div>
          </form>

          <div className="checkin__tip">
            <span>💡 <strong>Organizer Tip:</strong> Connect your USB / Bluetooth 2D barcode scanner, or paste the QR URL from your phone camera for auto-checkin.</span>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="alert alert--success mt-4">
          <span>🎉</span>
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="alert alert--error mt-4">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Search Result Card */}
      {result && (
        <div className={`checkin__result card mt-4 ${result.checked_in ? 'checkin__result--checked' : ''}`}>
          <div className="card__header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <span className="font-mono text-accent fw-bold text-lg">{result.registration_id}</span>
              <span className={`badge ${result.checked_in ? 'badge--checked' : 'badge--unchecked'}`}>
                {result.checked_in ? '✓ VERIFIED IN ARENA' : '⏳ PENDING CHECK-IN'}
              </span>
              <span className={`badge ${result.registration_type === 'ONLINE' ? 'badge--online' : 'badge--onsite'}`}>
                {result.registration_type}
              </span>
            </div>

            <button className="btn btn--ghost btn--sm" onClick={handleClear}>
              ✕ Clear / Next
            </button>
          </div>

          <div className="card__body">
            <div className="checkin__result-grid">
              <div className="checkin__result-info">
                <h2 className="checkin__team-title">{result.team_name || result.leader_name}</h2>
                <div className="text-secondary text-sm mb-4">
                  📅 Event: <strong>{result.event_name || 'Technical Competition'}</strong>
                </div>

                <div className="checkin__participants-box">
                  <span className="section__label">DUO TEAM MEMBERS (2 PLAYERS)</span>
                  <div className="checkin__participants-list">
                    {result.participants?.map((p, i) => (
                      <div key={i} className="checkin__participant-row">
                        <div className="checkin__participant-left">
                          <span className="badge badge--tag" style={{ fontSize: '0.65rem', marginRight: 'var(--space-2)' }}>
                            PLAYER {i + 1}
                          </span>
                          <div>
                            <div className="checkin__participant-name">
                              {p.full_name}
                            </div>
                            <div className="checkin__participant-meta">
                              📧 {p.email}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {result.checked_in && result.checked_in_at && (
                  <div className="checkin__timestamp-badge">
                    ✓ Checked into Arena on {formatDateTime(result.checked_in_at)}
                  </div>
                )}
              </div>

              {/* QR Token */}
              <div className="checkin__result-qr-panel">
                <div className="checkin__qr-wrap">
                  <QRCodeSVG
                    value={`${window.location.origin}/lookup?token=${result.qr_token}`}
                    size={130}
                    level="M"
                    fgColor="#070b14"
                  />
                </div>
                <span className="font-mono text-xs text-muted mt-2">Verified Token</span>
              </div>
            </div>
          </div>

          <div className="card__footer checkin__result-footer">
            <button className="btn btn--secondary" onClick={handleClear}>
              Scan Next Team
            </button>

            {result.checked_in ? (
              <button
                className="btn btn--danger"
                onClick={handleUndoCheckin}
                disabled={checkinLoading}
              >
                ✕ Undo Check-in
              </button>
            ) : (
              <button
                id="checkin-confirm-btn"
                className={`btn btn--primary btn--lg ${checkinLoading ? 'btn--loading' : ''}`}
                onClick={() => handleCheckin(result)}
                disabled={checkinLoading}
                style={{ background: '#10b981', borderColor: '#10b981', color: '#fff', fontSize: '1.05rem', padding: '0.8rem 2rem' }}
              >
                {checkinLoading ? 'Verifying...' : '✅ CONFIRM CHECK-IN'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Live Queues (Pending & Recent Check-ins) */}
      <div className="checkin__queues-grid mt-6">
        {/* Pending Queue */}
        <div className="checkin__queue-card card">
          <div className="card__header">
            <h3 className="dashboard__section-title">⏳ Pending Entrance ({pendingCheckins.length})</h3>
          </div>
          <div className="card__body" style={{ padding: 0 }}>
            {pendingCheckins.length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
                <div className="empty-state__icon">✨</div>
                <div className="empty-state__title">All Teams Checked In!</div>
                <p className="empty-state__text">No pending registrations waiting for entrance.</p>
              </div>
            ) : (
              <div className="checkin__queue-list">
                {pendingCheckins.map((r) => (
                  <div key={r.id} className="checkin__queue-item">
                    <div className="checkin__queue-item-info">
                      <span className="font-mono text-accent text-xs">{r.registration_id}</span>
                      <div className="fw-semibold text-primary">{r.team_name || r.leader_name}</div>
                      <div className="text-muted text-xs">{r.leader_name} • {r.event_name}</div>
                    </div>
                    <button
                      className="btn btn--secondary btn--sm"
                      onClick={() => {
                        setResult(r);
                        handleCheckin(r);
                      }}
                    >
                      Check In →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recently Checked-In Queue */}
        <div className="checkin__queue-card card">
          <div className="card__header">
            <h3 className="dashboard__section-title">✅ Inside Arena ({recentCheckins.length})</h3>
          </div>
          <div className="card__body" style={{ padding: 0 }}>
            {recentCheckins.length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
                <div className="empty-state__icon">🎫</div>
                <div className="empty-state__title">No Check-ins Yet</div>
                <p className="empty-state__text">Teams will stream here as you verify their entrance.</p>
              </div>
            ) : (
              <div className="checkin__queue-list">
                {recentCheckins.map((r) => (
                  <div key={r.id} className="checkin__queue-item checkin__queue-item--done">
                    <div className="checkin__queue-item-info">
                      <span className="font-mono text-success text-xs">✓ {r.registration_id}</span>
                      <div className="fw-semibold text-primary">{r.team_name || r.leader_name}</div>
                      <div className="text-muted text-xs">
                        {r.checked_in_at ? timeAgo(r.checked_in_at) : 'Just now'}
                      </div>
                    </div>
                    <span className="badge badge--checked">In Arena</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
