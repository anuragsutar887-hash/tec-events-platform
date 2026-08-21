import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/client';
import EventCard from '../../components/features/EventCard';
import RevealOnScroll from '../../components/common/RevealOnScroll';
import { SkeletonEventCard } from '../../components/common/SkeletonCard';
import { useScrambleText } from '../../hooks/useScrambleText';
import './Home.css';

export default function Home() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // ⚡ Hacker / Matrix Code Decrypt Animations for Committee Headline
  const word1 = useScrambleText('ENGINEERING IDEAS.', { delay: 100, speed: 25, duration: 600 });
  const word2 = useScrambleText('BUILDING THE FUTURE.', { delay: 650, speed: 25, duration: 600 });

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    try {
      const { data } = await apiClient.get('/events');
      setEvents(data.events || []);
    } catch {
      // safe fallback
    } finally {
      setLoading(false);
    }
  };

  const scrollToSection = (id) => {
    const elem = document.getElementById(id);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="home" id="top">
      {/* ─── 1. IT DEPARTMENT TECHNICAL COMMITTEE HERO ────────────── */}
      <section className="home__hero">
        <div className="container">
          <div className="home__hero-content">
            {/* Top Committee Badges */}
            <div className="home__hero-tag">
              <span className="home__hero-tag-sys">[TECHNICAL COMMITTEE] // DEPARTMENT OF IT</span>
              <span className="home__hero-tag-vol">INDIRA COLLEGE OF ENGINEERING & MANAGEMENT</span>
            </div>

            {/* Main Editorial Serif Heading */}
            <h1 className="home__hero-title">
              <span className="scramble-word">{word1.text || '░░░░░░░░░░░░░░░░░░'}</span>
              <br />
              <span className="scramble-word">{word2.text || '░░░░░░░░░░░░░░░░░░░░'}</span>
              <span className="hero-block-cursor">█</span>
            </h1>

            {/* Committee Focused Mission Subtitle */}
            <p className="home__hero-subtitle">
              The Technical Committee of the Department of IT brings together students who build, compete, collaborate, and create. From coding competitions and hackathons to technical workshops and project showcases, we create opportunities to turn ideas into real skills.
            </p>

            {/* Committee CTAs */}
            <div className="home__hero-cta">
              <button
                onClick={() => scrollToSection('events-section')}
                className="btn btn--primary btn--lg"
              >
                EXPLORE EVENTS ↓
              </button>
              <Link
                to="/lookup"
                className="btn btn--secondary btn--lg"
              >
                LOOKUP REGISTRATION
              </Link>
            </div>

            {/* IT Department Committee Specifications Matrix */}
            <div className="home__specs-grid">
              <div className="home__spec-card">
                <span className="home__spec-label">DEPARTMENT</span>
                <span className="home__spec-val">Information Technology</span>
                <span className="home__spec-sub">IT Technical Committee</span>
              </div>

              <div className="home__spec-card">
                <span className="home__spec-label">INSTITUTION</span>
                <span className="home__spec-val">ICEM Pune</span>
                <span className="home__spec-sub">Affiliated to SPPU</span>
              </div>

              <div className="home__spec-card">
                <span className="home__spec-label">COMMITTEE MISSION</span>
                <span className="home__spec-val">Technical Excellence</span>
                <span className="home__spec-sub">Workshops & Coding Battles</span>
              </div>

              <div className="home__spec-card">
                <span className="home__spec-label">ARENA SYSTEM</span>
                <span className="home__spec-val home__spec-val--status">
                  <span className="status-dot"></span>
                  LIVE & ACTIVE
                </span>
                <span className="home__spec-sub">Real-Time QR Telemetry</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. COMMITTEE MANDATE & INITIATIVES ───────────────────── */}
      <section className="section home__methodology">
        <div className="container">
          <RevealOnScroll delay={50}>
            <div className="home__methodology-header">
              <span className="section__label">CORE PILLARS // COMMITTEE MANDATE</span>
              <h2 className="section__title">WHAT WE DO</h2>
              <p className="home__methodology-lead">
                The Technical Committee of the Department of IT provides students with industry-grade competitive platforms, hands-on algorithmic problem solving, and collaborative engineering opportunities.
              </p>
            </div>
          </RevealOnScroll>

          <div className="home__methodology-grid">
            <RevealOnScroll delay={100} direction="up">
              <div className="home__methodology-card card">
                <div className="card__body">
                  <span className="home__methodology-num">01</span>
                  <h3 className="home__methodology-title">Competitive Symposia</h3>
                  <p className="home__methodology-desc">
                    Organizing intra and inter-college coding battles, speed debugging championships, algorithmic arenas, and web development challenges under real-time constraints.
                  </p>
                </div>
              </div>
            </RevealOnScroll>

            <RevealOnScroll delay={200} direction="up">
              <div className="home__methodology-card card">
                <div className="card__body">
                  <span className="home__methodology-num">02</span>
                  <h3 className="home__methodology-title">Collaborative Duo Engineering</h3>
                  <p className="home__methodology-desc">
                    Promoting pair programming and collaborative problem solving where 2-engineer squads collaborate on architecture, code refactoring, and logic resolution.
                  </p>
                </div>
              </div>
            </RevealOnScroll>

            <RevealOnScroll delay={300} direction="up">
              <div className="home__methodology-card card">
                <div className="card__body">
                  <span className="home__methodology-num">03</span>
                  <h3 className="home__methodology-title">Live Arena Telemetry</h3>
                  <p className="home__methodology-desc">
                    State-of-the-art digital infrastructure with instant QR desk verification, live arena leaderboard streaming, and transparent evaluation metrics.
                  </p>
                </div>
              </div>
            </RevealOnScroll>
          </div>
        </div>
      </section>

      {/* ─── 3. DEPARTMENT EVENTS SECTION ────────────────────────── */}
      <section className="section" id="events-section" style={{ background: '#fbfbfb', borderTop: '1px solid var(--border)' }}>
        <div className="container">
          <RevealOnScroll delay={50}>
            <div className="section__header" style={{ textAlign: 'center' }}>
              <span className="section__label">ACTIVE COMPETITIONS // IT DEPARTMENT SCHEDULE</span>
              <h2 className="section__title">UPCOMING TECHNICAL EVENTS</h2>
              <p className="section__subtitle" style={{ margin: '0 auto' }}>
                Select an event below to view its brief, rules, and initialize your team registration.
              </p>
            </div>
          </RevealOnScroll>

          {loading ? (
            <div className="home__events-grid">
              {[1, 2, 3].map((n) => (
                <SkeletonEventCard key={n} />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="empty-state card">
              <div className="card__body">
                <div className="empty-state__icon">📅</div>
                <div className="empty-state__title">No events published yet</div>
                <p className="empty-state__text">The IT Technical Committee will publish upcoming department events shortly.</p>
              </div>
            </div>
          ) : (
            <div className="home__events-grid">
              {events.map((ev, index) => (
                <RevealOnScroll key={ev.id} delay={index * 120} direction="up">
                  <EventCard event={ev} />
                </RevealOnScroll>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
