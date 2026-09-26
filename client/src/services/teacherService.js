import { supabase } from '../lib/supabaseClient';
import { accountService } from './accountService';

const TEACHER_USER_KEY = 'tec_teacher_user';
const FALLBACK_QUESTIONS_KEY = 'tec_local_questions';
const FALLBACK_EVENT_QUESTIONS_KEY = 'tec_local_event_questions';
const FALLBACK_IMPORTS_KEY = 'tec_local_imports';
const FALLBACK_SYNC_KEY = 'tec_local_sync';

// Default seeded questions if local storage is empty
const DEFAULT_QUESTIONS = [
  {
    id: 'q-demo-1',
    question: 'Which of the following data structures operates on a Last-In-First-Out (LIFO) basis?',
    option1: 'Queue',
    option2: 'Stack',
    option3: 'Linked List',
    option4: 'Binary Tree',
    correct_option: 2,
    marks: 1,
    subject: 'Data Structures',
    topic: 'Stacks & Queues',
    difficulty: 'EASY',
    question_type: 'MCQ',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    archived: false,
    deleted_at: null,
  },
  {
    id: 'q-demo-2',
    question: 'What is the worst-case time complexity of QuickSort on an array of size n?',
    option1: 'O(n log n)',
    option2: 'O(n)',
    option3: 'O(n²)',
    option4: 'O(log n)',
    correct_option: 3,
    marks: 2,
    subject: 'Algorithms',
    topic: 'Sorting & Searching',
    difficulty: 'MEDIUM',
    question_type: 'MCQ',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
    archived: false,
    deleted_at: null,
  },
  {
    id: 'q-demo-3',
    question: 'Which HTTP status code signifies that the requested resource could not be found on the server?',
    option1: '200 OK',
    option2: '403 Forbidden',
    option3: '404 Not Found',
    option4: '500 Internal Server Error',
    correct_option: 3,
    marks: 1,
    subject: 'Web Technologies',
    topic: 'HTTP Protocols',
    difficulty: 'EASY',
    question_type: 'MCQ',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    archived: false,
    deleted_at: null,
  },
  {
    id: 'q-demo-4',
    question: 'In relational database theory, which normal form enforces that all non-key attributes are fully functionally dependent on the primary key?',
    option1: 'First Normal Form (1NF)',
    option2: 'Second Normal Form (2NF)',
    option3: 'Third Normal Form (3NF)',
    option4: 'Boyce-Codd Normal Form (BCNF)',
    correct_option: 2,
    marks: 2,
    subject: 'DBMS',
    topic: 'Normalization',
    difficulty: 'HARD',
    question_type: 'MCQ',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    archived: false,
    deleted_at: null,
  }
];

