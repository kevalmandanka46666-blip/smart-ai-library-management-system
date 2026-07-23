import React, { useState, useEffect } from 'react';
import { getBooks, getBarcodeImageUrl, getQrImageUrl, bulkGenerateBarcodes, searchBookByCode } from '../services/api';
import './BarcodeManagement.css';

const BarcodeManagement = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [scanInput, setScanInput] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState('');
  const [bulkStatus, setBulkStatus] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedBookForPrint, setSelectedBookForPrint] = useState(null);

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const data = await getBooks(0, 500);
      setBooks(data || []);
    } catch (err) {
      console.error('Failed to fetch books for barcode management:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkGenerate = async (force = false) => {
    try {
      setIsGenerating(true);
      setBulkStatus('Generating barcodes and QR codes for library catalog...');
      const res = await bulkGenerateBarcodes(force);
      setBulkStatus(res.message || 'Bulk generation completed successfully!');
      await fetchBooks();
    } catch (err) {
      setBulkStatus('Error during bulk generation: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsGenerating(false);
      setTimeout(() => setBulkStatus(''), 6000);
    }
  };

  const handleScanSearch = async (e) => {
    e.preventDefault();
    if (!scanInput.trim()) return;
    try {
      setScanError('');
      setScanResult(null);
      const book = await searchBookByCode(scanInput.trim());
      setScanResult(book);
    } catch (err) {
      setScanError(err.response?.data?.detail || 'No book found matching scanned code.');
    }
  };

  const downloadImage = (url, filename) => {
    fetch(url)
      .then((res) => res.blob())
      .then((blob) => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      })
      .catch((err) => console.error('Error downloading code image:', err));
  };

  const triggerPrintLabel = (book, type = 'all') => {
    const printWindow = window.open('', '_blank', 'width=600,height=400');
    if (!printWindow) return;

    const barcodeUrl = getBarcodeImageUrl(book.barcode_value || `LIB-${book.isbn}`);
    const qrUrl = getQrImageUrl(book.qr_value || `QR-LIB-${book.isbn}`);

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Label - ${book.title}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; text-align: center; }
            .label-box { border: 2px solid #000; padding: 15px; border-radius: 8px; max-width: 320px; margin: 0 auto; }
            .title { font-weight: bold; font-size: 16px; margin-bottom: 4px; }
            .author { font-size: 12px; color: #555; margin-bottom: 12px; }
            .code-img { max-width: 100%; height: auto; margin: 8px 0; }
            .code-val { font-family: monospace; font-size: 12px; margin-top: 4px; }
          </style>
        </head>
        <body>
          <div class="label-box">
            <div class="title">${book.title}</div>
            <div class="author">By ${book.author}</div>
            ${(type === 'all' || type === 'barcode') ? `<div><img class="code-img" src="${barcodeUrl}" /><div class="code-val">${book.barcode_value || ''}</div></div>` : ''}
            ${(type === 'all' || type === 'qr') ? `<div><img class="code-img" src="${qrUrl}" /><div class="code-val">${book.qr_value || ''}</div></div>` : ''}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const filteredBooks = books.filter((b) => {
    const q = searchQuery.toLowerCase();
    return (
      b.title?.toLowerCase().includes(q) ||
      b.author?.toLowerCase().includes(q) ||
      b.isbn?.toLowerCase().includes(q) ||
      b.barcode_value?.toLowerCase().includes(q) ||
      b.qr_value?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="barcode-management-page">
      <div className="page-header-actions">
        <div className="header-title-section">
          <h1>Barcode & QR Management</h1>
          <p>Generate, download, search, and print physical barcode & QR label stickers for books</p>
        </div>
        <div className="header-buttons">
          <button
            className="btn-secondary-action"
            onClick={() => handleBulkGenerate(false)}
            disabled={isGenerating}
          >
            ⚡ Bulk Missing Codes
          </button>
          <button
            className="btn-primary-action"
            onClick={() => handleBulkGenerate(true)}
            disabled={isGenerating}
          >
            🔄 Bulk Regenerate All
          </button>
        </div>
      </div>

      {bulkStatus && (
        <div style={{ padding: '0.85rem 1rem', background: '#eff6ff', color: '#1e40af', borderRadius: '8px', marginBottom: '1.25rem', border: '1px solid #bfdbfe' }}>
          {bulkStatus}
        </div>
      )}

      {/* Live Scanner Search Bar */}
      <div className="quick-scanner-card">
        <div className="scanner-header">
          <h3>📷 Search Book using Barcode / QR Scan</h3>
        </div>
        <form onSubmit={handleScanSearch} className="scanner-input-group">
          <input
            type="text"
            className="scanner-input"
            placeholder="Scan USB barcode reader or type Barcode / QR value..."
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            autoFocus
          />
          <button type="submit" className="btn-primary-action">
            Search Code
          </button>
        </form>

        {scanError && (
          <div style={{ marginTop: '0.75rem', color: '#dc2626', fontWeight: 600, fontSize: '0.9rem' }}>
            ⚠️ {scanError}
          </div>
        )}

        {scanResult && (
          <div style={{ marginTop: '1rem', padding: '1rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ margin: '0 0 0.25rem 0', color: '#166534' }}>Found: {scanResult.title}</h4>
              <p style={{ margin: 0, color: '#15803d', fontSize: '0.85rem' }}>Author: {scanResult.author} | ISBN: {scanResult.isbn} | Barcode: {scanResult.barcode_value}</p>
            </div>
            <button className="btn-secondary-action" onClick={() => triggerPrintLabel(scanResult, 'all')}>
              🖨️ Print Sticker Label
            </button>
          </div>
        )}
      </div>

      {/* Catalog Search & Grid */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Filter by title, author, barcode or QR..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '100%', maxWidth: '400px', padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
        />
        <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Showing {filteredBooks.length} books</span>
      </div>

      {loading ? (
        <div style={{ textAlignment: 'center', padding: '3rem', color: '#64748b' }}>Loading barcode records...</div>
      ) : (
        <div className="barcodes-grid">
          {filteredBooks.map((book) => {
            const barcodeVal = book.barcode_value || `LIB-${book.isbn}`;
            const qrVal = book.qr_value || `QR-LIB-${book.isbn}`;
            const barcodeImg = getBarcodeImageUrl(barcodeVal);
            const qrImg = getQrImageUrl(qrVal);

            return (
              <div key={book.id || book._id} className="code-card">
                <div className="code-card-header">
                  <h4 className="code-card-title">{book.title}</h4>
                  <p className="code-card-author">{book.author} (ISBN: {book.isbn})</p>
                </div>

                <div className="code-previews-container">
                  <div className="preview-box">
                    <span className="preview-label">Barcode</span>
                    <img src={barcodeImg} alt="Barcode" />
                    <span className="code-value-text">{barcodeVal}</span>
                  </div>
                  <div className="preview-box">
                    <span className="preview-label">QR Code</span>
                    <img src={qrImg} alt="QR Code" />
                    <span className="code-value-text">{qrVal}</span>
                  </div>
                </div>

                <div className="code-card-actions">
                  <button
                    className="btn-card-action"
                    onClick={() => downloadImage(barcodeImg, `Barcode-${book.isbn}.png`)}
                  >
                    ⬇️ Barcode PNG
                  </button>
                  <button
                    className="btn-card-action"
                    onClick={() => downloadImage(qrImg, `QR-${book.isbn}.png`)}
                  >
                    ⬇️ QR PNG
                  </button>
                  <button
                    className="btn-card-action btn-card-primary"
                    onClick={() => triggerPrintLabel(book, 'barcode')}
                  >
                    🖨️ Print Barcode
                  </button>
                  <button
                    className="btn-card-action btn-card-primary"
                    onClick={() => triggerPrintLabel(book, 'qr')}
                  >
                    🖨️ Print QR
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BarcodeManagement;
