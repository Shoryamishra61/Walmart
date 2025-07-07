import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Sidebar from './components/common/Sidebar';
import Overview from './pages/Overview';
import LiveOperations from './pages/LiveOperations';
import DemandForecasting from './pages/DemandForecasting';
import DonationManagement from './pages/DonationManagement';
// Import the new page
import CustomerInsights from './pages/CustomerInsights';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/operations" element={<LiveOperations />} />
            <Route path="/forecasting" element={<DemandForecasting />} />
            <Route path="/donations" element={<DonationManagement />} />
            {/* ---- NEW ROUTE ---- */}
            <Route path="/customers" element={<CustomerInsights />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;