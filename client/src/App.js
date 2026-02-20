import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './ThemeContext';
import HomePage from './pages/HomePage';
import DatasetsPage from './pages/DatasetsPage';
import ProteinPlotPage from './pages/ProteinPlotPage';

export default function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/datasets" element={<DatasetsPage />} />
          <Route path="/plot/:hvoId" element={<ProteinPlotPage />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}
