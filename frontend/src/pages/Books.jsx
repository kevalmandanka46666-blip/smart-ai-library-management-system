import React, { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { browseBooks, getGenres, bulkDeleteBooks, exportBooksCsvUrl, importBooksCsv } from '../services/api';
import BookForm from '../components/Books/BookForm';
import { PageHeader, StatusBadge, EmptyState, LoadingSkeleton } from '../components/layout/EnterpriseLibrary';
import '../styles/design-tokens.css';
import './books.css';

// Memoized SVG Icons for render optimization
const IconSearch = memo(() => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
));

const IconFilter = memo(() => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
  </svg>
));

const IconChevronLeft = memo(() => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
));

const IconChevronRight = memo(() => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
));

const IconTrash = memo(() => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
));

const Books = () => {
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Advanced Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState(''); // '', 'available', 'unavailable'
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [genres, setGenres] = useState([]);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(12);
  const [totalBooks, setTotalBooks] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Bulk Action States
  const [selectedBookIds, setSelectedBookIds] = useState([]);

  // CSV Import/Export States
  const [importStatus, setImportStatus] = useState('');
  const [importErrors, setImportErrors] = useState([]);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const user = JSON.parse(stored);
        setIsAdmin(user.role === 'admin');
      } catch (e) {
        console.error(e);
      }
    }
    loadGenresList();
  }, []);

  useEffect(() => {
    loadBooksData();
  }, [searchTerm, selectedGenre, availabilityFilter, sortBy, sortOrder, currentPage]);

  const loadGenresList = async () => {
    try {
      const distinctGenres = await getGenres();
      setGenres(distinctGenres);
    } catch (err) {
      console.error('Failed to load genres', err);
    }
  };

  const loadBooksData = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {
        query: searchTerm || undefined,
        genre: selectedGenre || undefined,
        is_available: availabilityFilter === 'available' ? true : availabilityFilter === 'unavailable' ? false : undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        page: currentPage,
        page_size: pageSize
      };
      const response = await browseBooks(params);
      setBooks(response.books || []);
      setTotalBooks(response.total || 0);
      setTotalPages(response.total_pages || 1);
    } catch (err) {
      setError('Failed to load books from server.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await bulkDeleteBooks([id]);
      setSelectedBookIds(prev => prev.filter(item => item !== id));
      loadBooksData();
      loadGenresList();
    } catch (err) {
      setError('Failed to delete book');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedBookIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete all ${selectedBookIds.length} selected books?`)) return;
    try {
      await bulkDeleteBooks(selectedBookIds);
      setSelectedBookIds([]);
      loadBooksData();
      loadGenresList();
    } catch (err) {
      setError('Bulk delete failed');
    }
  };

  const handleCsvExport = () => {
    const token = localStorage.getItem('access_token');
    const exportUrl = exportBooksCsvUrl();
    
    // Perform file download by creating a temporary anchor tag with proper authorization if required.
    // In our backend implementation, current_admin is a Dependency which checks standard authorization.
    // If the browser session is authenticated, we can direct location.href or fetch. We'll use a direct link.
    const a = document.createElement('a');
    a.href = exportUrl;
    a.download = 'library_books_export.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCsvImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus('Importing books...');
    setImportErrors([]);
    try {
      const response = await importImportFile(file);
      setImportStatus(`Import successful! Added ${response.imported} books. Skipped ${response.skipped} rows.`);
      if (response.errors && response.errors.length > 0) {
        setImportErrors(response.errors);
      }
      loadBooksData();
      loadGenresList();
    } catch (err) {
      setImportStatus('CSV Import failed. Check file format.');
      setImportErrors([err.response?.data?.detail || 'Unexpected error occurred.']);
    }
  };

  const importImportFile = async (file) => {
    return await importBooksCsv(file);
  };

  const toggleSelectBook = (id) => {
    setSelectedBookIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedBookIds.length === books.length) {
      setSelectedBookIds([]);
    } else {
      setSelectedBookIds(books.map(b => b.id));
    }
  };

  const handleEdit = (book) => {
    setEditingBook(book);
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditingBook(null);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingBook(null);
    loadBooksData();
    loadGenresList();
  };

  if (showForm) {
    return <BookForm book={editingBook} onSave={handleFormClose} onCancel={handleFormClose} />;
  }

  return (
    <div className="books-page">
      {/* ── PageHeader Component Migration ── */}
      <div style={{ marginBottom: '2rem', borderBottom: '1px solid var(--eu-color-border-main)', paddingBottom: '1.25rem' }}>
        <PageHeader
          title="Book Catalogue"
          actions={
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {isAdmin && (
                <>
                  <button className="add-btn" onClick={handleCsvExport} style={{ background: '#f5ecd5', color: 'var(--gold-dark)', border: '1px solid var(--gold)' }}>Export CSV</button>
                  <label className="add-btn" style={{ background: '#f5ecd5', color: 'var(--gold-dark)', border: '1px solid var(--gold)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    Import CSV
                    <input type="file" accept=".csv" onChange={handleCsvImport} style={{ display: 'none' }} />
                  </label>
                  <button className="add-btn" onClick={handleAdd}>Add New Book</button>
                </>
              )}
            </div>
          }
        />
      </div>

      {importStatus && (
        <div style={{ padding: '1rem', background: '#fbf7ed', border: '1.5px solid var(--gold)', borderRadius: '12px', marginBottom: '1.5rem' }}>
          <p style={{ fontWeight: 'bold', color: 'var(--ink)' }}>{importStatus}</p>
          {importErrors.length > 0 && (
            <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', fontSize: '0.85rem', color: '#b91c1c', maxHeight: '150px', overflowY: 'auto' }}>
              {importErrors.map((err, idx) => <li key={idx}>{err}</li>)}
            </ul>
          )}
        </div>
      )}

      {/* Advanced Search & Filtering Controls */}
      <div style={{ background: '#ffffff', border: '1px solid rgba(226,211,179,0.5)', borderRadius: '16px', padding: '1.5rem', marginBottom: '2rem', boxShadow: 'var(--shadow-soft)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'center' }}>
          <div className="search-bar" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fffdf9', borderRadius: '12px', border: '1.5px solid rgba(212,160,23,0.25)' }}>
            <IconSearch />
            <input
              type="text"
              placeholder="Search title, author, isbn..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.95rem' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <select
              value={selectedGenre}
              onChange={(e) => { setSelectedGenre(e.target.value); setCurrentPage(1); }}
              style={{ padding: '0.75rem', borderRadius: '12px', border: '1.5px solid rgba(212,160,23,0.25)', background: '#fffdf9', color: 'var(--ink)', fontSize: '0.9rem', outline: 'none' }}
            >
              <option value="">All Categories / Genres</option>
              {genres.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <select
              value={availabilityFilter}
              onChange={(e) => { setAvailabilityFilter(e.target.value); setCurrentPage(1); }}
              style={{ padding: '0.75rem', borderRadius: '12px', border: '1.5px solid rgba(212,160,23,0.25)', background: '#fffdf9', color: 'var(--ink)', fontSize: '0.9rem', outline: 'none' }}
            >
              <option value="">All Availability Statuses</option>
              <option value="available">Available Only</option>
              <option value="unavailable">Unavailable Only</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', border: '1.5px solid rgba(212,160,23,0.25)', background: '#fffdf9', color: 'var(--ink)', fontSize: '0.9rem', outline: 'none' }}
            >
              <option value="created_at">Date Added</option>
              <option value="title">Book Title</option>
              <option value="author">Author Name</option>
              <option value="publication_year">Publish Year</option>
              <option value="price">Price</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              style={{ padding: '0.75rem', borderRadius: '12px', border: '1.5px solid rgba(212,160,23,0.25)', background: '#fffdf9', color: 'var(--ink)', fontSize: '0.9rem', outline: 'none' }}
            >
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
          </div>
        </div>
      </div>

      {isAdmin && books.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fdfcf9', padding: '1rem 1.5rem', borderRadius: '12px', border: '1px solid rgba(226,211,179,0.5)', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <input
              type="checkbox"
              checked={selectedBookIds.length === books.length && books.length > 0}
              onChange={handleSelectAll}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <span style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>
              Selected {selectedBookIds.length} of {books.length} items
            </span>
          </div>
          {selectedBookIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.25rem', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontWeight: 'bold', cursor: 'pointer' }}
            >
              <IconTrash /> Delete Selected
            </button>
          )}
        </div>
      )}

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div style={{ padding: '2rem 0' }}>
          <LoadingSkeleton count={4} height="80px" />
        </div>
      ) : books.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '2rem', border: '1px solid var(--eu-color-border-main)' }}>
          <EmptyState 
            message="No books matching filters found." 
            description="Clear search queries or filters to browse all catalog items."
          />
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
            <button className="add-btn" onClick={() => { setSearchTerm(''); setSelectedGenre(''); setAvailabilityFilter(''); setCurrentPage(1); }}>Clear Filters</button>
          </div>
        </div>
      ) : (
        <>
          <div className="books-grid">
            {books.map((book) => (
              <div key={book.id} className="book-card" style={{ position: 'relative', border: '1px solid var(--eu-color-border-main)', borderRadius: 'var(--eu-radius-lg)', padding: '1.5rem', background: 'var(--eu-color-bg-surface)', boxShadow: 'var(--eu-shadow-low)' }}>
                {isAdmin && (
                  <div style={{ position: 'absolute', top: '1rem', left: '1rem', zIndex: 10 }}>
                    <input
                      type="checkbox"
                      checked={selectedBookIds.includes(book.id)}
                      onChange={() => toggleSelectBook(book.id)}
                      style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                    />
                  </div>
                )}
                <div className="book-card-header" style={{ paddingLeft: isAdmin ? '2rem' : '0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <h3 style={{ margin: 0, fontSize: 'var(--eu-font-size-lg)', fontWeight: '800', color: 'var(--eu-color-text-main)' }}>{book.title}</h3>
                  <StatusBadge 
                    label={book.is_available ? 'Available' : 'Unavailable'} 
                    variant={book.is_available ? 'success' : 'danger'} 
                  />
                </div>
                <div className="book-card-body" style={{ paddingLeft: isAdmin ? '2rem' : '0', display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1.25rem', fontSize: 'var(--eu-font-size-sm)', color: 'var(--eu-color-text-main)' }}>
                  <p style={{ margin: 0 }}><strong>Author:</strong> {book.author}</p>
                  <p style={{ margin: 0 }}><strong>ISBN:</strong> {book.isbn}</p>
                  <p style={{ margin: 0 }}><strong>Genre:</strong> {book.genre || 'N/A'}</p>
                  <p style={{ margin: 0 }}><strong>Copies:</strong> {book.available_copies}/{book.total_copies}</p>
                  <p style={{ margin: 0 }}><strong>Price:</strong> ${book.price?.toFixed(2) || '0.00'}</p>
                </div>
                <div className="book-card-actions" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button className="view-btn" onClick={() => navigate(`/books/${book.id}`)}>View Details</button>
                  {isAdmin && (
                    <>
                      <button className="edit-btn" onClick={() => handleEdit(book)}>Edit</button>
                      <button className="delete-btn" onClick={() => handleDelete(book.id, book.title)}>Delete</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '3rem' }}>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                style={{ padding: '0.6rem 1rem', border: '1px solid rgba(212,160,23,0.3)', borderRadius: '10px', background: '#ffffff', color: 'var(--gold-dark)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <IconChevronLeft /> Prev
              </button>
              <span style={{ fontWeight: 'bold', color: 'var(--ink)' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                style={{ padding: '0.6rem 1rem', border: '1px solid rgba(212,160,23,0.3)', borderRadius: '10px', background: '#ffffff', color: 'var(--gold-dark)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                Next <IconChevronRight />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Books;