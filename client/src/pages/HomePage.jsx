import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../ThemeContext';
import {
  Autocomplete,
  TextField,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { BarChart } from '@mui/x-charts/BarChart';

import { filterModifications } from '../constants/modifications';
import CoverageOverview from '../components/CoverageOverview';
import DatasetCharts from '../components/DatasetCharts';
import ProteinTable from '../components/ProteinTable';

const PAGE_SIZE = 25;

export default function HomePage() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const speciesCoverageChartRef = useRef(null);
  const speciesProteinCountChartRef = useRef(null);

  const inputSx = {
    width: '100%',
    borderRadius: '12px',
    backgroundColor: isDark ? '#17253a' : '#ffffff',
    '& .MuiOutlinedInput-root': {
      borderRadius: '12px',
      color: isDark ? '#e6edf7' : '#142434',
      '& fieldset': { borderColor: isDark ? 'rgba(177,207,231,0.2)' : '#cbd8e1' },
      '&:hover fieldset': { borderColor: isDark ? 'rgba(177,207,231,0.36)' : '#9eb6c8' },
      '&.Mui-focused fieldset': { borderColor: isDark ? '#8fb6d1' : '#6c91ae' },
    },
    '& .MuiInputBase-input': { fontSize: 15, color: isDark ? '#e6edf7' : '#142434' },
    '& .MuiInputLabel-root': { color: isDark ? '#9db4cc' : '#5e7283' },
    '& .MuiInputLabel-root.Mui-focused': { color: isDark ? '#9fc2dc' : '#567d9c' },
    '& .MuiSvgIcon-root': { color: isDark ? '#9db4cc' : '#6d8191' },
    '& .MuiAutocomplete-popupIndicator': { color: isDark ? '#9db4cc' : '#6d8191' },
    '& .MuiAutocomplete-clearIndicator': { color: isDark ? '#9db4cc' : '#6d8191' },
  };
  const controlLabelStyle = {
    fontSize: 13,
    color: isDark ? '#8fa6bc' : '#607485',
    marginBottom: 8,
    paddingLeft: 4,
    fontWeight: 600,
  };

  const [coverageData, setCoverageData] = useState([]);
  const [coverageLoading, setCoverageLoading] = useState(true);
  const speciesOptions = useMemo(
    () =>
      coverageData
        .filter((s) => s?.species)
        .map((s) => ({ label: s.species, value: s.species })),
    [coverageData]
  );
  const [speciesValue, setSpeciesValue] = useState(null);
  const [showTable, setShowTable] = useState(false);
  const [tableSpeciesFilter, setTableSpeciesFilter] = useState('');
  const [datasetStats, setDatasetStats] = useState([]);
  const [datasetOverlap, setDatasetOverlap] = useState([]);
  const [selectedDatasets, setSelectedDatasets] = useState([]);
  const [selectedOverlaps, setSelectedOverlaps] = useState([]);
  const [showDatasetGraphs, setShowDatasetGraphs] = useState(false);
  const [options, setOptions] = useState([]);
  const [optLoading, setOptLoading] = useState(false);
  const [picked, setPicked] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [tableError, setTableError] = useState('');
  const [tableSearch, setTableSearch] = useState('');
  const [sort, setSort] = useState({ key: 'hvoId', dir: 'asc' });

  useEffect(() => {
    const textColor = isDark ? '#f8fafc' : '#334155';
    const axisColor = isDark ? '#f8fafc' : '#64748b';
    const applyTo = (root) => {
      if (!root) return null;
      const apply = () => {
        root.querySelectorAll('text').forEach((el) => {
          el.setAttribute('fill', textColor);
          el.style.fill = textColor;
        });
        root.querySelectorAll('line, path').forEach((el) => {
          if (el.getAttribute('class')?.includes('MuiChartsAxis')) {
            el.setAttribute('stroke', axisColor);
            el.style.stroke = axisColor;
          }
        });
      };
      apply();
      const observer = new MutationObserver(apply);
      observer.observe(root, { childList: true, subtree: true });
      return observer;
    };

    const o1 = applyTo(speciesCoverageChartRef.current);
    const o2 = applyTo(speciesProteinCountChartRef.current);
    return () => {
      o1?.disconnect();
      o2?.disconnect();
    };
  }, [isDark, coverageData]);

  useEffect(() => {
    if (!speciesOptions.length) return;
    const exists = speciesValue && speciesOptions.some((s) => s.value === speciesValue.value);
    if (exists) return;

    const first = speciesOptions[0];
    setSpeciesValue(first);
    setTableSpeciesFilter(first.value);
    setShowTable(true);
    setShowDatasetGraphs(true);
  }, [speciesOptions, speciesValue]);

  const onSort = (key) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  };

  const sortIcon = (key) => sort.key !== key ? '\u2195' : sort.dir === 'asc' ? '\u2191' : '\u2193';
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchPage = async (nextPage, searchQuery = '', speciesFilter = '', datasetFilter = [], overlapFilter = []) => {
    const currentSpecies = speciesFilter || tableSpeciesFilter;
    if (!currentSpecies) return;

    const p = Math.max(1, Math.min(nextPage, totalPages || 1));
    setPage(p);
    setTableError('');
    try {
      setTableLoading(true);
      const offset = (p - 1) * PAGE_SIZE;
      let url = `/api/species/${encodeURIComponent(currentSpecies)}/proteins-summary?limit=${PAGE_SIZE}&offset=${offset}`;

      if (searchQuery.trim()) {
        url += `&search=${encodeURIComponent(searchQuery.trim())}`;
      }

      if (datasetFilter.length > 0) {
        url += `&datasets=${encodeURIComponent(JSON.stringify(datasetFilter))}`;
      }

      if (overlapFilter.length > 0) {
        url += `&overlaps=${encodeURIComponent(JSON.stringify(overlapFilter))}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load proteins');

      const filteredRows = (Array.isArray(data?.rows) ? data.rows : []).map(row => ({
        ...row,
        modifications: filterModifications(row.modifications)
      }));

      setRows(filteredRows);
      setTotal(data?.total ?? 0);
    } catch (e) {
      console.error(e);
      setTableError(e.message || 'Failed to fetch data');
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    if (tableSpeciesFilter) {
      fetchPage(1, tableSearch, tableSpeciesFilter, selectedDatasets, selectedOverlaps);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableSpeciesFilter, selectedDatasets, selectedOverlaps]);

  useEffect(() => {
    if (tableSpeciesFilter) {
      const timer = setTimeout(() => {
        setPage(1);
        fetchPage(1, tableSearch, tableSpeciesFilter, selectedDatasets, selectedOverlaps);
      }, 150);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableSearch]);

  const processedRows = useMemo(() => {
    const dir = sort.dir === 'asc' ? 1 : -1;
    const key = sort.key;
    const val = (row) => {
      if (key === 'hvoId') return row.hvoId || '';
      if (key === 'uniProtId') return row.uniProtId || '';
      if (key === 'psmCount') return row.psmCount ?? -1;
      if (key === 'coveragePercent') return row.coveragePercent ?? -1;
      return '';
    };
    return [...rows].sort((a, b) => {
      const A = val(a), B = val(b);
      if (A < B) return -1 * dir;
      if (A > B) return 1 * dir;
      return 0;
    });
  }, [rows, sort]);

  useEffect(() => {
    async function loadOptions() {
      setOptLoading(true);
      try {
        const res = await fetch('/api/proteins/ids');
        const data = await res.json();
        const allIds = [...(data.hvo || []), ...(data.uniprot || [])];
        setOptions(allIds.map((id) => ({ label: id, value: id })));
      } catch (err) {
        console.error('Failed to load options:', err);
      } finally {
        setOptLoading(false);
      }
    }
    loadOptions();
  }, []);

  useEffect(() => {
    async function loadCoverage() {
      try {
        setCoverageLoading(true);
        const res = await fetch('/api/species/coverage-stats');
        const data = await res.json();
        setCoverageData(data);
      } catch (err) {
        console.error('Error loading coverage data:', err);
      } finally {
        setCoverageLoading(false);
      }
    }
    loadCoverage();
  }, []);

  useEffect(() => {
    if (!speciesValue) return;
    async function loadDatasets() {
      try {
        const [statsRes, overlapRes] = await Promise.all([
          fetch(`/api/species/${encodeURIComponent(speciesValue.value)}/dataset-stats`),
          fetch(`/api/species/${encodeURIComponent(speciesValue.value)}/dataset-overlap`)
        ]);
        const stats = await statsRes.json();
        const overlap = await overlapRes.json();
        setDatasetStats(stats);
        setDatasetOverlap(overlap);
      } catch (err) {
        console.error('Error loading dataset stats:', err);
      }
    }
    loadDatasets();
  }, [speciesValue]);

  const speciesNames = coverageData.map((d) => d.species);
  const coveragePercents = coverageData.map((d) => d.coveragePercent || 0);
  const identifiedProteins = coverageData.map((d) => d.observedProteins || 0);
  const selectedSpeciesStats = coverageData.find((d) => d.species === speciesValue?.value) || null;
  const useAngledSpeciesTicks = speciesNames.length > 2;
  const speciesChartWidth = Math.max(520, Math.min(920, speciesNames.length * 170));
  const speciesTickStyle = useAngledSpeciesTicks
    ? { angle: -30, textAnchor: 'end', fontSize: 11 }
    : { angle: 0, textAnchor: 'middle', fontSize: 11 };
  const speciesBottomMargin = useAngledSpeciesTicks ? 96 : 68;

  return (
    <div style={{
      minHeight: '100vh',
      background: isDark ? '#0b1320' : '#f4f7f8'
    }}>
      <nav style={{
        background: isDark ? 'rgba(10,16,26,0.92)' : 'rgba(244,247,248,0.94)',
        padding: '14px 24px',
        boxShadow: isDark ? '0 1px 0 rgba(167,196,219,0.14)' : '0 1px 0 #d7e1e7',
        backdropFilter: 'blur(8px)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1200, margin: '0 auto' }}>
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 999,
              border: `1px solid ${isDark ? 'rgba(157,196,224,0.5)' : '#9bb6cb'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 600,
              color: isDark ? '#c5d8e7' : '#3e5e78',
              fontFamily: 'Newsreader, Georgia, serif',
            }}>A</div>
            <div style={{
              fontWeight: 700,
              fontSize: 23,
              color: isDark ? '#e5edf7' : '#122538',
              letterSpacing: '0.01em',
              fontFamily: 'Newsreader, Georgia, serif'
            }}>ArcPP</div>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              onClick={() => navigate('/datasets')}
              style={{
                padding: '8px 14px',
                background: isDark ? 'rgba(157,196,224,0.14)' : '#e6eef4',
                color: isDark ? '#d6e6f2' : '#2f5675',
                fontWeight: 600,
                fontSize: 13,
                border: `1px solid ${isDark ? 'rgba(157,196,224,0.28)' : '#c4d3df'}`,
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              Browse Datasets
            </div>
            <button
              onClick={toggleTheme}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{
                background: isDark ? 'rgba(157,196,224,0.12)' : '#edf3f7',
                border: `1px solid ${isDark ? 'rgba(157,196,224,0.28)' : '#c7d6e1'}`,
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 11,
                color: isDark ? '#c4d8e8' : '#466783',
                fontWeight: 700,
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isDark ? '☀' : '☾'}
            </button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '36px 24px' }}>
        <div style={{
          background: isDark ? 'linear-gradient(180deg, rgba(17,28,43,0.97), rgba(11,19,31,0.97))' : 'linear-gradient(180deg, #ffffff, #f7fafb)',
          borderRadius: 16,
          padding: '32px 36px',
          boxShadow: isDark ? '0 14px 28px rgba(3,9,16,0.44)' : '0 14px 28px rgba(17,39,58,0.08)',
          border: isDark ? '1px solid rgba(157,196,224,0.16)' : '1px solid #d7e1e7',
          marginBottom: 32
        }}>
          <h1 style={{
            fontSize: 34,
            fontWeight: 700,
            color: isDark ? '#e7eef8' : '#132334',
            margin: 0,
            marginBottom: 10,
            lineHeight: 1.1,
          }}>Archaeal Proteome Project</h1>
          <p style={{ fontSize: 15, color: isDark ? '#9cb0c4' : '#5f7282', margin: 0, maxWidth: 680, lineHeight: 1.5 }}>Explore protein coverage, modifications, and datasets across archaeal species.</p>

          <div style={{ marginTop: 32 }}>
            <CoverageOverview
              coverageData={coverageData}
              coverageLoading={coverageLoading}
              selectedSpecies={selectedSpeciesStats}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
              <div>
                <div style={controlLabelStyle}>Select a Species</div>
                <Autocomplete
                  disablePortal
                  options={speciesOptions}
                  value={speciesValue}
                  onChange={(e, v) => {
                    setSpeciesValue(v);
                    setShowTable(!!v);
                    setShowDatasetGraphs(!!v);
                    setTableSpeciesFilter(v?.value || '');
                  }}
                  renderInput={(params) => <TextField {...params} placeholder="Select species" sx={inputSx} />}
                  isOptionEqualToValue={(option, value) => option.value === value.value}
                  componentsProps={isDark ? { paper: { sx: { background: '#17223a', color: '#e6edf7', '& .MuiAutocomplete-option:hover': { background: 'rgba(255,255,255,0.08)' }, '& .MuiAutocomplete-option[aria-selected="true"]': { background: 'rgba(14,165,233,0.2)' } } } } : {}}
                />
              </div>
              <div>
                <div style={controlLabelStyle}>Search by Protein ID</div>
                <Autocomplete
                  disablePortal
                  options={options}
                  value={picked}
                  onChange={(e, v) => {
                    setPicked(v);
                    if (v?.value) navigate(`/plot/${v.value}`);
                  }}
                  loading={optLoading}
                  renderInput={(params) => <TextField {...params} placeholder="Enter HVO or UniProt ID" sx={inputSx} InputProps={{ ...params.InputProps, startAdornment: (<InputAdornment position="start"><SearchIcon sx={isDark ? { color: '#89a2c0' } : {}} /></InputAdornment>) }} />}
                  isOptionEqualToValue={(option, value) => option.value === value.value}
                  componentsProps={isDark ? { paper: { sx: { background: '#17223a', color: '#e6edf7', '& .MuiAutocomplete-option:hover': { background: 'rgba(255,255,255,0.08)' }, '& .MuiAutocomplete-option[aria-selected="true"]': { background: 'rgba(14,165,233,0.2)' } } } } : {}}
                />
              </div>
            </div>
          </div>

          {speciesValue && coverageData.length > 0 && (
            <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
              <div style={{
                background: isDark ? 'rgba(15,25,38,0.75)' : '#f7fafc',
                borderRadius: 14,
                padding: '20px 24px',
                border: isDark ? '1px solid rgba(157,196,224,0.14)' : '1px solid #d8e2e8',
              }}>
                <h3 style={{ fontSize: 20, fontWeight: 600, color: isDark ? '#e2e8f0' : '#132334', marginBottom: 4, textAlign: 'center' }}>Species Proteome Coverage</h3>
                <p style={{ fontSize: 13, color: isDark ? '#9cb0c4' : '#5f7282', marginBottom: 14, textAlign: 'center' }}>Click a bar to select species</p>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <div ref={speciesCoverageChartRef}>
                    <BarChart
                      xAxis={[{
                        data: speciesNames,
                        scaleType: 'band',
                        label: 'Species',
                        tickLabelStyle: speciesTickStyle,
                      }]}
                      yAxis={[{ label: 'Coverage (%)' }]}
                      series={[{
                        data: coveragePercents,
                        color: '#5f88ad',
                        valueFormatter: (value) => `${value.toFixed(1)}%`,
                      }]}
                      width={speciesChartWidth}
                      height={250}
                      margin={{ bottom: speciesBottomMargin, left: 56, right: 8, top: 10 }}
                      borderRadius={4}
                      slotProps={{ bar: { style: { cursor: 'pointer' } } }}
                      sx={{
                        '& .MuiChartsAxis-line, & .MuiChartsAxis-tick': { stroke: isDark ? '#f8fafc' : '#64748b' },
                        '& .MuiChartsAxis-tickLabel': { fill: isDark ? '#f8fafc' : '#334155' },
                      }}
                      onItemClick={(event, d) => {
                        const clickedSpecies = speciesNames[d.dataIndex];
                        if (!clickedSpecies) return;
                        setSpeciesValue({ label: clickedSpecies, value: clickedSpecies });
                        setTableSpeciesFilter(clickedSpecies);
                        setShowTable(true);
                        setShowDatasetGraphs(true);
                      }}
                    />
                  </div>
                </div>
              </div>

              <div style={{
                background: isDark ? 'rgba(15,25,38,0.75)' : '#f7fafc',
                borderRadius: 14,
                padding: '20px 24px',
                border: isDark ? '1px solid rgba(157,196,224,0.14)' : '1px solid #d8e2e8',
              }}>
                <h3 style={{ fontSize: 20, fontWeight: 600, color: isDark ? '#e2e8f0' : '#132334', marginBottom: 4, textAlign: 'center' }}>Identified Proteins by Species</h3>
                <p style={{ fontSize: 13, color: isDark ? '#9cb0c4' : '#5f7282', marginBottom: 14, textAlign: 'center' }}>Total proteins identified per species</p>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <div ref={speciesProteinCountChartRef}>
                    <BarChart
                      xAxis={[{
                        data: speciesNames,
                        scaleType: 'band',
                        label: 'Species',
                        tickLabelStyle: speciesTickStyle,
                      }]}
                      yAxis={[{ label: 'Identified proteins' }]}
                      series={[{
                        data: identifiedProteins,
                        color: '#4f9b7e',
                        valueFormatter: (value) => `${value.toLocaleString()} proteins`,
                      }]}
                      width={speciesChartWidth}
                      height={250}
                      margin={{ bottom: speciesBottomMargin, left: 56, right: 8, top: 10 }}
                      borderRadius={4}
                      sx={{
                        '& .MuiChartsAxis-line, & .MuiChartsAxis-tick': { stroke: isDark ? '#f8fafc' : '#64748b' },
                        '& .MuiChartsAxis-tickLabel': { fill: isDark ? '#f8fafc' : '#334155' },
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {showDatasetGraphs && speciesValue && (
            <DatasetCharts
              datasetStats={datasetStats}
              datasetOverlap={datasetOverlap}
              selectedDatasets={selectedDatasets}
              setSelectedDatasets={setSelectedDatasets}
              selectedOverlaps={selectedOverlaps}
              setSelectedOverlaps={setSelectedOverlaps}
            />
          )}
        </div>
      </div>

      {showTable && speciesValue && (
        <ProteinTable
          tableSpeciesFilter={tableSpeciesFilter}
          setTableSpeciesFilter={setTableSpeciesFilter}
          processedRows={processedRows}
          tableSearch={tableSearch}
          setTableSearch={setTableSearch}
          tableLoading={tableLoading}
          tableError={tableError}
          total={total}
          page={page}
          totalPages={totalPages}
          fetchPage={fetchPage}
          onSort={onSort}
          sortIcon={sortIcon}
          speciesOptions={speciesOptions}
          selectedDatasets={selectedDatasets}
          selectedOverlaps={selectedOverlaps}
        />
      )}
    </div>
  );
}
