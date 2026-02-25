import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, CalendarDays, Settings, Cog, LogOut, BookOpen, Library } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/weekly', icon: CalendarDays, label: 'Weekly Planner' },
  { to: '/resources', icon: Library, label: 'Resources' },
  { to: '/setup', icon: Settings, label: 'Setup' },
  { to: '/admin', icon: Cog, label: 'Admin', adminOnly: true },
];

export default function Sidebar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36,
            background: 'var(--primary)',
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BookOpen size={18} color="white" />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>Homeschool</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>HUB</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV_ITEMS.filter(item => !item.adminOnly || isAdmin).map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div style={{ padding: '16px 12px', borderTop: '1px solid var(--border)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 12px',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--surface-2)',
          marginBottom: 6,
        }}>
          <div style={{
            width: 32, height: 32,
            borderRadius: '50%',
            background: 'var(--primary-pale)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: 'var(--primary)',
          }}>
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, truncate: true }}>{user?.username}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'capitalize' }}>{user?.role}</div>
          </div>
        </div>
        <button className="nav-item" onClick={handleLogout} style={{ color: 'var(--danger)' }}>
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
