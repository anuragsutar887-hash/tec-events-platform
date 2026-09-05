import { useState } from 'react';
import apiClient from '../../api/client';
import './PendingInvitesModal.css';

export default function PendingInvitesModal({ isOpen, onClose, invites = [], onApproved, onDeclined }) {
  const [loadingId, setLoadingId] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleApprove = async (invite) => {
    setLoadingId(invite.registrationId);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await apiClient.put(`/registrations/${invite.registrationId}/approve`);
      setSuccessMsg(`You have officially joined team "${invite.teamName}"! You and ${invite.leaderName} are now official teammates.`);
      if (onApproved) onApproved(invite);
      setTimeout(() => {
        setSuccessMsg('');
        if (invites.length <= 1) onClose();
      }, 1500);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to approve invitation. Please try again.');
    } finally {
      setLoadingId(null);
    }
  };

  const handleDecline = async (invite) => {
    if (!window.confirm(`Are you sure you want to decline the invitation for "${invite.teamName}"?`)) {
      return;
    }
    setLoadingId(invite.registrationId);
    setErrorMsg('');
    try {
      await apiClient.put(`/registrations/${invite.registrationId}/decline`);
      if (onDeclined) onDeclined(invite);
      if (invites.length <= 1) onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to decline invitation.');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="invites-modal-overlay" onClick={onClose}>
      <div className="invites-modal-card card" onClick={(e) => e.stopPropagation()}>
        <div className="invites-modal-header">
          <div>
            <span className="section__label" style={{ marginBottom: 0 }}>TEAM INVITATIONS & APPROVALS</span>
            <h2 className="invites-modal-title">Teammate Requests</h2>
            <p className="invites-modal-subtitle">
              When someone adds you as a teammate, approve here to become official teammates for the event.
            </p>
          </div>
          <button className="student-modal-close" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        <div className="card__body" style={{ padding: 'var(--space-6)' }}>
          {successMsg && <div className="alert alert--success mb-4">✅ {successMsg}</div>}
          {errorMsg && <div className="alert alert--error mb-4">⚠️ {errorMsg}</div>}

          {invites.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-8) var(--space-4)' }}>
              <div className="empty-state__icon">🔔</div>
              <h3 className="empty-state__title" style={{ fontSize: '1.15rem' }}>No Pending Invitations</h3>
              <p className="empty-state__text">
                You have no pending teammate requests. When another student selects you as their partner in team registration, their invitation will appear here for you to approve.
              </p>
            </div>
          ) : (
            <div className="invites-list">
              {invites.map((invite) => (
                <div key={invite.registrationId} className="invite-item card" style={{ border: '1px solid #000' }}>
                  <div className="invite-item__header">
                    <div>
                      <span className="badge badge--tag">{invite.eventTitle}</span>
                      <h3 className="invite-item__team-name" style={{ marginTop: '6px' }}>Team: {invite.teamName}</h3>
                    </div>
                    <span className="badge badge--upcoming">⏳ Awaiting Your Approval</span>
                  </div>

                  <div style={{ padding: 'var(--space-3) var(--space-4)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', margin: 'var(--space-3) 0' }}>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#000', fontWeight: 600 }}>
                      👤 Added by: <strong>{invite.leaderName}</strong> {invite.leaderPrn ? `(${invite.leaderPrn})` : ''}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Approve below to confirm your team and become official teammates for {invite.eventTitle}.
                    </p>
                  </div>

                  <div className="invite-item__meta">
                    {invite.eventDate && <span>📅 Date: {new Date(invite.eventDate).toLocaleDateString()}</span>}
                    {invite.eventVenue && <span>📍 Venue: {invite.eventVenue}</span>}
                    <span>🎫 Reg ID: <strong className="font-mono">{invite.regCode}</strong></span>
                  </div>

                  <div className="invite-item__actions">
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      onClick={() => handleDecline(invite)}
                      disabled={loadingId === invite.registrationId}
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      className={`btn btn--primary btn--sm ${loadingId === invite.registrationId ? 'btn--loading' : ''}`}
                      onClick={() => handleApprove(invite)}
                      disabled={loadingId === invite.registrationId}
                    >
                      {loadingId === invite.registrationId ? '' : '✓ Approve & Confirm Team'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
