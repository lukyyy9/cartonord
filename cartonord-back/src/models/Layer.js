const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Layer = sequelize.define('Layer', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    mapId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'maps',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    // Données GeoJSON complètes
    geojsonData: {
      type: DataTypes.JSONB,
      allowNull: false
    },
    // Style de la couche
    color: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '#3388ff'
    },
    opacity: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: 0.7
    },
    sourceFile: {
      type: DataTypes.STRING,
      allowNull: true
    },
    layerType: {
      type: DataTypes.ENUM('polygon', 'line', 'point', 'mixed'),
      allowNull: false,
      defaultValue: 'mixed'
    },
    // Ordre d'affichage (z-index)
    zIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    // Visibilité de la couche
    isVisible: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'layers',
    timestamps: true,
    underscored: true
  });

  return Layer;
};