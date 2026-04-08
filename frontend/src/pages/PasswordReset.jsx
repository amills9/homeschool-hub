import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { BookOpen, AlertCircle, CheckCircle2 } from 'lucide-react';

// ── Forgot Password page ───────────────────────────────────
export function ForgotPassword() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { username });
      setSubmitted(true);
    } catch {
      setSubmitted(true); // Always show success to avoid enumeration
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #D8F3DC 0%, #F7F5F0 40%, #FFE8D6 100%)', padding: 24 }}>
      <div className="animate-scale" style={{ maxWidth: 420, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, background: 'var(--primary)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', boxShadow: '0 8px 24px rgba(45,106,79,0.3)' }}>
            <BookOpen size={26} color="white" />
          </div>
          <h1 style={{ fontSize: 26 }}>Forgot Password</h1>
        </div>

        <div className="card" style={{ padding: 32 }}>
          {submitted ? (
            <div style={{ textAlign: 'center' }}>
              <CheckCircle2 size={40} color="var(--primary)" style={{ margin: '0 auto 16px' }} />
              <h3 style={{ marginBottom: 12 }}>Request submitted</h3>
              <p style={{ color: 'var(--text-2)', marginBottom: 24, lineHeight: 1.6, fontSize: 14 }}>
                If that username exists, a reset token has been generated. Contact your admin with your username — they can provide you with the reset token from the Admin panel.
              </p>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/login')}>
                Back to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.6 }}>
                Enter your username and we'll generate a reset token. Your admin can then share it with you so you can set a new password.
              </p>
              <div className="input-group">
                <label>Username</label>
                <input className="input" value={username} onChange={e => setUsername(e.target.value)} placeholder="Your username" required autoFocus />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
                {loading ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : 'Request Reset'}
              </button>
              <button type="button" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/login')}>
                Back to Sign In
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Reset Password page ────────────────────────────────────
export function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState(searchParams.get('token') || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (newPassword !== confirm) { setError('Passwords do not match'); return; }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Reset failed. Token may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #D8F3DC 0%, #F7F5F0 40%, #FFE8D6 100%)', padding: 24 }}>
      <div className="animate-scale" style={{ maxWidth: 420, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, background: 'var(--primary)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', boxShadow: '0 8px 24px rgba(45,106,79,0.3)' }}>
            <BookOpen size={26} color="white" />
          </div>
          <h1 style={{ fontSize: 26 }}>Reset Password</h1>
        </div>

        <div className="card" style={{ padding: 32 }}>
          {success ? (
            <div style={{ textAlign: 'center' }}>
              <CheckCircle2 size={40} color="var(--primary)" style={{ margin: '0 auto 16px' }} />
              <h3 style={{ marginBottom: 12 }}>Password reset!</h3>
              <p style={{ color: 'var(--text-2)', marginBottom: 24, fontSize: 14 }}>You can now sign in with your new password.</p>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/login')}>Sign In</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: 'rgba(231,111,81,0.1)', border: '1px solid rgba(231,111,81,0.3)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontSize: 14 }}>
                  <AlertCircle size={16} />{error}
                </div>
              )}
              <div className="input-group">
                <label>Reset Token</label>
                <input className="input" value={token} onChange={e => setToken(e.target.value)} placeholder="Paste your reset token" required style={{ fontFamily: 'monospace', fontSize: 13 }} />
              </div>
              <div className="input-group">
                <label>New Password</label>
                <input className="input" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 6 characters" required minLength={6} />
              </div>
              <div className="input-group">
                <label>Confirm Password</label>
                <input className="input" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" required />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
                {loading ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : 'Reset Password'}
              </button>
              <button type="button" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/login')}>
                Back to Sign In
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
