import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, X, ShieldCheck, User, Palette, KeyRound, ChevronDown, ChevronUp, CheckCircle2, XCircle, Bell, Copy, Check } from 'lucide-react';

const AVATAR_COLORS = ['#2D6A4F','#52B788','#6C63FF','#F4A261','#E76F51','#264653','#E9C46A','#219EBC','#8338EC','#FB8500'];
const YEAR_LEVELS = ['Kindergarten','1','2','3','4','5','6','7','8','9','10','11','12'];
const THEME_PRESETS = [
  { label: 'Forest', primary: '#2D6A4F', bg: '#F7F5F0', accent: '#F4A261', sidebar: '#FFFFFF' },
  { label: 'Ocean',  primary: '#0077B6', bg: '#F0F7FF', accent: '#F4A261', sidebar: '#FFFFFF' },
  { label: 'Berry',  primary: '#7B2D8B', bg: '#FDF5FF', accent: '#F4A261', sidebar: '#FFFFFF' },
  { label: 'Slate',  primary: '#334155', bg: '#F1F5F9', accent: '#F59E0B', sidebar: '#FFFFFF' },
  { label: 'Rose',   primary: '#BE185D', bg: '#FFF1F5', accent: '#F4A261', sidebar: '#FFFFFF' },
  { label: 'Dark',   primary: '#52B788', bg: '#1A1A18', accent: '#F4A261', sidebar: '#242422' },
];

