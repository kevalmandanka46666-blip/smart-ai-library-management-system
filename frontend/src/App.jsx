import React, { useState, useEffect, lazy, Suspense, Component } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import './App.css';

// Global Error Boundary Component
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '2rem', textAlign: 'center', background: '#fdfcf9' }}>
          <h2 style={{ color: '#dc2626' }}>Something went wrong.</h2>
          <p>Please refresh the page or contact the system administrator if the issue persists.</p>
          <button 
            onClick={() => window.location.reload()} 
            style={{ padding: '0.6rem 1.25rem', border: 'none', borderRadius: '8px', background: '#D4A017', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Lazy load route pages for performance optimization & smaller bundle sizes
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const AdminLogin = lazy(() => import('./components/adminlogin'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Books = lazy(() => import('./pages/Books'));
const BookDetailPage = lazy(() => import('./pages/BookDetails'));
const Students = lazy(() => import('./pages/Students'));
const IssueReturn = lazy(() => import('./pages/IssueReturn'));
const Transactions = lazy(() => import('./pages/Transactions'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));
const MyBooks = lazy(() => import('./pages/MyBooks'));
const IssuedBooks = lazy(() => import('./pages/IssuedBooks'));
const Profile = lazy(() => import('./pages/Profile'));
const Authors = lazy(() => import('./pages/Authors'));
const Categories = lazy(() => import('./pages/Categories'));
const Fines = lazy(() => import('./pages/Fines'));
const Reservations = lazy(() => import('./pages/Reservations'));
const Notifications = lazy(() => import('./pages/Notifications'));
const AdvancedSearch = lazy(() => import('./pages/AdvancedSearch'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const BarcodeManagement = lazy(() => import('./pages/BarcodeManagement'));
const EmailAutomation = lazy(() => import('./pages/EmailAutomation'));
const SmsAutomation = lazy(() => import('./pages/SmsAutomation'));

// Public layout wrapper (hides sidebar, shows standard navigation and copyright footer)
const PublicLayout = () => {
  return (
    <div className="App">
      <Navbar isLoggedIn={false} userRole="" />
      <main className="app-main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

// Protected layout wrapper (requires active login, renders the permanent left sidebar layout)
const ProtectedLayout = ({ isLoggedIn, userRole, handleLogout }) => {
  if (!isLoggedIn) {
    // If not logged in at all, redirect to root login
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="App has-sidebar">
      <Navbar isLoggedIn={true} userRole={userRole} onLogout={handleLogout} />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
};

// Role-based authorization checker
const RoleGuard = ({ userRole, requiredRole, children }) => {
  const normRole = userRole === 'user' ? 'member' : userRole;
  if (requiredRole === 'admin' && normRole !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  if (requiredRole === 'member' && normRole !== 'member' && normRole !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  return children ? children : <Outlet />;
};

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const token = localStorage.getItem('access_token');
    const user = localStorage.getItem('user');
    return !!(token && user);
  });

  const [userRole, setUserRole] = useState(() => {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        return userData.role || 'user';
      } catch {
        return 'user';
      }
    }
    return '';
  });

  useEffect(() => {
    // Keep local states synchronized if local storage changes
    const handleStorageChange = () => {
      const token = localStorage.getItem('access_token');
      const user = localStorage.getItem('user');
      if (token && user) {
        setIsLoggedIn(true);
        try {
          const userData = JSON.parse(user);
          setUserRole(userData.role || 'user');
        } catch {
          setUserRole('user');
        }
      } else {
        setIsLoggedIn(false);
        setUserRole('');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleLoginSuccess = (user, token, refreshTokenStr) => {
    localStorage.setItem('access_token', token);
    if (refreshTokenStr) {
      localStorage.setItem('refresh_token', refreshTokenStr);
    }
    localStorage.setItem('user', JSON.stringify(user));
    setIsLoggedIn(true);
    setUserRole(user.role || 'user');
  };

  const handleLogout = () => {
    localStorage.clear();
    setIsLoggedIn(false);
    setUserRole('');
  };

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f8fafc' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid rgba(212,160,23,0.15)', borderTopColor: '#D4A017', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          </div>
        }>
          <Routes>
            {/* Public Routes with standard navigation navbar and footer */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={
                isLoggedIn ? <Navigate to="/dashboard" replace /> : <LoginPage onLoginSuccess={handleLoginSuccess} />
              } />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/admin" element={
                isLoggedIn ? <Navigate to="/dashboard" replace /> : <AdminLogin onLoginSuccess={handleLoginSuccess} />
              } />
            </Route>

            {/* Protected Dashboard and Configuration routes (both admin and user can access) */}
            <Route element={<ProtectedLayout isLoggedIn={isLoggedIn} userRole={userRole} handleLogout={handleLogout} />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/settings" element={<Settings />} />

              {/* Shared routes: both admin and members can browse book catalogue and view profile */}
              <Route path="/books" element={<Books />} />
              <Route path="/books/:id" element={<BookDetailPage />} />
              <Route path="/fines" element={<Fines />} />
              <Route path="/reservations" element={<Reservations />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/search" element={<AdvancedSearch />} />
              <Route path="/profile" element={<Profile />} />

              {/* Admin Specific Protected Routes */}
              <Route element={<RoleGuard userRole={userRole} requiredRole="admin" />}>
                <Route path="/students" element={<Students />} />
                <Route path="/barcodes" element={<BarcodeManagement />} />
                <Route path="/issue-return" element={<IssueReturn />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/authors" element={<Authors />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/audit-logs" element={<AuditLogs />} />
                <Route path="/email-automation" element={<EmailAutomation />} />
                <Route path="/sms-automation" element={<SmsAutomation />} />
              </Route>

              {/* User Specific Protected Routes */}
              <Route element={<RoleGuard userRole={userRole} requiredRole="member" />}>
                <Route path="/my-books" element={<MyBooks />} />
                <Route path="/issued-books" element={<IssuedBooks />} />
              </Route>
            </Route>

            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;