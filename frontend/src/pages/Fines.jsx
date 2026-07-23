import React, { useState, useEffect } from 'react';
import { getFines, payFine } from '../services/api';
import { PageHeader, DataTable } from '../components/layout/EnterpriseLibrary';
import '../styles/design-tokens.css';
import './Dashboard.css';

const Fines = () => {
  const [fines, setFines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('unpaid'); // 'unpaid' or 'paid'
  const [payingId, setPayingId] = useState(null);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = currentUser.role === 'admin';

  useEffect(() => {
    loadFinesList();
  }, [activeTab]);

  const loadFinesList = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getFines(activeTab === 'paid');
      // Handle paginated envelope or raw array
      if (data && data.fines) {
        setFines(data.fines);
      } else if (Array.isArray(data)) {
        setFines(data);
      } else {
        setFines([]);
      }
    } catch (err) {
      setError('Failed to load fines list.');
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async (id) => {
    if (!window.confirm('Confirm fine payment?')) return;
    try {
      setPayingId(id);
      setError('');
      setSuccess('');
      const res = await payFine(id);
      setSuccess(res.message || 'Fine successfully paid.');
      loadFinesList();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to pay fine.');
    } finally {
      setPayingId(null);
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

  return (
    <div className="dashboard-wrapper" style={{ padding: '2rem' }}>
      {/* ── PageHeader Component Migration ── */}
      <div style={{ marginBottom: '2rem', borderBottom: '1px solid var(--eu-color-border-main)', paddingBottom: '1.25rem' }}>
        <PageHeader
          title="Fine Management"
          subtitle="Late return fee logs"
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

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1.5px solid rgba(226,211,179,0.25)', paddingBottom: '1rem' }}>
        <button
          onClick={() => setActiveTab('unpaid')}
          style={{
            background: activeTab === 'unpaid' ? 'linear-gradient(135deg, #e4a81e, #b88610)' : 'transparent',
            color: activeTab === 'unpaid' ? '#ffffff' : 'var(--ink)',
            border: activeTab === 'unpaid' ? 'none' : '1px solid rgba(212,160,23,0.3)',
            padding: '0.6rem 1.5rem',
            borderRadius: '8px',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.25s ease'
          }}
        >
          Outstanding Fines
        </button>
        <button
          onClick={() => setActiveTab('paid')}
          style={{
            background: activeTab === 'paid' ? 'linear-gradient(135deg, #e4a81e, #b88610)' : 'transparent',
            color: activeTab === 'paid' ? '#ffffff' : 'var(--ink)',
            border: activeTab === 'paid' ? 'none' : '1px solid rgba(212,160,23,0.3)',
            padding: '0.6rem 1.5rem',
            borderRadius: '8px',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.25s ease'
          }}
        >
          Payment History
        </button>
      </div>

      <div className="info-card" style={{ background: '#ffffff', borderRadius: '16px', padding: '2rem', border: '1px solid rgba(226,211,179,0.55)' }}>
        {(() => {
          const columns = [];
          if (isAdmin) {
            columns.push({
              header: 'Student',
              cell: (row) => (
                <div>
                  <div style={{ fontWeight: 'bold' }}>{row.student_name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--ink-light)' }}>{row.student_id}</div>
                </div>
              )
            });
          }
          columns.push(
            { header: 'Book Title', cell: (row) => <span style={{ fontWeight: 'bold' }}>{row.book_title}</span> },
            { header: 'Reason', accessor: 'reason' },
            { header: 'Date Generated', cell: (row) => formatDate(row.created_at) },
            {
              header: 'Amount',
              cell: (row) => (
                <span style={{ fontWeight: 'bold', color: activeTab === 'unpaid' ? '#b91c1c' : '#166534' }}>
                  ₹{row.amount.toFixed(2)}
                </span>
              )
            }
          );
          if (activeTab === 'paid') {
            columns.push({ header: 'Paid Date', cell: (row) => formatDate(row.paid_at) });
          } else {
            columns.push({
              header: 'Action',
              cell: (row) => (
                <button
                  onClick={() => handlePay(row.id)}
                  disabled={payingId === row.id}
                  style={{
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    opacity: payingId === row.id ? 0.7 : 1
                  }}
                >
                  {payingId === row.id ? 'Processing...' : 'Pay Fine'}
                </button>
              )
            });
          }

          return (
            <DataTable
              columns={columns}
              data={fines}
              emptyMessage="No fines found in this category."
              loading={loading}
            />
          );
        })()}
      </div>
    </div>
  );
};

export default Fines;
