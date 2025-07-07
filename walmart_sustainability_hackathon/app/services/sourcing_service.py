from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
import random

from ..models.sourcing_models import (
    GeoPoint, CertificationInfo, SourceDetail, JourneyStep,
    ProductImpactMetrics, SourcedProductInfo, MOCK_CERTIFICATIONS_SR
)

# --- Mock Data Generation for Sourcing ---

MOCK_SOURCE_DETAILS_SR: Dict[str, SourceDetail] = {
    "FARM_COFFEE_COL_ANDES": SourceDetail(
        source_id="FARM_COFFEE_COL_ANDES", name="Hacienda La Esmeralda", type="Coffee Farm",
        location=GeoPoint(lat=4.5709, lon=-74.2973, name="Andes Foothills, Colombia"),
        story="A family-run estate for 5 generations, Hacienda La Esmeralda uses shade-growing techniques that preserve biodiversity and produce exceptional Arabica beans. They are committed to fair wages and reinvesting in their local community's education.",
        image_url="static/img/hacienda_la_esperanza.jpg", # Placeholder image
        certifications=[MOCK_CERTIFICATIONS_SR["rainforest_alliance"], MOCK_CERTIFICATIONS_SR["usda_organic"]]
    ),
    "COOP_ANTIOQUIA_COFFEE": SourceDetail(
        source_id="COOP_ANTIOQUIA_COFFEE", name="Antioquia Coffee Producers Co-op", type="Cooperative & Processing",
        location=GeoPoint(lat=6.2442, lon=-75.5812, name="Medellín, Antioquia, Colombia"),
        story="This cooperative unites over 100 smallholder coffee farmers, providing them with access to better processing facilities, quality control, and direct market access, ensuring fair prices for their hard work.",
        image_url="static/img/antioquia_coop.jpg", # Placeholder image
        certifications=[MOCK_CERTIFICATIONS_SR["fair_trade"]]
    ),
    "FARM_BANANA_ECUADOR": SourceDetail(
        source_id="FARM_BANANA_ECUADOR", name="Oro Verde Banana Plantation", type="Banana Farm",
        location=GeoPoint(lat=-1.2790, lon=-79.0000, name="Los Ríos Province, Ecuador"),
        story="Oro Verde is dedicated to sustainable banana cultivation, using integrated pest management and water conservation techniques. They provide on-site healthcare and schooling for workers' families.",
        image_url="static/img/colombian_coffee_beans.jpg", # Placeholder, needs banana farm image
        certifications=[MOCK_CERTIFICATIONS_SR["rainforest_alliance"]]
    )
}

