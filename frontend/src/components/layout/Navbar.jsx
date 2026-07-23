import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import logo from '../../assets/logo.png';
import './Navbar.css';

// SVG Icons
const IconDashboard = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"></rect>
    <rect x="14" y="3" width="7" height="7"></rect>
    <rect x="14" y="14" width="7" height="7"></rect>
    <rect x="3" y="14" width="7" height="7"></rect>
  </svg>
);

const IconBooks = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
  </svg>
);

const IconStudents = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const IconIssueReturn = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="17 1 21 5 17 9"></polyline>
    <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
    <polyline points="7 23 3 19 7 15"></polyline>
    <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
  </svg>
);

const IconTransactions = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
    <line x1="12" y1="18" x2="12" y2="12"></line>
    <line x1="16" y1="18" x2="16" y2="10"></line>
    <line x1="8" y1="18" x2="8" y2="14"></line>
  </svg>
);

const IconReports = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
  </svg>
);

const IconSettings = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>
);

const IconProfile = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const IconLogout = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
);

const IconBell = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
  </svg>
);

const Navbar = ({ isLoggedIn, userRole, onLogout }) => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleLogout = () => {
    localStorage.clear();
    if (onLogout) onLogout();
    navigate('/');
  };

  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [latestNotifs, setLatestNotifs] = useState([]);

  const handleMarkDropdownRead = async (id, e) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem('access_token');
      await fetch(`http://localhost:8000/api/v1/notifications/read/${id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      // Refresh local states
      setLatestNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (_) {}
  };

  const handleMarkAllDropdownRead = async (e) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem('access_token');
      await fetch(`http://localhost:8000/api/v1/notifications/read-all`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      setLatestNotifs(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (_) {}
  };

  // Poll for unread notifications every 30s when logged in
  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;

    const fetchUnread = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) return;
        const res = await fetch('http://localhost:8000/api/v1/notifications/', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setUnreadCount(data.filter(n => !n.read).length);
          setLatestNotifs(data.slice(0, 5));
        }
      } catch (_) {}
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [isLoggedIn]);

  // Logged-out Menu Links (Landing page navbar)
  const mainLinks = [
    { to: '/#home', label: 'Home', isHash: true, id: 'home' },
    { to: '/#features', label: 'Features', isHash: true, id: 'features' },
    { to: '/#about', label: 'About', isHash: true, id: 'about' },
    { to: '/#contact', label: 'Contact', isHash: true, id: 'contact' },
  ];

  // Logged-in Sidebar Config
  const isAdmin = userRole === 'admin';

  const bellIcon = (
    <div style={{ position: 'relative' }}>
      <button 
        onClick={(e) => {
          e.preventDefault();
          setNotifDropdownOpen(!notifDropdownOpen);
        }}
        style={{
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          color: 'inherit'
        }}
      >
        <span style={{ position: 'relative', display: 'inline-flex' }}>
          <IconBell />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: '-6px', right: '-8px',
              background: '#e4a81e', color: '#fff', borderRadius: '50%',
              width: '16px', height: '16px', fontSize: '10px',
              fontWeight: 'bold', display: 'flex', alignItems: 'center',
              justifyContent: 'center', lineHeight: 1
            }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </span>
      </button>

      {/* Popover Dropdown */}
      {notifDropdownOpen && (
        <div style={{
          position: 'absolute',
          bottom: '30px',
          left: '0',
          width: '280px',
          background: '#ffffff',
          border: '1px solid rgba(226,211,179,0.9)',
          borderRadius: '12px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          zIndex: 10000,
          padding: '0.75rem 0',
          animation: 'notifFadeIn 0.2s ease-out'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 0.85rem 0.5rem 0.85rem',
            borderBottom: '1px solid #f1f5f9',
            marginBottom: '0.5rem'
          }}>
            <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a' }}>Latest Updates</span>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllDropdownRead}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#d4a017',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Clear all
              </button>
            )}
          </div>

          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {latestNotifs.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
                No notifications
              </div>
            ) : (
              latestNotifs.map(notif => (
                <div 
                  key={notif.id}
                  onClick={() => {
                    setNotifDropdownOpen(false);
                    navigate('/notifications');
                  }}
                  style={{
                    padding: '0.6rem 0.85rem',
                    borderBottom: '1px solid #f8fafc',
                    cursor: 'pointer',
                    background: notif.read ? 'transparent' : '#fffbeb',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.15rem',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fefce8'}
                  onMouseLeave={e => e.currentTarget.style.background = notif.read ? 'transparent' : '#fffbeb'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#1e293b' }}>{notif.title}</span>
                    {!notif.read && (
                      <button
                        onClick={(e) => handleMarkDropdownRead(notif.id, e)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#d4a017',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          padding: '0 2px'
                        }}
                        title="Mark Read"
                      >
                        ✓
                      </button>
                    )}
                  </div>
                  <span style={{
                    fontSize: '0.75rem',
                    color: '#64748b',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {notif.message}
                  </span>
                </div>
              ))
            )}
          </div>

          <div style={{
            padding: '0.5rem 0.85rem 0 0.85rem',
            borderTop: '1px solid #f1f5f9',
            marginTop: '0.5rem',
            textAlign: 'center'
          }}>
            <Link 
              to="/notifications" 
              onClick={() => setNotifDropdownOpen(false)}
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#b8860b',
                textDecoration: 'none'
              }}
            >
              View all notification logs
            </Link>
          </div>
        </div>
      )}
    </div>
  );

  const sidebarLinks = isAdmin
    ? [
        { to: '/dashboard', label: 'Dashboard', icon: <IconDashboard /> },
        { to: '/search', label: 'Advanced Search', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg> },
        { to: '/books', label: 'Books', icon: <IconBooks /> },
        { to: '/barcodes', label: 'Barcodes & QR', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 7v10"/><path d="M10 7v10"/><path d="M13 7v10"/><path d="M17 7v10"/></svg> },
        { to: '/authors', label: 'Authors', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg> },
        { to: '/categories', label: 'Categories', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg> },
        { to: '/students', label: 'Students', icon: <IconStudents /> },
        { to: '/issue-return', label: 'Issue/Return', icon: <IconIssueReturn /> },
        { to: '/reservations', label: 'Reservations', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> },
        { to: '/fines', label: 'Fines', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg> },
        {to: '/transactions', label: 'Transactions', icon: <IconTransactions /> },
        {to: '/reports', label: 'Reports', icon: <IconReports /> },
        {to: '/audit-logs', label: 'Audit Logs', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> },
        {to: '/email-automation', label: 'Email Automation', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg> },
        {to: '/sms-automation', label: 'SMS Automation', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg> },
        {to: '/notifications', label: 'Notifications', icon: bellIcon },
        { to: '/settings', label: 'Settings', icon: <IconSettings /> },
      ]
    : [
        { to: '/dashboard', label: 'Dashboard', icon: <IconDashboard /> },
        { to: '/search', label: 'Advanced Search', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg> },
        { to: '/books', label: 'Book Catalogue', icon: <IconBooks /> },
        { to: '/my-books', label: 'My Books', icon: <IconBooks /> },
        { to: '/issued-books', label: 'Issued Books', icon: <IconIssueReturn /> },
        { to: '/reservations', label: 'Reservations', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> },
        { to: '/fines', label: 'My Fines', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg> },
        { to: '/notifications', label: 'Notifications', icon: bellIcon },
        { to: '/profile', label: 'Profile', icon: <IconProfile /> },
        { to: '/settings', label: 'Settings', icon: <IconSettings /> },
      ];


  if (isLoggedIn) {
    return (
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Link to="/dashboard" className="sidebar-logo">
            <img src={logo} alt="Smart Library" className="logo-img" />
            <span className="logo-text">Smart Library</span>
          </Link>
        </div>

        <nav className="sidebar-nav">
          <ul className="sidebar-menu">
            {sidebarLinks.map((link) => (
              <li key={link.label} className="sidebar-item">
                <NavLink
                  to={link.to}
                  className={({ isActive }) =>
                    isActive ? 'sidebar-link active' : 'sidebar-link'
                  }
                >
                  <span className="sidebar-icon">{link.icon}</span>
                  <span className="sidebar-label">{link.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="sidebar-logout-btn">
            <span className="sidebar-icon"><IconLogout /></span>
            <span className="sidebar-label">Logout</span>
          </button>
        </div>
      </aside>
    );
  }

  const [activeSection, setActiveSection] = useState('home');

  useEffect(() => {
    if (isLoggedIn) return;

    const handleScroll = () => {
      const sections = ['home', 'features', 'about', 'contact'];
      const scrollPos = window.scrollY + 120;

      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isLoggedIn]);

  const handleNavClick = (link, e) => {
    setIsMenuOpen(false);
    if (link.isHash) {
      const element = document.getElementById(link.id);
      if (element) {
        e.preventDefault();
        const offset = 80;
        const bodyRect = document.body.getBoundingClientRect().top;
        const elementRect = element.getBoundingClientRect().top;
        const elementPosition = elementRect - bodyRect;
        const offsetPosition = elementPosition - offset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
        window.history.pushState(null, '', link.to);
        setActiveSection(link.id);
      }
    }
  };

  // Fallback public navbar for landing / login / registration pages
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/#home" onClick={(e) => handleNavClick({ isHash: true, id: 'home', to: '/#home' }, e)} className="navbar-logo">
          <img src={logo} alt="Smart Library" className="logo-icon" />
          <span className="logo-copy">Smart Library</span>
        </Link>

        <ul className={`navbar-nav ${isMenuOpen ? 'active' : ''}`}>
          {mainLinks.map((link) => (
            <li key={link.to} className="nav-item">
              <a
                href={link.to}
                onClick={(e) => handleNavClick(link, e)}
                className={`nav-link ${activeSection === link.id ? 'active' : ''}`}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="navbar-actions">
          <Link to="/login" className="nav-btn login-btn">Login</Link>
          <button
            className={`navbar-menu ${isMenuOpen ? 'open' : ''}`}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler">☰</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;