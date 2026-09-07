import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import apiClient from '../../api/client';
import { formatDateTime, timeAgo } from '../../utils/dateHelpers';
import './CheckIn.css';

// 🔊 Audio synthesizer for instant check-in feedback (Zero external assets needed)
const playSuccessBeep = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // High pitch clear chime (A5)
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {}
};

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

      setRecentCheckins(regs.filter((r) => r.checked_in).slice(0, 10));
      setPendingCheckins(regs.filter((r) => !r.checked_in).slice(0, 10));
    } catch {}
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    const query = search.trim();
    if (!query) return;

    setLoading(true);
    setError('');
    setSuccessMsg('');
    setResult(null);

    try {
      let reg = null;

      // 1. Direct Search by Registration ID or Name/Email
      const params = new URLSearchParams({ search: query });
      if (selectedEventId) params.append('event_id', selectedEventId);

      const { data } = await apiClient.get(`/admin/registrations?${params}`);
      reg = data.registrations?.[0];

      if (reg) {
        const detail = await apiClient.get(`/admin/registrations/${reg.id}`);
        reg = detail.data.registration;
      } else {
        // Fallback direct lookup
        try {
          const { data: directData } = await apiClient.get(`/registrations/lookup/${encodeURIComponent(query)}`);
          reg = directData.registration;
        } catch {}
      }

      if (!reg) {
        setError(`No registration found matching "${query}". Please verify the Registration ID or Team Name.`);
      } else {
        setResult(reg);
      }
    } catch {
      setError('Registration not found. Please verify details and try again.');
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

      playSuccessBeep();
      setSuccessMsg(`🎉 Successfully Checked In: ${updated.team_name || updated.registration_id} (Player 1 & Player 2)`);
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
          <h1 className="dashboard__title">CHECK-IN CONSOLE</h1>
          <p className="dashboard__subtitle">Event desk participant verification & live auditorium leaderboard stream</p>
        </div>
        <div className="checkin__header-actions">
          <Link to="/leaderboard/codedebug" className="btn btn--secondary btn--sm" target="_blank">
            ⚡ Open Live Leaderboard
          </Link>
          <Link to="/admin/onsite" className="btn btn--secondary btn--sm">
            + On-site Reg
          </Link>
        </div>
      </div>

      {/* ─── 1. DESK SEARCH BY REGISTRATION ID ───────────────────── */}
      <div className="checkin__search-card card mb-6">
        <div className="card__body">
          <form onSubmit={handleSearch} className="checkin__form">
            <div className="checkin__event-field">
              <label htmlFor="event-filter" className="form-label">Event</label>
              <select
                id="event-filter"
                className="form-input form-select checkin__select"
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.name}</option>
                ))}
              </select>
            </div>

            <div className="checkin__search-field">
              <label htmlFor="checkin-search-input" className="form-label">
                Enter Registration ID / Team Name / Player Name / Email
              </label>
              <div className="checkin__input-group">
                <input
                  ref={inputRef}
                  id="checkin-search-input"
                  type="text"
                  className="form-input checkin__input"
                  placeholder="e.g. TEC-2026-4784, Binary Beasts, or student email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoComplete="off"
                  autoFocus
                />
                <button
                  type="submit"
                  id="checkin-submit-btn"
                  className={`btn btn--primary checkin__submit-btn ${loading ? 'btn--loading' : ''}`}
                  disabled={loading || !search.trim()}
                >
                  {loading ? '' : 'Search & Verify'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="alert alert--error mb-6">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="alert alert--success mb-6" style={{ fontSize: '1rem', padding: 'var(--space-4) var(--space-5)' }}>
          <span>{successMsg}</span>
        </div>
      )}

      {/* ─── 2. VERIFIED PARTICIPANT RESULT CARD ──────────────────── */}
      {result && (
        <div className={`checkin__result card mb-6 ${result.checked_in ? 'checkin__result--checked' : ''}`}>
          <div className="card__header" style={{
            background: '#fafafa',
            borderBottom: '1px solid var(--border)',
            padding: 'var(--space-4) var(--space-6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--space-2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <span className="font-mono text-accent fw-bold text-lg">{result.registration_id}</span>
              <span className={`badge ${result.checked_in ? 'badge--checked' : 'badge--unchecked'}`}>
                {result.checked_in ? '✓ IN ARENA' : '⏳ PENDING CHECK-IN'}
              </span>
              <span className="badge badge--tag">{result.registration_type}</span>
            </div>

            <button className="btn btn--secondary btn--sm" onClick={handleClear}>
              ✕ Clear / Next
            </button>
          </div>

          <div className="card__body" style={{ padding: 'var(--space-6)' }}>
            <div className="checkin__result-grid" style={{ gridTemplateColumns: '1fr' }}>
              <div className="checkin__result-info">
                <h2 className="checkin__team-title">{result.team_name || result.leader_name}</h2>
                <div className="text-secondary text-sm mb-4">
                  📅 Event: <strong>{result.event_name || 'Technical Event'}</strong>
                </div>

                {/* Participant Details */}
                <div className="checkin__participants-box">
                  <span className="section__label">
                    {result.participants?.length > 1 ? 'TEAM MEMBERS' : 'PARTICIPANT'}
                  </span>
                  <div className="checkin__participants-list" style={{ display: 'grid', gridTemplateColumns: result.participants?.length > 1 ? '1fr 1fr' : '1fr', gap: 'var(--space-3)' }}>
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
                            <div className="checkin__participant-meta" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              {(p.student_id || p.prn) && (
                                <span className="font-mono fw-bold" style={{ color: '#000000' }}>
                                  🆔 PRN: {p.student_id || p.prn}
                                </span>
                              )}
                              <span>📧 {p.email}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {result.checked_in && result.checked_in_at && (
                  <div className="checkin__timestamp-badge" style={{ marginTop: 'var(--space-4)' }}>
                    ✓ Checked into Arena on {formatDateTime(result.checked_in_at)}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card__footer checkin__result-footer" style={{
            background: '#fafafa',
            borderTop: '1px solid var(--border)',
            padding: 'var(--space-4) var(--space-6)'
          }}>
            <div>
              {result.checked_in ? (
                <button
                  className={`btn btn--danger btn--sm ${checkinLoading ? 'btn--loading' : ''}`}
                  onClick={handleUndoCheckin}
                  disabled={checkinLoading}
                >
                  Undo Check-In
                </button>
              ) : (
                <button
                  className={`btn btn--primary btn--lg ${checkinLoading ? 'btn--loading' : ''}`}
                  onClick={() => handleCheckin()}
                  disabled={checkinLoading}
                >
                  {checkinLoading ? '' : 'Check In to Arena'}
                </button>
              )}
            </div>

            <button className="btn btn--secondary btn--sm" onClick={handleClear}>
              Ready for Next Participant
            </button>
          </div>
        </div>
      )}

      {/* ─── 3. LIVE QUEUES (INSIDE ARENA & PENDING) ──────────────── */}
      <div className="checkin__queues-grid">
        {/* Pending Check-Ins Queue */}
        <div className="checkin__queue-card card">
          <div className="card__header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 className="dashboard__section-title">⏳ Pending Entrance ({pendingCheckins.length})</h3>
            <button onClick={loadLiveQueues} className="btn btn--ghost btn--sm">↻ Refresh</button>
          </div>
          <div className="card__body" style={{ padding: 0 }}>
            {pendingCheckins.length === 0 ? (
              <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-muted)' }}>
                No pending registrations found.
              </div>
            ) : (
              <div className="checkin__queue-list">
                {pendingCheckins.map((r) => (
                  <div key={r.id} className="checkin__queue-item">
                    <div className="checkin__queue-item-info">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <span className="font-mono text-xs fw-bold text-accent">{r.registration_id}</span>
                        <span className="text-sm fw-bold text-primary">{r.team_name || r.leader_name}</span>
                      </div>
                      <div className="text-xs text-muted">
                        Registered {timeAgo(r.created_at)}
                      </div>
                    </div>
                    <button
                      className="btn btn--primary btn--sm"
                      onClick={() => {
                        setResult(r);
                        handleCheckin(r);
                      }}
                    >
                      Check In
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
              <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-muted)' }}>
                No participants checked in yet today.
              </div>
            ) : (
              <div className="checkin__queue-list">
                {recentCheckins.map((r) => (
                  <div key={r.id} className="checkin__queue-item">
                    <div className="checkin__queue-item-info">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <span className="badge badge--checked" style={{ fontSize: '0.65rem' }}>✓ IN ARENA</span>
                        <span className="text-sm fw-bold text-primary">{r.team_name || r.leader_name}</span>
                      </div>
                      <div className="text-xs text-muted font-mono">
                        {r.registration_id} · {r.checked_in_at ? formatDateTime(r.checked_in_at) : 'Checked In'}
                      </div>
                    </div>
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() => setResult(r)}
                    >
                      View
                    </button>
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