def generate_mock_sourcing_info(sku: str, batch_id: str) -> Optional[SourcedProductInfo]:
    """Generates mock traceability data for specific SKUs for the demo."""

    product_name, product_image, main_story = "", "", ""
    sources: List[SourceDetail] = []
    journey: List[JourneyStep] = []
    impact_metrics: ProductImpactMetrics

    base_date = datetime.now() - timedelta(days=random.randint(45, 180)) # Simulating origin date

    if sku == "SKU_COFFEE_PREMIUM" or sku == "SKU_DAIRY_MILK1G": # SKU_DAIRY_MILK1G is from GreenShelf, let's use it.
        product_name = "Colombian Supremo Coffee Beans"
        product_image = "static/img/colombian_coffee_beans.jpg"
        main_story = "Discover the rich aroma and smooth taste of our 100% Arabica Colombian Supremo, grown with care in the Andean highlands and ethically sourced through cooperatives that empower local farmers."
        sources = [MOCK_SOURCE_DETAILS_SR["FARM_COFFEE_COL_ANDES"], MOCK_SOURCE_DETAILS_SR["COOP_ANTIOQUIA_COFFEE"]]

        journey = [
            JourneyStep("Harvesting", (base_date).strftime("%Y-%m-%d"), sources[0].name,
                        "Ripe coffee cherries are selectively hand-picked.", "leaf",
                        media_url="static/img/coffee_harvest.jpg", location_geo=sources[0].location),
            JourneyStep("Washing & Pulping", (base_date + timedelta(days=1)).strftime("%Y-%m-%d"), sources[1].name,
                        "Cherries are washed and pulped at the cooperative's facility.", "factory", location_geo=sources[1].location),
            JourneyStep("Sun Drying", (base_date + timedelta(days=3)).strftime("%Y-%m-%d"), sources[1].name,
                        "Beans are carefully sun-dried on patios to optimal moisture levels.", "sun", # Assuming a 'sun' icon
                        media_url="static/img/coffee_drying.jpg", location_geo=sources[1].location),
            JourneyStep("Quality Sorting", (base_date + timedelta(days=10)).strftime("%Y-%m-%d"), sources[1].name,
                        "Beans are graded and sorted by size and quality.", "check-circle", location_geo=sources[1].location),
            JourneyStep("Export Preparation", (base_date + timedelta(days=12)).strftime("%Y-%m-%d"), "Port of Buenaventura",
                        "Packed into eco-friendly jute bags for ocean freight.", "box",
                        location_geo=GeoPoint(3.8856, -77.0700, "Port of Buenaventura, Colombia")),
            JourneyStep("Ocean Freight", (base_date + timedelta(days=15)).strftime("%Y-%m-%d"), "Transatlantic Route",
                        "Sustainably shipped to minimize environmental impact.", "ship"),
            JourneyStep("Arrival at Walmart DC", (base_date + timedelta(days=45)).strftime("%Y-%m-%d"), "Walmart DC - City, USA",
                        "Received, quality checked, and prepared for store distribution.", "warehouse",
                        location_geo=GeoPoint(36.0626, -94.1574, "Walmart DC - Bentonville, AR (Example)")),
            JourneyStep("On Your Shelf", (base_date + timedelta(days=50)).strftime("%Y-%m-%d"), "Your Local Walmart",
                        "Ready for you to enjoy!", "store",
                        location_geo=GeoPoint(36.0712, -94.1985, "Your Local Walmart (Example)")),
        ]
        impact_metrics = ProductImpactMetrics(
            carbon_footprint_co2e_kg=round(random.uniform(0.8, 2.5), 2), # per bag/unit
            water_usage_liters=round(random.uniform(100, 250), 1),
            ethical_labor_rating=random.choice(["Excellent", "Good"]),
            recyclability_score_pct=random.uniform(70, 95)
        )

    elif sku == "SKU_FRUIT_BANANAS":
        product_name = "Organic Fairtrade Bananas"
        product_image = "static/img/colombian_coffee_beans.jpg" # Placeholder, needs banana image
        main_story = "Sweet and nutritious, our organic bananas are sourced from Rainforest Alliance certified farms in Ecuador, ensuring sustainable practices and fair treatment for workers."
        sources = [MOCK_SOURCE_DETAILS_SR["FARM_BANANA_ECUADOR"]]
        journey = [
            JourneyStep("Growing", (base_date).strftime("%Y-%m-%d"), sources[0].name,
                        "Cultivated using organic methods, protecting the soil and local ecosystem.", "leaf", location_geo=sources[0].location),
            JourneyStep("Harvesting", (base_date + timedelta(days=90)).strftime("%Y-%m-%d"), sources[0].name, # Bananas have longer cycles
                        "Carefully harvested by hand when perfectly mature.", "tractor", location_geo=sources[0].location),
            JourneyStep("Packhouse Sorting", (base_date + timedelta(days=91)).strftime("%Y-%m-%d"), sources[0].name,
                        "Washed, sorted by size, and packed into recyclable boxes.", "box", location_geo=sources[0].location),
            JourneyStep("Refrigerated Transport", (base_date + timedelta(days=93)).strftime("%Y-%m-%d"), "Port of Guayaquil",
                        "Shipped in temperature-controlled containers to maintain freshness.", "ship",
                        location_geo=GeoPoint(-2.2780, -79.9220, "Port of Guayaquil, Ecuador")),
             JourneyStep("Arrival at Walmart DC", (base_date + timedelta(days=110)).strftime("%Y-%m-%d"), "Walmart DC - City, USA",
                        "Received and inspected for quality.", "warehouse",
                        location_geo=GeoPoint(34.0522, -118.2437, "Walmart DC - Los Angeles, CA (Example)")),
            JourneyStep("On Your Shelf", (base_date + timedelta(days=113)).strftime("%Y-%m-%d"), "Your Local Walmart",
                        "Fresh and ready to eat!", "store",
                        location_geo=GeoPoint(34.0600, -118.2500, "Your Local Walmart (Example)")),
        ]
        impact_metrics = ProductImpactMetrics(
            carbon_footprint_co2e_kg=round(random.uniform(0.3, 0.8), 2), # per kg
            water_usage_liters=round(random.uniform(20, 70), 1),
            ethical_labor_rating="Excellent",
            recyclability_score_pct=random.uniform(80, 100)
        )
    else:
        return None # No mock data for other SKUs in this demo

    return SourcedProductInfo(
        sku=sku, batch_id=batch_id, product_name=product_name, product_image_url=product_image,
        main_story=main_story, sources=sources, journey=journey, impact_metrics=impact_metrics,
        additional_links=[{"name": "Learn about Fair Trade", "url": "#"}, {"name": "Our Sustainability Promise", "url": "#"}]
    )


