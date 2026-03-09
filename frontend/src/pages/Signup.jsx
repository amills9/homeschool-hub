import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { BookOpen, Plus, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';

const AVATAR_COLORS = ['#2D6A4F','#52B788','#6C63FF','#F4A261','#E76F51','#264653','#219EBC','#8338EC'];
const YEAR_LEVELS = ['Kindergarten','1','2','3','4','5','6','7','8','9','10','11','12'];
const HOMESCHOOL_STAGES = [
  { value: 'just-starting', label: 'Just Starting Out' },
  { value: 'early-years',   label: 'Early Years (K–2)' },
  { value: 'primary',       label: 'Primary (Years 3–6)' },
  { value: 'secondary',     label: 'Secondary (Years 7–10)' },
  { value: 'senior',        label: 'Senior (Years 11–12)' },
];

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: '', password: '', confirmPassword: '', display_name: '',
    email: '', num_children: 1, homeschool_stage: '', newsletter_opt_in: false,
  });
  const [children, setChildren] = useState([{ name: '', year_level: '1', avatar_color: AVATAR_COLORS[0] }]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function addChild() {
    setChildren([...children, { name: '', year_level: '1', avatar_color: AVATAR_COLORS[children.length % AVATAR_COLORS.length] }]);
  }
  function removeChild(i) { setChildren(children.filter((_, idx) => idx !== i)); }
  function updateChild(i, field, value) { setChildren(children.map((c, idx) => idx === i ? { ...c, [field]: value } : c)); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (!form.homeschool_stage) { setError('Please select your homeschool stage'); return; }

    const validChildren = children.filter(c => c.name.trim());
    setLoading(true);
    try {
      await api.post('/auth/signup-with-children', {
        username: form.username,
        password: form.password,
        display_name: form.display_name,
        email: form.email,
        num_children: form.num_children,
        homeschool_stage: form.homeschool_stage,
        newsletter_opt_in: form.newsletter_opt_in,
        children: validChildren,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #D8F3DC 0%, #F7F5F0 40%, #FFE8D6 100%)', padding: 24 }}>
        <div className="card animate-scale" style={{ maxWidth: 440, width: '100%', padding: 40, textAlign: 'center' }}>
          <CheckCircle2 size={52} color="var(--primary)" style={{ margin: '0 auto 20px' }} />
          <h2 style={{ marginBottom: 12 }}>You're on the list!</h2>
          <p style={{ color: 'var(--text-2)', marginBottom: 8, lineHeight: 1.6 }}>
            Your account is being reviewed by the admin. You'll receive an email at <strong>{form.email}</strong> once approved.
          </p>
          <p style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 28 }}>This usually happens within 24 hours.</p>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/login')}>
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #D8F3DC 0%, #F7F5F0 40%, #FFE8D6 100%)', padding: '40px 24px', overflowY: 'auto' }}>
      <div className="animate-scale" style={{ maxWidth: 560, margin: '0 auto' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, background: 'var(--primary)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', boxShadow: '0 8px 24px rgba(45,106,79,0.3)' }}>
            <BookOpen size={26} color="white" />
          </div>
          <h1 style={{ fontSize: 28 }}>Create your account</h1>
          <p style={{ color: 'var(--text-2)', marginTop: 4 }}>Set up your family's homeschool hub</p>
        </div>

        <div className="card" style={{ padding: 32 }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: 'rgba(231,111,81,0.1)', border: '1px solid rgba(231,111,81,0.3)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontSize: 14 }}>
                <AlertCircle size={16} />{error}
              </div>
            )}

            {/* ── Account details ── */}
            <section>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>Account Details</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="grid-2">
                  <div className="input-group">
                    <label>Username *</label>
                    <input className="input" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="e.g. smith-family" required />
                  </div>
                  <div className="input-group">
                    <label>Display Name</label>
                    <input className="input" value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} placeholder="e.g. The Smith Family" />
                  </div>
                </div>
                <div className="input-group">
                  <label>Email Address * <span style={{ fontWeight: 400, color: 'var(--text-3)' }}>(for password resets)</span></label>
                  <input className="input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" required />
                </div>
                <div className="grid-2">
                  <div className="input-group">
                    <label>Password *</label>
                    <input className="input" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min. 6 characters" required minLength={6} />
                  </div>
                  <div className="input-group">
                    <label>Confirm Password *</label>
                    <input className="input" type="password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} placeholder="Repeat password" required />
                  </div>
                </div>
              </div>
            </section>

            {/* ── About your family ── */}
            <section>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>About Your Family</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="grid-2">
                  <div className="input-group">
                    <label>Number of Children</label>
                    <input className="input" type="number" min={1} max={20} value={form.num_children} onChange={e => setForm({ ...form, num_children: +e.target.value })} />
                  </div>
                  <div className="input-group">
                    <label>Homeschool Stage *</label>
                    <select className="select" value={form.homeschool_stage} onChange={e => setForm({ ...form, homeschool_stage: e.target.value })} required>
                      <option value="">Select stage...</option>
                      {HOMESCHOOL_STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '12px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <input type="checkbox" checked={form.newsletter_opt_in} onChange={e => setForm({ ...form, newsletter_opt_in: e.target.checked })}
                    style={{ width: 18, height: 18, accentColor: 'var(--primary)', cursor: 'pointer' }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>Keep me updated</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Opt in to our newsletter for homeschool tips and news</div>
                  </div>
                </label>
              </div>
            </section>

            {/* ── Children ── */}
            <section>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Your Children <span style={{ fontSize: 12, fontWeight: 400, textTransform: 'none' }}>(optional)</span>
                </h3>
                <button type="button" className="btn btn-ghost btn-sm" onClick={addChild}><Plus size={14} /> Add</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {children.map((child, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', width: 80, flexShrink: 0, paddingBottom: 4 }}>
                      {AVATAR_COLORS.map(c => (
                        <button key={c} type="button" onClick={() => updateChild(i, 'avatar_color', c)}
                          style={{ width: 18, height: 18, borderRadius: '50%', background: c, border: `2px solid ${child.avatar_color === c ? 'var(--text)' : 'transparent'}`, cursor: 'pointer' }} />
                      ))}
                    </div>
                    <div className="input-group" style={{ flex: 1 }}>
                      <label style={{ fontSize: 11 }}>Name</label>
                      <input className="input" value={child.name} onChange={e => updateChild(i, 'name', e.target.value)} placeholder="Child's name" />
                    </div>
                    <div className="input-group" style={{ width: 120 }}>
                      <label style={{ fontSize: 11 }}>Year Level</label>
                      <select className="select" value={child.year_level} onChange={e => updateChild(i, 'year_level', e.target.value)}>
                        {YEAR_LEVELS.map(y => <option key={y} value={y}>{y === 'Kindergarten' ? 'Kinder' : `Year ${y}`}</option>)}
                      </select>
                    </div>
                    {children.length > 1 && (
                      <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => removeChild(i)} style={{ color: 'var(--danger)', marginBottom: 2 }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : 'Create Account'}
            </button>

            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-3)' }}>
              Already have an account?{' '}
              <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '0 4px' }} onClick={() => navigate('/login')}>Sign in</button>
            </p>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'var(--text-3)' }}>
          New accounts are reviewed by our admin before you can sign in.
        </p>
      </div>
    </div>
  );
}
