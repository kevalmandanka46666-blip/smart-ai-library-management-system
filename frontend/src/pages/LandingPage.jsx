import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import libraryShelf from '../assets/library-shelf.png';
import './LandingPage.css';

const featureItems = [
  {
    icon: '🤖',
    title: 'AI Chatbot',
    description: 'Instant answers and smart recommendations for every library query.',
  },
  {
    icon: '📚',
    title: 'Book Management',
    description: 'Track inventory, categories, and availability with elegant precision.',
  },
  {
    icon: '📈',
    title: 'Analytics Dashboard',
    description: 'See library activity, trends, and performance at a glance.',
  },
  {
    icon: '🔒',
    title: 'Secure Access',
    description: 'Role-based controls keep student and librarian data protected.',
  },
];

const stats = [
  { icon: '📚', value: '10,000+', label: 'Books Managed' },
  { icon: '👥', value: '2,500+', label: 'Active Users' },
  { icon: '🧾', value: '15,000+', label: 'Transactions' },
  { icon: '⭐', value: '99.9%', label: 'System Uptime' },
];

const LandingPage = () => {
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleScrollTo = (id) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80; // Fixed navbar offset
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      setTimeout(() => handleScrollTo(id), 100);
    }
  }, [location]);

  return (
    <div className={`landing-page${mounted ? ' loaded' : ''}`} id="home">
      {/* ===== decorative gold line accents ===== */}
      <svg className="deco-line deco-line-top" viewBox="0 0 500 200" fill="none">
        <path d="M0 60 C 120 -10, 220 130, 500 10" stroke="#d4af37" strokeWidth="2" />
        <path d="M0 100 C 140 20, 240 160, 500 50" stroke="#d4af37" strokeWidth="1.5" opacity="0.5" />
      </svg>
      <div className="deco-dots deco-dots-top" />
      <div className="deco-dots deco-dots-bottom" />
      <svg className="deco-line deco-line-bottom" viewBox="0 0 500 200" fill="none">
        <path d="M0 150 C 150 220, 300 60, 500 140" stroke="#d4af37" strokeWidth="2" />
      </svg>

      <section className="hero-section">
        <div className="hero-shape hero-shape-left" />
        <div className="hero-shape hero-shape-right" />

        <div className="hero-container hero-container-split">
          <div className="hero-copy fade-up">
            <span className="hero-eyebrow">
              <span className="hero-eyebrow-line" />
              Welcome to Smart Library
            </span>
            <h1 className="hero-title">
              Smart AI-Based<br />
              <span>Digital Library</span>
            </h1>
            <p className="hero-description">
              Streamline your library management with AI
            </p>
            <div className="hero-buttons">
              <Link to="/login" className="btn btn-primary">
                <span className="btn-icon">🚀</span>
                Get Started Free
              </Link>
              <button onClick={() => handleScrollTo('features')} className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                <span className="btn-icon btn-play-icon">▶</span>
                Learn More
              </button>
            </div>
          </div>

          <div className="hero-visual fade-up">
            <img src={libraryShelf} alt="Library bookshelf with reading chair" className="hero-visual-img" />
          </div>
        </div>
      </section>

      <section className="features-section" id="features">
        <div className="section-container">
          <div className="section-header fade-up">
            <span className="section-eyebrow">Built for librarians and learning communities</span>
            <h2>Everything your library needs in one elegant platform.</h2>
          </div>

          <div className="features-grid">
            {featureItems.map((feature) => (
              <article key={feature.title} className="feature-card fade-up">
                <div className="feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                <span className="feature-card-underline" />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="stats-section" id="about">
        <div className="section-container">
          <div className="stats-bar fade-up">
            {stats.map((stat) => (
              <div key={stat.label} className="stat-item">
                <div className="stat-icon">{stat.icon}</div>
                <div>
                  <p className="stat-value">{stat.value}</p>
                  <p className="stat-label">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-section" id="contact">
        <div className="section-container">
          <div className="cta-container fade-up">
            <div className="cta-content">
              <h2>Ready to Transform Your Library Experience?</h2>
              <p>Join thousands of libraries already using Smart Library to manage their collections with AI.</p>
            </div>
            <Link to="/login" className="btn btn-primary btn-large">
              <span className="btn-icon">🚀</span>
              Get Started Free Today
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;