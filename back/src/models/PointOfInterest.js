const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PointOfInterest = sequelize.define('PointOfInterest', {
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
    layerId: {
      type: DataTypes.UUID,
      allowNull: true, // POI peut être indépendant d'une couche
      references: {
        model: 'layers',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    coordinates: {
      type: DataTypes.GEOMETRY('POINT'),
      allowNull: false
    },
    pictogramId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    pictogramFile: {
      type: DataTypes.STRING,
      allowNull: true
    },
    properties: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    },
    sourceFile: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'points_of_interest',
    timestamps: true,
    underscored: true
  });

  return PointOfInterest;
};