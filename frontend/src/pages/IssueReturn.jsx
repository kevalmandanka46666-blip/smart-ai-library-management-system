import React, { useState } from 'react';
import { issueBook, returnBook, scanIssueBook, scanReturnBook } from '../services/api';
import './Students.css'; // Reuse form styles

const IssueReturn = () => {
  const [actionType, setActionType] = useState('issue'); // 'issue' or 'return'
  const [studentId, setStudentId] = useState('');
  const [bookId, setBookId] = useState('');
  const [scannedCode, setScannedCode] = useState('');
  const [useScanMode, setUseScanMode] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    setIsLoading(true);
    try {
      let res;
      if (useScanMode) {
        if (!scannedCode.trim()) {
          setError('Please scan or enter a barcode/QR code.');
          setIsLoading(false);
          return;
        }
        if (actionType === 'issue') {
          if (!studentId.trim()) {
            setError('Please enter Student ID for issuing book via scan.');
            setIsLoading(false);
            return;
          }
          res = await scanIssueBook(scannedCode.trim(), studentId.trim());
        } else {
          res = await scanReturnBook(scannedCode.trim());
        }
      } else {
        if (!studentId || !bookId) {
          setError('Please fill in all fields.');
          setIsLoading(false);
          return;
        }
        if (actionType === 'issue') {
          res = await issueBook(studentId, bookId);
        } else {
          res = await returnBook(studentId, bookId);
        }
      }
      setSuccess(res.message || 'Operation successful!');
      setStudentId('');
      setBookId('');
      setScannedCode('');
    } catch (err) {
      setError(err?.response?.data?.detail || 'Operation failed. Please verify code or IDs.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="students-wrapper" style={{ width: '100%', maxWidth: 'none', margin: '0', padding: '2rem 3rem' }}>
      <header className="students-header" style={{ marginBottom: '2rem' }}>
        <h2>Book Issue & Return Panel</h2>
        <span className="subtitle-text">Librarian terminal for barcode/QR scanning borrowing transactions</span>
      </header>

      <div className="add-student-card" style={{ background: '#ffffff', borderRadius: '16px', padding: '2.5rem', border: '1px solid rgba(226,211,179,0.55)', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}>
        
        {/* Action Toggle Tab */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', borderBottom: '1.5px solid rgba(226,211,179,0.25)', paddingBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              type="button" 
              onClick={() => { setActionType('issue'); setError(''); setSuccess(''); }}
              style={{ 
                background: actionType === 'issue' ? 'linear-gradient(135deg, #e4a81e, #b88610)' : 'transparent',
                color: actionType === 'issue' ? '#ffffff' : 'var(--ink)',
                border: actionType === 'issue' ? 'none' : '1px solid rgba(212,160,23,0.3)',
                padding: '0.75rem 1.75rem',
                borderRadius: '8px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.25s ease'
              }}
            >
              Issue Book
            </button>
            <button 
              type="button" 
              onClick={() => { setActionType('return'); setError(''); setSuccess(''); }}
              style={{ 
                background: actionType === 'return' ? 'linear-gradient(135deg, #e4a81e, #b88610)' : 'transparent',
                color: actionType === 'return' ? '#ffffff' : 'var(--ink)',
                border: actionType === 'return' ? 'none' : '1px solid rgba(212,160,23,0.3)',
                padding: '0.75rem 1.75rem',
                borderRadius: '8px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.25s ease'
              }}
            >
              Return Book
            </button>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.9rem', color: '#475569', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={useScanMode}
              onChange={(e) => setUseScanMode(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: '#d4a017' }}
            />
            📷 Barcode / QR Scanner Mode
          </label>
        </div>

        {error && (
          <div className="error-alert" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fee2e2', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', fontWeight: '600' }}>
            {error}
          </div>
        )}

        {success && (
          <div className="success-alert" style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #dcfce7', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', fontWeight: '600' }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="student-form">
          {useScanMode ? (
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ background: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontWeight: '700', marginBottom: '0.5rem', display: 'block', fontSize: '1rem', color: '#0f172a' }}>
                  📷 Scanned Barcode / QR Code *
                </label>
                <input
                  type="text"
                  value={scannedCode}
                  onChange={(e) => setScannedCode(e.target.value)}
                  placeholder="Scan USB barcode reader or type code (e.g. LIB-9780123456 or QR-LIB-9780123456)..."
                  className="form-input"
                  style={{ width: '100%', boxSizing: 'border-box', fontSize: '1.1rem', padding: '0.85rem 1rem', border: '2px solid #d4a017' }}
                  autoFocus
                />
                <span style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem', display: 'block' }}>
                  Point physical barcode gun / scanner at book label to auto-populate.
                </span>
              </div>

              {actionType === 'issue' && (
                <div>
                  <label className="form-label" style={{ fontWeight: '700', marginBottom: '0.5rem', display: 'block' }}>Student ID / Email *</label>
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="e.g. STU-001 or student@univ.edu"
                    className="form-input"
                    style={{ width: '100%', boxSizing: 'border-box' }}
                    required
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
              <div>
                <label className="form-label" style={{ fontWeight: '700', marginBottom: '0.5rem', display: 'block' }}>Student ID *</label>
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="e.g. STU-001"
                  className="form-input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: '700', marginBottom: '0.5rem', display: 'block' }}>Book ID / ISBN *</label>
                <input
                  type="text"
                  value={bookId}
                  onChange={(e) => setBookId(e.target.value)}
                  placeholder="e.g. Book ID or ISBN number"
                  className="form-input"
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  required
                />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              type="submit" 
              className="save-btn" 
              disabled={isLoading}
              style={{ 
                background: 'linear-gradient(135deg, #e4a81e, #b88610)', 
                color: '#ffffff', 
                border: 'none', 
                padding: '0.9rem 2.5rem', 
                borderRadius: '8px', 
                fontWeight: '700', 
                fontSize: '1rem',
                cursor: 'pointer',
                boxShadow: '0 8px 20px rgba(212,160,23,0.2)'
              }}
            >
              {isLoading ? 'Processing...' : actionType === 'issue' ? 'Confirm Issue' : 'Confirm Return'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IssueReturn;
