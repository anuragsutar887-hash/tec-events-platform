import { useState, useEffect } from 'react';
import { useStudent } from '../../context/StudentAuthContext';
import './StudentLoginModal.css';

const isValidEmail = (email) => {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

export default function StudentLoginModal({ isOpen, onClose, onSuccess }) {
  const { login } = useStudent();
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    prn: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Reset all fields when modal is closed so nothing remains stored
  useEffect(() => {
    if (!isOpen) {
      setForm({ full_name: '', email: '', prn: '' });
      setErrors({});
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    if (!form.full_name.trim()) errs.full_name = 'Full Name is required';
    if (!form.prn.trim()) errs.prn = 'PRN Number is required';
    if (!form.email.trim()) {
      errs.email = 'Email ID is required';
    } else if (!isValidEmail(form.email)) {
      errs.email = 'Enter a valid email address';
    }
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    const userData = {
      full_name: form.full_name.trim(),
      email: form.email.trim().toLowerCase(),
      prn: form.prn.trim().toUpperCase(),
      college: 'Indira College of Engineering & Management',
      logged_in_at: new Date().toISOString(),
    };

    login(userData);
    if (onSuccess) onSuccess(userData);
    onClose();
    setLoading(false);
  };

  return (
    <div className="student-modal-overlay" onClick={onClose}>
      <div className="student-modal-card card" onClick={(e) => e.stopPropagation()}>
        <div className="student-modal-header">
          <div>
            <h2 className="student-modal-title">Participant Login</h2>
          </div>
          <button className="student-modal-close" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        <div className="card__body" style={{ padding: 'var(--space-6)' }}>
          <form onSubmit={handleSubmit} className="student-login-form">
            <div className="form-group">
              <label className="form-label form-label--required">Full Name</label>
              <input
                type="text"
                className={`form-input ${errors.full_name ? 'form-input--error' : ''}`}
                value={form.full_name}
                onChange={(e) => {
                  setForm({ ...form, full_name: e.target.value });
                  if (errors.full_name) setErrors((prev) => ({ ...prev, full_name: '' }));
                }}
                autoComplete="off"
                autoFocus
                required
              />
              {errors.full_name && <span className="form-error">{errors.full_name}</span>}
            </div>

            <div className="form-group">
              <label className="form-label form-label--required">PRN Number</label>
              <input
                type="text"
                className={`form-input font-mono ${errors.prn ? 'form-input--error' : ''}`}
                value={form.prn}
                onChange={(e) => {
                  setForm({ ...form, prn: e.target.value });
                  if (errors.prn) setErrors((prev) => ({ ...prev, prn: '' }));
                }}
                autoComplete="off"
                required
              />
              {errors.prn && <span className="form-error">{errors.prn}</span>}
            </div>

            <div className="form-group">
              <label className="form-label form-label--required">Email ID</label>
              <input
                type="email"
                className={`form-input ${errors.email ? 'form-input--error' : ''}`}
                value={form.email}
                onChange={(e) => {
                  setForm({ ...form, email: e.target.value });
                  if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                }}
                autoComplete="off"
                required
              />
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>

            <div className="student-modal-actions">
              <button
                type="submit"
                className={`btn btn--primary btn--full ${loading ? 'btn--loading' : ''}`}
                disabled={loading}
              >
                {loading ? '' : 'Sign In'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
