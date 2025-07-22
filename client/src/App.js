import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './HomePage';
import ProteinPlotPage from './pages/ProteinPlotPage'; // ✅ Match this path

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/plot/:hvoId" element={<ProteinPlotPage />} />
      </Routes>
    </Router>
  );
}

export default App;
