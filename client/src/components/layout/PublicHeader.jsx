import { Link, useLocation, useNavigate } from 'react-router-dom';
import './PublicHeader.css';

export default function PublicHeader() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavClick = (e, targetSectionId, fallbackRoute) => {
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
          {/* Logo only */}
          <Link
            to="/"
            className="pub-header__logo"
            title="Home"
            onClick={(e) => handleNavClick(e, 'top', '/')}
          >
            <div className="pub-header__logo-icon">⚡</div>
          </Link>

          <nav className="pub-header__nav">
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
            >
              Lookup
            </Link>

            <Link
              to="/leaderboard"
              className={`pub-header__link ${location.pathname.startsWith('/leaderboard') ? 'active' : ''}`}
            >
              Leaderboard
            </Link>

            <Link to="/admin/login" className="btn btn--secondary btn--sm">
              Admin
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
