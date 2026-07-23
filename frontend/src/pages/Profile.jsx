import React, { useState, useEffect, useRef } from 'react';
import {
  getMyProfile,
  updateMyProfile,
  uploadAvatar,
  changePassword,
  getAdminPermissions,
  getAdminUsers,
  createAdminUser,
  updateUserRolePermissions,
  getAuditLogs
} from '../services/api';
import { Copy, Check } from 'lucide-react';
import './Students.css';
import './Dashboard.css';

// ─── Copyable Value Component with Tooltip & Toast ─────────────────
const CopyableValue = ({ value, displayValue, style }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e) => {
    e.stopPropagation();
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    // Outer: block-level flex row that fills full cell width
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', width: '100%', minWidth: 0 }}>
      {/* Text: flex:1 + min-width:0 ensures ellipsis fires against the cell boundary */}
      <span style={{
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        flex: 1,
        minWidth: 0,
        display: 'block',
        ...style
      }}>
        {displayValue || value}
      </span>
      {/* Copy button: always fixed, never pushes text */}
      <button
        onClick={handleCopy}
        title={copied ? "Copied!" : "Copy full value"}
        style={{
          background: 'none', border: 'none', padding: '1px 3px', cursor: 'pointer',
          color: copied ? '#16a34a' : '#9ca3af', display: 'inline-flex', alignItems: 'center',
          borderRadius: '4px', transition: 'all 0.2s ease', flexShrink: 0
        }}
      >
        {copied ? <Check size={13} color="#16a34a" /> : <Copy size={13} />}
      </button>
      {copied && (
        <span style={{
          fontSize: '0.68rem', fontWeight: '800', color: '#16a34a', background: '#dcfce7',
          padding: '0.05rem 0.35rem', borderRadius: '4px', whiteSpace: 'nowrap', flexShrink: 0
        }}>
          Copied
        </span>
      )}
    </div>
  );
};