export default function Admin() {
  const { user, isAdmin, preferences, savePreferences } = useAuth();
  const [children, setChildren] = useState([]);
  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [resetTokens, setResetTokens] = useState([]);
  const [showChildModal, setShowChildModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editChild, setEditChild] = useState(null);
  const [toast, setToast] = useState(null);
  const [showPrefs, setShowPrefs] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [localPrefs, setLocalPrefs] = useState(preferences);
  const [copiedToken, setCopiedToken] = useState(null);

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { setLocalPrefs(preferences); }, [preferences]);

  async function loadAll() {
    const promises = [api.get('/children')];
    if (isAdmin) {
      promises.push(api.get('/auth/users'));
      promises.push(api.get('/auth/reset-tokens'));
    }
    const [childRes, userRes, tokenRes] = await Promise.all(promises);
    setChildren(childRes.data);
    if (userRes) {
      const allUsers = userRes.data;
      setPendingUsers(allUsers.filter(u => u.status === 'pending'));
      setUsers(allUsers.filter(u => u.status !== 'pending'));
    }
    if (tokenRes) setResetTokens(tokenRes.data);
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 3000); }

  async function approveUser(id) {
    await api.put(`/auth/users/${id}/approve`);
    loadAll();
    showToast('Account approved!');
  }

  async function rejectUser(id) {
    if (!confirm('Reject this account request?')) return;
    await api.put(`/auth/users/${id}/reject`);
    loadAll();
    showToast('Account rejected');
  }

  async function deleteChild(id) {
    if (!confirm('Delete this child and ALL their data? This cannot be undone.')) return;
    await api.delete(`/children/${id}`);
    loadAll();
    showToast('Child deleted');
  }

  async function deleteUser(id) {
    if (!confirm('Delete this user? Their children and data will also be deleted.')) return;
    await api.delete(`/auth/users/${id}`);
    loadAll();
    showToast('User deleted');
  }

  async function handleSavePrefs() {
    await savePreferences(localPrefs);
    showToast('Appearance saved!');
    setShowPrefs(false);
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwError('');
    if (pwForm.newPassword !== pwForm.confirm) { setPwError('New passwords do not match'); return; }
    if (pwForm.newPassword.length < 6) { setPwError('Password must be at least 6 characters'); return; }
    try {
      await api.put('/auth/change-password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
      setShowChangePassword(false);
      showToast('Password changed successfully!');
    } catch (err) {
      setPwError(err.response?.data?.error || 'Failed to change password');
    }
  }

  function copyToken(token) {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  const childrenByUser = isAdmin
    ? users.reduce((acc, u) => { acc[u.id] = { user: u, children: children.filter(c => c.user_id === u.id) }; return acc; }, {})
    : null;
  const myChildren = !isAdmin ? children : [];

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin</h1>
          <p className="page-subtitle">{isAdmin ? 'Manage families, users & appearance' : 'Manage your children & appearance'}</p>
        </div>
      </div>

      {/* ── Pending Approvals (admin only) ── */}
      {isAdmin && pendingUsers.length > 0 && (
        <div className="card" style={{ marginBottom: 24, border: '2px solid var(--accent)', background: 'var(--accent-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Bell size={18} color="var(--accent)" />
            <h2 style={{ fontSize: 18 }}>Pending Approvals</h2>
            <span style={{ marginLeft: 'auto', background: 'var(--accent)', color: 'white', borderRadius: 99, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
              {pendingUsers.length}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pendingUsers.map(u => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={18} color="#6C63FF" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{u.username}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Requested {new Date(u.created_at).toLocaleDateString()}</div>
                </div>
                <button className="btn btn-sm" onClick={() => approveUser(u.id)}
                  style={{ background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={14} /> Approve
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => rejectUser(u.id)} style={{ color: 'var(--danger)' }}>
                  <XCircle size={14} /> Reject
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Password Reset Tokens (admin only) ── */}
      {isAdmin && resetTokens.length > 0 && (
        <div className="card" style={{ marginBottom: 24, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <KeyRound size={18} color="var(--primary)" />
            <h2 style={{ fontSize: 18 }}>Password Reset Requests</h2>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 12 }}>
            Share the token below with the user — they can enter it on the Reset Password page.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {resetTokens.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>{t.username}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-2)', wordBreak: 'break-all' }}>{t.reset_token}</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => copyToken(t.reset_token)} style={{ flexShrink: 0 }}>
                  {copiedToken === t.reset_token ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Appearance ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setShowPrefs(!showPrefs)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Palette size={18} color="var(--primary)" />
            <h2 style={{ fontSize: 18 }}>Appearance</h2>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Personalise your colours</span>
          </div>
          {showPrefs ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
        {showPrefs && (
          <div style={{ marginTop: 20 }}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 10 }}>Quick Themes</label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {THEME_PRESETS.map(preset => (
                  <button key={preset.label} onClick={() => setLocalPrefs({ ...localPrefs, theme_color: preset.primary, bg_color: preset.bg, accent_color: preset.accent, sidebar_color: preset.sidebar })}
                    style={{ padding: '8px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: preset.primary, color: '#fff', border: '2px solid transparent', fontWeight: 600, outline: localPrefs.theme_color === preset.primary ? '2px solid var(--text)' : 'none' }}>
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 20 }}>
              {[{ key: 'theme_color', label: 'Primary Colour' }, { key: 'bg_color', label: 'Background Colour' }, { key: 'accent_color', label: 'Accent Colour' }, { key: 'sidebar_color', label: 'Sidebar Colour' }].map(({ key, label }) => (
                <div key={key} className="input-group">
                  <label style={{ fontSize: 12 }}>{label}</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input type="color" value={localPrefs[key] || '#000000'} onChange={e => setLocalPrefs({ ...localPrefs, [key]: e.target.value })}
                      style={{ width: 44, height: 36, border: 'none', borderRadius: 6, cursor: 'pointer', padding: 2 }} />
                    <input className="input" value={localPrefs[key] || ''} onChange={e => setLocalPrefs({ ...localPrefs, [key]: e.target.value })}
                      style={{ flex: 1, fontFamily: 'monospace', fontSize: 13 }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="input-group" style={{ maxWidth: 300, marginBottom: 20 }}>
              <label style={{ fontSize: 12 }}>Display Name</label>
              <input className="input" value={localPrefs.display_name || ''} onChange={e => setLocalPrefs({ ...localPrefs, display_name: e.target.value })} placeholder={user?.username} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" onClick={handleSavePrefs}>Save Appearance</button>
              <button className="btn btn-ghost" onClick={() => { setLocalPrefs(preferences); setShowPrefs(false); }}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Change Password ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setShowChangePassword(!showChangePassword)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <KeyRound size={18} color="var(--primary)" />
            <h2 style={{ fontSize: 18 }}>Change Password</h2>
          </div>
          {showChangePassword ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
        {showChangePassword && (
          <form onSubmit={handleChangePassword} style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 360 }}>
            {pwError && <div style={{ padding: '10px 14px', background: 'rgba(231,111,81,0.1)', border: '1px solid rgba(231,111,81,0.3)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontSize: 14 }}>{pwError}</div>}
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
              <button type="button" className="btn btn-ghost" onClick={() => setShowChangePassword(false)}>Cancel</button>
            </div>
          </form>
        )}
      </div>

      {/* ── My Children (parent) ── */}
      {!isAdmin && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontSize: 18 }}>My Children</h2>
            <button className="btn btn-primary" onClick={() => { setEditChild(null); setShowChildModal(true); }}>
              <Plus size={16} /> Add Child
            </button>
          </div>
          <ChildList children={myChildren} onEdit={c => { setEditChild(c); setShowChildModal(true); }} onDelete={deleteChild} />
        </div>
      )}

      {/* ── All Families (admin) ── */}
      {isAdmin && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, marginBottom: 20 }}>All Families</h2>
          {Object.values(childrenByUser).length === 0 ? (
            <div className="empty-state" style={{ padding: '20px 0' }}>
              <div className="empty-state-icon">👨‍👩‍👧</div>
              <h3>No families yet</h3>
              <p>Add parent accounts below to get started</p>
            </div>
          ) : Object.values(childrenByUser).map(({ user: u, children: kids }) => (
            <div key={u.id} style={{ marginBottom: 20, padding: 16, borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={16} color="var(--primary)" />
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{u.username}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', textTransform: 'capitalize' }}>{u.role} · {kids.length} child{kids.length !== 1 ? 'ren' : ''}</div>
                </div>
              </div>
              {kids.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text-3)', padding: '8px 0' }}>No children added yet</div>
              ) : (
                <ChildList children={kids} onEdit={c => { setEditChild(c); setShowChildModal(true); }} onDelete={deleteChild} compact />
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── User Accounts (admin) ── */}
      {isAdmin && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontSize: 18 }}>User Accounts</h2>
            <button className="btn btn-primary" onClick={() => setShowUserModal(true)}>
              <Plus size={16} /> Add Account
            </button>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16, padding: '10px 14px', background: 'var(--accent-light)', borderRadius: 'var(--radius-sm)', border: '1px solid #F4A261' }}>
            🔒 <strong>Admin</strong> has full access. <strong>Parents</strong> manage their own family only.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {users.map(u => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: u.role === 'admin' ? 'var(--primary-pale)' : '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {u.role === 'admin' ? <ShieldCheck size={18} color="var(--primary)" /> : <User size={18} color="#6C63FF" />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{u.username}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-3)', textTransform: 'capitalize' }}>{u.role}</div>
                </div>
                {u.role !== 'admin' && (
                  <button className="btn btn-ghost btn-sm" onClick={() => deleteUser(u.id)} style={{ color: 'var(--danger)' }}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {showChildModal && (
        <ChildModal child={editChild} users={isAdmin ? users : null} currentUserId={user.id}
          onClose={() => setShowChildModal(false)}
          onSave={() => { loadAll(); setShowChildModal(false); showToast('Saved!'); }} />
      )}
      {showUserModal && (
        <UserModal onClose={() => setShowUserModal(false)}
          onSave={() => { loadAll(); setShowUserModal(false); showToast('Account created!'); }} />
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function ChildList({ children, onEdit, onDelete, compact }) {
  if (children.length === 0) return (
    <div className="empty-state" style={{ padding: '20px 0' }}>
      <div className="empty-state-icon">👶</div>
      <h3>No children added</h3>
      <p>Add your first child to get started</p>
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {children.map(child => (
        <div key={child.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: compact ? '10px 12px' : '14px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: child.avatar_color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>
            {child.name[0]}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: compact ? 13 : 14 }}>{child.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Year {child.year_level}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => onEdit(child)}>Edit</button>
          <button className="btn btn-ghost btn-sm" onClick={() => onDelete(child.id)} style={{ color: 'var(--danger)' }}><Trash2 size={14} /></button>
        </div>
      ))}
    </div>
  );
}

function ChildModal({ child, users, currentUserId, onClose, onSave }) {
  const [form, setForm] = useState(child || { name: '', year_level: '1', avatar_color: AVATAR_COLORS[0], user_id: currentUserId });
  async function handleSubmit(e) {
    e.preventDefault();
    if (child) { await api.put(`/children/${child.id}`, form); } else { await api.post('/children', form); }
    onSave();
  }
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{child ? 'Edit Child' : 'Add Child'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {users && (
            <div className="input-group">
              <label>Family Account</label>
              <select className="select" value={form.user_id || currentUserId} onChange={e => setForm({ ...form, user_id: e.target.value })}>
                {users.filter(u => u.role === 'parent').map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
              </select>
            </div>
          )}
          <div className="input-group">
            <label>Name *</label>
            <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Child's name" required />
          </div>
          <div className="input-group">
            <label>Year Level *</label>
            <select className="select" value={form.year_level} onChange={e => setForm({ ...form, year_level: e.target.value })}>
              {YEAR_LEVELS.map(y => <option key={y} value={y}>{y === 'Kindergarten' ? 'Kindergarten' : `Year ${y}`}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label>Avatar Colour</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {AVATAR_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setForm({ ...form, avatar_color: c })}
                  style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: `3px solid ${form.avatar_color === c ? 'var(--text)' : 'transparent'}`, cursor: 'pointer' }} />
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: form.avatar_color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18 }}>
              {form.name ? form.name[0].toUpperCase() : '?'}
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>{form.name || 'Child Name'}</div>
              <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Year {form.year_level}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">{child ? 'Save Changes' : 'Add Child'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UserModal({ onClose, onSave }) {
  const [form, setForm] = useState({ username: '', password: '', role: 'parent' });
  const [error, setError] = useState('');
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try { await api.post('/auth/users', form); onSave(); }
    catch (err) { setError(err.response?.data?.error || 'Failed to create user'); }
  }
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Add Account</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && <div style={{ padding: '10px 14px', background: 'rgba(231,111,81,0.1)', border: '1px solid rgba(231,111,81,0.3)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontSize: 14 }}>{error}</div>}
          <div className="input-group">
            <label>Username *</label>
            <input className="input" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="e.g. smith-family" required />
          </div>
          <div className="input-group">
            <label>Password *</label>
            <input className="input" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} />
          </div>
          <div className="input-group">
            <label>Role</label>
            <select className="select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
              <option value="parent">Parent</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Create Account</button>
          </div>
        </form>
      </div>
    </div>
  );
}