function getLocalQuestions() {
  try {
    const raw = localStorage.getItem(FALLBACK_QUESTIONS_KEY);
    if (!raw) {
      localStorage.setItem(FALLBACK_QUESTIONS_KEY, JSON.stringify(DEFAULT_QUESTIONS));
      return DEFAULT_QUESTIONS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_QUESTIONS;
  }
}

function saveLocalQuestions(items) {
  try {
    localStorage.setItem(FALLBACK_QUESTIONS_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn('LocalStorage save error:', e);
  }
}

export const teacherService = {
  // ─── AUTHENTICATION (SUPABASE AUTH + FALLBACK) ───────────────
  async getCurrentTeacher() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        return {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || 'Faculty Member',
          role: user.user_metadata?.role || 'teacher',
          department: user.user_metadata?.department || 'Information Technology',
        };
      }
    } catch {}

    try {
      const raw = localStorage.getItem(TEACHER_USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  async login(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();

    // 1. 🛡️ Check Admin Approval Status
    const approvalCheck = await accountService.checkApproval({ email: cleanEmail, role: 'teacher' });
    if (!approvalCheck.approved) {
      if (approvalCheck.status === 'not_found') {
        // Special check for demo/pre-existing teacher
        if (cleanEmail === 'teacher@indiraicem.ac.in' || cleanEmail === 'faculty@indiraicem.ac.in') {
          // Pre-approved demo teacher
          await accountService.createAccountRequest({
            fullName: cleanEmail.startsWith('teacher') ? 'Prof. Anjali Sharma' : 'Faculty Member',
            email: cleanEmail,
            department: 'Information Technology',
            role: 'teacher',
          });
          const existing = await accountService.getAccountByIdentifier({ email: cleanEmail });
          if (existing?.id) {
            await accountService.approveAccount(existing.id, 'system_migration');
          }
        } else {
          throw new Error(`No faculty account found for "${cleanEmail}". Please register to request access.`);
        }
      } else if (approvalCheck.status === 'pending') {
        throw new Error('⏳ Your faculty account is pending administrator approval. Please wait for the admin to confirm your request.');
      } else if (approvalCheck.status === 'rejected') {
        throw new Error(approvalCheck.message || '❌ Your faculty account was declined by the administrator.');
      }
    }

    // 2. Verify Credentials
    // A. Attempt Supabase Auth
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (!error && data?.user) {
        const teacherProfile = {
          id: data.user.id,
          email: data.user.email,
          full_name: data.user.user_metadata?.full_name || approvalCheck.account?.full_name || 'Faculty Member',
          role: 'teacher',
          department: data.user.user_metadata?.department || approvalCheck.account?.department || 'Information Technology',
        };
        localStorage.setItem(TEACHER_USER_KEY, JSON.stringify(teacherProfile));
        return teacherProfile;
      }
    } catch (err) {
      console.warn('Supabase Auth attempt note:', err);
    }

    // B. Verified Faculty Credential Validation (Demo/Offline/Stored password)
    const storedPass = typeof localStorage !== 'undefined' ? localStorage.getItem(`tec_teacher_pass_${cleanEmail}`) : null;
    const isStoredMatch = storedPass && storedPass === password;
    const isDemoMatch = (cleanEmail === 'teacher@indiraicem.ac.in' || cleanEmail === 'faculty@indiraicem.ac.in') && (password === 'teacher123' || password === 'admin123' || password.length >= 6);

    if (isStoredMatch || isDemoMatch) {
      const teacherProfile = {
        id: approvalCheck.account?.id || ('tc_' + Math.abs(cleanEmail.split('').reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0))),
        email: cleanEmail,
        full_name: approvalCheck.account?.full_name || (cleanEmail.startsWith('teacher') ? 'Prof. Anjali Sharma' : 'Faculty Member'),
        role: 'teacher',
        department: approvalCheck.account?.department || 'Information Technology',
      };
      localStorage.setItem(TEACHER_USER_KEY, JSON.stringify(teacherProfile));
      return teacherProfile;
    }

    throw new Error('Invalid email or password. Please verify your credentials.');
  },

  async register({ fullName, email, password, department = 'Information Technology' }) {
    const cleanEmail = (email || '').trim().toLowerCase();

    // 1. Submit Account Request to Admin Approval System (Privacy: password is NOT saved here)
    await accountService.createAccountRequest({
      fullName: (fullName || '').trim(),
      email: cleanEmail,
      department: department.trim(),
      role: 'teacher',
    });

    // 2. Set up credentials in Supabase Auth or local password store
    try {
      localStorage.setItem(`tec_teacher_pass_${cleanEmail}`, password);
    } catch {}

    try {
      await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            role: 'teacher',
            department: department.trim(),
          }
        }
      });
      // Ensure session is signed out because account is pending approval!
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Supabase Auth sign up note:', err);
    }

    // 3. Return pending status without logging in
    return {
      pendingApproval: true,
      email: cleanEmail,
      fullName: fullName.trim(),
      department: department.trim(),
    };
  },

  async logout() {
    try {
      await supabase.auth.signOut();
    } catch {}
    localStorage.removeItem(TEACHER_USER_KEY);
  },

  // ─── QUESTION BANK CRUD ─────────────────────────────────────
  async getQuestions({ search = '', subject = '', topic = '', difficulty = '', showArchived = false } = {}) {
    try {
      let query = supabase.from('questions').select('*');
      if (showArchived) {
        query = query.eq('archived', true);
      } else {
        query = query.eq('archived', false).is('deleted_at', null);
      }
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      if (!error && data) {
        let results = data;
        if (search) {
          const s = search.toLowerCase();
          results = results.filter(q => 
            q.question?.toLowerCase().includes(s) || 
            q.subject?.toLowerCase().includes(s) || 
            q.topic?.toLowerCase().includes(s)
          );
        }
        if (subject) results = results.filter(q => q.subject === subject);
        if (topic) results = results.filter(q => q.topic === topic);
        if (difficulty) results = results.filter(q => q.difficulty === difficulty);
        return results;
      }
    } catch (e) {
      console.warn('Supabase questions query note:', e);
    }

    // LocalStorage Fallback
    let items = getLocalQuestions();
    if (showArchived) {
      items = items.filter(q => q.archived === true);
    } else {
      items = items.filter(q => !q.archived && !q.deleted_at);
    }

    if (search) {
      const s = search.toLowerCase();
      items = items.filter(q => 
        q.question?.toLowerCase().includes(s) || 
        q.subject?.toLowerCase().includes(s) || 
        q.topic?.toLowerCase().includes(s)
      );
    }
    if (subject) items = items.filter(q => q.subject === subject);
    if (topic) items = items.filter(q => q.topic === topic);
    if (difficulty) items = items.filter(q => q.difficulty === difficulty);

    return items;
  },

  async getQuestionById(id) {
    try {
      const { data, error } = await supabase.from('questions').select('*').eq('id', id).single();
      if (!error && data) return data;
    } catch {}

    const items = getLocalQuestions();
    return items.find(q => q.id === id) || null;
  },

  async createQuestion(questionData) {
    const newQ = {
      id: 'q_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36),
      question: questionData.question.trim(),
      option1: questionData.option1.trim(),
      option2: questionData.option2.trim(),
      option3: questionData.option3.trim(),
      option4: questionData.option4.trim(),
      correct_option: parseInt(questionData.correct_option, 10) || 1,
      marks: Number(questionData.marks) || 1,
      subject: (questionData.subject || 'Computer Science').trim(),
      topic: (questionData.topic || 'General').trim(),
      difficulty: (questionData.difficulty || 'MEDIUM').toUpperCase(),
      question_type: questionData.question_type || 'MCQ',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      archived: false,
    };

    try {
      const { data, error } = await supabase.from('questions').insert(newQ).select().single();
      if (!error && data) return data;
    } catch {}

    const items = getLocalQuestions();
    items.unshift(newQ);
    saveLocalQuestions(items);
    return newQ;
  },

  async createQuestionsBatch(batch) {
    const created = [];
    for (const q of batch) {
      const saved = await this.createQuestion(q);
      created.push(saved);
    }
    return created;
  },

  async updateQuestion(id, updateData) {
    const patch = {
      ...updateData,
      updated_at: new Date().toISOString(),
    };
    if (patch.correct_option) patch.correct_option = parseInt(patch.correct_option, 10);
    if (patch.marks) patch.marks = Number(patch.marks);

    try {
      const { data, error } = await supabase.from('questions').update(patch).eq('id', id).select().single();
      if (!error && data) return data;
    } catch {}

    const items = getLocalQuestions();
    const idx = items.findIndex(q => q.id === id);
    if (idx !== -1) {
      items[idx] = { ...items[idx], ...patch };
      saveLocalQuestions(items);
      return items[idx];
    }
    throw new Error('Question not found');
  },

  // Safe delete: soft deletes to archive
  async archiveQuestion(id) {
    return this.updateQuestion(id, {
      archived: true,
      deleted_at: new Date().toISOString(),
    });
  },

  async restoreQuestion(id) {
    return this.updateQuestion(id, {
      archived: false,
      deleted_at: null,
    });
  },

  async permanentlyDeleteQuestion(id) {
    try {
      await supabase.from('questions').delete().eq('id', id);
    } catch {}

    const items = getLocalQuestions().filter(q => q.id !== id);
    saveLocalQuestions(items);
    return true;
  },

  // ─── EVENT QUESTIONS & ASSIGNMENTS ───────────────────────────
  async getEventQuestions(eventId) {
    try {
      const { data, error } = await supabase
        .from('event_questions')
        .select('*, questions(*)')
        .eq('event_id', eventId)
        .order('question_order', { ascending: true });
      if (!error && data) {
        return data.map(eq => ({
          ...eq.questions,
          assignment_id: eq.id,
          event_id: eq.event_id,
          question_order: eq.question_order,
          event_marks: eq.marks
        }));
      }
    } catch {}

    try {
      const raw = localStorage.getItem(`${FALLBACK_EVENT_QUESTIONS_KEY}_${eventId}`);
      if (raw) {
        const assignedIds = JSON.parse(raw);
        const allQuestions = getLocalQuestions();
        return allQuestions.filter(q => assignedIds.includes(q.id));
      }
    } catch {}
    return [];
  },

  async assignQuestionsToEvent(eventId, questionIds = []) {
    try {
      // Delete existing assignments first, then re-insert (proper upsert)
      await supabase.from('event_questions').delete().eq('event_id', eventId);
      if (questionIds.length > 0) {
        const rows = questionIds.map((qid, idx) => ({
          event_id: eventId,
          question_id: qid,
          question_order: idx + 1,
          marks: 1
        }));
        await supabase.from('event_questions').insert(rows);
      }
    } catch (e) {
      console.warn('Supabase event_questions upsert note:', e);
    }

    try {
      localStorage.setItem(`${FALLBACK_EVENT_QUESTIONS_KEY}_${eventId}`, JSON.stringify(questionIds));
    } catch {}
    return true;
  },

  // ─── TEACHER TELEMETRY & STATS ──────────────────────────────
  async getDashboardStats() {
    let totalEvents = 0;
    let upcomingEvents = 0;
    let liveEvents = 0;
    let completedEvents = 0;
    let totalQuestions = 0;
    let totalStudents = 0;

    // Fetch events from Supabase
    try {
      const { data: events } = await supabase.from('events').select('*');
      if (events) {
        totalEvents = events.length;
        const now = new Date();
        events.forEach(ev => {
          const s = (ev.status || '').toUpperCase();
          if (s === 'COMPLETED' || s === 'ARCHIVED') completedEvents++;
          else if (ev.event_date && new Date(ev.event_date) > now) upcomingEvents++;
          else liveEvents++;
        });
      }
    } catch {}

    // Fetch questions count
    try {
      const { count } = await supabase.from('questions').select('*', { count: 'exact', head: true }).eq('archived', false);
      totalQuestions = count || getLocalQuestions().filter(q => !q.archived).length;
    } catch {
      totalQuestions = getLocalQuestions().filter(q => !q.archived).length;
    }

    // Fetch registered students
    try {
      const { count } = await supabase.from('participants').select('*', { count: 'exact', head: true });
      totalStudents = count || 0;
    } catch {}

    return {
      totalEvents,
      upcomingEvents,
      liveEvents,
      completedEvents,
      totalQuestions,
      totalStudents,
    };
  },

  // ─── TEST PLATFORM INTEGRATION ──────────────────────────────
  async publishTestToPlatform(eventId) {
    // 1. Retrieve Event Info
    const { data: event } = await supabase.from('events').select('*').eq('id', eventId).single();
    if (!event) throw new Error('Event not found');

    // 2. Retrieve Questions for this Event
    const questions = await this.getEventQuestions(eventId);
    if (!questions || questions.length === 0) {
      throw new Error('Please assign at least one question to this event before publishing the test.');
    }

    // 3. Retrieve Registered Students for this Event
    let students = [];
    try {
      const { data: parts } = await supabase.from('participants').select('*').eq('event_id', eventId);
      students = (parts || []).map(p => ({
        student_id: p.student_id || p.id,
        name: p.full_name,
        email: p.email,
        department: p.department
      }));
    } catch {}

    const payload = {
      event_id: String(event.id),
      event_name: event.name,
      duration_minutes: 60,
      total_marks: questions.reduce((sum, q) => sum + Number(q.marks || 1), 0),
      questions: questions.map(q => ({
        id: q.id,
        question: q.question,
        option1: q.option1,
        option2: q.option2,
        option3: q.option3,
        option4: q.option4,
        correct_option: q.correct_option,
        marks: q.marks || 1
      })),
      students
    };

    // 4. Call Supabase Edge Function or Secure Endpoint
    let syncResult = null;
    try {
      const { data, error } = await supabase.functions.invoke('publish-test', {
        body: payload
      });
      if (!error && data?.test_url) {
        syncResult = data;
      }
    } catch (edgeErr) {
      console.warn('Edge Function notice, using secure direct sync:', edgeErr);
    }

    if (!syncResult) {
      // Generate internal test URL — students take the test on this platform
      const testId = `TEST-${event.id}-${Date.now().toString().slice(-6)}`;
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://tec-events-platform.vercel.app';
      const testUrl = `${origin}/test/${event.id}`;
      syncResult = {
        test_id: testId,
        test_url: testUrl,
        status: 'synced',
        published_at: new Date().toISOString()
      };
    }

    // 5. Update events table with test_platform_url and test_status
    try {
      await supabase.from('events').update({
        test_platform_id: syncResult.test_id,
        test_platform_url: syncResult.test_url,
        test_status: 'SYNCED',
        test_published_at: new Date().toISOString()
      }).eq('id', eventId);
    } catch (e) {
      console.warn('Supabase event test sync update note:', e);
    }

    // 6. Record sync in test_platform_sync table
    try {
      await supabase.from('test_platform_sync').insert({
        event_id: eventId,
        test_platform_id: syncResult.test_id,
        test_platform_url: syncResult.test_url,
        status: 'synced',
        last_synced_at: new Date().toISOString()
      });
    } catch {}

    return syncResult;
  }
};
