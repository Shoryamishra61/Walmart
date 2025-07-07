document.addEventListener('DOMContentLoaded', function () {
    const storeSelect = document.getElementById('gs-store-select');
    const storeLayoutDiv = document.getElementById('store-layout');
    const refreshButton = document.getElementById('refresh-greenshelf-view');

    const shelfDetailModal = document.getElementById('shelf-detail-modal');
    const shelfDetailTitle = document.getElementById('shelf-detail-title');
    const shelfDetailItemsDiv = document.getElementById('shelf-detail-items');

    const itemDetailModal = document.getElementById('item-detail-modal');
    const itemDetailTitle = document.getElementById('item-detail-title');
    const itemDetailContentDiv = document.getElementById('item-detail-content');

    const closeButtons = document.querySelectorAll('.close-button');

    async function populateGSStores() {
        try {
            const response = await fetch('/api/stores');
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
                loadStoreLayout(); // Load its layout
            }
        } catch (error) {
            console.error("Error fetching stores for GreenShelf:", error);
            storeSelect.innerHTML = '<option value="">Error loading stores</option>';
        }
    }

    async function loadStoreLayout() {
        const storeId = storeSelect.value;
        if (!storeId) {
            storeLayoutDiv.innerHTML = '<p>Select a store to view layout.</p>';
            return;
        }
        storeLayoutDiv.innerHTML = '<p>Loading shelf statuses...</p>';

        try {
            // This endpoint in GreenShelfService already simulates updates before summarizing
            const response = await fetch(`/api/greenshelf/store/${storeId}/layout_summary?simulate_updates=true`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const shelfStatuses = await response.json();
            renderStoreLayout(shelfStatuses);
        } catch (error) {
            console.error("Error fetching store layout summary:", error);
            storeLayoutDiv.innerHTML = '<p>Error loading shelf statuses. Please try again.</p>';
        }
    }

    function renderStoreLayout(shelfStatuses) {
        storeLayoutDiv.innerHTML = '';
        if (Object.keys(shelfStatuses).length === 0) {
            storeLayoutDiv.innerHTML = '<p>No shelf data available for this store.</p>';
            return;
        }

        for (const shelfId in shelfStatuses) {
            const statusColor = shelfStatuses[shelfId];
            const shelfBox = document.createElement('div');
            shelfBox.classList.add('shelf-box', `shelf-${statusColor}`);
            shelfBox.dataset.shelfId = shelfId;

            const shelfName = document.createElement('div');
            shelfName.classList.add('shelf-name');
            shelfName.textContent = shelfId.replace(/_/g, ' ');

            const shelfStatusIndicator = document.createElement('div');
            shelfStatusIndicator.classList.add('shelf-status-indicator');
            shelfStatusIndicator.textContent = statusColor.replace('darkred', 'spoiled').replace('-', ' ');


            shelfBox.appendChild(shelfName);
            shelfBox.appendChild(shelfStatusIndicator);

            shelfBox.addEventListener('click', () => openShelfDetailModal(shelfId));
            storeLayoutDiv.appendChild(shelfBox);
        }
    }

    async function openShelfDetailModal(shelfId) {
        shelfDetailTitle.textContent = `Shelf Details - ${shelfId.replace(/_/g, ' ')}`;
        shelfDetailItemsDiv.innerHTML = '<p>Loading items and prices...</p>';
        shelfDetailModal.classList.remove('hidden');

        try {
            // Fetch items with dynamic pricing information
            // The backend pricing_service.get_dynamic_prices_for_shelf_items already calls greenshelf_service.get_shelf_items
            // which includes simulate_updates=true by default in its call path.
            const response = await fetch(`/api/pricing/shelf/${shelfId}/items`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const pricedItems = await response.json(); // These are DynamicPriceResult objects
            renderShelfItems(pricedItems);
        } catch (error) {
            console.error(`Error fetching dynamically priced items for shelf ${shelfId}:`, error);
            shelfDetailItemsDiv.innerHTML = '<p>Error loading item prices. Please try again.</p>';
        }
    }

    function renderShelfItems(pricedItems) {
        shelfDetailItemsDiv.innerHTML = '';
        if (!pricedItems || pricedItems.length === 0) {
            shelfDetailItemsDiv.innerHTML = '<p>This shelf is currently empty or no pricing data available.</p>';
            return;
        }

        pricedItems.forEach(item => { // item is a DynamicPriceResult
            const card = document.createElement('div');
            card.classList.add('product-instance-card');
            card.dataset.instanceId = item.instance_id;

            let priceDisplay = '';
            if (item.discount_percentage > 0 && item.original_price > 0) {
                priceDisplay = `
                    <p><strong>Original Price:</strong> <span style="text-decoration: line-through;">$${item.original_price.toFixed(2)}</span></p>
                    <p style="color: red; font-weight: bold;"><strong>Special Price: $${item.discounted_price.toFixed(2)}</strong></p>
                    <p><em>${(item.discount_percentage * 100).toFixed(0)}% off: ${item.reason}</em></p>
                `;
            } else if (item.original_price > 0) {
                 priceDisplay = `<p><strong>Price:</strong> $${item.original_price.toFixed(2)}</p>`;
            } else {
                 priceDisplay = `<p><em>Pricing information pending.</em></p>`;
            }

            card.innerHTML = `
                <h5>${item.product_name} (${item.sku})</h5>
                <p><span class="status-indicator status-${item.status_color_from_greenshelf}"></span><strong>Status:</strong> ${item.status_from_greenshelf}</p>
                <p><strong>Instance ID:</strong> ${item.instance_id}</p>
                <p><strong>Predicted Spoilage:</strong> ${new Date(item.predicted_spoilage_date).toLocaleDateString()}</p>
                ${priceDisplay}
                <button class="cta-button small-btn view-item-details-btn" data-instance-id="${item.instance_id}">More Details</button>
            `;
            shelfDetailItemsDiv.appendChild(card);
        });

        document.querySelectorAll('.view-item-details-btn').forEach(button => {
            button.addEventListener('click', function() {
                openItemDetailModal(this.dataset.instanceId);
            });
        });
    }

    async function openItemDetailModal(instanceId) {
        itemDetailTitle.textContent = `Details for Instance: ${instanceId}`;
        itemDetailContentDiv.innerHTML = '<p>Loading details...</p>';
        itemDetailModal.classList.remove('hidden');

        try {
            const response = await fetch(`/api/pricing/item/${instanceId}`); // Fetches DynamicPriceResult
            if (!response.ok) {
                 const errorData = await response.json().catch(() => null);
                 if (response.status === 202 && errorData && errorData.item_details) {
                    renderItemDetails(errorData.item_details, "Pricing not applicable or failed for this item.");
                    return;
                 }
                throw new Error(`HTTP error! status: ${response.status} - ${errorData ? errorData.error : 'Unknown error'}`);
            }
            const pricedItemData = await response.json();

            // To get full GreenShelf data like quantity, full sensor history etc., make a separate call
            // This is because DynamicPriceResult might only contain a summary from GreenShelf.
            let greenshelfSpecificData = null;
            try {
                const gsResponse = await fetch(`/api/greenshelf/item/${instanceId}/details`);
                if (gsResponse.ok) {
                    greenshelfSpecificData = await gsResponse.json();
                }
            } catch (gsError) {
                console.warn("Could not fetch full GreenShelf details for item modal:", gsError);
            }

            renderItemDetails(pricedItemData, null, greenshelfSpecificData);

        } catch (error) {
            console.error(`Error fetching details for item ${instanceId}:`, error);
            itemDetailContentDiv.innerHTML = `<p>Error loading item details: ${error.message}. Please try again.</p>`;
        }
    }

    function renderItemDetails(pricedItem, pricingMessage = null, greenshelfItem = null) {
        // pricedItem is a DynamicPriceResult object from /api/pricing/item/{id}
        // greenshelfItem is a ProductInstanceGS object from /api/greenshelf/item/{id}/details (optional)

        const itemToDisplay = greenshelfItem || pricedItem; // Prefer GreenShelf for base details if available

        let priceSection = '';
        if (pricingMessage) {
            priceSection = `<p><em>${pricingMessage}</em></p>`;
        }
        if (pricedItem.discount_percentage > 0 && pricedItem.original_price > 0) {
            priceSection += `
                <p><strong>Original Price:</strong> <span style="text-decoration: line-through;">$${pricedItem.original_price.toFixed(2)}</span></p>
                <p style="color: red; font-weight: bold;"><strong>Special Price: $${pricedItem.discounted_price.toFixed(2)}</strong></p>
                <p><strong>Discount:</strong> ${(pricedItem.discount_percentage * 100).toFixed(0)}%</p>
                <p><strong>Reason:</strong> ${pricedItem.reason}</p>
            `;
        } else if (pricedItem.original_price > 0) {
             priceSection += `<p><strong>Price:</strong> $${pricedItem.original_price.toFixed(2)}</p>`;
        } else if (!pricingMessage) {
             priceSection += `<p><em>Standard Price. No active discount.</em></p>`;
        }

        let gsDetailsHtml = '';
        if (greenshelfItem) { // Use detailed GreenShelf data if available
            gsDetailsHtml = `
                <p><strong>Quantity:</strong> ${greenshelfItem.quantity}</p>
                <p><strong>Printed Expiry:</strong> ${new Date(greenshelfItem.printed_expiry_date).toLocaleDateString()}</p>
                <p><strong>Received Date:</strong> ${new Date(greenshelfItem.received_date).toLocaleDateString()}</p>
                <hr>
                <p><strong>Current Temperature:</strong> ${greenshelfItem.current_conditions.temperature_c}°C</p>
                <p><strong>Current Humidity:</strong> ${greenshelfItem.current_conditions.humidity_pct !== null ? greenshelfItem.current_conditions.humidity_pct + '%' : 'N/A'}</p>
                <p><strong>Last Sensor Update:</strong> ${new Date(greenshelfItem.current_conditions.timestamp).toLocaleString()}</p>
            `;
        } else { // Fallback to data from pricedItem if full gsItem not available (less detail)
             gsDetailsHtml = `
                <p><strong>Printed Expiry:</strong> ${new Date(pricedItem.predicted_spoilage_date).toLocaleDateString()} (Using predicted as fallback)</p>
                <!-- Quantity, received date, sensor data might be missing if only pricedItem is available -->
             `;
        }

        itemDetailContentDiv.innerHTML = `
            <p><strong>Product Name:</strong> ${itemToDisplay.product_name}</p>
            <p><strong>SKU:</strong> ${itemToDisplay.sku}</p>
            <p><strong>Instance ID:</strong> ${itemToDisplay.instance_id}</p>
            <p><strong>Status (GreenShelf):</strong> <span class="status-indicator status-${itemToDisplay.status_color || pricedItem.status_color_from_greenshelf}"></span> ${itemToDisplay.status || pricedItem.status_from_greenshelf}</p>
            <p><strong>Predicted Spoilage Date:</strong> ${new Date(itemToDisplay.predicted_spoilage_date).toLocaleDateString()}</p>
            <hr>
            <h4>Pricing Information</h4>
            ${priceSection}
            <hr>
            <h4>Shelf Conditions & History (from GreenShelf)</h4>
            ${gsDetailsHtml}
        `;
    }

    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            shelfDetailModal.classList.add('hidden');
            itemDetailModal.classList.add('hidden');
        });
    });

    window.addEventListener('click', (event) => {
        if (event.target === shelfDetailModal) {
            shelfDetailModal.classList.add('hidden');
        }
        if (event.target === itemDetailModal) {
            itemDetailModal.classList.add('hidden');
        }
    });

    storeSelect.addEventListener('change', loadStoreLayout);
    refreshButton.addEventListener('click', loadStoreLayout);

    populateGSStores();
});
```
