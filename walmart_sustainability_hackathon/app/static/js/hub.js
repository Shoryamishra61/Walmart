document.addEventListener('DOMContentLoaded', function () {
    const storeSelect = document.getElementById('hub-store-select');
    const periodSelect = document.getElementById('hub-period-select');
    const refreshButton = document.getElementById('hub-refresh-btn');

    const dashboardContentDiv = document.getElementById('hub-dashboard-content');
    const storeTitleEl = document.getElementById('hub-store-title');
    const periodLabelEl = document.getElementById('hub-period-label');
    const loadingMessageEl = document.getElementById('hub-loading-message');
    const errorMessageEl = document.getElementById('hub-error-message');

    // KPI Elements
    const kpiWasteDiversion = {
        card: document.getElementById('kpi-waste-diversion'),
        value: document.querySelector('#kpi-waste-diversion .kpi-value'),
        trend: document.querySelector('#kpi-waste-diversion .kpi-trend'),
        target: document.querySelector('#kpi-waste-diversion .kpi-target')
    };
    const kpiEnergy = {
        card: document.getElementById('kpi-energy'),
        value: document.querySelector('#kpi-energy .kpi-value'),
        trend: document.querySelector('#kpi-energy .kpi-trend'),
        target: document.querySelector('#kpi-energy .kpi-target')
    };
    const kpiWater = {
        card: document.getElementById('kpi-water'),
        value: document.querySelector('#kpi-water .kpi-value'),
        trend: document.querySelector('#kpi-water .kpi-trend'),
        target: document.querySelector('#kpi-water .kpi-target')
    };
    const kpiCarbon = {
        card: document.getElementById('kpi-carbon'),
        value: document.querySelector('#kpi-carbon .kpi-value'),
        trend: document.querySelector('#kpi-carbon .kpi-trend'),
        target: document.querySelector('#kpi-carbon .kpi-target')
    };

    // Chart Canvases
    const wasteBreakdownChartCtx = document.getElementById('wasteBreakdownChart')?.getContext('2d');
    const energyTrendChartCtx = document.getElementById('energyTrendChart')?.getContext('2d');
    const waterTrendChartCtx = document.getElementById('waterTrendChart')?.getContext('2d');

    let wasteChartInstance, energyChartInstance, waterChartInstance;

    // Other Panels
    const alertsListUl = document.getElementById('hub-alerts-list');
    const leaderboardListOl = document.getElementById('hub-leaderboard-list');
    const tipsListUl = document.getElementById('hub-tips-list');

    async function populateHubStores() {
        try {
            const response = await fetch('/api/stores'); // Reusing existing stores API
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const stores = await response.json();
            storeSelect.innerHTML = '<option value="">Select a Store</option>';
            stores.forEach(store => {
                const option = document.createElement('option');
                option.value = store.id;
                option.textContent = store.name;
                storeSelect.appendChild(option);
            });
            if (stores.length > 0) {
                storeSelect.value = stores[0].id; // Auto-select first store
                fetchHubData(); // Load data for default selection
            } else {
                showLoadingMessage("No stores available.");
            }
        } catch (error) {
            console.error("Error fetching stores for Hub:", error);
            storeSelect.innerHTML = '<option value="">Error loading stores</option>';
            showErrorMessage("Could not load store list.");
        }
    }

    async function fetchHubData() {
        const storeId = storeSelect.value;
        const period = periodSelect.value;

        if (!storeId) {
            showLoadingMessage("Please select a store to view the dashboard.");
            dashboardContentDiv.classList.add('hidden');
            return;
        }

        showLoadingMessage("Loading dashboard data...");
        dashboardContentDiv.classList.add('hidden');
        errorMessageEl.classList.add('hidden');

        try {
            const response = await fetch(`/api/hub/dashboard/${storeId}?period=${period}`);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({error: "Failed to parse error."}));
                throw new Error(errData.error || `HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            renderDashboard(data);
            dashboardContentDiv.classList.remove('hidden');
            loadingMessageEl.classList.add('hidden');
        } catch (error) {
            console.error("Error fetching hub data:", error);
            showErrorMessage(`Failed to load dashboard: ${error.message}`);
            loadingMessageEl.classList.add('hidden');
        }
    }

    function showLoadingMessage(message) {
        loadingMessageEl.textContent = message;
        loadingMessageEl.classList.remove('hidden');
        errorMessageEl.classList.add('hidden');
    }
    function showErrorMessage(message) {
        errorMessageEl.textContent = message;
        errorMessageEl.classList.remove('hidden');
        loadingMessageEl.classList.add('hidden');
        dashboardContentDiv.classList.add('hidden');
    }


    function renderDashboard(data) {
        storeTitleEl.textContent = `${data.store_name} - Sustainability Overview`;
        periodLabelEl.textContent = data.period_label;

        updateKpiCard(kpiWasteDiversion, data.waste_diversion_rate, false);
        updateKpiCard(kpiEnergy, data.energy_consumption_kwh, true);
        updateKpiCard(kpiWater, data.water_usage_liters, true);
        updateKpiCard(kpiCarbon, data.carbon_footprint_co2e, true);

        renderWasteBreakdownChart(data.waste_breakdown_chart_data);
        renderTrendChart(energyChartInstance, energyTrendChartCtx, 'Energy Consumption Trend', data.energy_trend_chart_data, 'kWh');
        renderTrendChart(waterChartInstance, waterTrendChartCtx, 'Water Usage Trend', data.water_trend_chart_data, 'Liters');

        renderAlerts(data.active_alerts);
        renderLeaderboard(data.gamification_leaderboard, data.store_id);
        renderTips(data.sustainability_tips);
    }

    function updateKpiCard(kpiElements, metricData, goodIsLower) {
        kpiElements.value.textContent = `${metricData.value.toLocaleString()} ${metricData.unit}`;

        let trendHtml = 'Trend: N/A';
        if (metricData.trend !== null) {
            const trendPercentage = (metricData.trend * 100).toFixed(1);
            const arrow = metricData.trend > 0 ? (goodIsLower ? '▲' : '▲') : (metricData.trend < 0 ? (goodIsLower ? '▼' : '▼') : '');
            const trendColor = metricData.trend > 0 ? (goodIsLower ? 'arrow-up' : 'arrow-down') : (metricData.trend < 0 ? (goodIsLower ? 'arrow-down' : 'arrow-up') : '');
            trendHtml = `Trend: <span class="${trendColor}">${arrow} ${trendPercentage}%</span>`;
        }
        kpiElements.trend.innerHTML = trendHtml;

        kpiElements.target.textContent = metricData.target !== null ? `Target: ${metricData.target.toLocaleString()} ${metricData.unit}` : 'Target: N/A';

        // Update status color of the card
        kpiElements.card.className = 'kpi-card'; // Reset classes
        if (metricData.status_color) {
            kpiElements.card.classList.add(`status-${metricData.status_color}`);
        }
    }

    function renderWasteBreakdownChart(chartData) {
        if (!wasteBreakdownChartCtx) return;
        if (wasteChartInstance) wasteChartInstance.destroy();

        wasteChartInstance = new Chart(wasteBreakdownChartCtx, {
            type: 'doughnut',
            data: {
                labels: chartData.map(d => d.label),
                datasets: [{
                    label: 'Waste Breakdown (kg)',
                    data: chartData.map(d => d.value),
                    backgroundColor: chartData.map(d => d.color || getRandomColor()), // Use provided color or random
                    borderColor: '#fff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { animateScale: true, animateRotate: true },
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.raw.toLocaleString()} kg` } }
                }
            }
        });
    }

    function renderTrendChart(chartInstance, context, label, chartData, unit) {
        if (!context) return;
        if (chartInstance) chartInstance.destroy();

        // Store the new instance globally for this context
        if (context === energyTrendChartCtx) {
            energyChartInstance = new Chart(context, { /* config */ });
            chartInstance = energyChartInstance;
        } else if (context === waterTrendChartCtx) {
            waterChartInstance = new Chart(context, { /* config */ });
            chartInstance = waterChartInstance;
        } else { // Should not happen
            return;
        }

        chartInstance.config.type = 'line';
        chartInstance.config.data = {
            labels: chartData.map(d => d.label),
            datasets: [{
                label: label,
                data: chartData.map(d => d.value),
                borderColor: '#0071ce', // Walmart Blue
                backgroundColor: 'rgba(0, 113, 206, 0.1)',
                fill: true,
                tension: 0.3
            }]
        };
        chartInstance.config.options = {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: false, ticks: { callback: value => value.toLocaleString() } }
            },
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.raw.toLocaleString()} ${unit}` } }
            }
        };
        chartInstance.update();
    }


    function renderAlerts(alerts) {
        alertsListUl.innerHTML = '';
        if (!alerts || alerts.length === 0) {
            alertsListUl.innerHTML = '<li>No active alerts. Great job!</li>';
            return;
        }
        alerts.forEach(alert => {
            const li = document.createElement('li');
            li.classList.add(`severity-${alert.severity}`);
            li.innerHTML = `
                <strong class="alert-title">${alert.title}</strong>
                <span class="alert-desc">${alert.description}</span>
                <span class="alert-meta">Metric: ${alert.metric_impacted || 'N/A'} | ${new Date(alert.timestamp_iso).toLocaleString()}</span>
                ${alert.suggested_action ? `<span class="alert-desc"><em>Suggestion: ${alert.suggested_action}</em></span>` : ''}
            `;
            alertsListUl.appendChild(li);
        });
    }

    function renderLeaderboard(leaderboard, currentStoreId) {
        leaderboardListOl.innerHTML = '';
        if (!leaderboard || leaderboard.length === 0) {
            leaderboardListOl.innerHTML = '<li>Leaderboard data not available.</li>';
            return;
        }
        leaderboard.forEach(entry => {
            const li = document.createElement('li');
            if (entry.store_id === currentStoreId) {
                li.style.fontWeight = 'bold';
                li.style.backgroundColor = '#e9f5ff';
            }
            const badgesHtml = entry.badges.map(badge => `<span class="badges">${badge}</span>`).join(' ');
            li.innerHTML = `
                <span class="rank">#${entry.rank}</span>
                <span class="store-name">${entry.store_name}</span>
                <span class="score">${entry.score.toLocaleString()} pts</span>
                ${badgesHtml ? `<span style="font-size:0.8em; margin-left: 5px;">${badgesHtml}</span>` : ''}
            `;
            leaderboardListOl.appendChild(li);
        });
    }

    function renderTips(tips) {
        tipsListUl.innerHTML = '';
        if (!tips || tips.length === 0) {
            tipsListUl.innerHTML = '<li>No tips available at the moment.</li>';
            return;
        }
        tips.forEach(tip => {
            const li = document.createElement('li');
            li.textContent = tip;
            tipsListUl.appendChild(li);
        });
    }

    function getRandomColor() {
        const r = Math.floor(Math.random() * 200);
        const g = Math.floor(Math.random() * 200);
        const b = Math.floor(Math.random() * 200);
        return `rgb(${r},${g},${b})`;
    }

    // Event Listeners
    storeSelect.addEventListener('change', fetchHubData);
    periodSelect.addEventListener('change', fetchHubData);
    refreshButton.addEventListener('click', fetchHubData);

    // Initial Load
    populateHubStores();
});
```
