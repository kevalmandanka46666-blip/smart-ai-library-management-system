import React, { useState, useEffect } from 'react';
import { createBook, updateBook, getBarcodeImageUrl, getQrImageUrl, validateCode } from '../../services/api';

const BookForm = ({ book, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    publisher: '',
    publication_year: '',
    genre: '',
    description: '',
    total_copies: 1,
    available_copies: 1,
    location: '',
    price: 0,
    cover_image: '',
    barcode_value: '',
    qr_value: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [codeWarning, setCodeWarning] = useState('');

  useEffect(() => {
    if (book) {
      setFormData({
        title: book.title || '',
        author: book.author || '',
        isbn: book.isbn || '',
        publisher: book.publisher || '',
        publication_year: book.publication_year || '',
        genre: book.genre || '',
        description: book.description || '',
        total_copies: book.total_copies || 1,
        available_copies: book.available_copies || 1,
        location: book.location || '',
        price: book.price || 0,
        cover_image: book.cover_image || '',
        barcode_value: book.barcode_value || (book.isbn ? `LIB-${book.isbn.replace(/\D/g, '')}` : ''),
        qr_value: book.qr_value || (book.isbn ? `QR-LIB-${book.isbn.replace(/\D/g, '')}` : '')
      });
    }
  }, [book]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const nextVal = type === 'number' ? parseFloat(value) || 0 : value;
    
    setFormData((prev) => {
      const updated = { ...prev, [name]: nextVal };
      if (name === 'isbn' && value) {
        const cleanIsbn = value.replace(/\D/g, '') || value;
        if (!prev.barcode_value || prev.barcode_value.startsWith('LIB-')) {
          updated.barcode_value = `LIB-${cleanIsbn}`;
        }
        if (!prev.qr_value || prev.qr_value.startsWith('QR-LIB-')) {
          updated.qr_value = `QR-LIB-${cleanIsbn}`;
        }
      }
      return updated;
    });
  };

  const handleValidateBarcode = async () => {
    if (!formData.barcode_value) return;
    try {
      const res = await validateCode('barcode', formData.barcode_value, book?.id || book?._id);
      if (!res.valid) {
        setCodeWarning(res.message);
      } else {
        setCodeWarning('');
      }
    } catch (_) {}
  };

  const handleValidateQr = async () => {
    if (!formData.qr_value) return;
    try {
      const res = await validateCode('qr', formData.qr_value, book?.id || book?._id);
      if (!res.valid) {
        setCodeWarning(res.message);
      } else {
        setCodeWarning('');
      }
    } catch (_) {}
  };

  const validate = () => {
    if (!formData.title.trim()) { setError('Title required'); return false; }
    if (!formData.author.trim()) { setError('Author required'); return false; }
    if (!formData.isbn.trim()) { setError('ISBN required'); return false; }
    if (formData.total_copies < 1) { setError('Total copies must be at least 1'); return false; }
    if (formData.available_copies > formData.total_copies) {
      setError('Available copies cannot exceed total copies');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!validate()) return;
    
    setLoading(true);
    try {
      if (book?.id || book?._id) {
        await updateBook(book.id || book._id, formData);
        setSuccess('Book updated!');
      } else {
        await createBook(formData);
        setSuccess('Book added!');
        if (!book) {
          setFormData({
            title: '', author: '', isbn: '', publisher: '',
            publication_year: '', genre: '', description: '',
            total_copies: 1, available_copies: 1, location: '',
            price: 0, cover_image: '', barcode_value: '', qr_value: ''
          });
        }
      }
      if (onSave) setTimeout(onSave, 1500);
    } catch (err) {
      setError(err.response?.data?.detail || 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  const currentBarcode = formData.barcode_value || (formData.isbn ? `LIB-${formData.isbn.replace(/\D/g, '')}` : '');
  const currentQr = formData.qr_value || (currentBarcode ? `QR-${currentBarcode}` : '');

  return (
    <div className="book-form">
      <h2>{book?.id ? '✏️ Edit Book' : '➕ Add Book'}</h2>
      
      <form onSubmit={handleSubmit}>
        {error && <div className="error">{error}<button type="button" onClick={() => setError('')}>✕</button></div>}
        {success && <div className="success">✅ {success}</div>}
        {codeWarning && <div className="error" style={{ background: '#fffbe5', color: '#b45309', border: '1px solid #fde68a' }}>⚠️ {codeWarning}</div>}
        
        <div className="form-grid">
          <div>
            <div className="form-group">
              <label>Title *</label>
              <input type="text" name="title" value={formData.title} onChange={handleChange} required />
            </div>
            
            <div className="form-group">
              <label>Author *</label>
              <input type="text" name="author" value={formData.author} onChange={handleChange} required />
            </div>
            
            <div className="form-group">
              <label>ISBN *</label>
              <input type="text" name="isbn" value={formData.isbn} onChange={handleChange} required />
            </div>
            
            <div className="form-group">
              <label>Publisher</label>
              <input type="text" name="publisher" value={formData.publisher} onChange={handleChange} />
            </div>
            
            <div className="form-group">
              <label>Publication Year</label>
              <input type="number" name="publication_year" value={formData.publication_year} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Barcode Value (Auto-Generated)</label>
              <input type="text" name="barcode_value" value={formData.barcode_value} onChange={handleChange} onBlur={handleValidateBarcode} placeholder="e.g. LIB-9780123456" />
            </div>
          </div>
          
          <div>
            <div className="form-group">
              <label>Genre</label>
              <input type="text" name="genre" value={formData.genre} onChange={handleChange} />
            </div>
            
            <div className="form-group">
              <label>Total Copies *</label>
              <input type="number" name="total_copies" value={formData.total_copies} onChange={handleChange} min="1" required />
            </div>
            
            <div className="form-group">
              <label>Available Copies *</label>
              <input type="number" name="available_copies" value={formData.available_copies} onChange={handleChange} min="0" required />
            </div>
            
            <div className="form-group">
              <label>Location</label>
              <input type="text" name="location" value={formData.location} onChange={handleChange} />
            </div>
            
            <div className="form-group">
              <label>Price (₹)</label>
              <input type="number" name="price" value={formData.price} onChange={handleChange} step="0.01" />
            </div>

            <div className="form-group">
              <label>QR Code Value (Auto-Generated)</label>
              <input type="text" name="qr_value" value={formData.qr_value} onChange={handleChange} onBlur={handleValidateQr} placeholder="e.g. QR-LIB-9780123456" />
            </div>
          </div>
        </div>

        {/* Live Barcode & QR Code Preview */}
        {currentBarcode && (
          <div style={{ marginTop: '1.25rem', padding: '1rem', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1', display: 'flex', gap: '1.5rem', alignItems: 'center', justifyContent: 'space-around' }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>BARCODE PREVIEW</span>
              <img src={getBarcodeImageUrl(currentBarcode)} alt="Barcode Preview" style={{ maxHeight: '48px', background: '#fff', padding: '4px', borderRadius: '4px', border: '1px solid #e2e8f0' }} />
              <span style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'monospace', color: '#334155' }}>{currentBarcode}</span>
            </div>

            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>QR CODE PREVIEW</span>
              <img src={getQrImageUrl(currentQr)} alt="QR Preview" style={{ maxHeight: '60px', background: '#fff', padding: '4px', borderRadius: '4px', border: '1px solid #e2e8f0' }} />
              <span style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'monospace', color: '#334155' }}>{currentQr}</span>
            </div>
          </div>
        )}
        
        <div className="form-actions" style={{ marginTop: '1.5rem' }}>
          <button type="submit" disabled={loading}>{loading ? 'Saving...' : '💾 Save'}</button>
          {onCancel && <button type="button" onClick={onCancel}>Cancel</button>}
        </div>
      </form>
    </div>
  );
};

export default BookForm;