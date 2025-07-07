const db = require('../db');

const getKpis = async (req, res) => {
    try {
        const totalProductsCount = (await db.query('SELECT COUNT(*) FROM products')).rows[0].count;
        const wastedProductsCount = (await db.query("SELECT COUNT(*) FROM products WHERE status = 'Donation Alert'")).rows[0].count;
        const discountedProductsSum = (await db.query("SELECT SUM(price) FROM products WHERE status = 'Nearing Expiry'")).rows[0].sum || 0;

        // --- NEW CHART DATA ---
        // Simulate historical data for the chart. In a real app, this would come from historical records.
        const chartData = {
            labels: ['January', 'February', 'March', 'April', 'May', 'June'],
            wasteCosts: [15000, 12000, 13000, 9000, 7500, 6000], // Decreasing trend
            recoveredRevenue: [4000, 5500, 6200, 7000, 8100, 9500] // Increasing trend
        };
        // --------------------

        res.json({
            wasteDiverted: (parseInt(wastedProductsCount) * 1.2).toFixed(0),
            revenueRecovered: parseFloat(discountedProductsSum).toFixed(2),
            co2Reduction: ((parseInt(wastedProductsCount) * 1.2) * 1.5).toFixed(0),
            mealsDonated: (parseInt(wastedProductsCount) * 500),
            chartData: chartData // Send chart data with KPIs
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getInventory = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM products ORDER BY id');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateInventoryStatus = async (io) => {
    try {
        await db.query(
            "UPDATE products SET status = 'Nearing Expiry', price = price * 0.7 WHERE expiry_date <= NOW() + INTERVAL '2 days' AND status = 'Fresh' RETURNING *"
        );
        await db.query(
            "UPDATE products SET status = 'Donation Alert' WHERE expiry_date <= NOW() + INTERVAL '1 day' AND status = 'Nearing Expiry' RETURNING *"
        );
        const { rows } = await db.query('SELECT * FROM products ORDER BY id');
        io.emit('full_inventory_update', rows);
    } catch (error) {
        console.error("Error updating inventory status:", error);
    }
};

module.exports = { getInventory, getKpis, updateInventoryStatus };