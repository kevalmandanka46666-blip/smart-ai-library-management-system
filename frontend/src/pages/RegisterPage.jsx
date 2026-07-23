import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../services/api';
import logo from '../assets/logo.png';
import './LoginPage.css';

const initialForm = {
  fullName: '',
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
};

const RegisterPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setFieldErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const errors = {};
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!form.fullName.trim()) {
      errors.fullName = 'Full name is required.';
    }

    if (!form.username.trim()) {
      errors.username = 'Username is required.';
    } else if (form.username.trim().length < 3) {
      errors.username = 'Username must be at least 3 characters.';
    }

    if (!form.email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!emailPattern.test(form.email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!form.password) {
      errors.password = 'Password is required.';
    } else if (form.password.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
    }

    if (!form.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password.';
    } else if (form.confirmPassword !== form.password) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    if (!agreeTerms) {
      errors.terms = 'You must agree to the Terms & Conditions.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    setSuccessMessage('');

    if (!validate()) return;

    setIsLoading(true);
    try {
      await register({
        email: form.email.trim().toLowerCase(),
        username: form.username.trim().toLowerCase(),
        password: form.password,
        full_name: form.fullName.trim(),
      });

      setSuccessMessage('Account created successfully! Redirecting to sign in...');
      setForm(initialForm);
      setAgreeTerms(false);

      setTimeout(() => {
        navigate('/login');
      }, 1800);
    } catch (err) {
      setServerError(
        err?.response?.data?.detail || 'Registration failed. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <svg className="auth-wave auth-wave-top" viewBox="0 0 500 200" fill="none">
        <path d="M0 60 C 120 -10, 220 130, 500 10" stroke="#d8a33f" strokeWidth="2" />
        <path d="M0 100 C 140 20, 240 160, 500 50" stroke="#d8a33f" strokeWidth="1.5" opacity="0.5" />
      </svg>
      <svg className="auth-wave auth-wave-bottom" viewBox="0 0 500 200" fill="none">
        <path d="M0 150 C 150 220, 300 60, 500 140" stroke="#d8a33f" strokeWidth="2" />
        <path d="M0 110 C 160 180, 280 40, 500 100" stroke="#d8a33f" strokeWidth="1.5" opacity="0.5" />
      </svg>

      <div className="auth-card auth-card-wide">
        <div className="auth-logo">
          <img src={logo} alt="Smart Library Logo" className="auth-logo-img" />
        </div>
        <h1 className="auth-title" style={{ fontSize: '1.5rem' }}>
          Smart Library
        </h1>
        <p className="auth-subtitle" style={{ marginTop: '0.75rem' }}>Create Account</p>
        <p className="auth-subtitle" style={{ marginTop: '-0.75rem', fontSize: '0.88rem' }}>
          Fill in the details to create your account
        </p>

        {serverError && <div className="auth-alert auth-alert-error">{serverError}</div>}
        {successMessage && <div className="auth-alert auth-alert-success">{successMessage}</div>}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div>
            <label className="auth-field-label">Full Name</label>
            <div className={`auth-field ${fieldErrors.fullName ? 'has-error' : ''}`}>
              <span className="auth-field-icon">👤</span>
              <input
                type="text"
                value={form.fullName}
                onChange={handleChange('fullName')}
                placeholder="Enter your full name"
                autoComplete="name"
              />
            </div>
            {fieldErrors.fullName && <span className="auth-field-error">{fieldErrors.fullName}</span>}
          </div>

          <div>
            <label className="auth-field-label">Username</label>
            <div className={`auth-field ${fieldErrors.username ? 'has-error' : ''}`}>
              <span className="auth-field-icon">🏷️</span>
              <input
                type="text"
                value={form.username}
                onChange={handleChange('username')}
                placeholder="Choose a username"
                autoComplete="username"
              />
            </div>
            {fieldErrors.username && <span className="auth-field-error">{fieldErrors.username}</span>}
          </div>

          <div>
            <label className="auth-field-label">Email Address</label>
            <div className={`auth-field ${fieldErrors.email ? 'has-error' : ''}`}>
              <span className="auth-field-icon">✉️</span>
              <input
                type="email"
                value={form.email}
                onChange={handleChange('email')}
                placeholder="Enter your email"
                autoComplete="email"
              />
            </div>
            {fieldErrors.email && <span className="auth-field-error">{fieldErrors.email}</span>}
          </div>

          <div>
            <label className="auth-field-label">Password</label>
            <div className={`auth-field ${fieldErrors.password ? 'has-error' : ''}`}>
              <span className="auth-field-icon">🔒</span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange('password')}
                placeholder="Create a password"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="auth-eye"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {fieldErrors.password && <span className="auth-field-error">{fieldErrors.password}</span>}
          </div>

          <div>
            <label className="auth-field-label">Confirm Password</label>
            <div className={`auth-field ${fieldErrors.confirmPassword ? 'has-error' : ''}`}>
              <span className="auth-field-icon">🔒</span>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={handleChange('confirmPassword')}
                placeholder="Confirm your password"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="auth-eye"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label="Toggle confirm password visibility"
              >
                {showConfirmPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <span className="auth-field-error">{fieldErrors.confirmPassword}</span>
            )}
          </div>

          <div className="auth-terms-row">
            <label className="auth-checkbox">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => {
                  setAgreeTerms(e.target.checked);
                  setFieldErrors((prev) => ({ ...prev, terms: '' }));
                }}
              />
              <span className="auth-checkbox-box"></span>
            </label>
            <span>
              I agree to the <a href="#!" className="auth-link">Terms &amp; Conditions</a>
            </span>
          </div>
          {fieldErrors.terms && <span className="auth-field-error">{fieldErrors.terms}</span>}

          <button type="submit" className="auth-submit" disabled={isLoading}>
            {isLoading ? <span className="auth-spinner" /> : 'Register'}
          </button>

          <p className="auth-footer-text">
            Already have an account? <Link to="/login">Sign In</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;
