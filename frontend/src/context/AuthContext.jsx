import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

const DEFAULT_PREFS = {
  theme_color: '#2D6A4F',
  bg_color: '#F7F5F0',
  accent_color: '#F4A261',
  sidebar_color: '#FFFFFF',
  font_style: 'default',
  display_name: '',
};

function applyPreferences(prefs) {
  const p = { ...DEFAULT_PREFS, ...prefs };
  const root = document.documentElement;
  root.style.setProperty('--primary', p.theme_color);
  root.style.setProperty('--bg', p.bg_color);
  root.style.setProperty('--accent', p.accent_color);
  root.style.setProperty('--surface', p.sidebar_color);

  // Derive lighter shades from primary colour
  root.style.setProperty('--primary-light', p.theme_color + 'CC');
  root.style.setProperty('--primary-pale', p.theme_color + '22');
  root.style.setProperty('--accent-light', p.accent_color + '33');
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });
  const [preferences, setPreferences] = useState(() => {
    try { return JSON.parse(localStorage.getItem('preferences')) || DEFAULT_PREFS; } catch { return DEFAULT_PREFS; }
  });

  // Apply preferences on load and whenever they change
  useEffect(() => {
    applyPreferences(preferences);
  }, [preferences]);

  async function login(username, password) {
    const res = await api.post('/auth/login', { username, password });
    const { token, user: userData, preferences: prefs } = res.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    const mergedPrefs = { ...DEFAULT_PREFS, ...prefs };
    localStorage.setItem('preferences', JSON.stringify(mergedPrefs));
    setUser(userData);
    setPreferences(mergedPrefs);
    applyPreferences(mergedPrefs);
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

  return (
    <AuthContext.Provider value={{
      user,
      preferences,
      login,
      logout,
      savePreferences,
      isAdmin: user?.role === 'admin',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
