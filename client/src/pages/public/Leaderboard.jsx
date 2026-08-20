import { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import apiClient from '../../api/client';
import { SkeletonLeaderboardCard } from '../../components/common/SkeletonCard';
import './Leaderboard.css';

export default function Leaderboard({ isAdminView = false }) {
  const { eventSlug = 'codedebug' } = useParams();
  const [event, setEvent] = useState(null);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastScannedTeam, setLastScannedTeam] = useState(null);
  const prevCountRef = useRef(0);

  useEffect(() => {
    fetchLeaderboardData();

    // Poll every 3 seconds for live event-day real-time updates
    const interval = setInterval(fetchLeaderboardData, 3000);
    return () => clearInterval(interval);
  }, [eventSlug]);

  const fetchLeaderboardData = async () => {
    try {
      // 1. Get event details
      const { data: evData } = await apiClient.get(`/events/${eventSlug}`);
      setEvent(evData.event);

      // 2. Fetch registrations for this event
      const { data: regData } = await apiClient.get(`/registrations/leaderboard/${evData.event.id}`);
      const checkedInList = regData.teams || [];

      // Check if new team arrived
      if (checkedInList.length > prevCountRef.current && prevCountRef.current > 0) {
        const newest = checkedInList[checkedInList.length - 1];
        setLastScannedTeam(newest.team_name || newest.leader_name);
        setTimeout(() => setLastScannedTeam(null), 5000);
      }
      prevCountRef.current = checkedInList.length;
      setTeams(checkedInList);
    } catch (err) {
      console.error('Leaderboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (idx) => {
    if (idx === 0) return '🥇 1st';
    if (idx === 1) return '🥈 2nd';
    if (idx === 2) return '🥉 3rd';
    return `#${idx + 1}`;
  };

  return (
    <div className={`lb-page ${isAdminView ? 'lb-page--admin' : ''}`}>
      <div className="lb-header">
        <div className="lb-live-indicator">
          <span className="lb-pulse-dot"></span>
          <span>LIVE ARENA STREAM · QR CHECK-IN</span>
        </div>
        <h1 className="lb-title">⚡ {event?.name || 'codeDebug'} Leaderboard</h1>
        <p className="lb-subtitle">
          Real-time stream of verified Duo Teams entering the competition arena
        </p>

        <div className="lb-stats-bar">
          <div className="lb-stat-pill">
            <span className="lb-stat-val">{loading ? '...' : teams.length}</span>
            <span className="lb-stat-lbl">Teams Checked In</span>
          </div>
          <div className="lb-stat-sep">|</div>
          <div className="lb-stat-pill">
            <span className="lb-stat-val">{loading ? '...' : teams.length * 2}</span>
            <span className="lb-stat-lbl">Participants in Arena</span>
          </div>
          <div className="lb-stat-sep">|</div>
          <div className="lb-stat-pill">
            <span className="lb-stat-val">{event?.venue || 'IT Department'}</span>
            <span className="lb-stat-lbl">Arena Venue</span>
          </div>
        </div>
      </div>

      {lastScannedTeam && (
        <div className="lb-toast-banner">
          🎉 Team <strong>{lastScannedTeam}</strong> just scanned their QR code and joined the live arena!
        </div>
      )}

      <div className="lb-content">
        {loading ? (
          <div className="lb-teams-list">
            {[1, 2, 3].map((n) => (
              <SkeletonLeaderboardCard key={n} />
            ))}
          </div>
        ) : teams.length === 0 ? (
          <div className="lb-empty-card">
            <div className="lb-empty-icon">⏳</div>
            <h2>Waiting for Duo Teams</h2>
            <p>
              Teams will instantly appear here on the auditorium screen as soon as their QR code is scanned at the entrance.
            </p>
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to={`/events/${eventSlug}/register`} className="btn btn--primary">
                Register Your Duo Team
              </Link>
              <Link to="/admin/checkin" className="btn btn--secondary">
                Organizer Scanner Console
              </Link>
            </div>
          </div>
        ) : (
          <div className="lb-teams-list">
            {teams.map((team, idx) => {
              const leader = team.participants?.find((p) => p.is_leader) || { full_name: team.leader_name, department: team.leader_dept };
              const member = team.participants?.find((p) => !p.is_leader);

              return (
                <div
                  key={team.id || idx}
                  className={`lb-card ${idx === 0 ? 'lb-card--gold' : idx === 1 ? 'lb-card--silver' : idx === 2 ? 'lb-card--bronze' : ''}`}
                >
                  <div className="lb-rank-col">
                    <span className="lb-rank-badge">{getRankBadge(idx)}</span>
                  </div>

                  <div className="lb-team-col">
                    <div className="lb-team-heading">
                      <span className="lb-team-name">{team.team_name || `${leader.full_name}'s Duo`}</span>
                      <span className="lb-reg-pill">{team.registration_id}</span>
                    </div>

                    <div className="lb-duo-grid">
                      <div className="lb-duo-tag leader">
                        👑 <strong>Leader:</strong> {leader.full_name} ({leader.department || 'Tech'})
                      </div>
                      {member && (
                        <div className="lb-duo-tag member">
                          🤝 <strong>Teammate:</strong> {member.full_name} ({member.department || 'Tech'})
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="lb-status-col">
                    <span className="lb-status-pill">✅ In Arena</span>
                    <span className="lb-checkin-time">
                      {team.checked_in_at
                        ? new Date(team.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                        : 'Just now'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
