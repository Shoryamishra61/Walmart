from datetime import datetime, date, timedelta
from typing import List, Optional, Dict

class SensorReading:
    def __init__(self, timestamp: datetime, temperature_c: float, humidity_pct: Optional[float] = None):
        self.timestamp = timestamp
        self.temperature_c = temperature_c
        self.humidity_pct = humidity_pct

    def to_dict(self):
        return {
            "timestamp": self.timestamp.isoformat(),
            "temperature_c": self.temperature_c,
            "humidity_pct": self.humidity_pct
        }

class ProductMasterGS: # GS for GreenShelf, to avoid naming conflict if used elsewhere
    def __init__(self, sku: str, name: str, category: str,
                 ideal_temp_c: float, base_shelf_life_days: int,
                 temp_sensitivity_factor: float = 0.1): # days lost per degree C above ideal per day
        self.sku = sku
        self.name = name
        self.category = category
        self.ideal_temp_c = ideal_temp_c
        self.base_shelf_life_days = base_shelf_life_days
        self.temp_sensitivity_factor = temp_sensitivity_factor

    def to_dict(self):
        return vars(self)

class ProductInstanceGS: # Represents a specific batch/item on a shelf
    def __init__(self, instance_id: str, sku: str, printed_expiry_date: date,
                 received_date: date, shelf_id: str, quantity: int,
                 product_name: Optional[str] = "Unknown Product", # Will be populated
                 current_conditions: Optional[SensorReading] = None):
        self.instance_id = instance_id
        self.sku = sku
        self.product_name = product_name
        self.printed_expiry_date = printed_expiry_date
        self.received_date = received_date
        self.shelf_id = shelf_id
        self.quantity = quantity

        self.current_conditions = current_conditions if current_conditions else SensorReading(datetime.now(), 10.0) # Default
        self.condition_history: List[SensorReading] = [self.current_conditions] if self.current_conditions else []

        self.predicted_spoilage_date: date = printed_expiry_date # Initial prediction
        self.status: str = "Normal" # "Normal", "Approaching", "Nearing Expiry", "Critical / Donate", "Spoiled"
        self.status_color: str = "green" # For UI: green, yellow, orange, red, darkred

        # For dynamic pricing integration (can be populated by PricingService)
        self.current_discount_percentage: Optional[float] = None
        self.current_discounted_price: Optional[float] = None
        self.original_price: Optional[float] = None # Should come from product master or pricing DB

    def to_dict(self):
        return {
            "instance_id": self.instance_id,
            "sku": self.sku,
            "product_name": self.product_name,
            "printed_expiry_date": self.printed_expiry_date.isoformat(),
            "received_date": self.received_date.isoformat(),
            "shelf_id": self.shelf_id,
            "quantity": self.quantity,
            "current_conditions": self.current_conditions.to_dict() if self.current_conditions else None,
            # "condition_history": [cond.to_dict() for cond in self.condition_history], # Can be verbose
            "predicted_spoilage_date": self.predicted_spoilage_date.isoformat(),
            "status": self.status,
            "status_color": self.status_color,
            "current_discount_percentage": self.current_discount_percentage,
            "current_discounted_price": self.current_discounted_price,
            "original_price": self.original_price
        }

# Mock data for product masters (could be loaded from a config file or DB)
MOCK_PRODUCT_MASTERS_GS: Dict[str, ProductMasterGS] = {
    "SKU_DAIRY_MILK1G": ProductMasterGS(sku="SKU_DAIRY_MILK1G", name="Whole Milk (1 Gallon)", category="Dairy", ideal_temp_c=3, base_shelf_life_days=12, temp_sensitivity_factor=0.25),
    "SKU_FRUIT_BANANAS": ProductMasterGS(sku="SKU_FRUIT_BANANAS", name="Organic Bananas (Bunch)", category="Produce", ideal_temp_c=13, base_shelf_life_days=7, temp_sensitivity_factor=0.15),
    "SKU_VEG_LETTUCE": ProductMasterGS(sku="SKU_VEG_LETTUCE", name="Romaine Lettuce Head", category="Produce", ideal_temp_c=2, base_shelf_life_days=10, temp_sensitivity_factor=0.2),
    "SKU_MEAT_CHICKEN": ProductMasterGS(sku="SKU_MEAT_CHICKEN", name="Chicken Thighs (1lb)", category="Meat", ideal_temp_c=1, base_shelf_life_days=5, temp_sensitivity_factor=0.3),
    "SKU_BAKE_BREADW": ProductMasterGS(sku="SKU_BAKE_BREADW", name="Whole Wheat Bread", category="Bakery", ideal_temp_c=20, base_shelf_life_days=7, temp_sensitivity_factor=0.05), # Less sensitive
}

# Example: Shelf can have properties too, but for now, it's just an ID
class Shelf:
    def __init__(self, shelf_id: str, store_id: str, location_description: str,
                 current_temp_sensor_id: Optional[str] = None):
        self.shelf_id = shelf_id
        self.store_id = store_id
        self.location_description = location_description # e.g., "Aisle 3, Section B, Refrigerated"
        self.current_temp_sensor_id = current_temp_sensor_id
        # Could also hold a list of ProductInstanceGS objects, but often managed by a service layer
        # self.items_on_shelf: List[ProductInstanceGS] = []

    def to_dict(self):
        return vars(self)
```
