import { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import './PendingInvitesModal.css';

export default function PendingInvitesModal({ isOpen, onClose, invites = [], onApproved, onDeclined }) {
  const [loadingId, setLoadingId] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // 🔒 Prevent background scrolling without causing page scroll jump
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleApprove = async (invite) => {
    setLoadingId(invite.registrationId);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await apiClient.put(`/registrations/${invite.registrationId}/approve`);
      setSuccessMsg(`Joined team "${invite.teamName}"! You and ${invite.leaderName} are now official teammates.`);
      if (onApproved) onApproved(invite);
      setTimeout(() => {
        setSuccessMsg('');
        if (invites.length <= 1) onClose();
      }, 1500);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to approve. Please try again.');
    } finally {
      setLoadingId(null);
    }
  };

  const handleDecline = async (invite) => {
    if (!window.confirm(`Decline invitation for "${invite.teamName}"?`)) {
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
          <h2 className="invites-modal-title">Invitations</h2>
          <button className="student-modal-close" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        <div className="card__body" style={{ padding: 'var(--space-5)' }}>
          {successMsg && <div className="alert alert--success mb-4">✅ {successMsg}</div>}
          {errorMsg && <div className="alert alert--error mb-4">⚠️ {errorMsg}</div>}

          {invites.length === 0 ? (
            <div className="invites-empty-state">
              <div className="invites-empty-icon">🔔</div>
              <h3 className="invites-empty-title">No Invitations</h3>
              <p className="invites-empty-sub">No pending requests.</p>
            </div>
          ) : (
            <div className="invites-list">
              {invites.map((invite) => (
                <div key={invite.registrationId} className="invite-card">
                  <div className="invite-card__top">
                    <span className="badge badge--tag">{invite.eventTitle}</span>
                    <span className="badge badge--upcoming">Awaiting Approval</span>
                  </div>

                  <h3 className="invite-card__team">Team: {invite.teamName}</h3>

                  <div className="invite-card__inviter-box">
                    <span>Added by: <strong>{invite.leaderName}</strong> {invite.leaderPrn ? `(${invite.leaderPrn})` : ''}</span>
                  </div>

                  <div className="invite-card__meta">
                    {invite.eventDate && <span>📅 {new Date(invite.eventDate).toLocaleDateString()}</span>}
                    {invite.eventVenue && <span>📍 {invite.eventVenue}</span>}
                    <span>Reg ID: <strong className="font-mono">{invite.regCode}</strong></span>
                  </div>

                  <div className="invite-card__actions">
                    <button
                      type="button"
                      className={`btn btn--primary btn--full ${loadingId === invite.registrationId ? 'btn--loading' : ''}`}
                      onClick={() => handleApprove(invite)}
                      disabled={loadingId === invite.registrationId}
                    >
                      {loadingId === invite.registrationId ? '' : '✓ Approve & Confirm Team'}
                    </button>
                    <button
                      type="button"
                      className="btn btn--secondary btn--full"
                      onClick={() => handleDecline(invite)}
                      disabled={loadingId === invite.registrationId}
                    >
                      Decline
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
