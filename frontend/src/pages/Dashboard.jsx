import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getDashboardAnalytics } from '../services/api';
import UserDashboard from '../components/UserDashboard';
import { Trophy, Users } from 'lucide-react';
import { AnalyticsCard, PageHeader, ChartCard, DataTable } from '../components/layout/EnterpriseLibrary';
import '../styles/design-tokens.css';
import './Dashboard.css';

// ─────────────────────────────────────────────────────────────
// Mini SVG Sparkline — inline, no external dep
// ─────────────────────────────────────────────────────────────
const Sparkline = memo(({ data, color = '#D4A017', width = 100, height = 36 }) => {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (v / max) * height;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
});

// ─────────────────────────────────────────────────────────────
// SVG Bar Chart — Dynamic borrow trend (7D, 30D, 90D)
// ─────────────────────────────────────────────────────────────
const BorrowTrendChart = memo(({ labels, issues, returns }) => {
  const W = 560, H = 160, PADDING = { top: 10, bottom: 28, left: 24, right: 10 };
  const innerW = W - PADDING.left - PADDING.right;
  const innerH = H - PADDING.top - PADDING.bottom;
  const n = labels.length;
  if (n === 0) return <p style={{ color: 'var(--ink-soft)', textAlign: 'center' }}>No data yet.</p>;

  const totalActivity = issues.reduce((a, b) => a + b, 0) + returns.reduce((a, b) => a + b, 0);

  // Set Y-axis scale ceiling. If there is no activity, Y-axis max is 5.
  const rawMax = Math.max(...issues, ...returns, 0);
  const maxVal = totalActivity === 0 ? 5 : rawMax === 0 ? 5 : Math.ceil(rawMax * 1.1);

  const barGroupW = innerW / n;
  const barW = Math.max(1.5, barGroupW * 0.4);

  // Dynamic axis label step sizing:
  // 7D: show every daily label (step = 1)
  // 30D: show weekly ticks (step = 5)
  // 90D: show bi-weekly/monthly ticks (step = 15)
  const labelStep = n <= 7 ? 1 : n <= 30 ? 5 : 15;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', overflow: 'visible', transition: 'all 0.3s ease' }}>
        <defs>
          <linearGradient id="issueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D4A017" />
            <stop offset="100%" stopColor="#b3861b" />
          </linearGradient>
          <linearGradient id="returnGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
        </defs>

        {/* Grid Lines (Horizontal & Vertical forming squares) */}
        {/* Vertical grid lines */}
        {labels.map((_, i) => {
          const x = PADDING.left + i * barGroupW + barGroupW / 2;
          return (
            <line
              key={`vgrid-${i}`}
              x1={x}
              y1={PADDING.top}
              x2={x}
              y2={PADDING.top + innerH}
              stroke="#F2F2F2"
              strokeWidth="1"
              opacity="0.8"
            />
          );
        })}

        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = PADDING.top + innerH * (1 - ratio);
          return (
            <line
              key={`hgrid-${i}`}
              x1={PADDING.left}
              x2={W - PADDING.right}
              y1={y}
              y2={y}
              stroke="#F2F2F2"
              strokeWidth="1"
              opacity="0.8"
            />
          );
        })}

        {/* Y-Axis Label Ticks */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = PADDING.top + innerH * (1 - ratio);
          const tickValue = Math.round(maxVal * ratio);
          return (
            <text
              key={`ytick-${i}`}
              x={PADDING.left - 6}
              y={y + 3}
              fontSize="8"
              fill="#9ca3af"
              textAnchor="end"
              fontWeight="bold"
            >
              {tickValue}
            </text>
          );
        })}

        {/* Axis Baselines */}
        {/* Left Y Axis */}
        <line x1={PADDING.left} y1={PADDING.top} x2={PADDING.left} y2={PADDING.top + innerH} stroke="#E2D3B3" strokeWidth="1.5" opacity="0.6" />
        {/* Bottom X Axis */}
        <line x1={PADDING.left} y1={PADDING.top + innerH} x2={W - PADDING.right} y2={PADDING.top + innerH} stroke="#E2D3B3" strokeWidth="1.5" opacity="0.6" />

        {/* Bars (Rendered only when totalActivity > 0) */}
        {totalActivity > 0 && labels.map((label, i) => {
          const issueH = (issues[i] / maxVal) * innerH;
          const returnH = (returns[i] / maxVal) * innerH;
          const centerX = PADDING.left + i * barGroupW + barGroupW / 2;

          return (
            <g key={`bars-${label}`} style={{ transition: 'all 0.3s ease' }}>
              {/* Issue bar */}
              {issues[i] > 0 && (
                <rect
                  x={centerX - barW - 0.5}
                  y={PADDING.top + innerH - issueH}
                  width={barW} height={issueH}
                  fill="url(#issueGrad)" rx="1.5"
                  style={{ transition: 'height 0.4s ease, y 0.4s ease' }}
                />
              )}
              {/* Return bar */}
              {returns[i] > 0 && (
                <rect
                  x={centerX + 0.5}
                  y={PADDING.top + innerH - returnH}
                  width={barW} height={returnH}
                  fill="url(#returnGrad)" rx="1.5"
                  style={{ transition: 'height 0.4s ease, y 0.4s ease' }}
                />
              )}
            </g>
          );
        })}

        {/* X-Axis labels */}
        {labels.map((label, i) => {
          const centerX = PADDING.left + i * barGroupW + barGroupW / 2;
          const showLabel = i === 0 || i === n - 1 || (i % labelStep === 0);
          return showLabel ? (
            <text
              key={`xlabel-${label}`}
              x={centerX}
              y={H - 4}
              textAnchor="middle"
              fontSize="8"
              fill="#9ca3af"
              fontWeight="bold"
            >
              {label.slice(5)} {/* MM-DD */}
            </text>
          ) : null;
        })}
      </svg>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────
