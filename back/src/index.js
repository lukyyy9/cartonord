const express = require('express');
const cors = require('cors');
require('dotenv').config();

const healthRoutes = require('./routes/health');
const mapRoutes = require('./routes/maps');
const pictogramsRoutes = require('./routes/pictograms');
const { sequelize } = require('./models'); // Ajouter cette ligne

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares de base
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '5000mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/health', healthRoutes);
app.use('/api/maps', mapRoutes);
app.use('/api/pictograms', pictogramsRoutes);

// Initialisation de la base de données et démarrage du serveur
const startServer = async () => {
  try {
    // Synchroniser les modèles avec la base de données
    await sequelize.authenticate();
    console.log('Connexion à la base de données établie avec succès.');

    // Activer l'extension PostGIS
    await sequelize.query('CREATE EXTENSION IF NOT EXISTS postgis;');
    console.log('Extension PostGIS activée.');
    
    // Créer les tables si elles n'existent pas
    await sequelize.sync({ alter: true });
    console.log('Base de données synchronisée.');
    
    // Démarrer le serveur
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Cartonord Backend démarré sur le port ${PORT}`);
    });
  } catch (error) {
    console.error('Erreur lors du démarrage:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;