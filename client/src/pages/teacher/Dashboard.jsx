import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { teacherService } from '../../services/teacherService';
import './Dashboard.css';

export default function TeacherDashboard() {
  const [stats, setStats] = useState({
    totalEvents: 0,
    upcomingEvents: 0,
    liveEvents: 0,
    completedEvents: 0,
    totalQuestions: 0,
    totalStudents: 0,
  });
  const [recentQuestions, setRecentQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [dashStats, questions] = await Promise.all([
          teacherService.getDashboardStats(),
          teacherService.getQuestions({ showArchived: false }),
        ]);
        setStats(dashStats);
        setRecentQuestions((questions || []).slice(0, 6));
      } catch (err) {
        console.error('Failed to load teacher stats:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="teacher-dashboard">
      {/* ─── Header ──────────────────────────────────────────── */}
      <div className="teacher-dashboard__header">
        <div>
          <h1 className="teacher-dashboard__title">Faculty Overview</h1>
          <p className="teacher-dashboard__subtitle">
            Manage question banks, create tests, and track your students.
          </p>
        </div>
      </div>

      {/* ─── 4 Stat Cards ────────────────────────────────────── */}
      <div className="teacher-stats-grid">
        <div className="teacher-stat-card">
          <div className="teacher-stat-icon">📅</div>
          <div className="teacher-stat-body">
            <div className="teacher-stat-value">{loading ? '—' : stats.totalEvents}</div>
            <div className="teacher-stat-label">Total Events</div>
          </div>
        </div>

        <div className="teacher-stat-card teacher-stat-card--blue">
          <div className="teacher-stat-icon">🔴</div>
          <div className="teacher-stat-body">
            <div className="teacher-stat-value">{loading ? '—' : stats.liveEvents}</div>
            <div className="teacher-stat-label">Live Events</div>
          </div>
        </div>

        <div className="teacher-stat-card teacher-stat-card--dark">
          <div className="teacher-stat-icon">📚</div>
          <div className="teacher-stat-body">
            <div className="teacher-stat-value">{loading ? '—' : stats.totalQuestions}</div>
            <div className="teacher-stat-label">Questions in Bank</div>
          </div>
        </div>

        <div className="teacher-stat-card">
          <div className="teacher-stat-icon">👥</div>
          <div className="teacher-stat-body">
            <div className="teacher-stat-value">{loading ? '—' : stats.totalStudents}</div>
            <div className="teacher-stat-label">Registered Students</div>
          </div>
        </div>
      </div>

      {/* ─── Two-column layout: Recent Questions + Quick Actions ── */}
      <div className="teacher-workflows-grid">
        {/* Recent Questions */}
        <div className="card">
          <div className="card__header">
            <h3 className="teacher-section-title">Recent Questions</h3>
            <Link to="/teacher/questions" className="teacher-view-all-link">
              View All ({stats.totalQuestions}) →
            </Link>
          </div>
          <div className="card__body" style={{ padding: 0 }}>
            {recentQuestions.length === 0 ? (
              <div className="teacher-empty-state">
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📭</div>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>No questions yet</div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Use <strong>Import Questions</strong> in the top bar to add questions.
                </p>
              </div>
            ) : (
              <div className="teacher-questions-list">
                {recentQuestions.map((q, idx) => (
                  <div key={q.id || idx} className="teacher-question-row">
                    <div className="teacher-question-num">{idx + 1}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="teacher-question-meta">
                        <span className="badge badge--tag">{q.subject || 'CS'}</span>
                        <span className={`badge ${q.difficulty === 'HARD' ? 'badge--danger' : q.difficulty === 'EASY' ? 'badge--success' : 'badge--bronze'}`}>
                          {q.difficulty}
                        </span>
                        <span className="teacher-question-marks">{q.marks || 1} mark</span>
                      </div>
                      <div className="teacher-question-text">{q.question}</div>
                    </div>
                    <div className="teacher-question-ans">Ans: {q.correct_option}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="card__footer" style={{ borderTop: '1px solid var(--border)', padding: 'var(--space-3) var(--space-4)' }}>
            <Link to="/teacher/questions" className="btn btn--secondary btn--sm">
              📚 Open Question Bank
            </Link>
            <Link to="/teacher/import" className="btn btn--primary btn--sm" style={{ marginLeft: '8px' }}>
              📥 Import Questions
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Quick Links */}
          <div className="card">
            <div className="card__header">
              <h3 className="teacher-section-title">Quick Actions</h3>
            </div>
            <div className="card__body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <Link to="/teacher/events" className="teacher-quick-action">
                <span className="teacher-quick-action__icon">📅</span>
                <div>
                  <div className="teacher-quick-action__title">Events &amp; Tests</div>
                  <div className="teacher-quick-action__sub">Create and manage your test events</div>
                </div>
                <span className="teacher-quick-action__arrow">→</span>
              </Link>
              <Link to="/teacher/questions" className="teacher-quick-action">
                <span className="teacher-quick-action__icon">📚</span>
                <div>
                  <div className="teacher-quick-action__title">Question Bank</div>
                  <div className="teacher-quick-action__sub">Browse, edit and organise questions</div>
                </div>
                <span className="teacher-quick-action__arrow">→</span>
              </Link>
              <Link to="/teacher/import" className="teacher-quick-action">
                <span className="teacher-quick-action__icon">📥</span>
                <div>
                  <div className="teacher-quick-action__title">Import Questions</div>
                  <div className="teacher-quick-action__sub">Upload PDF, Excel or paste AI text</div>
                </div>
                <span className="teacher-quick-action__arrow">→</span>
              </Link>
              <Link to="/teacher/students" className="teacher-quick-action">
                <span className="teacher-quick-action__icon">👥</span>
                <div>
                  <div className="teacher-quick-action__title">Registered Students</div>
                  <div className="teacher-quick-action__sub">View participant lists</div>
                </div>
                <span className="teacher-quick-action__arrow">→</span>
              </Link>
            </div>
          </div>

          {/* Event summary */}
          <div className="card">
            <div className="card__header">
              <h3 className="teacher-section-title">Event Summary</h3>
            </div>
            <div className="card__body">
              <div className="teacher-event-summary-grid">
                <div className="teacher-event-summary-item">
                  <div className="teacher-event-summary-val">{loading ? '—' : stats.upcomingEvents}</div>
                  <div className="teacher-event-summary-lbl">Upcoming</div>
                </div>
                <div className="teacher-event-summary-item">
                  <div className="teacher-event-summary-val" style={{ color: '#2563eb' }}>{loading ? '—' : stats.liveEvents}</div>
                  <div className="teacher-event-summary-lbl">Live</div>
                </div>
                <div className="teacher-event-summary-item">
                  <div className="teacher-event-summary-val">{loading ? '—' : stats.completedEvents}</div>
                  <div className="teacher-event-summary-lbl">Completed</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