class SourcingPlatformService:
    def __init__(self):
        # This cache is for demo purposes to avoid regenerating mock data on every call
        self.mock_data_cache: Dict[str, SourcedProductInfo] = {}

    def get_product_traceability_info(self, sku: str, batch_id: str) -> Optional[SourcedProductInfo]:
        """
        Retrieves (or generates mock) traceability and sustainability data for a product batch.
        In a real system, this would query a complex database, blockchain, or supplier APIs.
        """
        cache_key = f"{sku}_{batch_id}"
        if cache_key in self.mock_data_cache and (datetime.now() - self.mock_data_cache[cache_key].journey[0].date_iso < timedelta(minutes=5)): # Simple cache expiry for demo
             # Hacky way to get created_at from SourcedProductInfo if we were to add it
             # For now, just serve from cache to avoid re-generating every time for the same SKU/batch in a short demo
             # pass
             pass


        # For the hackathon, we generate specific mock data for a few known SKUs
        generated_info = generate_mock_sourcing_info(sku, batch_id)
        if generated_info:
            self.mock_data_cache[cache_key] = generated_info
            return generated_info

        # Fallback for unknown SKUs - generate very generic data or return None
        # print(f"Warning: No specific mock sourcing data for SKU {sku}. Consider adding it.")
        return None


# Example Usage (for testing the service directly)
if __name__ == '__main__':
    service = SourcingPlatformService()

    # Test Coffee
    coffee_sku = "SKU_DAIRY_MILK1G" # Using a GreenShelf SKU for potential linking later
    coffee_batch = "BATCH_CM007"
    coffee_info = service.get_product_traceability_info(coffee_sku, coffee_batch)
    if coffee_info:
        print(f"--- Traceability for: {coffee_info.product_name} ({coffee_info.sku} - {coffee_info.batch_id}) ---")
        print(f"Main Story: {coffee_info.main_story}")
        print("\nSources:")
        for src in coffee_info.sources:
            print(f"  - {src.name} ({src.type}) at {src.location.name}")
            for cert in src.certifications:
                print(f"    * Cert: {cert.name} ({cert.logo_url})")
        print("\nJourney:")
        for step in coffee_info.journey:
            print(f"  - {step.step_name} on {step.date_iso} at {step.location_name} (Icon: {step.icon_type})")
        print("\nImpact Metrics:")
        print(f"  Carbon Footprint: {coffee_info.impact_metrics.carbon_footprint_co2e_kg} kg CO2e")
        print(f"  Water Usage: {coffee_info.impact_metrics.water_usage_liters} Liters")
        print(f"  Ethical Labor: {coffee_info.impact_metrics.ethical_labor_rating}")
        print(f"  Packaging Recyclability: {coffee_info.impact_metrics.recyclability_score_pct}%")
    else:
        print(f"No sourcing info found for {coffee_sku}/{coffee_batch}")

    # Test Bananas
    banana_sku = "SKU_FRUIT_BANANAS"
    banana_batch = "BATCH_BNN001"
    banana_info = service.get_product_traceability_info(banana_sku, banana_batch)
    if banana_info:
        print(f"\n--- Traceability for: {banana_info.product_name} ({banana_info.sku} - {banana_info.batch_id}) ---")
        # ... (print details similarly) ...
    else:
        print(f"No sourcing info found for {banana_sku}/{banana_batch}")
```
