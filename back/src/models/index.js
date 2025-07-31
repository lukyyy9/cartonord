const { Sequelize } = require('sequelize');
const config = require('../config/database');

const sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    config
);

// Import des modèles
const Map = require('./Map')(sequelize);
const Layer = require('./Layer')(sequelize);
const PointOfInterest = require('./PointOfInterest')(sequelize);
const Pictogram = require('./Pictogram')(sequelize);

// Définition des associations
Map.hasMany(Layer, { 
    foreignKey: 'mapId', 
    as: 'layers',
    onDelete: 'CASCADE' // Suppression en cascade
});

Layer.belongsTo(Map, { 
    foreignKey: 'mapId',
    as: 'map'
});

// Ajouter les associations pour PointOfInterest
Map.hasMany(PointOfInterest, {
    foreignKey: 'mapId',
    as: 'pointsOfInterest'
});

PointOfInterest.belongsTo(Map, {
    foreignKey: 'mapId',
    as: 'map'
});

Layer.hasMany(PointOfInterest, { 
    foreignKey: 'layerId', 
    as: 'pointsOfInterest',
    onDelete: 'CASCADE' // Suppression en cascade
});
PointOfInterest.belongsTo(Layer, {
    foreignKey: 'layerId',
    as: 'layer'
});

module.exports = {
    sequelize,
    Map,
    Layer,
    PointOfInterest,
    Pictogram
};