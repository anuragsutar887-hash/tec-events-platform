import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { teacherService } from '../../services/teacherService';
import './Login.css';

export default function TeacherLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/teacher';

  const [isRegister, setIsRegister] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('Information Technology');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        if (!fullName.trim()) throw new Error('Full Name is required.');
        if (!email.trim()) throw new Error('Faculty Email is required.');
        if (password.length < 6) throw new Error('Password must be at least 6 characters.');
        await teacherService.register({ fullName, email, password, department });
      } else {
        await teacherService.login(email, password);
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail('teacher@indiraicem.ac.in');
    setPassword('teacher123');
    setIsRegister(false);
    setError('');
  };

  return (
    <div className="teacher-login-page">
      <div className="teacher-login-card card">
        <div className="teacher-login-header">
          <span className="badge badge--bronze mb-2">FACULTY PORTAL</span>
          <h1 className="teacher-login-title">
            {isRegister ? 'Faculty Registration' : 'Teacher Sign In'}
          </h1>
          <p className="teacher-login-subtitle">
            {isRegister
              ? 'Create a faculty account to manage questions, imports, and live tests.'
              : 'Sign in with your institutional credentials to access the Question Bank.'}
          </p>
        </div>

        <div className="card__body" style={{ padding: 'var(--space-6)' }}>
          {error && (
            <div className="alert alert--error mb-4" role="alert">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="teacher-login-form">
            {isRegister && (
              <>
                <div className="form-group">
                  <label className="form-label form-label--required">Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Prof. Anjali Sharma"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label form-label--required">Department</label>
                  <select
                    className="form-input"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  >
                    <option value="Information Technology">Information Technology</option>
                    <option value="Computer Engineering">Computer Engineering</option>
                    <option value="AI & Data Science">AI & Data Science</option>
                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                    <option value="Civil Engineering">Civil Engineering</option>
                  </select>
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label form-label--required">Faculty Email</label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="faculty@indiraicem.ac.in"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label form-label--required">Password</label>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              className={`btn btn--primary btn--full ${loading ? 'btn--loading' : ''}`}
              disabled={loading}
              style={{ marginTop: 'var(--space-2)' }}
            >
              {loading ? '' : isRegister ? 'Create Faculty Account' : 'Sign In to Portal'}
            </button>
          </form>

          <div style={{ marginTop: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem' }}>
            <button
              type="button"
              onClick={() => { setIsRegister(!isRegister); setError(''); }}
              style={{ background: 'none', border: 'none', color: '#000000', fontWeight: 700, textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
            >
              {isRegister ? 'Already registered? Sign In' : 'New Faculty? Register here'}
            </button>

            <button
              type="button"
              onClick={fillDemoCredentials}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.78rem', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Fill Demo Login
            </button>
          </div>

          <div style={{ marginTop: 'var(--space-5)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
            <Link to="/" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              ← Return to Public Homepage
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
