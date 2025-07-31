const express = require('express');
const cors = require('cors');
const TileService = require('./services/TileService');

const app = express();
const PORT = process.env.PORT || 3003;

// Middlewares
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'cartonord-tile-server',
    timestamp: new Date().toISOString()
  });
});

// Route principale pour servir les tuiles
app.get('/tiles/:project/:z/:x/:y.pbf', async (req, res) => {
  try {
    const { project, z, x, y } = req.params;
    
    // Validation des paramètres
    const zoom = parseInt(z);
    const tileX = parseInt(x);
    const tileY = parseInt(y);
    
    if (isNaN(zoom) || isNaN(tileX) || isNaN(tileY)) {
      return res.status(400).json({ error: 'Invalid tile coordinates' });
    }
    
    // Extraction de la tuile depuis le .mbtiles
    const tile = await TileService.getTile(project, zoom, tileX, tileY);
    
    if (!tile) {
      return res.status(404).json({ error: 'Tile not found' });
    }
    
    // Headers pour les tuiles vectorielles
    res.set({
      'Content-Type': 'application/x-protobuf',
      'Content-Encoding': 'gzip',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*'
    });
    
    res.send(tile);
    
  } catch (error) {
    console.error('Error serving tile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route pour obtenir les métadonnées d'un tileset
app.get('/tiles/:project/metadata', async (req, res) => {
  try {
    const { project } = req.params;
    const metadata = await TileService.getMetadata(project);
    
    if (!metadata) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json(metadata);
    
  } catch (error) {
    console.error('Error getting metadata:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Liste des projets disponibles
app.get('/projects', async (req, res) => {
  try {
    const projects = await TileService.listProjects();
    res.json(projects);
  } catch (error) {
    console.error('Error listing projects:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🗺️  Cartonord Tile Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🎯 Tiles endpoint: http://localhost:${PORT}/tiles/{project}/{z}/{x}/{y}.pbf`);
});

module.exports = app;
