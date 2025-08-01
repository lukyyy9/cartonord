const express = require('express');
const MapsService = require('../services/MapsService');
const router = express.Router();

// GET /api/maps - Lister toutes les cartes
router.get('/', async (req, res) => {
  try {
    const maps = await MapsService.getAllMaps();
    res.json(maps);
  } catch (error) {
    console.error('Erreur lors de la récupération des cartes:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des cartes',
      message: error.message 
    });
  }
});

// GET /api/maps/:id - Récupérer une carte par ID avec toutes ses données
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const formattedMap = await MapsService.getMapById(id);

    if (!formattedMap) {
      return res.status(404).json({ error: 'Carte non trouvée' });
    }

    res.json(formattedMap);
  } catch (error) {
    console.error('Erreur lors de la récupération de la carte:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération de la carte',
      message: error.message 
    });
  }
});

// POST /api/maps - Créer une nouvelle carte
router.post('/', async (req, res) => {
  try {
    const map = await MapsService.createMap(req.body);
    res.status(201).json(map);
  } catch (error) {
    console.error('Erreur lors de la création de la carte:', error);
    
    if (error.message === 'Le nom est requis') {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ 
      error: 'Erreur lors de la création de la carte',
      message: error.message 
    });
  }
});

// PUT /api/maps/:id - Mettre à jour une carte avec couches et POIs
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedMap = await MapsService.updateMap(id, req.body);
    res.json(updatedMap);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la carte:', error);
    
    if (error.message === 'Carte non trouvée') {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ 
      error: 'Erreur lors de la mise à jour de la carte',
      message: error.message 
    });
  }
});

// PATCH /api/maps/:id/metadata - Mettre à jour les métadonnées d'une carte (nom, description, slug)
router.patch('/:id/metadata', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedMap = await MapsService.updateMapMetadata(id, req.body);
    res.json(updatedMap);
  } catch (error) {
    console.error('Erreur lors de la mise à jour des métadonnées de la carte:', error);
    
    if (error.message === 'Carte non trouvée') {
      return res.status(404).json({ error: error.message });
    }
    
    if (error.message === 'Le nom ne peut pas être vide') {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ 
      error: 'Erreur lors de la mise à jour des métadonnées de la carte',
      message: error.message 
    });
  }
});

// DELETE /api/maps/:id - Supprimer une carte
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await MapsService.deleteMap(id);
    res.json(result);
  } catch (error) {
    console.error('Erreur lors de la suppression de la carte:', error);
    
    if (error.message === 'Carte non trouvée') {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ 
      error: 'Erreur lors de la suppression de la carte',
      message: error.message 
    });
  }
});

// POST /api/maps/:id/publish - Publier une carte
router.post('/:id/publish', async (req, res) => {
  try {
    const { id } = req.params;
    
    const publishedMap = await MapsService.publishMap(id);
    res.json(publishedMap);
  } catch (error) {
    console.error('Erreur lors de la publication de la carte:', error);
    
    if (error.message === 'Carte non trouvée') {
      return res.status(404).json({ error: error.message });
    }
    
    if (error.message === 'La carte doit être dans l\'état ready pour être publiée') {
      return res.status(400).json({ error: error.message });
    }
    
    if (error.message === 'La carte doit avoir un slug pour être publiée') {
      return res.status(400).json({ error: error.message });
    }
    
    if (error.message === 'Ce slug est déjà utilisé par une autre carte publiée') {
      return res.status(409).json({ error: error.message });
    }
    
    res.status(500).json({ 
      error: 'Erreur lors de la publication de la carte',
      message: error.message 
    });
  }
});

// POST /api/maps/:id/unpublish - Dépublier une carte
router.post('/:id/unpublish', async (req, res) => {
  try {
    const { id } = req.params;
    const unpublishedMap = await MapsService.unpublishMap(id);
    res.json(unpublishedMap);
  } catch (error) {
    console.error('Erreur lors de la dépublication de la carte:', error);
    
    if (error.message === 'Carte non trouvée') {
      return res.status(404).json({ error: error.message });
    }
    
    if (error.message === 'La carte n\'est pas publiée') {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ 
      error: 'Erreur lors de la dépublication de la carte',
      message: error.message 
    });
  }
});

module.exports = router;