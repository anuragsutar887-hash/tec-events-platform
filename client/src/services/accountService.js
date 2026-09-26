import { supabase } from '../lib/supabaseClient';

const STORAGE_KEY = 'tec_user_accounts';
const SYNC_CHANNEL = 'tec_account_approvals_sync';

// Default pre-approved accounts to ensure zero downtime
const DEFAULT_ACCOUNTS = [
  {
    id: 'admin_super',
    full_name: 'Super Administrator',
    email: 'admin@indiraicem.ac.in',
    prn: null,
    department: 'Technical Committee',
    role: 'admin',
    status: 'approved',
    rejection_reason: null,
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
    updated_at: new Date().toISOString(),
    approved_at: new Date().toISOString(),
    approved_by: 'system',
  },
  {
    id: 'teacher_demo',
    full_name: 'Prof. Anjali Sharma',
    email: 'teacher@indiraicem.ac.in',
    prn: null,
    department: 'Information Technology',
    role: 'teacher',
    status: 'approved',
    rejection_reason: null,
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    updated_at: new Date().toISOString(),
    approved_at: new Date().toISOString(),
    approved_by: 'system',
  },
  {
    id: 'teacher_faculty',
    full_name: 'Faculty Coordinator',
    email: 'faculty@indiraicem.ac.in',
    prn: null,
    department: 'Information Technology',
    role: 'teacher',
    status: 'approved',
    rejection_reason: null,
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date().toISOString(),
    approved_at: new Date().toISOString(),
    approved_by: 'system',
  }
];

function getLocalAccounts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ACCOUNTS));
      return DEFAULT_ACCOUNTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_ACCOUNTS;
  } catch {
    return DEFAULT_ACCOUNTS;
  }
}

function saveLocalAccounts(accounts) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel(SYNC_CHANNEL);
      bc.postMessage({ type: 'ACCOUNTS_UPDATED', timestamp: Date.now() });
      bc.close();
    }
  } catch (e) {
    console.warn('LocalStorage save error in accountService:', e);
  }
}

