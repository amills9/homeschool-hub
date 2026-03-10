import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, X, Palette, KeyRound, ChevronDown, ChevronUp } from 'lucide-react';

const AVATAR_COLORS = ['#2D6A4F','#52B788','#6C63FF','#F4A261','#E76F51','#264653','#E9C46A','#219EBC','#8338EC','#FB8500','#EC4899'];
const YEAR_LEVELS = ['Kindergarten','1','2','3','4','5','6','7','8','9','10','11','12'];
const THEME_PRESETS = [
  { label: 'Forest', primary: '#2D6A4F', bg: '#F7F5F0', accent: '#F4A261', sidebar: '#FFFFFF' },
  { label: 'Ocean',  primary: '#0077B6', bg: '#F0F7FF', accent: '#F4A261', sidebar: '#FFFFFF' },
  { label: 'Berry',  primary: '#7B2D8B', bg: '#FDF5FF', accent: '#F4A261', sidebar: '#FFFFFF' },
  { label: 'Slate',  primary: '#334155', bg: '#F1F5F9', accent: '#F59E0B', sidebar: '#FFFFFF' },
  { label: 'Rose',   primary: '#BE185D', bg: '#FFF1F5', accent: '#F4A261', sidebar: '#FFFFFF' },
  { label: 'Dark',   primary: '#52B788', bg: '#1A1A18', accent: '#F4A261', sidebar: '#242422' },
];

export default function Account() {
  const { user, preferences, savePreferences } = useAuth();
  const [children, setChildren] = useState([]);
  const [showChildModal, setShowChildModal] = useState(false);
  const [editChild, setEditChild] = useState(null);
  const [toast, setToast] = useState(null);
  const [showPrefs, setShowPrefs] = useState(false);
  const [showChangePw, setShowChangePw] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [localPrefs, setLocalPrefs] = useState(preferences);

  useEffect(() => { loadChildren(); }, []);
  useEffect(() => { setLocalPrefs(preferences); }, [preferences]);

  async function loadChildren() {
    const res = await api.get('/children');
    setChildren(res.data);
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 3000); }

  async function deleteChild(id) {
    if (!confirm('Delete this child and ALL their data? This cannot be undone.')) return;
    await api.delete(`/children/${id}`);
    loadChildren();
    showToast('Child removed');
  }

  async function handleSavePrefs() {
    await savePreferences(localPrefs);
    showToast('Appearance saved!');
    setShowPrefs(false);
  }

  async function handleChangePw(e) {
    e.preventDefault();
    setPwError('');
    if (pwForm.newPassword !== pwForm.confirm) { setPwError('Passwords do not match'); return; }
    if (pwForm.newPassword.length < 6) { setPwError('Password must be at least 6 characters'); return; }
    try {
      await api.put('/auth/change-password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
      setShowChangePw(false);
      showToast('Password changed!');
    } catch (err) {
      setPwError(err.response?.data?.error || 'Failed to change password');
    }
  }

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">Account</h1>
          <p className="page-subtitle">Manage your family, appearance & password</p>
        </div>
      </div>

      {/* ── My Children ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18 }}>My Children</h2>
          <button className="btn btn-primary" onClick={() => { setEditChild(null); setShowChildModal(true); }}>
            <Plus size={16} /> Add Child
          </button>
        </div>
        {children.length === 0 ? (
          <div className="empty-state" style={{ padding: '20px 0' }}>
            <div className="empty-state-icon">👶</div>
            <h3>No children yet</h3>
            <p>Add your first child to get started with planning</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {children.map(child => (
              <div key={child.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: child.avatar_color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}>
                  {child.name[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{child.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Year {child.year_level}</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => { setEditChild(child); setShowChildModal(true); }}>Edit</button>
                <button className="btn btn-ghost btn-sm" onClick={() => deleteChild(child.id)} style={{ color: 'var(--danger)' }}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

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
                {THEME_PRESETS.map(p => (
                  <button key={p.label} onClick={() => setLocalPrefs({ ...localPrefs, theme_color: p.primary, bg_color: p.bg, accent_color: p.accent, sidebar_color: p.sidebar })}
                    style={{ padding: '8px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: p.primary, color: '#fff', border: '2px solid transparent', fontWeight: 600, outline: localPrefs.theme_color === p.primary ? '2px solid var(--text)' : 'none' }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 20 }}>
              {[{ key: 'theme_color', label: 'Primary Colour' }, { key: 'bg_color', label: 'Background' }, { key: 'accent_color', label: 'Accent Colour' }, { key: 'sidebar_color', label: 'Sidebar Colour' }].map(({ key, label }) => (
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
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setShowChangePw(!showChangePw)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <KeyRound size={18} color="var(--primary)" />
            <h2 style={{ fontSize: 18 }}>Change Password</h2>
          </div>
          {showChangePw ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
        {showChangePw && (
          <form onSubmit={handleChangePw} style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 360 }}>
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
              <button type="button" className="btn btn-ghost" onClick={() => setShowChangePw(false)}>Cancel</button>
            </div>
          </form>
        )}
      </div>

      {showChildModal && (
        <ChildModal child={editChild} currentUserId={user.id}
          onClose={() => setShowChildModal(false)}
          onSave={() => { loadChildren(); setShowChildModal(false); showToast('Saved!'); }} />
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function ChildModal({ child, currentUserId, onClose, onSave }) {
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
