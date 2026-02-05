import React from 'react';
import { Link, NavLink } from 'react-router-dom';

const link = {
  fontSize: 18,
  color: '#55607a',
  textDecoration: 'none',
};
const active = { color: '#0f172a' }; // darker when active

export default function NavBar() {
  return (
    <nav style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '24px 24px 0'
    }}>
      <Link to="/" style={{ display:'flex', gap:8, alignItems:'center', textDecoration:'none' }}>
        <span style={{ fontSize:20 }}>🌐</span>
        <div style={{ lineHeight:1.1 }}>
          <div style={{ fontSize:20, fontWeight:600, color:'#0f172a' }}>Archaeal</div>
          <div style={{ fontSize:15, color:'#6b7280', marginTop:-2 }}>Proteome Project</div>
        </div>
      </Link>

      <div style={{ display:'flex', gap:20 }}>
        <NavLink to="/" style={({isActive}) => ({ ...link, ...(isActive ? active : null) })}>
          Home
        </NavLink>
        <NavLink to="/datasets" style={({isActive}) => ({ ...link, ...(isActive ? active : null) })}>
          Datasets
        </NavLink>
      </div>
    </nav>
  );
}
