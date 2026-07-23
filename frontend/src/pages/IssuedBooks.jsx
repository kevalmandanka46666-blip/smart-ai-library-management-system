import React, { useState, useEffect } from 'react';
import { getStudentBorrows } from '../services/api';
import { PageHeader, DataTable, StatusBadge } from '../components/layout/EnterpriseLibrary';
import '../styles/design-tokens.css';
import './Dashboard.css';

const IssuedBooks = () => {
  const [issued, setIssued] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadIssued();
  }, []);

  const loadIssued = async () => {
    try {
      setLoading(true);
      const stored = localStorage.getItem('user');
      if (stored) {
        const user = JSON.parse(stored);
        const data = await getStudentBorrows(user.username || 'STU-001');
        const active = data.filter(tx => tx.status === 'issued');
        setIssued(active);
      }
    } catch (err) {
      setError('Could not retrieve active issue records.');
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
          title="My Active Issues"
          subtitle="Currently Checked Out"
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
            {
              header: 'Days Remaining',
              cell: (row) => {
                const remainingDays = Math.ceil((new Date(row.due_date) - new Date()) / (1000 * 60 * 60 * 24));
                return (
                  <span style={{ fontWeight: '700', color: remainingDays < 3 ? '#dc2626' : 'var(--ink)' }}>
                    {remainingDays > 0 ? `${remainingDays} days` : 'Overdue'}
                  </span>
                );
              }
            },
            {
              header: 'Action',
              cell: (row) => {
                const remainingDays = Math.ceil((new Date(row.due_date) - new Date()) / (1000 * 60 * 60 * 24));
                return (
                  <StatusBadge 
                    label={remainingDays < 0 ? 'Overdue' : 'Active'} 
                    variant={remainingDays < 0 ? 'danger' : 'warning'} 
                  />
                );
              }
            }
          ];

          return (
            <DataTable
              columns={columns}
              data={issued}
              emptyMessage="You have no checked out books."
              loading={loading}
            />
          );
        })()}
      </div>
    </div>
  );
};

export default IssuedBooks;
