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

  // ⚡ Hacker / Matrix Code Decrypt Animations (Only runs once on first visit per session)
  const word1 = useScrambleText('ENGINEERING IDEAS.', { delay: 100, speed: 25, duration: 600, oncePerSession: true });
  const word2 = useScrambleText('BUILDING THE FUTURE.', { delay: 650, speed: 25, duration: 600, oncePerSession: true });

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
            {/* Main Editorial Serif Heading */}
            <h1 className="home__hero-title" style={{ marginTop: 'var(--space-2)' }}>
              <span className="scramble-word">{word1.text || 'ENGINEERING IDEAS.'}</span>
              <br />
              <span className="scramble-word">{word2.text || 'BUILDING THE FUTURE.'}</span>
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
                MY REGISTRATION →
              </Link>
            </div>

            {/* 4 Feature Cards (Events, Learning, Community, Opportunity) */}
            <div className="home__specs-grid">
              <div className="home__spec-card">
                <span className="home__spec-label">01 — EVENTS</span>
                <span className="home__spec-val">Technical Events</span>
                <span className="home__spec-sub">Coding competitions, hackathons, debugging challenges, project showcases & more.</span>
              </div>

              <div className="home__spec-card">
                <span className="home__spec-label">02 — LEARNING</span>
                <span className="home__spec-val">Workshops & Talks</span>
                <span className="home__spec-sub">Hands-on workshops, technical sessions, seminars, and peer-to-peer learning.</span>
              </div>

              <div className="home__spec-card">
                <span className="home__spec-label">03 — COMMUNITY</span>
                <span className="home__spec-val">Student Community</span>
                <span className="home__spec-sub">A space for students to collaborate, share ideas, build projects, and learn together.</span>
              </div>

              <div className="home__spec-card">
                <span className="home__spec-label">04 — OPPORTUNITY</span>
                <span className="home__spec-val">Build & Compete</span>
                <span className="home__spec-sub">Turn your skills into experience through real-world challenges and competitions.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. CORE PILLARS // OUR MISSION ───────────────────────── */}
      <section className="section home__methodology">
        <div className="container">
          <RevealOnScroll delay={50}>
            <div className="home__methodology-header">
              <span className="section__label">CORE PILLARS</span>
              <h2 className="section__title">OUR MISSION</h2>
            </div>
          </RevealOnScroll>

          <div className="home__methodology-grid">
            <RevealOnScroll delay={100} direction="up">
              <div className="home__methodology-card card">
                <div className="card__body">
                  <span className="home__methodology-num">01</span>
                  <h3 className="home__methodology-title">Learn</h3>
                  <p className="home__methodology-desc">
                    Building technical knowledge through workshops, seminars, and industry-oriented learning experiences.
                  </p>
                </div>
              </div>
            </RevealOnScroll>

            <RevealOnScroll delay={200} direction="up">
              <div className="home__methodology-card card">
                <div className="card__body">
                  <span className="home__methodology-num">02</span>
                  <h3 className="home__methodology-title">Build</h3>
                  <p className="home__methodology-desc">
                    Encouraging students to develop projects, participate in hackathons, and apply concepts to real-world problems.
                  </p>
                </div>
              </div>
            </RevealOnScroll>

            <RevealOnScroll delay={300} direction="up">
              <div className="home__methodology-card card">
                <div className="card__body">
                  <span className="home__methodology-num">03</span>
                  <h3 className="home__methodology-title">Lead</h3>
                  <p className="home__methodology-desc">
                    Developing leadership, teamwork, and event management skills through committee-driven initiatives.
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
