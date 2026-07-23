import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';
import logo from "../../assets/logo1.png";
const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <Link to="/" className="footer-brand">
          <img src={logo} alt="Smart Library Logo" className="footer-logo" />
          <span>Smart Library</span>
        </Link>

        <p className="footer-copyright">© 2026 Smart Library. All rights reserved.</p>

        <div className="social-links">
          <a href="#!" aria-label="Facebook">📘</a>
          <a href="#!" aria-label="Twitter">🐦</a>
          <a href="#!" aria-label="LinkedIn">🔗</a>
          <a href="#!" aria-label="Instagram">📷</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;