const express = require('express');
const { Pictogram } = require('../models');
const router = express.Router();

// GET /api/pictograms - Lister tous les pictogrammes
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    
    const whereClause = {};
    if (category) {
      whereClause.category = category;
    }

    const pictograms = await Pictogram.findAll({
      where: whereClause,
      order: [['category', 'ASC'], ['name', 'ASC']]
    });

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
    
    const pictogram = await Pictogram.findByPk(id);

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

// POST /api/pictograms - Créer un nouveau pictogramme
router.post('/', async (req, res) => {
  try {
    const { name, category, filePath, publicUrl, svgData, metadata } = req.body;

    if (!name || !filePath || !publicUrl) {
      return res.status(400).json({ 
        error: 'Le nom, le chemin du fichier et l\'URL publique sont requis' 
      });
    }

    // Vérifier si un pictogramme avec ce nom existe déjà
    const existingPictogram = await Pictogram.findOne({ where: { name } });
    if (existingPictogram) {
      return res.status(400).json({ 
        error: 'Un pictogramme avec ce nom existe déjà' 
      });
    }

    const pictogram = await Pictogram.create({
      name,
      category: category || 'general',
      filePath,
      publicUrl,
      svgData,
      metadata: metadata || {}
    });

    res.status(201).json(pictogram);
  } catch (error) {
    console.error('Erreur lors de la création du pictogramme:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la création du pictogramme',
      message: error.message 
    });
  }
});

// PUT /api/pictograms/:id - Mettre à jour un pictogramme
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, filePath, publicUrl, svgData, metadata } = req.body;

    const pictogram = await Pictogram.findByPk(id);
    if (!pictogram) {
      return res.status(404).json({ error: 'Pictogramme non trouvé' });
    }

    // Vérifier si un autre pictogramme avec ce nom existe déjà
    if (name && name !== pictogram.name) {
      const existingPictogram = await Pictogram.findOne({ 
        where: { name },
        exclude: { id }
      });
      if (existingPictogram) {
        return res.status(400).json({ 
          error: 'Un pictogramme avec ce nom existe déjà' 
        });
      }
    }

    await pictogram.update({
      ...(name && { name }),
      ...(category && { category }),
      ...(filePath && { filePath }),
      ...(publicUrl && { publicUrl }),
      ...(svgData !== undefined && { svgData }),
      ...(metadata && { metadata })
    });

    res.json(pictogram);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du pictogramme:', error);
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

    const pictogram = await Pictogram.findByPk(id);
    if (!pictogram) {
      return res.status(404).json({ error: 'Pictogramme non trouvé' });
    }

    await pictogram.destroy();

    res.json({ message: 'Pictogramme supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du pictogramme:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la suppression du pictogramme',
      message: error.message 
    });
  }
});

// GET /api/pictograms/categories - Récupérer toutes les catégories de pictogrammes
router.get('/categories', async (req, res) => {
  try {
    const categories = await Pictogram.findAll({
      attributes: ['category'],
      group: ['category'],
      order: [['category', 'ASC']]
    });

    const categoryList = categories.map(item => item.category);
    res.json(categoryList);
  } catch (error) {
    console.error('Erreur lors de la récupération des catégories:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des catégories',
      message: error.message 
    });
  }
});

module.exports = router;