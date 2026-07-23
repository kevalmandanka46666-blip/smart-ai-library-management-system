import React, { useState, useEffect, useCallback } from 'react';
import { getAnalyticsReports } from '../services/api';
import './Dashboard.css';

// ─────────────────────────────────────────────────────────────
// SVG Line Chart for trend data
// ─────────────────────────────────────────────────────────────
const TrendLineChart = ({ data, keys, colors }) => {
  if (!data || data.length === 0) return (
    <p style={{ color: 'var(--ink-soft)', textAlign: 'center', padding: '2rem' }}>No trend data for selected period.</p>
  );

  const W = 580, H = 180;
  const PAD = { top: 12, bottom: 32, left: 36, right: 12 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const allVals = data.flatMap(d => keys.map(k => d[k] || 0));
  const maxVal = Math.max(...allVals, 1);

  const toX = (i) => PAD.left + (i / (data.length - 1 || 1)) * innerW;
  const toY = (v) => PAD.top + innerH - (v / maxVal) * innerH;

  const labelStep = Math.ceil(data.length / 7);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
        const y = PAD.top + innerH * (1 - r);
        return (
          <g key={i}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y}
              stroke="rgba(226,211,179,0.3)" strokeWidth="1" strokeDasharray="4 4" />
            <text x={PAD.left - 4} y={y + 3} textAnchor="end" fontSize="9" fill="#9ca3af">
              {Math.round(maxVal * r)}
            </text>
          </g>
        );
      })}
      {/* Lines */}
      {keys.map((key, ki) => {
        const pts = data.map((d, i) => `${toX(i)},${toY(d[key] || 0)}`).join(' ');
        return (
          <polyline key={key}
            fill="none"
            stroke={colors[ki]}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={pts}
          />
        );
      })}
      {/* Dots on hover areas */}
      {data.map((d, i) => (
        <g key={i}>
          {keys.map((key, ki) => (
            <circle key={key}
              cx={toX(i)} cy={toY(d[key] || 0)} r="3"
              fill={colors[ki]} stroke="#fff" strokeWidth="1.5"
            >
              <title>{data[i].period}: {d[key] || 0}</title>
            </circle>
          ))}
          {i % labelStep === 0 && (
            <text x={toX(i)} y={H - 4} textAnchor="middle" fontSize="8" fill="#9ca3af">
              {data[i].period.slice(-5)}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────
// Stat summary card (compact)
// ─────────────────────────────────────────────────────────────
const SummaryCard = ({ label, value, color = '#D4A017', icon }) => (
  <div style={{
    background: '#fff', border: '1px solid rgba(226,211,179,0.55)',
    borderRadius: '14px', padding: '1.4rem', display: 'flex',
    alignItems: 'center', gap: '1rem', boxShadow: '0 6px 20px rgba(20,18,15,0.04)'
  }}>
    <div style={{
      width: '44px', height: '44px', borderRadius: '10px',
      background: `${color}18`, display: 'flex', alignItems: 'center',
      justifyContent: 'center', color, flexShrink: 0
    }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize: '0.82rem', fontWeight: '600', color: '#5c5549' }}>{label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: '800', color, lineHeight: 1.1 }}>{value}</div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// Export helpers (no external lib needed)
// ─────────────────────────────────────────────────────────────

function exportCSV(rows, filename) {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename + '.csv'; a.click();
  URL.revokeObjectURL(url);
}

function exportHTML(title, headers, rows, filename) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title}</title>
<style>
  body{font-family:Inter,Segoe UI,sans-serif;color:#1e1b15;padding:2rem;background:#fdfcf9}
  h1{font-size:1.5rem;margin-bottom:.5rem;color:#D4A017}
  p{font-size:.85rem;color:#5c5549;margin-bottom:1.5rem}
  table{width:100%;border-collapse:collapse;font-size:.85rem}
  th{background:#D4A017;color:#fff;padding:.6rem 1rem;text-align:left}
  td{padding:.6rem 1rem;border-bottom:1px solid #f0e8d0}
  tr:nth-child(even){background:#fbf7ed}
</style></head>
<body>
<h1>${title}</h1>
<p>Generated: ${new Date().toLocaleString()}</p>
<table>
  <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
  <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c ?? '—'}</td>`).join('')}</tr>`).join('')}</tbody>
</table>
</body></html>`;
  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename + '.html'; a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────
// Tab button
// ─────────────────────────────────────────────────────────────
const TabBtn = ({ label, active, onClick, count }) => (
  <button onClick={onClick} style={{
    padding: '0.55rem 1.2rem',
    borderRadius: '8px',
    border: active ? '1.5px solid #D4A017' : '1.5px solid transparent',
    background: active ? 'rgba(212,160,23,0.08)' : 'transparent',
    color: active ? '#b3861b' : '#5c5549',
    fontWeight: '700', fontSize: '0.875rem', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: '0.4rem',
    transition: 'all 0.18s ease'
  }}>
    {label}
    {count !== undefined && (
      <span style={{
        background: active ? '#D4A017' : '#e5e7eb',
        color: active ? '#fff' : '#374151',
        borderRadius: '999px', padding: '0.05rem 0.4rem',
        fontSize: '0.72rem', fontWeight: '800'
      }}>{count}</span>
    )}
  </button>
);

// ─────────────────────────────────────────────────────────────
// Reports Page
// ─────────────────────────────────────────────────────────────
const GRANULARITIES = [
  { value: 'daily', label: 'Daily', defaultPeriod: 30 },
  { value: 'weekly', label: 'Weekly', defaultPeriod: 12 },
  { value: 'monthly', label: 'Monthly', defaultPeriod: 12 },
];

const Reports = () => {
  const [granularity, setGranularity] = useState('monthly');
  const [period, setPeriod] = useState(12);
  const [activeTab, setActiveTab] = useState('overview');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fine filter
  const [fineFilter, setFineFilter] = useState('all'); // 'all' | 'paid' | 'unpaid'
  // Issue/Return filter
  const [txFilter, setTxFilter] = useState('all'); // 'all' | 'issued' | 'returned'
  // Search
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getAnalyticsReports(granularity, period);
      setReportData(data);
    } catch (e) {
      setError('Failed to load reports. Make sure the backend is running.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [granularity, period]);

  useEffect(() => { load(); }, [load]);

  // ── Granularity switcher resets period ──
  const handleGranChange = (g) => {
    const preset = GRANULARITIES.find(x => x.value === g);
    setGranularity(g);
    setPeriod(preset?.defaultPeriod || 12);
  };

  const fmt = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Filtered fines
  const filteredFines = (reportData?.fine_list || []).filter(f => {
    const matchFilter = fineFilter === 'all' || (fineFilter === 'paid' ? f.paid : !f.paid);
    const matchSearch = !search || f.student_name.toLowerCase().includes(search.toLowerCase()) ||
      f.book_title.toLowerCase().includes(search.toLowerCase()) ||
      (f.student_id || '').toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  // Filtered transactions
  const filteredTx = (reportData?.issue_return_list || []).filter(tx => {
    const matchFilter = txFilter === 'all' || tx.status === txFilter;
    const matchSearch = !search || tx.student_name.toLowerCase().includes(search.toLowerCase()) ||
      tx.book_title.toLowerCase().includes(search.toLowerCase()) ||
      (tx.student_id || '').toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  // ── Export handlers ──
  const handleExportFinesCSV = () => {
    exportCSV(filteredFines.map(f => ({
      'Student ID': f.student_id,
      'Student Name': f.student_name,
      'Book Title': f.book_title,
      'Amount (₹)': f.amount,
      'Reason': f.reason,
      'Generated At': fmt(f.created_at),
      'Status': f.paid ? 'Paid' : 'Unpaid'
    })), `fines_report_${granularity}_${new Date().toISOString().slice(0, 10)}`);
  };

  const handleExportFinesPDF = () => {
    exportHTML(
      `Fine Report — ${granularity.charAt(0).toUpperCase() + granularity.slice(1)} (${period} periods)`,
      ['Student ID', 'Student Name', 'Book Title', 'Amount (₹)', 'Reason', 'Generated At', 'Status'],
      filteredFines.map(f => [f.student_id, f.student_name, f.book_title, `₹${f.amount}`, f.reason, fmt(f.created_at), f.paid ? 'Paid' : 'Unpaid']),
      `fines_report_${granularity}_${new Date().toISOString().slice(0, 10)}`
    );
  };

  const handleExportTxCSV = () => {
    exportCSV(filteredTx.map(tx => ({
      'Student ID': tx.student_id,
      'Student Name': tx.student_name,
      'Book Title': tx.book_title,
      'Issue Date': fmt(tx.issue_date),
      'Due Date': fmt(tx.due_date),
      'Return Date': fmt(tx.return_date),
      'Status': tx.status
    })), `transactions_${granularity}_${new Date().toISOString().slice(0, 10)}`);
  };

  const handleExportTxPDF = () => {
    exportHTML(
      `Issue / Return Report — ${granularity.charAt(0).toUpperCase() + granularity.slice(1)} (${period} periods)`,
      ['Student ID', 'Student Name', 'Book', 'Issued', 'Due', 'Returned', 'Status'],
      filteredTx.map(tx => [tx.student_id, tx.student_name, tx.book_title, fmt(tx.issue_date), fmt(tx.due_date), fmt(tx.return_date), tx.status]),
      `transactions_${granularity}_${new Date().toISOString().slice(0, 10)}`
    );
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner" />
        <span>Compiling analytical reports…</span>
      </div>
    );
  }

  const { summary, trend } = reportData || { summary: {}, trend: [] };

  return (
    <div className="dashboard-wrapper" style={{ padding: '2rem 2.5rem' }}>
      {/* ── Header ── */}
      <header className="dashboard-header-bar" style={{ marginBottom: '0', display: 'flex', flexDirection: 'column', gap: '1.25rem', alignItems: 'stretch' }}>
        <div className="header-meta">
          <h2>Analytical Reports</h2>
          <span className="header-role-badge">
            {granularity.charAt(0).toUpperCase() + granularity.slice(1)} · Last {period} periods
          </span>
        </div>
        {/* Granularity & Period Controls */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
          <div style={{ display: 'flex', gap: '0.4rem', background: '#f5f5f5', padding: '0.3rem', borderRadius: '10px', flexWrap: 'wrap' }}>
            {GRANULARITIES.map(g => (
              <button key={g.value} onClick={() => handleGranChange(g.value)} style={{
                padding: '0.4rem 0.9rem', borderRadius: '7px', border: 'none',
                background: granularity === g.value ? '#D4A017' : 'transparent',
                color: granularity === g.value ? '#fff' : '#5c5549',
                fontWeight: '700', fontSize: '0.82rem', cursor: 'pointer',
                transition: 'all 0.18s ease'
              }}>{g.label}</button>
            ))}
          </div>
          <select
            value={period}
            onChange={e => setPeriod(Number(e.target.value))}
            style={{
              padding: '0.45rem 0.85rem', border: '1.5px solid rgba(226,211,179,0.7)',
              borderRadius: '8px', background: '#fff', fontWeight: '700',
              color: '#1e1b15', fontSize: '0.85rem', cursor: 'pointer', outline: 'none',
              flex: '1', minWidth: '120px'
            }}
          >
            {granularity === 'daily'
              ? [7, 14, 30, 60, 90].map(v => <option key={v} value={v}>Last {v} days</option>)
              : granularity === 'weekly'
                ? [4, 8, 12, 24, 52].map(v => <option key={v} value={v}>Last {v} weeks</option>)
                : [3, 6, 12, 24].map(v => <option key={v} value={v}>Last {v} months</option>)
            }
          </select>
          <button onClick={load} style={{
            padding: '0.45rem 1rem', background: '#D4A017', color: '#fff',
            border: 'none', borderRadius: '8px', fontWeight: '700',
            fontSize: '0.85rem', cursor: 'pointer', flex: '1', minWidth: '100px'
          }}>↻ Refresh</button>
        </div>
      </header>

      {error && (
        <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '1rem', borderRadius: '12px', fontWeight: 'bold', marginTop: '1rem' }}>
          {error}
        </div>
      )}

      {/* ── Summary KPI cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.2rem', marginTop: '1.5rem' }}>
        <SummaryCard label="Total Issues" value={summary.total_issues ?? 0} color="#3b82f6"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>} />
        <SummaryCard label="Total Returns" value={summary.total_returns ?? 0} color="#16a34a"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>} />
        <SummaryCard label="Overdue" value={summary.overdue ?? 0} color="#ea580c"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>} />
        <SummaryCard label="Fines Generated" value={`₹${summary.total_fines_generated ?? 0}`} color="#dc2626"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>} />
        <SummaryCard label="Fines Collected" value={`₹${summary.fines_collected ?? 0}`} color="#D4A017"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>} />
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '2rem', flexWrap: 'wrap' }}>
        <TabBtn label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
        <TabBtn label="Issue / Return" active={activeTab === 'issue_return'} onClick={() => setActiveTab('issue_return')}
          count={filteredTx.length} />
        <TabBtn label="Fine Reports" active={activeTab === 'fines'} onClick={() => setActiveTab('fines')}
          count={filteredFines.length} />
      </div>

      {/* ════════════════════════════════════════
          TAB: OVERVIEW
      ════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Trend Chart */}
          <div style={{ background: '#fff', border: '1px solid rgba(226,211,179,0.55)', borderRadius: '16px', padding: '1.75rem', boxShadow: '0 6px 20px rgba(20,18,15,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h4 style={{ margin: 0, fontWeight: '800', color: '#1e1b15' }}>Issues · Returns · Fines Trend</h4>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', fontWeight: '700' }}>
                {[['Issues', '#3b82f6'], ['Returns', '#16a34a'], ['Fines (₹)', '#dc2626']].map(([l, c]) => (
                  <span key={l} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span style={{ width: '10px', height: '10px', background: c, borderRadius: '2px', display: 'inline-block' }} />{l}
                  </span>
                ))}
              </div>
            </div>
            <TrendLineChart
              data={trend}
              keys={['issues', 'returns', 'fines']}
              colors={['#3b82f6', '#16a34a', '#dc2626']}
            />
          </div>

          {/* Progress bars — ratio analysis */}
          <div style={{ background: '#fff', border: '1px solid rgba(226,211,179,0.55)', borderRadius: '16px', padding: '1.75rem', boxShadow: '0 6px 20px rgba(20,18,15,0.04)' }}>
            <h4 style={{ margin: '0 0 1.5rem 0', fontWeight: '800', color: '#1e1b15' }}>Circulation Summary</h4>
            {[
              { label: 'Return Rate', value: summary.total_issues > 0 ? Math.round((summary.total_returns / summary.total_issues) * 100) : 0, color: '#16a34a' },
              { label: 'Overdue Rate', value: summary.total_issues > 0 ? Math.round((summary.overdue / summary.total_issues) * 100) : 0, color: '#ea580c' },
              { label: 'Fine Collection Rate', value: (summary.total_fines_generated || 0) > 0 ? Math.round(((summary.fines_collected || 0) / summary.total_fines_generated) * 100) : 0, color: '#D4A017' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ marginBottom: '1.2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                  <span>{label}</span><span style={{ color }}>{value}%</span>
                </div>
                <div style={{ background: '#f1f5f9', borderRadius: '6px', height: '10px', overflow: 'hidden' }}>
                  <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: '6px', transition: 'width 0.7s ease' }} />
                </div>
              </div>
            ))}
          </div>

          {/* Trend Table */}
          <div style={{ background: '#fff', border: '1px solid rgba(226,211,179,0.55)', borderRadius: '16px', padding: '1.75rem', boxShadow: '0 6px 20px rgba(20,18,15,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h4 style={{ margin: 0, fontWeight: '800', color: '#1e1b15' }}>Period Breakdown</h4>
              <button
                onClick={() => exportCSV(trend, `trend_${granularity}_${new Date().toISOString().slice(0, 10)}`)}
                style={{
                  padding: '0.4rem 0.9rem', background: 'rgba(212,160,23,0.1)', color: '#b3861b',
                  border: '1.5px solid rgba(212,160,23,0.3)', borderRadius: '8px',
                  fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer'
                }}
              >
                ⬇ Export CSV
              </button>
            </div>
            <div className="table-responsive">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th style={{ textAlign: 'right' }}>Issues</th>
                    <th style={{ textAlign: 'right' }}>Returns</th>
                    <th style={{ textAlign: 'right' }}>Fines (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {trend.length === 0 ? (
                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--ink-soft)' }}>No data in selected period.</td></tr>
                  ) : (
                    [...trend].reverse().map((row, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: '700' }}>{row.period}</td>
                        <td style={{ textAlign: 'right', color: '#3b82f6', fontWeight: '700' }}>{row.issues}</td>
                        <td style={{ textAlign: 'right', color: '#16a34a', fontWeight: '700' }}>{row.returns}</td>
                        <td style={{ textAlign: 'right', color: '#dc2626', fontWeight: '700' }}>₹{row.fines}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          TAB: ISSUE / RETURN
      ════════════════════════════════════════ */}
      {activeTab === 'issue_return' && (
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{ background: '#fff', border: '1px solid rgba(226,211,179,0.55)', borderRadius: '16px', padding: '1.75rem', boxShadow: '0 6px 20px rgba(20,18,15,0.04)' }}>
            {/* Controls */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem', alignItems: 'center' }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search student, book…"
                style={{
                  flex: 1, minWidth: '200px', padding: '0.5rem 0.9rem',
                  border: '1.5px solid rgba(226,211,179,0.7)', borderRadius: '8px',
                  fontSize: '0.875rem', outline: 'none', background: '#fdfcf9'
                }}
              />
              <div style={{ display: 'flex', gap: '0.4rem', background: '#f5f5f5', padding: '0.3rem', borderRadius: '10px' }}>
                {[['All', 'all'], ['Issued', 'issued'], ['Returned', 'returned']].map(([l, v]) => (
                  <button key={v} onClick={() => setTxFilter(v)} style={{
                    padding: '0.35rem 0.8rem', borderRadius: '7px', border: 'none',
                    background: txFilter === v ? '#3b82f6' : 'transparent',
                    color: txFilter === v ? '#fff' : '#5c5549',
                    fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer'
                  }}>{l}</button>
                ))}
              </div>
              <button onClick={handleExportTxCSV} style={{
                padding: '0.45rem 0.9rem', background: 'rgba(212,160,23,0.1)', color: '#b3861b',
                border: '1.5px solid rgba(212,160,23,0.3)', borderRadius: '8px',
                fontWeight: '700', fontSize: '0.82rem', cursor: 'pointer'
              }}>⬇ CSV</button>
              <button onClick={handleExportTxPDF} style={{
                padding: '0.45rem 0.9rem', background: 'rgba(37,99,235,0.08)', color: '#2563eb',
                border: '1.5px solid rgba(37,99,235,0.2)', borderRadius: '8px',
                fontWeight: '700', fontSize: '0.82rem', cursor: 'pointer'
              }}>🖨 Print / PDF</button>
            </div>

            <div className="table-responsive">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Book</th>
                    <th>Issued</th>
                    <th>Due</th>
                    <th>Returned</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTx.length === 0 ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--ink-soft)' }}>No records match your filter.</td></tr>
                  ) : (
                    filteredTx.map((tx, i) => {
                      const isOverdue = tx.status === 'issued' && tx.due_date && new Date(tx.due_date) < new Date();
                      return (
                        <tr key={i}>
                          <td>
                            <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{tx.student_name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--ink-soft)' }}>{tx.student_id}</div>
                          </td>
                          <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.book_title}</td>
                          <td>{fmt(tx.issue_date)}</td>
                          <td style={{ color: isOverdue ? '#dc2626' : 'inherit', fontWeight: isOverdue ? '700' : 'normal' }}>{fmt(tx.due_date)}</td>
                          <td>{tx.return_date ? fmt(tx.return_date) : '—'}</td>
                          <td>
                            <span className="table-badge" style={{
                              background: tx.status === 'returned' ? '#dcfce7' : isOverdue ? '#fee2e2' : '#dbeafe',
                              color: tx.status === 'returned' ? '#166534' : isOverdue ? '#b91c1c' : '#1d4ed8'
                            }}>
                              {tx.status === 'returned' ? 'Returned' : isOverdue ? 'Overdue' : 'Issued'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: '0.75rem', fontSize: '0.82rem', color: 'var(--ink-soft)', fontWeight: '600' }}>
              Showing {filteredTx.length} records
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          TAB: FINE REPORTS
      ════════════════════════════════════════ */}
      {activeTab === 'fines' && (
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{ background: '#fff', border: '1px solid rgba(226,211,179,0.55)', borderRadius: '16px', padding: '1.75rem', boxShadow: '0 6px 20px rgba(20,18,15,0.04)' }}>
            {/* Fine summary mini cards */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.75rem', flexWrap: 'wrap' }}>
              {[
                { label: 'Total Generated', value: `₹${summary.total_fines_generated ?? 0}`, color: '#dc2626' },
                { label: 'Collected', value: `₹${summary.fines_collected ?? 0}`, color: '#16a34a' },
                { label: 'Pending', value: `₹${((summary.total_fines_generated ?? 0) - (summary.fines_collected ?? 0)).toFixed(2)}`, color: '#ea580c' },
                { label: 'Fine Records', value: (reportData?.fine_list || []).length, color: '#D4A017' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ flex: '1', minWidth: '120px', background: `${color}0d`, border: `1.5px solid ${color}30`, borderRadius: '10px', padding: '0.9rem 1.1rem' }}>
                  <div style={{ fontSize: '0.78rem', color, fontWeight: '700', marginBottom: '0.2rem' }}>{label}</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: '800', color }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem', alignItems: 'center' }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search student, book…"
                style={{
                  flex: 1, minWidth: '200px', padding: '0.5rem 0.9rem',
                  border: '1.5px solid rgba(226,211,179,0.7)', borderRadius: '8px',
                  fontSize: '0.875rem', outline: 'none', background: '#fdfcf9'
                }}
              />
              <div style={{ display: 'flex', gap: '0.4rem', background: '#f5f5f5', padding: '0.3rem', borderRadius: '10px' }}>
                {[['All', 'all'], ['Unpaid', 'unpaid'], ['Paid', 'paid']].map(([l, v]) => (
                  <button key={v} onClick={() => setFineFilter(v)} style={{
                    padding: '0.35rem 0.8rem', borderRadius: '7px', border: 'none',
                    background: fineFilter === v ? '#dc2626' : 'transparent',
                    color: fineFilter === v ? '#fff' : '#5c5549',
                    fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer'
                  }}>{l}</button>
                ))}
              </div>
              <button onClick={handleExportFinesCSV} style={{
                padding: '0.45rem 0.9rem', background: 'rgba(212,160,23,0.1)', color: '#b3861b',
                border: '1.5px solid rgba(212,160,23,0.3)', borderRadius: '8px',
                fontWeight: '700', fontSize: '0.82rem', cursor: 'pointer'
              }}>⬇ CSV</button>
              <button onClick={handleExportFinesPDF} style={{
                padding: '0.45rem 0.9rem', background: 'rgba(220,38,38,0.08)', color: '#b91c1c',
                border: '1.5px solid rgba(220,38,38,0.2)', borderRadius: '8px',
                fontWeight: '700', fontSize: '0.82rem', cursor: 'pointer'
              }}>🖨 Print / PDF</button>
            </div>

            <div className="table-responsive">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Book</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th>Reason</th>
                    <th>Generated</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFines.length === 0 ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--ink-soft)' }}>No fine records match your filter.</td></tr>
                  ) : (
                    filteredFines.map((f, i) => (
                      <tr key={i}>
                        <td>
                          <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{f.student_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--ink-soft)' }}>{f.student_id}</div>
                        </td>
                        <td style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.book_title}</td>
                        <td style={{ textAlign: 'right', fontWeight: '800', color: f.paid ? '#16a34a' : '#dc2626' }}>
                          ₹{f.amount}
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--ink-soft)' }}>{f.reason}</td>
                        <td style={{ fontSize: '0.82rem' }}>{fmt(f.created_at)}</td>
                        <td>
                          <span className="table-badge" style={{
                            background: f.paid ? '#dcfce7' : '#fee2e2',
                            color: f.paid ? '#166534' : '#b91c1c'
                          }}>
                            {f.paid ? '✓ Paid' : 'Unpaid'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: '0.75rem', fontSize: '0.82rem', color: 'var(--ink-soft)', fontWeight: '600' }}>
              Showing {filteredFines.length} fine records ·{' '}
              Total: ₹{filteredFines.reduce((s, f) => s + (f.amount || 0), 0).toFixed(2)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
