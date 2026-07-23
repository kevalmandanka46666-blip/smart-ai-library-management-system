import React, { useState, useEffect, useCallback } from 'react';
import {
  getSmsSettings,
  updateSmsSettings,
  sendTestSms,
  triggerSmsDueReminders,
  getSmsHistory,
  resendSms,
  sendCustomSms,
  getSmsTemplates,
  sendOtp,
  verifyOtp
} from '../services/api';
import './SmsAutomation.css';

const SmsAutomation = () => {
  // Tabs: history, compose, templates, provider, reminders, otp
  const [activeTab, setActiveTab] = useState('history');

  // Alerts feedback
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Provider Settings
  const [smsConfig, setSmsConfig] = useState({
    provider: 'mock', api_key: '', api_secret: '', sender_id: 'SMARTLIB'
  });
  const [savingSms, setSavingSms] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [triggeringReminders, setTriggeringReminders] = useState(false);

  // Delivery History
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [resendingId, setResendingId] = useState(null);

  // SMS Templates
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // Custom Composer
  const [compose, setCompose] = useState({
    recipient_phone: '',
    broadcast_all_members: false,
    message: ''
  });
  const [sendingCustom, setSendingCustom] = useState(false);

  // OTP Testing
  const [otpPhone, setOtpPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // Auto-clear notification banners
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => { setSuccess(''); setError(''); }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  // Loaders
  const loadConfig = useCallback(async () => {
    try {
      setConfigLoading(true);
      const data = await getSmsSettings();
      setSmsConfig({
        provider: data.provider || 'mock',
        api_key: data.api_key || '',
        api_secret: data.api_secret || '',
        sender_id: data.sender_id || 'SMARTLIB'
      });
    } catch { /* Suppress configuration empty error */ }
    finally { setConfigLoading(false); }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      setLogsLoading(true);
      const data = await getSmsHistory(200, searchQuery);
      setLogs(Array.isArray(data) ? data : []);
    } catch { setLogs([]); }
    finally { setLogsLoading(false); }
  }, [searchQuery]);

  const loadTemplates = useCallback(async () => {
    try {
      setTemplatesLoading(true);
      const data = await getSmsTemplates();
      setTemplates(Array.isArray(data) ? data : []);
    } catch { setTemplates([]); }
    finally { setTemplatesLoading(false); }
  }, []);

  useEffect(() => {
    if (activeTab === 'provider') loadConfig();
    if (activeTab === 'history') loadHistory();
    if (activeTab === 'templates') loadTemplates();
  }, [activeTab, loadConfig, loadHistory, loadTemplates]);

  // Search Debounce Action
  useEffect(() => {
    if (activeTab === 'history') {
      const timeout = setTimeout(() => loadHistory(), 400);
      return () => clearTimeout(timeout);
    }
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // Form actions
  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      setSavingSms(true);
      await updateSmsSettings(smsConfig);
      setSuccess('SMS provider settings saved successfully!');
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to save configuration.');
    } finally { setSavingSms(false); }
  };

  const handleTestSms = async () => {
    if (!testPhone) return;
    setError(''); setSuccess('');
    try {
      setSendingTest(true);
      const res = await sendTestSms(testPhone);
      setSuccess(res.message || 'Test SMS dispatched!');
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to send test SMS.');
    } finally { setSendingTest(false); }
  };

  const handleTriggerReminders = async () => {
    setError(''); setSuccess('');
    try {
      setTriggeringReminders(true);
      const res = await triggerSmsDueReminders();
      setSuccess(res.message || 'SMS reminders triggered successfully!');
    } catch {
      setError('Failed to trigger SMS reminders.');
    } finally { setTriggeringReminders(false); }
  };

  const handleResend = async (logId) => {
    setError(''); setSuccess('');
    try {
      setResendingId(logId);
      const res = await resendSms(logId);
      setSuccess(res.message || 'SMS resent successfully!');
      loadHistory();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to resend SMS.');
    } finally { setResendingId(null); }
  };

  const handleSendCustom = async (e) => {
    e.preventDefault();
    if (!compose.message) {
      setError('Message body is required.'); return;
    }
    if (!compose.broadcast_all_members && !compose.recipient_phone) {
      setError('Provide a recipient phone or enable broadcast.'); return;
    }
    setError(''); setSuccess('');
    try {
      setSendingCustom(true);
      const res = await sendCustomSms(compose);
      setSuccess(res.message || 'Custom SMS dispatched!');
      setCompose({ recipient_phone: '', broadcast_all_members: false, message: '' });
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to send custom SMS.');
    } finally { setSendingCustom(false); }
  };

  // OTP Action
  const handleSendOtp = async () => {
    if (!otpPhone) return;
    setError(''); setSuccess('');
    try {
      setSendingOtp(true);
      const res = await sendOtp(otpPhone);
      setSuccess(res.message || 'OTP verification SMS dispatched!');
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to send OTP.');
    } finally { setSendingOtp(false); }
  };

  const handleVerifyOtp = async () => {
    if (!otpPhone || !otpCode) return;
    setError(''); setSuccess('');
    try {
      setVerifyingOtp(true);
      const res = await verifyOtp(otpPhone, otpCode);
      setSuccess(res.message || 'OTP validation successful!');
    } catch (err) {
      setError(err?.response?.data?.detail || 'Invalid or expired OTP code.');
    } finally { setVerifyingOtp(false); }
  };

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' +
             d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch { return dateStr; }
  };

  const tabs = [
    { id: 'history', label: 'SMS History', icon: '📋' },
    { id: 'compose', label: 'Compose', icon: '💬' },
    { id: 'templates', label: 'Templates', icon: '📐' },
    { id: 'provider', label: 'SMS Provider', icon: '⚙️' },
    { id: 'reminders', label: 'Reminders', icon: '🔔' },
    { id: 'otp', label: 'OTP Support', icon: '🔒' }
  ];

  return (
    <div className="sms-automation-page">
      {/* Page Header */}
      <div className="sms-page-header">
        <div className="sms-header-text">
          <h1>📱 SMS Automation</h1>
          <p>Configure text message gateways, templates, OTP systems, history logging, and bulk due alerts.</p>
        </div>
        <div className="sms-header-actions">
          <button className="btn-sms-secondary" onClick={() => { setActiveTab('history'); loadHistory(); }}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Alerts */}
      {success && <div className="sms-alert success">✅ {success}</div>}
      {error && <div className="sms-alert error">❌ {error}</div>}

      {/* Stats Row */}
      <div className="sms-stats-row">
        <div className="sms-stat-card">
          <div className="sms-stat-icon sent">💬</div>
          <div className="sms-stat-info">
            <h3>{logs.filter(l => l.status === 'sent').length}</h3>
            <p>SMS Dispatched</p>
          </div>
        </div>
        <div className="sms-stat-card">
          <div className="sms-stat-icon failed">⚠️</div>
          <div className="sms-stat-info">
            <h3>{logs.filter(l => l.status === 'failed').length}</h3>
            <p>Failed Attempts</p>
          </div>
        </div>
        <div className="sms-stat-card">
          <div className="sms-stat-icon templates">📐</div>
          <div className="sms-stat-info">
            <h3>{templates.length || 8}</h3>
            <p>Templates</p>
          </div>
        </div>
        <div className="sms-stat-card">
          <div className="sms-stat-icon pending">📊</div>
          <div className="sms-stat-info">
            <h3>{logs.length}</h3>
            <p>Logged Records</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="sms-tab-nav">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`sms-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="sms-tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════
          TAB 1: SMS HISTORY
          ═══════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <div className="sms-section-card">
          <h3 className="sms-section-title">📋 SMS Dispatch Logs</h3>
          <p className="sms-section-subtitle">Real-time delivery transaction logs.</p>

          <div className="sms-history-toolbar">
            <div className="sms-search-box">
              <span className="sms-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search by phone, message, or template..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="btn-sms-secondary btn-sms-sm" onClick={loadHistory}>
              🔄 Reload Logs
            </button>
          </div>

          {logsLoading ? (
            <div className="sms-loading">
              <div className="sms-spinner"></div>
              <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Loading SMS logs…</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="sms-empty-state">
              <div className="empty-icon">📭</div>
              <h3>No SMS Records Found</h3>
              <p>Dispatched messages will show up here.</p>
            </div>
          ) : (
            <div className="sms-table-wrapper">
              <table className="sms-history-table">
                <thead>
                  <tr>
                    <th>Recipient Phone</th>
                    <th>Message</th>
                    <th>Template</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontWeight: 600 }}>{log.recipient_phone || '—'}</td>
                      <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.message || '—'}
                      </td>
                      <td>
                        <span className="sms-template-id">{log.template_name || '—'}</span>
                      </td>
                      <td>
                        <span className={`sms-status-badge ${log.status === 'sent' ? 'success' : 'failed'}`}>
                          {log.status === 'sent' ? '✓ Dispatched' : '✕ Failed'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: '#64748b' }}>
                        {formatDate(log.dispatched_at)}
                      </td>
                      <td>
                        <button
                          className="sms-resend-btn"
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
          TAB 2: COMPOSE CUSTOM SMS
          ═══════════════════════════════════════════ */}
      {activeTab === 'compose' && (
        <div className="sms-section-card">
          <h3 className="sms-section-title">💬 Compose Custom SMS</h3>
          <p className="sms-section-subtitle">Send text broadcasts or individual announcements.</p>

          <form onSubmit={handleSendCustom}>
            <div className="sms-compose-preview">
              <div className="sms-compose-form">
                <div className="sms-toggle-row">
                  <label className="sms-toggle">
                    <input
                      type="checkbox"
                      checked={compose.broadcast_all_members}
                      onChange={e => setCompose(prev => ({...prev, broadcast_all_members: e.target.checked}))}
                    />
                    <span className="sms-toggle-slider"></span>
                  </label>
                  <span className="sms-toggle-label">Broadcast to All Members</span>
                </div>

                {!compose.broadcast_all_members && (
                  <div className="sms-form-group">
                    <label className="sms-form-label">Recipient Phone Number</label>
                    <input
                      type="text"
                      className="sms-form-input"
                      placeholder="e.g. +919876543210"
                      value={compose.recipient_phone}
                      onChange={e => setCompose(prev => ({...prev, recipient_phone: e.target.value}))}
                    />
                  </div>
                )}

                <div className="sms-form-group">
                  <label className="sms-form-label">Message Content</label>
                  <textarea
                    className="sms-form-textarea"
                    placeholder="Write your text message here (max 160 characters for standard SMS)..."
                    maxLength={160}
                    value={compose.message}
                    onChange={e => setCompose(prev => ({...prev, message: e.target.value}))}
                    required
                  />
                  <div className="sms-char-counter">
                    {compose.message.length} / 160 characters
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button type="submit" className="btn-sms-primary" disabled={sendingCustom}>
                    {sendingCustom ? '⏳ Sending…' : '📤 Send SMS'}
                  </button>
                  <button
                    type="button"
                    className="btn-sms-secondary"
                    onClick={() => setCompose({ recipient_phone: '', broadcast_all_members: false, message: '' })}
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Live Preview */}
              <div className="sms-preview-pane">
                <h4>📱 Handset Preview</h4>
                <div className="sms-preview-body">
                  <div className="sms-preview-meta">SMARTLIB</div>
                  <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
                    {compose.message || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Message body preview will appear here as you type…</span>}
                  </div>
                  {compose.broadcast_all_members && (
                    <div style={{ marginTop: '1rem', padding: '0.5rem 0.75rem', background: '#fef3c7', borderRadius: '6px', fontSize: '0.8rem', color: '#92400e', fontWeight: 600 }}>
                      🔔 Warning: Broadcasting to ALL library members.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          TAB 3: SMS TEMPLATES
          ═══════════════════════════════════════════ */}
      {activeTab === 'templates' && (
        <div className="sms-section-card">
          <h3 className="sms-section-title">📐 Reusable SMS Templates</h3>
          <p className="sms-section-subtitle">System text message blueprints for automated notifications.</p>

          {templatesLoading ? (
            <div className="sms-loading">
              <div className="sms-spinner"></div>
              <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Loading templates…</span>
            </div>
          ) : templates.length === 0 ? (
            <div className="sms-empty-state">
              <div className="empty-icon">📐</div>
              <h3>No Templates Found</h3>
              <p>Text blueprints will load here.</p>
            </div>
          ) : (
            <div className="sms-templates-grid">
              {templates.map((tpl) => (
                <div className="sms-template-card" key={tpl.id}>
                  <h4>{tpl.name}</h4>
                  <p>{tpl.description}</p>
                  <span className="sms-template-id">{tpl.id}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════
          TAB 4: SMS PROVIDER CONFIG
          ═══════════════════════════════════════════ */}
      {activeTab === 'provider' && (
        <div className="sms-section-card">
          <h3 className="sms-section-title">⚙️ Gateway Provider Settings</h3>
          <p className="sms-section-subtitle">Configure SMS gateway credentials (Twilio, Vonage, MSG91, Custom, Mock).</p>

          {configLoading ? (
            <div className="sms-loading">
              <div className="sms-spinner"></div>
              <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Loading provider configurations…</span>
            </div>
          ) : (
            <form onSubmit={handleSaveConfig}>
              <div className="sms-form-row">
                <div className="sms-form-group">
                  <label className="sms-form-label">Gateway Provider</label>
                  <select
                    className="sms-form-select"
                    value={smsConfig.provider}
                    onChange={e => setSmsConfig(prev => ({...prev, provider: e.target.value}))}
                  >
                    <option value="mock">Mock / Console Simulation</option>
                    <option value="twilio">Twilio SMS Gateway</option>
                    <option value="vonage">Vonage (Nexmo)</option>
                    <option value="msg91">MSG91</option>
                    <option value="custom">Custom HTTP Gateway Endpoint</option>
                  </select>
                </div>
                <div className="sms-form-group">
                  <label className="sms-form-label">Sender ID / From Number</label>
                  <input
                    type="text"
                    className="sms-form-input"
                    placeholder="SMARTLIB or Twilio number"
                    value={smsConfig.sender_id}
                    onChange={e => setSmsConfig(prev => ({...prev, sender_id: e.target.value}))}
                  />
                </div>
              </div>

              {smsConfig.provider !== 'mock' && (
                <div className="sms-form-row">
                  <div className="sms-form-group">
                    <label className="sms-form-label">API Key / Account SID</label>
                    <input
                      type="password"
                      className="sms-form-input"
                      placeholder="••••••••"
                      value={smsConfig.api_key}
                      onChange={e => setSmsConfig(prev => ({...prev, api_key: e.target.value}))}
                    />
                  </div>
                  <div className="sms-form-group">
                    <label className="sms-form-label">API Secret / Auth Token</label>
                    <input
                      type="password"
                      className="sms-form-input"
                      placeholder="••••••••"
                      value={smsConfig.api_secret}
                      onChange={e => setSmsConfig(prev => ({...prev, api_secret: e.target.value}))}
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="submit" className="btn-sms-primary" disabled={savingSms}>
                  {savingSms ? '⏳ Saving…' : '💾 Save Gateway Settings'}
                </button>
              </div>
            </form>
          )}

          {/* Test SMS Dispatcher */}
          <div style={{ marginTop: '2rem', padding: '1.25rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>📤 Dispatch Test SMS</h4>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 0.85rem 0' }}>
              Confirm your gateway configuration by dispatching a real-time testing SMS block.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                className="sms-form-input"
                style={{ maxWidth: '320px' }}
                placeholder="e.g. +919876543210"
                value={testPhone}
                onChange={e => setTestPhone(e.target.value)}
              />
              <button
                className="btn-sms-primary"
                disabled={sendingTest || !testPhone}
                onClick={handleTestSms}
              >
                {sendingTest ? '⏳ Sending…' : '🧪 Dispatch Test'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          TAB 5: REMINDERS & SCHEDULING
          ═══════════════════════════════════════════ */}
      {activeTab === 'reminders' && (
        <div className="sms-section-card">
          <h3 className="sms-section-title">🔔 SMS Reminders Dispatcher</h3>
          <p className="sms-section-subtitle">Send instant due notifications via text.</p>

          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem',
            marginTop: '0.5rem'
          }}>
            <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📱</div>
              <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 700, color: '#0f172a' }}>Bulk Trigger SMS Reminders</h4>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1rem 0', lineHeight: 1.5 }}>
                Scan active loans in the database and dispatch text warnings for items due soon or already overdue.
              </p>
              <button
                className="btn-sms-primary"
                onClick={handleTriggerReminders}
                disabled={triggeringReminders}
              >
                {triggeringReminders ? '⏳ Processing reminders…' : '🔔 Trigger SMS Reminders'}
              </button>
            </div>

            <div style={{ padding: '1.5rem', background: '#fffbeb', borderRadius: '12px', border: '1px solid #fde68a' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>ℹ️</div>
              <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 700, color: '#92400e' }}>Notification Policy Info</h4>
              <ul style={{ fontSize: '0.85rem', color: '#78716c', lineHeight: 1.8, margin: 0, paddingLeft: '1.2rem' }}>
                <li>Queries active loans with status <strong>"issued"</strong>.</li>
                <li>Finds students with mobile numbers and dispatches due warnings.</li>
                <li>Ensures messages fit standard GSM charset requirements.</li>
                <li>Logs all dispatches in the SMS History panel.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          TAB 6: OTP SUPPORT
          ═══════════════════════════════════════════ */}
      {activeTab === 'otp' && (
        <div className="sms-section-card">
          <h3 className="sms-section-title">🔒 OTP Verification Testing</h3>
          <p className="sms-section-subtitle">Verify two-factor SMS OTP authentication flows.</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Step 1: Send OTP */}
            <div style={{ padding: '1.25rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 700 }}>1. Send Verification Code</h4>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
                Enter phone number to generate and dispatch a 6-digit verification code.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <input
                  type="text"
                  className="sms-form-input"
                  placeholder="e.g. +919876543210"
                  value={otpPhone}
                  onChange={e => setOtpPhone(e.target.value)}
                />
                <button
                  className="btn-sms-primary"
                  style={{ alignSelf: 'flex-start' }}
                  disabled={sendingOtp || !otpPhone}
                  onClick={handleSendOtp}
                >
                  {sendingOtp ? 'Sending...' : '🗝️ Generate & Send OTP'}
                </button>
              </div>
            </div>

            {/* Step 2: Verify OTP */}
            <div style={{ padding: '1.25rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 700 }}>2. Validate Code</h4>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
                Enter the OTP code received on the mobile phone to verify its validity.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <input
                  type="text"
                  className="sms-form-input"
                  placeholder="e.g. 123456"
                  maxLength={6}
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value)}
                />
                <button
                  className="btn-sms-primary"
                  style={{ alignSelf: 'flex-start' }}
                  disabled={verifyingOtp || !otpPhone || !otpCode}
                  onClick={handleVerifyOtp}
                >
                  {verifyingOtp ? 'Verifying...' : '✅ Verify Code'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmsAutomation;
