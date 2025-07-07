const db = require('../db');

const logRecyclingActivity = async (req, res) => {
    const { customerId, productId } = req.body;
    if (!customerId || !productId) {
        return res.status(400).json({ error: 'customerId and productId are required.' });
    }
    try {
        await db.query('INSERT INTO recycling_log (customer_id, product_id) VALUES ($1, $2)', [customerId, productId]);
        // In a real app, this would also trigger an update to the customer's points total
        res.status(201).json({ message: 'Recycling activity logged successfully.' });
    } catch (error) {
        console.error("Error logging recycling activity:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const getRecyclingStats = async (req, res) => {
    try {
        const totalRecycled = await db.query('SELECT COUNT(*) FROM recycling_log');
        const mostRecycled = await db.query('SELECT p.name, COUNT(*) as count FROM recycling_log rl JOIN products p ON rl.product_id = p.id GROUP BY p.name ORDER BY count DESC LIMIT 1');
        
        res.json({
            totalItemsRecycled: parseInt(totalRecycled.rows[0].count),
            mostRecycledProduct: mostRecycled.rows.length > 0 ? mostRecycled.rows[0].name : 'N/A'
        });
    } catch (error) {
        console.error("Error getting recycling stats:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = { logRecyclingActivity, getRecyclingStats };
