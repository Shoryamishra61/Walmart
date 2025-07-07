from datetime import datetime, timedelta, date
from typing import List, Dict, Optional, Tuple
import random

from ..models.greenshelf_models import (
    SensorReading, ProductMasterGS, ProductInstanceGS, MOCK_PRODUCT_MASTERS_GS
)

class GreenShelfService:
    def __init__(self):
        self.product_masters: Dict[str, ProductMasterGS] = MOCK_PRODUCT_MASTERS_GS
        # In-memory store for product instances on shelves for the demo
        # shelf_id -> List[ProductInstanceGS]
        self.shelf_inventory: Dict[str, List[ProductInstanceGS]] = {}
        self._initialize_mock_inventory()

    def _initialize_mock_inventory(self):
        """Populates some mock inventory for demo purposes if it's empty."""
        if self.shelf_inventory: # Avoid re-initializing if already populated
            return

        shelf_ids = ["ShelfA1_Dairy", "ShelfA2_Produce", "ShelfB1_Meat", "ShelfC1_Bakery"]
        # Assign SKUs to shelves based on category for realism
        shelf_sku_map = {
            "ShelfA1_Dairy": ["SKU_DAIRY_MILK1G"],
            "ShelfA2_Produce": ["SKU_FRUIT_BANANAS", "SKU_VEG_LETTUCE"],
            "ShelfB1_Meat": ["SKU_MEAT_CHICKEN"],
            "ShelfC1_Bakery": ["SKU_BAKE_BREADW"]
        }

        for shelf_id in shelf_ids:
            self.shelf_inventory[shelf_id] = []
            skus_for_shelf = shelf_sku_map.get(shelf_id, list(self.product_masters.keys()))

            for _ in range(random.randint(1, 3)): # 1-3 different product types per shelf
                sku = random.choice(skus_for_shelf)
                master = self.product_masters.get(sku)
                if not master:
                    continue

                # Simulate items received at different times, some fresh, some older
                days_ago_received = random.randint(0, master.base_shelf_life_days // 2)
                received = date.today() - timedelta(days=days_ago_received)

                # Printed expiry is based on base shelf life from received date
                printed_expiry = received + timedelta(days=master.base_shelf_life_days)

                # Simulate some items being closer to their printed expiry
                if random.random() < 0.3: # 30% chance item is older
                    additional_age = random.randint(0, master.base_shelf_life_days // 3)
                    printed_expiry_adjusted = printed_expiry - timedelta(days=additional_age)
                    # Ensure printed expiry is not before received date
                    printed_expiry = max(received + timedelta(days=1), printed_expiry_adjusted)


                instance_id = f"{sku}_batch{random.randint(1000, 9999)}"

                # Simulate initial temperature slightly off ideal for some items
                initial_temp = master.ideal_temp_c + random.uniform(-0.5, 2.5) # Can be a bit warmer
                initial_humidity = random.uniform(40, 70) if master.category == "Produce" else None
                initial_conditions = SensorReading(datetime.now() - timedelta(hours=random.randint(1,6)), initial_temp, initial_humidity)

                instance = ProductInstanceGS(
                    instance_id=instance_id,
                    sku=sku,
                    product_name=master.name,
                    printed_expiry_date=printed_expiry,
                    received_date=received,
                    shelf_id=shelf_id,
                    quantity=random.randint(3, 15),
                    current_conditions=initial_conditions
                )
                # Initial spoilage calculation
                self.update_product_spoilage_status(instance, master)
                self.shelf_inventory[shelf_id].append(instance)

        # print("Mock inventory initialized for GreenShelf.")
        # for shelf_id, items in self.shelf_inventory.items():
        #     print(f"Shelf {shelf_id}:")
        #     for item in items:
        #         print(f"  - {item.product_name} ({item.instance_id}), Status: {item.status}, Pred Spoil: {item.predicted_spoilage_date}")


    def get_product_master(self, sku: str) -> Optional[ProductMasterGS]:
        return self.product_masters.get(sku)

    def update_product_spoilage_status(self, instance: ProductInstanceGS, master: Optional[ProductMasterGS] = None):
        """
        Updates the predicted_spoilage_date and status of a ProductInstanceGS.
        This is a core logic for GreenShelf.
        """
        if not master:
            master = self.get_product_master(instance.sku)

        if not master:
            # Cannot calculate without master data
            instance.status = "Error: Missing Product Info"
            instance.status_color = "grey"
            return

        # --- Simplified Predictive Spoilage Model for Hackathon ---
        # Real model would use full condition_history, humidity, light, ethylene etc.
        # This model: Base shelf life from received date, adjusted by average temperature deviation.

        days_since_received = (date.today() - instance.received_date).days

        # Calculate average temperature from history (or use current if history is short)
        avg_temp_exposure = instance.current_conditions.temperature_c
        if instance.condition_history and len(instance.condition_history) > 1:
            avg_temp_exposure = sum(sr.temperature_c for sr in instance.condition_history) / len(instance.condition_history)

        temp_deviation_from_ideal = max(0, avg_temp_exposure - master.ideal_temp_c)

        # Calculate total days lost due to temperature stress over the time it's been on shelf
        # This is a cumulative effect. Each day at a higher temp reduces effective shelf life.
        # Simplified: (days_on_shelf * deviation * sensitivity_factor)
        cumulative_days_lost_due_to_temp = days_since_received * temp_deviation_from_ideal * master.temp_sensitivity_factor

        effective_shelf_life_days = master.base_shelf_life_days - cumulative_days_lost_due_to_temp

        # Predicted spoilage is received_date + effective_shelf_life
        instance.predicted_spoilage_date = instance.received_date + timedelta(days=max(0, round(effective_shelf_life_days)))

        # Constraint: Predicted spoilage cannot be later than the printed expiry date
        instance.predicted_spoilage_date = min(instance.predicted_spoilage_date, instance.printed_expiry_date)

        # Determine status based on predicted spoilage date
        days_to_predicted_spoilage = (instance.predicted_spoilage_date - date.today()).days

        if days_to_predicted_spoilage < 0:
            instance.status = "Spoiled"
            instance.status_color = "darkred" # Dark Red
        elif days_to_predicted_spoilage <= 1: # Critical (Today or Tomorrow)
            instance.status = "Critical / Donate"
            instance.status_color = "red" # Red
        elif days_to_predicted_spoilage <= 3: # Nearing Expiry (2-3 days left)
            instance.status = "Nearing Expiry"
            instance.status_color = "orange" # Orange
        elif days_to_predicted_spoilage <= 5: # Approaching (4-5 days left)
            instance.status = "Approaching"
            instance.status_color = "yellow" # Yellow
        else:
            instance.status = "Normal"
            instance.status_color = "green" # Green

    def simulate_sensor_update_for_instance(self, instance: ProductInstanceGS):
        """Simulates a new sensor reading and updates the instance."""
        master = self.get_product_master(instance.sku)
        if not master: return

        # Simulate temperature fluctuation
        temp_change = random.uniform(-0.5, 0.5)
        # More aggressive change if already warm, to show effect
        if instance.current_conditions.temperature_c > master.ideal_temp_c + 2:
            temp_change = random.uniform(-0.2, 1.0)

        new_temp = instance.current_conditions.temperature_c + temp_change
        # Keep temperature within a somewhat realistic bound for demo
        new_temp = max(master.ideal_temp_c - 2, min(master.ideal_temp_c + 8, new_temp))

        new_humidity = instance.current_conditions.humidity_pct
        if new_humidity is not None:
            new_humidity += random.uniform(-5, 5)
            new_humidity = max(30, min(90, new_humidity))

        new_reading = SensorReading(datetime.now(), round(new_temp,1), round(new_humidity,1) if new_humidity else None)
        instance.current_conditions = new_reading
        instance.condition_history.append(new_reading)
        if len(instance.condition_history) > 24: # Keep last 24 readings for rolling average
            instance.condition_history.pop(0)

        self.update_product_spoilage_status(instance, master)


    def get_shelf_items(self, shelf_id: str, simulate_updates: bool = True) -> List[ProductInstanceGS]:
        """Returns items on a shelf, optionally simulating sensor updates first."""
        if shelf_id not in self.shelf_inventory:
            return []

        items_on_shelf = self.shelf_inventory[shelf_id]
        if simulate_updates:
            for instance in items_on_shelf:
                self.simulate_sensor_update_for_instance(instance)

        return items_on_shelf

    def get_all_shelves_summary(self, store_id: str, simulate_updates: bool = True) -> Dict[str, str]:
        """
        Returns a summary status (worst status color) for each shelf in the store.
        For demo, store_id is not strictly used as inventory is global mock.
        """
        summary: Dict[str, str] = {}
        color_priority = {"green": 0, "yellow": 1, "orange": 2, "red": 3, "darkred": 4, "grey": 5}

        for shelf_id, instances in self.shelf_inventory.items():
            if not instances:
                summary[shelf_id] = "grey" # Empty or unknown
                continue

            worst_numeric_status = 0
            for instance in instances:
                if simulate_updates: # Ensure status is fresh before summarizing
                    self.simulate_sensor_update_for_instance(instance)

                current_numeric = color_priority.get(instance.status_color, 0)
                if current_numeric > worst_numeric_status:
                    worst_numeric_status = current_numeric

            # Find color corresponding to the worst numeric status
            shelf_color = "grey" # Default
            for color, priority_val in color_priority.items():
                if priority_val == worst_numeric_status:
                    shelf_color = color
                    break
            summary[shelf_id] = shelf_color

        return summary

    def get_instance_by_id(self, instance_id: str) -> Optional[Tuple[ProductInstanceGS, str]]:
        """ Finds an instance by its ID across all shelves. Returns (instance, shelf_id) or None. """
        for shelf_id, items_on_shelf in self.shelf_inventory.items():
            for item in items_on_shelf:
                if item.instance_id == instance_id:
                    return item, shelf_id
        return None

# Example for direct testing
if __name__ == '__main__':
    gs_service = GreenShelfService()

    print("--- Initial Shelf Summary ---")
    summary = gs_service.get_all_shelves_summary("Store101", simulate_updates=False) # Don't simulate for initial view
    for shelf, status_color in summary.items():
        print(f"Shelf {shelf}: {status_color}")

    print("\n--- Items on ShelfA1_Dairy (initial) ---")
    shelf_a1_items = gs_service.get_shelf_items("ShelfA1_Dairy", simulate_updates=False)
    for item in shelf_a1_items:
        print(f"  - {item.product_name} ({item.instance_id}), Status: {item.status}, Pred Spoil: {item.predicted_spoilage_date}, Temp: {item.current_conditions.temperature_c:.1f}°C")

    # Simulate some time passing and sensor updates for a specific item
    if shelf_a1_items:
        test_item = shelf_a1_items[0]
        print(f"\n--- Simulating updates for {test_item.product_name} ({test_item.instance_id}) ---")
        for i in range(5): # Simulate 5 updates
            gs_service.simulate_sensor_update_for_instance(test_item)
            print(f"  Update {i+1}: Temp: {test_item.current_conditions.temperature_c:.1f}°C, Pred Spoil: {test_item.predicted_spoilage_date}, Status: {test_item.status}")

    print("\n--- Shelf Summary After Some Simulations ---")
    summary_after = gs_service.get_all_shelves_summary("Store101", simulate_updates=True)
    for shelf, status_color in summary_after.items():
        print(f"Shelf {shelf}: {status_color}")
```
