// src/pages/DatasetsPage.jsx
import React, { useEffect, useState } from 'react';
import NavBar from '../components/NavBar';
import GlassCard from '../components/GlassCard';
import { useTheme } from '../ThemeContext';

export default function DatasetsPage() {
  const { isDark } = useTheme();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const pageBg = {
    minHeight: '100vh',
    background: isDark ? '#0f172a' : '#f8fafc',
  };

  const linkStyle = { color: isDark ? '#8fb1ff' : '#0ea5e9', textDecoration: 'none' };

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/datasets/summaries');
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Failed to fetch dataset summaries');
        if (!cancel) setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancel) setErr(e.message || 'Something went wrong.');
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  return (
    <div style={pageBg}>
      <NavBar />

      <main style={{ maxWidth: 1120, margin: '0 auto', padding: '40px 24px 64px' }}>
        <header style={{ marginBottom: 18 }}>
          <h1 style={{ fontSize: 40, fontWeight: 700, color: isDark ? '#e6edf7' : '#0f172a' }}>
            Datasets
          </h1>
          <p style={{ color: isDark ? '#89a2c0' : '#64748b', marginTop: 6 }}>
            Title, Publication Details and Citations from ProteomeCentral.
          </p>
        </header>

        <GlassCard style={{ padding: '16px 18px' }} variant={isDark ? 'dark' : 'light'}>
          {loading ? (
            <div style={{ color: isDark ? '#89a2c0' : '#64748b' }}>Loading...</div>
          ) : err ? (
            <div style={{ color: '#ef4444' }}>{err}</div>
          ) : rows.length === 0 ? (
            <div style={{ color: isDark ? '#89a2c0' : '#64748b' }}>No datasets found.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead>
                  <tr>
                    <Th isDark={isDark} style={{ width: 160 }}>Dataset ID</Th>
                    <Th isDark={isDark}>Title</Th>
                    <Th isDark={isDark} style={{ width: 460 }}>Publication &amp; Citation</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <Td isDark={isDark} mono>
                        <a href={r.sourceUrl} target="_blank" rel="noreferrer" style={linkStyle}>
                          {r.id}
                        </a>
                      </Td>
                      <Td isDark={isDark}>{r.title || <span style={{ color: isDark ? '#6b7fa5' : '#94a3b8' }}>{'\u2014'}</span>}</Td>
                      <Td isDark={isDark}>
                        {r.firstPublicationRow ? (
                          <div style={{ marginBottom: 6 }}>{r.firstPublicationRow}</div>
                        ) : (
                          <span style={{ color: isDark ? '#6b7fa5' : '#94a3b8' }}>{'\u2014'}</span>
                        )}

                        {Array.isArray(r.citations) && r.citations.length > 0 && (
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {r.citations.map((c, idx) => (
                              <a
                                key={idx}
                                href={(c && c.url) || r.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  display: 'inline-block',
                                  padding: '2px 8px',
                                  borderRadius: 999,
                                  background: isDark ? 'rgba(143,177,255,0.12)' : 'rgba(14,165,233,0.1)',
                                  color: isDark ? '#8fb1ff' : '#0ea5e9',
                                  fontSize: 12,
                                  textDecoration: 'none',
                                  border: `1px solid ${isDark ? 'rgba(143,177,255,0.25)' : 'rgba(14,165,233,0.25)'}`,
                                }}
                                title={c?.label || 'citation'}
                              >
                                [{(c && c.label) || 'link'}]
                              </a>
                            ))}
                          </div>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      </main>
    </div>
  );
}

function Th({ children, style, isDark }) {
  return (
    <th
      style={{
        textAlign: 'left',
        padding: '12px 14px',
        fontSize: 12,
        letterSpacing: '0.06em',
        color: isDark ? '#7e92b5' : '#64748b',
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}`,
        ...style,
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, mono, isDark }) {
  return (
    <td
      style={{
        padding: '12px 14px',
        color: isDark ? '#e6edf7' : '#0f172a',
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        verticalAlign: 'top',
        fontFamily: mono ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : undefined,
      }}
    >
      {children}
    </td>
  );
}
