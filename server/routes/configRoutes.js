const express = require('express');
const router = express.Router();
const { detectLocation } = require('../controllers/configController');

// GET /api/config/detect-location
router.get('/detect-location', detectLocation);

module.exports = router;
