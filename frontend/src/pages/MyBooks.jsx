import React, { useState, useEffect } from 'react';
import { getStudentBorrows } from '../services/api';
import { PageHeader, DataTable, StatusBadge } from '../components/layout/EnterpriseLibrary';
import '../styles/design-tokens.css';
import './Dashboard.css';

const MyBooks = () => {
  const [borrows, setBorrows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadMyBooks();
  }, []);

  const loadMyBooks = async () => {
    try {
      setLoading(true);
      const stored = localStorage.getItem('user');
      if (stored) {
        const user = JSON.parse(stored);
        // Student ID is linked to username or custom ID
        const data = await getStudentBorrows(user.username || 'STU-001');
        setBorrows(data);
      }
    } catch (err) {
      setError('Could not retrieve your borrowing ledger.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="dashboard-wrapper" style={{ padding: '2rem' }}>
      {/* ── PageHeader Component Migration ── */}
      <div style={{ marginBottom: '2rem', borderBottom: '1px solid var(--eu-color-border-main)', paddingBottom: '1.25rem' }}>
        <PageHeader
          title="My Borrowing History"
          subtitle="Transaction Records"
        />
      </div>

      {error && (
        <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fee2e2', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      <div className="info-card" style={{ background: '#ffffff', borderRadius: '16px', padding: '2rem', border: '1px solid rgba(226,211,179,0.55)' }}>
        {(() => {
          const columns = [
            { header: 'Book Title', cell: (row) => <span style={{ fontWeight: '700' }}>{row.book_title}</span> },
            { header: 'Issue Date', cell: (row) => formatDate(row.issue_date) },
            { header: 'Due Date', cell: (row) => formatDate(row.due_date) },
            { header: 'Return Date', cell: (row) => formatDate(row.return_date) },
            {
              header: 'Status',
              cell: (row) => (
                <StatusBadge 
                  label={row.status === 'issued' ? 'Active Issue' : 'Returned'} 
                  variant={row.status === 'issued' ? 'warning' : 'success'} 
                />
              )
            }
          ];

          return (
            <DataTable
              columns={columns}
              data={borrows}
              emptyMessage="You have no recorded book transactions."
              loading={loading}
            />
          );
        })()}
      </div>
    </div>
  );
};

export default MyBooks;
