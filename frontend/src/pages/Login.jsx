import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Lock, User, AlertCircle, Check, ArrowRight } from 'lucide-react';

const FEATURES = [
  'Plan and track weekly lessons effortlessly',
  'Align with national curriculum outcomes',
  'Manage resources, PDFs and links in one place',
  'Photo journals and yearly progress reports',
];

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const { login }    = useAuth();
  const navigate     = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your details and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      fontFamily: 'var(--font-body)',
    }}>

      {/* ── Left: Brand panel ────────────────────────── */}
      <div style={{
        width: '44%',
        background: 'linear-gradient(150deg, #0F172A 0%, #1a2942 60%, #0d2137 100%)',
        display: 'flex',
        flexDirection: 'column',
        padding: '48px 52px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative blobs */}
        <div style={{
          position: 'absolute', top: '-80px', right: '-80px',
          width: '360px', height: '360px',
          background: 'radial-gradient(circle, rgba(5,150,105,0.18) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '60px', left: '-60px',
          width: '280px', height: '280px',
          background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
          <div style={{
            width: 42, height: 42,
            background: 'linear-gradient(135deg, #059669, #047857)',
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(5,150,105,0.4)',
          }}>
            <GraduationCap size={21} color="white" strokeWidth={2.2} />
          </div>
          <span style={{
            color: 'white',
            fontFamily: 'var(--font-display)',
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: '-0.01em',
          }}>
            Homeschool Hub
          </span>
        </div>

        {/* Main copy */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(5,150,105,0.15)',
            border: '1px solid rgba(52,211,153,0.2)',
            borderRadius: '100px',
            padding: '4px 12px',
            marginBottom: 24,
            width: 'fit-content',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399' }} />
            <span style={{ fontSize: 12, color: '#34D399', fontWeight: 600, letterSpacing: '0.03em' }}>
              Built for Australian homeschoolers
            </span>
          </div>

          <h1 style={{
            color: 'white',
            fontFamily: 'var(--font-display)',
            fontSize: 38,
            fontWeight: 700,
            lineHeight: 1.15,
            marginBottom: 18,
            letterSpacing: '-0.02em',
          }}>
            The complete homeschool management platform.
          </h1>

          <p style={{
            color: 'rgba(148,163,184,0.9)',
            fontSize: 16,
            lineHeight: 1.65,
            marginBottom: 36,
            maxWidth: 380,
          }}>
            Plan lessons, track progress and manage everything — so you can focus on what actually matters.
          </p>

          {/* Feature list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {FEATURES.map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 22, height: 22,
                  borderRadius: '50%',
                  background: 'rgba(5,150,105,0.2)',
                  border: '1px solid rgba(52,211,153,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Check size={12} color="#34D399" strokeWidth={3} />
                </div>
                <span style={{ color: 'rgba(203,213,225,0.9)', fontSize: 14, fontWeight: 400 }}>
                  {f}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <p style={{ color: 'rgba(100,116,139,0.8)', fontSize: 12, position: 'relative' }}>
          Trusted by homeschool families across Australia
        </p>
      </div>

      {/* ── Right: Form panel ────────────────────────── */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 40px',
        background: 'var(--bg)',
      }}>
        <div style={{ width: '100%', maxWidth: 400 }} className="animate-scale">

          {/* Heading */}
          <div style={{ marginBottom: 36 }}>
            <h2 style={{
              fontSize: 28,
              color: 'var(--text)',
              letterSpacing: '-0.02em',
              marginBottom: 8,
            }}>
              Welcome back
            </h2>
            <p style={{ color: 'var(--text-3)', fontSize: 15 }}>
              Sign in to your account to continue
            </p>
          </div>

          {/* Form card */}
          <div style={{
            background: 'var(--surface)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border)',
            padding: '32px',
            boxShadow: 'var(--shadow-md)',
          }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {error && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '12px 14px',
                  background: 'var(--danger-light)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: 'var(--radius-sm)',
                  color: '#991B1B',
                  fontSize: 13.5,
                  lineHeight: 1.5,
                }}>
                  <AlertCircle size={16} style={{ marginTop: 1, flexShrink: 0 }} />
                  {error}
                </div>
              )}

              <div className="input-group">
                <label>Username</label>
                <div className="input-icon-wrap">
                  <User size={15} className="input-icon" />
                  <input
                    className="input"
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="input-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>Password</label>
                  <button
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: 12.5,
                      color: 'var(--primary)',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-body)',
                      fontWeight: 500,
                      padding: 0,
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="input-icon-wrap">
                  <Lock size={15} className="input-icon" />
                  <input
                    className="input"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  background: loading ? 'var(--primary-dark)' : 'var(--primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-body)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'all 0.15s ease',
                  boxShadow: loading ? 'none' : '0 4px 14px rgba(5,150,105,0.3)',
                  marginTop: 4,
                }}
              >
                {loading
                  ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Signing in...</>
                  : <> Sign In <ArrowRight size={16} /></>
                }
              </button>
            </form>
          </div>

          {/* Sign up link */}
          <p style={{
            textAlign: 'center',
            marginTop: 24,
            fontSize: 14,
            color: 'var(--text-3)',
          }}>
            Don't have an account?{' '}
            <button
              onClick={() => navigate('/signup')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                padding: 0,
              }}
            >
              Sign up free
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
