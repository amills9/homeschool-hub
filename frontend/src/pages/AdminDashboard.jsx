import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Users, Baby, Clock, CheckCircle2, XCircle, Bell, Mail, BookOpen, TrendingUp } from 'lucide-react';

const STAGE_LABELS = {
  'just-starting': 'Just Starting Out',
  'early-years': 'Early Years (K–2)',
  'primary': 'Primary (Years 3–6)',
  'secondary': 'Secondary (Years 7–10)',
  'senior': 'Senior (Years 11–12)',
};

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [statsRes, usersRes] = await Promise.all([
        api.get('/auth/stats'),
        api.get('/auth/users'),
      ]);
      setStats(statsRes.data);
      const users = usersRes.data;
      setPendingUsers(users.filter(u => u.status === 'pending'));
      setAllUsers(users.filter(u => u.status === 'approved' && u.role === 'parent'));
    } finally {
      setLoading(false);
    }
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 3000); }

  async function approveUser(id) {
    await api.put(`/auth/users/${id}/approve`);
    loadAll();
    showToast('Account approved — they can now sign in');
  }

  async function rejectUser(id) {
    if (!confirm('Reject this account request? The user will not be able to sign in.')) return;
    await api.put(`/auth/users/${id}/reject`);
    loadAll();
    showToast('Account rejected');
  }

  async function deleteUser(id) {
    if (!confirm('Delete this family account and all their data?')) return;
    await api.delete(`/auth/users/${id}`);
    loadAll();
    showToast('Account deleted');
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
    </div>
  );

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">Platform overview & account management</p>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid-3" style={{ marginBottom: 28 }}>
        <StatCard icon={Users} color="var(--primary)" bg="var(--primary-pale)" label="Active Families" value={stats?.parentCount ?? 0} />
        <StatCard icon={Baby} color="#6C63FF" bg="#EEF2FF" label="Children" value={stats?.childCount ?? 0} />
        <StatCard icon={Mail} color="var(--accent)" bg="var(--accent-light)" label="Newsletter Signups" value={stats?.newsletterCount ?? 0} />
      </div>

      {/* ── Pending Approvals ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: pendingUsers.length > 0 ? 20 : 0 }}>
          <Bell size={18} color={pendingUsers.length > 0 ? 'var(--accent)' : 'var(--text-3)'} />
          <h2 style={{ fontSize: 18 }}>Pending Approvals</h2>
          {pendingUsers.length > 0 && (
            <span style={{ marginLeft: 'auto', background: 'var(--accent)', color: 'white', borderRadius: 99, padding: '2px 12px', fontSize: 12, fontWeight: 700 }}>
              {pendingUsers.length} new
            </span>
          )}
        </div>

        {pendingUsers.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 0', color: 'var(--text-3)', fontSize: 14 }}>
            <CheckCircle2 size={18} color="var(--primary)" />
            All caught up — no pending requests
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pendingUsers.map(u => (
              <div key={u.id} style={{ padding: '16px 18px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Users size={18} color="#6C63FF" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{u.username}</div>
                    {u.email && <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>📧 {u.email}</div>}
                    <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                      {u.num_children > 0 && (
                        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>👧 {u.num_children} child{u.num_children !== 1 ? 'ren' : ''}</span>
                      )}
                      {u.homeschool_stage && (
                        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>📚 {STAGE_LABELS[u.homeschool_stage] || u.homeschool_stage}</span>
                      )}
                      {u.newsletter_opt_in === 1 && (
                        <span style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>✉️ Newsletter signup</span>
                      )}
                      <span style={{ fontSize: 12, color: 'var(--text-3)' }}>🕐 {new Date(u.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button className="btn btn-sm" onClick={() => approveUser(u.id)}
                      style={{ background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle2 size={14} /> Approve
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => rejectUser(u.id)} style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <XCircle size={14} /> Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Active Families ── */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <TrendingUp size={18} color="var(--primary)" />
          <h2 style={{ fontSize: 18 }}>Active Families</h2>
          <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text-3)' }}>{allUsers.length} accounts</span>
        </div>

        {allUsers.length === 0 ? (
          <div style={{ color: 'var(--text-3)', fontSize: 14, padding: '16px 0', textAlign: 'center' }}>
            No approved families yet
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {allUsers.map(u => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--primary)', fontSize: 14 }}>
                  {u.username[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{u.username}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 2 }}>
                    {u.email && <span>📧 {u.email}</span>}
                    {u.homeschool_stage && <span>📚 {STAGE_LABELS[u.homeschool_stage] || u.homeschool_stage}</span>}
                    {u.newsletter_opt_in === 1 && <span style={{ color: 'var(--primary)' }}>✉️ Newsletter</span>}
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => deleteUser(u.id)} style={{ color: 'var(--danger)', fontSize: 12 }}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function StatCard({ icon: Icon, color, bg, label, value }) {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ padding: 14, borderRadius: 14, background: bg, flexShrink: 0 }}>
        <Icon size={24} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 36, fontWeight: 700, fontFamily: 'var(--font-display)', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>{label}</div>
      </div>
    </div>
  );
}
