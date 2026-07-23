import React, { useState, useEffect } from 'react';
import { getBook, deleteBook } from '../../services/api';

const BookDetails = ({ bookId, onBack }) => {
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load book details
  useEffect(() => {
    if (bookId) {
      loadBookDetails();
    }
  }, [bookId]);

  const loadBookDetails = async () => {
    try {
      setLoading(true);
      const data = await getBook(bookId);
      setBook(data);
      setError('');
    } catch (err) {
      setError('Failed to load book details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete "${book?.title}"?`)) {
      return;
    }
    
    try {
      await deleteBook(bookId);
      if (onBack) onBack();
    } catch (err) {
      setError('Failed to delete book');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="book-details-loading">
        <div className="spinner"></div>
        <p>Loading book details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="book-details-error">
        <p>⚠️ {error}</p>
        <button onClick={onBack}>Go Back</button>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="book-details-not-found">
        <p>Book not found</p>
        <button onClick={onBack}>Go Back</button>
      </div>
    );
  }

  return (
    <div className="book-details-container">
      <button className="back-btn" onClick={onBack}>
        ← Back to Books
      </button>

      <div className="book-details-card">
        <div className="book-details-header">
          <h2>{book.title}</h2>
          <span className={`status ${book.is_available ? 'available' : 'unavailable'}`}>
            {book.is_available ? '✅ Available' : '❌ Unavailable'}
          </span>
        </div>

        <div className="book-details-body">
          <div className="detail-row">
            <label>Author:</label>
            <span>{book.author}</span>
          </div>
          <div className="detail-row">
            <label>ISBN:</label>
            <span>{book.isbn}</span>
          </div>
          <div className="detail-row">
            <label>Publisher:</label>
            <span>{book.publisher || 'N/A'}</span>
          </div>
          <div className="detail-row">
            <label>Publication Year:</label>
            <span>{book.publication_year || 'N/A'}</span>
          </div>
          <div className="detail-row">
            <label>Genre:</label>
            <span>{book.genre || 'N/A'}</span>
          </div>
          <div className="detail-row">
            <label>Description:</label>
            <span>{book.description || 'No description available'}</span>
          </div>
          <div className="detail-row">
            <label>Copies:</label>
            <span>{book.available_copies} / {book.total_copies}</span>
          </div>
          <div className="detail-row">
            <label>Location:</label>
            <span>{book.location || 'Not specified'}</span>
          </div>
          <div className="detail-row">
            <label>Price:</label>
            <span>${book.price?.toFixed(2) || '0.00'}</span>
          </div>
          <div className="detail-row">
            <label>Created:</label>
            <span>{new Date(book.created_at).toLocaleDateString()}</span>
          </div>
          <div className="detail-row">
            <label>Last Updated:</label>
            <span>{book.updated_at ? new Date(book.updated_at).toLocaleDateString() : 'N/A'}</span>
          </div>
        </div>

        <div className="book-details-actions">
          <button className="edit-btn" onClick={() => window.location.href = `/books/edit/${book.id}`}>
            ✏️ Edit Book
          </button>
          <button className="delete-btn" onClick={handleDelete}>
            🗑️ Delete Book
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookDetails;