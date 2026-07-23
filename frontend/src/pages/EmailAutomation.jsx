import React, { useState, useEffect, useCallback } from 'react';
import {
  getSmtpSettings,
  updateSmtpSettings,
  sendTestEmail,
  triggerDueReminders,
  getEmailHistory,
  resendEmail,
  sendCustomEmail,
  getEmailTemplates
} from '../services/api';
import './EmailAutomation.css';

const EmailAutomation = () => {
  // Active Tab
  const [activeTab, setActiveTab] = useState('history');

  // Alert Feedback
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // SMTP Settings
  const [smtpConfig, setSmtpConfig] = useState({
    host: '', port: 587, username: '', password: '', from_email: '', from_name: 'Smart AI Library', tls: true
  });
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [testEmailAddr, setTestEmailAddr] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [triggeringReminders, setTriggeringReminders] = useState(false);

  // History
  const [historyLogs, setHistoryLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [resendingId, setResendingId] = useState(null);

  // Templates
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // Custom Email Composer
  const [compose, setCompose] = useState({
    recipient_email: '',
    broadcast_all_members: false,
    subject: '',
    message: ''
  });
  const [sendingCustom, setSendingCustom] = useState(false);

  // Auto-clear alerts after 5s
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => { setSuccess(''); setError(''); }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  // ── Load data based on active tab ──
  const loadSmtpSettings = useCallback(async () => {
    try {
      setSmtpLoading(true);
      const data = await getSmtpSettings();
      setSmtpConfig({
        host: data.host || '',
        port: data.port || 587,
        username: data.username || '',
        password: data.password || '',
        from_email: data.from_email || '',
        from_name: data.from_name || 'Smart AI Library',
        tls: data.tls !== false
      });
    } catch { /* SMTP may not be configured yet */ }
    finally { setSmtpLoading(false); }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const data = await getEmailHistory(200, historySearch);
      setHistoryLogs(Array.isArray(data) ? data : []);
    } catch { setHistoryLogs([]); }
    finally { setHistoryLoading(false); }
  }, [historySearch]);

  const loadTemplates = useCallback(async () => {
    try {
      setTemplatesLoading(true);
      const data = await getEmailTemplates();
      setTemplates(Array.isArray(data) ? data : []);
    } catch { setTemplates([]); }
    finally { setTemplatesLoading(false); }
  }, []);

  useEffect(() => {
    if (activeTab === 'smtp') loadSmtpSettings();
    if (activeTab === 'history') loadHistory();
    if (activeTab === 'templates') loadTemplates();
  }, [activeTab, loadSmtpSettings, loadHistory, loadTemplates]);

  // ── SMTP Handlers ──
  const handleSaveSmtp = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      setSavingSmtp(true);
      await updateSmtpSettings(smtpConfig);
      setSuccess('SMTP settings saved successfully!');
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to save SMTP settings.');
    } finally { setSavingSmtp(false); }
  };

  const handleTestEmail = async () => {
    if (!testEmailAddr) return;
    setError(''); setSuccess('');
    try {
      setSendingTest(true);
      const res = await sendTestEmail(testEmailAddr);
      setSuccess(res.message || 'Test email dispatched!');
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to send test email.');
    } finally { setSendingTest(false); }
  };

  const handleTriggerReminders = async () => {
    setError(''); setSuccess('');
    try {
      setTriggeringReminders(true);
      const res = await triggerDueReminders();
      setSuccess(res.message || 'Due reminders triggered successfully!');
    } catch {
      setError('Failed to trigger due reminders.');
    } finally { setTriggeringReminders(false); }
  };

  // ── History Handlers ──
  const handleResend = async (logId) => {
    setError(''); setSuccess('');
    try {
      setResendingId(logId);
      const res = await resendEmail(logId);
      setSuccess(res.message || 'Email resent successfully!');
      loadHistory(); // Refresh
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to resend email.');
    } finally { setResendingId(null); }
  };

  const handleSearchHistory = (e) => {
    setHistorySearch(e.target.value);
  };

  useEffect(() => {
    if (activeTab === 'history') {
      const debounce = setTimeout(() => loadHistory(), 400);
      return () => clearTimeout(debounce);
    }
  }, [historySearch]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Custom Email ──
  const handleSendCustom = async (e) => {
    e.preventDefault();
    if (!compose.subject || !compose.message) {
      setError('Subject and message body are required.'); return;
    }
    if (!compose.broadcast_all_members && !compose.recipient_email) {
      setError('Provide a recipient email or enable broadcast to all members.'); return;
    }
    setError(''); setSuccess('');
    try {
      setSendingCustom(true);
      const res = await sendCustomEmail(compose);
      setSuccess(res.message || 'Custom email dispatched!');
      setCompose({ recipient_email: '', broadcast_all_members: false, subject: '', message: '' });
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to send custom email.');
    } finally { setSendingCustom(false); }
  };

  // ── Stats from logs ──
  const sentCount = historyLogs.filter(l => l.status === 'sent' || l.status === 'success').length;
  const failedCount = historyLogs.filter(l => l.status === 'failed' || l.status === 'error').length;

  // ── Format date helper ──
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' +
             d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch { return dateStr; }
  };

  // ── Tab config ──
  const tabs = [
    { id: 'history', label: 'Email History', icon: '📋' },
    { id: 'compose', label: 'Compose', icon: '✏️' },
    { id: 'templates', label: 'Templates', icon: '📐' },
    { id: 'smtp', label: 'SMTP Settings', icon: '⚙️' },
    { id: 'reminders', label: 'Reminders', icon: '🔔' },
  ];

  return (
    <div className="email-automation-page">
      {/* Page Header */}
      <div className="email-page-header">
        <div className="email-header-text">
          <h1>📧 Email Automation</h1>
          <p>Manage email templates, dispatch custom emails, view history, and configure SMTP delivery.</p>
        </div>
        <div className="email-header-actions">
          <button className="btn-email-secondary" onClick={() => { setActiveTab('history'); loadHistory(); }}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Alerts */}
      {success && <div className="email-alert success">✅ {success}</div>}
      {error && <div className="email-alert error">❌ {error}</div>}

      {/* Stats Row */}
      <div className="email-stats-row">
        <div className="email-stat-card">
          <div className="email-stat-icon sent">✉️</div>
          <div className="email-stat-info">
            <h3>{sentCount}</h3>
            <p>Emails Sent</p>
          </div>
        </div>
        <div className="email-stat-card">
          <div className="email-stat-icon failed">⚠️</div>
          <div className="email-stat-info">
            <h3>{failedCount}</h3>
            <p>Failed</p>
          </div>
        </div>
        <div className="email-stat-card">
          <div className="email-stat-icon templates">📐</div>
          <div className="email-stat-info">
            <h3>{templates.length || 8}</h3>
            <p>Templates</p>
          </div>
        </div>
        <div className="email-stat-card">
          <div className="email-stat-icon pending">📊</div>
          <div className="email-stat-info">
            <h3>{historyLogs.length}</h3>
            <p>Total Logged</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="email-tab-nav">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`email-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="email-tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════
          TAB 1: EMAIL HISTORY
          ═══════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <div className="email-section-card">
          <h3 className="email-section-title">📋 Dispatch History Log</h3>
          <p className="email-section-subtitle">View all outgoing email records with status, timestamps, and resend controls.</p>

          <div className="email-history-toolbar">
            <div className="email-search-box">
              <span className="email-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search by recipient, subject, or template..."
                value={historySearch}
                onChange={handleSearchHistory}
              />
            </div>
            <button className="btn-email-secondary btn-email-sm" onClick={loadHistory}>
              🔄 Reload
            </button>
          </div>

          {historyLoading ? (
            <div className="email-loading">
              <div className="email-spinner"></div>
              <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Loading email logs…</span>
            </div>
          ) : historyLogs.length === 0 ? (
            <div className="email-empty-state">
              <div className="empty-icon">📭</div>
              <h3>No Email Records Found</h3>
              <p>Dispatched emails will appear here with delivery status and timestamps.</p>
            </div>
          ) : (
            <div className="email-table-wrapper">
              <table className="email-history-table">
                <thead>
                  <tr>
                    <th>Recipient</th>
                    <th>Subject</th>
                    <th>Template</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {historyLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontWeight: 600 }}>{log.recipient_email || '—'}</td>
                      <td style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.subject || '—'}
                      </td>
                      <td>
                        <span className="email-template-id">{log.template_name || '—'}</span>
                      </td>
                      <td>
                        <span className={`email-status-badge ${
                          (log.status === 'sent' || log.status === 'success') ? 'success' :
                          (log.status === 'failed' || log.status === 'error') ? 'failed' : 'pending'
                        }`}>
                          {(log.status === 'sent' || log.status === 'success') ? '✓ Sent' :
                           (log.status === 'failed' || log.status === 'error') ? '✕ Failed' : log.status || '—'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: '#64748b' }}>
                        {formatDate(log.dispatched_at)}
                      </td>
                      <td>
                        <button
                          className="email-resend-btn"
                          disabled={resendingId === log.id}
                          onClick={() => handleResend(log.id)}
                        >
                          {resendingId === log.id ? '⏳' : '🔁'} Resend
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════
          TAB 2: COMPOSE CUSTOM EMAIL
          ═══════════════════════════════════════════ */}
      {activeTab === 'compose' && (
        <div className="email-section-card">
          <h3 className="email-section-title">✏️ Compose Custom Email</h3>
          <p className="email-section-subtitle">Send custom announcements to individual recipients or broadcast to all library members.</p>

          <form onSubmit={handleSendCustom}>
            <div className="email-compose-preview">
              <div className="email-compose-form">
                {/* Broadcast Toggle */}
                <div className="email-toggle-row">
                  <label className="email-toggle">
                    <input
                      type="checkbox"
                      checked={compose.broadcast_all_members}
                      onChange={e => setCompose(prev => ({...prev, broadcast_all_members: e.target.checked}))}
                    />
                    <span className="email-toggle-slider"></span>
                  </label>
                  <span className="email-toggle-label">Broadcast to All Members</span>
                </div>

                {/* Recipient (if not broadcast) */}
                {!compose.broadcast_all_members && (
                  <div className="email-form-group">
                    <label className="email-form-label">Recipient Email</label>
                    <input
                      type="email"
                      className="email-form-input"
                      placeholder="student@example.com"
                      value={compose.recipient_email}
                      onChange={e => setCompose(prev => ({...prev, recipient_email: e.target.value}))}
                    />
                  </div>
                )}

                <div className="email-form-group">
                  <label className="email-form-label">Subject</label>
                  <input
                    type="text"
                    className="email-form-input"
                    placeholder="e.g. Library Notice: Scheduled Maintenance"
                    value={compose.subject}
                    onChange={e => setCompose(prev => ({...prev, subject: e.target.value}))}
                    required
                  />
                </div>

                <div className="email-form-group">
                  <label className="email-form-label">Message Body</label>
                  <textarea
                    className="email-form-textarea"
                    placeholder="Write your email message here…"
                    value={compose.message}
                    onChange={e => setCompose(prev => ({...prev, message: e.target.value}))}
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button type="submit" className="btn-email-primary" disabled={sendingCustom}>
                    {sendingCustom ? '⏳ Sending…' : '📤 Send Email'}
                  </button>
                  <button
                    type="button"
                    className="btn-email-secondary"
                    onClick={() => setCompose({ recipient_email: '', broadcast_all_members: false, subject: '', message: '' })}
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Live Preview */}
              <div className="email-preview-pane">
                <h4>📨 Live Preview</h4>
                <div className="email-preview-body">
                  {compose.subject ? (
                    <div className="email-preview-subject">{compose.subject}</div>
                  ) : (
                    <div className="email-preview-subject" style={{ color: '#94a3b8', fontStyle: 'italic' }}>No subject entered</div>
                  )}
                  <div style={{ whiteSpace: 'pre-wrap' }}>
                    {compose.message || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Email body will appear here as you type…</span>}
                  </div>
                  {compose.broadcast_all_members && (
                    <div style={{ marginTop: '1rem', padding: '0.5rem 0.75rem', background: '#fef3c7', borderRadius: '6px', fontSize: '0.82rem', color: '#92400e', fontWeight: 600 }}>
                      🔔 This will be sent to ALL registered library members.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          TAB 3: EMAIL TEMPLATES
          ═══════════════════════════════════════════ */}
      {activeTab === 'templates' && (
        <div className="email-section-card">
          <h3 className="email-section-title">📐 System Email Templates</h3>
          <p className="email-section-subtitle">Pre-built HTML templates used for automated email dispatches throughout the system.</p>

          {templatesLoading ? (
            <div className="email-loading">
              <div className="email-spinner"></div>
              <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Loading templates…</span>
            </div>
          ) : templates.length === 0 ? (
            <div className="email-empty-state">
              <div className="empty-icon">📐</div>
              <h3>No Templates Found</h3>
              <p>System templates will appear here once the backend is connected.</p>
            </div>
          ) : (
            <div className="email-templates-grid">
              {templates.map((tpl) => (
                <div className="email-template-card" key={tpl.id}>
                  <h4>{tpl.name}</h4>
                  <p>{tpl.description}</p>
                  <span className="email-template-id">{tpl.id}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════
          TAB 4: SMTP SETTINGS
          ═══════════════════════════════════════════ */}
      {activeTab === 'smtp' && (
        <div className="email-section-card">
          <h3 className="email-section-title">⚙️ SMTP Server Configuration</h3>
          <p className="email-section-subtitle">Configure the outgoing mail server used for all automated and custom email dispatches.</p>

          {smtpLoading ? (
            <div className="email-loading">
              <div className="email-spinner"></div>
              <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Loading SMTP settings…</span>
            </div>
          ) : (
            <form onSubmit={handleSaveSmtp}>
              <div className="email-form-row">
                <div className="email-form-group">
                  <label className="email-form-label">SMTP Host</label>
                  <input
                    type="text"
                    className="email-form-input"
                    placeholder="e.g. smtp.gmail.com"
                    value={smtpConfig.host}
                    onChange={e => setSmtpConfig(prev => ({...prev, host: e.target.value}))}
                  />
                </div>
                <div className="email-form-group">
                  <label className="email-form-label">SMTP Port</label>
                  <input
                    type="number"
                    className="email-form-input"
                    placeholder="587"
                    value={smtpConfig.port}
                    onChange={e => setSmtpConfig(prev => ({...prev, port: parseInt(e.target.value) || 587}))}
                  />
                </div>
              </div>

              <div className="email-form-row">
                <div className="email-form-group">
                  <label className="email-form-label">Username / Email</label>
                  <input
                    type="text"
                    className="email-form-input"
                    placeholder="noreply@yourlibrary.com"
                    value={smtpConfig.username}
                    onChange={e => setSmtpConfig(prev => ({...prev, username: e.target.value}))}
                  />
                </div>
                <div className="email-form-group">
                  <label className="email-form-label">Password / App Key</label>
                  <input
                    type="password"
                    className="email-form-input"
                    placeholder="••••••••"
                    value={smtpConfig.password}
                    onChange={e => setSmtpConfig(prev => ({...prev, password: e.target.value}))}
                  />
                </div>
              </div>

              <div className="email-form-row">
                <div className="email-form-group">
                  <label className="email-form-label">From Email</label>
                  <input
                    type="email"
                    className="email-form-input"
                    placeholder="noreply@yourlibrary.com"
                    value={smtpConfig.from_email}
                    onChange={e => setSmtpConfig(prev => ({...prev, from_email: e.target.value}))}
                  />
                </div>
                <div className="email-form-group">
                  <label className="email-form-label">From Name</label>
                  <input
                    type="text"
                    className="email-form-input"
                    placeholder="Smart AI Library"
                    value={smtpConfig.from_name}
                    onChange={e => setSmtpConfig(prev => ({...prev, from_name: e.target.value}))}
                  />
                </div>
              </div>

              <div className="email-toggle-row" style={{ marginTop: '0.25rem' }}>
                <label className="email-toggle">
                  <input
                    type="checkbox"
                    checked={smtpConfig.tls}
                    onChange={e => setSmtpConfig(prev => ({...prev, tls: e.target.checked}))}
                  />
                  <span className="email-toggle-slider"></span>
                </label>
                <span className="email-toggle-label">Enable TLS / STARTTLS Encryption</span>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="submit" className="btn-email-primary" disabled={savingSmtp}>
                  {savingSmtp ? '⏳ Saving…' : '💾 Save SMTP Settings'}
                </button>
              </div>
            </form>
          )}

          {/* Test Email Card */}
          <div style={{ marginTop: '2rem', padding: '1.25rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>📤 Send Test Email</h4>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 0.85rem 0' }}>
              Dispatch a test notification to verify your SMTP server connectivity and credentials.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="email"
                className="email-form-input"
                style={{ maxWidth: '320px' }}
                placeholder="test@example.com"
                value={testEmailAddr}
                onChange={e => setTestEmailAddr(e.target.value)}
              />
              <button
                className="btn-email-primary"
                disabled={sendingTest || !testEmailAddr}
                onClick={handleTestEmail}
              >
                {sendingTest ? '⏳ Sending…' : '🧪 Send Test'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          TAB 5: REMINDERS & SCHEDULING
          ═══════════════════════════════════════════ */}
      {activeTab === 'reminders' && (
        <div className="email-section-card">
          <h3 className="email-section-title">🔔 Automated Reminders</h3>
          <p className="email-section-subtitle">Trigger bulk due/overdue reminder emails for all active borrowers, or configure automated scheduling.</p>

          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem',
            marginTop: '0.5rem'
          }}>
            {/* Trigger Now */}
            <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📨</div>
              <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 700, color: '#0f172a' }}>Trigger Due Reminders Now</h4>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1rem 0', lineHeight: 1.5 }}>
                Scan all active book loans in the database and immediately dispatch due/overdue reminder emails to students whose books are due soon or overdue.
              </p>
              <button
                className="btn-email-primary"
                onClick={handleTriggerReminders}
                disabled={triggeringReminders}
              >
                {triggeringReminders ? '⏳ Scanning & Sending…' : '🔔 Trigger Reminders Now'}
              </button>
            </div>

            {/* Info Card */}
            <div style={{ padding: '1.5rem', background: '#fffbeb', borderRadius: '12px', border: '1px solid #fde68a' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📖</div>
              <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 700, color: '#92400e' }}>How Reminders Work</h4>
              <ul style={{ fontSize: '0.85rem', color: '#78716c', lineHeight: 1.8, margin: 0, paddingLeft: '1.2rem' }}>
                <li>All active borrows with status <strong>"issued"</strong> are scanned.</li>
                <li>Students with valid emails receive due/overdue notices.</li>
                <li>Overdue days are calculated and included in the email.</li>
                <li>Each dispatch is logged in Email History for auditing.</li>
                <li>Configure auto-reminder days in <strong>Settings → Borrow Policy</strong>.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailAutomation;
