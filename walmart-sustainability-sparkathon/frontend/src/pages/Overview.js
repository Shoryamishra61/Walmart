import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import './Overview.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function Overview() {
  const [kpiData, setKpiData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchKpis = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await fetch('http://localhost:3001/api/inventory/kpis');
        if (!response.ok) {
          throw new Error('Failed to connect to the GreenShelf service. Is it running?');
        }
        const data = await response.json();
        setKpiData(data);
      } catch (err) {
        console.error("Failed to fetch KPIs:", err);
        setError(err.message);
      }
      setIsLoading(false);
    };
    fetchKpis();
  }, []);

  // Show a loading message while fetching
  if (isLoading) {
    return <div className="page-container"><h1>Loading Executive Dashboard...</h1></div>;
  }

  // Show an error message if the fetch failed
  if (error) {
      return <div className="page-container"><h1>Error</h1><p>{error}</p></div>;
  }
  
  // This check prevents the crash. If kpiData exists but chartData doesn't, we know something is wrong.
  const isChartDataAvailable = kpiData && kpiData.chartData && kpiData.chartData.labels;

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Financial Impact: Waste Costs vs. Recovered Revenue (YTD)' },
    },
    scales: {
        y: { ticks: { callback: value => `$${value.toLocaleString()}` } }
    }
  };

  const chartData = isChartDataAvailable ? {
    labels: kpiData.chartData.labels,
    datasets: [
      {
        label: 'Waste-related Costs',
        data: kpiData.chartData.wasteCosts,
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      },
      {
        label: 'Recovered Revenue',
        data: kpiData.chartData.recoveredRevenue,
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
      },
    ],
  } : {};

  return (
    <div className="page-container">
      <h1 className="page-title">Executive Overview</h1>
      <div className="kpi-grid">
        <div className="kpi-card">
          <h2>Waste Diverted</h2>
          <p>{parseInt(kpiData.wasteDiverted || 0).toLocaleString()} <span>tons</span></p>
        </div>
        <div className="kpi-card">
          <h2>Revenue Recovered</h2>
          <p>${parseFloat(kpiData.revenueRecovered || 0).toLocaleString()} <span>USD</span></p>
        </div>
        <div className="kpi-card">
          <h2>CO₂ Reduction (Est.)</h2>
          <p>{parseInt(kpiData.co2Reduction || 0).toLocaleString()} <span>tons</span></p>
        </div>
        <div className="kpi-card">
          <h2>Meals Donated</h2>
          <p>{parseInt(kpiData.mealsDonated || 0).toLocaleString()}</p>
        </div>
      </div>
      
      <div className="chart-container">
        {isChartDataAvailable ? (
            <Bar options={chartOptions} data={chartData} />
        ) : (
            <div className="chart-placeholder">Chart data could not be loaded.</div>
        )}
      </div>
    </div>
  );
}

export default Overview;
