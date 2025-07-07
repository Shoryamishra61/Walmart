const express = require('express');
const router = express.Router();
// Import the new getKpis function along with the old one
const { getInventory, getKpis } = require('../controllers/inventoryController');

// This route gets the full inventory list
router.get('/', getInventory);

// This new route gets the calculated KPI data for the overview dashboard
router.get('/kpis', getKpis);

module.exports = router;
