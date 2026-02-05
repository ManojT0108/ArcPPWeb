// src/pages/DatasetsPage.jsx
import React, { useEffect, useState } from 'react';
import NavBar from '../components/NavBar';
import GlassCard from '../components/GlassCard';

const pageBg = {
  minHeight: '100vh',
  background:
    'radial-gradient(1400px 700px at 50% -10%, #10203f 0%, #0c162a 35%, #081322 100%)',
};

const linkDark = { color: '#8fb1ff', textDecoration: 'none' };

export default function DatasetsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

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
          <h1 style={{ fontSize: 40, fontWeight: 700, color: '#e6edf7' }}>
            Datasets
          </h1>
          <p style={{ color: '#89a2c0', marginTop: 6 }}>
            Title, Publication Details and Citations from ProteomeCentral.
          </p>
        </header>

        <GlassCard style={{ padding: '16px 18px' }}>
          {loading ? (
            <div style={{ color: '#89a2c0' }}>Loading...</div>
          ) : err ? (
            <div style={{ color: '#ef4444' }}>{err}</div>
          ) : rows.length === 0 ? (
            <div style={{ color: '#89a2c0' }}>No datasets found.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead>
                  <tr>
                    <Th style={{ width: 160 }}>Dataset ID</Th>
                    <Th>Title</Th>
                    <Th style={{ width: 460 }}>Publication &amp; Citation</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <Td mono>
                        <a href={r.sourceUrl} target="_blank" rel="noreferrer" style={linkDark}>
                          {r.id}
                        </a>
                      </Td>
                      <Td>{r.title || <span style={{ color: '#6b7fa5' }}>{'\u2014'}</span>}</Td>
                      <Td>
                        {r.firstPublicationRow ? (
                          <div style={{ marginBottom: 6 }}>{r.firstPublicationRow}</div>
                        ) : (
                          <span style={{ color: '#6b7fa5' }}>{'\u2014'}</span>
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
                                  background: 'rgba(143,177,255,0.12)',
                                  color: '#8fb1ff',
                                  fontSize: 12,
                                  textDecoration: 'none',
                                  border: '1px solid rgba(143,177,255,0.25)',
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

function Th({ children, style }) {
  return (
    <th
      style={{
        textAlign: 'left',
        padding: '12px 14px',
        fontSize: 12,
        letterSpacing: '0.06em',
        color: '#7e92b5',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        ...style,
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, mono }) {
  return (
    <td
      style={{
        padding: '12px 14px',
        color: '#e6edf7',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        verticalAlign: 'top',
        fontFamily: mono ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : undefined,
      }}
    >
      {children}
    </td>
  );
}
