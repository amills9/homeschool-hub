import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

const DEFAULT_PREFS = {
  theme_color: '#2D6A4F', bg_color: '#F7F5F0', accent_color: '#F4A261',
  sidebar_color: '#FFFFFF', font_style: 'default', display_name: '',
};

function applyPreferences(prefs) {
  const p = { ...DEFAULT_PREFS, ...prefs };
  const r = document.documentElement;
  r.style.setProperty('--primary',       p.theme_color);
  r.style.setProperty('--bg',            p.bg_color);
  r.style.setProperty('--accent',        p.accent_color);
  r.style.setProperty('--surface',       p.sidebar_color);
  r.style.setProperty('--primary-light', p.theme_color + 'CC');
  r.style.setProperty('--primary-pale',  p.theme_color + '22');
  r.style.setProperty('--accent-light',  p.accent_color + '33');
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });
  const [preferences, setPreferences] = useState(() => {
    try { return JSON.parse(localStorage.getItem('preferences')) || DEFAULT_PREFS; } catch { return DEFAULT_PREFS; }
  });

  useEffect(() => { applyPreferences(preferences); }, [preferences]);

  async function login(username, password) {
    const res = await api.post('/auth/login', { username, password });
    const { token, user: userData, preferences: prefs } = res.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    const merged = { ...DEFAULT_PREFS, ...prefs };
    localStorage.setItem('preferences', JSON.stringify(merged));
    setUser(userData);
    setPreferences(merged);
    applyPreferences(merged);
    return userData;
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('preferences');
    setUser(null);
    setPreferences(DEFAULT_PREFS);
    applyPreferences(DEFAULT_PREFS);
  }

  async function savePreferences(newPrefs) {
    const merged = { ...preferences, ...newPrefs };
    await api.put('/auth/preferences', merged);
    localStorage.setItem('preferences', JSON.stringify(merged));
    setPreferences(merged);
    applyPreferences(merged);
  }

  async function updateState(newState) {
    await api.put('/auth/state', { state: newState });
    const updated = { ...user, state: newState };
    localStorage.setItem('user', JSON.stringify(updated));
    setUser(updated);
  }

  return (
    <AuthContext.Provider value={{ user, preferences, login, logout, savePreferences, updateState, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
