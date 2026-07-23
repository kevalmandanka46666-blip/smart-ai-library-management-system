import React, { useState, useEffect, useCallback } from 'react';
import { getAuthors, createAuthor, updateAuthor, deleteAuthor } from '../services/api';
import './Authors.css';

const Authors = () => {
  const [authors, setAuthors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(12);
  const [totalCount, setTotalCount] = useState(0);

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState(null);
  const [formData, setFormData] = useState({ name: '', biography: '', birth_date: '', nationality: '', status: 'active' });
  const [formError, setFormError] = useState('');
  const [formSaving, setFormSaving] = useState(false);

  // Delete confirmation modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const loadAuthors = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getAuthors(0, 1000, searchTerm, statusFilter);

      setTotalCount(data.length);

      // Client-side pagination
      const startIndex = (currentPage - 1) * pageSize;
      const paginated = data.slice(startIndex, startIndex + pageSize);
      setAuthors(paginated);
    } catch (err) {
      setError('Failed to load authors list.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, currentPage, pageSize]);

  useEffect(() => {
    loadAuthors();
  }, [loadAuthors]);

  // Form handlers
  const handleAdd = () => {
    setEditingAuthor(null);
    setFormData({ name: '', biography: '', birth_date: '', nationality: '', status: 'active' });
    setFormError('');
    setShowForm(true);
  };

  const handleEdit = (author) => {
    setEditingAuthor(author);
    setFormData({
      name: author.name || '',
      biography: author.biography || '',
      birth_date: author.birth_date || '',
      nationality: author.nationality || '',
      status: author.status || 'active'
    });
    setFormError('');
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingAuthor(null);
    setFormData({ name: '', biography: '', birth_date: '', nationality: '', status: 'active' });
    setFormError('');
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Author name is required.');
      return;
    }

    setFormSaving(true);
    try {
      if (editingAuthor) {
        await updateAuthor(editingAuthor.id, formData);
      } else {
        await createAuthor(formData);
      }
      handleFormClose();
      loadAuthors();
    } catch (err) {
      const detail = err.response?.data?.detail || 'An error occurred. Please try again.';
      setFormError(detail);
    } finally {
      setFormSaving(false);
    }
  };

  // Delete handlers
  const handleDeleteClick = (author) => {
    setDeleteTarget(author);
    setDeleteError('');
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await deleteAuthor(deleteTarget.id);
      setDeleteTarget(null);
      loadAuthors();
    } catch (err) {
      const detail = err.response?.data?.detail || 'Failed to delete author.';
      setDeleteError(detail);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteTarget(null);
    setDeleteError('');
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="authors-page">
      <div className="page-header" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Author Management</h1>
        <button className="add-btn" onClick={handleAdd}>Add New Author</button>
      </div>

      {/* Filters Panel */}
      <div style={{ background: '#ffffff', border: '1px solid rgba(226,211,179,0.5)', borderRadius: '16px', padding: '1.5rem', marginBottom: '2rem', boxShadow: 'var(--shadow-soft)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'center' }}>
          <div className="search-bar" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fffdf9', borderRadius: '12px', border: '1.5px solid rgba(212,160,23,0.25)', boxShadow: 'none', width: '100%', marginBottom: 0 }}>
            <input
              type="text"
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.95rem' }}
            />
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1.5px solid rgba(212,160,23,0.25)', background: '#fffdf9', color: 'var(--ink)', fontSize: '0.9rem', outline: 'none' }}
            >
              <option value="">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="loading" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid rgba(212,160,23,0.15)', borderTopColor: '#D4A017', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <span>Loading Authors...</span>
        </div>
      ) : authors.length === 0 ? (
        <div className="empty-state" style={{ padding: '4rem 2rem' }}>
          <p>No authors found matching your search criteria.</p>
          <button onClick={() => { setSearchTerm(''); setStatusFilter(''); setCurrentPage(1); }}>Clear Filters</button>
        </div>
      ) : (
        <>
          <div className="authors-grid">
            {authors.map((author) => (
              <div key={author.id} className="author-card">
                <div className="author-card-header">
                  <div className="author-avatar">✍️</div>
                  <div className="author-info">
                    <h3>{author.name}</h3>
                    {author.nationality && <span className="author-meta">{author.nationality}</span>}
                  </div>
                  <span className={`status ${author.status === 'active' ? 'active' : 'inactive'}`}>
                    {author.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="author-card-body">
                  {author.birth_date && <p className="truncate"><strong>Born:</strong> {author.birth_date}</p>}
                  {author.biography && <p className="bio-text"><strong>Bio:</strong> {author.biography}</p>}
                  {!author.biography && !author.birth_date && (
                    <p style={{ color: 'var(--ink-soft)', fontStyle: 'italic' }}>No additional details provided.</p>
                  )}
                </div>

                <div className="author-card-actions">
                  <button className="edit-btn" onClick={() => handleEdit(author)}>Edit</button>
                  <button className="delete-btn" onClick={() => handleDeleteClick(author)}>Delete</button>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '3rem' }}>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                style={{ padding: '0.6rem 1rem', border: '1px solid rgba(212,160,23,0.3)', borderRadius: '10px', background: '#ffffff', color: 'var(--gold-dark)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
              >
                Prev
              </button>
              <span style={{ fontWeight: 'bold', color: 'var(--ink)' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                style={{ padding: '0.6rem 1rem', border: '1px solid rgba(212,160,23,0.3)', borderRadius: '10px', background: '#ffffff', color: 'var(--gold-dark)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Add/Edit Author Modal */}
      {showForm && (
        <div className="author-modal-overlay" onClick={handleFormClose}>
          <div className="author-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingAuthor ? 'Edit Author' : 'Add New Author'}</h2>
            {formError && <div className="form-error">{formError}</div>}
            <form onSubmit={handleFormSubmit}>
              <div className="author-form-group">
                <label>Author Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter author name"
                  required
                />
              </div>
              <div className="author-form-group">
                <label>Nationality</label>
                <input
                  type="text"
                  value={formData.nationality}
                  onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                  placeholder="e.g. British, American, Indian"
                />
              </div>
              <div className="author-form-group">
                <label>Birth Date</label>
                <input
                  type="text"
                  value={formData.birth_date}
                  onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                  placeholder="e.g. 1965-07-31"
                />
              </div>
              <div className="author-form-group">
                <label>Biography</label>
                <textarea
                  value={formData.biography}
                  onChange={(e) => setFormData({ ...formData, biography: e.target.value })}
                  placeholder="Brief biography of the author..."
                  rows={4}
                />
              </div>
              <div className="author-form-group">
                <label>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="author-form-actions">
                <button type="button" className="cancel-btn" onClick={handleFormClose}>Cancel</button>
                <button type="submit" className="save-btn" disabled={formSaving}>
                  {formSaving ? 'Saving...' : (editingAuthor ? 'Update Author' : 'Add Author')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="author-modal-overlay" onClick={handleDeleteCancel}>
          <div className="author-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="delete-confirm-content">
              <div className="delete-icon">⚠️</div>
              <h3>Delete Author</h3>
              <p>Are you sure you want to delete <strong>"{deleteTarget.name}"</strong>?</p>
              <p className="warning-text">This action will soft-delete the author. Books referencing this author must be reassigned first.</p>
              {deleteError && <div className="form-error" style={{ marginTop: '1rem', textAlign: 'left' }}>{deleteError}</div>}
            </div>
            <div className="delete-confirm-actions">
              <button className="cancel-delete-btn" onClick={handleDeleteCancel}>Cancel</button>
              <button className="confirm-delete-btn" onClick={handleDeleteConfirm} disabled={deleteLoading}>
                {deleteLoading ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Authors;
