import React, { useState, useEffect, useCallback } from 'react';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../services/api';
import './Categories.css';

const Categories = () => {
  const [categories, setCategories] = useState([]);
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
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', status: 'active' });
  const [formError, setFormError] = useState('');
  const [formSaving, setFormSaving] = useState(false);

  // Delete confirmation modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getCategories(0, 1000, searchTerm, statusFilter);

      setTotalCount(data.length);

      // Client-side pagination
      const startIndex = (currentPage - 1) * pageSize;
      const paginated = data.slice(startIndex, startIndex + pageSize);
      setCategories(paginated);
    } catch (err) {
      setError('Failed to load categories list.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, currentPage, pageSize]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Form handlers
  const handleAdd = () => {
    setEditingCategory(null);
    setFormData({ name: '', description: '', status: 'active' });
    setFormError('');
    setShowForm(true);
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name || '',
      description: category.description || '',
      status: category.status || 'active'
    });
    setFormError('');
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingCategory(null);
    setFormData({ name: '', description: '', status: 'active' });
    setFormError('');
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Category name is required.');
      return;
    }

    setFormSaving(true);
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, formData);
      } else {
        await createCategory(formData);
      }
      handleFormClose();
      loadCategories();
    } catch (err) {
      const detail = err.response?.data?.detail || 'An error occurred. Please try again.';
      setFormError(detail);
    } finally {
      setFormSaving(false);
    }
  };

  // Delete handlers
  const handleDeleteClick = (category) => {
    setDeleteTarget(category);
    setDeleteError('');
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await deleteCategory(deleteTarget.id);
      setDeleteTarget(null);
      loadCategories();
    } catch (err) {
      const detail = err.response?.data?.detail || 'Failed to delete category.';
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
    <div className="categories-page">
      <div className="page-header" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Category Management</h1>
        <button className="add-btn" onClick={handleAdd}>Add New Category</button>
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
          <span>Loading Categories...</span>
        </div>
      ) : categories.length === 0 ? (
        <div className="empty-state" style={{ padding: '4rem 2rem' }}>
          <p>No categories found matching your search criteria.</p>
          <button onClick={() => { setSearchTerm(''); setStatusFilter(''); setCurrentPage(1); }}>Clear Filters</button>
        </div>
      ) : (
        <>
          <div className="categories-grid">
            {categories.map((category) => (
              <div key={category.id} className="category-card">
                <div className="category-card-header">
                  <div className="category-avatar">📂</div>
                  <div className="category-info">
                    <h3>{category.name}</h3>
                  </div>
                  <span className={`status ${category.status === 'active' ? 'active' : 'inactive'}`}>
                    {category.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="category-card-body">
                  {category.description ? (
                    <p className="desc-text">{category.description}</p>
                  ) : (
                    <p style={{ color: 'var(--ink-soft)', fontStyle: 'italic' }}>No description provided.</p>
                  )}
                </div>

                <div className="category-card-actions">
                  <button className="edit-btn" onClick={() => handleEdit(category)}>Edit</button>
                  <button className="delete-btn" onClick={() => handleDeleteClick(category)}>Delete</button>
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

      {/* Add/Edit Category Modal */}
      {showForm && (
        <div className="category-modal-overlay" onClick={handleFormClose}>
          <div className="category-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingCategory ? 'Edit Category' : 'Add New Category'}</h2>
            {formError && <div className="form-error">{formError}</div>}
            <form onSubmit={handleFormSubmit}>
              <div className="category-form-group">
                <label>Category Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter category name"
                  required
                />
              </div>
              <div className="category-form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the category..."
                  rows={4}
                />
              </div>
              <div className="category-form-group">
                <label>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="category-form-actions">
                <button type="button" className="cancel-btn" onClick={handleFormClose}>Cancel</button>
                <button type="submit" className="save-btn" disabled={formSaving}>
                  {formSaving ? 'Saving...' : (editingCategory ? 'Update Category' : 'Add Category')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="category-modal-overlay" onClick={handleDeleteCancel}>
          <div className="category-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="delete-confirm-content">
              <div className="delete-icon">⚠️</div>
              <h3>Delete Category</h3>
              <p>Are you sure you want to delete <strong>"{deleteTarget.name}"</strong>?</p>
              <p className="warning-text">This action will soft-delete the category. Books referencing this category must be reassigned first.</p>
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

export default Categories;
