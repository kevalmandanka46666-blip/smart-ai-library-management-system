import React, { useState, useEffect } from 'react';
import { getStudents, deleteStudent, searchStudents, bulkDeleteStudents, exportStudentsCsvUrl, importStudentsCsv } from '../services/api';
import StudentForm from '../components/Students/StudentForm';
import StudentDetails from '../components/Students/StudentDetails';
import { PageHeader, StatusBadge, EmptyState, LoadingSkeleton } from '../components/layout/EnterpriseLibrary';
import '../styles/design-tokens.css';
import './Students.css';

const IconTrash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

const Students = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [viewingStudent, setViewingStudent] = useState(null);

  // Search & Filtering States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '', 'active', 'inactive'

  // Pagination & Sorting States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(12);
  const [totalStudentsCount, setTotalStudentsCount] = useState(0);

  // Bulk Actions
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  // CSV Import/Export
  const [importStatus, setImportStatus] = useState('');
  const [importErrors, setImportErrors] = useState([]);

  // List of distinct courses & departments for filters
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    loadStudentsList();
  }, [searchTerm, selectedCourse, selectedDept, statusFilter, currentPage]);

  const loadStudentsList = async () => {
    try {
      setLoading(true);
      setError('');
      
      let data = [];
      if (searchTerm.trim()) {
        data = await searchStudents({ query: searchTerm });
      } else {
        data = await getStudents();
      }

      // Populate filters list dynamically
      const uniqueCourses = [...new Set(data.map(s => s.course).filter(Boolean))];
      const uniqueDepts = [...new Set(data.map(s => s.department).filter(Boolean))];
      setCourses(uniqueCourses);
      setDepartments(uniqueDepts);

      // Perform client filtering based on other params
      let filtered = [...data];
      if (selectedCourse) {
        filtered = filtered.filter(s => s.course === selectedCourse);
      }
      if (selectedDept) {
        filtered = filtered.filter(s => s.department === selectedDept);
      }
      if (statusFilter) {
        const activeFlag = statusFilter === 'active';
        filtered = filtered.filter(s => s.is_active === activeFlag);
      }

      setTotalStudentsCount(filtered.length);
      
      // Pagination slice
      const startIndex = (currentPage - 1) * pageSize;
      const paginated = filtered.slice(startIndex, startIndex + pageSize);
      setStudents(paginated);

    } catch (err) {
      setError('Failed to load students list.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await deleteStudent(id);
      setSelectedStudentIds(prev => prev.filter(item => item !== id));
      loadStudentsList();
    } catch (err) {
      setError('Failed to delete student');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedStudentIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete all ${selectedStudentIds.length} selected students?`)) return;
    try {
      await bulkDeleteStudents(selectedStudentIds);
      setSelectedStudentIds([]);
      loadStudentsList();
    } catch (err) {
      setError('Bulk delete failed');
    }
  };

  const handleCsvExport = () => {
    const exportUrl = exportStudentsCsvUrl();
    const a = document.createElement('a');
    a.href = exportUrl;
    a.download = 'library_students_export.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCsvImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus('Importing students...');
    setImportErrors([]);
    try {
      const response = await importStudentsCsv(file);
      setImportStatus(`Import successful! Added ${response.imported} students. Skipped ${response.skipped} rows.`);
      if (response.errors && response.errors.length > 0) {
        setImportErrors(response.errors);
      }
      loadStudentsList();
    } catch (err) {
      setImportStatus('CSV Import failed. Check file structure.');
      setImportErrors([err.response?.data?.detail || 'Unexpected error occurred.']);
    }
  };

  const toggleSelectStudent = (id) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedStudentIds.length === students.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(students.map(s => s.id));
    }
  };

  const handleEdit = (student) => {
    setEditingStudent(student);
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditingStudent(null);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingStudent(null);
    loadStudentsList();
  };

  const totalPages = Math.ceil(totalStudentsCount / pageSize) || 1;

  if (viewingStudent) {
    return (
      <StudentDetails 
        studentId={viewingStudent} 
        onBack={() => setViewingStudent(null)} 
        onEdit={(student) => {
          setViewingStudent(null);
          handleEdit(student);
        }}
      />
    );
  }

  if (showForm) {
    return <StudentForm student={editingStudent} onSave={handleFormClose} onCancel={handleFormClose} />;
  }

  return (
    <div className="students-page">
      {/* ── PageHeader Component Migration ── */}
      <div style={{ marginBottom: '2rem', borderBottom: '1px solid var(--eu-color-border-main)', paddingBottom: '1.25rem' }}>
        <PageHeader
          title="Student Management"
          actions={
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button className="add-btn" onClick={handleCsvExport} style={{ background: '#f5ecd5', color: 'var(--gold-dark)', border: '1px solid var(--gold)' }}>Export CSV</button>
              <label className="add-btn" style={{ background: '#f5ecd5', color: 'var(--gold-dark)', border: '1px solid var(--gold)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                Import CSV
                <input type="file" accept=".csv" onChange={handleCsvImport} style={{ display: 'none' }} />
              </label>
              <button className="add-btn" onClick={handleAdd}>Add New Student</button>
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

      {/* Advanced Filters Panel */}
      <div style={{ background: '#ffffff', border: '1px solid rgba(226,211,179,0.5)', borderRadius: '16px', padding: '1.5rem', marginBottom: '2rem', boxShadow: 'var(--shadow-soft)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'center' }}>
          <div className="search-bar" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fffdf9', borderRadius: '12px', border: '1.5px solid rgba(212,160,23,0.25)', boxShadow: 'none', width: '100%', marginBottom: 0 }}>
            <input
              type="text"
              placeholder="Search by name, ID, email..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.95rem' }}
            />
          </div>

          <div>
            <select
              value={selectedCourse}
              onChange={(e) => { setSelectedCourse(e.target.value); setCurrentPage(1); }}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1.5px solid rgba(212,160,23,0.25)', background: '#fffdf9', color: 'var(--ink)', fontSize: '0.9rem', outline: 'none' }}
            >
              <option value="">All Courses</option>
              {courses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <select
              value={selectedDept}
              onChange={(e) => { setSelectedDept(e.target.value); setCurrentPage(1); }}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1.5px solid rgba(212,160,23,0.25)', background: '#fffdf9', color: 'var(--ink)', fontSize: '0.9rem', outline: 'none' }}
            >
              <option value="">All Departments</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
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

      {students.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fdfcf9', padding: '1rem 1.5rem', borderRadius: '12px', border: '1px solid rgba(226,211,179,0.5)', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <input
              type="checkbox"
              checked={selectedStudentIds.length === students.length && students.length > 0}
              onChange={handleSelectAll}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <span style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>
              Selected {selectedStudentIds.length} of {students.length} items
            </span>
          </div>
          {selectedStudentIds.length > 0 && (
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
      ) : students.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '2rem', border: '1px solid var(--eu-color-border-main)' }}>
          <EmptyState 
            message="No students matching search parameters or filters were found." 
            description="Clear search queries or filters to browse all students."
          />
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
            <button className="add-btn" onClick={() => { setSearchTerm(''); setSelectedCourse(''); setSelectedDept(''); setStatusFilter(''); setCurrentPage(1); }}>Clear Filters</button>
          </div>
        </div>
      ) : (
        <>
          <div className="students-grid">
            {students.map((student) => (
              <div key={student.id} className="student-card" style={{ position: 'relative', border: '1px solid var(--eu-color-border-main)', borderRadius: 'var(--eu-radius-lg)', padding: '1.5rem', background: 'var(--eu-color-bg-surface)', boxShadow: 'var(--eu-shadow-low)' }}>
                <div style={{ position: 'absolute', top: '1rem', left: '1rem', zIndex: 10 }}>
                  <input
                    type="checkbox"
                    checked={selectedStudentIds.includes(student.id)}
                    onChange={() => toggleSelectStudent(student.id)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                </div>
                
                <div className="student-card-header" style={{ paddingLeft: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div className="student-info">
                    <h3 style={{ margin: 0, fontSize: 'var(--eu-font-size-lg)', fontWeight: '800', color: 'var(--eu-color-text-main)' }}>{student.full_name}</h3>
                    <span className="student-id" style={{ fontSize: 'var(--eu-font-size-xs)', color: 'var(--eu-color-text-soft)', fontWeight: '600' }}>ID: {student.student_id}</span>
                  </div>
                  <StatusBadge 
                    label={student.is_active ? 'Active' : 'Inactive'} 
                    variant={student.is_active ? 'success' : 'danger'} 
                  />
                </div>
                
                <div className="student-card-body" style={{ paddingLeft: '2rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1.25rem', fontSize: 'var(--eu-font-size-sm)', color: 'var(--eu-color-text-main)' }}>
                  <p style={{ margin: 0 }}><strong>Email:</strong> {student.email}</p>
                  <p style={{ margin: 0 }}><strong>Phone:</strong> {student.phone || 'N/A'}</p>
                  <p style={{ margin: 0 }}><strong>Course:</strong> {student.course || 'N/A'}</p>
                  <p style={{ margin: 0 }}><strong>Semester:</strong> {student.semester || 'N/A'}</p>
                  <p style={{ margin: 0 }}><strong>Department:</strong> {student.department || 'N/A'}</p>
                  <p style={{ margin: 0 }}><strong>Books Borrowed:</strong> {student.books_borrowed || 0}</p>
                </div>
                
                <div className="student-card-actions" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button className="view-btn" onClick={() => setViewingStudent(student.id)}>View</button>
                  <button className="edit-btn" onClick={() => handleEdit(student)}>Edit</button>
                  <button className="delete-btn" onClick={() => handleDelete(student.id, student.full_name)}>Delete</button>
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
    </div>
  );
};

export default Students;