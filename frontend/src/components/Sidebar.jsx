import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, CalendarDays, Settings, LogOut, BookOpen, Library, Menu, X, Cog } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/weekly', icon: CalendarDays, label: 'Weekly Planner' },
  { to: '/resources', icon: Library, label: 'Resources' },
  { to: '/setup', icon: Settings, label: 'Setup' },
  { to: '/account', icon: Cog, label: 'Account' },
];

export default function Sidebar() {
  const { user, logout, preferences } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  function handleLogout() { logout(); navigate('/login'); }

  const displayName = preferences?.display_name || user?.username;

  const NavContent = () => (
    <>
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, background: 'var(--primary)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={18} color="white" />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>Homeschool</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>HUB</div>
          </div>
        </div>
        {/* X button — only visible on mobile via CSS */}
        <button className="sidebar-close-btn" onClick={() => setMobileOpen(false)}>
          <X size={20} />
        </button>
      </div>

      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV_ITEMS.map(item => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <item.icon size={18} />{item.label}
          </NavLink>
        ))}
      </nav>

      <div style={{ padding: '16px 12px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)', marginBottom: 6 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--primary)', flexShrink: 0 }}>
            {displayName?.[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Family account</div>
          </div>
        </div>
        <button className="nav-item" onClick={handleLogout} style={{ color: 'var(--danger)' }}>
          <LogOut size={16} />Sign Out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar — always visible on large screens */}
      <aside className="sidebar sidebar-desktop-panel" style={{ background: 'var(--sidebar-color, var(--surface))' }}>
        <NavContent />
      </aside>

      {/* Mobile top bar — hidden on desktop via CSS */}
      <div className="mobile-topbar">
        <button className="hamburger-btn" onClick={() => setMobileOpen(true)}>
          <Menu size={22} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, background: 'var(--primary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={14} color="white" />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>Homeschool HUB</span>
        </div>
        <div style={{ width: 36 }} />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
          <aside className="sidebar sidebar-drawer">
            <NavContent />
          </aside>
        </>
      )}
    </>
  );
}
