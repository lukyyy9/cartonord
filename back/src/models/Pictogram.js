const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Pictogram = sequelize.define('Pictogram', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'general'
    },
    // Chemin vers le fichier SVG ou PNG
    filePath: {
      type: DataTypes.STRING,
      allowNull: false
    },
    // URL publique pour accéder au pictogramme
    publicUrl: {
      type: DataTypes.STRING,
      allowNull: false
    },
    // Données SVG si stockées en base
    svgData: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Métadonnées du pictogramme
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    }
  }, {
    tableName: 'pictograms',
    timestamps: true,
    underscored: true
  });

  return Pictogram;
};