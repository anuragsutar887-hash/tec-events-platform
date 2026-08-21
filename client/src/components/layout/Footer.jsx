import { useState } from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
  const [showContactModal, setShowContactModal] = useState(false);

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__editorial">
          <div className="footer__logo-serif">TECH EVENTS</div>
          <div className="footer__sub-org">
            INDIRA COLLEGE OF ENGINEERING AND MANAGEMENT
          </div>
          <div className="footer__sub-dept">
            TECHNICAL COMMITTEE • INNOVATION & COMPETITION PORTAL
          </div>

          <div className="footer__links-row">
            <Link to="/#events-section" className="footer__link">EVENTS</Link>
            <Link to="/lookup" className="footer__link">LOOKUP TICKET</Link>
            <Link to="/leaderboard" className="footer__link">ARENA STANDINGS</Link>
            <button
              onClick={() => setShowContactModal(true)}
              className="footer__link footer__link--btn"
            >
              CONTACT US
            </button>
          </div>

          {/* Contact Details Bar */}
          <div className="footer__contact-info">
            <span>📍 ICEM Campus, Parandwadi, Pune 410506</span>
            <span className="footer__contact-sep">•</span>
            <span>✉️ <a href="mailto:events@indiraicem.ac.in">events@indiraicem.ac.in</a></span>
            <span className="footer__contact-sep">•</span>
            <span>📞 <a href="tel:+912114661500">+91 (02114) 661500 / 661600</a></span>
          </div>

          <div className="footer__legal">
            <p className="footer__copy">
              © {new Date().getFullYear()} TECH EVENTS • INDIRA COLLEGE OF ENGINEERING AND MANAGEMENT. ALL RIGHTS RESERVED.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Contact Us Modal */}
      {showContactModal && (
        <div className="modal-overlay" onClick={() => setShowContactModal(false)}>
          <div className="modal card footer__contact-modal" onClick={(e) => e.stopPropagation()}>
            <div className="card__header">
              <div>
                <span className="section__label" style={{ marginBottom: 0 }}>OFFICIAL SUPPORT</span>
                <h3 className="footer__modal-title">CONTACT COMMITTEE</h3>
              </div>
              <button className="modal__close" onClick={() => setShowContactModal(false)}>✕</button>
            </div>
            <div className="card__body">
              <p className="footer__modal-desc">
                For queries regarding event registration, technical specifications, venue guidelines, or arena assistance, contact the Technical Committee:
              </p>

              <div className="footer__contact-cards">
                <div className="footer__contact-card">
                  <span className="footer__card-icon">🏛️</span>
                  <div>
                    <strong>Institution</strong>
                    <p>Indira College of Engineering and Management (ICEM), Pune</p>
                  </div>
                </div>

                <div className="footer__contact-card">
                  <span className="footer__card-icon">✉️</span>
                  <div>
                    <strong>Email Support</strong>
                    <p><a href="mailto:events@indiraicem.ac.in" className="text-primary fw-semibold">events@indiraicem.ac.in</a></p>
                  </div>
                </div>

                <div className="footer__contact-card">
                  <span className="footer__card-icon">📞</span>
                  <div>
                    <strong>Helpline & Desk</strong>
                    <p>+91 (02114) 661500 / +91 98765 43210</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="card__footer" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn--secondary btn--sm" onClick={() => setShowContactModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}
