from datetime import datetime
from typing import List, Dict, Optional, Any

class GeoPoint:
    def __init__(self, lat: float, lon: float, name: Optional[str] = None):
        self.lat = lat
        self.lon = lon
        self.name = name if name else f"{lat:.4f}, {lon:.4f}"

    def to_dict(self):
        return vars(self)

class CertificationInfo:
    def __init__(self, id: str, name: str, logo_url: str, description: str):
        self.id = id
        self.name = name
        self.logo_url = logo_url # e.g., "static/img/fair_trade_logo.png"
        self.description = description

    def to_dict(self):
        return vars(self)

class SourceDetail: # Represents a farm, factory, cooperative
    def __init__(self, source_id: str, name: str, type: str, # "Farm", "Processing Plant", "Cooperative"
                 location: GeoPoint, story: str, image_url: str,
                 certifications: List[CertificationInfo] = None):
        self.source_id = source_id
        self.name = name
        self.type = type
        self.location = location
        self.story = story
        self.image_url = image_url # e.g., "static/img/hacienda_la_esperanza.jpg"
        self.certifications = certifications if certifications else []

    def to_dict(self):
        return {
            "source_id": self.source_id,
            "name": self.name,
            "type": self.type,
            "location": self.location.to_dict(),
            "story": self.story,
            "image_url": self.image_url,
            "certifications": [cert.to_dict() for cert in self.certifications]
        }

class JourneyStep:
    def __init__(self, step_name: str, date_iso: str, # ISO format date string "YYYY-MM-DD"
                 location_name: str, description: str,
                 icon_type: str, # For frontend UI hint: "leaf", "tractor", "factory", "ship", "warehouse", "store"
                 media_url: Optional[str] = None, # Optional image/video for this step
                 location_geo: Optional[GeoPoint] = None): # Optional geo-coordinates for map pin
        self.step_name = step_name
        self.date_iso = date_iso
        self.location_name = location_name
        self.description = description
        self.icon_type = icon_type
        self.media_url = media_url
        self.location_geo = location_geo

    def to_dict(self):
        return {
            "step_name": self.step_name,
            "date_iso": self.date_iso,
            "location_name": self.location_name,
            "description": self.description,
            "icon_type": self.icon_type,
            "media_url": self.media_url,
            "location_geo": self.location_geo.to_dict() if self.location_geo else None
        }

class ProductImpactMetrics:
    def __init__(self, carbon_footprint_co2e_kg: Optional[float] = None,
                 water_usage_liters: Optional[float] = None,
                 ethical_labor_rating: Optional[str] = None, # "Excellent", "Good", "Fair", "Needs Improvement"
                 recyclability_score_pct: Optional[float] = None): # Packaging recyclability
        self.carbon_footprint_co2e_kg = carbon_footprint_co2e_kg
        self.water_usage_liters = water_usage_liters
        self.ethical_labor_rating = ethical_labor_rating
        self.recyclability_score_pct = recyclability_score_pct

    def to_dict(self):
        return vars(self)

class SourcedProductInfo:
    """Comprehensive traceability and sustainability info for a product batch."""
    def __init__(self, sku: str, batch_id: str, product_name: str,
                 product_image_url: str, # e.g., "static/img/colombian_coffee_beans.jpg"
                 main_story: str, # Overall story for the product
                 sources: List[SourceDetail], # Key sources like primary farm/factory
                 journey: List[JourneyStep], # Ordered list of steps from origin to consumer
                 impact_metrics: ProductImpactMetrics,
                 additional_links: Optional[List[Dict[str,str]]] = None): # e.g., {"name": "Learn More", "url": "..."}
        self.sku = sku
        self.batch_id = batch_id
        self.product_name = product_name
        self.product_image_url = product_image_url
        self.main_story = main_story
        self.sources = sources
        self.journey = journey
        self.impact_metrics = impact_metrics
        self.additional_links = additional_links if additional_links else []

    def to_dict(self):
        return {
            "sku": self.sku,
            "batch_id": self.batch_id,
            "product_name": self.product_name,
            "product_image_url": self.product_image_url,
            "main_story": self.main_story,
            "sources": [s.to_dict() for s in self.sources],
            "journey": [j.to_dict() for j in self.journey],
            "impact_metrics": self.impact_metrics.to_dict(),
            "additional_links": self.additional_links
        }

# Mock Certifications Data (could be in a config or DB)
MOCK_CERTIFICATIONS_SR: Dict[str, CertificationInfo] = {
    "fair_trade": CertificationInfo(id="fair_trade", name="Fair Trade Certified™", logo_url="static/img/fair_trade_logo.png", description="Ensures fair prices, decent working conditions, and local sustainability for farmers and workers."),
    "usda_organic": CertificationInfo(id="usda_organic", name="USDA Organic", logo_url="static/img/usda_organic_logo.png", description="Grown and processed according to federal guidelines addressing soil quality, animal raising practices, pest and weed control, and use of additives."),
    "rainforest_alliance": CertificationInfo(id="rainforest_alliance", name="Rainforest Alliance Certified™", logo_url="static/img/rainforest_alliance_logo.png", description="Products sourced from farms or forests certified to standards promoting environmental, social, and economic sustainability.")
}
```
