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
  const [topTeams, setTopTeams] = useState([]);

  // ⚡ Hacker / Matrix Code Decrypt Animations
  const word1 = useScrambleText('FIND THE BUG.', { delay: 100, speed: 25, duration: 600 });
  const word2 = useScrambleText('FIX THE CODE.', { delay: 650, speed: 25, duration: 600 });

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    try {
      const { data } = await apiClient.get('/events');
      setEvents(data.events || []);

      if (data.events && data.events.length > 0) {
        const firstEvent = data.events[0];
        const { data: lbData } = await apiClient.get(`/registrations/leaderboard/${firstEvent.id}`);
        setTopTeams(lbData.teams?.slice(0, 3) || []);
      }
    } catch {
      // safe fallback
    } finally {
      setLoading(false);
    }
  };

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
      {/* ─── 1. EDITORIAL HERO SECTION (Images 3, 4, 5) ───────────── */}
      <section className="home__hero">
        <div className="container">
          <div className="home__hero-content">
            {/* Top Tag */}
            <div className="home__hero-tag">
              <span className="home__hero-tag-sys">[SYS.INIT] // COMPETITION_MODE: ENGAGED</span>
              <span className="home__hero-tag-vol">VOL. 04 — THE ANNUAL SYNTHESIS</span>
            </div>

            {/* Main Editorial Serif Heading */}
            <h1 className="home__hero-title">
              <span className="scramble-word">{word1.text || '░░░░░░░░░░░░'}</span>
              <br />
              <span className="scramble-word">{word2.text || '░░░░░░░░░░░░'}</span>
              <span className="hero-block-cursor">█</span>
            </h1>

            {/* Subtitle */}
            <p className="home__hero-subtitle">
              A premium technical competition demanding intellectual clarity and flawless execution.
              Compete against top developers and duo teams from Indira College of Engineering and Management.
            </p>

            {/* CTA Buttons (High-Contrast Solid & Outline) */}
            <div className="home__hero-cta">
              <Link
                to={featured ? `/events/${featured.slug}/register` : '/events'}
                className="btn btn--primary btn--lg"
              >
                REGISTER NOW
              </Link>
              <button
                onClick={() => scrollToSection('events-section')}
                className="btn btn--secondary btn--lg"
              >
                VIEW BRIEF
              </button>
            </div>

            {/* Key Specifications Grid (As in Image 4) */}
            <div className="home__specs-grid">
              <div className="home__spec-card">
                <span className="home__spec-label">DATE / SCHEDULE</span>
                <span className="home__spec-val">{featured?.event_date ? new Date(featured.event_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 'OCT 24 – 26'}</span>
                <span className="home__spec-sub">Continuous Arena</span>
              </div>

              <div className="home__spec-card">
                <span className="home__spec-label">VENUE / COORDINATES</span>
                <span className="home__spec-val">{featured?.venue || 'Tech Hall A'}</span>
                <span className="home__spec-sub">Hybrid Campus Access</span>
              </div>

              <div className="home__spec-card">
                <span className="home__spec-label">MODE / FORMAT</span>
                <span className="home__spec-val">Duo Team Matrix</span>
                <span className="home__spec-sub">2 Engineers per Unit</span>
              </div>

              <div className="home__spec-card">
                <span className="home__spec-label">STATUS</span>
                <span className="home__spec-val home__spec-val--status">
                  <span className="status-dot"></span>
                  {featured?.registration_status === 'OPEN' ? 'OPEN' : 'ACTIVE'}
                </span>
                <span className="home__spec-sub">Live QR Validation</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. METHODOLOGY SECTION (Image 3) ─────────────────────────── */}
      <section className="section home__methodology">
        <div className="container">
          <RevealOnScroll delay={50}>
            <div className="home__methodology-header">
              <span className="section__label">FRAMEWORK // DISCIPLINE</span>
              <h2 className="section__title">METHODOLOGY</h2>
              <p className="home__methodology-lead">
                The competition format is designed to isolate true problem-solving capabilities from rote memorization.
              </p>
            </div>
          </RevealOnScroll>

          <div className="home__methodology-grid">
            <RevealOnScroll delay={100} direction="up">
              <div className="home__methodology-card card">
                <div className="card__body">
                  <span className="home__methodology-num">01</span>
                  <h3 className="home__methodology-title">Algorithm Analysis</h3>
                  <p className="home__methodology-desc">
                    Identify logical flaws in complex, obfuscated algorithms provided in multiple languages under strict time limits.
                  </p>
                </div>
              </div>
            </RevealOnScroll>

            <RevealOnScroll delay={200} direction="up">
              <div className="home__methodology-card card">
                <div className="card__body">
                  <span className="home__methodology-num">02</span>
                  <h3 className="home__methodology-title">Performance Optimization</h3>
                  <p className="home__methodology-desc">
                    Refactor working but inefficient code to meet strict time and space complexity constraints with zero regression.
                  </p>
                </div>
              </div>
            </RevealOnScroll>

            <RevealOnScroll delay={300} direction="up">
              <div className="home__methodology-card card">
                <div className="card__body">
                  <span className="home__methodology-num">03</span>
                  <h3 className="home__methodology-title">System Architecture</h3>
                  <p className="home__methodology-desc">
                    Debug microservice communication and concurrency failures in simulated distributed environments.
                  </p>
                </div>
              </div>
            </RevealOnScroll>
          </div>
        </div>
      </section>

      {/* ─── 3. STANDINGS / LEADERBOARD PREVIEW (Images 4, 5) ───────────── */}
      <section className="section home__standings-section">
        <div className="container">
          <RevealOnScroll delay={50}>
            <div className="home__standings-header">
              <div>
                <span className="section__label">REAL-TIME TELEMETRY</span>
                <h2 className="section__title">STANDINGS</h2>
              </div>
              <div className="home__standings-live">
                <span className="live-sync-dot"></span>
                <span>• LIVE SYNC</span>
                <Link to="/leaderboard" className="btn btn--secondary btn--sm" style={{ marginLeft: 'var(--space-4)' }}>
                  FULL STANDINGS →
                </Link>
              </div>
            </div>
          </RevealOnScroll>

          <RevealOnScroll delay={100} direction="up">
            <div className="table-wrapper home__standings-table">
              <table>
                <thead>
                  <tr>
                    <th>RANK</th>
                    <th>ENTITY / DUO TEAM</th>
                    <th>REGISTRATION ID</th>
                    <th>STATUS / ARENA</th>
                  </tr>
                </thead>
                <tbody>
                  {topTeams.length > 0 ? (
                    topTeams.map((team, idx) => (
                      <tr key={team.id || idx}>
                        <td className="font-mono fw-bold" style={{ fontSize: '1rem', color: '#000000' }}>
                          {idx === 0 ? '🥇 01' : idx === 1 ? '🥈 02' : idx === 2 ? '🥉 03' : `0${idx + 1}`}
                        </td>
                        <td>
                          <div className="fw-bold text-primary">{team.team_name || `${team.leader_name}'s Duo`}</div>
                          <div className="text-xs text-muted">👑 {team.leader_name} ({team.leader_dept || 'Tech'})</div>
                        </td>
                        <td className="font-mono text-xs">{team.registration_id}</td>
                        <td>
                          <span className="badge badge--checked">✓ IN ARENA</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                        <div className="text-muted text-sm font-mono">
                          Awaiting verified duo teams to check in at arena entrance.
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ─── 4. ALL EVENTS SECTION (Editorial Grid) ───────────────────── */}
      <section className="section" id="events-section" style={{ background: '#fbfbfb', borderTop: '1px solid var(--border)' }}>
        <div className="container">
          <RevealOnScroll delay={50}>
            <div className="section__header" style={{ textAlign: 'center' }}>
              <span className="section__label">COMPETITIONS // ACTIVE</span>
              <h2 className="section__title">EVENT SCHEDULE</h2>
              <p className="section__subtitle" style={{ margin: '0 auto' }}>
                Select a discipline to initialize your duo team registration.
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
                <p className="empty-state__text">Check back soon for upcoming technical events.</p>
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
