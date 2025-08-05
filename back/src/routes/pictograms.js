const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const PictogramsService = require('../services/PictogramsService');
const router = express.Router();

// Configuration de multer pour l'upload de fichiers
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      // Récupérer l'ID de la librairie depuis les paramètres de formulaire
      const libraryId = req.body.libraryId;
      if (!libraryId) {
        return cb(new Error('ID de librairie requis'), null);
      }

      // Créer le chemin de destination dans le volume partagé
      const uploadPath = path.join('/data/uploads/pictograms', libraryId.toString());
      
      // Créer le dossier s'il n'existe pas
      await fs.ensureDir(uploadPath);
      
      cb(null, uploadPath);
    } catch (error) {
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    // Garder le nom original du fichier avec extension
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, originalName);
  }
});

// Filtre pour n'accepter que les images
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Type de fichier non autorisé. Seules les images (JPEG, PNG, GIF, SVG) sont acceptées.'), false);
  }
};

// Configuration multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  }
});

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

// POST /api/pictograms/upload - Upload de fichiers pictogrammes
router.post('/upload', upload.array('pictograms', 20), async (req, res) => {
  try {
    const { libraryId } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ 
        error: 'Aucun fichier uploadé' 
      });
    }

    if (!libraryId) {
      return res.status(400).json({ 
        error: 'ID de librairie requis' 
      });
    }

    // Préparer les données pour chaque pictogramme
    const pictogramsData = [];
    
    for (const file of files) {
      const fileName = file.filename;
      const nameWithoutExt = path.parse(fileName).name;
      
      // Construire les chemins relatifs
      const relativePath = `/uploads/pictograms/${libraryId}/${fileName}`;
      const publicUrl = `/api/uploads/pictograms/${libraryId}/${fileName}`;
      
      pictogramsData.push({
        name: nameWithoutExt,
        category: null, // Peut être étendu plus tard
        filePath: relativePath,
        publicUrl: publicUrl,
        libraryId: libraryId, // Garder comme UUID string
        metadata: {
          originalFileName: file.originalname,
          fileSize: file.size,
          fileType: file.mimetype,
          uploadDate: new Date().toISOString()
        }
      });
    }

    // Créer les pictogrammes en base de données
    const result = await PictogramsService.createMultiplePictograms(pictogramsData);
    
    if (result.failed > 0) {
      // Il y a eu des erreurs pour certains pictogrammes
      return res.status(207).json({
        message: `${result.created} pictogrammes créés avec succès, ${result.failed} échecs`,
        result: result
      });
    } else {
      // Tous les pictogrammes ont été créés avec succès
      return res.status(201).json({
        message: `${result.created} pictogrammes uploadés et créés avec succès`,
        pictograms: result.success,
        created: result.created
      });
    }

  } catch (error) {
    console.error('Erreur lors de l\'upload des pictogrammes:', error);
    
    // Gérer les erreurs spécifiques de multer
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          error: 'Fichier trop volumineux. Taille maximale: 5MB' 
        });
      }
      if (error.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ 
          error: 'Trop de fichiers. Maximum: 20 fichiers' 
        });
      }
    }
    
    res.status(500).json({ 
      error: 'Erreur lors de l\'upload des pictogrammes',
      message: error.message 
    });
  }
});

// POST /api/pictograms - Créer un ou plusieurs pictogrammes (sans upload de fichiers)
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