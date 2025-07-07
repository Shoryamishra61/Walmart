from datetime import date
from typing import Optional, Dict

# Re-using ProductInstanceGS from greenshelf_models for context, but DynamicPricingService will mostly operate on its data.
# from .greenshelf_models import ProductInstanceGS

class ProductPricingInfo:
    """Stores base pricing information for a SKU."""
    def __init__(self, sku: str, original_price: float, cost_price: float, min_margin_pct: float = 0.05):
        self.sku = sku
        self.original_price = original_price
        self.cost_price = cost_price
        self.min_margin_pct = min_margin_pct  # Default minimum margin for this product

    def to_dict(self):
        return vars(self)

class DynamicPriceResult:
    """Result of a dynamic pricing calculation for a specific product instance."""
    def __init__(self, instance_id: str, sku: str, product_name: str,
                 original_price: float, discount_percentage: float,
                 discounted_price: float, reason: str,
                 predicted_spoilage_date: date,
                 status_from_greenshelf: str, # For context
                 status_color_from_greenshelf: str # For context
                 ):
        self.instance_id = instance_id
        self.sku = sku
        self.product_name = product_name
        self.original_price = original_price
        self.discount_percentage = discount_percentage
        self.discounted_price = discounted_price
        self.reason = reason  # e.g., "Nearing Best By", "Manager Special"
        self.predicted_spoilage_date = predicted_spoilage_date
        self.status_from_greenshelf = status_from_greenshelf
        self.status_color_from_greenshelf = status_color_from_greenshelf


    def to_dict(self):
        return {
            "instance_id": self.instance_id,
            "sku": self.sku,
            "product_name": self.product_name,
            "original_price": self.original_price,
            "discount_percentage": self.discount_percentage,
            "discounted_price": self.discounted_price,
            "reason": self.reason,
            "predicted_spoilage_date": self.predicted_spoilage_date.isoformat(),
            "status_from_greenshelf": self.status_from_greenshelf,
            "status_color_from_greenshelf": self.status_color_from_greenshelf
        }

# Mock data for product base pricing (could be loaded from config/DB)
# Using different SKUs from GreenShelf to ensure they are distinct if needed, or can align them.
# For this demo, let's align them with MOCK_PRODUCT_MASTERS_GS SKUs.
MOCK_PRODUCT_PRICING_PS: Dict[str, ProductPricingInfo] = {
    "SKU_DAIRY_MILK1G": ProductPricingInfo(sku="SKU_DAIRY_MILK1G", original_price=3.99, cost_price=2.00, min_margin_pct=0.10),
    "SKU_FRUIT_BANANAS": ProductPricingInfo(sku="SKU_FRUIT_BANANAS", original_price=1.99, cost_price=0.50, min_margin_pct=0.15),
    "SKU_VEG_LETTUCE": ProductPricingInfo(sku="SKU_VEG_LETTUCE", original_price=2.49, cost_price=0.75, min_margin_pct=0.10),
    "SKU_MEAT_CHICKEN": ProductPricingInfo(sku="SKU_MEAT_CHICKEN", original_price=7.99, cost_price=4.00, min_margin_pct=0.20),
    "SKU_BAKE_BREADW": ProductPricingInfo(sku="SKU_BAKE_BREADW", original_price=3.29, cost_price=1.20, min_margin_pct=0.10),
}

class DynamicPricingRulesConfig:
    # Rules: (days_remaining_threshold, discount_percentage, rule_name_template)
    # Templates can use {product_name}
    TIERS = {
        "Critical / Donate": [ # Status from GreenShelf
            (0, 0.75, "75% Off - Today Only for {product_name}!"),
            (1, 0.60, "60% Off - Expires Tomorrow: {product_name}!")
        ],
        "Nearing Expiry": [
            (2, 0.40, "40% Off - Freshness Deal on {product_name}!"),
            (3, 0.25, "25% Off - Great Value {product_name}!")
        ],
        "Approaching": [
            (5, 0.10, "10% Off - Early Bird deal for {product_name}!")
        ]
        # "Normal" and "Spoiled" typically won't have dynamic discounts from this system.
    }
    MAX_DISCOUNT_PERCENTAGE = 0.90  # Absolute maximum discount allowed
    # For hackathon, demand_signal_factor is simplified or passed directly.
    # A more complex system would fetch this from Demand Forecasting service.
    DEFAULT_DEMAND_FACTOR = 1.0
```
