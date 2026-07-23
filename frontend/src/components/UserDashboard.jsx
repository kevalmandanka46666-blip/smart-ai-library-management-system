import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getStudentBorrows, getFines, getNotifications, getActiveReservations, browseBooks } from '../services/api';
import { 
  BookOpen, 
  Clock, 
  Bookmark, 
  Coins, 
  AlertTriangle, 
  ArrowRight, 
  Search, 
  User, 
  FileText, 
  Bell, 
  CheckCircle2, 
  Sparkles,
  Zap,
  TrendingUp,
  Inbox
} from 'lucide-react';
import { AnalyticsCard } from './layout/EnterpriseLibrary';
import '../styles/design-tokens.css';
import '../pages/Dashboard.css';

// ─── Mini Reading Progress Ring ───────────────────────────────────
const ProgressRing = memo(({ value, max, color = '#D4A017', size = 60, label }) => {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const dash = pct * circ;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(226,211,179,0.3)" strokeWidth="8" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
      </svg>
      <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>{label}</span>
    </div>
  );
});

// ─── Stat Card using AnalyticsCard ─────────────────────────────────
const StatCard = memo(({ Icon, label, value, color, bg, sub, urgent, to }) => {
  const navigate = useNavigate();
  return (
    <AnalyticsCard
      title={label}
      value={value}
      subtitle={sub}
      trend={urgent ? 'Urgent' : undefined}
      trendUp={urgent ? false : undefined}
      icon={<Icon size={24} color={color} />}
      onClick={to ? () => navigate(to) : undefined}
    />
  );
});

// ─── Quick Action Button ───────────────────────────────────────────
const QuickAction = memo(({ to, Icon, label, color, bg, border }) => (
  <Link
    to={to}
    style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      padding: '0.8rem 1rem', borderRadius: '10px',
      background: bg, border: `1.5px solid ${border}`,
      textDecoration: 'none', fontWeight: '700', fontSize: '0.88rem', color,
      transition: 'all 0.2s ease'
    }}
  >
    <Icon size={18} />
    {label}
  </Link>
));

