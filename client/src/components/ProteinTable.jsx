import React from 'react';
import { Link } from 'react-router-dom';
import {
  TextField,
  InputAdornment,
  Tooltip,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DownloadIcon from '@mui/icons-material/Download';

export default function ProteinTable({
  tableSpeciesFilter,
  setTableSpeciesFilter,
  processedRows,
  tableSearch,
  setTableSearch,
  tableLoading,
  tableError,
  total,
  page,
  totalPages,
  fetchPage,
  onSort,
  sortIcon,
  selectedDatasets,
  selectedOverlaps,
}) {
  const downloadCSV = () => {
    const headers = ['HVO ID', 'UniProt ID', 'PSMs', 'Coverage (%)', 'Datasets', 'Modifications', 'Description'];
    const csvRows = [headers.join(',')];

    processedRows.forEach(r => {
      const datasets = Array.isArray(r.datasets) ? r.datasets.join('; ') : '';
      const modifications = Array.isArray(r.modifications) ? r.modifications.join('; ') : '';
      const description = (r.description || '').replace(/,/g, ';');
      csvRows.push([
        r.hvoId || '',
        r.uniProtId || '',
        r.psmCount ?? '',
        Number.isFinite(r.coveragePercent) ? r.coveragePercent.toFixed(1) : '',
        datasets,
        modifications,
        description
      ].join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `proteins_${tableSpeciesFilter.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ maxWidth: 1150, margin: '0 auto 40px auto', background: 'white', borderRadius: 16, boxShadow: '0 8px 24px rgba(2,12,27,.08)', border: '1px solid #e8eef7', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px 18px', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ fontWeight: 700, color: '#0b1b3a', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span>Proteins</span>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Filter by Species</InputLabel>
            <Select value={tableSpeciesFilter} label="Filter by Species" onChange={(e) => setTableSpeciesFilter(e.target.value)}>
              <MenuItem value="Haloferax volcanii">Haloferax volcanii</MenuItem>
            </Select>
          </FormControl>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          <TextField
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            placeholder="Search all proteins..."
            size="small"
            InputProps={{
              startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>),
              endAdornment: tableLoading && tableSearch ? (
                <InputAdornment position="end">
                  <div style={{ fontSize: 11, color: '#0ea5e9', fontWeight: 600 }}>Searching...</div>
                </InputAdornment>
              ) : null
            }}
          />
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={downloadCSV}
            disabled={processedRows.length === 0}
          >
            CSV
          </Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '120px 120px 80px 100px 180px 180px 1fr', gap: 12, padding: '10px 18px', color: '#5b6a83', borderTop: '1px solid #eef2f9', borderBottom: '1px solid #eef2f9', fontWeight: 600 }}>
        <div style={{ cursor: 'pointer' }} onClick={() => onSort('hvoId')}>HVO {sortIcon('hvoId')}</div>
        <div style={{ cursor: 'pointer' }} onClick={() => onSort('uniProtId')}>UniProt ID {sortIcon('uniProtId')}</div>
        <div style={{ cursor: 'pointer' }} onClick={() => onSort('psmCount')}>PSMs {sortIcon('psmCount')}</div>
        <div style={{ cursor: 'pointer' }} onClick={() => onSort('coveragePercent')}>Coverage {sortIcon('coveragePercent')}</div>
        <div>Datasets</div>
        <div>Modifications</div>
        <div>Description</div>
      </div>

      {tableLoading ? (
        <div style={{ padding: 18, color: '#5b6a83' }}>Loading...</div>
      ) : tableError ? (
        <div style={{ padding: 18, color: '#b91c1c' }}>{tableError}</div>
      ) : processedRows.length === 0 ? (
        <div style={{ padding: 18, color: '#5b6a83' }}>No rows.</div>
      ) : (
        processedRows.map((r) => {
          const datasets = Array.isArray(r.datasets) && r.datasets.length ? r.datasets : [];
          const displayDatasets = datasets.slice(0, 2);
          const moreDatasetCount = datasets.length - 2;

          const modifications = Array.isArray(r.modifications) && r.modifications.length ? r.modifications : [];
          const displayMods = modifications.slice(0, 2);
          const moreModCount = modifications.length - 2;

          return (
            <div
              key={r.hvoId}
              style={{
                display: 'grid',
                gridTemplateColumns: '120px 120px 80px 100px 180px 180px 1fr',
                gap: 12,
                padding: '12px 18px',
                borderBottom: '1px solid #eff3fa',
                alignItems: 'center',
                transition: 'all 0.2s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(90deg, #f0f9ff 0%, #e0f2fe 100%)';
                e.currentTarget.style.transform = 'scale(1.01)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(14, 165, 233, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div>
                <Link
                  to={`/plot/${r.hvoId}`}
                  style={{ color: '#3366ff', textDecoration: 'none', fontWeight: 500 }}
                >
                  {r.hvoId}
                </Link>
              </div>
              <div style={{ fontSize: 14, color: '#5b6a83' }}>{r.uniProtId || '\u2014'}</div>
              <div style={{ fontSize: 14 }}>{r.psmCount ?? '\u2014'}</div>
              <div style={{ fontSize: 14 }}>
                {Number.isFinite(r.coveragePercent) ? `${r.coveragePercent.toFixed(1)}%` : '\u2014'}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                {datasets.length === 0 ? (
                  <span style={{ fontSize: 14, color: '#94a3b8' }}>{'\u2014'}</span>
                ) : (
                  <>
                    {displayDatasets.map((ds, idx) => (
                      <Chip
                        key={idx}
                        label={ds}
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: 11,
                          backgroundColor: '#e0f2fe',
                          color: '#0369a1',
                          fontWeight: 500
                        }}
                      />
                    ))}
                    {moreDatasetCount > 0 && (
                      <Tooltip
                        title={
                          <div style={{ padding: 4 }}>
                            {datasets.slice(2).map((ds, idx) => (
                              <div key={idx} style={{ padding: '2px 0', fontSize: 12 }}>{ds}</div>
                            ))}
                          </div>
                        }
                        arrow
                        placement="top"
                      >
                        <span style={{
                          fontSize: 11,
                          color: '#3366ff',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          textDecorationStyle: 'dotted'
                        }}>
                          +{moreDatasetCount} more
                        </span>
                      </Tooltip>
                    )}
                  </>
                )}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                {modifications.length === 0 ? (
                  <span style={{ fontSize: 14, color: '#94a3b8' }}>{'\u2014'}</span>
                ) : (
                  <>
                    {displayMods.map((mod, idx) => (
                      <Chip
                        key={idx}
                        label={mod}
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: 11,
                          backgroundColor: '#fef3c7',
                          color: '#92400e',
                          fontWeight: 500
                        }}
                      />
                    ))}
                    {moreModCount > 0 && (
                      <Tooltip
                        title={
                          <div style={{ padding: 4 }}>
                            {modifications.slice(2).map((mod, idx) => (
                              <div key={idx} style={{ padding: '2px 0', fontSize: 12 }}>{mod}</div>
                            ))}
                          </div>
                        }
                        arrow
                        placement="top"
                      >
                        <span style={{
                          fontSize: 11,
                          color: '#92400e',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          textDecorationStyle: 'dotted'
                        }}>
                          +{moreModCount} more
                        </span>
                      </Tooltip>
                    )}
                  </>
                )}
              </div>

              <div
                style={{
                  fontSize: 14,
                  color: '#475569',
                  lineHeight: 1.4,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                title={r.description || ''}
              >
                {r.description || '\u2014'}
              </div>
            </div>
          );
        })
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 12px', borderTop: '1px solid #eff3fa' }}>
        <IconButton
          onClick={() => fetchPage(page - 1, tableSearch, tableSpeciesFilter, selectedDatasets, selectedOverlaps)}
          disabled={page <= 1 || tableLoading}
          size="small"
        >
          <ChevronLeftIcon />
        </IconButton>
        <div style={{ fontSize: 14, color: '#5b6a83' }}>
          Page {page} / {totalPages} - Showing {processedRows.length} of {total}
        </div>
        <IconButton
          onClick={() => fetchPage(page + 1, tableSearch, tableSpeciesFilter, selectedDatasets, selectedOverlaps)}
          disabled={page >= totalPages || tableLoading}
          size="small"
        >
          <ChevronRightIcon />
        </IconButton>
      </div>
    </div>
  );
}
