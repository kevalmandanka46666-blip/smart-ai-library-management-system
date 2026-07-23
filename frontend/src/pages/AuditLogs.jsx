import React, { useState, useEffect, useCallback } from 'react';
import { getAuditLogsAdvanced, exportAuditLogsCsvUrl } from '../services/api';
import './Dashboard.css';
import './books.css';

const ACTION_CATEGORIES = [
  ['', 'All Action Categories'],
  ['LOGIN', 'Login / Authentication'],
  ['CREATE_BOOK', 'Create Book'],
  ['UPDATE_BOOK', 'Update Book'],
  ['DELETE_BOOK', 'Delete Book'],
  ['ISSUE_BOOK', 'Issue Book'],
  ['RETURN_BOOK', 'Return Book'],
  ['SETTINGS_UPDATE', 'Settings Update'],
  ['ASSIGN_PERMISSIONS', 'Permissions & Roles'],
  ['CHANGE_PASSWORD', 'Password Changes']
];

const ROLE_CATEGORIES = [
  ['', 'All Roles'],
  ['admin', 'Admin'],
  ['librarian', 'Librarian'],
  ['staff', 'Staff Assistant'],
  ['member', 'Member / Student']
];

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [query, setQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = {
        query: query || undefined,
        action: actionFilter || undefined,
        role: roleFilter || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        page,
        page_size: pageSize
      };
      const res = await getAuditLogsAdvanced(params);
      setLogs(res.logs || []);
      setTotal(res.total || 0);
      setTotalPages(res.total_pages || 1);
    } catch (err) {
      setError('Failed to retrieve audit log records.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [query, actionFilter, roleFilter, dateFrom, dateTo, page, pageSize]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleClearFilters = () => {
    setQuery(''); setActionFilter(''); setRoleFilter('');
    setDateFrom(''); setDateTo(''); setPage(1);
  };

  const handleExportCSV = () => {
    const params = {};
    if (query) params.query = query;
    if (actionFilter) params.action = actionFilter;
    if (roleFilter) params.role = roleFilter;

    const url = exportAuditLogsCsvUrl(params);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="dashboard-wrapper" style={{ padding: '2rem 2.5rem' }}>
      {/* ── Header ── */}
      <header className="dashboard-header-bar" style={{ marginBottom: '1.5rem' }}>
        <div className="header-meta">
          <h2>System Audit & Activity Logs</h2>
          <span className="header-role-badge">Security & Compliance Ledger</span>
        </div>
        <button
          onClick={handleExportCSV}
          style={{
            padding: '0.6rem 1.25rem', background: '#D4A017', color: '#fff',
            border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '0.875rem',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem'
          }}
        >
          ⬇ Export CSV
        </button>
      </header>

      {error && (
        <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontWeight: 'bold' }}>
          {error}
        </div>
      )}

      {/* ── Filter Controls Panel ── */}
      <div style={{ background: '#ffffff', border: '1px solid rgba(226,211,179,0.55)', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.75rem', boxShadow: '0 6px 20px rgba(20,18,15,0.03)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'center' }}>
          {/* Query search */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#5c5549', marginBottom: '0.3rem' }}>SEARCH</label>
            <input
              type="text"
              placeholder="Username, details, resource…"
              value={query}
              onChange={e => { setQuery(e.target.value); setPage(1); }}
              style={{ width: '100%', padding: '0.55rem 0.85rem', border: '1.5px solid rgba(212,160,23,0.3)', borderRadius: '8px', outline: 'none', background: '#fdfcf9' }}
            />
          </div>

          {/* Action category */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#5c5549', marginBottom: '0.3rem' }}>ACTION CATEGORY</label>
            <select
              value={actionFilter}
              onChange={e => { setActionFilter(e.target.value); setPage(1); }}
              style={{ width: '100%', padding: '0.55rem 0.85rem', border: '1.5px solid rgba(212,160,23,0.3)', borderRadius: '8px', outline: 'none', background: '#fdfcf9' }}
            >
              {ACTION_CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          {/* User role */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#5c5549', marginBottom: '0.3rem' }}>USER ROLE</label>
            <select
              value={roleFilter}
              onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
              style={{ width: '100%', padding: '0.55rem 0.85rem', border: '1.5px solid rgba(212,160,23,0.3)', borderRadius: '8px', outline: 'none', background: '#fdfcf9' }}
            >
              {ROLE_CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          {/* Date from */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#5c5549', marginBottom: '0.3rem' }}>DATE FROM</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setPage(1); }}
              style={{ width: '100%', padding: '0.55rem 0.85rem', border: '1.5px solid rgba(212,160,23,0.3)', borderRadius: '8px', outline: 'none', background: '#fdfcf9' }}
            />
          </div>

          {/* Date to */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#5c5549', marginBottom: '0.3rem' }}>DATE TO</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setPage(1); }}
              style={{ width: '100%', padding: '0.55rem 0.85rem', border: '1.5px solid rgba(212,160,23,0.3)', outline: 'none', background: '#fdfcf9' }}
            />
          </div>
        </div>

        {(query || actionFilter || roleFilter || dateFrom || dateTo) && (
          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={handleClearFilters} style={{ padding: '0.4rem 0.9rem', background: 'rgba(220,38,38,0.06)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '6px', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}>
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* ── Table & Pagination ── */}
      <div style={{ background: '#ffffff', border: '1px solid rgba(226,211,179,0.55)', borderRadius: '16px', padding: '1.75rem', boxShadow: '0 6px 20px rgba(20,18,15,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h4 style={{ margin: 0, fontWeight: '800', color: '#1e1b15' }}>Activity Ledger</h4>
          <span style={{ fontSize: '0.85rem', color: '#5c5549', fontWeight: '600' }}>
            Showing {total.toLocaleString()} log record{total !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <div className="dashboard-loading" style={{ minHeight: '200px' }}>
            <div className="spinner" />
            <span>Loading audit log entries…</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="empty-state" style={{ padding: '4rem 2rem' }}>
            <p>No audit log entries match your search criteria.</p>
            <button onClick={handleClearFilters}>Clear Filters</button>
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Resource</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td style={{ fontSize: '0.82rem', color: '#5c5549', whiteSpace: 'nowrap' }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td>
                        <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{log.username}</div>
                        <span className="table-badge" style={{ background: 'rgba(212,160,23,0.12)', color: '#b3861b', fontSize: '0.72rem' }}>
                          {log.role}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          fontWeight: '800', fontSize: '0.82rem', padding: '0.2rem 0.5rem', borderRadius: '4px',
                          background: log.action.includes('DELETE') ? '#fee2e2' : log.action.includes('CREATE') ? '#dcfce7' : '#fef3c7',
                          color: log.action.includes('DELETE') ? '#b91c1c' : log.action.includes('CREATE') ? '#166534' : '#b3861b'
                        }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem', fontWeight: '600' }}>{log.resource}</td>
                      <td style={{ fontSize: '0.82rem', color: '#5c5549' }}>{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center', marginTop: '1.5rem' }}>
                <button
                  disabled={page === 1}
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid #d1d5db', background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}
                >
                  ‹ Prev
                </button>
                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1e1b15' }}>
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                  style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid #d1d5db', background: '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1 }}
                >
                  Next ›
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
