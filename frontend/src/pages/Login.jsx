import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Lock, User, AlertCircle } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #D8F3DC 0%, #F7F5F0 40%, #FFE8D6 100%)',
      padding: '24px',
    }}>
      <div className="animate-scale" style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width: 64, height: 64, background: 'var(--primary)', borderRadius: '18px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(45,106,79,0.3)',
          }}>
            <BookOpen size={30} color="white" />
          </div>
          <h1 style={{ fontSize: '32px', color: 'var(--text)', marginBottom: '4px' }}>Homeschool Hub</h1>
          <p style={{ color: 'var(--text-2)', fontSize: '15px' }}>Sign in to continue learning</p>
        </div>

        <div className="card" style={{ padding: '36px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '12px 16px', background: 'rgba(231,111,81,0.1)',
                border: '1px solid rgba(231,111,81,0.3)', borderRadius: 'var(--radius-sm)',
                color: 'var(--danger)', fontSize: '14px',
              }}>
                <AlertCircle size={16} />{error}
              </div>
            )}

            <div className="input-group">
              <label>Username</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
                <input className="input" style={{ paddingLeft: 38 }} type="text" value={username}
                  onChange={e => setUsername(e.target.value)} placeholder="Enter username" required autoFocus />
              </div>
            </div>

            <div className="input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label>Password</label>
                <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 12, padding: '2px 6px' }}
                  onClick={() => navigate('/forgot-password')}>
                  Forgot password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
                <input className="input" style={{ paddingLeft: 38 }} type="password" value={password}
                  onChange={e => setPassword(e.target.value)} placeholder="Enter password" required />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg"
              style={{ width: '100%', justifyContent: 'center', marginTop: '4px' }} disabled={loading}>
              {loading ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : 'Sign In'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '14px', color: 'var(--text-2)' }}>
          Don't have an account?{' '}
          <button className="btn btn-ghost btn-sm" style={{ padding: '0 4px' }} onClick={() => navigate('/signup')}>
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
}
