import { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import EventCard from '../../components/features/EventCard';
import { SkeletonEventCard } from '../../components/common/SkeletonCard';
import './Events.css';

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    apiClient.get('/events').then(({ data }) => setEvents(data.events || [])).finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'ALL'
    ? events
    : events.filter((e) => e.registration_status === filter);

  return (
    <div className="events-page">
      <div className="events-page__hero">
        <div className="container">
          <div className="section__label">TEC Events</div>
          <h1 className="events-page__title">All Events</h1>
          <p className="events-page__subtitle">
            Explore all upcoming and current technical events. Find your challenge.
          </p>
        </div>
      </div>

      <div className="section">
        <div className="container">
          <div className="events-page__filters">
            {[
              { key: 'ALL', label: 'All Events' },
              { key: 'OPEN', label: '🟢 Open' },
              { key: 'NOT_OPEN', label: '🕐 Coming Soon' },
              { key: 'CLOSED', label: '🔴 Closed' },
            ].map(({ key, label }) => (
              <button
                key={key}
                className={`btn btn--sm ${filter === key ? 'btn--primary' : 'btn--secondary'}`}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
            <span className="events-page__count text-muted text-sm">
              {loading ? 'Loading...' : `${filtered.length} event${filtered.length !== 1 ? 's' : ''}`}
            </span>
          </div>

          {loading ? (
            <div className="events-page__grid">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <SkeletonEventCard key={n} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state card">
              <div className="card__body">
                <div className="empty-state__icon">📅</div>
                <div className="empty-state__title">No events found</div>
                <p className="empty-state__text">
                  {filter === 'ALL' ? 'No events have been published yet.' : `No events with status "${filter}".`}
                </p>
              </div>
            </div>
          ) : (
            <div className="events-page__grid">
              {filtered.map((ev) => <EventCard key={ev.id} event={ev} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
