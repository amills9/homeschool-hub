import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Plus, Trash2, KeyRound, X, Check, ShieldCheck, User } from 'lucide-react';

const AVATAR_COLORS = ['#2D6A4F','#52B788','#6C63FF','#F4A261','#E76F51','#264653','#E9C46A','#219EBC','#8338EC','#FB8500'];
const YEAR_LEVELS = ['Kindergarten','1','2','3','4','5','6','7','8','9','10','11','12'];

export default function Admin() {
  const [children, setChildren] = useState([]);
  const [users, setUsers] = useState([]);
  const [showChildModal, setShowChildModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editChild, setEditChild] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const [childRes, userRes] = await Promise.all([api.get('/children'), api.get('/auth/users')]);
    setChildren(childRes.data);
    setUsers(userRes.data);
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function deleteChild(id) {
    if (!confirm('Delete this child and ALL their data? This cannot be undone.')) return;
    await api.delete(`/children/${id}`);
    loadAll();
    showToast('Child deleted');
  }

  async function deleteUser(id) {
    if (!confirm('Delete this user?')) return;
    await api.delete(`/auth/users/${id}`);
    loadAll();
    showToast('User deleted');
  }

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin</h1>
          <p className="page-subtitle">Children & user account management</p>
        </div>
      </div>

      {/* Children */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 20 }}>Children</h2>
          <button className="btn btn-primary" onClick={() => { setEditChild(null); setShowChildModal(true); }}>
            <Plus size={16} /> Add Child
          </button>
        </div>

        {children.length === 0 ? (
          <div className="empty-state" style={{ padding: '30px 0' }}>
            <div className="empty-state-icon">👶</div>
            <h3>No children added</h3>
            <p>Add your first child to get started</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {children.map(child => (
              <div key={child.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: child.avatar_color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}>{child.name[0]}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{child.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Year {child.year_level}</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => { setEditChild(child); setShowChildModal(true); }}>Edit</button>
                <button className="btn btn-ghost btn-sm" onClick={() => deleteChild(child.id)} style={{ color: 'var(--danger)' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Users */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 20 }}>User Accounts</h2>
          <button className="btn btn-primary" onClick={() => setShowUserModal(true)}>
            <Plus size={16} /> Add User
          </button>
        </div>

        <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16, padding: '10px 14px', background: 'var(--accent-light)', borderRadius: 'var(--radius-sm)', border: '1px solid #F4A261' }}>
          🔒 <strong>Admin accounts</strong> can manage children, users, and all settings. <strong>Parent accounts</strong> can view and update tasks & outcomes.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {users.map(user => (
            <div key={user.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: user.role === 'admin' ? 'var(--primary-pale)' : '#EEF2FF',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {user.role === 'admin' ? <ShieldCheck size={18} color="var(--primary)" /> : <User size={18} color="#6C63FF" />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{user.username}</div>
                <div style={{ fontSize: 13, color: 'var(--text-3)', textTransform: 'capitalize' }}>{user.role}</div>
              </div>
              {user.role !== 'admin' && (
                <button className="btn btn-ghost btn-sm" onClick={() => deleteUser(user.id)} style={{ color: 'var(--danger)' }}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Child Modal */}
      {showChildModal && (
        <ChildModal
          child={editChild}
          onClose={() => setShowChildModal(false)}
          onSave={() => { loadAll(); setShowChildModal(false); showToast('Saved!'); }}
        />
      )}

      {/* User Modal */}
      {showUserModal && (
        <UserModal
          onClose={() => setShowUserModal(false)}
          onSave={() => { loadAll(); setShowUserModal(false); showToast('User created!'); }}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function ChildModal({ child, onClose, onSave }) {
  const [form, setForm] = useState(child || { name: '', year_level: '1', avatar_color: AVATAR_COLORS[0] });

  async function handleSubmit(e) {
    e.preventDefault();
    if (child) {
      await api.put(`/children/${child.id}`, form);
    } else {
      await api.post('/children', form);
    }
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
            <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Child's name" required />
          </div>
          <div className="input-group">
            <label>Year Level *</label>
            <select className="select" value={form.year_level} onChange={e => setForm({...form, year_level: e.target.value})}>
              {YEAR_LEVELS.map(y => <option key={y} value={y}>{y === 'Kindergarten' ? 'Kindergarten' : `Year ${y}`}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label>Avatar Colour</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {AVATAR_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setForm({...form, avatar_color: c})}
                  style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: `3px solid ${form.avatar_color === c ? 'var(--text)' : 'transparent'}`, cursor: 'pointer' }} />
              ))}
            </div>
          </div>
          {/* Preview */}
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
    try {
      await api.post('/auth/users', form);
      onSave();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user');
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Add User</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && <div style={{ padding: '10px 14px', background: 'rgba(231,111,81,0.1)', border: '1px solid rgba(231,111,81,0.3)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontSize: 14 }}>{error}</div>}
          <div className="input-group">
            <label>Username *</label>
            <input className="input" value={form.username} onChange={e => setForm({...form, username: e.target.value})} placeholder="Choose a username" required />
          </div>
          <div className="input-group">
            <label>Password *</label>
            <input className="input" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Set a password" required minLength={6} />
          </div>
          <div className="input-group">
            <label>Role</label>
            <select className="select" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
              <option value="parent">Parent (standard access)</option>
              <option value="admin">Admin (full access)</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Create User</button>
          </div>
        </form>
      </div>
    </div>
  );
}
