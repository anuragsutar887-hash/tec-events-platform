import { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { formatDateTime } from '../../utils/dateHelpers';

export default function RegistrationDetailModal({ registrationId, onClose, onCheckin }) {
  const [reg, setReg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkinLoading, setCheckinLoading] = useState(false);

  useEffect(() => {
    fetchReg();
  }, [registrationId]);

  const fetchReg = async () => {
    try {
      const { data } = await apiClient.get(`/admin/registrations/${registrationId}`);
      setReg(data.registration);
    } catch { } finally { setLoading(false); }
  };

  const handleCheckin = async () => {
    setCheckinLoading(true);
    try {
      await apiClient.put(`/admin/registrations/${registrationId}/checkin`);
      await fetchReg();
      onCheckin?.();
    } catch (err) {
      alert(err.response?.data?.error || 'Check-in failed');
    } finally { setCheckinLoading(false); }
  };

  const handleUndoCheckin = async () => {
    if (!window.confirm('Undo check-in for this registration?')) return;
    try {
      await apiClient.put(`/admin/registrations/${registrationId}/undo-checkin`);
      await fetchReg();
      onCheckin?.();
    } catch { alert('Failed to undo check-in'); }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()} style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: 'var(--space-4)'
    }}>
      <div className="modal card" style={{
        width: '100%',
        maxWidth: 720,
        background: '#ffffff',
        border: '1px solid #000000',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)'
      }}>
        <div className="modal__header" style={{
          padding: 'var(--space-4) var(--space-6)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#fafafa'
        }}>
          <div>
            <span className="section__label" style={{ marginBottom: 0 }}>VERIFIED REGISTRATION</span>
            <h2 className="modal__title" style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
              {reg?.team_name || 'Registration Details'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="btn btn--secondary btn--sm"
            style={{ padding: '4px 10px', fontSize: '0.8rem' }}
          >
            ✕ Close
          </button>
        </div>

        {loading ? (
          <div className="modal__body" style={{ padding: 'var(--space-8)' }}>
            <div className="skeleton" style={{ width: '140px', height: '24px', marginBottom: 'var(--space-4)' }} />
            <div className="skeleton" style={{ height: '80px', marginBottom: 'var(--space-4)' }} />
            <div className="skeleton" style={{ height: '120px' }} />
          </div>
        ) : !reg ? (
          <div className="modal__body" style={{ padding: 'var(--space-6)' }}>
            <div className="alert alert--error">Registration not found</div>
          </div>
        ) : (
          <>
            <div className="modal__body" style={{ padding: 'var(--space-6)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-6)', alignItems: 'start' }}>
                <div>
                  {/* Status Badges */}
                  <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
                    <span className={`badge ${reg.registration_type === 'ONLINE' ? 'badge--online' : 'badge--onsite'}`}>
                      {reg.registration_type}
                    </span>
                    <span className={`badge ${reg.participation_mode === 'SOLO' ? 'badge--solo' : 'badge--team'}`}>
                      {reg.participation_mode}
                    </span>
                    <span className={`badge ${reg.checked_in ? 'badge--checked' : 'badge--unchecked'}`}>
                      {reg.checked_in ? '✓ Checked In (In Arena)' : 'Not Checked In'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                    <div>
                      <div className="text-xs text-muted fw-bold" style={{ textTransform: 'uppercase' }}>Registration ID</div>
                      <span className="reg-id" style={{ fontSize: '1rem' }}>{reg.registration_id}</span>
                    </div>
                    {reg.team_name && (
                      <div>
                        <div className="text-xs text-muted fw-bold" style={{ textTransform: 'uppercase' }}>Team Name</div>
                        <div className="text-primary fw-bold">{reg.team_name}</div>
                      </div>
                    )}
                    <div>
                      <div className="text-xs text-muted fw-bold" style={{ textTransform: 'uppercase' }}>Event</div>
                      <div className="text-secondary">{reg.event_name}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted fw-bold" style={{ textTransform: 'uppercase' }}>Registered At</div>
                      <div className="text-secondary text-xs">{formatDateTime(reg.created_at)}</div>
                    </div>
                    {reg.checked_in && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <div className="text-xs text-muted fw-bold" style={{ textTransform: 'uppercase' }}>Checked In At</div>
                        <div className="text-success text-xs fw-bold">{formatDateTime(reg.checked_in_at)}</div>
                      </div>
                    )}
                  </div>

                  {/* Participants (Player 1 & Player 2) */}
                  <div>
                    <div className="text-xs text-muted fw-bold mb-2" style={{ textTransform: 'uppercase' }}>
                      DUO TEAM MEMBERS (2 PLAYERS)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                      {reg.participants?.map((p, i) => (
                        <div key={i} style={{
                          padding: 'var(--space-3) var(--space-4)',
                          background: '#fafafa',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
                            <span className="text-sm fw-bold text-primary">{p.full_name}</span>
                            <span className="badge badge--tag" style={{ fontSize: '0.65rem', padding: '1px 5px' }}>
                              PLAYER {i + 1}
                            </span>
                          </div>
                          <div className="text-xs text-muted">📧 {p.email}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal__footer" style={{
              padding: 'var(--space-4) var(--space-6)',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#fafafa'
            }}>
              <div>
                {reg.checked_in ? (
                  <button className="btn btn--danger btn--sm" onClick={handleUndoCheckin}>
                    Undo Check-in
                  </button>
                ) : (
                  <button
                    className={`btn btn--primary btn--sm ${checkinLoading ? 'btn--loading' : ''}`}
                    onClick={handleCheckin}
                    disabled={checkinLoading}
                    id="modal-checkin-btn"
                  >
                    {checkinLoading ? '' : '✓ Check In to Arena'}
                  </button>
                )}
              </div>
              <button className="btn btn--secondary btn--sm" onClick={onClose}>
                Cancel / Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
