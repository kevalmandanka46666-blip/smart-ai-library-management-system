import React, { useState, useEffect, useCallback } from 'react';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  getNotificationSettings,
  updateNotificationSettings,
  createSystemNotification
} from '../services/api';
import './Notifications.css';

const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all'); // all, unread, borrows, fines, reservations, system

  // Feedback Banner States
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Preference Settings
  const [activeTab, setActiveTab] = useState('inbox'); // inbox, preferences, broadcast
  const [settings, setSettings] = useState({
    browser_enabled: true,
    email_enabled: true,
    sms_enabled: false,
    types: { due_reminders: true, issue_alerts: true, fine_alerts: true, reservations: true }
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Broadcast Announcement Form (Admin Only)
  const [broadcast, setBroadcast] = useState({ title: '', message: '', target_student_id: '' });
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  const isAdmin = JSON.parse(localStorage.getItem('user'))?.role === 'admin';

  // Notification list fetcher
  const loadNotificationsList = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getNotifications();
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      setError('Failed to fetch user notification logs.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPreferences = useCallback(async () => {
    try {
      const data = await getNotificationSettings();
      if (data) setSettings(data);
    } catch { /* Fail silently */ }
  }, []);

  useEffect(() => {
    loadNotificationsList();
    loadPreferences();
  }, [loadNotificationsList, loadPreferences]);

  // Alert Auto-Clear
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => { setSuccess(''); setError(''); }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  // Individual Mark Read
  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      loadNotificationsList();
    } catch {
      setError('Failed to update notification status.');
    }
  };

  // Bulk Mark Read
  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setSuccess('All notifications marked as read.');
      loadNotificationsList();
    } catch {
      setError('Failed to update notification status.');
    }
  };

  // Delete Alert
  const handleDelete = async (id) => {
    try {
      await deleteNotification(id);
      loadNotificationsList();
    } catch {
      setError('Failed to delete notification.');
    }
  };

  // Save Preferences Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      setError(''); setSuccess('');
      await updateNotificationSettings(settings);
      setSuccess('Notification configuration saved successfully!');
    } catch {
      setError('Failed to update notifications configuration.');
    } finally {
      setSavingSettings(false);
    }
  };

  // Send Broadcast Notice
  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcast.title || !broadcast.message) {
      setError('Title and message are required.'); return;
    }
    try {
      setSendingBroadcast(true);
      setError(''); setSuccess('');
      await createSystemNotification(broadcast);
      setSuccess('System notification broadcasted successfully!');
      setBroadcast({ title: '', message: '', target_student_id: '' });
      loadNotificationsList();
    } catch {
      setError('Failed to dispatch system broadcast.');
    } finally {
      setSendingBroadcast(false);
    }
  };

  // Filter criteria helper
  const getFilteredNotifications = () => {
    return notifications.filter((notif) => {
      if (activeFilter === 'unread') return !notif.read;
      if (activeFilter === 'borrows') return notif.type?.includes('issue') || notif.type?.includes('return');
      if (activeFilter === 'fines') return notif.type?.includes('fine');
      if (activeFilter === 'reservations') return notif.type?.includes('reservation');
      if (activeFilter === 'system') return notif.type?.includes('system');
      return true;
    });
  };

  const getFilteredCount = (filterName) => {
    return notifications.filter((notif) => {
      if (filterName === 'unread') return !notif.read;
      if (filterName === 'borrows') return notif.type?.includes('issue') || notif.type?.includes('return');
      if (filterName === 'fines') return notif.type?.includes('fine');
      if (filterName === 'reservations') return notif.type?.includes('reservation');
      if (filterName === 'system') return notif.type?.includes('system');
      return true;
    }).length;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
             d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch { return dateStr; }
  };

  // Render Visual Accents based on types
  const getNotifVisuals = (type) => {
    const t = type || '';
    if (t.includes('issue')) return { icon: '📖', color: '#16a34a', bg: '#dcfce7', label: 'Issue' };
    if (t.includes('return')) return { icon: '↩️', color: '#2563eb', bg: '#dbeafe', label: 'Return' };
    if (t.includes('fine')) return { icon: '⚠️', color: '#dc2626', bg: '#fef2f2', label: 'Fine' };
    if (t.includes('reservation')) return { icon: '⏳', color: '#d4a017', bg: '#fffbeb', label: 'Reservation' };
    return { icon: '🔔', color: '#64748b', bg: '#f1f5f9', label: 'System' };
  };

  const filteredNotifs = getFilteredNotifications();
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="notifications-page">
      {/* Page Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem 0' }}>🔔 Notifications Center</h2>
          <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Manage alerts, alerts routing channels, and system notifications logs.</span>
        </div>
      </header>

      {/* Alert Feedbacks */}
      {success && <div className="sms-alert success" style={{ marginBottom: '1.25rem' }}>✅ {success}</div>}
      {error && <div className="sms-alert error" style={{ marginBottom: '1.25rem' }}>❌ {error}</div>}

      {/* Tabs Layout */}
      <div className="sms-tab-nav" style={{ marginBottom: '1.5rem' }}>
        <button className={`sms-tab-btn ${activeTab === 'inbox' ? 'active' : ''}`} onClick={() => setActiveTab('inbox')}>
          📥 Inbox ({unreadCount} New)
        </button>
        <button className={`sms-tab-btn ${activeTab === 'preferences' ? 'active' : ''}`} onClick={() => setActiveTab('preferences')}>
          ⚙️ Delivery Preferences
        </button>
        {isAdmin && (
          <button className={`sms-tab-btn ${activeTab === 'broadcast' ? 'active' : ''}`} onClick={() => setActiveTab('broadcast')}>
            📢 Dispatch Announcement
          </button>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: INBOX & LOG LIST
          ───────────────────────────────────────────────────────────── */}
      {activeTab === 'inbox' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Summary Cards Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
            <div style={{ background: '#fff', border: '1px solid rgba(226,211,179,0.55)', padding: '1.25rem 1.5rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Total Alerts</span>
              <h3 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '900', color: '#1e1b15' }}>{notifications.length}</h3>
            </div>
            <div style={{ background: '#fff', border: '1px solid rgba(226,211,179,0.55)', padding: '1.25rem 1.5rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.25rem', borderLeft: '4px solid #d4a017' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#b8860b', textTransform: 'uppercase' }}>Unread Alerts</span>
              <h3 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '900', color: '#b8860b' }}>{unreadCount}</h3>
            </div>
            <div style={{ background: '#fff', border: '1px solid rgba(226,211,179,0.55)', padding: '1.25rem 1.5rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#16a34a', textTransform: 'uppercase' }}>Borrow / Return</span>
              <h3 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '900', color: '#16a34a' }}>{getFilteredCount('borrows')}</h3>
            </div>
            <div style={{ background: '#fff', border: '1px solid rgba(226,211,179,0.55)', padding: '1.25rem 1.5rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#dc2626', textTransform: 'uppercase' }}>Fines Alert</span>
              <h3 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '900', color: '#dc2626' }}>{getFilteredCount('fines')}</h3>
            </div>
            <div style={{ background: '#fff', border: '1px solid rgba(226,211,179,0.55)', padding: '1.25rem 1.5rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#2563eb', textTransform: 'uppercase' }}>Reservations</span>
              <h3 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '900', color: '#2563eb' }}>{getFilteredCount('reservations')}</h3>
            </div>
          </div>

          <div className="notif-grid-layout" style={{ gap: '2rem' }}>
            {/* Left Sidebar Filter Cards */}
            <div className="notif-sidebar-card" style={{ padding: '1.5rem' }}>
              <h4 style={{ margin: '0 0 1.25rem 0', fontSize: '0.9rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '800' }}>Categories</h4>
              <nav className="notif-filter-menu" style={{ gap: '0.5rem' }}>
                <button className={`notif-filter-btn ${activeFilter === 'all' ? 'active' : ''}`} onClick={() => setActiveFilter('all')}>
                  <span>All Alerts</span>
                  <span className="notif-count-badge">{getFilteredCount('all')}</span>
                </button>
                <button className={`notif-filter-btn ${activeFilter === 'unread' ? 'active' : ''}`} onClick={() => setActiveFilter('unread')}>
                  <span>New / Unread</span>
                  <span className="notif-count-badge">{getFilteredCount('unread')}</span>
                </button>
                <button className={`notif-filter-btn ${activeFilter === 'borrows' ? 'active' : ''}`} onClick={() => setActiveFilter('borrows')}>
                  <span>Borrow & Returns</span>
                  <span className="notif-count-badge">{getFilteredCount('borrows')}</span>
                </button>
                <button className={`notif-filter-btn ${activeFilter === 'fines' ? 'active' : ''}`} onClick={() => setActiveFilter('fines')}>
                  <span>Fines Assessed</span>
                  <span className="notif-count-badge">{getFilteredCount('fines')}</span>
                </button>
                <button className={`notif-filter-btn ${activeFilter === 'reservations' ? 'active' : ''}`} onClick={() => setActiveFilter('reservations')}>
                  <span>Reservations</span>
                  <span className="notif-count-badge">{getFilteredCount('reservations')}</span>
                </button>
                <button className={`notif-filter-btn ${activeFilter === 'system' ? 'active' : ''}`} onClick={() => setActiveFilter('system')}>
                  <span>System Notices</span>
                  <span className="notif-count-badge">{getFilteredCount('system')}</span>
                </button>
              </nav>
            </div>

            {/* Right Main Lists */}
            <div className="notif-content-section" style={{ gap: '1.25rem' }}>
              <div className="notif-toolbar-card" style={{ padding: '1rem 1.5rem' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#475569' }}>
                  Showing {filteredNotifs.length} notifications
                </span>
                {unreadCount > 0 && (
                  <button className="btn-sms-primary btn-sms-sm" onClick={handleMarkAllRead}>
                    ✓ Mark All as Read
                  </button>
                )}
              </div>

              {loading ? (
                <div className="sms-loading" style={{ padding: '3rem' }}>
                  <div className="sms-spinner"></div>
                  <span style={{ color: '#64748b' }}>Refreshing inbox logs…</span>
                </div>
              ) : filteredNotifs.length === 0 ? (
                <div className="sms-empty-state" style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid rgba(226,211,179,0.55)', padding: '4rem 2rem', textAlign: 'center', boxShadow: '0 4px 12px rgba(20,18,15,0.03)' }}>
                  <div style={{ fontSize: '4.5rem', marginBottom: '1.5rem', lineHeight: 1 }}>🏛️</div>
                  <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: '800', color: '#1e1b15', fontSize: '1.25rem' }}>No Alerts Found</h3>
                  <p style={{ margin: 0, color: '#5c5549', fontSize: '0.9rem' }}>Your system transmissions log is clean!</p>
                </div>
              ) : (
                filteredNotifs.map((notif) => {
                  const visual = getNotifVisuals(notif.type);
                  return (
                    <div key={notif.id} className={`notif-alert-card ${!notif.read ? 'unread' : ''}`} style={{ padding: '1.5rem', borderRadius: '16px' }}>
                      <div className="notif-avatar-icon" style={{ width: '46px', height: '46px', fontSize: '1.4rem' }}>{visual.icon}</div>
                      <div className="notif-body-pane">
                        <div className="notif-card-header">
                          <h4 className="notif-card-title" style={{ fontSize: '1rem' }}>{notif.title}</h4>
                          <span className="notif-card-time">{formatDate(notif.created_at)}</span>
                        </div>
                        <p className="notif-card-msg" style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>{notif.message}</p>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="notif-tag-badge" style={{ backgroundColor: visual.bg, color: visual.color }}>
                            {visual.label}
                          </span>
                          
                          <div className="notif-card-actions">
                            {!notif.read && (
                              <button className="btn-notif-action" onClick={() => handleMarkRead(notif.id)}>
                                Mark Read
                              </button>
                            )}
                            <button className="btn-notif-action btn-notif-danger" onClick={() => handleDelete(notif.id)}>
                              <IconTrash />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: NOTIFICATIONS PREFERENCE CHANNELS
          ───────────────────────────────────────────────────────────── */}
      {activeTab === 'preferences' && (
        <div className="sms-section-card">
          <h3 className="email-section-title">⚙️ Alert Delivery Preferences</h3>
          <p className="email-section-subtitle">Manage delivery routes (Browser Popups, Outgoing Email reminders, or SMS text warning alerts).</p>
          
          <form onSubmit={handleSaveSettings}>
            <div className="notif-pref-list">
              <div className="notif-pref-item">
                <div className="notif-pref-info">
                  <h5>Desktop Web Notifications</h5>
                  <p>Display real-time notification alerts inside your web browser application dashboard.</p>
                </div>
                <label className="notif-toggle">
                  <input
                    type="checkbox"
                    checked={settings.browser_enabled}
                    onChange={e => setSettings(prev => ({ ...prev, browser_enabled: e.target.checked }))}
                  />
                  <span className="notif-slider"></span>
                </label>
              </div>

              <div className="notif-pref-item">
                <div className="notif-pref-info">
                  <h5>Email Notifications</h5>
                  <p>Deliver copies of alerts (due dates, fines, holds updates) straight to your mailbox.</p>
                </div>
                <label className="notif-toggle">
                  <input
                    type="checkbox"
                    checked={settings.email_enabled}
                    onChange={e => setSettings(prev => ({ ...prev, email_enabled: e.target.checked }))}
                  />
                  <span className="notif-slider"></span>
                </label>
              </div>

              <div className="notif-pref-item">
                <div className="notif-pref-info">
                  <h5>SMS Notifications</h5>
                  <p>Send text message alerts for urgent notices directly to your mobile phone number.</p>
                </div>
                <label className="notif-toggle">
                  <input
                    type="checkbox"
                    checked={settings.sms_enabled}
                    onChange={e => setSettings(prev => ({ ...prev, sms_enabled: e.target.checked }))}
                  />
                  <span className="notif-slider"></span>
                </label>
              </div>
            </div>

            <div style={{ marginTop: '1.75rem' }}>
              <button type="submit" className="btn-sms-primary" disabled={savingSettings}>
                {savingSettings ? '⏳ Saving preferences…' : '💾 Save Settings Preferences'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 3: DISPATCH BOARD (Admin Only)
          ───────────────────────────────────────────────────────────── */}
      {activeTab === 'broadcast' && isAdmin && (
        <div className="sms-section-card">
          <h3 className="email-section-title">📢 Broadcast System Announcement</h3>
          <p className="email-section-subtitle">Dispatch system notices to individual borrowers or publish notifications to all active members.</p>
          
          <form onSubmit={handleSendBroadcast}>
            <div className="sms-form-group">
              <label className="sms-form-label">Recipient Target ID (Optional)</label>
              <input
                type="text"
                className="sms-form-input"
                placeholder="Leave blank to broadcast to ALL student accounts"
                value={broadcast.target_student_id}
                onChange={e => setBroadcast(prev => ({ ...prev, target_student_id: e.target.value }))}
              />
            </div>

            <div className="sms-form-group">
              <label className="sms-form-label">Notice Title</label>
              <input
                type="text"
                className="sms-form-input"
                placeholder="e.g. Scheduled System Upgrades"
                value={broadcast.title}
                onChange={e => setBroadcast(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>

            <div className="sms-form-group">
              <label className="sms-form-label">Message Details</label>
              <textarea
                className="sms-form-textarea"
                placeholder="Details of the announcement notice…"
                value={broadcast.message}
                onChange={e => setBroadcast(prev => ({ ...prev, message: e.target.value }))}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button type="submit" className="btn-sms-primary" disabled={sendingBroadcast}>
                {sendingBroadcast ? '⏳ Dispatching announcement…' : '📢 Publish Notice'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Notifications;
