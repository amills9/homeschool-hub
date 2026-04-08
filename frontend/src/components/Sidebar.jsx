import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, CalendarDays, Settings, LogOut, BookOpen,
  Library, Menu, X, Cog, FileBarChart, Image, GraduationCap,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/weekly',        icon: CalendarDays,    label: 'Weekly Planner' },
  { to: '/resources',     icon: Library,         label: 'Resources' },
  { to: '/gallery',       icon: Image,           label: 'Photo Gallery' },
  { to: '/yearly-report', icon: FileBarChart,    label: 'Yearly Report' },
  { to: '/setup',         icon: Settings,        label: 'Setup' },
  { to: '/account',       icon: Cog,             label: 'Account' },
];

export default function Sidebar() {
  const { user, logout, preferences } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  function handleLogout() { logout(); navigate('/login'); }

  const displayName = preferences?.display_name || user?.username;
  const schoolName  = preferences?.school_name;
  const sidebarBg   = preferences?.sidebar_color || 'var(--sidebar-color)';

  // Determine if sidebar is dark to adjust text colours
  const isDark = (() => {
    const c = (preferences?.sidebar_color || '#FFFFFF').replace('#', '');
    if (c.length < 6) return false;
    const r = parseInt(c.slice(0,2),16), g = parseInt(c.slice(2,4),16), b = parseInt(c.slice(4,6),16);
    const luminance = (0.299*r + 0.587*g + 0.114*b) / 255;
    return luminance < 0.45;
  })();

  const sidebarStyles = isDark ? {
    borderColor:   'rgba(255,255,255,0.07)',
    headerBorder:  'rgba(255,255,255,0.07)',
    text:          'rgba(255,255,255,0.55)',
    textStrong:    'rgba(255,255,255,0.9)',
    textSub:       'rgba(255,255,255,0.35)',
    avatarBg:      'rgba(255,255,255,0.1)',
    avatarText:    'rgba(255,255,255,0.8)',
    userSectionBg: 'rgba(255,255,255,0.05)',
  } : {
    borderColor:   'var(--border)',
    headerBorder:  'var(--border)',
    text:          'var(--text-2)',
    textStrong:    'var(--text)',
    textSub:       'var(--text-3)',
    avatarBg:      'var(--primary-pale)',
    avatarText:    'var(--primary)',
    userSectionBg: 'var(--surface-2)',
  };

  const NavContent = () => (
    <>
      {/* ── Brand header ─────────────────── */}
      <div style={{
        padding: '20px 16px 18px',
        borderBottom: `1px solid ${sidebarStyles.headerBorder}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34,
            background: 'var(--primary)',
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(5,150,105,0.35)',
            flexShrink: 0,
          }}>
            <GraduationCap size={17} color="white" strokeWidth={2.2} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 14.5,
              lineHeight: 1.15,
              color: sidebarStyles.textStrong,
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
            }}>
              Homeschool Hub
            </div>
            {schoolName && (
              <div style={{
                fontSize: 10.5,
                color: sidebarStyles.textSub,
                fontWeight: 500,
                marginTop: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 150,
              }}>
                {schoolName}
              </div>
            )}
          </div>
        </div>
        <button className="sidebar-close-btn" onClick={() => setMobileOpen(false)}>
          <X size={18} />
        </button>
      </div>

      {/* ── Navigation ───────────────────── */}
      <nav style={{
        flex: 1,
        padding: '10px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        overflowY: 'auto',
      }}>
        {/* Nav label */}
        <div style={{
          fontSize: 10,
          fontWeight: 700,
          color: sidebarStyles.textSub,
          letterSpacing: '0.07em',
          textTransform: 'uppercase',
          padding: '8px 6px 4px',
          marginTop: 2,
        }}>
          Navigation
        </div>
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            style={({ isActive }) => ({
              color: isActive ? (isDark ? 'var(--primary-light)' : 'var(--primary)') : sidebarStyles.text,
              background: isActive
                ? (isDark ? 'rgba(52,211,153,0.12)' : 'var(--primary-pale)')
                : undefined,
            })}
          >
            <item.icon size={16} strokeWidth={isActive => isActive ? 2.2 : 1.8} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* ── User section ─────────────────── */}
      <div style={{
        padding: '10px 10px 14px',
        borderTop: `1px solid ${sidebarStyles.borderColor}`,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 10px',
          borderRadius: 'var(--radius-sm)',
          background: sidebarStyles.userSectionBg,
          marginBottom: 4,
        }}>
          <div style={{
            width: 32, height: 32,
            borderRadius: '50%',
            background: sidebarStyles.avatarBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700,
            color: sidebarStyles.avatarText,
            flexShrink: 0,
            letterSpacing: '-0.01em',
          }}>
            {displayName?.[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 13,
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: sidebarStyles.textStrong,
            }}>
              {displayName}
            </div>
            <div style={{ fontSize: 11, color: sidebarStyles.textSub, marginTop: 1 }}>
              Family account
            </div>
          </div>
        </div>
        <button
          className="nav-item nav-item--danger"
          onClick={handleLogout}
          style={{ fontSize: 13, marginTop: 2 }}
        >
          <LogOut size={15} />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <>
      <aside
        className="sidebar sidebar-desktop-panel"
        style={{ background: sidebarBg }}
      >
        <NavContent />
      </aside>

      {/* Mobile top bar */}
      <div className="mobile-topbar">
        <button className="hamburger-btn" onClick={() => setMobileOpen(true)}>
          <Menu size={22} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, background: 'var(--primary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GraduationCap size={14} color="white" />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>Homeschool Hub</span>
        </div>
        <div style={{ width: 36 }} />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
          <aside className="sidebar sidebar-drawer" style={{ background: sidebarBg }}>
            <NavContent />
          </aside>
        </>
      )}
    </>
  );
}
