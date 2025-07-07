# Project Green-Spark: A Unified Sustainability Platform for Walmart

**Project Green-Spark** is a comprehensive, full-stack solution designed for the "Retail with Purpose" Sparkathon. It leverages AI-powered demand forecasting, real-time inventory tracking, and dynamic customer engagement to build a sustainable and responsible future for retail. Our platform directly addresses food waste, optimizes the supply chain, and promotes conscious consumerism.

## ✨ Core Features

* **AI-Powered Demand Prediction:** Utilizes a machine learning model to accurately forecast stock requirements, minimizing overstock and waste.
* **GreenShelf Suite:** A real-time system for:
    * **Automated Expiry Tracking:** Monitors product shelf life across all inventory.
    * **Dynamic Pricing:** Automatically applies discounts to items nearing expiry to incentivize sales.
    * **Automated Donation Alerts:** Notifies partner NGOs for timely pickup of surplus food.
* **Centralized Operations Hub:** An interactive dashboard for managers with 3D store visualization, live inventory status, and AI-driven insights.
* **Customer Engagement Module:** Encourages sustainable shopping through personalized history, smart cart suggestions, and targeted discount notifications.

## 🏆 Winning Criteria Addressed

* **Innovation & Creativity:** Merges AI forecasting with real-time dynamic pricing and 3D data visualization.
* **Technical Feasibility:** Built on a robust, scalable microservices architecture using Docker, Python (FastAPI), Node.js (Express), and React.
* **Impact to Walmart:** Directly reduces waste-related costs, optimizes supply chain efficiency (lowering carbon footprint), generates revenue from near-expiry items, and enhances brand image.
* **Quality of PoC:** A fully functional, integrated, and visually compelling full-stack application ready for demonstration.

## 🚀 How to Run

**Prerequisites:** Docker, Docker Compose, Node.js, Python.

1.  **Generate AI Model:**
    ```bash
    cd services/demand-forecasting
    pip install -r requirements.txt
    python create_model.py
    cd ../..
    ```
2.  **Launch All Services:**
    ```bash
    docker-compose up --build
    ```
3.  **Run Frontend:** (In a new terminal)
    ```bash
    cd frontend
    npm install
    npm start
    ```
4.  **Access:**
    * **Manager Hub:** `http://localhost:3000/`
    * **Customer View:** `http://localhost:3000/customer/12345`

## Troubleshooting (Manual Setup)

If you are running services without Docker, ensure you:
- Manually create the PostgreSQL database and user as described above.
- Use the correct, URL-encoded password in your DATABASE_URL (e.g., Sonu123456%23%40 for Sonu123456#@).
- Start each backend service in its own terminal window.
- If you encounter connection errors, check that PostgreSQL is running and accessible on port 5432. 