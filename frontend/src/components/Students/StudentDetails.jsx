import React, { useState, useEffect } from 'react';
import { getStudent, deleteStudent } from '../../services/api';
import './StudentDetails.css';

const StudentDetails = ({ studentId, onBack, onEdit }) => {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (studentId) {
      loadStudentDetails();
    }
  }, [studentId]);

  const loadStudentDetails = async () => {
    try {
      setLoading(true);
      const data = await getStudent(studentId);
      setStudent(data);
      setError('');
    } catch (err) {
      setError('Failed to load student details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete "${student?.full_name}"?`)) {
      return;
    }
    try {
      await deleteStudent(studentId);
      if (onBack) onBack();
    } catch (err) {
      setError('Failed to delete student');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="student-details-loading">
        <div className="spinner"></div>
        <p>Loading student details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="student-details-error">
        <p>{error}</p>
        <button onClick={onBack}>Go Back</button>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="student-details-not-found">
        <p>Student not found</p>
        <button onClick={onBack}>Go Back</button>
      </div>
    );
  }

  return (
    <div className="student-details-container">
      <button className="back-btn" onClick={onBack}>
        ← Back to Students
      </button>

      <div className="student-details-card">
        <div className="student-details-header">
          <div className="student-profile">
            <div className="student-avatar-large">👤</div>
            <div className="student-name-section">
              <h2>{student.full_name}</h2>
              <span className="student-id-badge">ID: {student.student_id}</span>
              <span className={`status-badge ${student.is_active ? 'active' : 'inactive'}`}>
                {student.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        <div className="student-details-body">
          <div className="details-grid">
            <div className="detail-item">
              <label>Email</label>
              <span>{student.email}</span>
            </div>
            <div className="detail-item">
              <label>Phone</label>
              <span>{student.phone || 'N/A'}</span>
            </div>
            <div className="detail-item">
              <label>Date of Birth</label>
              <span>{student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString() : 'N/A'}</span>
            </div>
            <div className="detail-item">
              <label>Gender</label>
              <span>{student.gender || 'N/A'}</span>
            </div>
            <div className="detail-item">
              <label>Course</label>
              <span>{student.course || 'N/A'}</span>
            </div>
            <div className="detail-item">
              <label>Semester</label>
              <span>{student.semester || 'N/A'}</span>
            </div>
            <div className="detail-item">
              <label>Year</label>
              <span>{student.year || 'N/A'}</span>
            </div>
            <div className="detail-item">
              <label>Department</label>
              <span>{student.department || 'N/A'}</span>
            </div>
            <div className="detail-item">
              <label>Library Card ID</label>
              <span>{student.library_card_id || 'N/A'}</span>
            </div>
            <div className="detail-item">
              <label>Books Borrowed</label>
              <span>{student.books_borrowed || 0}</span>
            </div>
            <div className="detail-item">
              <label>Total Fines</label>
              <span>${student.total_fines?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="detail-item">
              <label>Address</label>
              <span>{student.address || 'N/A'}</span>
            </div>
          </div>

          <div className="student-details-timestamps">
            <div className="timestamp-item">
              <label>Created At</label>
              <span>{new Date(student.created_at).toLocaleString()}</span>
            </div>
            {student.updated_at && (
              <div className="timestamp-item">
                <label>Last Updated</label>
                <span>{new Date(student.updated_at).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        <div className="student-details-actions">
          <button 
            className="edit-btn"
            onClick={() => onEdit && onEdit(student)}
          >
            Edit Student
          </button>
          <button 
            className="delete-btn"
            onClick={handleDelete}
          >
            Delete Student
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentDetails;