import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  Users, Pencil, X, CheckCircle2, AlertCircle,
  Palette, KeyRound, ChevronDown, ChevronUp, Mail,
  PauseCircle, PlayCircle, Send, ShieldCheck
} from 'lucide-react';

const THEME_PRESETS = [
  { label: 'Forest', primary: '#2D6A4F', bg: '#F7F5F0', accent: '#F4A261', sidebar: '#FFFFFF' },
  { label: 'Ocean',  primary: '#0077B6', bg: '#F0F7FF', accent: '#F4A261', sidebar: '#FFFFFF' },
  { label: 'Berry',  primary: '#7B2D8B', bg: '#FDF5FF', accent: '#F4A261', sidebar: '#FFFFFF' },
  { label: 'Slate',  primary: '#334155', bg: '#F1F5F9', accent: '#F59E0B', sidebar: '#FFFFFF' },
  { label: 'Rose',   primary: '#BE185D', bg: '#FFF1F5', accent: '#F4A261', sidebar: '#FFFFFF' },
  { label: 'Dark',   primary: '#52B788', bg: '#1A1A18', accent: '#F4A261', sidebar: '#242422' },
];

export default function AdminSettings() {
  const { user, preferences, savePreferences } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [editingUser, setEditingUser] = useState(null);

  // Accordion sections
  const [showUsers, setShowUsers] = useState(true);
  const [showAccount, setShowAccount] = useState(false);
  const [showAppearance, setShowAppearance] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Admin account form
  const [accountForm, setAccountForm] = useState({ email: '', username: '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [localPrefs, setLocalPrefs] = useState(preferences || {});

  useEffect(() => { loadUsers(); loadAdminInfo(); }, []);
  useEffect(() => { setLocalPrefs(preferences || {}); }, [preferences]);

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await api.get('/auth/users');
      setUsers(res.data.filter(u => u.role !== 'admin'));
    } finally {
      setLoading(false);
    }
  }

  async function loadAdminInfo() {
    const res = await api.get('/auth/users');
    const me = res.data.find(u => u.role === 'admin');
    if (me) setAccountForm({ email: me.email || '', username: me.username || '' });
  }

  function showToast(msg, type = 'success') { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); }

  async function handleSuspendToggle(u) {
    const newStatus = u.status === 'approved' ? 'suspended' : 'approved';
    await api.put(`/auth/users/${u.id}/status`, { status: newStatus });
    loadUsers();
    showToast(`${u.username} ${newStatus === 'suspended' ? 'suspended' : 'reactivated'}`);
  }

  async function handleSendReset(u) {
    if (!u.email) { showToast('This user has no email address set', 'error'); return; }
    await api.post('/auth/admin-reset', { userId: u.id });
    showToast(`Password reset email sent to ${u.email}`);
  }

  async function handleSaveUser(updated) {
    await api.put(`/auth/users/${updated.id}`, { username: updated.username, email: updated.email });
    setEditingUser(null);
    loadUsers();
    showToast('User updated');
  }

  async function handleSaveAccount(e) {
    e.preventDefault();
    await api.put(`/auth/users/${user.id}`, { username: accountForm.username, email: accountForm.email });
    showToast('Account details saved');
  }

  async function handleChangePw(e) {
    e.preventDefault();
    setPwError('');
    if (pwForm.newPassword !== pwForm.confirm) { setPwError('Passwords do not match'); return; }
    if (pwForm.newPassword.length < 6) { setPwError('Password must be at least 6 characters'); return; }
    try {
      await api.put('/auth/change-password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
      setShowPassword(false);
      showToast('Password changed!');
    } catch (err) {
      setPwError(err.response?.data?.error || 'Failed to change password');
    }
  }

  async function handleSavePrefs() {
    await savePreferences(localPrefs);
    showToast('Appearance saved!');
    setShowAppearance(false);
  }

  const statusBadge = (status) => {
    const map = {
      approved:  { bg: '#D1FAE5', color: '#065F46', label: 'Active' },
      suspended: { bg: '#FEE2E2', color: '#991B1B', label: 'Suspended' },
      pending:   { bg: '#FEF3C7', color: '#92400E', label: 'Pending' },
      rejected:  { bg: '#F3F4F6', color: '#6B7280', label: 'Rejected' },
    };
    const s = map[status] || map.pending;
    return (
      <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color }}>
        {s.label}
      </span>
    );
  };

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage users, your account & appearance</p>
        </div>
      </div>

      {/* ── User Management ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setShowUsers(!showUsers)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Users size={18} color="var(--primary)" />
            <h2 style={{ fontSize: 18 }}>User Management</h2>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{users.length} families</span>
          </div>
          {showUsers ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>

        {showUsers && (
          <div style={{ marginTop: 20 }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 24 }}><div className="spinner" /></div>
            ) : users.length === 0 ? (
              <div style={{ color: 'var(--text-3)', textAlign: 'center', padding: 20 }}>No family accounts yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {users.map(u => (
                  <div key={u.id} style={{ padding: '14px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    {editingUser?.id === u.id ? (
                      <EditUserForm user={editingUser} onChange={setEditingUser} onSave={handleSaveUser} onCancel={() => setEditingUser(null)} />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--primary-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--primary)', flexShrink: 0 }}>
                          {u.username[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 600, fontSize: 14 }}>{u.username}</span>
                            {statusBadge(u.status)}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                            {u.email ? `📧 ${u.email}` : <span style={{ color: 'var(--accent)' }}>⚠ No email set</span>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <button className="btn btn-ghost btn-sm" title="Edit user" onClick={() => setEditingUser({ ...u })}>
                            <Pencil size={13} /> Edit
                          </button>
                          <button className="btn btn-ghost btn-sm" title="Send password reset" onClick={() => handleSendReset(u)}
                            style={{ color: '#0077B6' }}>
                            <Send size={13} /> Reset PW
                          </button>
                          <button className="btn btn-ghost btn-sm" onClick={() => handleSuspendToggle(u)}
                            style={{ color: u.status === 'approved' ? 'var(--danger)' : 'var(--primary)' }}>
                            {u.status === 'approved'
                              ? <><PauseCircle size={13} /> Suspend</>
                              : <><PlayCircle size={13} /> Reactivate</>}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── My Account ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setShowAccount(!showAccount)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldCheck size={18} color="var(--primary)" />
            <h2 style={{ fontSize: 18 }}>My Account</h2>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Email & username</span>
          </div>
          {showAccount ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
        {showAccount && (
          <form onSubmit={handleSaveAccount} style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 400 }}>
            <div className="input-group">
              <label>Username</label>
              <input className="input" value={accountForm.username} onChange={e => setAccountForm({ ...accountForm, username: e.target.value })} required />
            </div>
            <div className="input-group">
              <label>Email Address <span style={{ fontWeight: 400, color: 'var(--text-3)', fontSize: 12 }}>(for notifications)</span></label>
              <input className="input" type="email" value={accountForm.email} onChange={e => setAccountForm({ ...accountForm, email: e.target.value })} placeholder="you@example.com" />
            </div>
            <div>
              <button type="submit" className="btn btn-primary">Save Account Details</button>
            </div>
          </form>
        )}
      </div>

      {/* ── Appearance ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setShowAppearance(!showAppearance)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Palette size={18} color="var(--primary)" />
            <h2 style={{ fontSize: 18 }}>Appearance</h2>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Colours & theme</span>
          </div>
          {showAppearance ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
        {showAppearance && (
          <div style={{ marginTop: 20 }}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 10 }}>Quick Themes</label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {THEME_PRESETS.map(p => (
                  <button key={p.label} type="button"
                    onClick={() => setLocalPrefs({ ...localPrefs, theme_color: p.primary, bg_color: p.bg, accent_color: p.accent, sidebar_color: p.sidebar })}
                    style={{ padding: '8px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: p.primary, color: '#fff', border: 'none', fontWeight: 600, outline: localPrefs.theme_color === p.primary ? '3px solid var(--text)' : 'none' }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 20 }}>
              {[
                { key: 'theme_color', label: 'Primary Colour' },
                { key: 'bg_color', label: 'Background' },
                { key: 'accent_color', label: 'Accent Colour' },
                { key: 'sidebar_color', label: 'Sidebar Colour' },
              ].map(({ key, label }) => (
                <div key={key} className="input-group">
                  <label style={{ fontSize: 12 }}>{label}</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input type="color" value={localPrefs[key] || '#000000'}
                      onChange={e => setLocalPrefs({ ...localPrefs, [key]: e.target.value })}
                      style={{ width: 44, height: 36, border: 'none', borderRadius: 6, cursor: 'pointer', padding: 2 }} />
                    <input className="input" value={localPrefs[key] || ''}
                      onChange={e => setLocalPrefs({ ...localPrefs, [key]: e.target.value })}
                      style={{ flex: 1, fontFamily: 'monospace', fontSize: 13 }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" onClick={handleSavePrefs}>Save Appearance</button>
              <button className="btn btn-ghost" onClick={() => { setLocalPrefs(preferences); setShowAppearance(false); }}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Change Password ── */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setShowPassword(!showPassword)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <KeyRound size={18} color="var(--primary)" />
            <h2 style={{ fontSize: 18 }}>Change Password</h2>
          </div>
          {showPassword ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
        {showPassword && (
          <form onSubmit={handleChangePw} style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 360 }}>
            {pwError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(231,111,81,0.1)', border: '1px solid rgba(231,111,81,0.3)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontSize: 14 }}>
                <AlertCircle size={15} />{pwError}
              </div>
            )}
            <div className="input-group">
              <label>Current Password</label>
              <input className="input" type="password" value={pwForm.currentPassword} onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })} required />
            </div>
            <div className="input-group">
              <label>New Password</label>
              <input className="input" type="password" value={pwForm.newPassword} onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })} required minLength={6} />
            </div>
            <div className="input-group">
              <label>Confirm New Password</label>
              <input className="input" type="password" value={pwForm.confirm} onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })} required />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn btn-primary">Change Password</button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowPassword(false)}>Cancel</button>
            </div>
          </form>
        )}
      </div>

      {toast && (
        <div className="toast" style={{ background: toast.type === 'error' ? 'var(--danger)' : undefined }}>
          {toast.type === 'error' ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function EditUserForm({ user, onChange, onSave, onCancel }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
      <div className="input-group" style={{ flex: 1, minWidth: 140 }}>
        <label style={{ fontSize: 11 }}>Username</label>
        <input className="input" value={user.username} onChange={e => onChange({ ...user, username: e.target.value })} />
      </div>
      <div className="input-group" style={{ flex: 2, minWidth: 200 }}>
        <label style={{ fontSize: 11 }}>Email</label>
        <input className="input" type="email" value={user.email || ''} onChange={e => onChange({ ...user, email: e.target.value })} placeholder="user@example.com" />
      </div>
      <div style={{ display: 'flex', gap: 6, paddingBottom: 2 }}>
        <button className="btn btn-primary btn-sm" onClick={() => onSave(user)}>
          <CheckCircle2 size={13} /> Save
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>
          <X size={13} /> Cancel
        </button>
      </div>
    </div>
  );
}
