import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { teacherService } from '../../services/teacherService';
import './TeacherLayout.css';

const teacherNavItems = [
  { path: '/teacher', label: 'Dashboard', icon: '📊', exact: true },
  { path: '/teacher/events', label: 'Events & Tests', icon: '📅' },
  { path: '/teacher/questions', label: 'Question Bank', icon: '📚' },
  { path: '/teacher/import', label: 'Import Questions', icon: '📥' },
  { path: '/teacher/students', label: 'Registered Students', icon: '👥' },
  { path: '/teacher/settings', label: 'Settings', icon: '⚙️' },
];

export default function TeacherLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    teacherService.getCurrentTeacher().then((t) => {
      if (t) setTeacher(t);
    });
  }, []);

  const handleLogout = async () => {
    await teacherService.logout();
    navigate('/teacher/login');
  };

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  return (
    <div className="teacher-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="teacher-layout__overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`teacher-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="teacher-sidebar__header">
          <Link to="/teacher" className="teacher-sidebar__logo-link" title="Teacher Portal">
            <img
              src="/logo.png"
              alt="TEC Portal"
              style={{ height: '40px', width: 'auto', objectFit: 'contain' }}
            />
          </Link>
        </div>

        <nav className="teacher-sidebar__nav">
          {teacherNavItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`teacher-sidebar__link ${isActive(item) ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="teacher-sidebar__link-icon">{item.icon}</span>
              <span className="teacher-sidebar__link-label">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="teacher-sidebar__footer">
          <div className="teacher-sidebar__user">
            <div className="teacher-sidebar__user-avatar">
              {teacher?.full_name?.[0]?.toUpperCase() || 'T'}
            </div>
            <div className="teacher-sidebar__user-info">
              <div className="teacher-sidebar__user-name" title={teacher?.full_name || 'Faculty Member'}>
                {teacher?.full_name || 'Faculty Member'}
              </div>
              <div className="teacher-sidebar__user-role">{teacher?.department || 'Department of IT'}</div>
            </div>
          </div>
          <button className="teacher-sidebar__logout" onClick={handleLogout} title="Sign Out">
            🚪
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="teacher-main">
        <header className="teacher-topbar">
          <button
            className="teacher-topbar__menu"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle menu"
          >
            ☰
          </button>
          <div className="teacher-topbar__title">
            {teacherNavItems.find(isActive)?.label || 'Teacher Portal'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <Link to="/teacher/import" className="btn btn--primary btn--sm">
              📥 Import Questions
            </Link>
            <Link to="/" className="btn btn--ghost btn--sm" target="_blank">
              ↗ Public Site
            </Link>
          </div>
        </header>

        <main className="teacher-content">
          {children}
        </main>
      </div>
    </div>
  );
}
