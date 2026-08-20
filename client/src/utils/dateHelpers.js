/**
 * Date and time formatting utilities
 */

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(timeStr) {
  if (!timeStr) return '—';
  const [h, m] = timeStr.split(':');
  const date = new Date();
  date.setHours(parseInt(h), parseInt(m));
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function getRegistrationStatusLabel(status) {
  switch (status) {
    case 'OPEN': return 'Registration Open';
    case 'NOT_OPEN': return 'Coming Soon';
    case 'CLOSED': return 'Registration Closed';
    default: return status;
  }
}

export function getEventStatusLabel(status) {
  switch (status) {
    case 'PUBLISHED': return 'Published';
    case 'DRAFT': return 'Draft';
    case 'COMPLETED': return 'Completed';
    case 'ARCHIVED': return 'Archived';
    default: return status;
  }
}
