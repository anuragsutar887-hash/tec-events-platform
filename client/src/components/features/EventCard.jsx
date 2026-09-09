import { Link } from 'react-router-dom';
import { useStudent } from '../../context/StudentAuthContext';
import { formatDate, formatTime } from '../../utils/dateHelpers';
import './EventCard.css';

function RegistrationBadge({ status }) {
  const map = {
    OPEN: { label: '• REGISTRATION OPEN', cls: 'badge--open' },
    NOT_OPEN: { label: '• COMING SOON', cls: 'badge--upcoming' },
    CLOSED: { label: '• CLOSED', cls: 'badge--closed' },
  };
  const { label, cls } = map[status] || { label: status, cls: '' };
  return <span className={`badge ${cls}`}>{label}</span>;
}

export default function EventCard({ event }) {
  const { isAuthenticated } = useStudent();
  const { slug, name, short_description, event_date, start_time, venue,
    registration_status, allows_solo, allows_team, min_team_size, max_team_size } = event;

  const minSize = parseInt(min_team_size || 1, 10);
  const maxSize = parseInt(max_team_size || 2, 10);
  let participationType = 'Solo';
  if (maxSize === 1) {
    participationType = 'Solo (1 Player)';
  } else if (minSize === 1 && maxSize > 1) {
    participationType = `Solo / Team (Up to ${maxSize})`;
  } else if (minSize === maxSize) {
    participationType = `${maxSize} Players Team`;
  } else {
    participationType = `${minSize}–${maxSize} Players Team`;
  }

  return (
    <div className="event-card card card--hover">
      <div className="event-card__body">
        <h3 className="event-card__title">{name}</h3>
        {short_description && (
          <p className="event-card__desc">{short_description}</p>
        )}

        <div className="event-card__meta">
          {event_date && (
            <div className="event-card__meta-item">
              <span className="event-card__meta-icon">📅</span>
              <span>{formatDate(event_date)}</span>
            </div>
          )}
          {start_time && (
            <div className="event-card__meta-item">
              <span className="event-card__meta-icon">🕐</span>
              <span>{formatTime(start_time)}</span>
            </div>
          )}
          {venue && (
            <div className="event-card__meta-item">
              <span className="event-card__meta-icon">📍</span>
              <span>{venue}</span>
            </div>
          )}
          {participationType && (
            <div className="event-card__meta-item">
              <span className="event-card__meta-icon">👥</span>
              <span>{participationType}</span>
            </div>
          )}
        </div>
      </div>

      <div className="event-card__footer">
        <Link to={`/events/${slug}`} className="btn btn--secondary btn--sm event-card__btn-view">
          VIEW DETAILS
        </Link>
        {registration_status === 'OPEN' && (
          <Link
            to={isAuthenticated ? `/events/${slug}/register` : `/login?redirect=/events/${slug}/register`}
            className="btn btn--primary btn--sm event-card__btn-reg"
          >
            REGISTER NOW
          </Link>
        )}
      </div>
    </div>
  );
}
