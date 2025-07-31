const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Map = sequelize.define('Map', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [1, 255]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Configuration globale de la carte
    config: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {
        center: [7.048, 43.667], // Roquefort-les-Pins par défaut
        zoom: 15,
        minZoom: 0,
        maxZoom: 18
      }
    },
    // État de publication
    status: {
      type: DataTypes.ENUM(
        'draft',         // Brouillon
        'processing',    // En cours de traitement
        'ready',         // Prêt avec tileset
        'tileset_error', // Erreur lors de la génération du tileset
        'error'          // Erreur générale
      ),
      defaultValue: 'draft'
    },
    // Tileset généré (chemin vers le fichier .mbtiles)
    tilesetPath: {
      type: DataTypes.STRING,
      allowNull: true
    },
    tilesetId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    // Métadonnées du tileset
    tilesetMetadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    }
  }, {
    tableName: 'maps',
    timestamps: true,
    underscored: true
  });

  return Map;
};