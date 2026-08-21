import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './PublicHeader.css';

export default function PublicHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

          {/* Editorial Logo — CODEDEBUG / TEC */}
          <Link
            to="/"
            className="pub-header__logo"
            title="CODEDEBUG Home"
            onClick={(e) => handleNavClick(e, 'top', '/')}
          >
            <span className="pub-header__logo-brand">CODEDEBUG</span>
          </Link>

          {/* Navigation Links */}
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
              Lookup
            </Link>

            <Link
              to="/leaderboard"
              className={`pub-header__link ${location.pathname.startsWith('/leaderboard') ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Standings
            </Link>

            <Link
              to="/admin/login"
              className="btn btn--secondary btn--sm pub-header__admin-btn"
              onClick={() => setMobileMenuOpen(false)}
            >
              Admin Portal
            </Link>
          </nav>

          {/* User Icon Link to Admin */}
          <Link to="/admin/login" className="pub-header__user-icon" title="Admin Portal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </Link>
        </div>
      </div>
    </header>
  );
}
