const express = require('express');
const PictogramsService = require('../services/PictogramsService');
const router = express.Router();

// GET /api/pictograms/categories - Récupérer toutes les catégories de pictogrammes
router.get('/categories', async (req, res) => {
  try {
    const { libraryId } = req.query;
    
    const categories = await PictogramsService.getCategories(libraryId);
    res.json(categories);
  } catch (error) {
    console.error('Erreur lors de la récupération des catégories:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des catégories',
      message: error.message 
    });
  }
});

// GET /api/pictograms - Lister tous les pictogrammes
router.get('/', async (req, res) => {
  try {
    const { category, libraryId } = req.query;
    
    const filters = {};
    if (category) {
      filters.category = category;
    }
    if (libraryId) {
      filters.libraryId = libraryId;
    }

    const pictograms = await PictogramsService.getAllPictograms(filters);
    res.json(pictograms);
  } catch (error) {
    console.error('Erreur lors de la récupération des pictogrammes:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des pictogrammes',
      message: error.message 
    });
  }
});

// GET /api/pictograms/:id - Récupérer un pictogramme par ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const pictogram = await PictogramsService.getPictogramById(id);

    if (!pictogram) {
      return res.status(404).json({ error: 'Pictogramme non trouvé' });
    }

    res.json(pictogram);
  } catch (error) {
    console.error('Erreur lors de la récupération du pictogramme:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération du pictogramme',
      message: error.message 
    });
  }
});

// POST /api/pictograms - Créer un ou plusieurs pictogrammes
router.post('/', async (req, res) => {
  try {
    const data = req.body;

    // Vérifier si on reçoit un tableau (création multiple) ou un objet (création simple)
    if (Array.isArray(data)) {
      // Création multiple
      const result = await PictogramsService.createMultiplePictograms(data);
      
      if (result.failed > 0) {
        // Il y a eu des erreurs pour certains pictogrammes
        return res.status(207).json({
          message: `${result.created} pictogrammes créés avec succès, ${result.failed} échecs`,
          result: result
        });
      } else {
        // Tous les pictogrammes ont été créés avec succès
        return res.status(201).json({
          message: `${result.created} pictogrammes créés avec succès`,
          pictograms: result.success
        });
      }
    } else {
      // Création simple
      const { name, category, filePath, publicUrl, libraryId, svgData, metadata } = data;

      if (!name || !filePath || !publicUrl || !libraryId) {
        return res.status(400).json({ 
          error: 'Le nom, le chemin du fichier, l\'URL publique et l\'ID de la librairie sont requis' 
        });
      }

      const pictogram = await PictogramsService.createPictogram({
        name,
        category,
        filePath,
        publicUrl,
        libraryId,
        svgData,
        metadata
      });

      res.status(201).json(pictogram);
    }
  } catch (error) {
    console.error('Erreur lors de la création du/des pictogramme(s):', error);
    res.status(500).json({ 
      error: 'Erreur lors de la création du/des pictogramme(s)',
      message: error.message 
    });
  }
});

// PUT /api/pictograms/:id - Mettre à jour un pictogramme
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, filePath, publicUrl, libraryId, svgData, metadata } = req.body;

    const pictogram = await PictogramsService.updatePictogram(id, {
      name,
      category,
      filePath,
      publicUrl,
      libraryId,
      svgData,
      metadata
    });

    res.json(pictogram);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du pictogramme:', error);
    
    // Gestion des erreurs spécifiques
    if (error.message.includes('non trouvé')) {
      return res.status(404).json({ 
        error: 'Pictogramme non trouvé',
        message: error.message 
      });
    }
    
    if (error.message.includes('existe déjà') || error.message.includes('n\'existe pas')) {
      return res.status(400).json({ 
        error: 'Erreur de validation',
        message: error.message 
      });
    }

    res.status(500).json({ 
      error: 'Erreur lors de la mise à jour du pictogramme',
      message: error.message 
    });
  }
});

// DELETE /api/pictograms/:id - Supprimer un pictogramme
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await PictogramsService.deletePictogram(id);
    res.json({ message: 'Pictogramme supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du pictogramme:', error);
    
    if (error.message.includes('non trouvé')) {
      return res.status(404).json({ 
        error: 'Pictogramme non trouvé',
        message: error.message 
      });
    }

    res.status(500).json({ 
      error: 'Erreur lors de la suppression du pictogramme',
      message: error.message 
    });
  }
});

module.exports = router;