// BorrowActivityHeatmap — 90-day GitHub-style contribution grid
// ─────────────────────────────────────────────────────────────
const BorrowActivityHeatmap = memo(({ trend }) => {
  const [hoveredCell, setHoveredCell] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Map backend trend to resolve issues/returns by date YYYY-MM-DD
  const dataMap = useMemo(() => {
    const mapping = {};
    if (trend && trend.labels) {
      trend.labels.forEach((lbl, idx) => {
        mapping[lbl] = {
          issues: trend.issues[idx] || 0,
          returns: trend.returns[idx] || 0
        };
      });
    }
    return mapping;
  }, [trend]);

  // Construct a grid containing exactly 91 days (7 rows by 13 columns)
  // aligned to day-of-week rows to match GitHub Contributions exactly.
  const { grid, monthsHeader, totalActivity } = useMemo(() => {
    const today = new Date();
    const gridDays = 91; // 13 weeks * 7 days

    // Find the starting date (90 days before today, adjusted to align with week day bounds)
    const startDate = new Date(today.getTime() - (gridDays - 1) * 86400000);

    let sumVal = 0;
    const cellsList = [];
    const monthsSeen = [];

    for (let i = 0; i < gridDays; i++) {
      const d = new Date(startDate.getTime() + i * 86400000);
      const dateStr = d.toISOString().slice(0, 10);
      const dbVal = dataMap[dateStr] || { issues: 0, returns: 0 };

      sumVal += dbVal.issues + dbVal.returns;

      cellsList.push({
        date: dateStr,
        issues: dbVal.issues,
        returns: dbVal.returns,
        dayOfWeek: d.getDay(),
        monthLabel: d.toLocaleDateString('en-US', { month: 'short' }),
        colIndex: Math.floor(i / 7)
      });

      // Keep track of which column index starts a month for headers alignment
      if (d.getDate() === 1 || i === 0) {
        monthsSeen.push({
          label: d.toLocaleDateString('en-US', { month: 'short' }),
          colIndex: Math.floor(i / 7)
        });
      }
    }

    // Organize cells list into 7 rows (rows 0-6 for Sun-Sat)
    const rows = Array.from({ length: 7 }, () => []);
    cellsList.forEach((cell) => {
      rows[cell.dayOfWeek].push(cell);
    });

    return { grid: rows, monthsHeader: monthsSeen, totalActivity: sumVal };
  }, [dataMap]);

  const handleMouseMove = (e, cell) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const parentRect = e.currentTarget.offsetParent.getBoundingClientRect();
    setHoveredCell(cell);
    setTooltipPos({
      x: rect.left - parentRect.left + rect.width / 2,
      y: rect.top - parentRect.top - 54
    });
  };

  return (
    <div className="info-card" style={{ width: 'fit-content', minHeight: 'auto', position: 'relative', padding: '1.5rem', margin: '0', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      
      {/* ── Header ── */}
      <div className="card-header-clean" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem', width: '100%', gap: '2rem' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800' }}>Borrow Activity Heatmap</h4>
          <span style={{ fontSize: '0.78rem', color: 'var(--ink-soft)', fontWeight: '600' }}>Last 90 Days • LIVE Data</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.74rem', fontWeight: '700', color: 'var(--ink-soft)' }}>
          <span>Less Activity</span>
          <span style={{ width: '20px', height: '20px', background: '#f8fafc', border: '1.5px solid rgba(226,211,179,0.3)', borderRadius: '3px' }} />
          <span style={{ width: '20px', height: '20px', background: '#fef3c7', borderRadius: '3px' }} />
          <span style={{ width: '20px', height: '20px', background: '#fcd34d', borderRadius: '3px' }} />
          <span style={{ width: '20px', height: '20px', background: '#d97706', borderRadius: '3px' }} />
          <span>More Activity</span>
        </div>
      </div>

      {/* ── Heatmap Grid Container ── */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'start', justifyContent: 'flex-start' }}>
        
        {/* Day labels (Mon, Wed, Fri aligned vertically) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.76rem', color: '#9ca3af', paddingTop: '25px', fontWeight: '700' }}>
          <div style={{ height: '20px', lineHeight: '20px', visibility: 'hidden' }}>Sun</div>
          <div style={{ height: '20px', lineHeight: '20px' }}>Mon</div>
          <div style={{ height: '20px', lineHeight: '20px', visibility: 'hidden' }}>Tue</div>
          <div style={{ height: '20px', lineHeight: '20px' }}>Wed</div>
          <div style={{ height: '20px', lineHeight: '20px', visibility: 'hidden' }}>Thu</div>
          <div style={{ height: '20px', lineHeight: '20px' }}>Fri</div>
          <div style={{ height: '20px', lineHeight: '20px', visibility: 'hidden' }}>Sat</div>
        </div>

        {/* Months headers + grid rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          
          {/* Months Headers Row */}
          <div style={{ display: 'flex', height: '20px', position: 'relative', fontSize: '0.76rem', color: '#9ca3af', fontWeight: '700', marginBottom: '2px' }}>
            {monthsHeader.map((m, idx) => (
              <span
                key={idx}
                style={{
                  position: 'absolute',
                  left: `${m.colIndex * 25}px`,
                  whiteSpace: 'nowrap'
                }}
              >
                {m.label}
              </span>
            ))}
          </div>

          {/* Grid Layout Rows (7 rows, 13 weeks) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {grid.map((row, rowIdx) => (
              <div key={rowIdx} style={{ display: 'flex', gap: '5px' }}>
                {row.map((cell, colIdx) => {
                  let bg = '#f8fafc';
                  const val = cell.issues;
                  if (val > 0) {
                    if (val === 1) bg = '#fef3c7';
                    else if (val <= 3) bg = '#fcd34d';
                    else bg = '#d97706';
                  }
                  return (
                    <div
                      key={colIdx}
                      onMouseEnter={(e) => handleMouseMove(e, cell)}
                      onMouseLeave={() => setHoveredCell(null)}
                      style={{
                        width: '20px',
                        height: '20px',
                        background: bg,
                        borderRadius: '3px',
                        border: '1.5px solid rgba(226,211,179,0.2)',
                        cursor: 'pointer',
                        transition: 'transform 0.15s ease, background-color 0.2s ease'
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>

        </div>

      </div>

      {/* ── Tooltip popup overlay ── */}
      {hoveredCell && (
        <div style={{
          position: 'absolute',
          left: `${tooltipPos.x}px`,
          top: `${tooltipPos.y}px`,
          transform: 'translateX(-50%)',
          background: '#1e1b15',
          color: '#fff',
          padding: '0.4rem 0.8rem',
          borderRadius: '6px',
          fontSize: '0.72rem',
          fontWeight: '700',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 10,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          animation: 'fadeIn 0.1s ease-out',
          border: '1px solid rgba(212,160,23,0.3)'
        }}>
          <div style={{ color: '#D4A017', marginBottom: '2px' }}>{hoveredCell.date}</div>
          <div>Issued: {hoveredCell.issues} · Returned: {hoveredCell.returns}</div>
        </div>
      )}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────
// SVG Donut chart
// ─────────────────────────────────────────────────────────────
const COLORS = ['#D4A017', '#3b82f6', '#16a34a', '#ea580c', '#8b5cf6', '#ec4899', '#0ea5e9', '#f59e0b'];

const DonutChart = memo(({ slices }) => {
  if (!slices || slices.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '128px', width: '100%', color: 'var(--ink-soft)', fontSize: '0.82rem', fontWeight: '600' }}>
        No category data available.
      </div>
    );
  }
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (total === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '128px', width: '100%', color: 'var(--ink-soft)', fontSize: '0.82rem', fontWeight: '600' }}>
        No category data available.
      </div>
    );
  }

  const R = 54, cx = 64, cy = 64, stroke = 20;
  let offset = 0;
  const circumference = 2 * Math.PI * R;

  return (
    <svg width="128" height="128" viewBox="0 0 128 128">
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="#f5f5f5" strokeWidth={stroke} />
      {slices.map((slice, i) => {
        const pct = slice.value / total;
        const dashLen = pct * circumference;
        const dashOff = circumference - dashLen;
        const rotateAngle = offset * 360 - 90;
        offset += pct;
        return (
          <circle
            key={i}
            cx={cx} cy={cy} r={R}
            fill="none"
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={stroke}
            strokeDasharray={`${dashLen} ${dashOff}`}
            strokeLinecap="butt"
            style={{ transform: `rotate(${rotateAngle}deg)`, transformOrigin: `${cx}px ${cy}px` }}
          />
        );
      })}
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="11" fontWeight="bold" fill="#1e1b15">
        {slices.length}
      </text>
      <text x={cx} y={cy + 13} textAnchor="middle" dominantBaseline="middle" fontSize="8" fill="#9ca3af">
        genres
      </text>
    </svg>
  );
});

