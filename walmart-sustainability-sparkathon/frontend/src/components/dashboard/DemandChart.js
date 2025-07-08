import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

function DemandChart({ forecastData }) {
    if (!forecastData || !forecastData.historical_data || !forecastData.forecasted_data) {
        return <div className="chart-placeholder" style={{minHeight: '300px'}}>Forecast data not available for chart.</div>;
    }

    // Combine all dates for labels, ensuring uniqueness and order
    const allDates = new Set();
    forecastData.historical_data.forEach(item => allDates.add(new Date(item.date).toLocaleDateString()));
    forecastData.forecasted_data.forEach(item => allDates.add(new Date(item.date).toLocaleDateString()));

    const sortedLabels = Array.from(allDates).sort((a, b) => new Date(a) - new Date(b));

    // Prepare historical data aligned with sortedLabels
    const historicalSalesData = sortedLabels.map(label => {
        const histItem = forecastData.historical_data.find(h => new Date(h.date).toLocaleDateString() === label);
        return histItem ? histItem.sales : null; // null for gaps if any (though typically historical should be continuous)
    });

    // Prepare forecasted data aligned with sortedLabels
    // The forecast data points should only appear for their specific dates.
    // Historical data points should not have forecast values.
    const predictedSalesData = sortedLabels.map(label => {
        const forecastItem = forecastData.forecasted_data.find(f => new Date(f.date).toLocaleDateString() === label);
        // Only return predicted_sales if this label corresponds to a forecast date
        // And ensure it's not a date that also has historical sales (unless an overlap is intended for the last historical point)
        const hasHistorical = forecastData.historical_data.some(h => new Date(h.date).toLocaleDateString() === label);

        if (forecastItem && !hasHistorical) { // Simple case: forecast only for future dates
             return forecastItem.predicted_sales;
        }
        // More robust: if forecast starts on the day after last historical point
        if (forecastItem) {
            // Check if this date is within the forecast period defined by the API response
            const forecastStartDate = new Date(forecastData.forecast_period_start_date);
            const currentDate = new Date(label);
            if (currentDate >= forecastStartDate) {
                 return forecastItem.predicted_sales;
            }
        }
        return null;
    });

    // To connect the last historical point with the first forecast point if they are consecutive
    // and the forecast is meant to "continue" the line.
    // This can be tricky if historical and forecast data have a gap or overlap.
    // For now, keep them as potentially separate segments if there's a null between them.
    // A common approach is to have the last historical point also be the first point of the forecast line's data
    // if the forecast truly begins the day after.

    const data = {
        labels: sortedLabels,
        datasets: [
            {
                label: 'Historical Sales',
                data: historicalSalesData,
                borderColor: 'rgb(0, 113, 206)', // Walmart Blue
                backgroundColor: 'rgba(0, 113, 206, 0.1)',
                fill: true,
                tension: 0.1 // Slight curve to lines
            },
            {
                label: 'Predicted Sales',
                data: predictedSalesData,
                borderColor: 'rgb(255, 194, 32)', // Walmart Yellow/Orange
                backgroundColor: 'rgba(255, 194, 32, 0.1)',
                fill: true,
                borderDash: [5, 5], // Dashed line for forecast
                tension: 0.1
            }
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: `Sales History & Demand Forecast for Product ID: ${forecastData.product_id} (Store ID: ${forecastData.store_id})`,
                font: { size: 16 }
            },
            tooltip: {
                mode: 'index',
                intersect: false,
            },
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'Date'
                }
            },
            y: {
                title: {
                    display: true,
                    text: 'Sales Quantity'
                },
                beginAtZero: true
            }
        }
    };

    return <div style={{ height: '400px' }}><Line data={data} options={options} /></div>;
}

export default DemandChart;