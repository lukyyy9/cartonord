const express = require('express');
const MapsService = require('../services/MapsService');
const router = express.Router();

// GET /:slug - Récupérer une carte publiée par son slug (route publique)
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const map = await MapsService.getMapBySlug(slug);
    
    if (!map) {
      return res.status(404).json({ error: 'Carte non trouvée' });
    }
    
    res.json(map);
  } catch (error) {
    console.error('Erreur lors de la récupération de la carte publiée:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération de la carte',
      message: error.message 
    });
  }
});

module.exports = router;
