import { useState, useEffect } from 'react';
import { teacherService } from '../../services/teacherService';
import { questionParserService } from '../../services/questionParserService';
import './QuestionBank.css';

export default function QuestionBank() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [formData, setFormData] = useState({
    question: '',
    option1: '',
    option2: '',
    option3: '',
    option4: '',
    correct_option: 1,
    marks: 1,
    subject: 'Computer Science',
    topic: 'General',
    difficulty: 'MEDIUM',
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Assign to Event State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [eventsList, setEventsList] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [assigningQuestionId, setAssigningQuestionId] = useState(null);
  const [assignSuccess, setAssignSuccess] = useState('');

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const data = await teacherService.getQuestions({
        search,
        subject: selectedSubject,
        difficulty: selectedDifficulty,
        showArchived,
      });
      setQuestions(data || []);
    } catch (err) {
      console.error('Failed to load questions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, [search, selectedSubject, selectedDifficulty, showArchived]);

  const openCreateModal = () => {
    setEditingQuestion(null);
    setFormData({
      question: '',
      option1: '',
      option2: '',
      option3: '',
      option4: '',
      correct_option: 1,
      marks: 1,
      subject: 'Computer Science',
      topic: 'General',
      difficulty: 'MEDIUM',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (q) => {
    setEditingQuestion(q);
    setFormData({
      question: q.question,
      option1: q.option1,
      option2: q.option2,
      option3: q.option3,
      option4: q.option4,
      correct_option: q.correct_option || 1,
      marks: q.marks || 1,
      subject: q.subject || 'Computer Science',
      topic: q.topic || 'General',
      difficulty: q.difficulty || 'MEDIUM',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const validation = questionParserService.validateQuestion(formData);
    if (!validation.isValid) {
      setFormError(validation.errors.join(' '));
      return;
    }

    setSaving(true);
    try {
      if (editingQuestion) {
        await teacherService.updateQuestion(editingQuestion.id, formData);
      } else {
        await teacherService.createQuestion(formData);
      }
      setIsModalOpen(false);
      loadQuestions();
    } catch (err) {
      setFormError(err.message || 'Failed to save question');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (id) => {
    if (!window.confirm('Archive this question? It will be moved to the archive and can be restored anytime.')) return;
    try {
      await teacherService.archiveQuestion(id);
      loadQuestions();
    } catch (e) {
      alert('Failed to archive: ' + e.message);
    }
  };

  const handleRestore = async (id) => {
    try {
      await teacherService.restoreQuestion(id);
      loadQuestions();
    } catch (e) {
      alert('Failed to restore: ' + e.message);
    }
  };

  const handlePermanentDelete = async (id) => {
    if (!window.confirm('PERMANENT ACTION: Permanently remove this question from the database? This cannot be undone.')) return;
    try {
      await teacherService.permanentlyDeleteQuestion(id);
      loadQuestions();
    } catch (e) {
      alert('Failed to delete: ' + e.message);
    }
  };

  const handleExport = () => {
    questionParserService.exportToExcel(
      questions,
      showArchived ? 'Archived_Questions.xlsx' : 'Active_Question_Bank.xlsx'
    );
  };

  // Open Assign Modal
  const openAssignModal = async (qId) => {
    setAssigningQuestionId(qId);
    setAssignSuccess('');
    try {
      const stats = await teacherService.getDashboardStats();
      const { data: evs } = await import('../../api/client').then(m => m.default.get('/events'));
      setEventsList(evs?.events || []);
      if (evs?.events?.length > 0) {
        setSelectedEventId(String(evs.events[0].id));
      }
      setAssignModalOpen(true);
    } catch {
      alert('Could not fetch events.');
    }
  };

  const handleConfirmAssign = async () => {
    if (!selectedEventId || !assigningQuestionId) return;
    try {
      const existing = await teacherService.getEventQuestions(selectedEventId);
      const existingIds = existing.map(e => e.id);
      if (!existingIds.includes(assigningQuestionId)) {
        await teacherService.assignQuestionsToEvent(selectedEventId, [...existingIds, assigningQuestionId]);
      }
      setAssignSuccess('✓ Question assigned to event test successfully!');
      setTimeout(() => {
        setAssignModalOpen(false);
        setAssignSuccess('');
      }, 1500);
    } catch (err) {
      alert('Failed to assign: ' + err.message);
    }
  };

  return (
    <div className="question-bank">
      <div className="question-bank__header">
        <div>
          <span className="section__label">REPOSITORY</span>
          <h1 className="question-bank__title">Question Bank</h1>
          <p className="question-bank__subtitle">
            Create, categorize, safe-delete, and export standardized multiple-choice questions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn--secondary btn--sm" onClick={handleExport}>
            📥 Export to Excel
          </button>
          <button type="button" className="btn btn--primary btn--sm" onClick={openCreateModal}>
            + Add Question
          </button>
        </div>
      </div>

      {/* ─── Controls & Filters ──────────────────────────────────── */}
      <div className="card question-bank__filters">
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flex: 1, minWidth: '260px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search by keyword, subject, or topic..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              className="form-input"
              style={{ width: 'auto' }}
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
            >
              <option value="">All Subjects</option>
              <option value="Data Structures">Data Structures</option>
              <option value="Algorithms">Algorithms</option>
              <option value="Web Technologies">Web Technologies</option>
              <option value="DBMS">DBMS</option>
              <option value="Computer Networks">Computer Networks</option>
              <option value="Operating Systems">Operating Systems</option>
            </select>

            <select
              className="form-input"
              style={{ width: 'auto' }}
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
            >
              <option value="">All Difficulties</option>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>

            <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
              <button
                type="button"
                className={`q-tab-btn ${!showArchived ? 'active' : ''}`}
                onClick={() => setShowArchived(false)}
              >
                Active
              </button>
              <button
                type="button"
                className={`q-tab-btn ${showArchived ? 'active' : ''}`}
                onClick={() => setShowArchived(true)}
              >
                Archived
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Questions List Table ────────────────────────────────── */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
            <div className="skeleton skeleton-title" style={{ width: '40%', margin: '0 auto' }} />
          </div>
        ) : questions.length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--space-10) var(--space-4)' }}>
            <div className="empty-state__icon">{showArchived ? '📦' : '📝'}</div>
            <div className="empty-state__title">
              {showArchived ? 'No archived questions' : 'No questions found'}
            </div>
            <p className="empty-state__text">
              {showArchived
                ? 'Archived questions will appear here when safe-deleted.'
                : 'Create your first question manually or import questions in bulk from Excel, AI text, or PDFs.'}
            </p>
            {!showArchived && (
              <button type="button" className="btn btn--primary mt-4" onClick={openCreateModal}>
                + Add Question
              </button>
            )}
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>#</th>
                  <th>Question & Options</th>
                  <th style={{ width: '130px' }}>Subject / Topic</th>
                  <th style={{ width: '90px' }}>Difficulty</th>
                  <th style={{ width: '70px' }}>Marks</th>
                  <th style={{ width: '140px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q, idx) => (
                  <tr key={q.id || idx}>
                    <td className="font-mono text-muted text-xs">{idx + 1}</td>
                    <td>
                      <div className="q-table-statement">{q.question}</div>
                      <div className="q-table-options">
                        <span className={`q-table-opt ${q.correct_option === 1 ? 'correct' : ''}`}>
                          1: {q.option1}
                        </span>
                        <span className={`q-table-opt ${q.correct_option === 2 ? 'correct' : ''}`}>
                          2: {q.option2}
                        </span>
                        <span className={`q-table-opt ${q.correct_option === 3 ? 'correct' : ''}`}>
                          3: {q.option3}
                        </span>
                        <span className={`q-table-opt ${q.correct_option === 4 ? 'correct' : ''}`}>
                          4: {q.option4}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{q.subject || 'CS'}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{q.topic || 'General'}</div>
                    </td>
                    <td>
                      <span className={`badge ${q.difficulty === 'HARD' ? 'badge--danger' : q.difficulty === 'EASY' ? 'badge--success' : 'badge--bronze'}`} style={{ fontSize: '0.65rem' }}>
                        {q.difficulty}
                      </span>
                    </td>
                    <td className="font-mono text-xs fw-bold">{q.marks || 1}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                        {!showArchived ? (
                          <>
                            <button
                              type="button"
                              className="btn btn--secondary btn--xs"
                              title="Assign to Event Test"
                              onClick={() => openAssignModal(q.id)}
                            >
                              ➕ Event
                            </button>
                            <button
                              type="button"
                              className="btn btn--secondary btn--xs"
                              title="Edit Question"
                              onClick={() => openEditModal(q)}
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              className="btn btn--secondary btn--xs"
                              title="Safe Archive"
                              onClick={() => handleArchive(q.id)}
                            >
                              📦
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="btn btn--primary btn--xs"
                              title="Restore to Active Bank"
                              onClick={() => handleRestore(q.id)}
                            >
                              ↺ Restore
                            </button>
                            <button
                              type="button"
                              className="btn btn--danger btn--xs"
                              title="Permanently Delete"
                              onClick={() => handlePermanentDelete(q.id)}
                            >
                              🗑️
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Add / Edit Modal ────────────────────────────────────── */}
      {isModalOpen && (
        <div className="q-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="q-modal-dialog card" onClick={(e) => e.stopPropagation()}>
            <div className="card__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="badge badge--bronze mb-1">STANDARD MCQ</span>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                  {editingQuestion ? 'Edit Question' : 'Create Question'}
                </h3>
              </div>
              <button
                type="button"
                className="student-modal-close"
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div className="card__body" style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {formError && (
                  <div className="alert alert--error">
                    <span>⚠️</span>
                    <span>{formError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label form-label--required">Question Statement</label>
                  <textarea
                    rows={3}
                    className="form-input"
                    value={formData.question}
                    onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                    placeholder="Enter the question text clearly..."
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div className="form-group">
                    <label className={`form-label form-label--required ${formData.correct_option === 1 ? 'text-success fw-bold' : ''}`}>
                      Option 1 {formData.correct_option === 1 && '✓ (Correct)'}
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.option1}
                      onChange={(e) => setFormData({ ...formData, option1: e.target.value })}
                      placeholder="First option"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className={`form-label form-label--required ${formData.correct_option === 2 ? 'text-success fw-bold' : ''}`}>
                      Option 2 {formData.correct_option === 2 && '✓ (Correct)'}
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.option2}
                      onChange={(e) => setFormData({ ...formData, option2: e.target.value })}
                      placeholder="Second option"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className={`form-label form-label--required ${formData.correct_option === 3 ? 'text-success fw-bold' : ''}`}>
                      Option 3 {formData.correct_option === 3 && '✓ (Correct)'}
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.option3}
                      onChange={(e) => setFormData({ ...formData, option3: e.target.value })}
                      placeholder="Third option"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className={`form-label form-label--required ${formData.correct_option === 4 ? 'text-success fw-bold' : ''}`}>
                      Option 4 {formData.correct_option === 4 && '✓ (Correct)'}
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.option4}
                      onChange={(e) => setFormData({ ...formData, option4: e.target.value })}
                      placeholder="Fourth option"
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div className="form-group">
                    <label className="form-label form-label--required">Correct Answer</label>
                    <select
                      className="form-input font-mono fw-bold"
                      value={formData.correct_option}
                      onChange={(e) => setFormData({ ...formData, correct_option: parseInt(e.target.value, 10) })}
                    >
                      <option value={1}>Option 1 is Correct</option>
                      <option value={2}>Option 2 is Correct</option>
                      <option value={3}>Option 3 is Correct</option>
                      <option value={4}>Option 4 is Correct</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label form-label--required">Marks</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      className="form-input"
                      value={formData.marks}
                      onChange={(e) => setFormData({ ...formData, marks: parseInt(e.target.value, 10) || 1 })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)' }}>
                  <div className="form-group">
                    <label className="form-label">Subject</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="e.g. Data Structures"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Topic</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.topic}
                      onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                      placeholder="e.g. Sorting"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Difficulty</label>
                    <select
                      className="form-input"
                      value={formData.difficulty}
                      onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                    >
                      <option value="EASY">Easy</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HARD">Hard</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="card__footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`btn btn--primary ${saving ? 'btn--loading' : ''}`}
                  disabled={saving}
                >
                  {saving ? '' : editingQuestion ? 'Update Question' : 'Save Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Assign to Event Modal ───────────────────────────────── */}
      {assignModalOpen && (
        <div className="q-modal-overlay" onClick={() => setAssignModalOpen(false)}>
          <div className="q-modal-dialog card" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="card__header">
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
                Assign Question to Event
              </h3>
            </div>
            <div className="card__body">
              {assignSuccess && (
                <div className="alert alert--success mb-3">
                  {assignSuccess}
                </div>
              )}
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
                Select an upcoming department event to include this question in its test paper.
              </p>
              <div className="form-group">
                <label className="form-label form-label--required">Target Event</label>
                <select
                  className="form-input"
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                >
                  {eventsList.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name} ({ev.status})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="card__footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => setAssignModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={handleConfirmAssign}
              >
                Confirm Assignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
