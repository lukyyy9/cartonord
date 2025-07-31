const express = require('express');
const HealthService = require('../services/HealthService');

const router = express.Router();
const healthService = new HealthService();

// Check de santé simple
router.get('/', (req, res) => {
  const health = healthService.getBasicHealth();
  res.json(health);
});

module.exports = router;