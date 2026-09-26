import { useState, useEffect } from 'react';
import { accountService } from '../../services/accountService';
import './AccountManagement.css';

export default function AccountManagement() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all'); // all | student | teacher
  const [statusFilter, setStatusFilter] = useState('all'); // all | pending | approved | rejected

  // Action states
  const [processingId, setProcessingId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Reject modal state
  const [rejectingAccount, setRejectingAccount] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // Delete modal state
  const [deletingAccount, setDeletingAccount] = useState(null);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const data = await accountService.getAllAccounts({
        role: roleFilter,
        status: statusFilter,
        search,
      });
      setAccounts(data);
    } catch (err) {
      console.error('Failed to load accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, [roleFilter, statusFilter, search]);

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleApprove = async (id, name) => {
    setProcessingId(id);
    try {
      await accountService.approveAccount(id);
      showFeedback('success', `✓ Successfully approved access for ${name}!`);
      loadAccounts();
    } catch (err) {
      showFeedback('error', 'Failed to approve account: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenReject = (account) => {
    setRejectingAccount(account);
    setRejectReason('Details could not be verified by committee administration.');
  };

  const handleConfirmReject = async () => {
    if (!rejectingAccount) return;
    setProcessingId(rejectingAccount.id);
    try {
      await accountService.rejectAccount(rejectingAccount.id, rejectReason);
      showFeedback('info', `Account request for ${rejectingAccount.full_name} has been declined.`);
      setRejectingAccount(null);
      loadAccounts();
    } catch (err) {
      showFeedback('error', 'Failed to reject account: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenDelete = (account) => {
    setDeletingAccount(account);
  };

  const handleConfirmDelete = async () => {
    if (!deletingAccount) return;
    setProcessingId(deletingAccount.id);
    try {
      await accountService.deleteAccount(deletingAccount.id);
      showFeedback('success', `🗑️ Account for ${deletingAccount.full_name} has been permanently deleted.`);
      setDeletingAccount(null);
      loadAccounts();
    } catch (err) {
      showFeedback('error', 'Failed to delete account: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveAllPending = async () => {
    const pendingList = accounts.filter((a) => a.status === 'pending');
    if (pendingList.length === 0) return;
    if (!window.confirm(`Approve all ${pendingList.length} pending account requests at once?`)) return;

    setLoading(true);
    try {
      for (const item of pendingList) {
        await accountService.approveAccount(item.id);
      }
      showFeedback('success', `✓ All ${pendingList.length} pending accounts have been confirmed and approved!`);
      loadAccounts();
    } catch (err) {
      showFeedback('error', 'Error in batch approval: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Quick stats
  const pendingCount = accounts.filter((a) => a.status === 'pending').length;
  const teacherCount = accounts.filter((a) => a.role === 'teacher').length;
  const studentCount = accounts.filter((a) => a.role === 'student').length;

  return (
    <div className="account-mgmt-page">
      {/* Header */}
      <div className="account-mgmt-header">
        <div>
          <span className="section__label">USER GOVERNANCE & ACCESS CONTROL</span>
          <h1 className="account-mgmt-title">User Accounts & Approvals</h1>
          <p className="account-mgmt-subtitle">
            Review, confirm, and manage portal accounts for students and teachers. Administrators have full authority to approve, reject, or permanently delete accounts.
          </p>
        </div>

        {pendingCount > 0 && (
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={handleApproveAllPending}
          >
            ✓ Approve All Pending ({pendingCount})
          </button>
        )}
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div className={`alert alert--${feedback.type === 'error' ? 'error' : 'success'} mb-4`}>
          <span>{feedback.type === 'error' ? '⚠️' : '✓'}</span>
          <span>{feedback.message}</span>
        </div>
      )}

      {/* 🔒 Zero-Knowledge Privacy Guarantee Banner */}
      <div className="account-mgmt-privacy-banner card mb-6">
        <div className="account-mgmt-privacy-inner">
          <span className="account-mgmt-privacy-shield">🔒</span>
          <div>
            <strong>Zero-Knowledge Privacy Standard:</strong> User passwords are cryptographically secured and are{' '}
            <strong>never accessible or visible</strong> in this administrative dashboard. This protects user privacy while granting administrators full control over account authorization and deletion rights.
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="account-mgmt-stats">
        <div className={`card account-stat-card ${pendingCount > 0 ? 'highlight-pending' : ''}`}>
          <div className="account-stat-label">Pending Approvals</div>
          <div className="account-stat-val text-warning">{pendingCount}</div>
          <div className="account-stat-sub">
            {pendingCount === 0 ? 'All requests confirmed' : 'Requires administrator action'}
          </div>
        </div>

        <div className="card account-stat-card">
          <div className="account-stat-label">Faculty Accounts</div>
          <div className="account-stat-val">{teacherCount}</div>
          <div className="account-stat-sub">Question bank managers</div>
        </div>

        <div className="card account-stat-card">
          <div className="account-stat-label">Student Accounts</div>
          <div className="account-stat-val">{studentCount}</div>
          <div className="account-stat-sub">Registered test candidates</div>
        </div>

        <div className="card account-stat-card">
          <div className="account-stat-label">Total Registered</div>
          <div className="account-stat-val">{accounts.length}</div>
          <div className="account-stat-sub">Across all user roles</div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="card account-mgmt-controls mb-6">
        <div className="account-controls-row">
          <div className="account-search-box">
            <input
              type="text"
              className="form-input"
              placeholder="Search by name, PRN, email, or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="account-filter-groups">
            <select
              className="form-input account-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">All Roles (Students & Teachers)</option>
              <option value="student">Students Only</option>
              <option value="teacher">Teachers Only</option>
            </select>

            <select
              className="form-input account-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="pending">⏳ Pending Review Only</option>
              <option value="approved">🟢 Approved Active</option>
              <option value="rejected">🔴 Rejected</option>
            </select>

            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={loadAccounts}
              title="Refresh list"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="card account-table-card">
        {loading ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
            <div className="skeleton skeleton-title" style={{ width: '40%', margin: '0 auto' }} />
          </div>
        ) : accounts.length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--space-10) var(--space-4)' }}>
            <div className="empty-state__icon">👥</div>
            <div className="empty-state__title">No accounts found</div>
            <p className="empty-state__text">
              {search || roleFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your search criteria or filter options.'
                : 'No accounts have been registered on the platform yet.'}
            </p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th>User Details</th>
                  <th style={{ width: '130px' }}>Role</th>
                  <th style={{ width: '150px' }}>Identifier</th>
                  <th>Email Address</th>
                  <th style={{ width: '140px' }}>Status</th>
                  <th style={{ width: '110px' }}>Date</th>
                  <th style={{ width: '190px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((acc, idx) => (
                  <tr key={acc.id} className={acc.status === 'pending' ? 'row-pending' : ''}>
                    <td className="font-mono text-muted text-xs">{idx + 1}</td>
                    <td>
                      <div className="account-user-cell">
                        <div className={`account-avatar ${acc.role}`}>
                          {acc.full_name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="account-user-name">{acc.full_name}</div>
                          {acc.rejection_reason && (
                            <div className="account-reject-hint" title={acc.rejection_reason}>
                              Reason: {acc.rejection_reason}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${acc.role === 'teacher' ? 'badge--teacher' : 'badge--student'}`}>
                        {acc.role === 'teacher' ? '👨‍🏫 TEACHER' : '🎓 STUDENT'}
                      </span>
                    </td>
                    <td>
                      {acc.role === 'student' ? (
                        <span className="font-mono fw-bold text-xs" title="Student PRN">
                          {acc.prn || '—'}
                        </span>
                      ) : (
                        <span className="text-xs text-muted" title="Department">
                          {acc.department || 'IT'}
                        </span>
                      )}
                    </td>
                    <td>
                      <a href={`mailto:${acc.email}`} className="text-xs text-secondary font-mono">
                        {acc.email}
                      </a>
                    </td>
                    <td>
                      {acc.status === 'approved' && (
                        <span className="badge badge--success">🟢 APPROVED</span>
                      )}
                      {acc.status === 'pending' && (
                        <span className="badge badge--warning animate-pulse">🟡 PENDING</span>
                      )}
                      {acc.status === 'rejected' && (
                        <span className="badge badge--danger">🔴 DECLINED</span>
                      )}
                    </td>
                    <td>
                      <span className="text-xs text-muted font-mono">
                        {acc.created_at ? new Date(acc.created_at).toLocaleDateString() : '—'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="account-action-btns">
                        {acc.status === 'pending' ? (
                          <>
                            <button
                              type="button"
                              className="btn btn--primary btn--xs btn--approve"
                              onClick={() => handleApprove(acc.id, acc.full_name)}
                              disabled={processingId === acc.id}
                              title="Confirm and grant access"
                            >
                              ✓ Approve
                            </button>
                            <button
                              type="button"
                              className="btn btn--secondary btn--xs btn--reject"
                              onClick={() => handleOpenReject(acc)}
                              disabled={processingId === acc.id}
                              title="Decline access request"
                            >
                              ✕ Reject
                            </button>
                          </>
                        ) : acc.status === 'approved' ? (
                          <button
                            type="button"
                            className="btn btn--secondary btn--xs"
                            onClick={() => handleOpenReject(acc)}
                            disabled={processingId === acc.id}
                            title="Revoke access"
                          >
                            Revoke
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn--secondary btn--xs btn--approve"
                            onClick={() => handleApprove(acc.id, acc.full_name)}
                            disabled={processingId === acc.id}
                            title="Re-approve access"
                          >
                            ✓ Re-Approve
                          </button>
                        )}

                        {/* Admin Right: Permanently Delete Account */}
                        <button
                          type="button"
                          className="btn btn--danger btn--xs btn--delete"
                          onClick={() => handleOpenDelete(acc)}
                          disabled={processingId === acc.id}
                          title="Permanently delete user account"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── MODAL 1: REJECT ACCOUNT CONFIRMATION ────────────────── */}
      {rejectingAccount && (
        <div className="account-modal-overlay" onClick={() => setRejectingAccount(null)}>
          <div className="account-modal-dialog card" onClick={(e) => e.stopPropagation()}>
            <div className="card__header">
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                Decline Account Request
              </h3>
            </div>
            <div className="card__body">
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
                Are you sure you want to decline registration for <strong>{rejectingAccount.full_name}</strong> (
                {rejectingAccount.role === 'student' ? `PRN: ${rejectingAccount.prn}` : rejectingAccount.email})?
              </p>

              <div className="form-group">
                <label className="form-label">Decline Reason (Visible to applicant)</label>
                <textarea
                  rows={3}
                  className="form-input"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Could not verify enrollment records..."
                />
              </div>
            </div>
            <div className="card__footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => setRejectingAccount(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--danger btn--sm"
                onClick={handleConfirmReject}
                disabled={processingId === rejectingAccount.id}
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: DELETE ACCOUNT CONFIRMATION ────────────────── */}
      {deletingAccount && (
        <div className="account-modal-overlay" onClick={() => setDeletingAccount(null)}>
          <div className="account-modal-dialog card" onClick={(e) => e.stopPropagation()}>
            <div className="card__header" style={{ borderBottom: '2px solid #dc2626' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.4rem' }}>⚠️</span>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', fontWeight: 900, margin: 0, color: '#dc2626' }}>
                  PERMANENT ACCOUNT DELETION
                </h3>
              </div>
            </div>
            <div className="card__body">
              <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 'var(--space-3)', lineHeight: 1.5 }}>
                You are about to permanently delete the account of:
              </p>

              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-sm)', padding: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#991b1b' }}>{deletingAccount.full_name}</div>
                <div style={{ fontSize: '0.8rem', color: '#7f1d1d', marginTop: '2px' }}>
                  Role: <strong>{deletingAccount.role.toUpperCase()}</strong> •{' '}
                  {deletingAccount.role === 'student' ? `PRN: ${deletingAccount.prn}` : deletingAccount.email}
                </div>
              </div>

              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                This action is irreversible. The user will be completely logged out and stripped of access. They will need to submit a new registration request if they wish to access the platform in the future.
              </p>
            </div>
            <div className="card__footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => setDeletingAccount(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--danger btn--sm"
                onClick={handleConfirmDelete}
                disabled={processingId === deletingAccount.id}
                style={{ background: '#dc2626', borderColor: '#dc2626', color: '#fff', fontWeight: 800 }}
              >
                Yes, Delete Account Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
