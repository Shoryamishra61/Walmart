const express = require('express');
const router = express.Router();
const { logRecyclingActivity, getRecyclingStats } = require('../controllers/circularityController');

// POST to log a new recycling event
router.post('/recycle', logRecyclingActivity);

// GET overall recycling statistics
router.get('/stats', getRecyclingStats);

module.exports = router;
