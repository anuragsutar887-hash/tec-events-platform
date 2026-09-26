import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { accountService } from '../../services/accountService';
import './AdminLayout.css';

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: '📊', exact: true },
  { path: '/admin/events', label: 'Events', icon: '📅' },
  { path: '/admin/registrations', label: 'Registrations', icon: '📋' },
  { path: '/admin/accounts', label: 'Accounts & Approvals', icon: '👥', badgeKey: 'pending' },
  { path: '/admin/checkin', label: 'Check-in Console', icon: '✅' },
  { path: '/admin/onsite', label: 'On-site Reg', icon: '➕' },
  { path: '/admin/arena', label: 'Standings', icon: '🏆' },
  { path: '/admin/settings', label: 'Settings', icon: '⚙️' },
];

export default function AdminLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { admin, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState(0);

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const count = await accountService.getPendingCount();
        setPendingApprovals(count);
      } catch {}
    };

    fetchPending();
    const interval = setInterval(fetchPending, 8000);

    let bc;
    try {
      bc = new BroadcastChannel('tec_account_approvals_sync');
      bc.onmessage = () => fetchPending();
    } catch {}

    return () => {
      clearInterval(interval);
      if (bc) bc.close();
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  return (
    <div className="admin-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="admin-layout__overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="admin-sidebar__header">
          {/* Logo only - Navigates directly to /admin dashboard */}
          <Link to="/admin" className="admin-sidebar__logo-link" title="Admin Dashboard">
            <img src="/logo.png" alt="Tech Events" className="admin-sidebar__logo-img" />
          </Link>
        </div>

        <nav className="admin-sidebar__nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`admin-sidebar__link ${isActive(item) ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="admin-sidebar__link-icon">{item.icon}</span>
              <span className="admin-sidebar__link-label">{item.label}</span>
              {item.badgeKey === 'pending' && pendingApprovals > 0 && (
                <span
                  style={{
                    marginLeft: 'auto',
                    background: '#d97706',
                    color: '#ffffff',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: '999px',
                    lineHeight: 1,
                  }}
                  title={`${pendingApprovals} pending account approvals`}
                >
                  {pendingApprovals}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="admin-sidebar__footer">
          <div className="admin-sidebar__user">
            <div className="admin-sidebar__user-avatar">
              {admin?.email?.[0]?.toUpperCase() || admin?.username?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="admin-sidebar__user-info">
              <div className="admin-sidebar__user-name" title={admin?.email || 'Committee Admin'}>
                {admin?.email?.split('@')[0] || 'Admin'}
              </div>
              <div className="admin-sidebar__user-role">COMMITTEE ADMIN</div>
            </div>
          </div>
          <button className="admin-sidebar__logout" onClick={handleLogout} title="Sign Out">
            🚪
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="admin-main">
        <header className="admin-topbar">
          <button
            className="admin-topbar__menu"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle menu"
          >
            ☰
          </button>
          
          <div className="admin-topbar__title">
            {navItems.find(isActive)?.label || 'Dashboard'}
          </div>

          <div className="admin-topbar__actions">
            <Link to="/" className="btn btn--ghost btn--sm" target="_blank">
              Public Site
            </Link>
          </div>
        </header>

        <main className="admin-content">
          {children}
        </main>
      </div>
    </div>
  );
}
