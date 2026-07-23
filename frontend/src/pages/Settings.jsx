import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  getSystemSettings,
  updateSystemSettings,
  uploadLogo,
  uploadFavicon,
  exportDatabaseBackupUrl,
  restoreDatabaseBackup,
  createManualBackup,
  getBackupHistory,
  getBackupDownloadUrl,
  restoreBackupById,
  deleteBackup,
  getSmtpSettings,
  updateSmtpSettings,
  sendTestEmail,
  triggerDueReminders
} from '../services/api';
import './Students.css';
import './Dashboard.css';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('general'); // general, library, borrow, fine, email, backup, branding
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Backup History States
  const [backupHistory, setBackupHistory] = useState([]);
  const [creatingBackup, setCreatingBackup] = useState(false);

  // Feedback
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Branding & Backup Refs
  const logoInputRef = useRef(null);
  const faviconInputRef = useRef(null);
  const restoreInputRef = useRef(null);
  // SMTP Email States
  const [testEmailAddr, setTestEmailAddr] = useState('');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [triggeringReminders, setTriggeringReminders] = useState(false);

  const [restoreStatus, setRestoreStatus] = useState('');

  useEffect(() => {
    loadSettingsData();
  }, []);

  const loadBackupHistoryData = useCallback(async () => {
    try {
      const history = await getBackupHistory();
      setBackupHistory(history);
    } catch (e) {
      console.error('Failed to load backup history', e);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'backup') {
      loadBackupHistoryData();
    }
  }, [activeTab, loadBackupHistoryData]);

  const loadSettingsData = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getSystemSettings();
      setSettings(data);
    } catch (err) {
      setError('Could not load system settings from server. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (category, field, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...(prev[category] || {}),
        [field]: value
      }
    }));
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      setSaving(true);
      await updateSystemSettings(settings);
      setSuccess('System settings updated and saved successfully!');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save system settings.');
    } finally {
      setSaving(false);
    }
  };

  // Branding Uploads
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(''); setSuccess('');
    try {
      const res = await uploadLogo(file);
      handleFieldChange('branding', 'logo', res.logo);
      setSuccess('System logo uploaded successfully!');
    } catch (err) {
      setError(err.response?.data?.detail || 'Logo upload failed.');
    }
  };

  const handleFaviconUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(''); setSuccess('');
    try {
      const res = await uploadFavicon(file);
      handleFieldChange('branding', 'favicon', res.favicon);
      setSuccess('System favicon uploaded successfully!');
    } catch (err) {
      setError(err.response?.data?.detail || 'Favicon upload failed.');
    }
  };

  // Backup & Restore
  const handleDownloadBackup = async () => {
    const url = exportDatabaseBackupUrl();
    const token = localStorage.getItem('access_token') || '';
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `smart_library_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setError('Backup export failed. Please try again.');
    }
  };

  const handleDownloadBackupById = async (backupId, filename) => {
    const url = getBackupDownloadUrl(backupId);
    const token = localStorage.getItem('access_token') || '';
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setError('Backup download failed. Please try again.');
    }
  };

  const handleRestoreFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!window.confirm('Are you sure you want to restore the database from this backup? Existing matching records will be updated.')) return;

    setError(''); setSuccess(''); setRestoreStatus('Restoring database from backup...');
    try {
      const res = await restoreDatabaseBackup(file);
      setSuccess(`Database restore complete! Restored summary: ${JSON.stringify(res.restored)}`);
      setRestoreStatus('');
      loadSettingsData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Database restore failed. Check backup JSON format.');
      setRestoreStatus('');
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner" />
        <span>Loading system settings...</span>
      </div>
    );
  }

  const currentSettings = settings || {};

  return (
    <div className="dashboard-wrapper" style={{ width: '100%', padding: '2rem 3rem' }}>
      {/* ── Header ── */}
      <header className="dashboard-header-bar" style={{ marginBottom: '1.5rem' }}>
        <div className="header-meta">
          <h2>System Configurations & Administration</h2>
          <span className="header-role-badge">Global Settings Terminal</span>
        </div>
      </header>

      {error && (
        <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '1rem 1.25rem', borderRadius: '12px', marginBottom: '1.5rem', fontWeight: 'bold' }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #dcfce7', padding: '1rem 1.25rem', borderRadius: '12px', marginBottom: '1.5rem', fontWeight: 'bold' }}>
          {success}
        </div>
      )}

      {/* ── Navigation Tabs ── */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          ['general', 'General'],
          ['library', 'Library Rules'],
          ['borrow', 'Borrowing'],
          ['fine', 'Fines & Fees'],
          ['email', 'Email & SMTP']
        ].map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setError(''); setSuccess(''); }}
            style={{
              padding: '0.6rem 1.1rem', borderRadius: '8px', border: 'none',
              background: activeTab === tab ? '#D4A017' : '#f1f5f9',
              color: activeTab === tab ? '#ffffff' : '#5c5549',
              fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ background: '#ffffff', borderRadius: '16px', padding: '2.25rem', border: '1px solid rgba(226,211,179,0.55)', boxShadow: '0 6px 20px rgba(20,18,15,0.03)' }}>
        
        {/* ════════════════════════════════════════
            TAB 1: GENERAL
        ════════════════════════════════════════ */}
        {activeTab === 'general' && (
          <form onSubmit={handleSaveSettings}>
            <h4 style={{ margin: '0 0 1.5rem 0', fontWeight: '800', color: '#1e1b15' }}>General System Information</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#5c5549', marginBottom: '0.35rem' }}>SYSTEM / PORTAL NAME</label>
                <input
                  type="text" required
                  value={settings.general?.system_name || ''}
                  onChange={e => handleFieldChange('general', 'system_name', e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1.5px solid rgba(212,160,23,0.3)', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#5c5549', marginBottom: '0.35rem' }}>TAGLINE / SUBHEADER</label>
                <input
                  type="text"
                  value={settings.general?.tagline || ''}
                  onChange={e => handleFieldChange('general', 'tagline', e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1.5px solid rgba(212,160,23,0.3)', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#5c5549', marginBottom: '0.35rem' }}>CONTACT EMAIL</label>
                <input
                  type="email" required
                  value={settings.general?.contact_email || ''}
                  onChange={e => handleFieldChange('general', 'contact_email', e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1.5px solid rgba(212,160,23,0.3)', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#5c5549', marginBottom: '0.35rem' }}>CONTACT PHONE</label>
                <input
                  type="text"
                  value={settings.general?.contact_phone || ''}
                  onChange={e => handleFieldChange('general', 'contact_phone', e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1.5px solid rgba(212,160,23,0.3)', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#5c5549', marginBottom: '0.35rem' }}>TIMEZONE</label>
                <select
                  value={settings.general?.timezone || 'UTC'}
                  onChange={e => handleFieldChange('general', 'timezone', e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1.5px solid rgba(212,160,23,0.3)', outline: 'none', background: '#fff' }}
                >
                  <option value="UTC">UTC (Universal Time)</option>
                  <option value="EST">EST (Eastern Standard Time)</option>
                  <option value="CST">CST (Central Standard Time)</option>
                  <option value="PST">PST (Pacific Standard Time)</option>
                  <option value="IST">IST (Indian Standard Time)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#5c5549', marginBottom: '0.35rem' }}>CURRENCY SYMBOL</label>
                <input
                  type="text"
                  value={settings.general?.currency_symbol || '₹'}
                  onChange={e => handleFieldChange('general', 'currency_symbol', e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1.5px solid rgba(212,160,23,0.3)', outline: 'none' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" disabled={saving} style={{ padding: '0.75rem 2rem', background: '#D4A017', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>
                {saving ? 'Saving...' : 'Save General Settings'}
              </button>
            </div>
          </form>
        )}

        {/* ════════════════════════════════════════
            TAB 2: LIBRARY RULES
        ════════════════════════════════════════ */}
        {activeTab === 'library' && (
          <form onSubmit={handleSaveSettings}>
            <h4 style={{ margin: '0 0 1.5rem 0', fontWeight: '800', color: '#1e1b15' }}>Library Operating & Capacity Rules</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#5c5549', marginBottom: '0.35rem' }}>OPERATING HOURS</label>
                <input
                  type="text"
                  value={settings.library?.operating_hours || ''}
                  onChange={e => handleFieldChange('library', 'operating_hours', e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1.5px solid rgba(212,160,23,0.3)', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#5c5549', marginBottom: '0.35rem' }}>MAX BOOKS PER STUDENT</label>
                <input
                  type="number" min="1" max="20"
                  value={settings.library?.max_books_per_student || 5}
                  onChange={e => handleFieldChange('library', 'max_books_per_student', parseInt(e.target.value) || 1)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1.5px solid rgba(212,160,23,0.3)', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#5c5549', marginBottom: '0.35rem' }}>MAX RESERVATION EXPIRY (DAYS)</label>
                <input
                  type="number" min="1" max="30"
                  value={settings.library?.max_reservation_days || 7}
                  onChange={e => handleFieldChange('library', 'max_reservation_days', parseInt(e.target.value) || 1)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1.5px solid rgba(212,160,23,0.3)', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#5c5549', marginBottom: '0.35rem' }}>MAX RENEWAL COUNT</label>
                <input
                  type="number" min="0" max="10"
                  value={settings.library?.max_renew_count || 2}
                  onChange={e => handleFieldChange('library', 'max_renew_count', parseInt(e.target.value) || 0)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1.5px solid rgba(212,160,23,0.3)', outline: 'none' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" disabled={saving} style={{ padding: '0.75rem 2rem', background: '#D4A017', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>
                {saving ? 'Saving...' : 'Save Library Rules'}
              </button>
            </div>
          </form>
        )}

        {/* ════════════════════════════════════════
            TAB 3: BORROWING
        ════════════════════════════════════════ */}
        {activeTab === 'borrow' && (
          <form onSubmit={handleSaveSettings}>
            <h4 style={{ margin: '0 0 1.5rem 0', fontWeight: '800', color: '#1e1b15' }}>Borrowing Policy Configurations</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#5c5549', marginBottom: '0.35rem' }}>DEFAULT BORROW PERIOD (DAYS)</label>
                <input
                  type="number" min="1" max="90"
                  value={settings.borrow?.default_borrow_days || 14}
                  onChange={e => handleFieldChange('borrow', 'default_borrow_days', parseInt(e.target.value) || 14)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1.5px solid rgba(212,160,23,0.3)', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#5c5549', marginBottom: '0.35rem' }}>GRACE PERIOD BEFORE FINE (DAYS)</label>
                <input
                  type="number" min="0" max="30"
                  value={settings.borrow?.grace_period_days || 2}
                  onChange={e => handleFieldChange('borrow', 'grace_period_days', parseInt(e.target.value) || 0)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1.5px solid rgba(212,160,23,0.3)', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#5c5549', marginBottom: '0.35rem' }}>AUTO REMINDER DAYS BEFORE DUE</label>
                <input
                  type="number" min="1" max="14"
                  value={settings.borrow?.auto_remind_days_before || 3}
                  onChange={e => handleFieldChange('borrow', 'auto_remind_days_before', parseInt(e.target.value) || 3)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1.5px solid rgba(212,160,23,0.3)', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#5c5549', marginBottom: '0.35rem' }}>FINE BLOCK LIMIT (₹)</label>
                <input
                  type="number" min="0" step="0.5"
                  value={settings.borrow?.max_fine_limit_for_borrow || 20.0}
                  onChange={e => handleFieldChange('borrow', 'max_fine_limit_for_borrow', parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1.5px solid rgba(212,160,23,0.3)', outline: 'none' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" disabled={saving} style={{ padding: '0.75rem 2rem', background: '#D4A017', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>
                {saving ? 'Saving...' : 'Save Borrow Policies'}
              </button>
            </div>
          </form>
        )}

        {/* ════════════════════════════════════════
            TAB 4: FINES & FEES
        ════════════════════════════════════════ */}
        {activeTab === 'fine' && (
          <form onSubmit={handleSaveSettings}>
            <h4 style={{ margin: '0 0 1.5rem 0', fontWeight: '800', color: '#1e1b15' }}>Fine Rate & Penalty Structure</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#5c5549', marginBottom: '0.35rem' }}>DAILY FINE RATE (₹/DAY)</label>
                <input
                  type="number" min="0" step="0.1"
                  value={settings.fine?.daily_fine_rate || 1.50}
                  onChange={e => handleFieldChange('fine', 'daily_fine_rate', parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1.5px solid rgba(212,160,23,0.3)', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#5c5549', marginBottom: '0.35rem' }}>MAX FINE CAP PER BOOK (₹)</label>
                <input
                  type="number" min="0" step="1"
                  value={settings.fine?.max_fine_per_book || 50.0}
                  onChange={e => handleFieldChange('fine', 'max_fine_per_book', parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1.5px solid rgba(212,160,23,0.3)', outline: 'none' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" disabled={saving} style={{ padding: '0.75rem 2rem', background: '#D4A017', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>
                {saving ? 'Saving...' : 'Save Fine Settings'}
              </button>
            </div>
          </form>
        )}

        {/* ════════════════════════════════════════
            TAB 5: EMAIL & SMTP
        ════════════════════════════════════════ */}
        {activeTab === 'email' && (
          <div>
            <form onSubmit={handleSaveSettings} style={{ marginBottom: '2.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h4 style={{ margin: 0, fontWeight: '800', color: '#1e1b15' }}>Email Server & SMTP Notification Settings</h4>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#5c5549' }}>Configure outgoing mail server for automated due reminders, confirmations, and alerts</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#5c5549', marginBottom: '0.35rem' }}>SMTP SERVER HOST</label>
                  <input
                    type="text"
                    placeholder="e.g. smtp.gmail.com"
                    value={settings.email?.smtp_host || ''}
                    onChange={e => handleFieldChange('email', 'smtp_host', e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1.5px solid rgba(212,160,23,0.3)', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#5c5549', marginBottom: '0.35rem' }}>SMTP PORT</label>
                  <input
                    type="number"
                    placeholder="587"
                    value={settings.email?.smtp_port || 587}
                    onChange={e => handleFieldChange('email', 'smtp_port', parseInt(e.target.value) || 587)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1.5px solid rgba(212,160,23,0.3)', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#5c5549', marginBottom: '0.35rem' }}>SMTP USERNAME / EMAIL</label>
                  <input
                    type="text"
                    placeholder="user@example.com"
                    value={settings.email?.smtp_user || ''}
                    onChange={e => handleFieldChange('email', 'smtp_user', e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1.5px solid rgba(212,160,23,0.3)', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#5c5549', marginBottom: '0.35rem' }}>SENDER DISPLAY NAME</label>
                  <input
                    type="text"
                    placeholder="Smart AI Library"
                    value={settings.email?.sender_name || ''}
                    onChange={e => handleFieldChange('email', 'sender_name', e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1.5px solid rgba(212,160,23,0.3)', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" disabled={saving} style={{ padding: '0.75rem 2rem', background: '#D4A017', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>
                  {saving ? 'Saving...' : 'Save Email Configurations'}
                </button>
              </div>
            </form>

            <hr style={{ border: 'none', borderTop: '1px solid rgba(212,160,23,0.2)', margin: '2rem 0' }} />

            {/* Diagnostics & Manual Dispatch Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {/* Test Email Action Card */}
              <div style={{ padding: '1.5rem', borderRadius: '12px', border: '1.5px solid rgba(212,160,23,0.3)', background: '#fdfcf9' }}>
                <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: '#1e1b15' }}>Send Test Email</h5>
                <p style={{ fontSize: '0.85rem', color: '#5c5549', marginBottom: '1rem' }}>
                  Dispatch a real-time test notification to verify SMTP host connectivity.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="email"
                    placeholder="recipient@domain.com"
                    value={testEmailAddr}
                    onChange={e => setTestEmailAddr(e.target.value)}
                    style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                  />
                  <button
                    type="button"
                    disabled={sendingTestEmail || !testEmailAddr}
                    onClick={async () => {
                      setError(''); setSuccess('');
                      try {
                        setSendingTestEmail(true);
                        const res = await sendTestEmail(testEmailAddr);
                        setSuccess(res.message || 'Test email dispatched!');
                      } catch (err) {
                        setError(err?.response?.data?.detail || 'Failed to dispatch test email.');
                      } finally {
                        setSendingTestEmail(false);
                      }
                    }}
                    style={{ padding: '0.5rem 1rem', background: '#D4A017', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    {sendingTestEmail ? 'Sending...' : 'Send Test'}
                  </button>
                </div>
              </div>

              {/* Trigger Due Reminders Action Card */}
              <div style={{ padding: '1.5rem', borderRadius: '12px', border: '1.5px solid rgba(37,99,235,0.3)', background: '#f8fafc' }}>
                <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: '#1e1b15' }}>Bulk Trigger Due Reminders</h5>
                <p style={{ fontSize: '0.85rem', color: '#5c5549', marginBottom: '1rem' }}>
                  Scan active loans in database and dispatch immediate due/overdue reminder emails.
                </p>
                <button
                  type="button"
                  disabled={triggeringReminders}
                  onClick={async () => {
                    setError(''); setSuccess('');
                    try {
                      setTriggeringReminders(true);
                      const res = await triggerDueReminders();
                      setSuccess(res.message || 'Reminders triggered successfully!');
                    } catch (err) {
                      setError('Failed to trigger due reminders.');
                    } finally {
                      setTriggeringReminders(false);
                    }
                  }}
                  style={{ padding: '0.65rem 1.25rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
                >
                  {triggeringReminders ? 'Triggering...' : '🔔 Trigger Reminders Now'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
