import { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import * as XLSX from 'xlsx';

export default function TeacherStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const { data } = await apiClient.get('/admin/registrations');
        const regs = data?.registrations || [];
        const flatList = [];
        regs.forEach(r => {
          (r.participants || []).forEach(p => {
            flatList.push({
              ...p,
              eventName: r.event_name || r.events?.name || 'Department Event',
              teamName: r.team_name,
              regCode: r.registration_id,
              checkedIn: r.checked_in,
              status: r.status,
            });
          });
        });
        setStudents(flatList);
      } catch (err) {
        console.error('Failed to load students:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = students.filter(s =>
    s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase()) ||
    s.student_id?.toLowerCase().includes(search.toLowerCase()) ||
    s.eventName?.toLowerCase().includes(search.toLowerCase())
  );

  const handleExport = () => {
    const rows = filtered.map((s, idx) => ({
      '#': idx + 1,
      'Full Name': s.full_name,
      'PRN Number': s.student_id || s.prn || '—',
      'Email ID': s.email,
      'Department': s.department || 'IT',
      'Event Name': s.eventName,
      'Team Name': s.teamName,
      'Registration Code': s.regCode,
      'Attendance Checked-In': s.checkedIn ? 'YES' : 'NO',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Registered_Students');
    XLSX.writeFile(wb, 'Registered_Students_Roster.xlsx');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <span className="section__label">DIRECTORY</span>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', fontWeight: 800, margin: '4px 0 2px' }}>
            Registered Students
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            Official participant directory across all registered department events.
          </p>
        </div>

        <button type="button" className="btn btn--secondary btn--sm" onClick={handleExport} disabled={filtered.length === 0}>
          📥 Export Student Roster (.xlsx)
        </button>
      </div>

      <div className="card" style={{ padding: 'var(--space-3) var(--space-4)' }}>
        <input
          type="text"
          className="form-input"
          placeholder="Search by student name, PRN, email, or event name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
            <div className="skeleton skeleton-title" style={{ width: '40%', margin: '0 auto' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--space-10) var(--space-4)' }}>
            <div className="empty-state__icon">👥</div>
            <div className="empty-state__title">No registered students found</div>
            <p className="empty-state__text">Students will appear here as they register for events.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th>Student Name</th>
                  <th>PRN Number</th>
                  <th>Email ID</th>
                  <th>Event</th>
                  <th>Team</th>
                  <th>Attendance</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, idx) => (
                  <tr key={idx}>
                    <td className="font-mono text-xs">{idx + 1}</td>
                    <td className="fw-bold text-xs">{s.full_name}</td>
                    <td className="font-mono text-xs">{s.student_id || s.prn || '—'}</td>
                    <td className="text-xs text-muted">{s.email}</td>
                    <td className="text-xs fw-semibold">{s.eventName}</td>
                    <td className="font-mono text-xs">{s.teamName || 'Solo'}</td>
                    <td>
                      <span className={`badge ${s.checkedIn ? 'badge--success' : 'badge--tag'}`} style={{ fontSize: '0.65rem' }}>
                        {s.checkedIn ? 'Checked In' : 'Registered'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
