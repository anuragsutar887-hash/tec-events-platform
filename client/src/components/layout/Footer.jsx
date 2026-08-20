import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__inner">
          <div className="footer__brand">
            <div className="footer__logo">
              <span className="footer__logo-icon">⚡</span>
              <span className="footer__logo-name">TEC Events</span>
            </div>
            <p className="footer__tagline">
              Official event portal of the Technical Committee.
              Empowering students through technical excellence.
            </p>
          </div>

          <div className="footer__links">
            <div className="footer__col">
              <h4 className="footer__col-title">Platform</h4>
              <Link to="/" className="footer__link">Home</Link>
              <Link to="/events" className="footer__link">Events</Link>
              <Link to="/lookup" className="footer__link">Lookup Registration</Link>
            </div>
            <div className="footer__col">
              <h4 className="footer__col-title">Admin</h4>
              <Link to="/admin/login" className="footer__link">Admin Login</Link>
              <Link to="/admin/" className="footer__link">Dashboard</Link>
            </div>
          </div>
        </div>

        <div className="footer__bottom">
          <p className="footer__copy">
            © {new Date().getFullYear()} Technical Committee. All rights reserved.
          </p>
          <p className="footer__powered">
            Built with TEC Events Platform v1.0
          </p>
        </div>
      </div>
    </footer>
  );
}
