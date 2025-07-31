const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const logger = require('./utils/logger');
const tilesetRoutes = require('./routes/tileset');
const healthRoutes = require('./routes/health');
const loggingMiddleware = require('./middlewares/logging');
const errorHandler = require('./middlewares/errorHandler');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware de sécurité
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Middleware de logging
app.use(loggingMiddleware);

// Routes
app.use('/health', healthRoutes);
app.use('/api/tileset', tilesetRoutes);

// Middleware de gestion d'erreurs
app.use(errorHandler);

// Route 404
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// Démarrage du serveur
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Service Tiler démarré sur le port ${PORT}`);
  
  // Vérification de la disponibilité de Tippecanoe
  const { spawn } = require('child_process');
  const tippecanoe = spawn('tippecanoe', ['--version']);
  
  tippecanoe.on('close', (code) => {
    if (code === 0) {
      logger.info('Tippecanoe disponible et opérationnel');
    } else {
      logger.error('Tippecanoe non disponible');
    }
  });
});

module.exports = app;