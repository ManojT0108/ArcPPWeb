import React from 'react';

export default function GlassCard({ title, children, style, className = '', variant = 'dark' }) {
  const isLight = variant === 'light';

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        borderRadius: 18,
        padding: isLight ? '16px 18px' : '20px 24px',
        background: isLight
          ? 'linear-gradient(180deg, rgba(255,255,255,.66), rgba(240,245,255,.55))'
          : 'linear-gradient(180deg, rgba(26,34,54,.65), rgba(9,13,25,.65))',
        border: `1px solid rgba(255,255,255,${isLight ? '0.12' : '0.10'})`,
        boxShadow: isLight
          ? '0 10px 30px rgba(0,0,0,.35)'
          : '0 12px 34px rgba(0,0,0,.55)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        overflow: 'hidden',
        ...style,
      }}
    >
      {!isLight && (
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
      )}
      {title && (
        <div
          style={{
            position: 'relative',
            fontWeight: 600,
            color: isLight ? '#001833' : '#e5e7eb',
            margin: isLight ? '4px 6px 12px 6px' : '0 0 12px 0',
          }}
        >
          {title}
        </div>
      )}
      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  );
}
