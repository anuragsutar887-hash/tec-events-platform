import { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { formatDateTime } from '../../utils/dateHelpers';
import { QRCodeSVG } from 'qrcode.react';

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
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 700 }}>
        <div className="modal__header">
          <h2 className="modal__title">Registration Details</h2>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <div className="modal__body" style={{ padding: 'var(--space-6)' }}>
            <div className="skeleton" style={{ width: '140px', height: '24px', marginBottom: 'var(--space-4)' }} />
            <div className="skeleton" style={{ height: '80px', marginBottom: 'var(--space-4)' }} />
            <div className="skeleton" style={{ height: '120px' }} />
          </div>
        ) : !reg ? (
          <div className="modal__body"><div className="alert alert--error">Registration not found</div></div>
        ) : (
          <>
            <div className="modal__body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 'var(--space-6)', alignItems: 'start' }}>
                <div>
                  {/* Header info */}
                  <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
                    <span className={`badge ${reg.registration_type === 'ONLINE' ? 'badge--online' : 'badge--onsite'}`}>
                      {reg.registration_type}
                    </span>
                    <span className={`badge ${reg.participation_mode === 'SOLO' ? 'badge--solo' : 'badge--team'}`}>
                      {reg.participation_mode}
                    </span>
                    <span className={`badge ${reg.checked_in ? 'badge--checked' : 'badge--unchecked'}`}>
                      {reg.checked_in ? '✓ Checked In' : 'Not Checked In'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
                    <div>
                      <div className="text-xs text-muted fw-semibold mb-2" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Registration ID</div>
                      <span className="reg-id">{reg.registration_id}</span>
                    </div>
                    {reg.team_name && (
                      <div>
                        <div className="text-xs text-muted fw-semibold mb-2" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Team Name</div>
                        <div className="text-primary fw-semibold">{reg.team_name}</div>
                      </div>
                    )}
                    <div>
                      <div className="text-xs text-muted fw-semibold mb-2" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Event</div>
                      <div className="text-secondary">{reg.event_name}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted fw-semibold mb-2" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Registered At</div>
                      <div className="text-secondary text-sm">{formatDateTime(reg.created_at)}</div>
                    </div>
                    {reg.checked_in && (
                      <div>
                        <div className="text-xs text-muted fw-semibold mb-2" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Checked In At</div>
                        <div className="text-success text-sm">{formatDateTime(reg.checked_in_at)}</div>
                      </div>
                    )}
                  </div>

                  {/* Participants */}
                  <div>
                    <div className="text-xs text-muted fw-semibold mb-2" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Participants ({reg.participants?.length || 0})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                      {reg.participants?.map((p, i) => (
                        <div key={i} style={{
                          padding: 'var(--space-3) var(--space-4)',
                          background: 'var(--bg-elevated)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                            <span className="text-sm fw-semibold text-primary">{p.full_name}</span>
                            {p.is_leader && <span className="badge badge--solo" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>Leader</span>}
                          </div>
                          <div className="text-xs text-muted">{p.email} {p.phone && `• ${p.phone}`}</div>
                          <div className="text-xs text-muted">{[p.department, p.year, p.college].filter(Boolean).join(' • ')}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* QR Code */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    padding: 'var(--space-4)',
                    background: 'white',
                    borderRadius: 'var(--radius-lg)',
                    display: 'inline-block',
                    marginBottom: 'var(--space-2)',
                  }}>
                    <QRCodeSVG
                      value={`${window.location.origin}/lookup?token=${reg.qr_token}`}
                      size={140}
                      level="M"
                      fgColor="#111827"
                    />
                  </div>
                  <div className="text-xs text-muted">Scan to check in</div>
                </div>
              </div>
            </div>

            <div className="modal__footer">
              {reg.checked_in ? (
                <button className="btn btn--danger btn--sm" onClick={handleUndoCheckin}>
                  Undo Check-in
                </button>
              ) : (
                <button
                  className={`btn btn--success ${checkinLoading ? 'btn--loading' : ''}`}
                  onClick={handleCheckin}
                  disabled={checkinLoading}
                  id="modal-checkin-btn"
                >
                  {checkinLoading ? '' : '✓ Check In'}
                </button>
              )}
              <button className="btn btn--secondary" onClick={onClose}>Close</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
