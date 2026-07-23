import React, { useState, useEffect } from 'react';
import { getTransactions, bulkReturnBooks } from '../services/api';
import { PageHeader, DataTable, StatusBadge } from '../components/layout/EnterpriseLibrary';
import '../styles/design-tokens.css';
import './Dashboard.css'; // Reuse table styling

const IconTrash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search & Filtering States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '', 'issued', 'returned'
  const [overdueFilter, setOverdueFilter] = useState(false);

  // Pagination & Sorting States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // Bulk returns list
  const [selectedTxIds, setSelectedTxIds] = useState([]);

  useEffect(() => {
    loadTransactionsList();
  }, [searchTerm, statusFilter, overdueFilter, currentPage]);

  const loadTransactionsList = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {
        query: searchTerm || undefined,
        status: statusFilter || undefined,
        overdue: overdueFilter || undefined,
        page: currentPage,
        page_size: pageSize
      };
      const data = await getTransactions(params);
      
      // Server now returns paginated envelope
      if (data && data.transactions) {
        setTransactions(data.transactions);
        setTotalItems(data.total || 0);
      } else if (Array.isArray(data)) {
        // Fallback for backwards compatibility
        setTotalItems(data.length);
        const startIndex = (currentPage - 1) * pageSize;
        setTransactions(data.slice(startIndex, startIndex + pageSize));
      }
    } catch (err) {
      setError('Failed to load transaction history.');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkReturn = async () => {
    if (selectedTxIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to return books for the ${selectedTxIds.length} selected transaction(s)?`)) return;
    try {
      setError('');
      setSuccess('');
      const res = await bulkReturnBooks(selectedTxIds);
      setSuccess(res.message || 'Bulk return completed successfully!');
      setSelectedTxIds([]);
      loadTransactionsList();
    } catch (err) {
      setError('Failed to process bulk return.');
    }
  };

  const toggleSelectTx = (id) => {
    setSelectedTxIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    // Only select records which are currently in 'issued' status on this page
    const activeIssuedTxs = transactions.filter(t => t.status === 'issued');
    if (selectedTxIds.length === activeIssuedTxs.length) {
      setSelectedTxIds([]);
    } else {
      setSelectedTxIds(activeIssuedTxs.map(t => t.id));
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const activeIssuedTxsOnPage = transactions.filter(t => t.status === 'issued');

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <span>Loading transaction ledger...</span>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper" style={{ padding: '2rem' }}>
      {/* ── PageHeader Component Migration ── */}
      <div style={{ marginBottom: '2rem', borderBottom: '1px solid var(--eu-color-border-main)', paddingBottom: '1.25rem' }}>
        <PageHeader
          title="Circulation Ledgers"
          subtitle="System Transactions"
        />
      </div>

      {error && (
        <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fee2e2', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: 'bold' }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #dcfce7', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: 'bold' }}>
          {success}
        </div>
      )}

      {/* Advanced Filters */}
      <div style={{ background: '#ffffff', border: '1px solid rgba(226,211,179,0.5)', borderRadius: '16px', padding: '1.5rem', marginBottom: '2rem', boxShadow: 'var(--shadow-soft)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'center' }}>
          <div className="search-bar" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fffdf9', borderRadius: '12px', border: '1.5px solid rgba(212,160,23,0.25)', boxShadow: 'none', width: '100%', marginBottom: 0 }}>
            <input
              type="text"
              placeholder="Search student ID, name, book..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.95rem' }}
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1.5px solid rgba(212,160,23,0.25)', background: '#fffdf9', color: 'var(--ink)', fontSize: '0.9rem', outline: 'none' }}
            >
              <option value="">All Statuses</option>
              <option value="issued">Issued Only</option>
              <option value="returned">Returned Only</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingLeft: '0.5rem' }}>
            <input
              type="checkbox"
              id="overdue-only"
              checked={overdueFilter}
              onChange={(e) => { setOverdueFilter(e.target.checked); setCurrentPage(1); }}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <label htmlFor="overdue-only" style={{ fontWeight: '600', cursor: 'pointer', userSelect: 'none' }}>Overdue Only</label>
          </div>
        </div>
      </div>

      {activeIssuedTxsOnPage.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fdfcf9', padding: '1rem 1.5rem', borderRadius: '12px', border: '1px solid rgba(226,211,179,0.5)', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <input
              type="checkbox"
              checked={selectedTxIds.length === activeIssuedTxsOnPage.length && activeIssuedTxsOnPage.length > 0}
              onChange={handleSelectAll}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <span style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>
              Selected {selectedTxIds.length} active issue(s)
            </span>
          </div>
          {selectedTxIds.length > 0 && (
            <button
              onClick={handleBulkReturn}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.25rem', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Confirm Bulk Return
            </button>
          )}
        </div>
      )}

      <div className="info-card" style={{ background: '#ffffff', borderRadius: '16px', padding: '2rem', border: '1px solid rgba(226,211,179,0.55)' }}>
        {(() => {
          const columns = [
            {
              header: '',
              cell: (row) => row.status === 'issued' && (
                <input
                  type="checkbox"
                  checked={selectedTxIds.includes(row.id)}
                  onChange={() => toggleSelectTx(row.id)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              )
            },
            { header: 'Student ID', cell: (row) => <span style={{ fontWeight: '700' }}>{row.student_id}</span> },
            { header: 'Student Name', accessor: 'student_name' },
            { header: 'Book Title', cell: (row) => <span style={{ fontWeight: '600' }}>{row.book_title}</span> },
            { header: 'Issue Date', cell: (row) => formatDate(row.issue_date) },
            { header: 'Due Date', cell: (row) => formatDate(row.due_date) },
            { header: 'Return Date', cell: (row) => formatDate(row.return_date) },
            {
              header: 'Status',
              cell: (row) => (
                <StatusBadge 
                  label={row.status === 'issued' ? 'Issued' : 'Returned'} 
                  variant={row.status === 'issued' ? 'warning' : 'success'} 
                />
              )
            }
          ];

          return (
            <DataTable
              columns={columns}
              data={transactions}
              emptyMessage="No transactions registered in system log."
              loading={loading}
            />
          );
        })()}

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              style={{ padding: '0.6rem 1rem', border: '1px solid rgba(212,160,23,0.3)', borderRadius: '10px', background: '#ffffff', color: 'var(--gold-dark)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
            >
              Prev
            </button>
            <span style={{ fontWeight: 'bold', color: 'var(--ink)' }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              style={{ padding: '0.6rem 1rem', border: '1px solid rgba(212,160,23,0.3)', borderRadius: '10px', background: '#ffffff', color: 'var(--gold-dark)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Transactions;
