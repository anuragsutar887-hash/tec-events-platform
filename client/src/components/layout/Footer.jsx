import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__editorial">
          <div className="footer__logo-serif">CODEDEBUG</div>
          <div className="footer__sub-org">INDIRA COLLEGE OF ENGINEERING AND MANAGEMENT • TECHNICAL EVENTS</div>

          <div className="footer__links-row">
            <Link to="/#events-section" className="footer__link">EVENTS</Link>
            <Link to="/lookup" className="footer__link">LOOKUP</Link>
            <Link to="/leaderboard" className="footer__link">STANDINGS</Link>
            <Link to="/admin/login" className="footer__link">ADMIN ACCESS</Link>
          </div>

          <div className="footer__legal">
            <p className="footer__copy">
              © {new Date().getFullYear()} CODEDEBUG / TECHNICAL COMMITTEE. ALL RIGHTS RESERVED.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
