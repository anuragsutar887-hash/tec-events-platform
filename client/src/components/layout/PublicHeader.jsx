import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useStudent } from '../../context/StudentAuthContext';
import StudentLoginModal from '../auth/StudentLoginModal';
import PendingInvitesModal from '../auth/PendingInvitesModal';
import './PublicHeader.css';

export default function PublicHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [invitesModalOpen, setInvitesModalOpen] = useState(false);

  const { user, isAuthenticated, logout, pendingInvites, refreshInvites } = useStudent();

  // Auto-open pending invites modal when user logs in if they have pending invites
  useEffect(() => {
    if (isAuthenticated && pendingInvites && pendingInvites.length > 0) {
      // Auto open invites modal so user can approve right away
      setInvitesModalOpen(true);
    }
  }, [isAuthenticated, pendingInvites?.length]);

  const handleNavClick = (e, targetSectionId, fallbackRoute) => {
    setMobileMenuOpen(false);
    if (location.pathname === '/') {
      e.preventDefault();
      if (targetSectionId === 'top') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const elem = document.getElementById(targetSectionId);
        if (elem) {
          elem.scrollIntoView({ behavior: 'smooth' });
        }
      }
    } else {
      if (fallbackRoute) {
        navigate(fallbackRoute);
      }
    }
  };

  return (
    <>
      {/* 🔔 Notification Banner if teammate has pending invite */}
      {isAuthenticated && pendingInvites && pendingInvites.length > 0 && (
        <div className="pub-header__invite-banner">
          <div className="container pub-header__invite-banner-inner">
            <span>
              🔔 <strong>Action Required:</strong> You have {pendingInvites.length} pending team registration invitation{pendingInvites.length > 1 ? 's' : ''}!
            </span>
            <button
              type="button"
              className="pub-header__invite-btn"
              onClick={() => setInvitesModalOpen(true)}
            >
              Review & Approve →
            </button>
          </div>
        </div>
      )}

      <header className="pub-header">
        <div className="container">
          <div className="pub-header__inner">
            {/* Mobile menu trigger */}
            <button
              className="pub-header__mobile-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              ☰
            </button>

            {/* Logo — TECH EVENTS */}
            <Link
              to="/"
              className="pub-header__logo"
              title="Tech Events Home"
              onClick={(e) => handleNavClick(e, 'top', '/')}
            >
              <img src="/logo.png" alt="Tech Events" className="pub-header__logo-img" />
              <span className="pub-header__logo-brand">TECH EVENTS</span>
            </Link>

            {/* Right Group: Navigation links aligned right with dedicated Login button */}
            <div className="pub-header__right">
              <nav className={`pub-header__nav ${mobileMenuOpen ? 'open' : ''}`}>
                <a
                  href="/#top"
                  className={`pub-header__link ${location.pathname === '/' && !location.hash ? 'active' : ''}`}
                  onClick={(e) => handleNavClick(e, 'top', '/')}
                >
                  Home
                </a>

                <a
                  href="/#events-section"
                  className={`pub-header__link ${location.pathname.startsWith('/events') ? 'active' : ''}`}
                  onClick={(e) => handleNavClick(e, 'events-section', '/events')}
                >
                  Events
                </a>

                <Link
                  to="/lookup"
                  className={`pub-header__link ${location.pathname === '/lookup' ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  My Ticket
                </Link>

                <Link
                  to="/leaderboard"
                  className={`pub-header__link ${location.pathname.startsWith('/leaderboard') ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Standings
                </Link>
              </nav>

              {/* 👤 Participant Authentication Control at top right */}
              {isAuthenticated ? (
                <div className="pub-header__user-pill">
                  {/* Invites Indicator Button */}
                  {pendingInvites && pendingInvites.length > 0 && (
                    <button
                      type="button"
                      className="pub-header__bell-btn"
                      onClick={() => setInvitesModalOpen(true)}
                      title={`${pendingInvites.length} Pending Team Invitations`}
                    >
                      🔔 <span className="pub-header__bell-badge">{pendingInvites.length}</span>
                    </button>
                  )}

                  {/* User Profile */}
                  <div className="pub-header__profile-badge" title={`${user.full_name} • ${user.email}`}>
                    <span className="pub-header__profile-avatar">
                      {user.full_name?.[0]?.toUpperCase() || 'P'}
                    </span>
                    <div className="pub-header__profile-text">
                      <span className="pub-header__profile-name">{user.full_name}</span>
                      <span className="pub-header__profile-prn font-mono">{user.prn}</span>
                    </div>
                  </div>

                  {/* Logout */}
                  <button
                    type="button"
                    className="pub-header__logout-btn"
                    onClick={logout}
                    title="Sign out of student portal"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                /* Dedicated Login Button at top-right corner */
                <button
                  type="button"
                  id="header-login-btn"
                  className="pub-header__login-btn"
                  onClick={() => setLoginModalOpen(true)}
                  title="Participant Portal Sign In"
                >
                  Login
                </button>
              )}

              {/* Admin Portal User Icon */}
              <Link to="/admin/login" className="pub-header__user-icon" title="Admin Portal Login">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Student Login Modal */}
      <StudentLoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onSuccess={() => {
          setLoginModalOpen(false);
          refreshInvites();
        }}
      />

      {/* Teammate Pending Approvals Modal */}
      <PendingInvitesModal
        isOpen={invitesModalOpen}
        onClose={() => setInvitesModalOpen(false)}
        invites={pendingInvites}
        onApproved={() => refreshInvites()}
        onDeclined={() => refreshInvites()}
      />
    </>
  );
}
