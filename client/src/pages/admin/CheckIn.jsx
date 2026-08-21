import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import apiClient from '../../api/client';
import { formatDateTime, timeAgo } from '../../utils/dateHelpers';
import { QRCodeSVG } from 'qrcode.react';
import './CheckIn.css';

// Audio feedback helper (synthesized via Web Audio API)
const playSuccessBeep = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 tone
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {}
};

export default function CheckIn() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [result, setResult] = useState(null);
  const [recentCheckins, setRecentCheckins] = useState([]);
  const [pendingCheckins, setPendingCheckins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(searchParams.get('event_id') || '');

  // 📷 Live Camera Scanner State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [scanningStatus, setScanningStatus] = useState('Standby');
  const html5QrCodeRef = useRef(null);
  const isProcessingScanRef = useRef(false);
  const inputRef = useRef(null);

  useEffect(() => {
    loadEvents();
    loadLiveQueues();
    inputRef.current?.focus();
  }, [selectedEventId]);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const loadEvents = async () => {
    try {
      const { data } = await apiClient.get('/admin/dashboard/events');
      setEvents(data.events || []);
      if (!selectedEventId && data.events?.length > 0) {
        setSelectedEventId(String(data.events[0].id));
      }
    } catch {}
  };

  const loadLiveQueues = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedEventId) params.append('event_id', selectedEventId);
      const { data } = await apiClient.get(`/admin/registrations?${params}`);
      const regs = data.registrations || [];

      setRecentCheckins(regs.filter((r) => r.checked_in).slice(0, 8));
      setPendingCheckins(regs.filter((r) => !r.checked_in).slice(0, 8));
    } catch {}
  };

  // ─── 📷 Camera Scanner Lifecycle ───────────────────────────────
  const startCamera = async (deviceIdToUse = null) => {
    setCameraError('');
    setIsCameraActive(true);
    setScanningStatus('Initializing camera...');

    try {
      // Fetch available camera hardware
      const availableDevices = await Html5Qrcode.getCameras();
      setCameras(availableDevices || []);

      let cameraConfig = { facingMode: 'environment' }; // Default to back camera on phones

      if (deviceIdToUse) {
        cameraConfig = { deviceId: { exact: deviceIdToUse } };
      } else if (availableDevices && availableDevices.length > 0) {
        // Look for rear/back camera if available
        const backCamera = availableDevices.find((c) =>
          c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('rear') || c.label.toLowerCase().includes('environment')
        );
        if (backCamera) {
          cameraConfig = { deviceId: { exact: backCamera.id } };
          setSelectedCameraId(backCamera.id);
        } else {
          setSelectedCameraId(availableDevices[0].id);
        }
      }

      // Small delay to ensure the DOM element #qr-reader is mounted
      setTimeout(async () => {
        try {
          if (html5QrCodeRef.current) {
            try {
              await html5QrCodeRef.current.stop();
              await html5QrCodeRef.current.clear();
            } catch {}
          }

          const qrCodeScanner = new Html5Qrcode('qr-reader');
          html5QrCodeRef.current = qrCodeScanner;

          const config = {
            fps: 15,
            qrbox: { width: 260, height: 260 },
            aspectRatio: 1.0,
          };

          await qrCodeScanner.start(
            cameraConfig,
            config,
            (decodedText) => handleQrScanSuccess(decodedText),
            () => {} // silent on frame without QR
          );

          setScanningStatus('Active — Point participant QR code at camera');
        } catch (err) {
          console.error('Camera start error:', err);
          setCameraError('Could not access camera. Please allow camera permissions in your browser.');
          setIsCameraActive(false);
        }
      }, 250);
    } catch (err) {
      setCameraError('Camera error: ' + err.message);
      setIsCameraActive(false);
    }
  };

  const switchCamera = async (deviceId) => {
    setSelectedCameraId(deviceId);
    await stopCamera();
    startCamera(deviceId);
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (e) {
        console.error('Error stopping camera:', e);
      } finally {
        html5QrCodeRef.current = null;
      }
    }
    setIsCameraActive(false);
    setScanningStatus('Standby');
  };

  const handleQrScanSuccess = async (decodedText) => {
    if (isProcessingScanRef.current) return;
    isProcessingScanRef.current = true;

    setScanningStatus('⚡ QR Detected! Verifying and checking in...');

    try {
      const queryObj = parseSearchQuery(decodedText);
      let reg = null;

      if (queryObj.type === 'token') {
        const { data } = await apiClient.get(`/registrations/lookup-by-token/${queryObj.value}`);
        reg = data.registration;
      } else {
        const { data } = await apiClient.get(`/registrations/lookup/${queryObj.value}`);
        reg = data.registration;
      }

      if (!reg) {
        setError(`Scanned QR is not associated with any active registration.`);
        setScanningStatus('Ready — Point participant QR code at camera');
        setTimeout(() => { isProcessingScanRef.current = false; }, 2000);
        return;
      }

      // Automatically Execute Instant Check-In
      if (!reg.checked_in) {
        await apiClient.put(`/admin/registrations/${reg.id}/checkin`);
        reg.checked_in = true;
        reg.checked_in_at = new Date().toISOString();
        playSuccessBeep();
        setSuccessMsg(`🎉 CHECKED IN TO ARENA: ${reg.team_name || reg.registration_id} (Player 1 & Player 2)`);
      } else {
        playSuccessBeep();
        setSuccessMsg(`ℹ️ Already Checked In: ${reg.team_name || reg.registration_id}`);
      }

      setResult(reg);
      loadLiveQueues();
      setScanningStatus('✓ Success! Ready for next participant.');

      // 2.5 second cooldown before accepting next scan
      setTimeout(() => {
        isProcessingScanRef.current = false;
      }, 2500);
    } catch (err) {
      console.error('Scan processing error:', err);
      setError('Check-in failed for scanned QR pass. Please verify details.');
      setScanningStatus('Ready — Point participant QR code at camera');
      setTimeout(() => { isProcessingScanRef.current = false; }, 2000);
    }
  };

  const parseSearchQuery = (raw) => {
    let q = raw.trim();
    if (!q) return { type: 'query', value: '' };

    if (q.includes('token=')) {
      try {
        const urlObj = new URL(q);
        return { type: 'token', value: urlObj.searchParams.get('token') || q };
      } catch {
        const match = q.match(/token=([a-zA-Z0-9-]+)/);
        if (match) return { type: 'token', value: match[1] };
      }
    }

    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q)) {
      return { type: 'token', value: q };
    }

    return { type: 'query', value: q };
  };

  const handleManualSearch = async (e) => {
    if (e) e.preventDefault();
    const queryObj = parseSearchQuery(search);
    if (!queryObj || !queryObj.value) return;

    setLoading(true);
    setError('');
    setSuccessMsg('');
    setResult(null);

    try {
      let reg = null;

      if (queryObj.type === 'token') {
        const { data } = await apiClient.get(`/registrations/lookup-by-token/${queryObj.value}`);
        reg = data.registration;
      } else {
        const params = new URLSearchParams({ search: queryObj.value });
        if (selectedEventId) params.append('event_id', selectedEventId);

        const { data } = await apiClient.get(`/admin/registrations?${params}`);
        reg = data.registrations?.[0];

        if (reg) {
          const detail = await apiClient.get(`/admin/registrations/${reg.id}`);
          reg = detail.data.registration;
        } else {
          try {
            const { data: directData } = await apiClient.get(`/registrations/lookup/${queryObj.value}`);
            reg = directData.registration;
          } catch {}
        }
      }

      if (!reg) {
        setError(`No registration found matching "${search.trim()}". Verify the ID or QR code.`);
      } else {
        setResult(reg);
      }
    } catch {
      setError('Registration not found. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualCheckin = async (targetReg = null) => {
    const toCheckin = targetReg || result;
    if (!toCheckin) return;

    setCheckinLoading(true);
    setError('');
    try {
      await apiClient.put(`/admin/registrations/${toCheckin.id}/checkin`);
      const updated = { ...toCheckin, checked_in: true, checked_in_at: new Date().toISOString() };

      if (!targetReg || targetReg.id === result?.id) {
        setResult(updated);
      }

      playSuccessBeep();
      setSuccessMsg(`✅ Verified & Checked In: ${updated.team_name || updated.registration_id}`);
      loadLiveQueues();
    } catch (err) {
      setError(err.response?.data?.error || 'Check-in failed. Please try again.');
    } finally {
      setCheckinLoading(false);
    }
  };

  const handleUndoCheckin = async () => {
    if (!result) return;
    if (!window.confirm(`Undo check-in for ${result.team_name || result.registration_id}?`)) return;

    setCheckinLoading(true);
    try {
      await apiClient.put(`/admin/registrations/${result.id}/undo-checkin`);
      setResult((r) => ({ ...r, checked_in: false, checked_in_at: null }));
      setSuccessMsg(`Check-in reversed for ${result.registration_id}`);
      loadLiveQueues();
    } catch {
      setError('Failed to undo check-in');
    } finally {
      setCheckinLoading(false);
    }
  };

  const handleClear = () => {
    setResult(null);
    setError('');
    setSuccessMsg('');
    setSearch('');
    inputRef.current?.focus();
  };

  return (
    <div className="checkin-page">
      {/* Header */}
      <div className="checkin__header">
        <div>
          <h1 className="dashboard__title">CHECK-IN CONSOLE</h1>
          <p className="dashboard__subtitle">Scan participant QR passes with your phone/laptop camera for instant arena check-in</p>
        </div>
        <div className="checkin__header-actions">
          <Link to="/leaderboard/codedebug" className="btn btn--secondary btn--sm" target="_blank">
            ⚡ Open Live Leaderboard
          </Link>
          <Link to="/admin/onsite" className="btn btn--secondary btn--sm">
            + On-site Reg
          </Link>
        </div>
      </div>

      {/* ─── 📷 1. LIVE CAMERA QR SCANNER SECTION ─────────────────── */}
      <div className="checkin__camera-card card mb-6">
        <div className="card__header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div>
            <span className="section__label" style={{ marginBottom: 0 }}>DESK TELEMETRY</span>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
              📷 LIVE CAMERA QR SCANNER
            </h2>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
            {isCameraActive && cameras.length > 1 && (
              <select
                className="form-input form-select"
                style={{ width: 'auto', padding: '6px 12px', fontSize: '0.8125rem' }}
                value={selectedCameraId}
                onChange={(e) => switchCamera(e.target.value)}
              >
                {cameras.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label || `Camera ${c.id.slice(0, 5)}`}
                  </option>
                ))}
              </select>
            )}

            {!isCameraActive ? (
              <button onClick={() => startCamera()} className="btn btn--primary">
                📷 Start Camera Scanner
              </button>
            ) : (
              <button onClick={stopCamera} className="btn btn--danger">
                🛑 Stop Camera
              </button>
            )}
          </div>
        </div>

        {isCameraActive && (
          <div className="card__body" style={{ background: '#fafafa', borderTop: '1px solid var(--border)', padding: 'var(--space-6)' }}>
            <div className="camera-scanner-container">
              <div className="camera-scanner-status">
                <span className="status-dot"></span>
                <span>{scanningStatus}</span>
              </div>

              {/* Html5Qrcode video mounting container */}
              <div id="qr-reader" className="camera-viewport"></div>

              <div className="camera-scanner-hint text-xs text-muted text-center mt-3">
                Hold the participant's QR code in front of the camera. The system will automatically detect the pass, verify, and check them into the Live Arena immediately!
              </div>
            </div>
          </div>
        )}

        {cameraError && (
          <div className="alert alert--error m-4">
            <span>⚠️</span>
            <span>{cameraError}</span>
          </div>
        )}
      </div>

      {/* ─── 2. MANUAL REGISTRATION ID SEARCH ────────────────────── */}
      <div className="checkin__search-card card mb-6">
        <div className="card__body">
          <form onSubmit={handleManualSearch} className="checkin__form">
            <div className="checkin__event-field">
              <label htmlFor="event-filter" className="form-label">Event</label>
              <select
                id="event-filter"
                className="form-input form-select checkin__select"
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.name}</option>
                ))}
              </select>
            </div>

            <div className="checkin__search-field">
              <label htmlFor="checkin-search-input" className="form-label">Manual Search / Paste Token</label>
              <div className="checkin__input-group">
                <input
                  ref={inputRef}
                  id="checkin-search-input"
                  type="text"
                  className="form-input checkin__input"
                  placeholder="Enter Reg ID (e.g. TEC-2026-4784) or Team Name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoComplete="off"
                />
                <button
                  type="submit"
                  id="checkin-submit-btn"
                  className={`btn btn--secondary checkin__submit-btn ${loading ? 'btn--loading' : ''}`}
                  disabled={loading || !search.trim()}
                >
                  {loading ? '' : 'Search'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="alert alert--error mb-6">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="alert alert--success mb-6" style={{ fontSize: '1rem', padding: 'var(--space-4) var(--space-5)' }}>
          <span>{successMsg}</span>
        </div>
      )}

      {/* ─── 3. VERIFIED PARTICIPANT RESULT CARD ──────────────────── */}
      {result && (
        <div className={`checkin__result card mb-6 ${result.checked_in ? 'checkin__result--checked' : ''}`}>
          <div className="card__header" style={{
            background: '#fafafa',
            borderBottom: '1px solid var(--border)',
            padding: 'var(--space-4) var(--space-6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--space-2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <span className="font-mono text-accent fw-bold text-lg">{result.registration_id}</span>
              <span className={`badge ${result.checked_in ? 'badge--checked' : 'badge--unchecked'}`}>
                {result.checked_in ? '✓ IN ARENA' : '⏳ PENDING CHECK-IN'}
              </span>
              <span className="badge badge--tag">{result.registration_type}</span>
            </div>

            <button className="btn btn--secondary btn--sm" onClick={handleClear}>
              ✕ Clear / Next
            </button>
          </div>

          <div className="card__body" style={{ padding: 'var(--space-6)' }}>
            <div className="checkin__result-grid">
              <div className="checkin__result-info">
                <h2 className="checkin__team-title">{result.team_name || result.leader_name}</h2>
                <div className="text-secondary text-sm mb-4">
                  📅 Event: <strong>{result.event_name || 'Technical Event'}</strong>
                </div>

                {/* Player 1 & Player 2 Details */}
                <div className="checkin__participants-box">
                  <span className="section__label">DUO TEAM MEMBERS (2 PLAYERS)</span>
                  <div className="checkin__participants-list">
                    {result.participants?.map((p, i) => (
                      <div key={i} className="checkin__participant-row">
                        <div className="checkin__participant-left">
                          <span className="badge badge--tag" style={{ fontSize: '0.65rem', marginRight: 'var(--space-2)' }}>
                            PLAYER {i + 1}
                          </span>
                          <div>
                            <div className="checkin__participant-name">
                              {p.full_name}
                            </div>
                            <div className="checkin__participant-meta">
                              📧 {p.email}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {result.checked_in && result.checked_in_at && (
                  <div className="checkin__timestamp-badge">
                    ✓ Checked into Arena on {formatDateTime(result.checked_in_at)}
                  </div>
                )}
              </div>

              {/* QR Token */}
              <div className="checkin__result-qr-panel">
                <div className="checkin__qr-wrap">
                  <QRCodeSVG
                    value={`${window.location.origin}/lookup?token=${result.qr_token}`}
                    size={120}
                    level="M"
                    fgColor="#000000"
                  />
                </div>
                <span className="font-mono text-xs text-muted mt-2">QR DESK PASS</span>
              </div>
            </div>
          </div>

          <div className="card__footer checkin__result-footer" style={{
            background: '#fafafa',
            borderTop: '1px solid var(--border)',
            padding: 'var(--space-4) var(--space-6)'
          }}>
            <div>
              {result.checked_in ? (
                <button
                  className={`btn btn--danger btn--sm ${checkinLoading ? 'btn--loading' : ''}`}
                  onClick={handleUndoCheckin}
                  disabled={checkinLoading}
                >
                  Undo Check-In
                </button>
              ) : (
                <button
                  className={`btn btn--primary btn--lg ${checkinLoading ? 'btn--loading' : ''}`}
                  onClick={() => handleManualCheckin()}
                  disabled={checkinLoading}
                >
                  {checkinLoading ? '' : 'Check In'}
                </button>
              )}
            </div>

            <button className="btn btn--secondary btn--sm" onClick={handleClear}>
              Ready for Next Participant
            </button>
          </div>
        </div>
      )}

      {/* ─── 4. LIVE QUEUES (INSIDE ARENA & PENDING) ──────────────── */}
      <div className="checkin__queues-grid">
        {/* Pending Check-Ins Queue */}
        <div className="checkin__queue-card card">
          <div className="card__header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 className="dashboard__section-title">⏳ Pending Entrance ({pendingCheckins.length})</h3>
            <button onClick={loadLiveQueues} className="btn btn--ghost btn--sm">↻ Refresh</button>
          </div>
          <div className="card__body" style={{ padding: 0 }}>
            {pendingCheckins.length === 0 ? (
              <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-muted)' }}>
                No pending registrations found.
              </div>
            ) : (
              <div className="checkin__queue-list">
                {pendingCheckins.map((r) => (
                  <div key={r.id} className="checkin__queue-item">
                    <div className="checkin__queue-item-info">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <span className="font-mono text-xs fw-bold text-accent">{r.registration_id}</span>
                        <span className="text-sm fw-bold text-primary">{r.team_name || r.leader_name}</span>
                      </div>
                      <div className="text-xs text-muted">
                        Registered {timeAgo(r.created_at)}
                      </div>
                    </div>
                    <button
                      className="btn btn--secondary btn--sm"
                      onClick={() => {
                        setResult(r);
                        handleManualCheckin(r);
                      }}
                    >
                      Check In
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recently Checked-In Queue */}
        <div className="checkin__queue-card card">
          <div className="card__header">
            <h3 className="dashboard__section-title">✅ Inside Arena ({recentCheckins.length})</h3>
          </div>
          <div className="card__body" style={{ padding: 0 }}>
            {recentCheckins.length === 0 ? (
              <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-muted)' }}>
                No participants checked in yet today.
              </div>
            ) : (
              <div className="checkin__queue-list">
                {recentCheckins.map((r) => (
                  <div key={r.id} className="checkin__queue-item">
                    <div className="checkin__queue-item-info">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <span className="badge badge--checked" style={{ fontSize: '0.65rem' }}>✓ IN ARENA</span>
                        <span className="text-sm fw-bold text-primary">{r.team_name || r.leader_name}</span>
                      </div>
                      <div className="text-xs text-muted font-mono">
                        {r.registration_id} · {r.checked_in_at ? formatDateTime(r.checked_in_at) : 'Checked In'}
                      </div>
                    </div>
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() => setResult(r)}
                    >
                      View
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
