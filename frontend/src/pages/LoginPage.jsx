import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../services/api';
import logo from '../assets/logo.png';
import './LoginPage.css';

const LoginPage = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const queryParams = new URLSearchParams(window.location.search);
  const isExpired = queryParams.get('expired') === 'true';
  const [error, setError] = useState(isExpired ? 'Your session has expired. Please log in again.' : '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both your email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await login(email, password);

      if (data.access_token) {
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        if (rememberMe) {
          localStorage.setItem('remember_me', 'true');
        }
        if (onLoginSuccess) {
          onLoginSuccess(data.user, data.access_token, data.refresh_token);
        }
      }

      navigate('/dashboard');
    } catch (err) {
      setError(
        err?.response?.data?.detail || 'Invalid email or password. Please try again.'
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

      <div className="auth-card">
        <div className="auth-logo">
          <img src={logo} alt="Smart Library Logo" className="auth-logo-img" />
        </div>

        <h1 className="auth-title">Welcome Back</h1>
        <p className="auth-subtitle">Sign in to continue to your account</p>

        {error && <div className="auth-alert auth-alert-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <span className="auth-field-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              autoComplete="email"
              aria-label="Email address"
              required
            />
          </div>

          <div className="auth-field">
            <span className="auth-field-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              aria-label="Password"
              required
            />
            <button
              type="button"
              className="auth-eye"
              onClick={() => setShowPassword(!showPassword)}
              aria-label="Toggle password visibility"
            >
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              )}
            </button>
          </div>

          <div className="auth-row">
            <label className="auth-checkbox">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span className="auth-checkbox-box"></span>
              Remember Me
            </label>
            <Link to="/forgot-password" className="auth-link">Forgot Password?</Link>
          </div>

          <button type="submit" className="auth-submit" disabled={isLoading}>
            {isLoading ? (
              <span className="auth-spinner" />
            ) : (
              <>
                Sign In <span className="auth-submit-arrow">→</span>
              </>
            )}
          </button>

          <div className="auth-divider"><span>OR</span></div>

          <p className="auth-footer-text">
            Don't have an account? <Link to="/register">Sign Up</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
