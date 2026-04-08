import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24, textAlign: 'center',
    }}>
      <div style={{ width: 64, height: 64, background: 'var(--primary)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
        <BookOpen size={32} color="white" />
      </div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 72, color: 'var(--primary)', lineHeight: 1, marginBottom: 8 }}>404</h1>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, marginBottom: 12 }}>Page Not Found</h2>
      <p style={{ color: 'var(--text-2)', fontSize: 16, marginBottom: 32, maxWidth: 400 }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div style={{ display: 'flex', gap: 12 }}>
        <Link to="/" className="btn btn-primary">Go Home</Link>
        <Link to="/dashboard" className="btn btn-ghost">Dashboard</Link>
      </div>
    </div>
  );
}
