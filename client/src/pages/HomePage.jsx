import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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

const inputSx = {
  width: 360,
  backgroundColor: 'white',
  borderRadius: '10px',
  '& .MuiOutlinedInput-root': { borderRadius: '10px' },
  '& .MuiInputBase-input': { fontSize: 16 },
};

export default function HomePage() {
  const navigate = useNavigate();

  const speciesOptions = [{ label: 'Haloferax volcanii', value: 'Haloferax volcanii' }];
  const [speciesValue, setSpeciesValue] = useState(speciesOptions[0]);
  const [showTable, setShowTable] = useState(false);
  const [coverageData, setCoverageData] = useState([]);
  const [coverageLoading, setCoverageLoading] = useState(true);
  const [tableSpeciesFilter, setTableSpeciesFilter] = useState('Haloferax volcanii');
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

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f0f4fa 0%, #e8eef7 100%)' }}>
      <nav style={{
        background: 'white',
        padding: '18px 24px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        borderBottom: '1px solid #e0f2fe',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1200, margin: '0 auto' }}>
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              fontWeight: 700,
              color: 'white',
              boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)'
            }}>A</div>
            <div style={{
              fontWeight: 800,
              fontSize: 24,
              background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.02em'
            }}>ArcPP</div>
          </Link>

          <div
            onClick={() => navigate('/datasets')}
            style={{
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
              color: 'white',
              fontWeight: 600,
              fontSize: 14,
              borderRadius: 10,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(14, 165, 233, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(14, 165, 233, 0.3)';
            }}
          >
            Browse Datasets →
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px' }}>
        <div style={{
          background: 'white',
          borderRadius: 20,
          padding: 40,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
          border: '1px solid #e8eef7',
          marginBottom: 40
        }}>
          <h1 style={{
            fontSize: 38,
            fontWeight: 800,
            background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            margin: 0,
            marginBottom: 12,
            letterSpacing: '-0.02em'
          }}>Archaeal Proteome Project</h1>
          <p style={{ fontSize: 16, color: '#64748b', margin: 0, fontWeight: 500 }}>Explore protein coverage, modifications, and datasets across archaeal species.</p>

          <div style={{ marginTop: 32 }}>
            <CoverageOverview coverageData={coverageData} coverageLoading={coverageLoading} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
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
                renderInput={(params) => <TextField {...params} label="Select a Species" sx={inputSx} />}
                isOptionEqualToValue={(option, value) => option.value === value.value}
              />
              <Autocomplete
                disablePortal
                options={options}
                value={picked}
                onChange={(e, v) => {
                  setPicked(v);
                  if (v?.value) navigate(`/plot/${v.value}`);
                }}
                loading={optLoading}
                renderInput={(params) => <TextField {...params} label="Search by Protein ID" sx={inputSx} InputProps={{ ...params.InputProps, startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>) }} />}
                isOptionEqualToValue={(option, value) => option.value === value.value}
              />
            </div>
          </div>

          {/* Species Coverage Chart */}
          {speciesValue && coverageData.length > 0 && coverageData[0] && (
            <div style={{ marginTop: 28, display: 'flex', justifyContent: 'center' }}>
              <div style={{
                background: 'white',
                borderRadius: 20,
                padding: '40px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                border: '2px solid #e8eef7',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                maxWidth: 900,
                width: '100%'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px)';
                e.currentTarget.style.boxShadow = '0 16px 48px rgba(88, 145, 237, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.1)';
              }}>
                <h3 style={{ fontSize: 24, fontWeight: 700, color: '#0b1b3a', marginBottom: 10, textAlign: 'center' }}>Species Proteome Coverage</h3>
                <p style={{ fontSize: 14, color: '#64748b', marginBottom: 32, textAlign: 'center' }}>Click on a bar to explore proteins</p>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <BarChart
                    xAxis={[{
                      id: 'barCategories',
                      data: ['Haloferax volcanii', 'Halobacterium salinarum', 'Sulfolobus solfataricus', 'Methanococcus maripaludis'],
                      scaleType: 'band',
                      tickLabelStyle: { angle: -20, textAnchor: 'end', fontSize: 13 }
                    }]}
                    series={[{
                      data: [
                        coverageData[0].coveragePercent || 0,
                        0,
                        0,
                        0
                      ],
                      label: 'Coverage (%)',
                      color: '#5891ed',
                      highlightScope: { highlighted: 'item', faded: 'global' },
                      valueFormatter: (value) => value > 0 ? `${value.toFixed(1)}%` : 'Coming soon'
                    }]}
                    height={320}
                    width={700}
                    yAxis={[{ label: 'Coverage (%)' }]}
                    margin={{ bottom: 90, left: 70, right: 20, top: 30 }}
                    borderRadius={10}
                    slotProps={{
                      bar: {
                        style: { cursor: 'pointer', rx: 10 }
                      }
                    }}
                    onItemClick={(event, d) => {
                      if (d.dataIndex === 0 && coverageData[0].coveragePercent > 0) {
                        setShowTable(true);
                        setShowDatasetGraphs(true);
                      }
                    }}
                  />
                </div>

                <div style={{ marginTop: 24, padding: '16px 20px', background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', borderRadius: 12, border: '2px solid #bae6fd', textAlign: 'center' }}>
                  <div style={{ fontSize: 14, color: '#0c4a6e', marginBottom: 6 }}>
                    <strong style={{ color: '#0369a1' }}>Click the Haloferax volcanii bar</strong> to explore detailed protein table and dataset analysis
                  </div>
                  <div style={{ fontSize: 12, color: '#0284c7', fontStyle: 'italic' }}>
                    More species coming soon!
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
          selectedDatasets={selectedDatasets}
          selectedOverlaps={selectedOverlaps}
        />
      )}
    </div>
  );
}
