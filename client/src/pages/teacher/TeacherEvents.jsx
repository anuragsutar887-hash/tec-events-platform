import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/client';
import { teacherService } from '../../services/teacherService';
import './TeacherEvents.css';

export default function TeacherEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [publishingId, setPublishingId] = useState(null);
  const [statusMsg, setStatusMsg] = useState({});

  // Question Management Modal
  const [activeModalEvent, setActiveModalEvent] = useState(null);
  const [eventQuestions, setEventQuestions] = useState([]);
  const [allQuestions, setAllQuestions] = useState([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
  const [savingQuestions, setSavingQuestions] = useState(false);

  // Student list modal
  const [viewStudentsEvent, setViewStudentsEvent] = useState(null);
  const [eventStudents, setEventStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/events');
      const evList = res.data?.events || [];

      // Augment each event with registered student count & assigned questions count
      const augmented = await Promise.all(
        evList.map(async (ev) => {
          let studentCount = 0;
          let questionCount = 0;
          try {
            const assigned = await teacherService.getEventQuestions(ev.id);
            questionCount = assigned.length;
          } catch {}

          try {
            // Count registered participants for this event
            const { data: regData } = await apiClient.get(`/admin/registrations?event_id=${ev.id}`);
            const regs = regData?.registrations || [];
            studentCount = regs.reduce((sum, r) => sum + (r.participants?.length || 1), 0);
          } catch {}

          return {
            ...ev,
            assignedQuestionCount: questionCount,
            studentCount,
          };
        })
      );

      setEvents(augmented);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  // ─── PUBLISH TEST TO PLATFORM ───────────────────────────────
  const handlePublishTest = async (event) => {
    if (!window.confirm(`Publish test for "${event.name}"? This will securely sync all ${event.assignedQuestionCount} assigned questions and ${event.studentCount} registered students with the external Test Platform.`)) {
      return;
    }

    setPublishingId(event.id);
    setStatusMsg((prev) => ({ ...prev, [event.id]: { type: 'info', text: 'Syncing questions & students with Test Platform...' } }));

    try {
      const result = await teacherService.publishTestToPlatform(event.id);
      setStatusMsg((prev) => ({
        ...prev,
        [event.id]: {
          type: 'success',
          text: `✓ Test published! URL: ${result.test_url}`,
          testUrl: result.test_url
        }
      }));
      loadEvents();
    } catch (err) {
      setStatusMsg((prev) => ({
        ...prev,
        [event.id]: { type: 'error', text: err.message || 'Failed to publish test.' }
      }));
    } finally {
      setPublishingId(null);
    }
  };

  // ─── ASSIGN QUESTIONS MODAL ─────────────────────────────────
  const openQuestionsModal = async (event) => {
    setActiveModalEvent(event);
    setSavingQuestions(true);
    try {
      const [assigned, bank] = await Promise.all([
        teacherService.getEventQuestions(event.id),
        teacherService.getQuestions({ showArchived: false }),
      ]);
      setEventQuestions(assigned);
      setAllQuestions(bank);
      setSelectedQuestionIds(assigned.map((q) => q.id));
    } catch (err) {
      alert('Error loading questions: ' + err.message);
    } finally {
      setSavingQuestions(false);
    }
  };

  const toggleQuestionSelection = (qid) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(qid) ? prev.filter((id) => id !== qid) : [...prev, qid]
    );
  };

  const handleSaveAssignedQuestions = async () => {
    if (!activeModalEvent) return;
    setSavingQuestions(true);
    try {
      await teacherService.assignQuestionsToEvent(activeModalEvent.id, selectedQuestionIds);
      setActiveModalEvent(null);
      loadEvents();
    } catch (err) {
      alert('Failed to save questions: ' + err.message);
    } finally {
      setSavingQuestions(false);
    }
  };

  // ─── VIEW STUDENTS MODAL ────────────────────────────────────
  const openStudentsModal = async (event) => {
    setViewStudentsEvent(event);
    setLoadingStudents(true);
    try {
      const { data } = await apiClient.get(`/admin/registrations?event_id=${event.id}`);
      const regs = data?.registrations || [];
      const flatStudents = [];
      regs.forEach((r) => {
        (r.participants || []).forEach((p) => {
          flatStudents.push({
            ...p,
            teamName: r.team_name,
            regCode: r.registration_id,
            checkedIn: r.checked_in,
          });
        });
      });
      setEventStudents(flatStudents);
    } catch (err) {
      alert('Failed to fetch students: ' + err.message);
    } finally {
      setLoadingStudents(false);
    }
  };

  return (
    <div className="teacher-events-page">
      <div className="teacher-events-header">
        <div>
          <span className="section__label">ASSESSMENTS</span>
          <h1 className="teacher-events-title">Events & Test Management</h1>
          <p className="teacher-events-subtitle">
            Configure question papers for department events, monitor registered students, and publish live tests to the Test Platform.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
          <div className="skeleton skeleton-title" style={{ width: '40%', margin: '0 auto' }} />
        </div>
      ) : events.length === 0 ? (
        <div className="empty-state card">
          <div className="card__body">
            <div className="empty-state__icon">📅</div>
            <div className="empty-state__title">No events published yet</div>
            <p className="empty-state__text">
              Department events created by the committee will appear here so you can assign questions and publish tests.
            </p>
          </div>
        </div>
      ) : (
        <div className="teacher-events-list">
          {events.map((ev) => (
            <div key={ev.id} className="teacher-event-card card">
              <div className="teacher-event-card__main">
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', marginBottom: '6px' }}>
                  <span className="badge badge--tag">{ev.status || 'PUBLISHED'}</span>
                  {ev.test_status === 'SYNCED' && (
                    <span className="badge badge--success">✓ TEST SYNCED</span>
                  )}
                  {ev.event_date && (
                    <span className="text-xs text-muted font-mono">
                      📅 {new Date(ev.event_date).toLocaleDateString()}
                    </span>
                  )}
                  {ev.venue && (
                    <span className="text-xs text-muted">📍 {ev.venue}</span>
                  )}
                </div>

                <h3 className="teacher-event-name">{ev.name}</h3>

                <div className="teacher-event-metrics">
                  <div className="teacher-event-metric">
                    <span className="teacher-event-metric__num">{ev.assignedQuestionCount}</span>
                    <span className="teacher-event-metric__lbl">Questions Assigned</span>
                  </div>
                  <div className="teacher-event-metric">
                    <span className="teacher-event-metric__num">{ev.studentCount}</span>
                    <span className="teacher-event-metric__lbl">Registered Students</span>
                  </div>
                </div>

                {/* Status Messages */}
                {statusMsg[ev.id] && (
                  <div className={`alert alert--${statusMsg[ev.id].type === 'error' ? 'error' : 'success'} mt-3`}>
                    <span>{statusMsg[ev.id].type === 'error' ? '⚠️' : '✓'}</span>
                    <span>{statusMsg[ev.id].text}</span>
                  </div>
                )}

                {ev.test_platform_url && (
                  <div className="teacher-test-url-box mt-3">
                    <span className="text-xs font-mono fw-bold">LIVE TEST URL:</span>{' '}
                    <a href={ev.test_platform_url} target="_blank" rel="noreferrer" className="text-xs text-primary font-mono fw-bold" style={{ textDecoration: 'underline' }}>
                      {ev.test_platform_url}
                    </a>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="teacher-event-card__actions">
                <button
                  type="button"
                  className="btn btn--secondary btn--sm btn--full"
                  onClick={() => openQuestionsModal(ev)}
                >
                  📝 Manage Questions ({ev.assignedQuestionCount})
                </button>

                <button
                  type="button"
                  className="btn btn--secondary btn--sm btn--full"
                  onClick={() => openStudentsModal(ev)}
                >
                  👥 View Students ({ev.studentCount})
                </button>

                <button
                  type="button"
                  className={`btn btn--primary btn--sm btn--full ${publishingId === ev.id ? 'btn--loading' : ''}`}
                  disabled={publishingId === ev.id || ev.assignedQuestionCount === 0}
                  onClick={() => handlePublishTest(ev)}
                  title={ev.assignedQuestionCount === 0 ? 'Assign questions first' : 'Publish test to external platform'}
                >
                  {publishingId === ev.id ? '' : '🚀 Publish Test'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── MODAL 1: ASSIGN QUESTIONS TO EVENT ─────────────────── */}
      {activeModalEvent && (
        <div className="q-modal-overlay" onClick={() => setActiveModalEvent(null)}>
          <div className="q-modal-dialog card" style={{ maxWidth: '780px' }} onClick={(e) => e.stopPropagation()}>
            <div className="card__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="badge badge--bronze mb-1">TEST PAPER CONFIGURATION</span>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                  Assign Questions to: {activeModalEvent.name}
                </h3>
              </div>
              <button
                type="button"
                className="student-modal-close"
                onClick={() => setActiveModalEvent(null)}
              >
                ✕
              </button>
            </div>

            <div className="card__body" style={{ overflowY: 'auto', maxHeight: '60vh' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
                Select questions from your Question Bank to include in this event's test paper.
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                <span className="text-xs font-mono fw-bold">
                  Selected: {selectedQuestionIds.length} question(s)
                </span>
                <Link to="/teacher/import" className="text-xs text-primary fw-bold" target="_blank">
                  + Import More Questions
                </Link>
              </div>

              {allQuestions.length === 0 ? (
                <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Question Bank is empty. Please add questions first.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {allQuestions.map((q) => {
                    const isSelected = selectedQuestionIds.includes(q.id);
                    return (
                      <div
                        key={q.id}
                        className={`teacher-q-select-row ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleQuestionSelection(q.id)}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          style={{ marginRight: '8px', cursor: 'pointer' }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '2px' }}>
                            <span className="badge badge--tag" style={{ fontSize: '0.65rem' }}>{q.subject}</span>
                            <span className="badge badge--bronze" style={{ fontSize: '0.65rem' }}>{q.difficulty}</span>
                            <span className="text-xs text-muted font-mono">{q.marks || 1} mark(s)</span>
                          </div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{q.question}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="card__footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setActiveModalEvent(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`btn btn--primary ${savingQuestions ? 'btn--loading' : ''}`}
                disabled={savingQuestions}
                onClick={handleSaveAssignedQuestions}
              >
                {savingQuestions ? '' : `Save ${selectedQuestionIds.length} Question(s)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: VIEW REGISTERED STUDENTS ──────────────────── */}
      {viewStudentsEvent && (
        <div className="q-modal-overlay" onClick={() => setViewStudentsEvent(null)}>
          <div className="q-modal-dialog card" style={{ maxWidth: '780px' }} onClick={(e) => e.stopPropagation()}>
            <div className="card__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="badge badge--bronze mb-1">ENROLLED CANDIDATES</span>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                  Students for: {viewStudentsEvent.name}
                </h3>
              </div>
              <button
                type="button"
                className="student-modal-close"
                onClick={() => setViewStudentsEvent(null)}
              >
                ✕
              </button>
            </div>

            <div className="card__body" style={{ overflowY: 'auto', maxHeight: '60vh' }}>
              {loadingStudents ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
                  <div className="skeleton skeleton-title" style={{ width: '40%', margin: '0 auto' }} />
                </div>
              ) : eventStudents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--text-muted)' }}>
                  No students have registered for this event yet.
                </div>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}>#</th>
                        <th>Student Name</th>
                        <th>PRN Number</th>
                        <th>Email ID</th>
                        <th>Team Name</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eventStudents.map((s, idx) => (
                        <tr key={idx}>
                          <td className="font-mono text-xs">{idx + 1}</td>
                          <td className="fw-bold text-xs">{s.full_name}</td>
                          <td className="font-mono text-xs">{s.student_id || s.prn || '—'}</td>
                          <td className="text-xs text-muted">{s.email}</td>
                          <td className="text-xs font-mono">{s.teamName || 'Solo'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="card__footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setViewStudentsEvent(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
