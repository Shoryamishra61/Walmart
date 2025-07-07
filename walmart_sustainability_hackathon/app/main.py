from flask import Flask, jsonify, request, render_template
from .services.demand_forecasting_service import DemandForecastingService
from .services.greenshelf_service import GreenShelfService
from .services.pricing_service import DynamicPricingService
from .models.pricing_models import MOCK_PRODUCT_PRICING_PS # Import mock pricing data
from .services.sourcing_service import SourcingPlatformService
from .services.hub_service import SustainabilityHubService

# For simplicity in hackathon, initialize services globally
demand_forecasting_service = DemandForecastingService()
greenshelf_service = GreenShelfService()
pricing_service = DynamicPricingService(greenshelf_service=greenshelf_service, product_pricing_data=MOCK_PRODUCT_PRICING_PS)
sourcing_service = SourcingPlatformService()
hub_service = SustainabilityHubService()


def create_app():
    app = Flask(__name__)

    # --- HTML Page Routes ---
    # These routes will render the main HTML pages for each feature.
    # The actual content of these pages will be minimal, mostly acting as containers
    # for JavaScript to fetch and display data from the API.

    @app.route('/')
    def index():
        return render_template('index.html', page='home')

    @app.route('/demand-prediction')
    def demand_prediction_page():
        return render_template('demand_forecast.html', page='demand_prediction')

    @app.route('/greenshelf')
    def greenshelf_page():
        return render_template('greenshelf.html', page='greenshelf')

    @app.route('/sourcing-platform')
    def sourcing_platform_page():
        return render_template('sourcing.html', page='sourcing_platform')

    @app.route('/sustainability-hub')
    def sustainability_hub_page():
        return render_template('hub.html', page='sustainability_hub')

    # --- API Routes ---

    # Feature 1: AI Demand Prediction
    @app.route('/api/forecast/store/<store_id>/product/<product_sku>', methods=['GET'])
    def get_forecast_api(store_id: str, product_sku: str):
        try:
            future_days_str = request.args.get('days', '7')
            if not future_days_str.isdigit():
                return jsonify({"error": "Invalid 'days' parameter. Must be an integer."}), 400
            future_days = int(future_days_str)

            if future_days <= 0 or future_days > 90:
                 return jsonify({"error": "'days' parameter must be between 1 and 90."}), 400

            scenario_adjustments = {}
            event_impact_multiplier_str = request.args.get('event_impact_multiplier')
            if event_impact_multiplier_str:
                try:
                    scenario_adjustments['event_impact_multiplier'] = float(event_impact_multiplier_str)
                except ValueError:
                    return jsonify({"error": "Invalid 'event_impact_multiplier'. Must be a float."}), 400

            temp_adjust_str = request.args.get('temperature_increase_celsius')
            if temp_adjust_str:
                try:
                    scenario_adjustments['weather_override'] = {
                        "temperature_increase_celsius": float(temp_adjust_str)
                    }
                except ValueError:
                    return jsonify({"error": "Invalid 'temperature_increase_celsius'. Must be a float."}), 400

            forecast_result = demand_forecasting_service.predict(
                store_id, product_sku, future_days, scenario_adjustments
            )
            return jsonify(forecast_result.to_dict())
        except Exception as e:
            app.logger.error(f"Error in get_forecast_api: {e}", exc_info=True)
            return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

    @app.route('/api/stores', methods=['GET'])
    def get_stores_api():
        mock_stores = [
            {"id": "Store101", "name": "Store #101 - Fayetteville, AR"},
            {"id": "Store203", "name": "Store #203 - Bentonville, AR"},
            {"id": "Store505", "name": "Store #505 - Rogers, AR"}
        ]
        return jsonify(mock_stores)

    @app.route('/api/products/<store_id>/<category_id>', methods=['GET'])
    def get_products_api(store_id: str, category_id: str):
        from .models.greenshelf_models import MOCK_PRODUCT_MASTERS_GS # Import here to avoid circular if models use app context

        # Start with a base set of products per category for the demo
        products_by_cat = {
            "FreshProduce": [
                {"sku": "SKU_FRUIT_BANANAS", "name": "Organic Bananas (Bunch)"},
                {"sku": "SKU_VEG_LETTUCE", "name": "Romaine Lettuce Head"}
            ],
            "Dairy": [
                {"sku": "SKU_DAIRY_MILK1G", "name": "Whole Milk (1 Gallon)"},
            ],
            "Bakery": [
                {"sku": "SKU_BAKE_BREADW", "name": "Whole Wheat Bread"}
            ],
             "Meat": [
                {"sku": "SKU_MEAT_CHICKEN", "name": "Chicken Thighs (1lb)"}
            ]
        }
        # Augment with products from GreenShelf's mock master data if not already present
        for sku, master in MOCK_PRODUCT_MASTERS_GS.items():
            if master.category not in products_by_cat:
                products_by_cat[master.category] = []
            if not any(p['sku'] == sku for p in products_by_cat[master.category]):
                 products_by_cat[master.category].append({"sku": sku, "name": master.name})

        return jsonify(products_by_cat.get(category_id, []))

    @app.route('/api/product_categories', methods=['GET'])
    def get_product_categories_api():
        from .models.greenshelf_models import MOCK_PRODUCT_MASTERS_GS
        categories_set = set(["FreshProduce", "Dairy", "Bakery", "Meat"])
        for master in MOCK_PRODUCT_MASTERS_GS.values():
            categories_set.add(master.category)
        categories_list = [{"id": cat, "name": cat} for cat in sorted(list(categories_set))]
        return jsonify(categories_list)

    # --- Feature 2: GreenShelf API Routes ---
    @app.route('/api/greenshelf/store/<store_id>/layout_summary', methods=['GET'])
    def get_shelf_layout_summary_api(store_id: str):
        try:
            simulate_updates_str = request.args.get('simulate_updates', 'true').lower()
            simulate_updates = simulate_updates_str == 'true'
            summary = greenshelf_service.get_all_shelves_summary(store_id, simulate_updates=simulate_updates)
            return jsonify(summary)
        except Exception as e:
            app.logger.error(f"Error in get_shelf_layout_summary_api: {e}", exc_info=True)
            return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

    @app.route('/api/greenshelf/shelf/<shelf_id>/items', methods=['GET'])
    def get_shelf_items_api(shelf_id: str):
        try:
            simulate_updates_str = request.args.get('simulate_updates', 'true').lower()
            simulate_updates = simulate_updates_str == 'true'
            items = greenshelf_service.get_shelf_items(shelf_id, simulate_updates=simulate_updates)
            return jsonify([item.to_dict() for item in items])
        except Exception as e:
            app.logger.error(f"Error in get_shelf_items_api: {e}", exc_info=True)
            return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

    @app.route('/api/greenshelf/item/<instance_id>/details', methods=['GET'])
    def get_greenshelf_item_details_api(instance_id: str):
        try:
            item_tuple = greenshelf_service.get_instance_by_id(instance_id)
            if item_tuple:
                item, _ = item_tuple
                greenshelf_service.simulate_sensor_update_for_instance(item)
                return jsonify(item.to_dict())
            else:
                return jsonify({"error": "Product instance not found"}), 404
        except Exception as e:
            app.logger.error(f"Error in get_greenshelf_item_details_api: {e}", exc_info=True)
            return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

    # Add other feature API routes here as they are developed

    # --- Feature 3: Dynamic Pricing API Routes ---
    @app.route('/api/pricing/item/<instance_id>', methods=['GET'])
    def get_item_dynamic_price_api(instance_id: str):
        try:
            demand_factor_str = request.args.get('demand_factor')
            demand_factor = float(demand_factor_str) if demand_factor_str else None

            priced_item_result = pricing_service.get_dynamic_price_for_instance(instance_id, demand_signal_factor=demand_factor)
            if priced_item_result:
                return jsonify(priced_item_result.to_dict())
            else:
                # Attempt to get raw item details if pricing failed but item exists
                raw_item_tuple = greenshelf_service.get_instance_by_id(instance_id)
                if raw_item_tuple:
                    raw_item, _ = raw_item_tuple
                    return jsonify({
                        "message": "Dynamic pricing calculation failed or not applicable.",
                        "item_details": raw_item.to_dict()
                    }), 202 # Accepted, but not fully processed for pricing
                return jsonify({"error": "Product instance not found or pricing info missing."}), 404
        except Exception as e:
            app.logger.error(f"Error in get_item_dynamic_price_api: {e}", exc_info=True)
            return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

    @app.route('/api/pricing/shelf/<shelf_id>/items', methods=['GET'])
    def get_shelf_dynamic_prices_api(shelf_id: str):
        try:
            # This endpoint will now call the pricing service which in turn calls GreenShelf service
            priced_items = pricing_service.get_dynamic_prices_for_shelf_items(shelf_id)
            return jsonify([item.to_dict() for item in priced_items])
        except Exception as e:
            app.logger.error(f"Error in get_shelf_dynamic_prices_api: {e}", exc_info=True)
            return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

    # Placeholder for staff actions like approving discounts if we build that UI part
    # @app.route('/api/pricing/item/<instance_id>/action', methods=['POST'])
    # def post_pricing_action_api(instance_id: str):
    #     data = request.json
    #     action = data.get('action') # e.g., "approve_discount", "manual_override"
    #     # ... logic to handle action ...
    #     return jsonify({"message": f"Action '{action}' processed for {instance_id} (simulated)"})

    # --- Feature 4: Ethical & Sustainable Sourcing Platform API Routes ---
    @app.route('/api/sourcing/product/<sku>/batch/<batch_id>/traceability', methods=['GET'])
    def get_product_traceability_api(sku: str, batch_id: str):
        try:
            trace_info = sourcing_service.get_product_traceability_info(sku, batch_id)
            if trace_info:
                return jsonify(trace_info.to_dict())
            else:
                # Try with a default batch_id for demo purposes if specific one not found
                # This helps if the frontend doesn't have a real batch_id to send initially for a SKU
                generic_batch_id_for_sku = f"DEMO_BATCH_{sku}"
                trace_info_generic = sourcing_service.get_product_traceability_info(sku, generic_batch_id_for_sku)
                if trace_info_generic:
                    return jsonify(trace_info_generic.to_dict())

                return jsonify({"error": f"Traceability information not found for SKU {sku} (batch {batch_id} or demo batch)."}), 404
        except Exception as e:
            app.logger.error(f"Error in get_product_traceability_api: {e}", exc_info=True)
            return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

    # --- Feature 5: Sustainability Command Center API Routes ---
    @app.route('/api/hub/dashboard/<store_id>', methods=['GET'])
    def get_hub_dashboard_api(store_id: str):
        try:
            period = request.args.get('period', 'daily') # 'daily', 'weekly', 'monthly'
            if period not in ['daily', 'weekly', 'monthly']:
                return jsonify({"error": "Invalid period parameter. Choose from 'daily', 'weekly', 'monthly'."}), 400

            dashboard_data = hub_service.generate_mock_dashboard_data(store_id, period)
            return jsonify(dashboard_data.to_dict())
        except Exception as e:
            app.logger.error(f"Error in get_hub_dashboard_api: {e}", exc_info=True)
            return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

    return app

if __name__ == '__main__':
    # This structure allows running the app with `python -m app.main` from the project root,
    # or `python main.py` if you are in the `app` directory.
    # For `flask run`, you might need to set FLASK_APP=app.main:create_app or similar
    # depending on your project structure and how you installed Flask.
    app_instance = create_app()
    app_instance.run(debug=True, host='0.0.0.0', port=5001)

```
