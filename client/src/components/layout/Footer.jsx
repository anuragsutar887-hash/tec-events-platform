import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__editorial">
          {/* Main Title & College Name */}
          <div className="footer__logo-serif">TECH EVENTS</div>
          <div className="footer__sub-org">
            INDIRA COLLEGE OF ENGINEERING AND MANAGEMENT
          </div>
          <div className="footer__sub-dept">
            DEPARTMENT OF INFORMATION TECHNOLOGY • TECHNICAL COMMITTEE
          </div>

          {/* Clean Direct Contact Us Information Block */}
          <div className="footer__contact-section">
            <div className="footer__contact-heading">CONTACT US</div>
            <div className="footer__contact-grid">
              <div className="footer__contact-item">
                <span className="footer__contact-icon">📍</span>
                <div className="footer__contact-text">
                  <span className="footer__contact-label">Location</span>
                  <span>ICEM Campus, Parandwadi, Tal. Maval, Pune - 410506, Maharashtra</span>
                </div>
              </div>

              <div className="footer__contact-item">
                <span className="footer__contact-icon">✉️</span>
                <div className="footer__contact-text">
                  <span className="footer__contact-label">Email Support</span>
                  <a href="mailto:omchaudhari289@gmail.com">omchaudhari289@gmail.com</a>
                </div>
              </div>

              <div className="footer__contact-item">
                <span className="footer__contact-icon">📞</span>
                <div className="footer__contact-text">
                  <span className="footer__contact-label">Phone</span>
                  <a href="tel:+918975109341">89751 09341</a>
                </div>
              </div>
            </div>
          </div>

          {/* Legal Copyright */}
          <div className="footer__legal">
            <p className="footer__copy">
              © {new Date().getFullYear()} TECH EVENTS • INDIRA COLLEGE OF ENGINEERING AND MANAGEMENT. ALL RIGHTS RESERVED.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
