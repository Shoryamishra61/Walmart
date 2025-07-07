const express = require('express');
const router = express.Router();

const { 
    getSmartSuggestions, 
    getTargetedDiscounts, 
    predictNextPurchase 
} = require('../controllers/customerController');

// Route for smart cart suggestions
router.get('/:id/suggestions', getSmartSuggestions);

// Route for targeted discounts
router.get('/:id/discounts', getTargetedDiscounts);

// NEW: Route for predicting the next purchase
router.get('/:id/prediction', predictNextPurchase);

module.exports = router;