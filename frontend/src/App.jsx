import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import AdminSidebar from './components/AdminSidebar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import { ForgotPassword, ResetPassword } from './pages/PasswordReset';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminSettings from './pages/AdminSettings';
import WeeklyPlanner from './pages/WeeklyPlanner';
import Resources from './pages/Resources';
import Setup from './pages/Setup';
import Account from './pages/Account';
import YearlyReport from './pages/YearlyReport';
import CurriculumAdmin from './pages/CurriculumAdmin';
import PhotoGallery from './pages/PhotoGallery';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import CookiePolicy from './pages/CookiePolicy';
import AcceptableUsePolicy from './pages/AcceptableUsePolicy';
import NotFound from './pages/NotFound';

function AdminLayout({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return (
    <div className="app-layout">
      <AdminSidebar />
      <main className="main-content">{children}</main>
    </div>
  );
}

function ParentLayout({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/dashboard" replace />;
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  );
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Landing />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/signup" element={user ? <Navigate to="/dashboard" replace /> : <Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Dashboard */}
      <Route path="/dashboard" element={
        user?.role === 'admin'
          ? <AdminLayout><AdminDashboard /></AdminLayout>
          : <ParentLayout><Dashboard /></ParentLayout>
      } />

      {/* Admin-only */}
      <Route path="/admin-settings"   element={<AdminLayout><AdminSettings /></AdminLayout>} />
      <Route path="/admin-curriculum" element={<AdminLayout><CurriculumAdmin /></AdminLayout>} />

      {/* Parent routes */}
      <Route path="/weekly"        element={<ParentLayout><WeeklyPlanner /></ParentLayout>} />
      <Route path="/resources"     element={<ParentLayout><Resources /></ParentLayout>} />
      <Route path="/gallery"       element={<ParentLayout><PhotoGallery /></ParentLayout>} />
      <Route path="/setup"         element={<ParentLayout><Setup /></ParentLayout>} />
      <Route path="/account"       element={<ParentLayout><Account /></ParentLayout>} />
      <Route path="/yearly-report" element={<ParentLayout><YearlyReport /></ParentLayout>} />

      {/* Legal pages — public, no auth required */}
      <Route path="/privacy"         element={<PrivacyPolicy />} />
      <Route path="/terms"           element={<TermsOfService />} />
      <Route path="/cookies"         element={<CookiePolicy />} />
      <Route path="/acceptable-use"  element={<AcceptableUsePolicy />} />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
