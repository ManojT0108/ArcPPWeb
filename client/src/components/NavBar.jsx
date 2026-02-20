import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useTheme } from '../ThemeContext';

export default function NavBar() {
  const { isDark, toggleTheme } = useTheme();

  const link = {
    fontSize: 18,
    color: isDark ? '#89a2c0' : '#55607a',
    textDecoration: 'none',
  };
  const active = { color: isDark ? '#e6edf7' : '#0f172a' };

  return (
    <nav style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '24px 24px 0'
    }}>
      <Link to="/" style={{ display: 'flex', gap: 8, alignItems: 'center', textDecoration: 'none' }}>
        <span style={{ fontSize: 20 }}>🌐</span>
        <div style={{ lineHeight: 1.1 }}>
          <div style={{ fontSize: 20, fontWeight: 600, color: isDark ? '#e6edf7' : '#0f172a' }}>Archaeal</div>
          <div style={{ fontSize: 15, color: isDark ? '#6b7280' : '#6b7280', marginTop: -2 }}>Proteome Project</div>
        </div>
      </Link>

      <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
        <NavLink to="/" style={({ isActive }) => ({ ...link, ...(isActive ? active : null) })}>
          Home
        </NavLink>
        <NavLink to="/datasets" style={({ isActive }) => ({ ...link, ...(isActive ? active : null) })}>
          Datasets
        </NavLink>
        <button
          onClick={toggleTheme}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{
            background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)'}`,
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 16,
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
          }}
        >
          {isDark ? '☀️' : '🌙'}
        </button>
      </div>
    </nav>
  );
}