// ─────────────────────────────────────────────────────────────
// Horizontal bar — popular books
// ─────────────────────────────────────────────────────────────
const HBar = memo(({ label, value, max, color = '#D4A017', rank }) => {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.7rem' }}>
      <span style={{
        width: '20px', height: '20px', borderRadius: '50%',
        background: rank <= 3 ? '#D4A017' : '#f1f5f9',
        color: rank <= 3 ? '#fff' : '#5c5549',
        fontSize: '0.7rem', fontWeight: '800',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
      }}>{rank}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#1e1b15', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>{label}</span>
          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#5c5549' }}>{value}×</span>
        </div>
        <div style={{ background: '#f1f5f9', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '4px', transition: 'width 0.6s ease' }} />
        </div>
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────
// KPI stat card using AnalyticsCard component
// ─────────────────────────────────────────────────────────────
const KpiCard = memo(({ label, value, sub, theme, sparkData, trendUp, to }) => {
  const navigate = useNavigate();
  const themeMap = {
    gold: '#D4A017',
    green: '#16a34a',
    blue: '#3b82f6',
    red: '#dc2626',
    purple: '#8b5cf6',
  };
  const color = themeMap[theme] || themeMap.gold;

  const sparklineEl = sparkData && sparkData.length > 1 && (
    <div style={{ marginTop: '0.5rem' }}>
      <Sparkline data={sparkData} color={color} width={120} height={30} />
    </div>
  );

  return (
    <AnalyticsCard
      title={label}
      value={value}
      subtitle={
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span>{sub}</span>
          {sparklineEl}
        </div>
      }
      trend={trendUp !== undefined ? (trendUp ? 'Positive' : 'Warning') : undefined}
      trendUp={trendUp}
      onClick={to ? () => navigate(to) : undefined}
    />
  );
});

// ─────────────────────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────────────────────
const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [trendRange, setTrendRange] = useState('30D'); // '7D' | '30D' | '90D'

  const [userName, setUserName] = useState('Admin');
  const [userRole, setUserRole] = useState('admin');
  const [txSearch, setTxSearch] = useState('');
  const [txPage, setTxPage] = useState(1);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const p = JSON.parse(stored);
        setUserName(p.full_name || 'Member');
        setUserRole(p.role || 'user');
      } catch (_) { }
    }
    load();

    // Auto-sync dashboard metrics: fetch backend state updates every 10 seconds
    const interval = setInterval(() => {
      loadSilent();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const result = await getDashboardAnalytics();
      setData(result);
    } catch (e) {
      setError('Could not load dashboard analytics. Make sure backend is running.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSilent = useCallback(async () => {
    try {
      const result = await getDashboardAnalytics();
      setData(result);
    } catch (e) {
      console.error('Silent auto-sync failed:', e);
    }
  }, []);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner" />
        <span>Loading analytics dashboard…</span>
      </div>
    );
  }

  const isAdmin = userRole === 'admin';

  if (!isAdmin) {
    return (
      <div className="dashboard-wrapper" style={{ width: '100%', maxWidth: 'none', margin: '0', padding: '2rem 3rem' }}>
        {/* ── User PageHeader Component Migration ── */}
        <div style={{ marginBottom: '2rem', borderBottom: '1px solid var(--eu-color-border-main)', paddingBottom: '1.25rem' }}>
          <PageHeader
            title="User Workspace Dashboard"
            subtitle="Member Workspace Portal"
            actions={
              <div className="header-profile" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="profile-details" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right' }}>
                  <span className="profile-name" style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--eu-color-text-main)' }}>{userName}</span>
                  <span className="profile-role" style={{ fontSize: '0.72rem', color: 'var(--eu-color-text-soft)' }}>Library Member</span>
                </div>
                <div className="profile-avatar" style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: 'var(--eu-color-primary)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 'bold', fontSize: '0.9rem'
                }}>
                  {userName.charAt(0).toUpperCase()}
                </div>
              </div>
            }
          />
        </div>
        <UserDashboard userName={userName} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="dashboard-wrapper">
        <header className="dashboard-header-bar">
          <div className="header-meta">
            <h2>Welcome, {userName}</h2>
            <span className="header-role-badge">Library Member</span>
          </div>
        </header>
        <div className="dashboard-container">
          <p style={{ color: 'var(--ink-soft)' }}>Full analytics are visible to administrators. You are logged in as a member.</p>
        </div>
      </div>
    );
  }

  const { books, borrows, students, fines, popular_books, top_students, trend, recent_transactions } = data;

  // Rebuild trend data dynamically according to selected trendRange (7D, 30D, 90D)
  const filteredTrend = (() => {
    const limit = trendRange === '7D' ? 7 : trendRange === '90D' ? 90 : 30;

    // Map existing backend data so we can resolve values by date key
    const dataMap = {};
    if (trend && trend.labels) {
      trend.labels.forEach((lbl, idx) => {
        dataMap[lbl] = {
          issue: trend.issues[idx] || 0,
          ret: trend.returns[idx] || 0
        };
      });
    }

    const labels = [];
    const issues = [];
    const returns = [];
    const today = new Date();

    for (let i = limit - 1; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      const dateStr = d.toISOString().slice(0, 10); // YYYY-MM-DD
      labels.push(dateStr);

      const dayData = dataMap[dateStr];
      if (dayData) {
        issues.push(dayData.issue);
        returns.push(dayData.ret);
      } else {
        issues.push(0);
        returns.push(0);
      }
    }

    return { labels, issues, returns };
  })();

  // Sparkline data: last 14 days issues & returns
  const last14Issues = trend.issues.slice(-14);
  const last14Returns = trend.returns.slice(-14);

  // Donut slices from genre data
  const donutSlices = (books.by_genre || []).slice(0, 8).map((g) => ({ label: g.genre, value: g.count }));

  // Popular books max
  const maxBorrow = popular_books.length > 0 ? popular_books[0].borrow_count : 1;

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="dashboard-wrapper">
      {/* ── PageHeader Component Migration ── */}
      <div style={{ marginBottom: '2rem', borderBottom: '1px solid var(--eu-color-border-main)', paddingBottom: '1.25rem' }}>
        <PageHeader
          title="Analytics Dashboard"
          subtitle="System Administrator · Live Data"
          actions={
            <div className="header-profile" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="profile-details" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right' }}>
                <span className="profile-name" style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--eu-color-text-main)' }}>{userName}</span>
                <span className="profile-role" style={{ fontSize: '0.72rem', color: 'var(--eu-color-text-soft)' }}>Administrator</span>
              </div>
              <div className="profile-avatar" style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: 'var(--eu-color-primary)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 'bold', fontSize: '0.9rem'
              }}>
                {userName.charAt(0).toUpperCase()}
              </div>
            </div>
          }
        />
      </div>

      {error && (
        <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '1rem', borderRadius: '12px', fontWeight: 'bold' }}>
          {error}
        </div>
      )}

      <div className="dashboard-container">
        {/* ── KPI Cards Row ── */}
        <section className="stats-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <KpiCard
            label="Total Books"
            value={books.total.toLocaleString()}
            sub={`${books.available} available · ${books.issued} issued`}
            theme="gold"
            sparkData={last14Issues}
            to="/books"
          />
          <KpiCard
            label="Active Borrows"
            value={borrows.total_active.toLocaleString()}
            sub={`${borrows.new_issues_7d} new this week`}
            theme="blue"
            sparkData={last14Issues}
            trendUp={borrows.new_issues_7d > 0}
            to="/transactions"
          />
          <KpiCard
            label="Overdue Returns"
            value={borrows.overdue_count.toLocaleString()}
            sub={`${borrows.clearance_rate}% clearance rate`}
            theme={borrows.overdue_count > 0 ? 'red' : 'green'}
            sparkData={last14Returns}
            trendUp={borrows.overdue_count === 0}
            to="/issue-return"
          />
          <KpiCard
            label="Total Members"
            value={students.total.toLocaleString()}
            sub={`${students.active_borrowers_30d} borrowed in last 30 days`}
            theme="green"
            to="/students"
          />
          <KpiCard
            label="Unpaid Fines"
            value={`₹${fines.total_unpaid.toLocaleString()}`}
            sub={`${fines.count_unpaid} pending · ₹${fines.total_collected} collected`}
            theme={fines.total_unpaid > 0 ? 'red' : 'green'}
            to="/fines"
          />
        </section>

        {/* ── Borrow Trend + Donut ── */}
        <section className="analytics-row" style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
          <div className="flex-2">
            <ChartCard
              title={`${trendRange} Borrow Trend`}
              headerActions={
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ display: 'flex', background: 'rgba(226,211,179,0.15)', borderRadius: '8px', padding: '4px', gap: '8px', alignItems: 'center' }}>
                    {['7D', '30D', '90D'].map((range) => (
                      <button
                        key={range}
                        onClick={() => setTrendRange(range)}
                        style={{
                          width: '42px',
                          height: '28px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.72rem',
                          fontWeight: '800',
                          border: 'none',
                          borderRadius: '6px',
                          background: trendRange === range ? '#D4A017' : '#f8fafc',
                          color: trendRange === range ? '#fff' : '#1e1b15',
                          cursor: 'pointer',
                          boxShadow: trendRange === range ? '0 2px 6px rgba(212,160,23,0.3)' : 'none',
                          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                      >
                        {range}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', fontWeight: '700' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ width: '10px', height: '10px', background: '#D4A017', borderRadius: '2px', display: 'inline-block' }} />
                      Issues
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ width: '10px', height: '10px', background: '#3b82f6', borderRadius: '2px', display: 'inline-block' }} />
                      Returns
                    </span>
                  </div>
                </div>
              }
            >
              <BorrowTrendChart labels={filteredTrend.labels} issues={filteredTrend.issues} returns={filteredTrend.returns} />
            </ChartCard>
          </div>

          <div className="flex-1">
            <ChartCard title="Books by Category">
              <div className="donut-chart-container">
                <DonutChart slices={donutSlices} />
                <div className="donut-legend" style={{ maxWidth: '120px' }}>
                  {donutSlices.slice(0, 6).map((s, i) => (
                    <div key={s.label} className="legend-item">
                      <span className="legend-color" style={{ background: COLORS[i % COLORS.length] }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label} ({s.value})</span>
                    </div>
                  ))}
                </div>
              </div>
            </ChartCard>
          </div>
        </section>

        {/* ── Borrow Activity Heatmap ── */}
        <section className="recent-transactions-section" style={{ display: 'block', width: '100%', margin: '24px 0' }}>
          <BorrowActivityHeatmap trend={trend} />
        </section>

        {/* ── Popular Books + Top Students ── */}
        <section className="analytics-row" style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
          <div className="flex-1">
            <ChartCard title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Trophy size={18} color="#D4A017" /> Most Popular Books
              </div>
            }>
              {popular_books.length === 0 ? (
                <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem' }}>No borrow history yet.</p>
              ) : (
                popular_books.slice(0, 5).map((b, i) => (
                  <HBar
                    key={b.book_id}
                    label={b.title}
                    value={b.borrow_count}
                    max={maxBorrow}
                    rank={i + 1}
                  />
                ))
              )}
            </ChartCard>
          </div>

          <div className="flex-1">
            <ChartCard title={
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={18} color="#3b82f6" /> Top Active Students
              </div>
            }>
              {top_students.length === 0 ? (
                <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem' }}>No student activity yet.</p>
              ) : (
                <div className="table-responsive">
                  <table className="dashboard-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Student</th>
                        <th>ID</th>
                        <th style={{ textAlign: 'right' }}>Borrows</th>
                      </tr>
                    </thead>
                    <tbody>
                      {top_students.slice(0, 5).map((s, i) => (
                        <tr key={s.student_id}>
                          <td>
                            <span style={{
                              width: '22px', height: '22px', borderRadius: '50%',
                              background: i < 3 ? '#D4A017' : '#f1f5f9',
                              color: i < 3 ? '#fff' : '#5c5549',
                              fontSize: '0.7rem', fontWeight: '800',
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                            }}>{i + 1}</span>
                          </td>
                          <td style={{ fontWeight: 700 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div style={{
                                width: '24px', height: '24px', borderRadius: '50%',
                                background: '#f5ecd5', color: '#b3861b',
                                fontSize: '0.72rem', fontWeight: '800',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                              }}>
                                {s.name ? s.name.charAt(0).toUpperCase() : 'S'}
                              </div>
                              {s.name}
                            </div>
                          </td>
                          <td style={{ fontSize: '0.82rem', color: 'var(--ink-soft)' }}>{s.student_id}</td>
                          <td style={{ textAlign: 'right', fontWeight: '700', color: '#D4A017' }}>{s.borrow_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ChartCard>
          </div>
        </section>

        {/* ── Metric Cards Row ── */}
        <section className="stats-row">
          <AnalyticsCard
            title="Total Transactions"
            value={borrows.total_transactions.toLocaleString()}
            subtitle={`${borrows.total_returned} returned`}
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>}
            onClick={() => navigate('/transactions')}
          />
          <AnalyticsCard
            title="Return Clearance"
            value={`${borrows.clearance_rate}%`}
            subtitle="Successful returns"
            trend="Clearance"
            trendUp={true}
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>}
            onClick={() => navigate('/transactions')}
          />
          <AnalyticsCard
            title="Fines Collected"
            value={`₹${fines.total_collected.toLocaleString()}`}
            subtitle={`${fines.count_unpaid} pending`}
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="7" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" /></svg>}
            onClick={() => navigate('/fines')}
          />
          <AnalyticsCard
            title="Active Members"
            value={students.active.toLocaleString()}
            subtitle={`${students.active_borrowers_30d} borrowed recently`}
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>}
            onClick={() => navigate('/students')}
          />
        </section>

        {/* ── Recent Transactions ── */}
        <section className="recent-transactions-section">
          <ChartCard
            title="Recent Transactions"
            headerActions={
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={txSearch}
                  onChange={(e) => {
                    setTxSearch(e.target.value);
                    setTxPage(1);
                  }}
                  style={{
                    padding: '0.4rem 0.8rem',
                    fontSize: '0.82rem',
                    borderRadius: '8px',
                    border: '1.5px solid rgba(226,211,179,0.4)',
                    background: '#fdfcf9',
                    color: '#1e1b15',
                    outline: 'none',
                    width: '180px'
                  }}
                />
                <Link to="/transactions" style={{ fontSize: '0.8rem', fontWeight: '700', color: '#D4A017', textDecoration: 'none' }}>View All →</Link>
              </div>
            }
          >
            {(() => {
              const query = txSearch.toLowerCase().trim();
              const filteredList = (recent_transactions || []).filter((tx) => {
                return (
                  (tx.student_name || '').toLowerCase().includes(query) ||
                  (tx.book_title || '').toLowerCase().includes(query) ||
                  (tx.status || '').toLowerCase().includes(query)
                );
              });

              const pageSize = 5;
              const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize));
              const pageIdx = Math.min(txPage, totalPages);
              const paginatedList = filteredList.slice((pageIdx - 1) * pageSize, pageIdx * pageSize);

              const columns = [
                { header: 'Student', cell: (row) => <span style={{ fontWeight: 700 }}>{row.student_name}</span> },
                { header: 'Book', cell: (row) => <div style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.book_title}</div> },
                { header: 'Issued', cell: (row) => formatDate(row.issue_date) },
                { header: 'Due', cell: (row) => formatDate(row.due_date) },
                { header: 'Returned', cell: (row) => row.return_date ? formatDate(row.return_date) : '—' },
                {
                  header: 'Status',
                  cell: (row) => (
                    <span className={`table-badge ${row.status === 'returned' ? 'active' : row.overdue ? 'inactive' : 'active'}`} style={row.overdue ? { background: '#fef2f2', color: '#b91c1c' } : {}}>
                      {row.status === 'returned' ? 'Returned' : row.overdue ? 'Overdue' : 'Issued'}
                    </span>
                  )
                }
              ];

              return (
                <>
                  <DataTable
                    columns={columns}
                    data={paginatedList}
                    onRowClick={() => navigate('/transactions')}
                    emptyMessage="No transactions found."
                  />

                  {filteredList.length > pageSize && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', padding: '0 0.5rem' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--ink-soft)', fontWeight: '600' }}>
                        Showing {((pageIdx - 1) * pageSize) + 1} - {Math.min(pageIdx * pageSize, filteredList.length)} of {filteredList.length}
                      </span>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          disabled={pageIdx === 1}
                          onClick={() => setTxPage(pageIdx - 1)}
                          style={{
                            padding: '0.3rem 0.65rem',
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            borderRadius: '6px',
                            border: '1px solid rgba(226,211,179,0.3)',
                            background: pageIdx === 1 ? '#f1f5f9' : '#fff',
                            color: pageIdx === 1 ? '#9ca3af' : '#1e1b15',
                            cursor: pageIdx === 1 ? 'not-allowed' : 'pointer'
                          }}
                        >
                          Prev
                        </button>
                        <button
                          disabled={pageIdx === totalPages}
                          onClick={() => setTxPage(pageIdx + 1)}
                          style={{
                            padding: '0.3rem 0.65rem',
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            borderRadius: '6px',
                            border: '1px solid rgba(226,211,179,0.3)',
                            background: pageIdx === totalPages ? '#f1f5f9' : '#fff',
                            color: pageIdx === totalPages ? '#9ca3af' : '#1e1b15',
                            cursor: pageIdx === totalPages ? 'not-allowed' : 'pointer'
                          }}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </ChartCard>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;