// ─── Timeline Event ────────────────────────────────────────────────
const TimelineEvent = memo(({ Icon, title, subtitle, date, color }) => (
  <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
    <div style={{
      width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
      background: `${color}18`, border: `2px solid ${color}30`,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <Icon size={16} color={color} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontWeight: '700', fontSize: '0.84rem', color: '#1e1b15', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
      <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.1rem' }}>{subtitle} · {date}</div>
    </div>
  </div>
));

// ─── Book Recommendation Card ──────────────────────────────────────
const BookCard = memo(({ book }) => (
  <div style={{
    padding: '1rem', borderRadius: '10px',
    border: '1.5px solid rgba(226,211,179,0.35)',
    background: '#fdfcf9', display: 'flex', flexDirection: 'column', gap: '0.45rem',
    transition: 'all 0.2s ease'
  }}>
    <div style={{ fontWeight: '800', fontSize: '0.88rem', color: '#1e1b15', lineHeight: 1.3 }}>
      {book.title && book.title.length > 40 ? book.title.slice(0, 40) + '…' : book.title}
    </div>
    <div style={{ fontSize: '0.78rem', color: '#5c5549' }}>by {book.author || 'Unknown'}</div>
    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
      {book.genre && (
        <span style={{ fontSize: '0.7rem', background: 'rgba(212,160,23,0.1)', color: '#b3861b', padding: '0.15rem 0.5rem', borderRadius: '20px', fontWeight: '700' }}>
          {book.genre}
        </span>
      )}
      {book.is_available && (
        <span style={{ fontSize: '0.7rem', background: 'rgba(22,163,74,0.1)', color: '#16a34a', padding: '0.15rem 0.5rem', borderRadius: '20px', fontWeight: '700' }}>
          Available
        </span>
      )}
    </div>
  </div>
));

// ─── Main UserDashboard Component ──────────────────────────────────
const UserDashboard = ({ userName }) => {
  const [borrowedBooks, setBorrowedBooks] = useState([]);
  const [reservedBooks, setReservedBooks] = useState([]);
  const [fines, setFines] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [recommendedBooks, setRecommendedBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const currentUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
  }, []);
  const studentId = currentUser.username || 'STU-001';

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [borrowRes, reserveRes, fineRes, notifRes, booksRes] = await Promise.allSettled([
        getStudentBorrows(studentId),
        getActiveReservations(),
        getFines(false),
        getNotifications(),
        browseBooks({ page: 1, page_size: 8, sort_by: 'created_at', sort_order: 'desc' })
      ]);

      setBorrowedBooks(borrowRes.status === 'fulfilled' ? (borrowRes.value || []) : []);
      setReservedBooks(reserveRes.status === 'fulfilled' ? (reserveRes.value || []) : []);

      if (fineRes.status === 'fulfilled') {
        const fd = fineRes.value;
        const allFines = fd?.fines || (Array.isArray(fd) ? fd : []);
        setFines(allFines.filter(f => !f.student_id || f.student_id === studentId));
      }

      setNotifications(notifRes.status === 'fulfilled' ? (notifRes.value || []) : []);
      setRecommendedBooks(booksRes.status === 'fulfilled' ? (booksRes.value?.books || []) : []);
    } catch {
      setError('Some dashboard sections failed to load. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { loadData(); }, [loadData]);

  const activeBooks = useMemo(() => borrowedBooks.filter(b => b.status === 'issued'), [borrowedBooks]);
  const overdueBooks = useMemo(() => activeBooks.filter(b => new Date(b.due_date) < new Date()), [activeBooks]);
  const dueSoonBooks = useMemo(() => activeBooks.filter(b => {
    const dueDate = new Date(b.due_date);
    const now = new Date();
    return dueDate >= now && dueDate < new Date(now.getTime() + 3 * 86400000);
  }), [activeBooks]);
  const returnedBooks = useMemo(() => borrowedBooks.filter(b => b.status === 'returned'), [borrowedBooks]);
  const totalFineAmount = useMemo(() => fines.reduce((s, f) => s + (f.amount || 0), 0), [fines]);
  const unreadNotifs = useMemo(() => notifications.filter(n => !n.read), [notifications]);

  const totalRead = returnedBooks.length;
  const readingGoal = 12;
  const readingProgress = Math.min(totalRead, readingGoal);

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem 0' }}>
        <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: '100px', borderRadius: '14px', background: 'linear-gradient(90deg, #f5ecd5 25%, #fdf9f0 50%, #f5ecd5 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: '3rem' }}>

      {/* ── Welcome Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1b15 0%, #2d2820 50%, #3a3125 100%)',
        borderRadius: '20px', padding: '2rem 2.5rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        boxShadow: '0 12px 40px rgba(20,18,15,0.2)', flexWrap: 'wrap', gap: '1.5rem',
        marginTop: '24px', marginBottom: '24px'
      }}>
        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#D4A017', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>
            {getGreeting()}
          </div>
          <h2 style={{ margin: 0, fontSize: '1.9rem', fontWeight: '900', color: '#fff', lineHeight: 1.2 }}>
            Welcome back, <span style={{ color: '#D4A017' }}>{userName || 'Member'}</span>
          </h2>
          <p style={{ margin: '0.6rem 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '0.88rem' }}>
            Here's your personalised library overview for today.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <ProgressRing value={readingProgress} max={readingGoal} color="#D4A017" size={70} label={`${readingProgress}/${readingGoal} Read`} />
          <ProgressRing value={activeBooks.length} max={5} color="#3b82f6" size={70} label="Borrowed" />
          <ProgressRing value={unreadNotifs.length} max={Math.max(unreadNotifs.length, 5)} color={unreadNotifs.length > 0 ? '#ef4444' : '#16a34a'} size={70} label="Unread Alerts" />
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '0.9rem 1.25rem', borderRadius: '12px', fontWeight: '700', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '24px', marginBottom: '24px' }}>
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      {/* ── KPI Stats Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginTop: '24px', marginBottom: '24px' }}>
        <StatCard Icon={BookOpen} label="Currently Borrowed" value={activeBooks.length} color="#D4A017" bg="rgba(212,160,23,0.1)" sub={`${returnedBooks.length} returned total`} to="/issued-books" />
        <StatCard Icon={Clock} label="Due Soon (3 days)" value={dueSoonBooks.length} color={dueSoonBooks.length > 0 ? '#ea580c' : '#16a34a'} bg={dueSoonBooks.length > 0 ? 'rgba(234,88,12,0.1)' : 'rgba(22,163,74,0.1)'} sub="need return" urgent={dueSoonBooks.length > 0} to="/issued-books" />
        <StatCard Icon={Bookmark} label="Active Reservations" value={reservedBooks.length} color="#3b82f6" bg="rgba(59,130,246,0.1)" sub="in queue or ready" to="/reservations" />
        <StatCard Icon={Coins} label="Outstanding Fines" value={`₹${totalFineAmount.toFixed(2)}`} color={totalFineAmount > 0 ? '#dc2626' : '#16a34a'} bg={totalFineAmount > 0 ? 'rgba(220,38,38,0.1)' : 'rgba(22,163,74,0.1)'} sub={`${fines.length} fine record${fines.length !== 1 ? 's' : ''}`} urgent={totalFineAmount > 0} to="/fines" />
      </div>

      {/* ── Overdue Alert Banner ── */}
      {overdueBooks.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #fef2f2, #fff5f5)', border: '2px solid rgba(220,38,38,0.25)',
          borderRadius: '14px', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem',
          marginTop: '24px', marginBottom: '24px'
        }}>
          <AlertTriangle size={28} color="#dc2626" />
          <div>
            <div style={{ fontWeight: '800', color: '#b91c1c', fontSize: '0.95rem' }}>
              {overdueBooks.length} book{overdueBooks.length > 1 ? 's are' : ' is'} overdue!
            </div>
            <div style={{ fontSize: '0.82rem', color: '#dc2626', marginTop: '0.2rem' }}>
              Please return: {overdueBooks.map(b => `"${b.book_title}"`).join(', ')} — fines accumulate daily.
            </div>
          </div>
          <Link to="/fines" style={{ marginLeft: 'auto', padding: '0.6rem 1.2rem', background: '#dc2626', color: '#fff', textDecoration: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.82rem', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            View Fines <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* ── Main 2-Col Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '24px', alignItems: 'start', marginTop: '24px', marginBottom: '24px' }}>

        {/* ── Left Column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Currently Borrowed Books */}
          <div style={{ background: '#fff', borderRadius: '16px', padding: '1.75rem', border: '1px solid rgba(226,211,179,0.45)', boxShadow: '0 4px 16px rgba(20,18,15,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h4 style={{ margin: 0, fontWeight: '800', color: '#1e1b15', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BookOpen size={18} color="#D4A017" /> Currently Borrowed
              </h4>
              <Link to="/issued-books" style={{ fontSize: '0.8rem', fontWeight: '700', color: '#D4A017', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>View All <ArrowRight size={14} /></Link>
            </div>
            {activeBooks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#9ca3af' }}>
                <Inbox size={40} style={{ marginBottom: '0.5rem', opacity: 0.6 }} />
                <div style={{ fontWeight: '600', fontSize: '0.88rem' }}>No books borrowed currently.</div>
                <Link to="/books" style={{ display: 'inline-block', marginTop: '0.75rem', padding: '0.5rem 1.25rem', background: '#D4A017', color: '#fff', textDecoration: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.82rem' }}>Browse Books</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {activeBooks.map(b => {
                  const isOverdue = new Date(b.due_date) < new Date();
                  const isDueSoon = !isOverdue && new Date(b.due_date) < new Date(Date.now() + 3 * 86400000);
                  const daysLeft = Math.ceil((new Date(b.due_date) - new Date()) / 86400000);
                  return (
                    <div key={b.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '0.9rem 1rem', borderRadius: '10px', gap: '1rem', flexWrap: 'wrap',
                      background: isOverdue ? '#fef2f2' : isDueSoon ? '#fffbeb' : '#f9fafb',
                      border: `1.5px solid ${isOverdue ? 'rgba(220,38,38,0.2)' : isDueSoon ? 'rgba(234,88,12,0.2)' : 'rgba(226,211,179,0.3)'}`,
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#1e1b15', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.book_title}</div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.15rem' }}>Borrowed {formatDate(b.issue_date)} · Due {formatDate(b.due_date)}</div>
                      </div>
                      <span style={{
                        fontSize: '0.75rem', fontWeight: '800', padding: '0.25rem 0.65rem', borderRadius: '20px', whiteSpace: 'nowrap',
                        background: isOverdue ? '#fee2e2' : isDueSoon ? '#ffedd5' : '#dcfce7',
                        color: isOverdue ? '#b91c1c' : isDueSoon ? '#c2410c' : '#166534'
                      }}>
                        {isOverdue ? `${Math.abs(daysLeft)}d overdue` : isDueSoon ? `Due in ${daysLeft}d` : `${daysLeft}d left`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Reservations */}
          <div style={{ background: '#fff', borderRadius: '16px', padding: '1.75rem', border: '1px solid rgba(226,211,179,0.45)', boxShadow: '0 4px 16px rgba(20,18,15,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h4 style={{ margin: 0, fontWeight: '800', color: '#1e1b15', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Bookmark size={18} color="#3b82f6" /> Active Reservations
              </h4>
              <Link to="/reservations" style={{ fontSize: '0.8rem', fontWeight: '700', color: '#D4A017', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>Manage <ArrowRight size={14} /></Link>
            </div>
            {reservedBooks.length === 0 ? (
              <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.87rem', textAlign: 'center', padding: '1.5rem 0' }}>No active reservations.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {reservedBooks.map(b => (
                  <div key={b.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.75rem 1rem', background: '#f9fafb', borderRadius: '8px', border: '1px solid rgba(226,211,179,0.3)'
                  }}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.87rem', color: '#1e1b15' }}>{b.book_title}</div>
                      <div style={{ fontSize: '0.74rem', color: '#9ca3af', marginTop: '0.1rem' }}>Reserved {formatDate(b.reserved_at)}</div>
                    </div>
                    <span style={{
                      fontSize: '0.72rem', fontWeight: '800', padding: '0.2rem 0.6rem', borderRadius: '20px',
                      background: b.status === 'ready' ? '#dcfce7' : '#fef3c7',
                      color: b.status === 'ready' ? '#166534' : '#d97706'
                    }}>
                      {b.status === 'ready' ? '✓ Ready for Pickup' : 'In Queue'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reading Statistics */}
          <div style={{ background: '#fff', borderRadius: '16px', padding: '1.75rem', border: '1px solid rgba(226,211,179,0.45)', boxShadow: '0 4px 16px rgba(20,18,15,0.04)' }}>
            <h4 style={{ margin: '0 0 1.25rem', fontWeight: '800', color: '#1e1b15', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={18} color="#D4A017" /> Reading Statistics
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              {[
                { label: 'Total Read', value: totalRead, color: '#D4A017', Icon: BookOpen, to: '/my-books' },
                { label: 'Active Borrows', value: activeBooks.length, color: '#3b82f6', Icon: Clock, to: '/issued-books' },
                { label: 'Overdue', value: overdueBooks.length, color: overdueBooks.length > 0 ? '#dc2626' : '#16a34a', Icon: AlertTriangle, to: '/issued-books' },
                { label: 'Reservations', value: reservedBooks.length, color: '#8b5cf6', Icon: Bookmark, to: '/reservations' },
              ].map(stat => (
                <div key={stat.label} style={{ textAlign: 'center', padding: '1rem', borderRadius: '12px', background: '#fdfcf9', border: '1.5px solid rgba(226,211,179,0.3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.4rem' }}>
                    <stat.Icon size={20} color={stat.color} />
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: '900', color: stat.color }}>{stat.value}</div>
                  <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#9ca3af', marginTop: '0.15rem' }}>{stat.label}</div>
                </div>
              ))}
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#5c5549' }}>Annual Reading Goal</span>
                <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#D4A017' }}>{totalRead} / {readingGoal} books</span>
              </div>
              <div style={{ background: '#f1f5f9', borderRadius: '99px', height: '10px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min((totalRead / readingGoal) * 100, 100)}%`, height: '100%', borderRadius: '99px', background: 'linear-gradient(90deg, #D4A017, #b3861b)', transition: 'width 0.8s ease' }} />
              </div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.4rem' }}>
                {totalRead >= readingGoal ? 'Goal achieved! Set a new target.' : `${readingGoal - totalRead} more book${readingGoal - totalRead !== 1 ? 's' : ''} to reach your goal`}
              </div>
            </div>
          </div>

          {/* Recommended Books */}
          <div style={{ background: '#fff', borderRadius: '16px', padding: '1.75rem', border: '1px solid rgba(226,211,179,0.45)', boxShadow: '0 4px 16px rgba(20,18,15,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h4 style={{ margin: 0, fontWeight: '800', color: '#1e1b15', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={18} color="#D4A017" /> Recommended For You
              </h4>
              <Link to="/books" style={{ fontSize: '0.8rem', fontWeight: '700', color: '#D4A017', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>Browse All <ArrowRight size={14} /></Link>
            </div>
            {recommendedBooks.length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: '0.87rem', textAlign: 'center', padding: '1.5rem 0' }}>Loading recommendations...</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
                {recommendedBooks.slice(0, 6).map(b => <BookCard key={b.id} book={b} />)}
              </div>
            )}
          </div>
        </div>

        {/* ── Right Column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Quick Actions */}
          <div style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', border: '1px solid rgba(226,211,179,0.45)', boxShadow: '0 4px 16px rgba(20,18,15,0.04)' }}>
            <h4 style={{ margin: '0 0 1rem', fontWeight: '800', color: '#1e1b15', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap size={18} color="#D4A017" /> Quick Actions
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <QuickAction to="/books" Icon={BookOpen} label="Browse Catalogue" color="#fff" bg="#D4A017" border="#D4A017" />
              <QuickAction to="/search" Icon={Search} label="Advanced Search" color="#1d4ed8" bg="rgba(29,78,216,0.07)" border="rgba(29,78,216,0.2)" />
              <QuickAction to="/reservations" Icon={Bookmark} label="My Reservations" color="#7c3aed" bg="rgba(124,58,237,0.07)" border="rgba(124,58,237,0.2)" />
              <QuickAction
                to="/fines"
                Icon={Coins}
                label={totalFineAmount > 0 ? `Pay Fines · ₹${totalFineAmount.toFixed(2)}` : 'My Fines'}
                color={totalFineAmount > 0 ? '#b91c1c' : '#166534'}
                bg={totalFineAmount > 0 ? 'rgba(185,28,28,0.07)' : 'rgba(22,163,74,0.07)'}
                border={totalFineAmount > 0 ? 'rgba(185,28,28,0.2)' : 'rgba(22,163,74,0.2)'}
              />
              <QuickAction to="/my-books" Icon={FileText} label="Borrowing History" color="#5c5549" bg="#f9fafb" border="rgba(226,211,179,0.4)" />
              <QuickAction to="/profile" Icon={User} label="My Profile" color="#5c5549" bg="#f9fafb" border="rgba(226,211,179,0.4)" />
            </div>
          </div>

          {/* Notifications Preview */}
          <div style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', border: '1px solid rgba(226,211,179,0.45)', boxShadow: '0 4px 16px rgba(20,18,15,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, fontWeight: '800', color: '#1e1b15', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Bell size={18} color="#D4A017" /> Notifications
                {unreadNotifs.length > 0 && (
                  <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', background: '#ef4444', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '20px', fontWeight: '700' }}>
                    {unreadNotifs.length}
                  </span>
                )}
              </h4>
              <Link to="/notifications" style={{ fontSize: '0.78rem', fontWeight: '700', color: '#D4A017', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>All <ArrowRight size={14} /></Link>
            </div>
            {notifications.length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: '0.84rem', margin: 0, textAlign: 'center', padding: '1rem 0' }}>No notifications yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {notifications.slice(0, 4).map(n => (
                  <div key={n.id} style={{
                    padding: '0.75rem 0.9rem', borderRadius: '10px',
                    background: n.read ? '#f9fafb' : 'rgba(212,160,23,0.05)',
                    border: `1px solid ${n.read ? 'rgba(226,211,179,0.25)' : 'rgba(212,160,23,0.2)'}`,
                  }}>
                    <div style={{ fontWeight: '700', fontSize: '0.82rem', color: '#1e1b15', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {!n.read && <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#D4A017', display: 'inline-block', flexShrink: 0 }} />}
                      {n.title}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#9ca3af', marginTop: '0.2rem' }}>
                      {n.message && n.message.length > 70 ? n.message.slice(0, 70) + '…' : n.message}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fine Summary (only shown if there are fines) */}
          {fines.length > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, #fef2f2, #fff5f5)',
              borderRadius: '16px', padding: '1.5rem',
              border: '1.5px solid rgba(220,38,38,0.2)',
              boxShadow: '0 4px 16px rgba(220,38,38,0.06)'
            }}>
              <h4 style={{ margin: '0 0 1rem', fontWeight: '800', color: '#b91c1c', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Coins size={18} color="#b91c1c" /> Fine Summary
              </h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', color: '#dc2626', fontWeight: '600' }}>Total Outstanding</span>
                <span style={{ fontSize: '1.4rem', fontWeight: '900', color: '#b91c1c' }}>₹{totalFineAmount.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {fines.slice(0, 3).map(f => (
                  <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#dc2626' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: '0.5rem' }}>{f.book_title}</span>
                    <span style={{ fontWeight: '800', flexShrink: 0 }}>₹{f.amount?.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <Link to="/fines" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', width: '100%', marginTop: '1rem', padding: '0.6rem', background: '#dc2626', color: '#fff', textDecoration: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.84rem' }}>
                Pay All Fines <ArrowRight size={14} />
              </Link>
            </div>
          )}

          {/* Recent Activity Timeline */}
          <div style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', border: '1px solid rgba(226,211,179,0.45)', boxShadow: '0 4px 16px rgba(20,18,15,0.04)' }}>
            <h4 style={{ margin: '0 0 1rem', fontWeight: '800', color: '#1e1b15', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} color="#D4A017" /> Recent Activity
            </h4>
            {borrowedBooks.length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: '0.84rem', margin: 0 }}>No activity recorded yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {borrowedBooks.slice(0, 5).map((item, idx) => (
                  <TimelineEvent
                    key={idx}
                    Icon={item.status === 'issued' ? BookOpen : CheckCircle2}
                    title={`${item.status === 'issued' ? 'Borrowed' : 'Returned'}: "${(item.book_title || '').slice(0, 28)}${(item.book_title || '').length > 28 ? '…' : ''}"`}
                    subtitle={item.status === 'issued' ? `Due ${formatDate(item.due_date)}` : 'Completed'}
                    date={formatDate(item.issue_date)}
                    color={item.status === 'issued' ? '#D4A017' : '#16a34a'}
                  />
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
