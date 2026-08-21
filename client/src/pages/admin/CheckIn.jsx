import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { BrowserMultiFormatReader } from '@zxing/browser';
import jsQR from 'jsqr';
import apiClient from '../../api/client';
import { formatDateTime, timeAgo } from '../../utils/dateHelpers';
import { QRCodeSVG } from 'qrcode.react';
import './CheckIn.css';

// 🔊 Audio synthesizer for instant scan feedback (Zero external assets needed)
const playSuccessBeep = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // High pitch clear chime (A5)
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
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

  // 📷 High-Speed Camera Scanner State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [scanningStatus, setScanningStatus] = useState('Standby');
  const [scanSuccessFlash, setScanSuccessFlash] = useState(false);

  const videoRef = useRef(null);
  const zxingControlsRef = useRef(null);
  const zxingReaderRef = useRef(null);
  const fallbackLoopRef = useRef(null);
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

  // ─── 📷 ZXing Industrial-Grade Camera Scanner Engine ──────────────
  const startCamera = async (deviceIdToUse = null) => {
    setCameraError('');
    setIsCameraActive(true);
    setScanningStatus('Accessing camera hardware...');

    try {
      // 1. Enumerate available video inputs
      let devices = [];
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        devices = allDevices.filter((d) => d.kind === 'videoinput');
        setCameras(devices);
      } catch {}

      // 2. Select camera device ID
      let targetDeviceId = deviceIdToUse;
      if (!targetDeviceId && devices.length > 0) {
        const rearCam = devices.find((d) =>
          d.label.toLowerCase().includes('back') ||
          d.label.toLowerCase().includes('rear') ||
          d.label.toLowerCase().includes('environment')
        );
        targetDeviceId = rearCam ? rearCam.deviceId : devices[0].deviceId;
      }
      setSelectedCameraId(targetDeviceId || '');

      // 3. Initialize ZXing MultiFormat Reader with hints
      const codeReader = new BrowserMultiFormatReader();
      zxingReaderRef.current = codeReader;

      setScanningStatus('Active — Point QR code at camera');

      // 4. Start continuous decoding from video element
      if (videoRef.current) {
        const controls = await codeReader.decodeFromVideoDevice(
          targetDeviceId || undefined,
          videoRef.current,
          (scanResult, scanErr) => {
            if (scanResult && scanResult.getText()) {
              handleQrScanSuccess(scanResult.getText());
            }
          }
        );
        zxingControlsRef.current = controls;

        // 5. Run Secondary High-Speed Native BarcodeDetector / jsQR Scanner in parallel
        startFallbackScanLoop();
      }
    } catch (err) {
      console.error('Camera start error:', err);
      setCameraError('Camera access denied or unavailable. Please verify browser camera permissions.');
      setIsCameraActive(false);
    }
  };

  const switchCamera = async (deviceId) => {
    stopCamera();
    startCamera(deviceId);
  };

  const stopCamera = () => {
    if (zxingControlsRef.current) {
      try {
        zxingControlsRef.current.stop();
      } catch {}
      zxingControlsRef.current = null;
    }

    if (fallbackLoopRef.current) {
      cancelAnimationFrame(fallbackLoopRef.current);
      fallbackLoopRef.current = null;
    }

    if (videoRef.current && videoRef.current.srcObject) {
      try {
        const stream = videoRef.current.srcObject;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      } catch {}
    }

    setIsCameraActive(false);
    setScanningStatus('Standby');
    isProcessingScanRef.current = false;
  };

  // Secondary high-speed canvas decoder running alongside ZXing for 100% detection coverage
  const startFallbackScanLoop = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    let barcodeDetector = null;
    if ('BarcodeDetector' in window) {
      try {
        barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
      } catch {}
    }

    const loop = async () => {
      if (!videoRef.current || videoRef.current.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        fallbackLoopRef.current = requestAnimationFrame(loop);
        return;
      }

      if (!isProcessingScanRef.current) {
        const video = videoRef.current;

        // Native BarcodeDetector (instant GPU decode)
        if (barcodeDetector) {
          try {
            const barcodes = await barcodeDetector.detect(video);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              handleQrScanSuccess(barcodes[0].rawValue);
            }
          } catch {}
        }

        // jsQR full-frame processor
        if (!isProcessingScanRef.current && video.videoWidth > 0) {
          try {
            if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
            }
            ctx.drawImage(video, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'attemptBoth',
            });
            if (code && code.data) {
              handleQrScanSuccess(code.data);
            }
          } catch {}
        }
      }

      fallbackLoopRef.current = requestAnimationFrame(loop);
    };

    fallbackLoopRef.current = requestAnimationFrame(loop);
  };

  // ─── ⚡ Instant Auto Check-In Handler ───────────────────────────
  const handleQrScanSuccess = async (decodedText) => {
    if (isProcessingScanRef.current) return;
    isProcessingScanRef.current = true;

    // Visual & Audio triggers
    setScanSuccessFlash(true);
    playSuccessBeep();
    setScanningStatus('⚡ QR Detected! Verifying and checking in...');

    setTimeout(() => setScanSuccessFlash(false), 800);

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
        setError(`Scanned QR code is not associated with any active registration.`);
        setScanningStatus('Active — Point participant QR code at camera');
        setTimeout(() => {
          isProcessingScanRef.current = false;
        }, 1500);
        return;
      }

      // Automatically Execute Instant Check-In in Supabase
      if (!reg.checked_in) {
        await apiClient.put(`/admin/registrations/${reg.id}/checkin`);
        reg.checked_in = true;
        reg.checked_in_at = new Date().toISOString();
        setSuccessMsg(`🎉 CHECKED IN TO ARENA: ${reg.team_name || reg.registration_id} (Player 1 & Player 2)`);
      } else {
        setSuccessMsg(`ℹ️ Already Checked In: ${reg.team_name || reg.registration_id}`);
      }

      setResult(reg);
      loadLiveQueues();
      setScanningStatus('✓ Success! Ready for next participant.');

      // 2-second cooldown to let the admin comfortably transition to next student
      setTimeout(() => {
        isProcessingScanRef.current = false;
        setScanningStatus('Active — Point participant QR code at camera');
      }, 2000);
    } catch (err) {
      console.error('Scan processing error:', err);
      setError('Check-in failed for scanned QR pass. Please verify details.');
      setScanningStatus('Active — Point participant QR code at camera');
      setTimeout(() => {
        isProcessingScanRef.current = false;
      }, 1500);
    }
  };

  const parseSearchQuery = (raw) => {
    let q = (raw || '').trim();
    if (!q) return { type: 'query', value: '' };

    // 1. Extract from URL parameter e.g. https://domain.com/lookup?token=UUID
    if (q.includes('token=')) {
      const match = q.match(/token=([0-9a-fA-F-]+)/i);
      if (match) return { type: 'token', value: match[1] };
    }

    // 2. Direct UUID match e.g. 3f8373e2-8ea5-4bb6-b8db-0d4181ea8b39
    const uuidMatch = q.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/i);
    if (uuidMatch) {
      return { type: 'token', value: uuidMatch[0] };
    }

    // 3. Direct Registration ID match e.g. TEC-2026-4784
    const regMatch = q.match(/TEC-\d{4}-\d{4}/i);
    if (regMatch) {
      return { type: 'query', value: regMatch[0].toUpperCase() };
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
          <p className="dashboard__subtitle">Sub-second QR pass scanner for instant participant verification & live leaderboard sync</p>
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

      {/* ─── 📷 1. HIGH-SPEED LIVE CAMERA QR SCANNER SECTION ──────── */}
      <div className="checkin__camera-card card mb-6">
        <div className="card__header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div>
            <span className="section__label" style={{ marginBottom: 0 }}>HARDWARE TELEMETRY</span>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
              📷 INSTANT CAMERA QR SCANNER
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
                  <option key={c.deviceId} value={c.deviceId}>
                    {c.label || `Camera (${c.deviceId.slice(0, 5)}...)`}
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
                <span className={`status-dot ${scanSuccessFlash ? 'status-dot--success' : ''}`}></span>
                <span>{scanningStatus}</span>
              </div>

              {/* Hardware Video Stream Viewport */}
              <div className={`camera-viewport ${scanSuccessFlash ? 'camera-viewport--flash' : ''}`}>
                <video ref={videoRef} className="camera-video-element" autoPlay playsInline muted />
                <div className="camera-viewfinder-overlay">
                  <div className="viewfinder-corner top-left"></div>
                  <div className="viewfinder-corner top-right"></div>
                  <div className="viewfinder-corner bottom-left"></div>
                  <div className="viewfinder-corner bottom-right"></div>
                  <div className="viewfinder-laser"></div>
                </div>
              </div>

              <div className="camera-scanner-hint text-xs text-muted text-center mt-3">
                Hold the participant's QR pass in front of the lens. The dual-engine decoder will verify and check them into the Live Arena in under 1 second!
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
                    size={140}
                    level="L"
                    includeMargin={true}
                    fgColor="#000000"
                    bgColor="#ffffff"
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
