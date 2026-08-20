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

  // ⚡ Hacker / Matrix Code Decrypt Animations for the 3 words
  const word1 = useScrambleText('Compete.', { delay: 100, speed: 30, duration: 650 });
  const word2 = useScrambleText('Learn.', { delay: 600, speed: 30, duration: 650 });
  const word3 = useScrambleText('Innovate.', { delay: 1150, speed: 30, duration: 750 });

  useEffect(() => {
    apiClient.get('/events').then(({ data }) => setEvents(data.events || [])).finally(() => setLoading(false));
  }, []);

  const upcoming = events.filter((e) => e.registration_status === 'OPEN' || e.registration_status === 'NOT_OPEN');
  const featured = upcoming[0] || events[0];

  const scrollToSection = (id) => {
    const elem = document.getElementById(id);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="home" id="top">
      {/* ─── 1. HERO SECTION ────────────────────────────────────────── */}
      <section className="home__hero">
        <div className="home__hero-bg" />
        <div className="container">
          <div className="home__hero-content">
            {/* Top Badge with College Name */}
            <div className="home__hero-badge">
              <span className="home__hero-badge-dot" />
              <span className="home__hero-badge-text">
                INDIRA COLLEGE OF ENGINEERING AND MANAGEMENT • TECHNICAL EVENTS
              </span>
            </div>

            {/* Matrix / Code Decrypt Hero Title */}
            <h1 className="home__hero-title">
              <span className="scramble-word word-1">
                {word1.text || '░░░░░░░░'}
              </span>{' '}
              <span className="scramble-word word-2">
                {word2.text || '░░░░░░'}
              </span>
              <br />
              <span className="home__hero-accent scramble-word word-3">
                {word3.text || '░░░░░░░░░'}
              </span>
              {!word3.isDone && <span className="hero-cursor">_</span>}
            </h1>

            <p className="home__hero-subtitle">
              Register for cutting-edge technical events, challenges, and competitions
              organized by the Technical Committee at Indira College of Engineering and Management.
            </p>

            <div className="home__hero-cta">
              <button
                onClick={() => scrollToSection('events-section')}
                className="btn btn--primary btn--lg"
              >
                Browse Events ↓
              </button>
              <Link to="/lookup" className="btn btn--secondary btn--lg">
                Check Registration
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. FEATURED EVENT (Scroll Reveal) ────────────────────────── */}
      {featured && (
        <section className="section section--sm">
          <div className="container">
            <RevealOnScroll delay={100}>
              <div className="section__header">
                <div className="section__label">Featured Event</div>
                <h2 className="section__title">Don't Miss This</h2>
              </div>
              <div className="home__featured card card--hover">
                <div className="home__featured-body">
                  <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 'var(--space-3)' }}>
                    <span className={`badge ${featured.registration_status === 'OPEN' ? 'badge--open' : featured.registration_status === 'NOT_OPEN' ? 'badge--upcoming' : 'badge--closed'}`}>
                      {featured.registration_status === 'OPEN' ? '🟢 Registration Open' : featured.registration_status === 'NOT_OPEN' ? '🕐 Coming Soon' : '🔴 Closed'}
                    </span>
                  </div>
                  <h3 className="home__featured-title">{featured.name}</h3>
                  <p className="home__featured-desc">{featured.short_description || featured.full_description?.slice(0, 200)}</p>
                  <div className="home__featured-meta">
                    {featured.event_date && <span>📅 {new Date(featured.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>}
                    {featured.venue && <span>📍 {featured.venue}</span>}
                    {featured.allows_team && <span>👥 Team Event</span>}
                  </div>
                  <div className="home__featured-actions">
                    <Link to={`/events/${featured.slug}`} className="btn btn--secondary">View Details</Link>
                    {featured.registration_status === 'OPEN' && (
                      <Link to={`/events/${featured.slug}/register`} className="btn btn--primary">Register Now →</Link>
                    )}
                  </div>
                </div>
              </div>
            </RevealOnScroll>
          </div>
        </section>
      )}

      {/* ─── 3. ALL EVENTS (Staggered 1-by-1 Scroll Reveal & Skeleton Loader) ─ */}
      <section className="section" id="events-section">
        <div className="container">
          <RevealOnScroll delay={50}>
            <div className="section__header">
              <div className="section__label">All Events</div>
              <h2 className="section__title">Upcoming Events</h2>
              <p className="section__subtitle">Choose an event that matches your skills and interests.</p>
            </div>
          </RevealOnScroll>

          {loading ? (
            <div className="home__events-grid">
              {[1, 2, 3].map((n) => (
                <SkeletonEventCard key={n} />
              ))}
            </div>
          ) : events.length === 0 ? (
            <RevealOnScroll delay={100}>
              <div className="empty-state card">
                <div className="card__body">
                  <div className="empty-state__icon">📅</div>
                  <div className="empty-state__title">No events published yet</div>
                  <p className="empty-state__text">Check back soon for upcoming technical events.</p>
                </div>
              </div>
            </RevealOnScroll>
          ) : (
            <div className="home__events-grid">
              {events.map((ev, index) => (
                <RevealOnScroll key={ev.id} delay={index * 120} direction="up">
                  <EventCard event={ev} />
                </RevealOnScroll>
              ))}
            </div>
          )}

          {events.length > 0 && (
            <RevealOnScroll delay={200}>
              <div style={{ textAlign: 'center', marginTop: 'var(--space-8)' }}>
                <Link to="/events" className="btn btn--secondary">View All Events Page →</Link>
              </div>
            </RevealOnScroll>
          )}
        </div>
      </section>

      {/* ─── 4. WHY PARTICIPATE (Fix Overlapping & Staggered Reveal) ───── */}
      <section className="section home__why" id="why-section">
        <div className="container">
          <RevealOnScroll delay={50}>
            <div className="section__header">
              <div className="section__label">Why Join</div>
              <h2 className="section__title">Why Participate?</h2>
            </div>
          </RevealOnScroll>

          {/* Dedicated responsive non-overlapping 3-card grid */}
          <div className="home__why-grid">
            {[
              {
                icon: '🏆',
                title: 'Win Recognition',
                desc: 'Earn certificates, trophies, and recognition from faculty and industry leaders.',
                badge: 'ACHIEVEMENT',
                glowClass: 'glow-gold'
              },
              {
                icon: '🤝',
                title: 'Network & Collaborate',
                desc: 'Meet talented peers from different departments and colleges across Maharashtra.',
                badge: 'CONNECT',
                glowClass: 'glow-cyan'
              },
              {
                icon: '⚡',
                title: 'Sharpen Your Skills',
                desc: 'Real-world challenges designed to push your technical, problem-solving and coding limits.',
                badge: 'MASTERY',
                glowClass: 'glow-purple'
              },
            ].map((item, index) => (
              <RevealOnScroll key={item.title} delay={index * 150} direction="up">
                <div className={`home__why-card card ${item.glowClass}`}>
                  <div className="card__body">
                    <div className="home__why-top">
                      <div className="home__why-icon-box">{item.icon}</div>
                      <span className="home__why-badge">{item.badge}</span>
                    </div>
                    <h3 className="home__why-title">{item.title}</h3>
                    <p className="home__why-desc">{item.desc}</p>
                  </div>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 5. CTA SECTION (Scroll Reveal) ────────────────────────────── */}
      <section className="section home__cta-section">
        <div className="container">
          <RevealOnScroll delay={100}>
            <div className="home__cta card">
              <div className="home__cta-body">
                <h2 className="home__cta-title">Ready to Compete?</h2>
                <p className="home__cta-sub">Browse events, form your team, and register today.</p>
                <div className="home__cta-actions">
                  <button onClick={() => scrollToSection('events-section')} className="btn btn--primary btn--lg">
                    Browse Events ↓
                  </button>
                  <Link to="/lookup" className="btn btn--ghost btn--lg">Lookup My Registration</Link>
                </div>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </section>
    </div>
  );
}
