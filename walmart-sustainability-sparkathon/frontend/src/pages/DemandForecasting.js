import React, { useState } from 'react';
import DemandChart from '../components/dashboard/DemandChart'; // Import the chart component
import './DemandForecasting.css';

function DemandForecasting() {
  const [forecastInput, setForecastInput] = useState({
    store_id: '1', // Default store
    product_id: '3', // Default product
    forecast_days: '7', // Default forecast period
    historical_days: '30', // Default historical period
  });
  const [forecastResult, setForecastResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleForecastSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setForecastResult(null); // Clear previous results

    try {
      const { store_id, product_id, forecast_days, historical_days } = forecastInput;
      const queryParams = new URLSearchParams({
        store_id,
        product_id,
        forecast_days,
        historical_days
      });

      // Using the new API endpoint and GET method
      const response = await fetch(`http://localhost:8000/api/demand-forecast/time-series?${queryParams.toString()}`, {
        method: 'GET', // Changed to GET
        headers: { 'Content-Type': 'application/json' },
        // No body for GET request
      });

      if (!response.ok) {
        // Try to parse error message from backend if available
        let errorMsg = 'AI model did not respond or an error occurred.';
        try {
            const errorData = await response.json();
            if (errorData && errorData.error) {
                errorMsg = errorData.error;
            }
        } catch (parseError) {
            // Ignore if response is not JSON or empty
        }
        throw new Error(errorMsg);
      }
      
      const data = await response.json();
      if (data.error) { // Should be caught by !response.ok if backend uses proper status codes
          throw new Error(data.error);
      }
      
      // The API is now expected to return historical_data and forecasted_data arrays
      // and other fields as defined in API requirements.
      setForecastResult(data);

    } catch (err) {
      setError(err.message);
      console.error("Error fetching forecast:", err); // Log the full error for debugging
    }
    setIsLoading(false);
  };

  return (
    <div className="page-container">
        <h1 className="page-title">Interactive Demand Forecasting</h1>
        <div className="forecasting-layout">
            <div className="forecast-controls">
                <h3>Forecasting Parameters for Tomorrow</h3>
                <form onSubmit={handleForecastSubmit}>
                    <label>Store</label>
                    <select value={forecastInput.store_id} onChange={e => setForecastInput({...forecastInput, store_id: e.target.value})}>
                        <option value="0">Store_0</option>
                        <option value="1">Store_1</option>
                        <option value="2">Store_2</option>
                    </select>

                    <label>Product</label>
                    <select value={forecastInput.product_id} onChange={e => setForecastInput({...forecastInput, product_id: e.target.value})}>
                        <option value="0">Product_0</option>
                        <option value="1">Product_1</option>
                        <option value="2">Product_2</option>
                        <option value="3">Product_3</option>
                        <option value="4">Product_4</option>
                    </select>

                    <label htmlFor="forecast_days">Forecast Period</label>
                    <select id="forecast_days" value={forecastInput.forecast_days} onChange={e => setForecastInput({...forecastInput, forecast_days: e.target.value})}>
                        <option value="7">Next 7 Days</option>
                        <option value="14">Next 14 Days</option>
                        <option value="30">Next 30 Days</option>
                        <option value="90">Next 90 Days</option>
                    </select>

                    <label htmlFor="historical_days">Historical Data to Display</label>
                    <select id="historical_days" value={forecastInput.historical_days} onChange={e => setForecastInput({...forecastInput, historical_days: e.target.value})}>
                        <option value="30">Last 30 Days</option>
                        <option value="60">Last 60 Days</option>
                        <option value="90">Last 90 Days</option>
                    </select>

                    <button type="submit" disabled={isLoading} style={{marginTop: '1rem'}}>
                      {isLoading ? 'Fetching Forecast...' : 'Get Demand Forecast'}
                    </button>
                </form>
            </div>
            <div className="forecast-results">
                <h3>Forecast Results</h3>
                {isLoading && <p>Loading...</p>}
                {error && <p className="error-message" style={{color: 'red'}}>{error}</p>}
                {forecastResult && forecastResult.forecasted_data && (
                    <>
                        {forecastResult.summary && (
                            <div className="forecast-summary">
                                <h4>Forecast Summary (Next {forecastInput.forecast_days} Days)</h4>
                                <p><strong>Total Predicted Sales:</strong> {forecastResult.summary.total_forecasted_sales?.toLocaleString() || 'N/A'} units</p>
                                <p><strong>Average Daily Prediction:</strong> {forecastResult.summary.average_daily_forecast?.toLocaleString(undefined, {maximumFractionDigits: 1}) || 'N/A'} units/day</p>
                            </div>
                        )}
                        <h4>Daily Breakdown:</h4>
                        <div className="table-responsive">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Predicted Sales</th>
                                        <th>Confidence</th>
                                        <th>Notes/Factors</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {forecastResult.forecasted_data.map((item, idx) => (
                                        <tr key={idx}>
                                            <td>{new Date(item.date).toLocaleDateString()}</td>
                                            <td>{item.predicted_sales?.toLocaleString()}</td>
                                            <td>{item.confidence_score ? (item.confidence_score * 100).toFixed(0) + '%' : 'N/A'}</td>
                                            <td>
                                                {item.notes || ''}
                                                {item.factors && item.factors.length > 0 ? (
                                                    <>
                                                        {item.notes ? <br /> : ''}
                                                        Factors: {item.factors.join(', ')}
                                                    </>
                                                ) : ''}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* DemandChart will be handled in the next step, possibly passing different props */}
                        <DemandChart forecastData={forecastResult} />
                    </>
                )}
                {!forecastResult && !isLoading && !error && (
                    <div className="chart-placeholder">Set parameters and run a forecast to see results.</div>
                )}
            </div>
        </div>
    </div>
  );
}

export default DemandForecasting;