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

          {/* Logo — TECH EVENTS */}
          <Link
            to="/"
            className="pub-header__logo"
            title="Tech Events Home"
            onClick={(e) => handleNavClick(e, 'top', '/')}
          >
            <span className="pub-header__logo-brand">TECH EVENTS</span>
          </Link>

          {/* Right Group: Navigation links aligned right with Admin Login logo */}
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
                Lookup
              </Link>

              <Link
                to="/leaderboard"
                className={`pub-header__link ${location.pathname.startsWith('/leaderboard') ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Standings
              </Link>
            </nav>

            {/* Admin User Icon aligned on the right with the navigation */}
            <Link to="/admin/login" className="pub-header__user-icon" title="Admin Portal Login">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
