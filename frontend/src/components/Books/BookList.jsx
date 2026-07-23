import React, { useState, useEffect } from 'react';
import { getBooks, deleteBook, searchBooks, filterBooks } from '../../services/api';

const BookList = ({ onEdit, onView }) => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAvailable, setFilterAvailable] = useState(null);

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    try {
      setLoading(true);
      const data = await getBooks();
      setBooks(data);
      setError('');
    } catch (err) {
      setError('Failed to load books');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      loadBooks();
      return;
    }
    try {
      setLoading(true);
      const results = await searchBooks({ query: searchTerm });
      setBooks(results);
    } catch (err) {
      setError('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = async (isAvailable) => {
    try {
      setLoading(true);
      setFilterAvailable(isAvailable);
      if (isAvailable === null) {
        loadBooks();
      } else {
        const results = await filterBooks(isAvailable);
        setBooks(results);
      }
    } catch (err) {
      setError('Filter failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete "${title}"?`)) return;
    try {
      await deleteBook(id);
      loadBooks();
    } catch (err) {
      setError('Delete failed');
    }
  };

  if (loading && books.length === 0) {
    return <div className="loading">Loading books...</div>;
  }

  return (
    <div className="book-list">
      <div className="controls">
        <input
          type="text"
          placeholder="Search books..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button onClick={handleSearch}>🔍 Search</button>
        <button onClick={() => { setSearchTerm(''); loadBooks(); }}>Clear</button>
        
        <button onClick={() => handleFilter(null)}>All</button>
        <button onClick={() => handleFilter(true)}>✅ Available</button>
        <button onClick={() => handleFilter(false)}>❌ Unavailable</button>
      </div>

      {error && <div className="error">{error}</div>}

      {books.length === 0 ? (
        <p>No books found</p>
      ) : (
        <div className="book-grid">
          {books.map((book) => (
            <div key={book.id} className="book-card">
              <h3>{book.title}</h3>
              <p>Author: {book.author}</p>
              <p>ISBN: {book.isbn}</p>
              <p>Copies: {book.available_copies}/{book.total_copies}</p>
              <p>Status: {book.is_available ? '✅ Available' : '❌ Unavailable'}</p>
              
              <div className="actions">
                <button onClick={() => onView?.(book.id)}>View</button>
                <button onClick={() => onEdit?.(book)}>Edit</button>
                <button onClick={() => handleDelete(book.id, book.title)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BookList;