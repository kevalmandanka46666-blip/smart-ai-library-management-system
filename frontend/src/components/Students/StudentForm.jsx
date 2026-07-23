import React, { useState, useEffect } from 'react';
import { createStudent, updateStudent } from '../../services/api';
import './StudentForm.css';

const StudentForm = ({ student, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    student_id: '',
    full_name: '',
    email: '',
    phone: '',
    address: '',
    date_of_birth: '',
    gender: '',
    course: '',
    semester: 1,
    year: 1,
    department: '',
    library_card_id: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (student) {
      setFormData({
        student_id: student.student_id || '',
        full_name: student.full_name || '',
        email: student.email || '',
        phone: student.phone || '',
        address: student.address || '',
        date_of_birth: student.date_of_birth ? student.date_of_birth.split('T')[0] : '',
        gender: student.gender || '',
        course: student.course || '',
        semester: student.semester || 1,
        year: student.year || 1,
        department: student.department || '',
        library_card_id: student.library_card_id || ''
      });
    }
  }, [student]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'number' ? parseInt(value) || 0 : value
    });
  };

  const validate = () => {
    if (!formData.student_id.trim()) { setError('Student ID is required'); return false; }
    if (!formData.full_name.trim()) { setError('Full name is required'); return false; }
    if (!formData.email.trim()) { setError('Email is required'); return false; }
    if (!formData.email.includes('@')) { setError('Please enter a valid email'); return false; }
    if (formData.semester < 1 || formData.semester > 12) { setError('Semester must be between 1 and 12'); return false; }
    if (formData.year < 1 || formData.year > 6) { setError('Year must be between 1 and 6'); return false; }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!validate()) return;
    
    setLoading(true);
    try {
      if (student?.id) {
        await updateStudent(student.id, formData);
        setSuccess('Student updated successfully!');
      } else {
        await createStudent(formData);
        setSuccess('Student added successfully!');
        if (!student) {
          setFormData({
            student_id: '',
            full_name: '',
            email: '',
            phone: '',
            address: '',
            date_of_birth: '',
            gender: '',
            course: '',
            semester: 1,
            year: 1,
            department: '',
            library_card_id: ''
          });
        }
      }
      setTimeout(() => {
        if (onSave) onSave();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save student');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="student-form-container">
      <h2>{student?.id ? 'Edit Student' : 'Add New Student'}</h2>
      
      <form onSubmit={handleSubmit} className="student-form">
        {error && (
          <div className="error-message">
            {error}
            <button type="button" onClick={() => setError('')}>✕</button>
          </div>
        )}
        
        {success && (
          <div className="success-message">
            {success}
          </div>
        )}

        <div className="form-grid">
          {/* Left Column */}
          <div className="form-column">
            <div className="form-group">
              <label>Student ID *</label>
              <input
                type="text"
                name="student_id"
                value={formData.student_id}
                onChange={handleChange}
                placeholder="STU-001"
                required
              />
              <small>Unique identifier for the student</small>
            </div>

            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="John Doe"
                required
              />
            </div>

            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="john@example.com"
                required
              />
            </div>

            <div className="form-group">
              <label>Phone</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+1 234 567 890"
              />
            </div>

            <div className="form-group">
              <label>Date of Birth</label>
              <input
                type="date"
                name="date_of_birth"
                value={formData.date_of_birth}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="form-column">
            <div className="form-group">
              <label>Gender</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label>Course</label>
              <input
                type="text"
                name="course"
                value={formData.course}
                onChange={handleChange}
                placeholder="B.Sc. Computer Science"
              />
            </div>

            <div className="form-group">
              <label>Semester</label>
              <input
                type="number"
                name="semester"
                value={formData.semester}
                onChange={handleChange}
                min="1"
                max="12"
                required
              />
            </div>

            <div className="form-group">
              <label>Year</label>
              <input
                type="number"
                name="year"
                value={formData.year}
                onChange={handleChange}
                min="1"
                max="6"
                required
              />
            </div>

            <div className="form-group">
              <label>Department</label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                placeholder="Computer Science"
              />
            </div>

            <div className="form-group">
              <label>Library Card ID</label>
              <input
                type="text"
                name="library_card_id"
                value={formData.library_card_id}
                onChange={handleChange}
                placeholder="LIB-001"
              />
            </div>

            <div className="form-group">
              <label>Address</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Enter full address..."
                rows="2"
              />
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Student'}
          </button>
          <button type="button" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>
  );
};

export default StudentForm; 