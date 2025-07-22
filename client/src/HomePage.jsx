import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';
import { BarChart } from '@mui/x-charts/BarChart';

function HomePage() {
  const [hvoIds, setHvoIds] = useState([]);
  const navigate = useNavigate(); // ✅ For routing

  useEffect(() => {
    axios.get('/api/hvo-ids')
      .then(res => setHvoIds(res.data))
      .catch(err => console.error('Failed to fetch HVO IDs:', err));
  }, []);

  const handleHvoSelect = (e) => {
    const selectedId = e.target.value;
    navigate(`/plot/${selectedId}`); // ✅ Go to new page
  };

  return (
    <div className="homepage">
      <nav className="navbar">
        <div className="logo">
          <span className="logo-icon">🌐</span>
          <div className="logo-text">
            <div className="title-main">Archaeal</div>
            <div className="title-sub">Proteome Project</div>
          </div>
        </div>

        <div className="nav-links">
          <a href="#">Home</a>
          <a href="#">Species</a>
          <a href="#">Protein</a>
          <a href="#">Datasets</a>
          <a href="#">Resources</a>
        </div>
      </nav>

      <h1 className="main-title">Explore your favorite archaeal protein</h1>

      <div className="selectors">
        <select className="dropdown" defaultValue="">
          <option value="" disabled hidden>Species</option>
          <option value="Haloferax_volcanii">Haloferax volcanii</option>
        </select>

        <select className="dropdown" defaultValue="" onChange={handleHvoSelect}>
          <option value="" disabled hidden>HVO_xxxx</option>
          {hvoIds.map((id) => (
            <option key={id} value={id}>{id}</option>
          ))}
        </select>
      </div>

      <div className="search-bars">
        <input
          type="text"
          placeholder="Search Species"
          className="search-box"
        />
        <input
          type="text"
          placeholder="Search Peptides"
          className="search-box"
        />
      </div>

        <BarChart
          class="main-plot"
          xAxis={[
            {
              id: 'barCategories',
              data: ['bar A', 'bar B', 'bar C', 'bar D', 'bar E'],
            },
          ]}
          series={[
            {
              data: [2, 5, 3, 4, 2],
            },
          ]}
          height={300}
        />

        <div className='bottom-graphs'>
        <BarChart
          class="bottom-plot"
          xAxis={[
            {
              id: 'barCategories',
              data: ['bar A', 'bar B', 'bar C', 'bar D'],
            },
          ]}
          series={[
            {
              data: [2, 5, 3, 4],
            },
          ]}
          height={300}
        />

        <BarChart
          class="bottom-plot"
          xAxis={[
            {
              id: 'barCategories',
              data: ['bar A', 'bar B', 'bar C'],
            },
          ]}
          series={[
            {
              data: [2, 5, 3],
            },
          ]}
          height={300}
        />
        </div>
    </div>
  );
}

export default HomePage;