// ─── Premium Hover Tooltip ──────────────────────────────────────────
const Tooltip = ({ text, children }) => {
  const [show, setShow] = useState(false);
  const triggerRef = useRef(null);

  return (
    <span
      ref={triggerRef}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      style={{ position: 'relative', display: 'inline-flex', minWidth: 0, maxWidth: '100%', alignItems: 'center' }}
    >
      {children}
      {show && text && (
        <span
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '8px',
            background: '#1e1b15',
            color: '#fff',
            padding: '0.35rem 0.75rem',
            borderRadius: '6px',
            fontSize: '0.78rem',
            fontWeight: '600',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
            border: '1px solid rgba(212,160,23,0.3)',
            zIndex: 9999,
            pointerEvents: 'none',
            maxWidth: 'none',
            width: 'max-content',
            textAlign: 'center',
            animation: 'fadeIn 0.15s ease'
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
};

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile'); // profile, password, activity, sessions, admin

  // Feedback messages
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Profile edit fields
  const [editing, setEditing] = useState(false);
  const [editFields, setEditFields] = useState({ full_name: '', phone: '', course: '', department: '', semester: 1 });

  // Avatar upload
  const fileInputRef = useRef(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Change password fields
  const [pwdFields, setPwdFields] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [pwdSubmitting, setPwdSubmitting] = useState(false);

  // Admin section states
  const [adminUsers, setAdminUsers] = useState([]);
  const [permissionsCatalog, setPermissionsCatalog] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [selectedUserForPerms, setSelectedUserForPerms] = useState(null);

  // New Employee Form
  const [newUser, setNewUser] = useState({
    username: '', email: '', full_name: '', password: '', role: 'librarian', permissions: []
  });

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getMyProfile();
      setProfile(data);
      setEditFields({
        full_name: data.full_name || '',
        phone: data.phone || '',
        course: data.student_details?.course || '',
        department: data.student_details?.department || '',
        semester: data.student_details?.semester || 1
      });

      if (data.role === 'admin') {
        loadAdminData();
      }
    } catch (err) {
      setError('Failed to load profile details.');
    } finally {
      setLoading(false);
    }
  };

  const loadAdminData = async () => {
    try {
      const [users, permsData, logsData] = await Promise.all([
        getAdminUsers(),
        getAdminPermissions(),
        getAuditLogs(1, 15)
      ]);
      setAdminUsers(users);
      setPermissionsCatalog(permsData.permissions || []);
      setAuditLogs(logsData.logs || []);
      setAuditTotalPages(logsData.total_pages || 1);
    } catch (e) {
      console.error('Failed to load admin management data', e);
    }
  };

  // ── Profile Updates ─────────────────────────────────────────
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      await updateMyProfile(editFields);
      setSuccess('Profile updated successfully!');
      setEditing(false);
      loadProfileData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update profile.');
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(''); setSuccess('');
    try {
      setUploadingAvatar(true);
      const res = await uploadAvatar(file);
      setProfile(prev => ({ ...prev, avatar: res.avatar }));
      setSuccess('Avatar updated successfully!');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload avatar.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ── Change Password ──────────────────────────────────────────
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');

    if (pwdFields.new_password !== pwdFields.confirm_password) {
      setError('New password and confirm password do not match.');
      return;
    }
    if (pwdFields.new_password.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    try {
      setPwdSubmitting(true);
      await changePassword({
        current_password: pwdFields.current_password,
        new_password: pwdFields.new_password
      });
      setSuccess('Password changed successfully!');
      setPwdFields({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to change password.');
    } finally {
      setPwdSubmitting(false);
    }
  };

  // ── Admin Employee & Permission Actions ──────────────────────
  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      await createAdminUser(newUser);
      setSuccess(`Employee ${newUser.username} created successfully!`);
      setShowAddUserModal(false);
      setNewUser({ username: '', email: '', full_name: '', password: '', role: 'librarian', permissions: [] });
      loadAdminData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create employee user.');
    }
  };

  const handleTogglePermForUser = (permCode) => {
    if (!selectedUserForPerms) return;
    const currentPerms = selectedUserForPerms.permissions || [];
    const updated = currentPerms.includes(permCode)
      ? currentPerms.filter(p => p !== permCode)
      : [...currentPerms, permCode];
    setSelectedUserForPerms({ ...selectedUserForPerms, permissions: updated });
  };

  const handleSaveUserRolePerms = async () => {
    if (!selectedUserForPerms) return;
    setError(''); setSuccess('');
    try {
      await updateUserRolePermissions(selectedUserForPerms.id, {
        role: selectedUserForPerms.role,
        permissions: selectedUserForPerms.permissions
      });
      setSuccess(`Permissions updated for ${selectedUserForPerms.username}!`);
      setSelectedUserForPerms(null);
      loadAdminData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update user permissions.');
    }
  };

  const handleAuditPageChange = async (newPage) => {
    try {
      const data = await getAuditLogs(newPage, 15);
      setAuditLogs(data.logs || []);
      setAuditPage(newPage);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner" />
        <span>Loading account profile...</span>
      </div>
    );
  }

  const isAdmin = profile?.role === 'admin';

  return (
    <div className="dashboard-wrapper" style={{ width: '100%', maxWidth: 'none', margin: '0', padding: '2rem 3rem' }}>
      {/* ── Header ── */}
      <header className="dashboard-header-bar" style={{ marginBottom: '1.5rem' }}>
        <div className="header-meta">
          <h2>Account Profile & Management</h2>
          <span className="header-role-badge">
            {profile.role ? profile.role.toUpperCase() : 'MEMBER'} ACCOUNT
          </span>
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

      {/* ── Avatar Banner Card ── */}
      <div style={{ background: '#ffffff', borderRadius: '16px', padding: '2rem', border: '1px solid rgba(226,211,179,0.55)', boxShadow: '0 8px 25px rgba(20,18,15,0.03)', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
        <div
          onClick={handleAvatarClick}
          title="Click to upload profile avatar"
          style={{
            width: '96px', height: '96px', borderRadius: '50%', cursor: 'pointer',
            background: profile.avatar ? `url(${profile.avatar}) center/cover` : 'linear-gradient(135deg, #D4A017, #b3861b)',
            color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2.5rem', fontWeight: 'bold', boxShadow: '0 8px 20px rgba(212,160,23,0.3)',
            position: 'relative', overflow: 'hidden', flexShrink: 0
          }}
        >
          {!profile.avatar && (profile.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U')}
          <div style={{
            position: 'absolute', bottom: 0, width: '100%', background: 'rgba(0,0,0,0.5)',
            color: '#fff', fontSize: '0.65rem', textAlign: 'center', padding: '4px 0', fontWeight: 'bold'
          }}>
            {uploadingAvatar ? '...' : 'Upload'}
          </div>
        </div>
        <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" style={{ display: 'none' }} />

        <div style={{ minWidth: 0, flex: 1, display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '800', color: '#1e1b15', wordBreak: 'break-word' }}>
            {profile.full_name}
          </h3>
          <span style={{
            background: 'rgba(212,160,23,0.12)', color: '#b3861b',
            padding: '0.35rem 0.95rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: '800', textTransform: 'uppercase', flexShrink: 0
          }}>
            {profile.role}
          </span>
        </div>
      </div>

      {/* ── Sub Navigation Tabs ── */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          ['profile', 'Details & Profile'],
          ['password', 'Security & Password'],
          ['activity', 'Activity History'],
          ['sessions', 'Active Sessions'],
          ...(isAdmin ? [['admin', 'Admin & Permissions']] : [])
        ].map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setError(''); setSuccess(''); }}
            style={{
              padding: '0.6rem 1.25rem', borderRadius: '10px', border: 'none',
              background: activeTab === tab ? '#D4A017' : '#f1f5f9',
              color: activeTab === tab ? '#ffffff' : '#5c5549',
              fontWeight: '700', fontSize: '0.875rem', cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════
          TAB 1: PROFILE DETAILS
      ════════════════════════════════════════ */}
      {activeTab === 'profile' && (
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '2rem', border: '1px solid rgba(226,211,179,0.55)', boxShadow: '0 6px 20px rgba(20,18,15,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h4 style={{ margin: 0, fontWeight: '800', color: '#1e1b15' }}>Personal Details</h4>
            <button
              onClick={() => setEditing(!editing)}
              style={{ padding: '0.5rem 1.1rem', border: '1.5px solid #D4A017', borderRadius: '8px', background: editing ? 'rgba(212,160,23,0.1)' : '#fff', color: '#b3861b', fontWeight: '700', cursor: 'pointer' }}
            >
              {editing ? 'Cancel' : 'Edit Info'}
            </button>
          </div>

          {editing ? (
            <form onSubmit={handleProfileSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#5c5549', marginBottom: '0.35rem' }}>FULL NAME</label>
                  <input type="text" required value={editFields.full_name} onChange={e => setEditFields({ ...editFields, full_name: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1.5px solid rgba(212,160,23,0.3)', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#5c5549', marginBottom: '0.35rem' }}>PHONE NUMBER</label>
                  <input type="text" value={editFields.phone} onChange={e => setEditFields({ ...editFields, phone: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1.5px solid rgba(212,160,23,0.3)', outline: 'none' }} />
                </div>
                {profile.role !== 'admin' && (
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#5c5549', marginBottom: '0.35rem' }}>COURSE</label>
                      <input type="text" value={editFields.course} onChange={e => setEditFields({ ...editFields, course: e.target.value })}
                        style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1.5px solid rgba(212,160,23,0.3)', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#5c5549', marginBottom: '0.35rem' }}>DEPARTMENT</label>
                      <input type="text" value={editFields.department} onChange={e => setEditFields({ ...editFields, department: e.target.value })}
                        style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1.5px solid rgba(212,160,23,0.3)', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#5c5549', marginBottom: '0.35rem' }}>SEMESTER</label>
                      <input type="number" min="1" max="12" value={editFields.semester} onChange={e => setEditFields({ ...editFields, semester: parseInt(e.target.value) || 1 })}
                        style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1.5px solid rgba(212,160,23,0.3)', outline: 'none' }} />
                    </div>
                  </>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" style={{ padding: '0.7rem 1.75rem', background: '#D4A017', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>
                  Save Changes
                </button>
              </div>
            </form>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem', width: '100%' }}>
              <div style={{ minWidth: 0, padding: '0.85rem 1rem', background: '#fdfcf9', borderRadius: '12px', border: '1px solid rgba(226,211,179,0.4)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <span style={{ fontSize: '0.75rem', color: '#8c8275', fontWeight: '800', letterSpacing: '0.04em' }}>USERNAME / ID</span>
                <div style={{ marginTop: '0.3rem', width: '100%', minWidth: 0, display: 'flex' }}>
                  <CopyableValue
                    value={profile.username}
                    style={{ fontSize: '0.95rem', fontWeight: '700', color: '#1e1b15' }}
                  />
                </div>
              </div>

              <div style={{ minWidth: 0, padding: '0.85rem 1rem', background: '#fdfcf9', borderRadius: '12px', border: '1px solid rgba(226,211,179,0.4)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <span style={{ fontSize: '0.75rem', color: '#8c8275', fontWeight: '800', letterSpacing: '0.04em' }}>EMAIL ADDRESS</span>
                <div style={{ marginTop: '0.3rem', width: '100%', minWidth: 0, display: 'flex' }}>
                  <CopyableValue
                    value={profile.email}
                    style={{ fontSize: '0.95rem', fontWeight: '700', color: '#1e1b15' }}
                  />
                </div>
              </div>

              <div style={{ minWidth: 0, padding: '0.85rem 1rem', background: '#fdfcf9', borderRadius: '12px', border: '1px solid rgba(226,211,179,0.4)', display: 'flex', flexDirection: 'column', textAlign: 'center', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: '#8c8275', fontWeight: '800', letterSpacing: '0.04em' }}>PHONE NUMBER</span>
                <Tooltip text={profile.phone || 'N/A'}>
                  <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#1e1b15', marginTop: '0.3rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                    {profile.phone || 'N/A'}
                  </div>
                </Tooltip>
              </div>

              {profile.student_details && (
                <>
                  <div style={{ minWidth: 0, padding: '0.85rem 1rem', background: '#fdfcf9', borderRadius: '12px', border: '1px solid rgba(226,211,179,0.4)', display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.75rem', color: '#8c8275', fontWeight: '800', letterSpacing: '0.04em' }}>COURSE</span>
                    <Tooltip text={profile.student_details.course || 'N/A'}>
                      <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#1e1b15', marginTop: '0.3rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                        {profile.student_details.course || 'N/A'}
                      </div>
                    </Tooltip>
                  </div>

                  <div style={{ minWidth: 0, padding: '0.85rem 1rem', background: '#fdfcf9', borderRadius: '12px', border: '1px solid rgba(226,211,179,0.4)', display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.75rem', color: '#8c8275', fontWeight: '800', letterSpacing: '0.04em' }}>DEPARTMENT</span>
                    <Tooltip text={profile.student_details.department || 'N/A'}>
                      <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#1e1b15', marginTop: '0.3rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                        {profile.student_details.department || 'N/A'}
                      </div>
                    </Tooltip>
                  </div>

                  <div style={{ minWidth: 0, padding: '0.85rem 1rem', background: '#fdfcf9', borderRadius: '12px', border: '1px solid rgba(226,211,179,0.4)', display: 'flex', flexDirection: 'column', textAlign: 'center', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: '#8c8275', fontWeight: '800', letterSpacing: '0.04em' }}>SEMESTER</span>
                    <Tooltip text={String(profile.student_details.semester || 1)}>
                      <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#1e1b15', marginTop: '0.3rem' }}>
                        {profile.student_details.semester || 1}
                      </div>
                    </Tooltip>
                  </div>

                  <div style={{ minWidth: 0, padding: '0.85rem 1rem', background: '#fdfcf9', borderRadius: '12px', border: '1px solid rgba(226,211,179,0.4)', display: 'flex', flexDirection: 'column', textAlign: 'center', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: '#8c8275', fontWeight: '800', letterSpacing: '0.04em' }}>CURRENT BORROWS</span>
                    <Tooltip text={`${profile.student_details.books_borrowed} Books`}>
                      <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#D4A017', marginTop: '0.3rem' }}>
                        {profile.student_details.books_borrowed} Books
                      </div>
                    </Tooltip>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════
          TAB 2: CHANGE PASSWORD
      ════════════════════════════════════════ */}
      {activeTab === 'password' && (
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '2rem', border: '1px solid rgba(226,211,179,0.55)', boxShadow: '0 6px 20px rgba(20,18,15,0.03)', maxWidth: '600px' }}>
          <h4 style={{ margin: '0 0 1.5rem 0', fontWeight: '800', color: '#1e1b15' }}>Change Account Password</h4>
          <form onSubmit={handlePasswordSubmit}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#5c5549', marginBottom: '0.35rem' }}>CURRENT PASSWORD</label>
              <input type="password" required value={pwdFields.current_password} onChange={e => setPwdFields({ ...pwdFields, current_password: e.target.value })}
                style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: '8px', border: '1.5px solid rgba(212,160,23,0.3)', outline: 'none' }} />
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#5c5549', marginBottom: '0.35rem' }}>NEW PASSWORD</label>
              <input type="password" required value={pwdFields.new_password} onChange={e => setPwdFields({ ...pwdFields, new_password: e.target.value })}
                style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: '8px', border: '1.5px solid rgba(212,160,23,0.3)', outline: 'none' }} />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#5c5549', marginBottom: '0.35rem' }}>CONFIRM NEW PASSWORD</label>
              <input type="password" required value={pwdFields.confirm_password} onChange={e => setPwdFields({ ...pwdFields, confirm_password: e.target.value })}
                style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: '8px', border: '1.5px solid rgba(212,160,23,0.3)', outline: 'none' }} />
            </div>
            <button type="submit" disabled={pwdSubmitting} style={{ padding: '0.75rem 1.75rem', background: '#D4A017', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>
              {pwdSubmitting ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      )}

      {/* ════════════════════════════════════════
          TAB 3: ACTIVITY HISTORY
      ════════════════════════════════════════ */}
      {activeTab === 'activity' && (
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '2rem', border: '1px solid rgba(226,211,179,0.55)', boxShadow: '0 6px 20px rgba(20,18,15,0.03)' }}>
          <h4 style={{ margin: '0 0 1.5rem 0', fontWeight: '800', color: '#1e1b15' }}>Account Activity Log</h4>
          {(!profile.activities || profile.activities.length === 0) ? (
            <p style={{ color: '#5c5549' }}>No activity logged yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {profile.activities.map((act, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: act.type === 'borrow' ? '#3b82f6' : '#16a34a' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1e1b15' }}>{act.action}</div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{act.timestamp ? new Date(act.timestamp).toLocaleString() : 'Recent'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════
          TAB 4: ACTIVE SESSIONS
      ════════════════════════════════════════ */}
      {activeTab === 'sessions' && (
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '2rem', border: '1px solid rgba(226,211,179,0.55)', boxShadow: '0 6px 20px rgba(20,18,15,0.03)' }}>
          <h4 style={{ margin: '0 0 1.5rem 0', fontWeight: '800', color: '#1e1b15' }}>Active Sessions & Devices</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {profile.sessions.map((sess) => (
              <div key={sess.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1.5px solid rgba(212,160,23,0.3)', borderRadius: '12px', background: '#fdfcf9' }}>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#1e1b15' }}>{sess.device}</div>
                  <div style={{ fontSize: '0.8rem', color: '#5c5549' }}>IP: {sess.ip} • Last active: {sess.last_active}</div>
                </div>
                <span style={{ background: '#dcfce7', color: '#166534', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '800' }}>
                  {sess.is_current ? 'Current Session' : 'Active'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          TAB 5: ADMIN & PERMISSIONS (Admin only)
      ════════════════════════════════════════ */}
      {activeTab === 'admin' && isAdmin && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Employee User List */}
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '2rem', border: '1px solid rgba(226,211,179,0.55)', boxShadow: '0 6px 20px rgba(20,18,15,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h4 style={{ margin: 0, fontWeight: '800', color: '#1e1b15' }}>System Users & Employee Roles</h4>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: '#5c5549' }}>Manage staff access, RBAC roles, and custom granular permissions</p>
              </div>
              <button
                onClick={() => setShowAddUserModal(true)}
                style={{ padding: '0.6rem 1.2rem', background: '#D4A017', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
              >
                + Add New Employee
              </button>
            </div>

            <div className="table-responsive">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>User / Employee</th>
                    <th>Role</th>
                    <th>Permissions Granted</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {adminUsers.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ fontWeight: '700' }}>{u.full_name || u.username}</div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{u.email}</div>
                      </td>
                      <td>
                        <span className="table-badge" style={{ background: 'rgba(212,160,23,0.15)', color: '#b3861b' }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#5c5549', maxWidth: '300px' }}>
                        {(u.permissions || []).slice(0, 4).join(', ')}
                        {(u.permissions || []).length > 4 && ` +${(u.permissions || []).length - 4} more`}
                      </td>
                      <td>
                        <span className="table-badge" style={{ background: u.is_active ? '#dcfce7' : '#fee2e2', color: u.is_active ? '#166534' : '#b91c1c' }}>
                          {u.is_active ? 'Active' : 'Locked'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => setSelectedUserForPerms(u)}
                          style={{ padding: '0.35rem 0.85rem', background: 'rgba(37,99,235,0.08)', color: '#2563eb', border: '1px solid rgba(37,99,235,0.2)', borderRadius: '6px', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}
                        >
                          Edit Role / Perms
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit Logs */}
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '2rem', border: '1px solid rgba(226,211,179,0.55)', boxShadow: '0 6px 20px rgba(20,18,15,0.03)' }}>
            <h4 style={{ margin: '0 0 1.25rem 0', fontWeight: '800', color: '#1e1b15' }}>System Audit Logs</h4>
            <div className="table-responsive">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Resource</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.length === 0 ? (
                    <tr><td colSpan="5" style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>No audit logs recorded yet.</td></tr>
                  ) : (
                    auditLogs.map(log => (
                      <tr key={log.id}>
                        <td style={{ fontSize: '0.8rem', color: '#5c5549' }}>{new Date(log.timestamp).toLocaleString()}</td>
                        <td style={{ fontWeight: '700' }}>{log.username} <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>({log.role})</span></td>
                        <td><span style={{ fontWeight: '700', color: '#D4A017' }}>{log.action}</span></td>
                        <td style={{ fontSize: '0.85rem' }}>{log.resource}</td>
                        <td style={{ fontSize: '0.82rem', color: '#5c5549' }}>{log.details}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {auditTotalPages > 1 && (
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1.25rem' }}>
                <button disabled={auditPage === 1} onClick={() => handleAuditPageChange(auditPage - 1)} style={{ padding: '0.35rem 0.8rem', borderRadius: '6px', border: '1px solid #d1d5db' }}>Prev</button>
                <span style={{ fontSize: '0.85rem', fontWeight: '700', alignSelf: 'center' }}>Page {auditPage} of {auditTotalPages}</span>
                <button disabled={auditPage === auditTotalPages} onClick={() => handleAuditPageChange(auditPage + 1)} style={{ padding: '0.35rem 0.8rem', borderRadius: '6px', border: '1px solid #d1d5db' }}>Next</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal: Add Employee ── */}
      {showAddUserModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '2rem', width: '90%', maxWidth: '500px', border: '1px solid #D4A017' }}>
            <h3 style={{ margin: '0 0 1.25rem 0', color: '#1e1b15' }}>Create Employee / Staff User</h3>
            <form onSubmit={handleCreateEmployee}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                <input required placeholder="Username (e.g. lib_staff1)" value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} style={{ padding: '0.65rem', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                <input required type="email" placeholder="Email Address" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} style={{ padding: '0.65rem', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                <input required placeholder="Full Name" value={newUser.full_name} onChange={e => setNewUser({ ...newUser, full_name: e.target.value })} style={{ padding: '0.65rem', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                <input required type="password" placeholder="Initial Password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} style={{ padding: '0.65rem', borderRadius: '8px', border: '1px solid #d1d5db' }} />
                <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} style={{ padding: '0.65rem', borderRadius: '8px', border: '1px solid #d1d5db' }}>
                  <option value="librarian">Librarian</option>
                  <option value="staff">Staff Assistant</option>
                  <option value="admin">System Admin</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setShowAddUserModal(false)} style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: '1px solid #d1d5db', background: '#fff' }}>Cancel</button>
                <button type="submit" style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: 'none', background: '#D4A017', color: '#fff', fontWeight: '700' }}>Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Role & Permission Assignment ── */}
      {selectedUserForPerms && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '2rem', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid #D4A017' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#1e1b15' }}>Assign Permissions — {selectedUserForPerms.username}</h3>
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.85rem', color: '#5c5549' }}>Configure RBAC role and custom granular capabilities</p>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.35rem' }}>ASSIGNED ROLE</label>
              <select
                value={selectedUserForPerms.role}
                onChange={e => setSelectedUserForPerms({ ...selectedUserForPerms, role: e.target.value })}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
              >
                <option value="admin">Admin (Full Access)</option>
                <option value="librarian">Librarian</option>
                <option value="staff">Staff Assistant</option>
                <option value="member">Student / Member</option>
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.5rem' }}>GRANULAR PERMISSIONS</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {permissionsCatalog.map(p => {
                  const isChecked = (selectedUserForPerms.permissions || []).includes(p.code);
                  return (
                    <label key={p.code} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleTogglePermForUser(p.code)}
                      />
                      <span>{p.name} <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>({p.code})</span></span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" onClick={() => setSelectedUserForPerms(null)} style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: '1px solid #d1d5db', background: '#fff' }}>Cancel</button>
              <button type="button" onClick={handleSaveUserRolePerms} style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: 'none', background: '#D4A017', color: '#fff', fontWeight: '700' }}>Save Permissions</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
