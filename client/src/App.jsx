import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigationType } from 'react-router-dom';


// Layout
import PublicHeader from './components/layout/PublicHeader';
import Footer from './components/layout/Footer';
import AdminLayout from './components/layout/AdminLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';

// Public pages
import Home from './pages/public/Home';
import Events from './pages/public/Events';
import EventDetail from './pages/public/EventDetail';
import Register from './pages/public/Register';
import RegisterSuccess from './pages/public/RegisterSuccess';
import Lookup from './pages/public/Lookup';
import Leaderboard from './pages/public/Leaderboard';
import ResetPassword from './pages/public/ResetPassword';

// Admin pages
import AdminLogin from './pages/admin/Login';
import Dashboard from './pages/admin/Dashboard';
import AdminEvents from './pages/admin/AdminEvents';
import EventForm from './pages/admin/EventForm';
import AdminRegistrations from './pages/admin/AdminRegistrations';
import CheckIn from './pages/admin/CheckIn';
import OnsiteRegistration from './pages/admin/OnsiteRegistration';
import Settings from './pages/admin/Settings';

// Student auth
import { StudentAuthProvider } from './context/StudentAuthContext';
import StudentLogin from './pages/public/StudentLogin';

// Automatically scrolls to top on forward navigation only (not browser back)
function ScrollToTop() {
  const { pathname } = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    // POP = back/forward button — let the browser restore scroll naturally
    if (navType === 'POP') return;
    window.scrollTo(0, 0);
  }, [pathname, navType]);

  return null;
}

function PublicLayout({ children }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <PublicHeader />
      <main style={{ flex: 1 }}>{children}</main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <StudentAuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          {/* ── Public routes (Pure public site) ────────────────────────────── */}
          <Route path="/" element={
            <PublicLayout><Home /></PublicLayout>
          } />
          <Route path="/login" element={
            <PublicLayout><StudentLogin /></PublicLayout>
          } />
        <Route path="/events" element={
          <PublicLayout><Events /></PublicLayout>
        } />
        <Route path="/events/:slug" element={
          <PublicLayout><EventDetail /></PublicLayout>
        } />
        <Route path="/events/:slug/register" element={
          <PublicLayout><Register /></PublicLayout>
        } />
        <Route path="/events/:slug/register/success" element={
          <PublicLayout><RegisterSuccess /></PublicLayout>
        } />
        <Route path="/lookup" element={
          <PublicLayout><Lookup /></PublicLayout>
        } />
        <Route path="/leaderboard" element={
          <PublicLayout><Leaderboard isAdminView={false} /></PublicLayout>
        } />
        <Route path="/standings" element={
          <PublicLayout><Leaderboard isAdminView={false} /></PublicLayout>
        } />
        <Route path="/leaderboard/:eventSlug" element={
          <PublicLayout><Leaderboard isAdminView={false} /></PublicLayout>
        } />
        <Route path="/reset-password" element={
          <PublicLayout><ResetPassword /></PublicLayout>
        } />

        {/* ── Admin auth ────────────────────────────────────────────────── */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/reset-password" element={<ResetPassword isAdminView={true} />} />

        {/* ── Admin protected routes (Enclosed inside AdminLayout) ────────── */}
        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminLayout>
              <Dashboard />
            </AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/events" element={
          <ProtectedRoute>
            <AdminLayout>
              <AdminEvents />
            </AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/events/new" element={
          <ProtectedRoute>
            <AdminLayout>
              <EventForm />
            </AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/events/:id/edit" element={
          <ProtectedRoute>
            <AdminLayout>
              <EventForm />
            </AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/registrations" element={
          <ProtectedRoute>
            <AdminLayout>
              <AdminRegistrations />
            </AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/checkin" element={
          <ProtectedRoute>
            <AdminLayout>
              <CheckIn />
            </AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/onsite" element={
          <ProtectedRoute>
            <AdminLayout>
              <OnsiteRegistration />
            </AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/arena" element={
          <ProtectedRoute>
            <AdminLayout>
              <Leaderboard isAdminView={true} />
            </AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/arena/:eventSlug" element={
          <ProtectedRoute>
            <AdminLayout>
              <Leaderboard isAdminView={true} />
            </AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/settings" element={
          <ProtectedRoute>
            <AdminLayout>
              <Settings />
            </AdminLayout>
          </ProtectedRoute>
        } />

        {/* ── Fallback ──────────────────────────────────────────────────── */}
        <Route path="*" element={
          <PublicLayout>
            <div className="container section" style={{ textAlign: 'center', padding: 'var(--space-24) var(--space-6)' }}>
              <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }}>404</div>
              <h1 style={{ fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-3)', color: 'var(--text-primary)' }}>
                Page Not Found
              </h1>
              <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-8)' }}>
                The page you're looking for doesn't exist.
              </p>
              <a href="/" className="btn btn--primary">Go Home</a>
            </div>
          </PublicLayout>
        } />
      </Routes>
    </BrowserRouter>
  </StudentAuthProvider>
  );
}
