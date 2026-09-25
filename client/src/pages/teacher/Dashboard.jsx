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
        setRecentQuestions((questions || []).slice(0, 5));
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
      <div className="teacher-dashboard__header">
        <div>
          <span className="section__label">ACADEMIC TELEMETRY</span>
          <h1 className="teacher-dashboard__title">Faculty Overview</h1>
          <p className="teacher-dashboard__subtitle">
            Manage question banks, import assessments, and publish tests to the testing platform.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Link to="/teacher/import" className="btn btn--primary">
            📥 Import Questions
          </Link>
          <Link to="/teacher/questions" className="btn btn--secondary">
            📚 Question Bank
          </Link>
        </div>
      </div>

      {/* ─── 6 Stat Cards per Specification ─────────────────────── */}
      <div className="teacher-stats-grid">
        <div className="teacher-stat-card card">
          <div className="teacher-stat-label">Total Events</div>
          <div className="teacher-stat-value">{loading ? '...' : stats.totalEvents}</div>
          <div className="teacher-stat-sub">Department competitions</div>
        </div>

        <div className="teacher-stat-card card">
          <div className="teacher-stat-label">Upcoming Events</div>
          <div className="teacher-stat-value">{loading ? '...' : stats.upcomingEvents}</div>
          <div className="teacher-stat-sub">Scheduled on calendar</div>
        </div>

        <div className="teacher-stat-card card" style={{ borderLeft: '3px solid #2563eb' }}>
          <div className="teacher-stat-label" style={{ color: '#2563eb' }}>🔴 Live Events</div>
          <div className="teacher-stat-value" style={{ color: '#2563eb' }}>{loading ? '...' : stats.liveEvents}</div>
          <div className="teacher-stat-sub">Currently in progress</div>
        </div>

        <div className="teacher-stat-card card">
          <div className="teacher-stat-label">Completed Events</div>
          <div className="teacher-stat-value">{loading ? '...' : stats.completedEvents}</div>
          <div className="teacher-stat-sub">Evaluated & archived</div>
        </div>

        <div className="teacher-stat-card card" style={{ borderLeft: '3px solid #000000' }}>
          <div className="teacher-stat-label">Total Questions</div>
          <div className="teacher-stat-value">{loading ? '...' : stats.totalQuestions}</div>
          <div className="teacher-stat-sub">In central Question Bank</div>
        </div>

        <div className="teacher-stat-card card">
          <div className="teacher-stat-label">Registered Students</div>
          <div className="teacher-stat-value">{loading ? '...' : stats.totalStudents}</div>
          <div className="teacher-stat-sub">Participants across events</div>
        </div>
      </div>

      {/* ─── Quick Workflows ────────────────────────────────────── */}
      <div className="teacher-workflows-grid">
        <div className="card">
          <div className="card__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', fontWeight: 800, margin: 0 }}>
              RECENT QUESTIONS
            </h3>
            <Link to="/teacher/questions" style={{ fontSize: '0.8rem', color: '#000000', fontWeight: 700 }}>
              View All ({stats.totalQuestions}) →
            </Link>
          </div>
          <div className="card__body" style={{ padding: 0 }}>
            {recentQuestions.length === 0 ? (
              <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-muted)' }}>
                No questions created yet. Use <strong>Import Questions</strong> or <strong>Add Question</strong> to populate the bank.
              </div>
            ) : (
              <div className="teacher-questions-list">
                {recentQuestions.map((q, idx) => (
                  <div key={q.id || idx} className="teacher-question-row">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' }}>
                        <span className="badge badge--tag" style={{ fontSize: '0.65rem' }}>{q.subject || 'CS'}</span>
                        <span className="badge badge--bronze" style={{ fontSize: '0.65rem' }}>{q.difficulty}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {q.marks || 1} mark(s)
                        </span>
                      </div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {q.question}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginLeft: '12px' }}>
                      Ans: Opt {q.correct_option}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Import Hub Card */}
        <div className="card">
          <div className="card__header">
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', fontWeight: 800, margin: 0 }}>
              QUESTION IMPORT PIPELINES
            </h3>
          </div>
          <div className="card__body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              The unified question pipeline accepts questions from multiple sources, validates them against the standard format, and lets you review before publishing.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)', marginTop: '4px' }}>
              <Link to="/teacher/import?tab=excel" className="teacher-pipeline-card">
                <span style={{ fontSize: '1.25rem' }}>📊</span>
                <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Excel (.xlsx)</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Template & batch upload</span>
              </Link>

              <Link to="/teacher/import?tab=ai" className="teacher-pipeline-card">
                <span style={{ fontSize: '1.25rem' }}>🤖</span>
                <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>ChatGPT / AI Text</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Paste freeform text</span>
              </Link>

              <Link to="/teacher/import?tab=pdf" className="teacher-pipeline-card">
                <span style={{ fontSize: '1.25rem' }}>📄</span>
                <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>PDF Extraction</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Exam papers & notes</span>
              </Link>

              <Link to="/teacher/import?tab=image" className="teacher-pipeline-card">
                <span style={{ fontSize: '1.25rem' }}>🖼️</span>
                <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Image OCR</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Scans & whiteboard photos</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
