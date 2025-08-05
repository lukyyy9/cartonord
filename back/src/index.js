const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const healthRoutes = require('./routes/health');
const mapRoutes = require('./routes/maps');
const pictogramsRoutes = require('./routes/pictograms');
const librariesRoutes = require('./routes/libraries');
const authRoutes = require('./routes/auth');
const publicRoutes = require('./routes/public');
const authMiddleware = require('./middlewares/auth');
const { sequelize, Admin } = require('./models');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares de base
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '5000mb' }));
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers uploadés statiquement depuis le volume partagé
app.use('/api/uploads', express.static(path.join('/data/uploads')));

// Routes publiques
app.use('/health', healthRoutes);
app.use('/auth', authRoutes);
// Route publique pour accéder aux cartes publiées par slug
app.use('/', publicRoutes);

// Routes protégées
app.use('/api/maps', authMiddleware, mapRoutes);
app.use('/api/pictograms', authMiddleware, pictogramsRoutes);
app.use('/api/libraries', librariesRoutes);

// Fonction pour créer l'admin par défaut
const createDefaultAdmin = async () => {
  try {
    const adminCount = await Admin.count();
    
    if (adminCount === 0) {
      const defaultAdmin = await Admin.create({
        username: process.env.ADMIN_USERNAME || 'admin',
        password: process.env.ADMIN_PASSWORD || 'admin123'
      });
      
      console.log('Administrateur par défaut créé:', defaultAdmin.username);
    }
  } catch (error) {
    console.error('Erreur lors de la création de l\'admin par défaut:', error);
  }
};

// Initialisation de la base de données et démarrage du serveur
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connexion à la base de données établie avec succès.');

    await sequelize.query('CREATE EXTENSION IF NOT EXISTS postgis;');
    console.log('Extension PostGIS activée.');
    
    await sequelize.sync({ alter: true });
    console.log('Base de données synchronisée.');
    
    // Créer l'admin par défaut
    await createDefaultAdmin();
    
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