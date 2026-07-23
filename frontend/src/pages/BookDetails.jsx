import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBook, deleteBook, getBarcodeImageUrl, getQrImageUrl } from '../services/api';
import './books.css';

// SVG Icons
const IconBack = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);

const IconEdit = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);

const IconTrash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

const IconBook = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
    <line x1="8" y1="7" x2="16" y2="7"></line>
    <line x1="8" y1="11" x2="14" y2="11"></line>
  </svg>
);

const BookDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const user = JSON.parse(stored);
        setIsAdmin(user.role === 'admin');
      } catch (_) { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    if (id) loadBook();
  }, [id]);

  const loadBook = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getBook(id);
      setBook(data);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 404) {
        setError('Book not found. It may have been removed from the catalogue.');
      } else if (status === 400) {
        setError('Invalid book ID format.');
      } else {
        setError('Failed to load book details. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete "${book?.title}"?\n\nThis action cannot be undone.`)) {
      return;
    }
    try {
      setDeleting(true);
      await deleteBook(id);
      navigate('/books', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to delete book.');
      setDeleting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="books-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{
            width: 40, height: 40, border: '3px solid rgba(212,160,23,0.15)',
            borderTopColor: '#D4A017', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem'
          }}></div>
          <span style={{ color: 'var(--ink-soft)', fontWeight: 600 }}>Loading book details…</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !book) {
    return (
      <div className="books-page">
        <button
          onClick={() => navigate('/books')}
          aria-label="Back to Books"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--gold-dark)', fontWeight: 700, fontSize: '0.95rem',
            padding: '0.5rem 0', marginBottom: '2rem',
          }}
        >
          <IconBack /> Back to Catalogue
        </button>
        <div style={{
          background: '#fdf2f2', border: '1.5px solid rgba(220,38,38,0.2)',
          borderRadius: 'var(--border-radius)', padding: '3rem', textAlign: 'center',
        }}>
          <p style={{ color: '#b91c1c', fontWeight: 700, fontSize: '1.1rem', marginBottom: '1rem' }}>
            {error}
          </p>
          <button
            onClick={() => navigate('/books')}
            style={{
              background: 'linear-gradient(135deg, var(--gold), var(--gold-dark))',
              color: '#fff', border: 'none', borderRadius: '10px',
              padding: '0.75rem 2rem', fontWeight: 700, cursor: 'pointer',
            }}
          >
            Return to Catalogue
          </button>
        </div>
      </div>
    );
  }

  if (!book) return null;

  const availabilityPct = book.total_copies > 0
    ? Math.round((book.available_copies / book.total_copies) * 100) : 0;

  return (
    <div className="books-page">
      {/* Back navigation */}
      <button
        onClick={() => navigate('/books')}
        aria-label="Back to Books"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--gold-dark)', fontWeight: 700, fontSize: '0.95rem',
          padding: '0.5rem 0', marginBottom: '2rem',
          transition: 'color 0.2s ease',
        }}
      >
        <IconBack /> Back to Catalogue
      </button>

      {/* Inline error banner */}
      {error && (
        <div style={{
          background: '#fdf2f2', color: '#b91c1c', fontWeight: 600,
          border: '1px solid #fee2e2', borderRadius: '12px', padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
        }}>
          {error}
        </div>
      )}

      {/* Main detail card */}
      <div style={{
        background: 'var(--card)', border: '1px solid rgba(226,211,179,0.5)',
        borderRadius: 'var(--border-radius)', overflow: 'hidden',
        boxShadow: 'var(--shadow-soft)',
      }}>
        {/* Header banner */}
        <div style={{
          background: 'linear-gradient(135deg, #faf6ec, #f5ecd5)',
          padding: '2.5rem 2.5rem 2rem', display: 'flex', gap: '2rem',
          alignItems: 'flex-start', flexWrap: 'wrap',
          borderBottom: '1px solid rgba(226,211,179,0.4)',
        }}>
          {/* Book icon / cover placeholder */}
          <div style={{
            width: 100, height: 130, borderRadius: 12,
            background: 'linear-gradient(135deg, #D4A017, #b3861b)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', flexShrink: 0,
            boxShadow: '0 8px 25px rgba(212,160,23,0.3)',
          }}>
            {book.cover_image ? (
              <img
                src={book.cover_image} alt={book.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }}
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
              />
            ) : null}
            <div style={{ display: book.cover_image ? 'none' : 'flex' }}><IconBook /></div>
          </div>

          {/* Title & meta */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--ink)', margin: 0, lineHeight: 1.3 }}>
                {book.title}
              </h1>
              <span className={`status ${book.is_available ? 'available' : 'unavailable'}`} style={{ marginTop: 4 }}>
                {book.is_available ? 'Available' : 'Unavailable'}
              </span>
            </div>
            <p style={{ fontSize: '1.1rem', color: 'var(--ink-soft)', fontWeight: 600, margin: '0 0 0.5rem' }}>
              by {book.author}
            </p>
            {book.genre && (
              <span style={{
                display: 'inline-block', background: 'rgba(212,160,23,0.1)',
                color: 'var(--gold-dark)', padding: '0.3rem 0.85rem', borderRadius: 20,
                fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.02em',
              }}>
                {book.genre}
              </span>
            )}
          </div>

          {/* Admin actions */}
          {isAdmin && (
            <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
              <button
                onClick={() => navigate('/books')}
                disabled
                title="Edit functionality available from catalogue view"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  background: '#fafafa', border: '1px solid rgba(0,0,0,0.08)',
                  borderRadius: 10, padding: '0.65rem 1.25rem',
                  fontWeight: 700, fontSize: '0.85rem', cursor: 'not-allowed',
                  color: 'var(--ink-soft)', opacity: 0.6,
                }}
              >
                <IconEdit /> Edit
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.1)',
                  borderRadius: 10, padding: '0.65rem 1.25rem',
                  fontWeight: 700, fontSize: '0.85rem', cursor: deleting ? 'wait' : 'pointer',
                  color: '#dc2626', transition: 'all 0.2s ease',
                }}
              >
                <IconTrash /> {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          )}
        </div>

        {/* Detail grid */}
        <div style={{ padding: '2.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          {/* Left column: book details */}
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--ink)', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.8rem' }}>
              Book Information
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <DetailRow label="ISBN" value={book.isbn} />
              <DetailRow label="Author" value={book.author} />
              <DetailRow label="Publisher" value={book.publisher} />
              <DetailRow label="Publication Year" value={book.publication_year} />
              <DetailRow label="Genre" value={book.genre} />
              <DetailRow label="Location" value={book.location || 'Not specified'} />
              <DetailRow label="Price" value={book.price != null ? `₹${book.price.toFixed(2)}` : '—'} />
            </div>
          </div>

          {/* Right column: availability + metadata */}
          <div>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--ink)', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Availability & Status
            </h3>

            {/* Availability bar */}
            <div style={{
              background: '#f8f6f0', borderRadius: 12, padding: '1.5rem',
              marginBottom: '1.5rem', border: '1px solid rgba(226,211,179,0.3)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)' }}>
                  {book.available_copies} of {book.total_copies} copies available
                </span>
                <span style={{ fontWeight: 800, color: 'var(--gold-dark)', fontSize: '0.9rem' }}>
                  {availabilityPct}%
                </span>
              </div>
              <div style={{ background: '#e5e7eb', borderRadius: 8, height: 10, overflow: 'hidden' }}>
                <div style={{
                  background: availabilityPct > 50
                    ? 'linear-gradient(135deg, #16a34a, #22c55e)'
                    : availabilityPct > 0
                      ? 'linear-gradient(135deg, #D4A017, #e8c55a)'
                      : 'linear-gradient(135deg, #dc2626, #ef4444)',
                  width: `${availabilityPct}%`,
                  height: '100%', borderRadius: 8,
                  transition: 'width 0.6s ease',
                }}></div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <DetailRow label="Total Copies" value={book.total_copies} />
              <DetailRow label="Available Copies" value={book.available_copies} />
              <DetailRow label="Status" value={book.is_available ? 'In Stock' : 'All Copies Issued'} highlight={book.is_available ? 'green' : 'red'} />
              <DetailRow label="Added to Catalogue" value={formatDate(book.created_at)} />
              <DetailRow label="Last Updated" value={formatDate(book.updated_at)} />
            </div>
          </div>
        </div>

        {/* Description section */}
        {book.description && (
          <div style={{
            padding: '0 2.5rem 1.5rem',
            borderTop: '1px solid rgba(226,211,179,0.25)',
            marginTop: '-0.5rem', paddingTop: '2rem',
          }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--ink)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Description
            </h3>
            <p style={{ color: 'var(--ink-soft)', lineHeight: 1.7, fontSize: '0.95rem' }}>
              {book.description}
            </p>
          </div>
        )}

        {/* Barcode & QR Code Section */}
        <div style={{
          padding: '2rem 2.5rem',
          borderTop: '1px solid rgba(226,211,179,0.25)',
          background: '#faf8f5',
        }}>
          <h3 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--ink)', marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Barcode & QR Code Management
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {/* Barcode Box */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', textAlign: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Barcode (Code128)</span>
              <div style={{ margin: '1rem 0' }}>
                <img
                  src={getBarcodeImageUrl(book.barcode_value || `LIB-${book.isbn}`)}
                  alt="Barcode"
                  style={{ maxHeight: '70px', maxWidth: '100%', objectFit: 'contain' }}
                />
              </div>
              <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1e293b', marginBottom: '1rem', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', display: 'inline-block' }}>
                {book.barcode_value || `LIB-${book.isbn}`}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                <button
                  style={{ padding: '0.5rem 0.85rem', fontSize: '0.8rem', fontWeight: 600, borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
                  onClick={() => {
                    fetch(getBarcodeImageUrl(book.barcode_value || `LIB-${book.isbn}`))
                      .then(res => res.blob())
                      .then(blob => {
                        const a = document.createElement('a');
                        a.href = URL.createObjectURL(blob);
                        a.download = `Barcode-${book.isbn}.png`;
                        a.click();
                      });
                  }}
                >
                  ⬇️ Download Barcode PNG
                </button>
                <button
                  style={{ padding: '0.5rem 0.85rem', fontSize: '0.8rem', fontWeight: 600, borderRadius: '6px', border: '1px solid #fde68a', background: '#fef3c7', color: '#92400e', cursor: 'pointer' }}
                  onClick={() => {
                    const win = window.open('', '_blank', 'width=500,height=300');
                    if (!win) return;
                    win.document.write(`
                      <html>
                        <body style="font-family:sans-serif; text-align:center; padding:20px;">
                          <h3>${book.title}</h3>
                          <img src="${getBarcodeImageUrl(book.barcode_value || `LIB-${book.isbn}`)}" />
                          <p style="font-family:monospace;">${book.barcode_value || `LIB-${book.isbn}`}</p>
                          <script>window.onload = function() { window.print(); window.close(); };</script>
                        </body>
                      </html>
                    `);
                    win.document.close();
                  }}
                >
                  🖨️ Print Barcode Label
                </button>
              </div>
            </div>

            {/* QR Code Box */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', textAlign: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>QR Code</span>
              <div style={{ margin: '1rem 0' }}>
                <img
                  src={getQrImageUrl(book.qr_value || `QR-LIB-${book.isbn}`)}
                  alt="QR Code"
                  style={{ maxHeight: '110px', maxWidth: '100%', objectFit: 'contain' }}
                />
              </div>
              <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1e293b', marginBottom: '1rem', background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', display: 'inline-block' }}>
                {book.qr_value || `QR-LIB-${book.isbn}`}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                <button
                  style={{ padding: '0.5rem 0.85rem', fontSize: '0.8rem', fontWeight: 600, borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
                  onClick={() => {
                    fetch(getQrImageUrl(book.qr_value || `QR-LIB-${book.isbn}`))
                      .then(res => res.blob())
                      .then(blob => {
                        const a = document.createElement('a');
                        a.href = URL.createObjectURL(blob);
                        a.download = `QR-${book.isbn}.png`;
                        a.click();
                      });
                  }}
                >
                  ⬇️ Download QR PNG
                </button>
                <button
                  style={{ padding: '0.5rem 0.85rem', fontSize: '0.8rem', fontWeight: 600, borderRadius: '6px', border: '1px solid #fde68a', background: '#fef3c7', color: '#92400e', cursor: 'pointer' }}
                  onClick={() => {
                    const win = window.open('', '_blank', 'width=500,height=350');
                    if (!win) return;
                    win.document.write(`
                      <html>
                        <body style="font-family:sans-serif; text-align:center; padding:20px;">
                          <h3>${book.title}</h3>
                          <img src="${getQrImageUrl(book.qr_value || `QR-LIB-${book.isbn}`)}" style="max-width:180px;" />
                          <p style="font-family:monospace;">${book.qr_value || `QR-LIB-${book.isbn}`}</p>
                          <script>window.onload = function() { window.print(); window.close(); };</script>
                        </body>
                      </html>
                    `);
                    win.document.close();
                  }}
                >
                  🖨️ Print QR Label
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/** Reusable detail row */
const DetailRow = ({ label, value, highlight }) => {
  const colors = {
    green: '#16a34a',
    red: '#dc2626',
  };
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: '0.4rem', borderBottom: '1px solid rgba(226,211,179,0.15)' }}>
      <span style={{ color: 'var(--ink-soft)', fontSize: '0.88rem', fontWeight: 600 }}>{label}</span>
      <span style={{
        color: highlight ? colors[highlight] : 'var(--ink)',
        fontWeight: 750, fontSize: '0.92rem', textAlign: 'right',
      }}>
        {value || '—'}
      </span>
    </div>
  );
};

export default BookDetailPage;
