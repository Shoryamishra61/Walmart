document.addEventListener('DOMContentLoaded', function () {
    const skuSelect = document.getElementById('sourcing-sku-select');
    const batchIdInput = document.getElementById('sourcing-batch-id');
    const fetchButton = document.getElementById('fetch-sourcing-info-btn');

    const resultsContainer = document.getElementById('sourcing-results-container');
    const errorContainer = document.getElementById('sourcing-error-container');

    const productNameEl = document.getElementById('product-name-sourcing');
    const productImageEl = document.getElementById('product-image-sourcing');
    const mainStoryEl = document.getElementById('product-main-story-sourcing');

    const journeyTimelineDiv = document.getElementById('journey-timeline');
    const sourcesSpotlightDiv = document.getElementById('sources-spotlight');
    const impactMetricsDiv = document.getElementById('impact-metrics-sourcing');
    const certificationsDiv = document.getElementById('certifications-sourcing');
    const additionalLinksDiv = document.getElementById('additional-links-sourcing');
    const mapDiv = document.getElementById('sourcing-map');
    let sourcingMap = null; // Leaflet map instance

    // Icon mapping for journey steps
    const journeyIconMap = {
        "leaf": "🌿", // or use font awesome class e.g. "fas fa-leaf"
        "tractor": "🚜", // "fas fa-tractor"
        "factory": "🏭", // "fas fa-industry"
        "ship": "🚢", // "fas fa-ship"
        "warehouse": "📦", // "fas fa-warehouse"
        "store": "🏪", // "fas fa-store"
        "sun": "☀️", // "fas fa-sun"
        "check-circle": "✔️", // "fas fa-check-circle"
        "box": "🥡" // "fas fa-box-open"
    };

    fetchButton.addEventListener('click', fetchSourcingInformation);

    // Auto-fetch for the default selected SKU on page load for demo
    if (skuSelect.value) {
        fetchSourcingInformation();
    }

    async function fetchSourcingInformation() {
        const sku = skuSelect.value;
        const batchId = batchIdInput.value.trim() || `DEMO_BATCH_${sku}`; // Use default if empty

        if (!sku) {
            showError("Please select a product SKU.");
            return;
        }

        resultsContainer.classList.add('hidden');
        errorContainer.classList.add('hidden');
        errorContainer.textContent = '';
        // Add a simple loading indicator
        productNameEl.textContent = "Loading traceability data...";
        mainStoryEl.textContent = "";
        productImageEl.src = "#";


        try {
            const response = await fetch(`/api/sourcing/product/${sku}/batch/${batchId}/traceability`);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({error: "Failed to parse error response."}));
                throw new Error(errData.error || `HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            renderSourcingInformation(data);
            resultsContainer.classList.remove('hidden');
        } catch (error) {
            console.error("Error fetching sourcing information:", error);
            showError(`Failed to load sourcing information: ${error.message}`);
        }
    }

    function showError(message) {
        errorContainer.textContent = message;
        errorContainer.classList.remove('hidden');
        resultsContainer.classList.add('hidden');
    }

    function renderSourcingInformation(data) {
        productNameEl.textContent = data.product_name;
        productImageEl.src = data.product_image_url || 'static/img/placeholder_product.png'; // Fallback image
        productImageEl.alt = data.product_name;
        mainStoryEl.textContent = data.main_story;

        renderJourneyTimeline(data.journey);
        renderSourcesSpotlight(data.sources);
        renderImpactMetrics(data.impact_metrics);
        renderCertifications(data.sources); // Aggregate certs from all sources
        renderAdditionalLinks(data.additional_links);
        initializeOrUpdateMap(data.sources, data.journey);
    }

    function renderJourneyTimeline(journeySteps) {
        journeyTimelineDiv.innerHTML = '';
        if (!journeySteps || journeySteps.length === 0) {
            journeyTimelineDiv.innerHTML = "<p>No journey information available.</p>";
            return;
        }
        journeySteps.forEach(step => {
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('timeline-item');
            const icon = journeyIconMap[step.icon_type] || '🔹'; // Default icon

            itemDiv.innerHTML = `
                <h5><span class="timeline-icon">${icon}</span> ${step.step_name}</h5>
                <div class="date-location">${new Date(step.date_iso).toLocaleDateString()} - ${step.location_name}</div>
                <p class="description">${step.description}</p>
                ${step.media_url ? `<div class="media"><img src="${step.media_url}" alt="${step.step_name}"></div>` : ''}
            `;
            journeyTimelineDiv.appendChild(itemDiv);
        });
    }

    function renderSourcesSpotlight(sources) {
        sourcesSpotlightDiv.innerHTML = '';
        if (!sources || sources.length === 0) {
            sourcesSpotlightDiv.innerHTML = "<p>No source information available.</p>";
            return;
        }
        sources.forEach(source => {
            const cardDiv = document.createElement('div');
            cardDiv.classList.add('source-card');
            let certsHtml = '';
            if (source.certifications && source.certifications.length > 0) {
                certsHtml = source.certifications.map(cert =>
                    `<img src="${cert.logo_url}" alt="${cert.name}" title="${cert.name}: ${cert.description}">`
                ).join('');
            }

            cardDiv.innerHTML = `
                <img src="${source.image_url || 'static/img/placeholder_source.png'}" alt="${source.name}" class="source-image">
                <h5>${source.name} (${source.type})</h5>
                <p><strong>Location:</strong> ${source.location.name}</p>
                <p>${source.story}</p>
                <div class="certifications">${certsHtml}</div>
            `;
            sourcesSpotlightDiv.appendChild(cardDiv);
        });
    }

    function renderImpactMetrics(metrics) {
        impactMetricsDiv.innerHTML = '';
        if (!metrics) {
            impactMetricsDiv.innerHTML = "<p>Impact metrics not available.</p>";
            return;
        }
        let html = '';
        if (metrics.carbon_footprint_co2e_kg !== null) {
            html += `<p><strong>Carbon Footprint:</strong> ${metrics.carbon_footprint_co2e_kg.toFixed(2)} kg CO₂e/unit</p>`;
        }
        if (metrics.water_usage_liters !== null) {
            html += `<p><strong>Water Usage:</strong> ${metrics.water_usage_liters.toFixed(1)} Liters/unit</p>`;
        }
        if (metrics.ethical_labor_rating) {
            html += `<p><strong>Ethical Labor:</strong> ${metrics.ethical_labor_rating}</p>`;
        }
        if (metrics.recyclability_score_pct !== null) {
            html += `<p><strong>Packaging Recyclability:</strong> ${metrics.recyclability_score_pct.toFixed(0)}%</p>`;
        }
        impactMetricsDiv.innerHTML = html || "<p>Impact metrics not specified.</p>";
    }

    function renderCertifications(sources) {
        certificationsDiv.innerHTML = '';
        const allCerts = new Map(); // Use Map to store unique certs by ID
        if (sources) {
            sources.forEach(source => {
                if (source.certifications) {
                    source.certifications.forEach(cert => {
                        if (!allCerts.has(cert.id)) {
                            allCerts.set(cert.id, cert);
                        }
                    });
                }
            });
        }

        if (allCerts.size === 0) {
            certificationsDiv.innerHTML = "<p>No specific certifications highlighted for these sources.</p>";
            return;
        }
        allCerts.forEach(cert => {
            const certP = document.createElement('p');
            certP.innerHTML = `<img src="${cert.logo_url}" alt="${cert.name}" title="${cert.description}"> <strong>${cert.name}</strong>`;
            certificationsDiv.appendChild(certP);
        });
    }

    function renderAdditionalLinks(links) {
        additionalLinksDiv.innerHTML = '';
        if (!links || links.length === 0) {
            additionalLinksDiv.innerHTML = "<p>No additional links.</p>";
            return;
        }
        links.forEach(link => {
            const linkA = document.createElement('a');
            linkA.href = link.url;
            linkA.textContent = link.name;
            linkA.target = "_blank"; // Open in new tab
            additionalLinksDiv.appendChild(linkA);
        });
    }

    function initializeOrUpdateMap(sources, journeySteps) {
        if (!sourcingMap) {
            sourcingMap = L.map(mapDiv).setView([0, 0], 2); // Default view
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(sourcingMap);
        } else {
            // Clear existing layers (markers, polylines)
            sourcingMap.eachLayer(layer => {
                if (layer instanceof L.Marker || layer instanceof L.Polyline) {
                    sourcingMap.removeLayer(layer);
                }
            });
        }

        const bounds = L.latLngBounds();
        const journeyPathPoints = [];

        if (sources && sources.length > 0) {
            sources.forEach(source => {
                if (source.location && source.location.lat && source.location.lon) {
                    const latLng = [source.location.lat, source.location.lon];
                    L.marker(latLng).addTo(sourcingMap)
                        .bindPopup(`<b>${source.name}</b><br>${source.type}<br>${source.location.name}`)
                        .openPopup();
                    bounds.extend(latLng);
                    // Add source location to journey path if it's a starting point
                    if (!journeyPathPoints.find(p => p[0] === latLng[0] && p[1] === latLng[1])) {
                         // Only add if it's likely a start of a journey leg
                        const isStartNode = journeySteps.some(step => step.location_geo && step.location_geo.lat === latLng[0] && step.location_geo.lon === latLng[1]);
                        if(isStartNode) journeyPathPoints.push(latLng);
                    }
                }
            });
        }

        // Add journey step locations to map and path
        if(journeySteps && journeySteps.length > 0) {
            journeySteps.forEach(step => {
                if(step.location_geo && step.location_geo.lat && step.location_geo.lon) {
                    const latLng = [step.location_geo.lat, step.location_geo.lon];
                     L.circleMarker(latLng, {radius: 5, color: '#ffc220', fillColor: '#ffc220', fillOpacity: 0.8}).addTo(sourcingMap)
                        .bindPopup(`<b>${step.step_name}</b><br>${step.location_name}<br>${new Date(step.date_iso).toLocaleDateString()}`);
                    bounds.extend(latLng);
                    journeyPathPoints.push(latLng);
                }
            });
        }


        if (journeyPathPoints.length > 1) {
            // Deduplicate consecutive points for a cleaner line
            const uniqueJourneyPathPoints = journeyPathPoints.filter((point, index, self) =>
                index === 0 || !(point[0] === self[index - 1][0] && point[1] === self[index - 1][1])
            );
            L.polyline(uniqueJourneyPathPoints, { color: '#0071ce', weight: 3, opacity: 0.7 }).addTo(sourcingMap);
        }

        if (bounds.isValid()) {
            sourcingMap.fitBounds(bounds, { padding: [50, 50] });
        } else if (sources && sources.length > 0 && sources[0].location) {
             sourcingMap.setView([sources[0].location.lat, sources[0].location.lon], 5); // Fallback zoom
        } else {
            sourcingMap.setView([0,0], 2); // Global view if no points
        }
    }
});
```
