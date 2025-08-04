const express = require('express');
const LibrariesService = require('../services/LibrariesService');
const auth = require('../middlewares/auth');
const router = express.Router();

// GET /api/libraries - Lister toutes les librairies
router.get('/', async (req, res) => {
  try {
    const libraries = await LibrariesService.getAllLibraries();
    res.json(libraries);
  } catch (error) {
    console.error('Erreur lors de la récupération des librairies:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des librairies',
      message: error.message 
    });
  }
});

// GET /api/libraries/:id - Récupérer une librairie par ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const library = await LibrariesService.getLibraryById(id);

    if (!library) {
      return res.status(404).json({ error: 'Librairie non trouvée' });
    }

    res.json(library);
  } catch (error) {
    console.error('Erreur lors de la récupération de la librairie:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération de la librairie',
      message: error.message 
    });
  }
});

// GET /api/libraries/:id/pictograms - Récupérer les pictogrammes d'une librairie
router.get('/:id/pictograms', async (req, res) => {
  try {
    const { id } = req.params;
    
    const pictograms = await LibrariesService.getLibraryPictograms(id);

    if (pictograms === null) {
      return res.status(404).json({ error: 'Librairie non trouvée' });
    }

    res.json(pictograms);
  } catch (error) {
    console.error('Erreur lors de la récupération des pictogrammes:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des pictogrammes',
      message: error.message 
    });
  }
});

// POST /api/libraries - Créer une nouvelle librairie (authentification requise)
router.post('/', auth, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Le nom de la librairie est requis' });
    }

    const library = await LibrariesService.createLibrary({
      name
    });

    res.status(201).json(library);
  } catch (error) {
    console.error('Erreur lors de la création de la librairie:', error);
    
    if (error.message === 'Une librairie avec ce nom existe déjà') {
      return res.status(409).json({ error: error.message });
    }
    
    res.status(500).json({ 
      error: 'Erreur lors de la création de la librairie',
      message: error.message 
    });
  }
});

// PUT /api/libraries/:id - Mettre à jour une librairie (authentification requise)
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const library = await LibrariesService.updateLibrary(id, {
      name
    });

    if (!library) {
      return res.status(404).json({ error: 'Librairie non trouvée' });
    }

    res.json(library);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la librairie:', error);
    
    if (error.message === 'Une librairie avec ce nom existe déjà') {
      return res.status(409).json({ error: error.message });
    }
    
    res.status(500).json({ 
      error: 'Erreur lors de la mise à jour de la librairie',
      message: error.message 
    });
  }
});

// DELETE /api/libraries/:id - Supprimer une librairie (authentification requise)
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await LibrariesService.deleteLibrary(id);

    if (!result) {
      return res.status(404).json({ error: 'Librairie non trouvée' });
    }

    res.json(result);
  } catch (error) {
    console.error('Erreur lors de la suppression de la librairie:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la suppression de la librairie',
      message: error.message 
    });
  }
});

module.exports = router;