export const accountService = {
  /**
   * Submit a new registration / account request.
   * NOTE: The password is NEVER stored here. Only identifying metadata is saved.
   */
  async createAccountRequest({ fullName, email, prn = null, department = null, role = 'student' }) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPrn = prn ? prn.trim().toUpperCase() : null;
    const cleanRole = role.toLowerCase();

    if (!cleanEmail) throw new Error('Email is required.');
    if (cleanRole === 'student' && !cleanPrn) throw new Error('PRN is required for student accounts.');

    // Check if an account already exists
    const existing = await this.getAccountByIdentifier({ email: cleanEmail, prn: cleanPrn });
    if (existing) {
      if (existing.status === 'approved') {
        throw new Error(
          cleanRole === 'student'
            ? `An approved account with PRN ${cleanPrn} already exists. Please Sign In.`
            : `An approved faculty account with email ${cleanEmail} already exists. Please Sign In.`
        );
      }
      if (existing.status === 'pending') {
        throw new Error(
          cleanRole === 'student'
            ? `An account request for PRN ${cleanPrn} is already pending administrator approval.`
            : `An account request for ${cleanEmail} is already pending administrator approval.`
        );
      }
      // If rejected, re-activate as pending
      return this.reapplyAccount(existing.id, { fullName, department });
    }

    const newAccount = {
      id: `${cleanRole}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      full_name: (fullName || '').trim(),
      email: cleanEmail,
      prn: cleanPrn,
      department: department ? department.trim() : (cleanRole === 'student' ? 'IT' : 'Information Technology'),
      role: cleanRole,
      status: 'pending', // Pending Admin confirmation!
      rejection_reason: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      approved_at: null,
      approved_by: null,
    };

    // 1. Try Supabase write
    try {
      const { data, error } = await supabase.from('user_accounts').insert(newAccount).select().single();
      if (!error && data) {
        // Also sync to local
        const local = getLocalAccounts();
        const filtered = local.filter(a => a.id !== newAccount.id);
        saveLocalAccounts([data, ...filtered]);
        return data;
      }
    } catch (e) {
      console.warn('Supabase account insert fallback to local:', e);
    }

    // 2. Local fallback
    const local = getLocalAccounts();
    const filtered = local.filter(a => a.id !== newAccount.id);
    saveLocalAccounts([newAccount, ...filtered]);
    return newAccount;
  },

  /**
   * Retrieve account by email or PRN.
   */
  async getAccountByIdentifier({ email, prn }) {
    const cleanEmail = email ? email.trim().toLowerCase() : null;
    const cleanPrn = prn ? prn.trim().toUpperCase() : null;

    // 1. Supabase check
    try {
      let query = supabase.from('user_accounts').select('*');
      if (cleanPrn) {
        query = query.or(`prn.ilike.${cleanPrn},email.ilike.${cleanPrn}@student.indiraicem.ac.in`);
      } else if (cleanEmail) {
        query = query.ilike('email', cleanEmail);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data[0];
      }
    } catch {}

    // 2. LocalStorage check
    const local = getLocalAccounts();
    const match = local.find(a => {
      if (cleanPrn && a.prn && a.prn.toUpperCase() === cleanPrn) return true;
      if (cleanEmail && a.email && a.email.toLowerCase() === cleanEmail) return true;
      return false;
    });

    return match || null;
  },

  /**
   * Check whether a user is approved to sign in.
   * Returns: { approved: boolean, status: 'approved' | 'pending' | 'rejected' | 'not_found', account }
   */
  async checkApproval({ email, prn, role = null }) {
    const account = await this.getAccountByIdentifier({ email, prn });
    if (!account) {
      return {
        approved: false,
        status: 'not_found',
        account: null,
        message: 'Account not found. Please register to request access.'
      };
    }

    if (account.status === 'approved') {
      return {
        approved: true,
        status: 'approved',
        account,
        message: 'Account is approved.'
      };
    }

    if (account.status === 'pending') {
      return {
        approved: false,
        status: 'pending',
        account,
        message: 'Your account is pending administrator approval. Please wait until the committee confirms your request.'
      };
    }

    if (account.status === 'rejected') {
      return {
        approved: false,
        status: 'rejected',
        account,
        message: account.rejection_reason
          ? `Your account request was declined: ${account.rejection_reason}`
          : 'Your account registration was not approved by the administrator.'
      };
    }

    return {
      approved: false,
      status: 'pending',
      account,
      message: 'Your account requires administrator verification.'
    };
  },

  /**
   * Get all accounts for Admin review.
   */
  async getAllAccounts({ role = 'all', status = 'all', search = '' } = {}) {
    let items = [];

    // 1. Try Supabase
    try {
      let query = supabase.from('user_accounts').select('*').order('created_at', { ascending: false });
      if (role !== 'all') query = query.eq('role', role);
      if (status !== 'all') query = query.eq('status', status);

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        items = data;
      }
    } catch {}

    // Merge or fallback to local
    const local = getLocalAccounts();
    const map = new Map();
    items.forEach(a => map.set(a.id, a));
    local.forEach(a => {
      if (!map.has(a.id)) map.set(a.id, a);
    });

    let merged = Array.from(map.values());

    if (role !== 'all') {
      merged = merged.filter(a => a.role === role);
    }
    if (status !== 'all') {
      merged = merged.filter(a => a.status === status);
    }
    if (search) {
      const q = search.toLowerCase();
      merged = merged.filter(a =>
        a.full_name?.toLowerCase().includes(q) ||
        a.email?.toLowerCase().includes(q) ||
        a.prn?.toLowerCase().includes(q) ||
        a.department?.toLowerCase().includes(q)
      );
    }

    return merged.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  },

  /**
   * Admin approves an account.
   */
  async approveAccount(id, adminEmail = 'admin@indiraicem.ac.in') {
    const patch = {
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: adminEmail,
      updated_at: new Date().toISOString(),
      rejection_reason: null,
    };

    // 1. Supabase update
    try {
      await supabase.from('user_accounts').update(patch).eq('id', id);
    } catch (e) {
      console.warn('Supabase approve error, synced locally:', e);
    }

    // 2. Local update
    const local = getLocalAccounts();
    const idx = local.findIndex(a => a.id === id);
    if (idx !== -1) {
      local[idx] = { ...local[idx], ...patch };
      saveLocalAccounts(local);
      return local[idx];
    }

    return { id, ...patch };
  },

  /**
   * Admin rejects an account.
   */
  async rejectAccount(id, reason = 'Declined by Administrator', adminEmail = 'admin@indiraicem.ac.in') {
    const patch = {
      status: 'rejected',
      rejection_reason: reason,
      updated_at: new Date().toISOString(),
      approved_by: adminEmail,
    };

    // 1. Supabase update
    try {
      await supabase.from('user_accounts').update(patch).eq('id', id);
    } catch (e) {
      console.warn('Supabase reject error, synced locally:', e);
    }

    // 2. Local update
    const local = getLocalAccounts();
    const idx = local.findIndex(a => a.id === id);
    if (idx !== -1) {
      local[idx] = { ...local[idx], ...patch };
      saveLocalAccounts(local);
      return local[idx];
    }

    return { id, ...patch };
  },

  /**
   * Re-apply when previously rejected.
   */
  async reapplyAccount(id, { fullName, department }) {
    const patch = {
      status: 'pending',
      full_name: fullName ? fullName.trim() : undefined,
      department: department ? department.trim() : undefined,
      rejection_reason: null,
      updated_at: new Date().toISOString(),
    };

    try {
      await supabase.from('user_accounts').update(patch).eq('id', id);
    } catch {}

    const local = getLocalAccounts();
    const idx = local.findIndex(a => a.id === id);
    if (idx !== -1) {
      local[idx] = { ...local[idx], ...patch };
      saveLocalAccounts(local);
      return local[idx];
    }
    return { id, ...patch };
  },

  /**
   * Admin permanently deletes an account (Teachers and Students).
   */
  async deleteAccount(id) {
    // 1. Supabase delete
    try {
      await supabase.from('user_accounts').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase delete error:', e);
    }

    // 2. Local delete
    const local = getLocalAccounts();
    const target = local.find(a => a.id === id);
    const filtered = local.filter(a => a.id !== id);
    saveLocalAccounts(filtered);

    // If currently logged in user matches deleted account, clear their session
    try {
      const studentSession = localStorage.getItem('participant_user');
      if (studentSession && target?.prn) {
        const s = JSON.parse(studentSession);
        if (s.prn?.toUpperCase() === target.prn.toUpperCase()) {
          localStorage.removeItem('participant_user');
        }
      }
    } catch {}

    try {
      const teacherSession = localStorage.getItem('tec_teacher_user');
      if (teacherSession && target?.email) {
        const t = JSON.parse(teacherSession);
        if (t.email?.toLowerCase() === target.email.toLowerCase()) {
          localStorage.removeItem('tec_teacher_user');
        }
      }
    } catch {}

    return { success: true };
  },

  /**
   * Quick count of pending approvals for badge counters.
   */
  async getPendingCount() {
    try {
      const { count, error } = await supabase
        .from('user_accounts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (!error && typeof count === 'number') {
        return count;
      }
    } catch {}

    const local = getLocalAccounts();
    return local.filter(a => a.status === 'pending').length;
  }
};
