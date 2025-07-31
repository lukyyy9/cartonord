const express = require('express');
const HealthService = require('../services/HealthService');

const router = express.Router();
const healthService = new HealthService();

// Check de santé simple
router.get('/', (req, res) => {
  const health = healthService.getBasicHealth();
  res.json(health);
});

// Check de santé détaillé
router.get('/detailed', async (req, res) => {
  try {
    const health = await healthService.getDetailedHealth();
    
    // Statut HTTP basé sur le statut de santé
    const statusCode = health.status === 'ok' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      service: 'tiler',
      error: error.message
    });
  }
});

module.exports = router;