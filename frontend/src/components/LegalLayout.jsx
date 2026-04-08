import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BookOpen, ArrowLeft } from 'lucide-react';

const YEAR = new Date().getFullYear();

export function LegalLayout({ title, lastUpdated, children }) {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Nav */}
      <nav style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '16px 40px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ gap: 6 }}>
          <ArrowLeft size={14} /> Back
        </button>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'var(--text)' }}>
          <div style={{ width: 32, height: 32, background: 'var(--primary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={16} color="white" />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Homeschool Hub</span>
        </Link>
      </nav>

      {/* Content */}
      <div style={{ flex: 1, maxWidth: 800, margin: '0 auto', padding: '48px 24px', width: '100%' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, marginBottom: 8 }}>{title}</h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 40 }}>Last updated: {lastUpdated}</p>
        <div style={{ lineHeight: 1.8, color: 'var(--text-2)', fontSize: 15 }}>
          {children}
        </div>
      </div>

      {/* Footer */}
      <footer style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '24px 40px', textAlign: 'center', fontSize: 13, color: 'var(--text-3)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 8, flexWrap: 'wrap' }}>
          <Link to="/privacy" style={{ color: 'var(--text-3)', textDecoration: 'none' }}>Privacy Policy</Link>
          <Link to="/terms" style={{ color: 'var(--text-3)', textDecoration: 'none' }}>Terms of Service</Link>
          <Link to="/cookies" style={{ color: 'var(--text-3)', textDecoration: 'none' }}>Cookie Policy</Link>
          <Link to="/acceptable-use" style={{ color: 'var(--text-3)', textDecoration: 'none' }}>Acceptable Use</Link>
        </div>
        <div>© {YEAR} Andrew Mills · Homeschool Hub · All rights reserved</div>
      </footer>
    </div>
  );
}

// Footer component — used in Landing page and other public pages
export function SiteFooter() {
  const YEAR = new Date().getFullYear();
  return (
    <footer style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '32px 40px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, background: 'var(--primary)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={14} color="white" />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>Homeschool Hub</span>
        </div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13 }}>
          <Link to="/privacy" style={{ color: 'var(--text-3)', textDecoration: 'none' }}>Privacy Policy</Link>
          <Link to="/terms" style={{ color: 'var(--text-3)', textDecoration: 'none' }}>Terms of Service</Link>
          <Link to="/cookies" style={{ color: 'var(--text-3)', textDecoration: 'none' }}>Cookie Policy</Link>
          <Link to="/acceptable-use" style={{ color: 'var(--text-3)', textDecoration: 'none' }}>Acceptable Use</Link>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
          © {YEAR} Andrew Mills · All rights reserved
        </div>
      </div>
    </footer>
  );
}
