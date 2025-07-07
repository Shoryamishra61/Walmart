import React, { useState } from 'react';
import DemandChart from '../components/dashboard/DemandChart'; // Import the chart component
import './DemandForecasting.css';

function DemandForecasting() {
  const [forecastInput, setForecastInput] = useState({
    store_id: '1',
    product_id: '3',
    promotion_applied: false,
    is_holiday: false,
  });
  const [forecastResult, setForecastResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleForecastSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setForecastResult(null);

    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const getDayOfYear = (date) => {
        const start = new Date(date.getFullYear(), 0, 0);
        const diff = (date - start) + ((start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000);
        const oneDay = 1000 * 60 * 60 * 24;
        return Math.floor(diff / oneDay);
      };

      const features = {
        store_id: parseInt(forecastInput.store_id),
        product_id: parseInt(forecastInput.product_id),
        is_weekend: (tomorrow.getDay() === 6 || tomorrow.getDay() === 0) ? 1 : 0,
        is_holiday: forecastInput.is_holiday ? 1 : 0,
        promotion_applied: forecastInput.promotion_applied ? 1 : 0,
        day_of_year: getDayOfYear(tomorrow),
        month: tomorrow.getMonth() + 1,
        year: tomorrow.getFullYear(),
        day_of_week: tomorrow.getDay(),
      };

      const response = await fetch('http://localhost:8000/predict_daily_sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(features)
      });

      if (!response.ok) throw new Error('AI model did not respond.');
      
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      // Add some dummy historical data for the chart visualization
      const historical_sales = [
          Math.floor(data.predicted_sales * 0.8),
          Math.floor(data.predicted_sales * 1.1),
          Math.floor(data.predicted_sales * 0.9),
          Math.floor(data.predicted_sales * 1.2),
          Math.floor(data.predicted_sales * 0.7),
          Math.floor(data.predicted_sales * 1.3),
          Math.floor(data.predicted_sales * 1.0),
      ];
      setForecastResult({ ...data, historical_sales });

    } catch (err) {
      setError(err.message);
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

                    <div className="checkbox-group">
                        <input type="checkbox" id="promo" checked={forecastInput.promotion_applied} onChange={e => setForecastInput({...forecastInput, promotion_applied: e.target.checked})} />
                        <label htmlFor="promo">Is a promotion active tomorrow?</label>
                    </div>
                     <div className="checkbox-group">
                        <input type="checkbox" id="holiday" checked={forecastInput.is_holiday} onChange={e => setForecastInput({...forecastInput, is_holiday: e.target.checked})} />
                        <label htmlFor="holiday">Is tomorrow a holiday?</label>
                    </div>

                    <button type="submit" disabled={isLoading}>
                      {isLoading ? 'Calculating...' : 'Forecast Tomorrow\'s Sales'}
                    </button>
                </form>
            </div>
            <div className="forecast-results">
                <h3>Forecast Visualization</h3>
                {isLoading && <p>Loading...</p>}
                {error && <p className="error-message" style={{color: 'red'}}>{error}</p>}
                {forecastResult ? (
                    <DemandChart forecastData={forecastResult} />
                ) : (
                    !isLoading && <div className="chart-placeholder">Set parameters and run a forecast.</div>
                )}
            </div>
        </div>
    </div>
  );
}

export default DemandForecasting;