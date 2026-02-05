import React from 'react';

export default function MiniCardDark({ label, value, fullHeight, link }) {
  return (
    <div
      style={{
        position: 'relative',
        borderRadius: 18,
        padding: '18px 20px',
        background: 'linear-gradient(180deg, rgba(26,34,54,.65), rgba(9,13,25,.65))',
        border: '1px solid rgba(255,255,255,0.10)',
        boxShadow: '0 12px 34px rgba(0,0,0,.55)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        overflow: 'hidden',
        height: fullHeight ? '100%' : 'auto',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <div
        aria-hidden
        style={{
          content: '""',
          position: 'absolute',
          inset: -1,
          borderRadius: 20,
          pointerEvents: 'none',
          background:
            'radial-gradient(120% 180% at 50% 0%, rgba(255,255,255,.06), rgba(255,255,255,0) 55%), linear-gradient(180deg, rgba(255,255,255,.045), rgba(255,255,255,0))',
          mixBlendMode: 'screen',
        }}
      />
      <div style={{ position: 'relative' }}>
        <div style={{
          fontSize: 11,
          letterSpacing: '0.08em',
          color: '#7e92b5',
          marginBottom: 8,
          fontWeight: 500,
          textTransform: 'uppercase'
        }}>
          {label}
        </div>
        <div style={{
          color: '#e6edf7',
          fontWeight: 600,
          wordBreak: 'break-word',
          fontSize: 16,
          lineHeight: 1.3
        }}>
          {link ? (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#5b8df3',
                textDecoration: 'none',
                transition: 'all 0.2s ease',
                borderBottom: '1px dashed rgba(91, 141, 243, 0.4)'
              }}
              onMouseEnter={(e) => {
                e.target.style.color = '#7ca5f5';
                e.target.style.borderBottomStyle = 'solid';
              }}
              onMouseLeave={(e) => {
                e.target.style.color = '#5b8df3';
                e.target.style.borderBottomStyle = 'dashed';
              }}
            >
              {value} ↗
            </a>
          ) : (
            value
          )}
        </div>
      </div>
    </div>
  );
}
