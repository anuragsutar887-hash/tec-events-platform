import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/client';
import './Leaderboard.css';

export default function Leaderboard({ isAdminView = false }) {
  const [standings, setStandings] = useState([]);
  const [stats, setStats] = useState({ total_players: 0, total_points_awarded: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [expandedKey, setExpandedKey] = useState(null);

  useEffect(() => {
    fetchStandings();
    // Real-time polling every 5 seconds
    const interval = setInterval(fetchStandings, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchStandings = async () => {
    try {
      const { data } = await apiClient.get('/standings');
      setStandings(data.standings || []);
      setStats({
        total_players: data.total_players || (data.standings || []).length,
        total_points_awarded: data.total_points_awarded || 0,
      });
    } catch (err) {
      console.error('Standings fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get unique departments for filter
  const departments = ['ALL', ...new Set(standings.map((p) => p.department).filter(Boolean))];

  // Filtered standings
  const filteredStandings = standings.filter((p) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      p.full_name?.toLowerCase().includes(q) ||
      p.prn?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.department?.toLowerCase().includes(q);

    const matchesDept = deptFilter === 'ALL' || p.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  const getRankBadge = (rank) => {
    if (rank === 1) return '🥇 1st';
    if (rank === 2) return '🥈 2nd';
    if (rank === 3) return '🥉 3rd';
    return `#${rank}`;
  };

  const getRankClass = (rank) => {
    if (rank === 1) return 'lb-rank--gold';
    if (rank === 2) return 'lb-rank--silver';
    if (rank === 3) return 'lb-rank--bronze';
    return '';
  };

  return (
    <div className={`lb-page ${isAdminView ? 'lb-page--admin' : ''}`}>
      {/* ─── Editorial Header ────────────────────────────────────────── */}
      <div className="lb-header">
        <div className="container">
          <h1 className="lb-title">STANDINGS</h1>

          {/* Stat Summary Bar */}
          <div className="lb-stats-bar">
            <div className="lb-stat-pill">
              <span className="lb-stat-val">{loading ? '...' : stats.total_players}</span>
              <span className="lb-stat-lbl">Registered Players</span>
            </div>
            <div className="lb-stat-sep">|</div>
            <div className="lb-stat-pill">
              <span className="lb-stat-val text-accent">{loading ? '...' : stats.total_points_awarded}</span>
              <span className="lb-stat-lbl">Total Points Awarded</span>
            </div>
          </div>
        </div>
      </div>

      <div className="lb-content">
        {/* ─── Top 3 Podium Spotlight (always visible when players exist) ── */}
        {!loading && standings.length > 0 && (
          <div className="lb-podium-grid">
            {standings.slice(0, 3).map((player) => (
              <div
                key={player.key}
                className={`lb-podium-card ${getRankClass(player.rank)}`}
              >
                <div className="lb-podium-badge">{getRankBadge(player.rank)}</div>
                <div className="lb-podium-avatar">
                  {player.full_name?.[0]?.toUpperCase() || 'P'}
                </div>
                <h3 className="lb-podium-name">{player.full_name}</h3>
                <div className="lb-podium-prn font-mono">PRN: {player.prn}</div>
                <div className="lb-podium-points">
                  <span>⚡</span> {player.total_points} <small>PTS</small>
                </div>
                <div className="lb-podium-events">
                  {player.events_count} {player.events_count === 1 ? 'Event Joined' : 'Events Joined'}
                </div>
              </div>
            ))}
          </div>
        )}


        {/* ─── Search & Filters Bar ──────────────────────────────────── */}
        <div className="lb-controls card">
          <div className="lb-controls__inner">
            <div className="lb-search-box">
              <svg className="lb-search-icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="form-input lb-search-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search player or PRN..."
              />
              {search && (
                <button
                  type="button"
                  className="lb-search-clear"
                  onClick={() => setSearch('')}
                >
                  ✕
                </button>
              )}
            </div>

            {departments.length > 2 && (
              <div className="lb-dept-filter">
                <select
                  className="form-input form-select"
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                >
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d === 'ALL' ? 'All Departments' : `Dept: ${d}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>


        {/* ─── Standings Table / List ────────────────────────────────── */}
        {loading ? (
          <div className="card" style={{ padding: 'var(--space-10)', textAlign: 'center' }}>
            <div className="spinner mb-3" style={{ margin: '0 auto var(--space-3)' }}></div>
            <div className="font-mono text-sm text-muted">Calculating overall player standings...</div>
          </div>
        ) : filteredStandings.length === 0 ? (
          <div className="card lb-empty-card">
            <div className="lb-empty-icon">🏆</div>
            <h2>No Players Found</h2>
            <p>
              {search || deptFilter !== 'ALL'
                ? 'No participants match your current search query.'
                : 'No participants registered on the platform yet. Once students register for department events, their cumulative points and rankings will automatically show here.'}
            </p>
            <div style={{ marginTop: 'var(--space-4)' }}>
              <Link to="/#events-section" className="btn btn--primary">
                Browse Events
              </Link>
            </div>
          </div>
        ) : (
          <div className="lb-table-card card">
            <div className="lb-table-header-row">
              <span className="section__label" style={{ marginBottom: 0 }}>
                VERIFIED PLATFORM RANKINGS ({filteredStandings.length} {filteredStandings.length === 1 ? 'PLAYER' : 'PLAYERS'})
              </span>
              <span className="text-xs font-mono text-muted">
                ⚡ Sorted by total points across all events
              </span>
            </div>

            <div className="table-wrapper">
              <table className="table lb-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px', textAlign: 'center' }}>Rank</th>
                    <th>Participant</th>
                    <th>Department & College</th>
                    <th style={{ textAlign: 'center' }}>Events Participated</th>
                    <th style={{ textAlign: 'right', paddingRight: 'var(--space-6)' }}>Total Points</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStandings.map((player) => {
                    const isExpanded = expandedKey === player.key;

                    return (
                      <tr
                        key={player.key}
                        className={`lb-row ${getRankClass(player.rank)} ${isExpanded ? 'lb-row--expanded' : ''}`}
                        onClick={() => setExpandedKey(isExpanded ? null : player.key)}
                        style={{ cursor: 'pointer' }}
                        title="Click to view event points breakdown"
                      >
                        {/* Rank Column */}
                        <td style={{ textAlign: 'center' }}>
                          <span className={`lb-rank-badge ${getRankClass(player.rank)}`}>
                            {getRankBadge(player.rank)}
                          </span>
                        </td>

                        {/* Player Profile Column */}
                        <td>
                          <div className="lb-player-cell">
                            <div className="lb-avatar">
                              {player.full_name?.[0]?.toUpperCase() || 'P'}
                            </div>
                            <div>
                              <div className="lb-player-name">{player.full_name}</div>
                              <div className="lb-player-meta">
                                <span className="lb-prn-pill font-mono">PRN: {player.prn}</span>
                                {player.email && <span className="lb-email text-muted">{player.email}</span>}
                              </div>
                            </div>
                          </div>

                          {/* Expandable Breakdown of Events */}
                          {isExpanded && player.events?.length > 0 && (
                            <div className="lb-expanded-breakdown" onClick={(e) => e.stopPropagation()}>
                              <div className="text-xs font-mono fw-bold mb-2" style={{ textTransform: 'uppercase', color: '#000' }}>
                                Events & Points Breakdown ({player.events.length})
                              </div>
                              <div className="lb-events-list">
                                {player.events.map((ev, i) => (
                                  <div key={i} className="lb-event-item">
                                    <div>
                                      <span className="fw-bold">{ev.event_name}</span>
                                      <span className="text-muted text-xs font-mono ml-2">({ev.registration_id})</span>
                                    </div>
                                    <div className="lb-event-points">
                                      <span className="badge badge--online" style={{ fontSize: '0.7rem' }}>
                                        {ev.status}
                                      </span>
                                      <strong className="font-mono text-accent">+{ev.points} pts</strong>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Department Column */}
                        <td>
                          <div className="text-primary fw-semibold">{player.department}</div>
                          <div className="text-muted text-xs">{player.college}</div>
                        </td>

                        {/* Events Participated Count */}
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge badge--tag" style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
                            {player.events_count} {player.events_count === 1 ? 'Event' : 'Events'}
                          </span>
                        </td>

                        {/* Total Points */}
                        <td style={{ textAlign: 'right', paddingRight: 'var(--space-6)' }}>
                          <div className="lb-total-points">
                            <span className="lb-points-num">{player.total_points}</span>
                            <span className="lb-points-label">PTS</span>
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
      </div>
    </div>
  );
}
