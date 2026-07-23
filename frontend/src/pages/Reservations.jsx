import React, { useState, useEffect } from 'react';
import { getActiveReservations, reserveBook, cancelReservation } from '../services/api';
import { PageHeader, DataTable, StatusBadge } from '../components/layout/EnterpriseLibrary';
import '../styles/design-tokens.css';
import './Dashboard.css'; // Reuse table styling

const Reservations = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Create reservation state
  const [bookIdInput, setBookIdInput] = useState('');
  const [studentIdInput, setStudentIdInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = currentUser.role === 'admin';

  useEffect(() => {
    loadReservationsList();
  }, []);

  const loadReservationsList = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getActiveReservations();
      setReservations(data);
    } catch (err) {
      setError('Failed to load reservations queue.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReservation = async (e) => {
    e.preventDefault();
    if (!bookIdInput) {
      setError('Please fill in Book ID/ISBN/Title.');
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');
      const res = await reserveBook(bookIdInput, isAdmin ? studentIdInput : null);
      setSuccess(res.message || 'Book successfully reserved.');
      setBookIdInput('');
      setStudentIdInput('');
      loadReservationsList();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to place reservation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this reservation?')) return;
    try {
      setError('');
      setSuccess('');
      const res = await cancelReservation(id);
      setSuccess(res.message || 'Reservation cancelled.');
      loadReservationsList();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to cancel reservation.');
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
          title="Reservations Queue"
          subtitle="Track and place holds on out-of-stock books"
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

      {/* Place Hold / Reservation Form Card */}
      <div className="info-card" style={{ background: '#ffffff', borderRadius: '16px', padding: '2rem', border: '1px solid rgba(226,211,179,0.55)', marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem', color: 'var(--ink)' }}>Place a New Hold / Reservation</h3>
        <form onSubmit={handleCreateReservation} style={{ display: 'grid', gridTemplateColumns: isAdmin ? '1fr 1fr auto' : '1fr auto', gap: '1rem', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '600', fontSize: '0.85rem' }}>Book ID / ISBN / Exact Title</label>
            <input
              type="text"
              placeholder="e.g., 978-0132350884 or Clean Code"
              value={bookIdInput}
              onChange={(e) => setBookIdInput(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1.5px solid rgba(212,160,23,0.25)', background: '#fffdf9', outline: 'none' }}
            />
          </div>
          {isAdmin && (
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '600', fontSize: '0.85rem' }}>Student ID</label>
              <input
                type="text"
                placeholder="e.g., STU001"
                value={studentIdInput}
                onChange={(e) => setStudentIdInput(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1.5px solid rgba(212,160,23,0.25)', background: '#fffdf9', outline: 'none' }}
              />
            </div>
          )}
          <button
            type="submit"
            disabled={submitting}
            style={{
              background: 'linear-gradient(135deg, #e4a81e, #b88610)',
              color: '#ffffff',
              border: 'none',
              padding: '0.8rem 1.8rem',
              borderRadius: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              height: '46px',
              transition: 'all 0.25s ease'
            }}
          >
            {submitting ? 'Placing hold...' : 'Reserve Book'}
          </button>
        </form>
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
            { header: 'Date Reserved', cell: (row) => formatDate(row.reserved_at) },
            {
              header: 'Status',
              cell: (row) => (
                <StatusBadge 
                  label={row.status} 
                  variant={row.status === 'ready' ? 'success' : 'warning'} 
                />
              )
            },
            {
              header: 'Action',
              cell: (row) => (
                <button
                  onClick={() => handleCancel(row.id)}
                  style={{
                    background: '#fee2e2',
                    color: '#b91c1c',
                    border: '1px solid #fecaca',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel Hold
                </button>
              )
            }
          );

          return (
            <DataTable
              columns={columns}
              data={reservations}
              emptyMessage="No active holds or reservations in queue."
              loading={loading}
            />
          );
        })()}
      </div>
    </div>
  );
};

export default Reservations;
