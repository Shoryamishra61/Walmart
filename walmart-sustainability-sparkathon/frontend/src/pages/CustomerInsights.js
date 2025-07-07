import React, { useState, useEffect } from 'react';
import './Overview.css'; // Reusing styles from Overview page for consistency
import './DemandForecasting.css'; // Reusing styles from Forecasting page

function CustomerInsights() {
  const [prediction, setPrediction] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [customerId, setCustomerId] = useState('12345');
  const [error, setError] = useState('');

  const fetchPrediction = async (id) => {
    setIsLoading(true);
    setPrediction(null);
    setError('');
    try {
      const response = await fetch(`http://localhost:3002/api/customer/${id}/prediction`);
      if (!response.ok) {
        throw new Error(`Could not get prediction for customer ${id}.`);
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setPrediction(data);
    } catch (err) {
      console.error("Failed to fetch prediction", err);
      setError(err.message);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchPrediction(customerId);
  }, [customerId]);

  return (
    <div className="page-container">
      <h1 className="page-title">AI-Powered Customer Insights</h1>
      
      <div className="forecast-controls" style={{maxWidth: '500px', marginBottom: '2rem'}}>
          <label>Select Customer to Analyze</label>
          <select value={customerId} onChange={e => setCustomerId(e.target.value)}>
              <option value="12345">Jane Doe (ID: 12345)</option>
              {/* In our simulation, only customer 12345 has frequent items defined */}
              <option value="67890">John Smith (ID: 67890)</option>
          </select>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card" style={{gridColumn: '1 / -1', textAlign: 'center'}}>
            <h2>Next Predicted Purchase</h2>
            {isLoading && <p>Calculating...</p>}
            {error && <p style={{color: 'red'}}>{error}</p>}
            {prediction && (
                <>
                    <p style={{color: '#0071ce', fontSize: '2.8rem'}}>{prediction.predictedProductName}</p>
                    <span style={{fontSize: '1rem', color: '#555'}}>{prediction.predictionReason}</span>
                </>
            )}
        </div>
      </div>
    </div>
  );
}

export default CustomerInsights;