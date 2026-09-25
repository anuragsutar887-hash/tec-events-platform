import { useState, useEffect } from 'react';
import { teacherService } from '../../services/teacherService';

export default function TeacherSettings() {
  const [teacher, setTeacher] = useState(null);

  useEffect(() => {
    teacherService.getCurrentTeacher().then((t) => setTeacher(t));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: '720px' }}>
      <div>
        <span className="section__label">PREFERENCES</span>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', fontWeight: 800, margin: '4px 0 2px' }}>
          Faculty Settings
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
          Manage your faculty profile and Test Platform integration credentials.
        </p>
      </div>

      <div className="card">
        <div className="card__header">
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', fontWeight: 800, margin: 0 }}>
            FACULTY PROFILE
          </h3>
        </div>
        <div className="card__body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-input"
              value={teacher?.full_name || 'Faculty Member'}
              readOnly
            />
          </div>

          <div className="form-group">
            <label className="form-label">Institutional Email</label>
            <input
              type="email"
              className="form-input"
              value={teacher?.email || 'faculty@indiraicem.ac.in'}
              readOnly
            />
          </div>

          <div className="form-group">
            <label className="form-label">Department</label>
            <input
              type="text"
              className="form-input"
              value={teacher?.department || 'Information Technology'}
              readOnly
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card__header">
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', fontWeight: 800, margin: 0 }}>
            TEST PLATFORM INTEGRATION STATUS
          </h3>
        </div>
        <div className="card__body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3)', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: '1.5rem' }}>⚡</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#15803d' }}>
                Supabase Edge Function Sync Active
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Questions and enrolled student rosters are transmitted directly to the secure test delivery portal via encrypted HTTPS API requests.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
