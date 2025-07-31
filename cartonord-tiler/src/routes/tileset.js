const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const TilesetService = require('../services/TilesetService');

const router = express.Router();

// Configuration de multer
const upload = multer({
  dest: '/data/temp',
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/json' || 
        file.originalname.endsWith('.geojson')) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers GeoJSON sont acceptés'));
    }
  }
});

const tilesetService = new TilesetService();

// Génération d'un tileset à partir d'un fichier GeoJSON
router.post('/generate', upload.single('geojson'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Fichier GeoJSON requis' });
    }

    const { projectId, layerName, minZoom = 0, maxZoom = 14 } = req.body;
    
    if (!projectId) {
      return res.status(400).json({ error: 'projectId requis' });
    }

    logger.info(`Génération de tileset pour le projet ${projectId}`, {
      layerName,
      file: req.file.originalname,
      size: req.file.size
    });

    const result = await tilesetService.generateFromFile({
      filePath: req.file.path,
      projectId,
      layerName: layerName || 'default',
      minZoom: parseInt(minZoom),
      maxZoom: parseInt(maxZoom)
    });

    // Nettoyage du fichier temporaire
    await fs.remove(req.file.path);

    res.json({
      success: true,
      tilesetId: result.tilesetId,
      path: result.outputPath,
      stats: result.stats
    });

  } catch (error) {
    logger.error('Erreur lors de la génération du tileset:', error);
    
    // Nettoyage en cas d'erreur
    if (req.file) {
      await fs.remove(req.file.path).catch(() => {});
    }

    res.status(500).json({
      error: 'Erreur lors de la génération du tileset',
      message: error.message
    });
  }
});

// Génération à partir de données GeoJSON en body
router.post('/generate-from-data', async (req, res) => {
  try {
    const { geojson, projectId, layerName, minZoom = 0, maxZoom = 14 } = req.body;
    
    if (!geojson || !projectId) {
      return res.status(400).json({ 
        error: 'geojson et projectId requis' 
      });
    }

    logger.info(`Génération de tileset pour le projet ${projectId}`, {
      layerName,
      dataSize: JSON.stringify(geojson).length
    });

    const result = await tilesetService.generateFromData({
      geojson,
      projectId,
      layerName: layerName || 'default',
      minZoom: parseInt(minZoom),
      maxZoom: parseInt(maxZoom)
    });

    res.json({
      success: true,
      tilesetId: result.tilesetId,
      path: result.outputPath,
      stats: result.stats
    });

  } catch (error) {
    logger.error('Erreur lors de la génération du tileset:', error);
    res.status(500).json({
      error: 'Erreur lors de la génération du tileset',
      message: error.message
    });
  }
});

// Liste des tilesets d'un projet
router.get('/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const tilesets = await tilesetService.listTilesets(projectId);
    
    res.json({
      projectId,
      tilesets
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des tilesets:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération des tilesets',
      message: error.message
    });
  }
});

// Suppression d'un tileset
router.delete('/:tilesetId', async (req, res) => {
  try {
    const { tilesetId } = req.params;
    await tilesetService.deleteTileset(tilesetId);
    
    res.json({
      success: true,
      message: 'Tileset supprimé avec succès'
    });
  } catch (error) {
    logger.error('Erreur lors de la suppression du tileset:', error);
    res.status(500).json({
      error: 'Erreur lors de la suppression du tileset',
      message: error.message
    });
  }
});

module.exports = router;