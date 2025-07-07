import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

function DemandChart({ forecastData }) {
    const data = {
        labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'],
        datasets: [
            {
                label: 'Historical Sales',
                data: forecastData?.historical_sales || [0,0,0,0,0,0,0],
                borderColor: 'rgb(0, 113, 206)',
                backgroundColor: 'rgba(0, 113, 206, 0.5)',
            },
            {
                label: 'Predicted Demand (Next Week)',
                data: Array(7).fill(null).map((_, i) => i === 6 ? forecastData?.predicted_demand_next_7_days : null),
                borderColor: 'rgb(255, 194, 32)',
                backgroundColor: 'rgba(255, 194, 32, 0.8)',
                pointRadius: 10,
                pointHoverRadius: 15,
            }
        ],
    };
    return <Line data={data} options={{ responsive: true, plugins: { title: { display: true, text: 'Sales Trend & Demand Forecast' }}}} />;
}

export default DemandChart; 