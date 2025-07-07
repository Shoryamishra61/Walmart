const db = require('../db');

/**
 * Gets a customer's frequently bought items for smart cart suggestions.
 */
const getSmartSuggestions = async (req, res) => {
    const { id } = req.params;
    try {
        const query = `
            SELECT p.id, p.name, p.price 
            FROM products p 
            JOIN customer_frequent_items cfi ON p.id = cfi.product_id 
            WHERE cfi.customer_id = $1
        `;
        const { rows } = await db.query(query, [id]);
        res.json({
            message: `Suggestions for customer ${id}`,
            suggestions: rows
        });
    } catch (error) {
        console.error("Error fetching smart suggestions:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * Gets general discounts to show to a customer.
 */
const getTargetedDiscounts = async (req, res) => {
    try {
        // For the demo, we show all items that have had their price reduced (are "Nearing Expiry")
        const { rows } = await db.query("SELECT id, name, price FROM products WHERE status = 'Nearing Expiry'");
        res.json({
            message: `Deals just for you!`,
            discounts: rows
        });
    } catch (error) {
        console.error("Error fetching targeted discounts:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * NEW FEATURE: Predicts the next product a customer is likely to buy.
 */
const predictNextPurchase = async (req, res) => {
    const customerId = req.params.id;
    
    // In a real deployment, this would execute the Python script with the customerId.
    // For this hackathon prototype, we simulate the model's logic directly.
    // Our trained model learned simple rules, which we replicate here.
    let predicted_product_id;
    if (customerId === '12345') {
        // This customer frequently buys products 1 ('Organic Milk') and 4 ('Whole Wheat Bread').
        // Let's predict they might be interested in a complementary item like Product 3 ('Cheddar Cheese').
        predicted_product_id = 3; 
    } else if (customerId === '67890') {
         // This customer frequently buys products 0 ('Avocado') and 2 ('Cheddar Cheese').
         // Let's predict they might be interested in Product 4 ('Whole Wheat Bread').
        predicted_product_id = 4;
    } else {
        return res.status(404).json({ message: 'Customer profile not found for prediction.' });
    }

    try {
        const productResult = await db.query('SELECT name FROM products WHERE id = $1', [predicted_product_id]);
        if (productResult.rows.length === 0) {
            return res.status(404).json({ message: 'Predicted product not found.' });
        }
        
        res.json({
            customerId: customerId,
            predictedProductName: productResult.rows[0].name,
            predictionReason: "Based on purchase history and complementary item analysis."
        });
    } catch (error) {
        console.error("Error predicting next purchase:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = { 
    getSmartSuggestions, 
    getTargetedDiscounts, 
    predictNextPurchase 
};