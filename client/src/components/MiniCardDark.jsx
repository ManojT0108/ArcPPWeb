import React from 'react';

export default function MiniCardDark({ label, value, fullHeight, link, variant = 'dark' }) {
  const isLight = variant === 'light';

  return (
    <div style={{
      position: 'relative',
      borderRadius: 14,
      padding: '16px 18px',
      background: isLight
        ? 'linear-gradient(180deg, #ffffff, #f7fafc)'
        : 'linear-gradient(180deg, rgba(20,29,45,0.96), rgba(13,20,32,0.96))',
      border: isLight ? '1px solid #dbe4ea' : '1px solid rgba(198,218,236,0.14)',
      boxShadow: isLight ? '0 8px 18px rgba(23, 42, 57, 0.07)' : '0 8px 18px rgba(2, 8, 18, 0.42)',
      overflow: 'hidden',
      height: fullHeight ? '100%' : 'auto',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
    }}>
      {!isLight && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background:
              'radial-gradient(150% 110% at 50% -20%, rgba(181,212,238,0.14), rgba(181,212,238,0) 56%)',
          }}
        />
      )}
      <div style={{ position: 'relative' }}>
        <div style={{
          fontSize: 11,
          letterSpacing: '0.07em',
          color: isLight ? '#64748b' : '#9bb2c8',
          marginBottom: 8,
          fontWeight: 600,
          textTransform: 'uppercase',
        }}>
          {label}
        </div>
        <div style={{
          color: isLight ? '#122538' : '#e5edf7',
          fontWeight: 600,
          wordBreak: 'break-word',
          fontSize: 16,
          lineHeight: 1.35,
        }}>
          {link ? (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: isLight ? '#315f86' : '#9fc3de',
                textDecoration: 'none',
                borderBottom: `1px dashed ${isLight ? 'rgba(49,95,134,0.5)' : 'rgba(159,195,222,0.55)'}`,
              }}
            >
              {value} ↗
            </a>
          ) : value}
        </div>
      </div>
    </div>
  );
}
