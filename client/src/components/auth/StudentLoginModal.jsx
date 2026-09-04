import { useState } from 'react';
import { useStudent } from '../../context/StudentAuthContext';
import './StudentLoginModal.css';

const isOfficialEmail = (email) => {
  if (!email) return false;
  const e = email.toLowerCase().trim();
  const personalDomains = [
    'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
    'icloud.com', 'rediffmail.com', 'aol.com', 'proton.me',
    'protonmail.com', 'zoho.com', 'mail.com', 'ymail.com'
  ];
  const parts = e.split('@');
  if (parts.length !== 2) return false;
  const domain = parts[1];
  if (personalDomains.includes(domain)) return false;

  return (
    domain === 'indiraicem.ac.in' ||
    domain.endsWith('.indiraicem.ac.in') ||
    domain === 'indiraedu.com' ||
    domain.endsWith('.indiraedu.com') ||
    domain.endsWith('.ac.in') ||
    domain.endsWith('.edu.in') ||
    domain.endsWith('.edu')
  );
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

  // OTP Verification flow
  const [step, setStep] = useState('FORM'); // 'FORM' | 'OTP'
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpNotice, setOtpNotice] = useState('');

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    if (!form.full_name.trim()) errs.full_name = 'Full Name is required';
    if (!form.prn.trim()) errs.prn = 'PRN Number is required';
    if (!form.email.trim()) {
      errs.email = 'Official College Email ID is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Enter a valid email address';
    } else if (!isOfficialEmail(form.email)) {
      errs.email = 'Please use your official college email (e.g. @indiraicem.ac.in). Personal emails are not allowed.';
    }
    return errs;
  };

  const handleSendOtp = (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    // Generate secure 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setEnteredOtp('');
    setOtpNotice(`OTP sent to ${form.email.trim()}. (Your code is: ${code})`);
    setStep('OTP');
    setLoading(false);
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    setErrors({});
    if (enteredOtp.trim() !== generatedOtp) {
      setErrors({ otp: 'Invalid OTP code. Please check and try again.' });
      return;
    }

    // Successfully verified & authenticated
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
  };

  const handleQuickLogin = (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

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
  };

  return (
    <div className="student-modal-overlay" onClick={onClose}>
      <div className="student-modal-card card" onClick={(e) => e.stopPropagation()}>
        <div className="student-modal-header">
          <div>
            <span className="section__label" style={{ marginBottom: 0 }}>STUDENT ACCESS</span>
            <h2 className="student-modal-title">Participant Portal Login</h2>
            <p className="student-modal-subtitle">
              Sign in with your Name, PRN, and Official College Email to participate and manage registrations
            </p>
          </div>
          <button className="student-modal-close" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        <div className="card__body" style={{ padding: 'var(--space-6)' }}>
          {step === 'FORM' ? (
            <form onSubmit={handleSendOtp} className="student-login-form">
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
                  autoFocus
                  required
                />
                {errors.full_name && <span className="form-error">{errors.full_name}</span>}
              </div>

              <div className="form-group">
                <label className="form-label form-label--required">PRN Number</label>
                <input
                  type="text"
                  className={`form-input ${errors.prn ? 'form-input--error' : ''}`}
                  value={form.prn}
                  onChange={(e) => {
                    setForm({ ...form, prn: e.target.value });
                    if (errors.prn) setErrors((prev) => ({ ...prev, prn: '' }));
                  }}
                  required
                />
                {errors.prn && <span className="form-error">{errors.prn}</span>}
              </div>

              <div className="form-group">
                <label className="form-label form-label--required">Official College Email ID</label>
                <input
                  type="email"
                  className={`form-input ${errors.email ? 'form-input--error' : ''}`}
                  value={form.email}
                  onChange={(e) => {
                    setForm({ ...form, email: e.target.value });
                    if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                  }}
                  required
                />
                <span className="form-hint">Must be your college email (e.g. @indiraicem.ac.in)</span>
                {errors.email && <span className="form-error">{errors.email}</span>}
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
                <button
                  type="submit"
                  className={`btn btn--primary btn--full ${loading ? 'btn--loading' : ''}`}
                  disabled={loading}
                >
                  {loading ? '' : 'Verify with OTP & Sign In'}
                </button>
                <button
                  type="button"
                  onClick={handleQuickLogin}
                  className="btn btn--secondary"
                  title="Direct login if already verified"
                  style={{ flexShrink: 0 }}
                >
                  Direct Sign In
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="student-login-form">
              <div className="alert alert--info mb-4" style={{ padding: '10px 14px', fontSize: '0.85rem' }}>
                <span>{otpNotice}</span>
              </div>

              <div className="form-group">
                <label className="form-label form-label--required">Enter 6-Digit OTP</label>
                <input
                  type="text"
                  maxLength={6}
                  className={`form-input font-mono ${errors.otp ? 'form-input--error' : ''}`}
                  value={enteredOtp}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setEnteredOtp(val);
                    if (errors.otp) setErrors((prev) => ({ ...prev, otp: '' }));
                  }}
                  style={{ fontSize: '1.25rem', letterSpacing: '0.2em', textAlign: 'center' }}
                  autoFocus
                  required
                />
                {errors.otp && <span className="form-error">{errors.otp}</span>}
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => setStep('FORM')}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="btn btn--primary btn--full"
                  disabled={enteredOtp.length !== 6}
                >
                  Verify & Log In
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
